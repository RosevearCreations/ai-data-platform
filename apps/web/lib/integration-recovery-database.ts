import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { credentialReferenceRiskState } from "./credential-vault-database";
import { listWorkspacesForUser, withUserDatabase } from "./database";
import {
  connectorFailureClassification,
  credentialRecoveryClassification,
  eventFailureClassification,
  safeOwnerDecisionReason,
  stableRecoverySourceKey,
  type RecoveryAction,
  type RecoveryClassification,
  type RecoverySourceKind
} from "./integration-recovery-core";
import { getRegisteredConnector } from "./connectors/registry";
import { executeConnectorHealthBoundary } from "./connectors/sandbox";

export type RecoveryPlanRecord={
  planId:string;
  workspaceId:string;
  sourceKind:RecoverySourceKind;
  sourceId:string;
  recoveryAction:RecoveryAction;
  classification:RecoveryClassification;
  reasonCode:string;
  sourcePayload:Record<string,unknown>;
  maxAttempts:number;
  cooldownSeconds:number;
  autoExecutionAllowed:boolean;
  expiresAt:string|null;
  createdAt:string;
  attempts:Array<{
    attemptId:string;
    attemptNumber:number;
    outcome:"succeeded"|"failed"|"blocked";
    errorCode:string|null;
    durationMs:number;
    evidence:Record<string,unknown>;
    attemptedAt:string;
  }>;
  decision:null|{
    decisionId:string;
    decision:"approve"|"reject";
    reason:string;
    consequence:string;
    decidedAt:string;
  };
  state:
    | "ready"
    | "cooldown"
    | "recovered"
    | "exhausted"
    | "expired"
    | "approval-required"
    | "approved"
    | "rejected"
    | "not-retryable";
};

async function requireWorkspaceAdmin(client:PoolClient,workspaceId:string){
  const result=await client.query<{role:string}>(
    `select role from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role=result.rows[0]?.role;
  if(role!=="owner"&&role!=="admin") throw new Error("workspace_admin_required");
}

function object(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)
    ? value as Record<string,unknown>
    : {};
}

function planState(plan:Omit<RecoveryPlanRecord,"state">):RecoveryPlanRecord["state"]{
  if(plan.classification==="not-retryable") return "not-retryable";
  if(plan.classification==="owner-approval-required"){
    if(plan.decision?.decision==="approve") return "approved";
    if(plan.decision?.decision==="reject") return "rejected";
    return "approval-required";
  }
  if(plan.attempts.some(item=>item.outcome==="succeeded")) return "recovered";
  if(plan.expiresAt && Date.parse(plan.expiresAt)<=Date.now()) return "expired";
  if(plan.attempts.length>=plan.maxAttempts) return "exhausted";
  const last=plan.attempts[0];
  if(last && Date.now()-Date.parse(last.attemptedAt)<plan.cooldownSeconds*1000) return "cooldown";
  return "ready";
}

async function appendAudit(client:PoolClient,input:{
  workspaceId:string;
  userId:string;
  planId?:string|null;
  attemptId?:string|null;
  decisionId?:string|null;
  action:
    | "plan-created"
    | "safe-retry-attempted"
    | "safe-retry-succeeded"
    | "safe-retry-failed"
    | "owner-approved"
    | "owner-rejected";
  details?:Record<string,unknown>;
}){
  await client.query(
    `insert into app.integration_recovery_audit (
      audit_id,workspace_id,plan_id,attempt_id,decision_id,actor_user_id,action,details
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      randomUUID(),input.workspaceId,input.planId??null,input.attemptId??null,
      input.decisionId??null,input.userId,input.action,JSON.stringify(input.details??{})
    ]
  );
}

