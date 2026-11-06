import { performance } from "node:perf_hooks";

import { buildAppConnectionRegistry } from "./app-connection-registry";
import { credentialReferenceRiskState } from "./credential-vault-database";
import { withUserDatabase } from "./database";
import { buildSystemReliabilityDashboard } from "./system-reliability";

export type IntegrationHealthState="healthy"|"attention"|"critical"|"inactive";

export type IntegrationHealthSignal={
  id:string;
  label:string;
  state:IntegrationHealthState;
  value:string;
  detail:string;
  href:string;
};

export type PeerConnectionHealth={
  applicationId:string;
  displayName:string;
  connectionState:string;
  discoveryState:string;
  automaticActivationAllowed:false;
  mutatingCapabilityDiscovered:false;
};

export type ConnectorLatencyHealth={
  workspaceId:string;
  connectorKey:string;
  status:"succeeded"|"failed"|"blocked";
  durationMs:number;
  errorCode:string|null;
  observedAt:string;
};

export type CredentialHealth={
  workspaceId:string;
  applicationId:string;
  environment:string;
  label:string;
  riskState:string;
  rotationDueAt:string|null;
  expiresAt:string|null;
};

export type WebhookHealth={
  workspaceId:string;
  endpointId:string;
  displayName:string;
  sourceApplicationId:string;
  enabled:boolean;
  environment:string;
  accepted24h:number;
  denied24h:number;
  lastReceiptAt:string|null;
};

export type QueueHealth={
  heldRoutes:number;
  pendingRoutes:number;
  deliveryFailures24h:number;
  deadLetters:number;
  replayRequests:number;
};

export type IntegrationHealthCommandCenterModel={
  generatedAt:string;
  evidenceScope:"authorized-database-and-registered-local-evidence-only";
  summary:{
    state:IntegrationHealthState;
    registeredPeers:number;
    disconnectedPeers:number;
    staleCredentials:number;
    webhookEndpoints:number;
    webhookDenied24h:number;
    queuedEvents:number;
    deliveryFailures24h:number;
    degradedServices:number;
    databaseLatencyMs:number;
    connectorAverageLatencyMs:number|null;
    connectorMaxLatencyMs:number|null;
  };
  signals:IntegrationHealthSignal[];
  peers:PeerConnectionHealth[];
  connectorLatency:ConnectorLatencyHealth[];
  credentials:CredentialHealth[];
  webhooks:WebhookHealth[];
  queues:QueueHealth;
  degradedServices:Array<{
    id:string;
    label:string;
    state:"attention"|"critical";
    value:string;
    detail:string;
    href:string;
  }>;
  policy:{
    readOnlyDashboard:true;
    externalHealthProbePerformed:false;
    remoteAvailabilityInferred:false;
    credentialValuesRead:false;
    automaticRecoveryTriggered:false;
    automaticConnectionActivation:false;
    ql266Resumed:false;
  };
};

function stateRank(value:IntegrationHealthState){
  return value==="critical"?3:value==="attention"?2:value==="inactive"?1:0;
}

function worst(states:IntegrationHealthState[]):IntegrationHealthState{
  return states.reduce<IntegrationHealthState>((best,item)=>stateRank(item)>stateRank(best)?item:best,"healthy");
}

