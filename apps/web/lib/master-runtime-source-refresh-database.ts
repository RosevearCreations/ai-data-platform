import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import { composeBuild368RuntimeRecheck } from "./master-runtime-source-refresh";
import type {
  ConvergenceLedgerReceipt,
  OwnerDecisionAuditEvent,
  SignerRegistryEvent,
  Source365Id
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";

type SignerRow={event_id:string;source_id:Source365Id;event_type:"ENROLLED"|"REVOKED";key_id:string;public_key_spki_sha256:string;custody_evidence_uri:string;independently_verified_at:Date;recorded_at:Date};
type ReceiptRow={receipt_id:string;source_id:Source365Id;key_id:string;source_revision:string;manifest_revision:string;receipt_sha256:string;nonce:string;issued_at:Date;health_observed_at:Date;health_state:"HEALTHY";source_runtime:string;verification_state:"VERIFIED_SOURCE_BOUND_HEALTH";verified_at:Date};
type AdmissionRow={admission_event_id:string;source_id:Source365Id;key_id:string;receipt_sha256:string;source_revision:string;outcome:"ADMITTED"|"REJECTED";receipt_id:string|null;blockers:unknown;recorded_at:Date};
type DecisionRow={decision_id:string;source_id:Source365Id;receipt_id:string|null;decision:"HOLD"|"ACCEPT"|"REJECT";evidence_uri:string;detail:string;decided_at:Date;recorded_at:Date};

async function requireAdmin(client:PoolClient){
  const r=await client.query<{allowed:boolean}>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ) as allowed`);
  if(!r.rows[0]?.allowed) throw new Error("build368_suite_admin_required");
}
async function requireOwner(client:PoolClient){
  const r=await client.query<{allowed:boolean}>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  ) as allowed`);
  if(!r.rows[0]?.allowed) throw new Error("build368_suite_owner_required");
}
function signer(row:SignerRow):SignerRegistryEvent{return{eventId:row.event_id,sourceId:row.source_id,eventType:row.event_type,keyId:row.key_id,publicKeySpkiSha256:row.public_key_spki_sha256,custodyEvidenceURI:row.custody_evidence_uri,independentlyVerifiedAt:row.independently_verified_at.toISOString(),recordedAt:row.recorded_at.toISOString()}}
function receipt(row:ReceiptRow):ConvergenceLedgerReceipt{return{receiptId:row.receipt_id,sourceId:row.source_id,keyId:row.key_id,sourceRevision:row.source_revision,manifestRevision:row.manifest_revision,receiptSha256:row.receipt_sha256,nonce:row.nonce,issuedAt:row.issued_at.toISOString(),healthObservedAt:row.health_observed_at.toISOString(),healthState:row.health_state,sourceRuntime:row.source_runtime,verificationState:row.verification_state,verifiedAt:row.verified_at.toISOString()}}
function admission(row:AdmissionRow):HealthAdmissionEvent{return{admissionEventId:row.admission_event_id,sourceId:row.source_id,keyId:row.key_id,receiptSha256:row.receipt_sha256,sourceRevision:row.source_revision,outcome:row.outcome,receiptId:row.receipt_id,blockers:Array.isArray(row.blockers)?row.blockers.filter((x):x is string=>typeof x==="string"):[],recordedAt:row.recorded_at.toISOString()}}
function decision(row:DecisionRow):OwnerDecisionAuditEvent{return{decisionId:row.decision_id,sourceId:row.source_id,receiptId:row.receipt_id,decision:row.decision,evidenceURI:row.evidence_uri,detail:row.detail,decidedAt:row.decided_at.toISOString(),recordedAt:row.recorded_at.toISOString()}}