async function insertPlan(client:PoolClient,userId:string,input:{
  workspaceId:string;
  sourceKind:RecoverySourceKind;
  sourceId:string;
  recoveryAction:RecoveryAction;
  classification:RecoveryClassification;
  reasonCode:string;
  sourcePayload:Record<string,unknown>;
  maxAttempts:number;
  cooldownSeconds:number;
  autoExecutionAllowed:boolean;
  expiresAt:string|null;
}){
  const sourceKey=stableRecoverySourceKey({
    workspaceId:input.workspaceId,
    sourceKind:input.sourceKind,
    sourceId:input.sourceId,
    action:input.recoveryAction
  });
  const planId=randomUUID();
  const result=await client.query<{plan_id:string}>(
    `insert into app.integration_recovery_plans (
      plan_id,workspace_id,source_kind,source_id,source_key_sha256,recovery_action,
      classification,reason_code,source_payload,max_attempts,cooldown_seconds,
      auto_execution_allowed,expires_at,created_by
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14)
    on conflict (source_key_sha256) do nothing
    returning plan_id`,
    [
      planId,input.workspaceId,input.sourceKind,input.sourceId,sourceKey,input.recoveryAction,
      input.classification,input.reasonCode,JSON.stringify(input.sourcePayload),
      input.maxAttempts,input.cooldownSeconds,input.autoExecutionAllowed,input.expiresAt,userId
    ]
  );
  const inserted=result.rows[0]?.plan_id;
  if(inserted){
    await appendAudit(client,{
      workspaceId:input.workspaceId,userId,planId:inserted,action:"plan-created",
      details:{
        sourceKind:input.sourceKind,
        recoveryAction:input.recoveryAction,
        classification:input.classification,
        autoExecutionAllowed:input.autoExecutionAllowed
      }
    });
    return true;
  }
  return false;
}