export async function buildIntegrationHealthCommandCenter(
  userId:string
):Promise<IntegrationHealthCommandCenterModel>{
  const dbStarted=performance.now();

  const [reliability,registry,databaseEvidence]=await Promise.all([
    buildSystemReliabilityDashboard(userId),
    Promise.resolve(buildAppConnectionRegistry()),
    withUserDatabase(userId,async(client)=>{
      const [
        credentialRows,
        connectorRows,
        webhookRows,
        routeCounts,
        failureCounts,
        deadLetterCounts,
        replayCounts
      ]=await Promise.all([
        client.query(`
          select workspace_id,application_id,environment,label,lifecycle_status,
                 replacement_state,rotation_due_at,expires_at
          from app.workspace_credential_references
          order by application_id,environment,label`),
        client.query(`
          select distinct on (workspace_id,connector_key)
                 workspace_id,connector_key,status,duration_ms,error_code,created_at
          from app.workspace_connector_audit
          order by workspace_id,connector_key,created_at desc`),
        client.query(`
          select e.workspace_id,e.endpoint_id,e.display_name,e.source_application_id,
                 e.enabled,e.environment,
                 count(a.audit_id) filter (
                   where a.outcome='accepted' and a.occurred_at>=now()-interval '24 hours'
                 )::int as accepted_24h,
                 count(a.audit_id) filter (
                   where a.outcome='denied' and a.occurred_at>=now()-interval '24 hours'
                 )::int as denied_24h,
                 max(r.received_at) as last_receipt_at
          from app.webhook_endpoints e
          left join app.webhook_request_audit a on a.endpoint_id=e.endpoint_id
          left join app.webhook_receipts r on r.endpoint_id=e.endpoint_id
          group by e.workspace_id,e.endpoint_id,e.display_name,e.source_application_id,e.enabled,e.environment
          order by e.source_application_id,e.display_name`),
        client.query<{state:string;count:string}>(`
          select state,count(*)::text as count
          from app.event_bus_routes
          group by state`),
        client.query<{count:string}>(`
          select count(*)::text as count
          from app.event_bus_delivery_failures
          where failed_at>=now()-interval '24 hours'`),
        client.query<{count:string}>(`
          select count(*)::text as count
          from app.event_bus_dead_letters`),
        client.query<{count:string}>(`
          select count(*)::text as count
          from app.event_bus_replay_requests`)
      ]);
      return {
        credentials:credentialRows.rows,
        connectors:connectorRows.rows,
        webhooks:webhookRows.rows,
        routeCounts:routeCounts.rows,
        deliveryFailures24h:Number(failureCounts.rows[0]?.count??0),
        deadLetters:Number(deadLetterCounts.rows[0]?.count??0),
        replayRequests:Number(replayCounts.rows[0]?.count??0)
      };
    })
  ]);

  const databaseLatencyMs=Math.max(0,Math.round(performance.now()-dbStarted));

  const peers:PeerConnectionHealth[]=registry.peerApplications.map((item)=>({
    applicationId:item.id,
    displayName:item.displayName,
    connectionState:item.connectionState,
    discoveryState:item.discoveryState,
    automaticActivationAllowed:item.automaticActivationAllowed,
    mutatingCapabilityDiscovered:item.mutatingCapabilityDiscovered
  }));

  const credentials:CredentialHealth[]=databaseEvidence.credentials.map((row)=>{
    const base={
      lifecycleStatus:String(row.lifecycle_status) as "active"|"revoked",
      replacementState:String(row.replacement_state) as "not-planned"|"prepared",
      rotationDueAt:row.rotation_due_at ? new Date(String(row.rotation_due_at)).toISOString() : null,
      expiresAt:row.expires_at ? new Date(String(row.expires_at)).toISOString() : null
    };
    return {
      workspaceId:String(row.workspace_id),
      applicationId:String(row.application_id),
      environment:String(row.environment),
      label:String(row.label),
      riskState:credentialReferenceRiskState(base),
      rotationDueAt:base.rotationDueAt,
      expiresAt:base.expiresAt
    };
  });

  const connectorLatency:ConnectorLatencyHealth[]=databaseEvidence.connectors.map((row)=>({
    workspaceId:String(row.workspace_id),
    connectorKey:String(row.connector_key),
    status:String(row.status) as ConnectorLatencyHealth["status"],
    durationMs:Number(row.duration_ms??0),
    errorCode:row.error_code ? String(row.error_code) : null,
    observedAt:new Date(String(row.created_at)).toISOString()
  }));

  const webhooks:WebhookHealth[]=databaseEvidence.webhooks.map((row)=>({
    workspaceId:String(row.workspace_id),
    endpointId:String(row.endpoint_id),
    displayName:String(row.display_name),
    sourceApplicationId:String(row.source_application_id),
    enabled:Boolean(row.enabled),
    environment:String(row.environment),
    accepted24h:Number(row.accepted_24h??0),
    denied24h:Number(row.denied_24h??0),
    lastReceiptAt:row.last_receipt_at ? new Date(String(row.last_receipt_at)).toISOString() : null
  }));

  const routeCountMap=new Map(databaseEvidence.routeCounts.map((row)=>[String(row.state),Number(row.count)]));
  const queues:QueueHealth={
    heldRoutes:routeCountMap.get("held")??0,
    pendingRoutes:routeCountMap.get("pending")??0,
    deliveryFailures24h:databaseEvidence.deliveryFailures24h,
    deadLetters:databaseEvidence.deadLetters,
    replayRequests:databaseEvidence.replayRequests
  };

  const staleCredentials=credentials.filter((item)=>item.riskState!=="active").length;
  const webhookDenied24h=webhooks.reduce((sum,item)=>sum+item.denied24h,0);
  const disconnectedPeers=peers.filter((item)=>item.connectionState==="DISCONNECTED").length;
  const queuedEvents=queues.heldRoutes+queues.pendingRoutes;

  const connectorDurations=connectorLatency
    .filter((item)=>Number.isFinite(item.durationMs) && item.durationMs>=0)
    .map((item)=>item.durationMs);
  const connectorAverageLatencyMs=connectorDurations.length
    ? Math.round(connectorDurations.reduce((sum,value)=>sum+value,0)/connectorDurations.length)
    : null;
  const connectorMaxLatencyMs=connectorDurations.length ? Math.max(...connectorDurations) : null;

  const signals:IntegrationHealthSignal[]=[
    {
      id:"peer-connections",
      label:"Peer connection registry",
      state:disconnectedPeers>0?"attention":"healthy",
      value:`${disconnectedPeers} disconnected`,
      detail:`${peers.length} registered peer application(s). Registry state is evidence only; no live connection is inferred.`,
      href:"/app-connections"
    },
    {
      id:"latency",
      label:"Latency",
      state:connectorLatency.some((item)=>item.status==="failed")?"critical":connectorMaxLatencyMs!==null&&connectorMaxLatencyMs>5000?"attention":"healthy",
      value:connectorAverageLatencyMs===null?`DB ${databaseLatencyMs} ms`:`DB ${databaseLatencyMs} ms · connector avg ${connectorAverageLatencyMs} ms`,
      detail:connectorMaxLatencyMs===null?"No connector audit latency is available yet.":`Latest connector evidence max latency is ${connectorMaxLatencyMs} ms.`,
      href:"/connector-diagnostics"
    },
    {
      id:"credentials",
      label:"Credential references",
      state:credentials.some((item)=>["expired","revoked","rotation-due"].includes(item.riskState))?"critical":staleCredentials>0?"attention":"healthy",
      value:`${staleCredentials} need attention`,
      detail:`${credentials.length} reference-only credential record(s). Secret values are never read.`,
      href:"/credential-vault"
    },
    {
      id:"webhooks",
      label:"Webhook intake",
      state:webhookDenied24h>0?"attention":webhooks.length===0?"inactive":"healthy",
      value:`${webhookDenied24h} denied / 24h`,
      detail:`${webhooks.filter((item)=>item.enabled).length} enabled endpoint(s), ${webhooks.reduce((sum,item)=>sum+item.accepted24h,0)} accepted request(s) in 24h.`,
      href:"/webhook-gateway"
    },
    {
      id:"queues",
      label:"Event queues",
      state:queues.deadLetters>0||queues.deliveryFailures24h>0?"critical":queuedEvents>0?"attention":"healthy",
      value:`${queuedEvents} queued`,
      detail:`${queues.deliveryFailures24h} delivery failure(s) in 24h, ${queues.deadLetters} dead letter(s), ${queues.replayRequests} replay request(s).`,
      href:"/event-recovery"
    }
  ];

  const inheritedDegraded=reliability.signals
    .filter((item)=>item.state==="critical"||item.state==="attention")
    .map((item)=>({
      id:"reliability:"+item.id,
      label:item.label,
      state:item.state as "attention"|"critical",
      value:item.value,
      detail:item.detail,
      href:item.href
    }));

  const signalDegraded=signals
    .filter((item)=>item.state==="critical"||item.state==="attention")
    .map((item)=>({
      id:"integration:"+item.id,
      label:item.label,
      state:item.state as "attention"|"critical",
      value:item.value,
      detail:item.detail,
      href:item.href
    }));

  const degradedServices=[...signalDegraded,...inheritedDegraded]
    .filter((item,index,array)=>array.findIndex((candidate)=>candidate.id===item.id)===index);

  return {
    generatedAt:new Date().toISOString(),
    evidenceScope:"authorized-database-and-registered-local-evidence-only",
    summary:{
      state:worst(signals.map((item)=>item.state)),
      registeredPeers:peers.length,
      disconnectedPeers,
      staleCredentials,
      webhookEndpoints:webhooks.length,
      webhookDenied24h,
      queuedEvents,
      deliveryFailures24h:queues.deliveryFailures24h,
      degradedServices:degradedServices.length,
      databaseLatencyMs,
      connectorAverageLatencyMs,
      connectorMaxLatencyMs
    },
    signals,
    peers,
    connectorLatency,
    credentials,
    webhooks,
    queues,
    degradedServices,
    policy:{
      readOnlyDashboard:true,
      externalHealthProbePerformed:false,
      remoteAvailabilityInferred:false,
      credentialValuesRead:false,
      automaticRecoveryTriggered:false,
      automaticConnectionActivation:false,
      ql266Resumed:false
    }
  };
}
