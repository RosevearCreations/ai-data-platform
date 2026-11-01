import { performance } from "node:perf_hooks";
import { listConnectorOverviewForUser } from "./connector-database";
import { listCollectionRunConsoleForUser } from "./collection-runs";
import { listIntegrationDeliveryOverviewForUser } from "./integration-delivery-database";
import { buildOperatorAttentionCenter } from "./operator-attention";
import { listBulkReviewWorkbenchForUser } from "./bulk-data-review";
import { withUserDatabase } from "./database";
import type { ReliabilityDashboardModel, ReliabilityException, ReliabilitySignal, ReliabilityState } from "./system-reliability-contract";

function signal(id:string,label:string,state:ReliabilityState,value:string,detail:string,href:string):ReliabilitySignal{
 return {id,label,state,value,detail,href};
}
export async function buildSystemReliabilityDashboard(userId:string):Promise<ReliabilityDashboardModel>{
 const dbStarted=performance.now();
 const database=await withUserDatabase(userId,async(client)=>{
  await client.query("select 1 as ok");
  const count=await client.query<{count:string}>("select count(*)::text as count from app.workspaces");
  return {reachable:true,latencyMs:0,authorizedWorkspaces:Number(count.rows[0]?.count??0)};
 });
 database.latencyMs=Math.max(0,Math.round(performance.now()-dbStarted));
 const [collection,connectors,delivery,attention,bulk]=await Promise.all([
  listCollectionRunConsoleForUser(userId),
  listConnectorOverviewForUser(userId),
  listIntegrationDeliveryOverviewForUser(userId),
  buildOperatorAttentionCenter(userId),
  listBulkReviewWorkbenchForUser(userId)
 ]);

 const signals:ReliabilitySignal[]=[];
 signals.push(signal(
  "application","Application","healthy","Serving",
  "The authenticated dashboard request completed and health evidence was assembled successfully.","/"
 ));
 signals.push(signal(
  "database","Database",database.reachable?"healthy":"critical",database.reachable?(database.latencyMs+" ms"):"Unavailable",
  database.reachable?"Authenticated database probe succeeded across current RLS scope.":"Authenticated database probe failed.","/audit-evidence"
 ));

 const localFailures=collection.sources.reduce((sum,source)=>sum+source.local.failures,0);
 const remoteFailures=collection.sources.reduce((sum,source)=>sum+source.remote.pagesFailed,0);
 const blockedSources=collection.sources.filter((source)=>source.readiness==="blocked").length;
 const collectionState:ReliabilityState=(localFailures+remoteFailures)>0?"critical":blockedSources>0?"attention":"healthy";
 signals.push(signal(
  "collection","Collection",collectionState,
  (localFailures+remoteFailures)+" failures",
  blockedSources+" blocked source(s), "+collection.totals.activeRemoteRuns+" active remote run(s).","/collection-runs"
 ));

 const manifests=new Map(connectors.manifests.map((manifest)=>[manifest.key,manifest]));
 let connectorFailures=0; let connectorMismatches=0; let enabledConnectors=0;
 const connectorExceptions:ReliabilityException[]=[];
 for(const entry of connectors.workspaces){
  for(const install of entry.installations){
   if(install.enabled)enabledConnectors++;
   const manifest=manifests.get(install.connectorKey);
   if(!manifest||install.manifestVersion!==manifest.manifestVersion||install.connectorVersion!==manifest.version){
    connectorMismatches++;
    connectorExceptions.push({id:"connector-mismatch:"+entry.workspace.id+":"+install.connectorKey,workspaceName:entry.workspace.name,area:"Connectors",state:"critical",title:install.connectorKey+" version mismatch",detail:"Installed connector metadata does not match the registered manifest.",href:"/connectors",observedAt:install.updatedAt.toISOString()});
   }
  }
  const latest=new Map<string,(typeof entry.audit)[number]>();
  for(const audit of entry.audit){if(!latest.has(audit.connectorKey))latest.set(audit.connectorKey,audit);}
  for(const audit of latest.values()){
   if(audit.status==="failed"||audit.status==="blocked"){
    if(audit.status==="failed")connectorFailures++;
    connectorExceptions.push({id:"connector-audit:"+entry.workspace.id+":"+audit.auditId,workspaceName:entry.workspace.name,area:"Connectors",state:audit.status==="failed"?"critical":"attention",title:audit.connectorKey+" "+audit.status,detail:audit.errorCode??"Latest connector execution evidence requires review.",href:"/connectors",observedAt:audit.createdAt.toISOString()});
   }
  }
 }
 signals.push(signal(
  "connectors","Connectors",(connectorFailures+connectorMismatches)>0?"critical":enabledConnectors===0?"inactive":"healthy",
  enabledConnectors+" enabled",
  connectorFailures+" latest failure(s), "+connectorMismatches+" compatibility mismatch(es).","/connectors"
 ));

 let deliveryFailures=0;let deliveryAccepted=0;const deliveryExceptions:ReliabilityException[]=[];
 for(const entry of delivery){
  deliveryAccepted+=Number(entry.counts["delivery-accepted"]??0);
  deliveryFailures+=Number(entry.counts["delivery-rejected"]??0)+Number(entry.counts["transport-error"]??0)+Number(entry.counts["handshake-rejected"]??0);
  for(const item of entry.recent.filter((event)=>["delivery-rejected","transport-error","handshake-rejected"].includes(event.eventType)).slice(0,5)){
   deliveryExceptions.push({id:"delivery:"+entry.workspace.id+":"+item.eventId,workspaceName:entry.workspace.name,area:"Integration delivery",state:"critical",title:item.eventType,detail:item.validationCode+(item.httpStatus?" · HTTP "+item.httpStatus:""),href:"/integration-delivery",observedAt:item.occurredAt.toISOString()});
  }
 }
 signals.push(signal(
  "integration","Integration delivery",deliveryFailures>0?"critical":deliveryAccepted>0?"healthy":"inactive",
  deliveryFailures+" failure(s)",
  deliveryAccepted+" accepted delivery event(s) across authorized workspaces.","/integration-delivery"
 ));

 const remoteFailedEvents=collection.sources.reduce((sum,source)=>sum+source.remote.attempts.filter((attempt)=>attempt.status==="failed"||attempt.status==="timed-out").length,0);
 signals.push(signal(
  "remote","Remote execution",remoteFailedEvents>0?"critical":collection.runtime.browserlessReady?"healthy":"attention",
  collection.runtime.browserlessReady?"Ready":"Fail-closed",
  remoteFailedEvents+" failed/timed-out attempt(s); global kill switch "+(collection.runtime.globalKillSwitchActive?"active":"inactive")+".","/remote-execution"
 ));

 signals.push(signal(
  "queues","Review queues",bulk.totals.openExceptions>0?"attention":"healthy",
  bulk.totals.openExceptions+" open exception(s)",
  bulk.totals.inReview+" review batch(es) remain in review.","/data-review/bulk"
 ));

 const attentionCritical=attention.counts.critical;
 const attentionNeeds=attention.counts.attention;
 signals.push(signal(
  "exceptions","Recent exceptions",attentionCritical>0?"critical":attentionNeeds>0?"attention":"healthy",
  (attentionCritical+attentionNeeds)+" active",
  attentionCritical+" critical and "+attentionNeeds+" attention item(s) in the Operator Attention Center.","/attention"
 ));

 const attentionExceptions:ReliabilityException[]=attention.items
  .filter((item)=>item.severity==="critical"||item.severity==="attention")
  .slice(0,25)
  .map((item)=>({id:"attention:"+item.id,workspaceName:item.workspaceName,area:item.category,state:item.severity==="critical"?"critical":"attention",title:item.title,detail:item.detail,href:item.href,observedAt:item.observedAt}));
 const collectionExceptions:ReliabilityException[]=collection.sources.flatMap((source)=>{
  const items:ReliabilityException[]=[];
  const latestLocal=source.local.attempts.find((attempt)=>attempt.status==="failed"||attempt.status==="timed-out");
  if(latestLocal)items.push({id:"local:"+source.workspaceId+":"+source.sourceId,workspaceName:source.workspaceName,area:"Collection",state:"critical",title:source.displayName+" local collection failure",detail:latestLocal.error||latestLocal.status,href:"/collection-runs",observedAt:latestLocal.finishedAt??latestLocal.startedAt});
  const latestRemote=source.remote.attempts.find((attempt)=>["failed","timed-out","cancelled"].includes(attempt.status));
  if(latestRemote)items.push({id:"remote:"+source.workspaceId+":"+source.sourceId,workspaceName:source.workspaceName,area:"Remote execution",state:latestRemote.status==="cancelled"?"attention":"critical",title:source.displayName+" remote collection "+latestRemote.status,detail:latestRemote.error||latestRemote.status,href:"/collection-runs",observedAt:latestRemote.finishedAt??latestRemote.startedAt});
  return items;
 });
 const reviewExceptions:ReliabilityException[]=bulk.exceptions.slice(0,20).map((item)=>({id:"review:"+item.exceptionId,workspaceName:item.workspaceName,area:"Review",state:"attention",title:item.title+" held for review",detail:item.reasonCode+(item.note?" · "+item.note:""),href:"/data-review/bulk",observedAt:item.createdAt}));
 const exceptions=[...connectorExceptions,...deliveryExceptions,...collectionExceptions,...reviewExceptions,...attentionExceptions]
  .filter((item,index,array)=>array.findIndex((candidate)=>candidate.id===item.id)===index)
  .sort((a,b)=>Date.parse(b.observedAt??"1970-01-01")-Date.parse(a.observedAt??"1970-01-01")).slice(0,50);

 const totals={healthy:0,attention:0,critical:0,inactive:0,exceptions:exceptions.length};
 for(const item of signals)totals[item.state]++;
 return {
  generatedAt:new Date().toISOString(),
  database,
  runtime:{collectionRuntimeReady:collection.runtime.browserlessReady,browserlessConfigured:collection.runtime.browserlessTokenConfigured,globalKillSwitchActive:collection.runtime.globalKillSwitchActive},
  signals,exceptions,totals
 };
}