export async function scanIntegrationRecoveryPlans(userId:string){
  const workspaces=await listWorkspacesForUser(userId);
  const adminWorkspaceIds=new Set(
    workspaces.filter(item=>item.role==="owner"||item.role==="admin").map(item=>item.id)
  );

  const created=await withUserDatabase(userId,async(client)=>{
    const [connectorRows,deadLetterRows,credentialRows]=await Promise.all([
      client.query(`
        select distinct on (a.workspace_id,a.connector_key)
          a.workspace_id,a.audit_id,a.connector_key,a.status,a.error_code,
          a.transport_kind,a.duration_ms,a.created_at
        from app.workspace_connector_audit a
        order by a.workspace_id,a.connector_key,a.created_at desc`),
      client.query(`
        select dl.workspace_id,dl.dead_letter_id,f.failure_category,f.failure_code,
               f.failure_summary,f.failed_at
        from app.event_bus_dead_letters dl
        inner join app.event_bus_delivery_failures f on f.failure_id=dl.failure_id
        where not exists (
          select 1 from app.event_bus_recovery_audit ra
          where ra.dead_letter_id=dl.dead_letter_id
            and ra.action='dead-letter-dismissed'
        )
        order by dl.entered_at desc`),
      client.query(`
        select workspace_id,credential_ref_id,application_id,environment,label,
               lifecycle_status,replacement_state,rotation_due_at,expires_at
        from app.workspace_credential_references
        order by workspace_id,application_id,environment,label`)
    ]);

    let connectorPlans=0,eventPlans=0,credentialPlans=0;

    for(const row of connectorRows.rows){
      const workspaceId=String(row.workspace_id);
      if(!adminWorkspaceIds.has(workspaceId) || row.status!=="failed") continue;
      const classification=connectorFailureClassification({
        status:"failed",
        errorCode:row.error_code?String(row.error_code):null,
        transportKind:row.transport_kind==="http"?"http":row.transport_kind==="local"?"local":"legacy"
      });
      if(await insertPlan(client,userId,{
        workspaceId,
        sourceKind:"connector-audit",
        sourceId:String(row.audit_id),
        recoveryAction:"connector-health-retry",
        classification:classification.classification,
        reasonCode:classification.reasonCode,
        sourcePayload:{
          auditId:String(row.audit_id),
          connectorKey:String(row.connector_key),
          errorCode:row.error_code?String(row.error_code):null,
          transportKind:String(row.transport_kind),
          observedDurationMs:Number(row.duration_ms??0),
          observedAt:new Date(String(row.created_at)).toISOString()
        },
        maxAttempts:classification.maxAttempts,
        cooldownSeconds:classification.cooldownSeconds,
        autoExecutionAllowed:classification.autoExecutionAllowed,
        expiresAt:classification.autoExecutionAllowed
          ? new Date(Date.now()+24*60*60*1000).toISOString()
          : null
      })) connectorPlans++;
    }

    for(const row of deadLetterRows.rows){
      const workspaceId=String(row.workspace_id);
      if(!adminWorkspaceIds.has(workspaceId)) continue;
      const classification=eventFailureClassification(String(row.failure_category));
      if(await insertPlan(client,userId,{
        workspaceId,
        sourceKind:"event-dead-letter",
        sourceId:String(row.dead_letter_id),
        recoveryAction:classification.action,
        classification:classification.classification,
        reasonCode:classification.reasonCode,
        sourcePayload:{
          deadLetterId:String(row.dead_letter_id),
          failureCategory:String(row.failure_category),
          failureCode:String(row.failure_code),
          failureSummary:String(row.failure_summary),
          failedAt:new Date(String(row.failed_at)).toISOString()
        },
        maxAttempts:0,
        cooldownSeconds:0,
        autoExecutionAllowed:false,
        expiresAt:null
      })) eventPlans++;
    }

    for(const row of credentialRows.rows){
      const workspaceId=String(row.workspace_id);
      if(!adminWorkspaceIds.has(workspaceId)) continue;
      const riskState=credentialReferenceRiskState({
        lifecycleStatus:String(row.lifecycle_status) as "active"|"revoked",
        replacementState:String(row.replacement_state) as "not-planned"|"prepared",
        rotationDueAt:row.rotation_due_at?new Date(String(row.rotation_due_at)).toISOString():null,
        expiresAt:row.expires_at?new Date(String(row.expires_at)).toISOString():null
      });
      if(riskState==="active") continue;
      const classification=credentialRecoveryClassification(riskState);
      if(await insertPlan(client,userId,{
        workspaceId,
        sourceKind:"credential-reference",
        sourceId:String(row.credential_ref_id),
        recoveryAction:classification.action,
        classification:classification.classification,
        reasonCode:classification.reasonCode,
        sourcePayload:{
          credentialRefId:String(row.credential_ref_id),
          applicationId:String(row.application_id),
          environment:String(row.environment),
          label:String(row.label),
          riskState
        },
        maxAttempts:0,
        cooldownSeconds:0,
        autoExecutionAllowed:false,
        expiresAt:null
      })) credentialPlans++;
    }

    return {connectorPlans,eventPlans,credentialPlans};
  });

  return {
    ...created,
    totalCreated:created.connectorPlans+created.eventPlans+created.credentialPlans
  };
}