async function loadEvidence(client:PoolClient){
  const [s,r,a,d]=await Promise.all([
    client.query<SignerRow>(`select event_id,source_id,event_type,key_id,public_key_spki_sha256,custody_evidence_uri,independently_verified_at,recorded_at from app.master_source_signer_registry_events order by recorded_at desc limit 1000`),
    client.query<ReceiptRow>(`select receipt_id,source_id,key_id,source_revision,manifest_revision,receipt_sha256,nonce,issued_at,health_observed_at,health_state,source_runtime,verification_state,verified_at from app.master_convergence_receipt_ledger order by verified_at desc limit 1000`),
    client.query<AdmissionRow>(`select admission_event_id,source_id,key_id,receipt_sha256,source_revision,outcome,receipt_id,blockers,recorded_at from app.master_source_health_admission_events order by recorded_at desc limit 1000`),
    client.query<DecisionRow>(`select decision_id,source_id,receipt_id,decision,evidence_uri,detail,decided_at,recorded_at from app.master_owner_decision_audit order by recorded_at desc limit 1000`)
  ]);
  return{signerEvents:s.rows.map(signer),receipts:r.rows.map(receipt),admissionEvents:a.rows.map(admission),ownerDecisions:d.rows.map(decision)};
}

export async function listBuild368RuntimeRecheckForUser(userId:string){
  return withUserDatabase(userId,async client=>{
    await requireAdmin(client);
    const [runtime,refresh,rechecks]=await Promise.all([
      client.query(`select * from app.master_runtime_evidence_rechecks order by recorded_at desc limit 50`),
      client.query(`select * from app.master_source_receipt_refresh_requests order by recorded_at desc limit 100`),
      client.query(`select * from app.master_supervised_acceptance_rechecks order by recorded_at desc limit 100`)
    ]);
    return{model:composeBuild368RuntimeRecheck(await loadEvidence(client)),runtimeRechecks:runtime.rows,refreshRequests:refresh.rows,acceptanceRechecks:rechecks.rows};
  });
}

export async function recordBuild368RuntimeAndSourceRecheck(userId:string){
  return withUserDatabase(userId,async client=>{
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))",["build368-runtime-source-recheck"]);
    const model=composeBuild368RuntimeRecheck(await loadEvidence(client));
    const now=new Date().toISOString();
    const runtimeId=randomUUID();
    await client.query(
      `insert into app.master_runtime_evidence_rechecks (
        recheck_id,actor_user_id,controller_revision,ai_hub_ack,ai_hub_main,ai_hub_state,
        comms_ack,comms_main,comms_state,blockers,gate_state,checked_at
      ) values ($1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9::jsonb,$10,$11::timestamptz)`,
      [runtimeId,model.master.snapshot.controllerRevision,model.master.snapshot.aiHub.ack,model.master.snapshot.aiHub.main,JSON.stringify(model.master.snapshot.aiHub),model.master.snapshot.comms.ack,model.master.snapshot.comms.main,JSON.stringify(model.master.snapshot.comms),JSON.stringify(model.master.blockers),model.master.gateState,now]
    );
    const results=[];
    for(const source of model.sources){
      const refreshId=randomUUID();
      await client.query(
        `insert into app.master_source_receipt_refresh_requests (
          refresh_request_id,actor_user_id,source_id,source_production_revision,
          observed_manifest_revision,revision_state,signer_state,current_receipt_id,
          receipt_state,requested_action,handoff_token,blockers,requested_at
        ) values ($1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::timestamptz)`,
        [refreshId,source.sourceId,source.productionMain,source.observedManifestRevision,source.revisionState,source.signerState,source.latestReceipt?.receiptId??null,source.receiptState,source.requestedAction,source.handoffToken,JSON.stringify(source.blockers),now]
      );
      const acceptanceId=randomUUID();
      await client.query(
        `insert into app.master_supervised_acceptance_rechecks (
          acceptance_recheck_id,actor_user_id,runtime_recheck_id,refresh_request_id,
          source_id,source_revision,master_gate_state,source_evidence_state,
          acceptance_state,blockers,checked_at
        ) values ($1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::timestamptz)`,
        [acceptanceId,runtimeId,refreshId,source.sourceId,source.productionMain,model.master.gateState,source.sourceEvidenceState,source.acceptanceState,JSON.stringify(source.blockers),now]
      );
      results.push({sourceId:source.sourceId,refreshId,acceptanceId,handoffToken:source.handoffToken,requestedAction:source.requestedAction,acceptanceState:source.acceptanceState});
    }
    return{runtimeId,masterGate:model.master.gateState,results};
  });
}