export async function listIntegrationRecoveryForUser(userId:string){
  const workspaces=await listWorkspacesForUser(userId);
  const rows=await withUserDatabase(userId,async(client)=>{
    const [plans,attempts,decisions]=await Promise.all([
      client.query(`select * from app.integration_recovery_plans order by created_at desc limit 500`),
      client.query(`select * from app.integration_recovery_attempts order by attempted_at desc limit 1000`),
      client.query(`select * from app.integration_recovery_decisions order by decided_at desc limit 500`)
    ]);
    return {plans:plans.rows,attempts:attempts.rows,decisions:decisions.rows};
  });

  const attemptsByPlan=new Map<string,RecoveryPlanRecord["attempts"]>();
  for(const row of rows.attempts){
    const key=String(row.plan_id);
    const list=attemptsByPlan.get(key)??[];
    list.push({
      attemptId:String(row.attempt_id),
      attemptNumber:Number(row.attempt_number),
      outcome:String(row.outcome) as "succeeded"|"failed"|"blocked",
      errorCode:row.error_code?String(row.error_code):null,
      durationMs:Number(row.duration_ms??0),
      evidence:object(row.evidence),
      attemptedAt:new Date(String(row.attempted_at)).toISOString()
    });
    attemptsByPlan.set(key,list);
  }
  const decisionsByPlan=new Map<string,RecoveryPlanRecord["decision"]>();
  for(const row of rows.decisions){
    decisionsByPlan.set(String(row.plan_id),{
      decisionId:String(row.decision_id),
      decision:String(row.decision) as "approve"|"reject",
      reason:String(row.reason),
      consequence:String(row.consequence),
      decidedAt:new Date(String(row.decided_at)).toISOString()
    });
  }

  const plans:RecoveryPlanRecord[]=rows.plans.map(row=>{
    const base:Omit<RecoveryPlanRecord,"state">={
      planId:String(row.plan_id),
      workspaceId:String(row.workspace_id),
      sourceKind:String(row.source_kind) as RecoverySourceKind,
      sourceId:String(row.source_id),
      recoveryAction:String(row.recovery_action) as RecoveryAction,
      classification:String(row.classification) as RecoveryClassification,
      reasonCode:String(row.reason_code),
      sourcePayload:object(row.source_payload),
      maxAttempts:Number(row.max_attempts),
      cooldownSeconds:Number(row.cooldown_seconds),
      autoExecutionAllowed:Boolean(row.auto_execution_allowed),
      expiresAt:row.expires_at?new Date(String(row.expires_at)).toISOString():null,
      createdAt:new Date(String(row.created_at)).toISOString(),
      attempts:attemptsByPlan.get(String(row.plan_id))??[],
      decision:decisionsByPlan.get(String(row.plan_id))??null
    };
    return {...base,state:planState(base)};
  });

  return {
    workspaces,
    plans,
    summary:{
      total:plans.length,
      readySafeRetries:plans.filter(item=>item.state==="ready").length,
      recovered:plans.filter(item=>item.state==="recovered").length,
      approvalRequired:plans.filter(item=>item.state==="approval-required").length,
      approved:plans.filter(item=>item.state==="approved").length,
      rejected:plans.filter(item=>item.state==="rejected").length,
      exhausted:plans.filter(item=>item.state==="exhausted").length,
      notRetryable:plans.filter(item=>item.state==="not-retryable").length
    },
    policy:{
      safeAutoAction:"connector-health-get-head-only",
      maxRecoveryCycles:3,
      cooldownSeconds:300,
      consequentialChangesRequireOwnerAdminApproval:true,
      credentialMutationAutomatic:false,
      eventReplayAutomatic:false,
      connectionActivationAutomatic:false,
      outboundMutationAutomatic:false,
      ql266Resumed:false
    }
  };
}

async function insertAttempt(userId:string,input:{
  planId:string;
  workspaceId:string;
  attemptNumber:number;
  outcome:"succeeded"|"failed"|"blocked";
  errorCode:string|null;
  durationMs:number;
  evidence:Record<string,unknown>;
}){
  return withUserDatabase(userId,async(client)=>{
    await requireWorkspaceAdmin(client,input.workspaceId);
    const attemptId=randomUUID();
    await client.query(
      `insert into app.integration_recovery_attempts (
        attempt_id,workspace_id,plan_id,attempt_number,outcome,error_code,duration_ms,evidence,attempted_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
      [
        attemptId,input.workspaceId,input.planId,input.attemptNumber,input.outcome,input.errorCode,
        Math.max(0,Math.min(120000,Math.round(input.durationMs))),JSON.stringify(input.evidence),userId
      ]
    );
    await appendAudit(client,{
      workspaceId:input.workspaceId,userId,planId:input.planId,attemptId,
      action:"safe-retry-attempted",
      details:{attemptNumber:input.attemptNumber,outcome:input.outcome}
    });
    await appendAudit(client,{
      workspaceId:input.workspaceId,userId,planId:input.planId,attemptId,
      action:input.outcome==="succeeded"?"safe-retry-succeeded":"safe-retry-failed",
      details:{attemptNumber:input.attemptNumber,errorCode:input.errorCode}
    });
    return attemptId;
  });
}

export async function executeSafeRecoveryPlan(userId:string,planId:string){
  type SafeRecoveryContext =
    | { alreadySucceeded:true; workspaceId:string }
    | {
        alreadySucceeded:false;
        workspaceId:string;
        attemptNumber:number;
        sourcePayload:Record<string,unknown>;
      };

  const plan:SafeRecoveryContext=await withUserDatabase(userId,async(client):Promise<SafeRecoveryContext>=>{
    const result=await client.query(`
      select p.*,
        (select count(*)::int from app.integration_recovery_attempts a where a.plan_id=p.plan_id) as attempt_count,
        (select max(a.attempted_at) from app.integration_recovery_attempts a where a.plan_id=p.plan_id) as last_attempted_at,
        exists (
          select 1 from app.integration_recovery_attempts a
          where a.plan_id=p.plan_id and a.outcome='succeeded'
        ) as already_succeeded
      from app.integration_recovery_plans p
      where p.plan_id=$1 limit 1`,[planId]);
    const row=result.rows[0];
    if(!row) throw new Error("integration_recovery_plan_not_found");
    const workspaceId=String(row.workspace_id);
    await requireWorkspaceAdmin(client,workspaceId);
    if(String(row.classification)!=="safe-bounded-retry" || !row.auto_execution_allowed){
      throw new Error("integration_recovery_safe_retry_not_allowed");
    }
    if(String(row.recovery_action)!=="connector-health-retry"){
      throw new Error("integration_recovery_safe_action_invalid");
    }
    if(row.already_succeeded) return {alreadySucceeded:true as const,workspaceId};
    if(row.expires_at && new Date(String(row.expires_at)).getTime()<=Date.now()){
      throw new Error("integration_recovery_plan_expired");
    }
    const attemptCount=Number(row.attempt_count??0);
    const maxAttempts=Number(row.max_attempts??0);
    if(attemptCount>=maxAttempts) throw new Error("integration_recovery_retry_limit_reached");
    const lastAt=row.last_attempted_at?new Date(String(row.last_attempted_at)).getTime():0;
    const cooldownMs=Number(row.cooldown_seconds??0)*1000;
    if(lastAt && Date.now()-lastAt<cooldownMs) throw new Error("integration_recovery_cooldown_active");
    return {
      alreadySucceeded:false as const,
      workspaceId,
      attemptNumber:attemptCount+1,
      sourcePayload:object(row.source_payload)
    };
  });

  if(plan.alreadySucceeded===true) return {state:"recovered" as const,alreadySucceeded:true};
  const connectorKey=String(plan.sourcePayload.connectorKey??"");
  if(!connectorKey) throw new Error("integration_recovery_connector_key_missing");

  const installation=await withUserDatabase(userId,async(client)=>{
    await requireWorkspaceAdmin(client,plan.workspaceId);
    const result=await client.query(
      `select enabled,config,secret_refs
       from app.workspace_connector_installations
       where workspace_id=$1 and connector_key=$2 limit 1`,
      [plan.workspaceId,connectorKey]
    );
    const row=result.rows[0];
    if(!row) throw new Error("connector_not_configured");
    if(!row.enabled) throw new Error("connector_disabled");
    return {config:object(row.config),secretRefs:object(row.secret_refs)};
  });
  const definition=getRegisteredConnector(connectorKey);
  if(!definition) throw new Error("connector_not_registered");

  const started=Date.now();
  try{
    const health=await executeConnectorHealthBoundary({
      definition,
      workspaceId:plan.workspaceId,
      config:installation.config,
      secretRefs:installation.secretRefs
    });
    const succeeded=health.healthy===true;
    await insertAttempt(userId,{
      planId,
      workspaceId:plan.workspaceId,
      attemptNumber:plan.attemptNumber,
      outcome:succeeded?"succeeded":"failed",
      errorCode:succeeded?null:(health.errorCode??"connector_health_unhealthy"),
      durationMs:health.durationMs,
      evidence:{
        healthStatus:health.status,
        checkedAt:health.checkedAt,
        transportEvidence:health.transportEvidence,
        sdkAuditEvents:health.sdkAuditEvents.slice(0,40)
      }
    });
    return {
      state:succeeded?"recovered" as const:"retry-failed" as const,
      attemptNumber:plan.attemptNumber,
      healthy:health.healthy,
      status:health.status,
      durationMs:health.durationMs,
      errorCode:health.errorCode
    };
  }catch(error){
    const code=error instanceof Error?error.message:"connector_health_retry_failed";
    await insertAttempt(userId,{
      planId,
      workspaceId:plan.workspaceId,
      attemptNumber:plan.attemptNumber,
      outcome:"failed",
      errorCode:code.slice(0,160),
      durationMs:Date.now()-started,
      evidence:{healthOnly:true,mutationAttempted:false}
    });
    return {
      state:"retry-failed" as const,
      attemptNumber:plan.attemptNumber,
      healthy:false,
      status:null,
      durationMs:Date.now()-started,
      errorCode:code
    };
  }
}

export async function runSafeRecoveryCycle(userId:string){
  const center=await listIntegrationRecoveryForUser(userId);
  const eligible=center.plans.filter(item=>item.state==="ready"&&item.autoExecutionAllowed).slice(0,10);
  const results=[];
  for(const plan of eligible){
    results.push({planId:plan.planId,result:await executeSafeRecoveryPlan(userId,plan.planId)});
  }
  return {eligible:eligible.length,executed:results.length,results};
}

export async function recordRecoveryDecision(userId:string,input:{
  planId:string;
  decision:"approve"|"reject";
  reason:string;
}){
  if(!safeOwnerDecisionReason(input.reason)) throw new Error("integration_recovery_decision_reason_invalid");

  return withUserDatabase(userId,async(client)=>{
    const result=await client.query(
      `select * from app.integration_recovery_plans where plan_id=$1 limit 1`,
      [input.planId]
    );
    const row=result.rows[0];
    if(!row) throw new Error("integration_recovery_plan_not_found");
    const workspaceId=String(row.workspace_id);
    await requireWorkspaceAdmin(client,workspaceId);
    if(String(row.classification)!=="owner-approval-required"){
      throw new Error("integration_recovery_owner_decision_not_required");
    }

    const sourceKind=String(row.source_kind) as RecoverySourceKind;
    const consequence=
      sourceKind==="event-dead-letter"
        ? "event-replay-authorized-for-owner-workbench"
        : sourceKind==="credential-reference"
          ? "credential-remediation-authorized-for-owner-workbench"
          : "connector-remediation-authorized-for-owner-workbench";

    const decisionId=randomUUID();
    await client.query(
      `insert into app.integration_recovery_decisions (
        decision_id,workspace_id,plan_id,decision,reason,consequence,decided_by
      ) values ($1,$2,$3,$4,$5,$6,$7)`,
      [decisionId,workspaceId,input.planId,input.decision,input.reason.trim(),consequence,userId]
    );
    await appendAudit(client,{
      workspaceId,userId,planId:input.planId,decisionId,
      action:input.decision==="approve"?"owner-approved":"owner-rejected",
      details:{
        consequence,
        consequentialActionExecuted:false,
        outboundMutation:false,
        connectionActivated:false
      }
    });
    return {
      decisionId,
      planId:input.planId,
      decision:input.decision,
      consequence,
      consequentialActionExecuted:false
    };
  });
}
