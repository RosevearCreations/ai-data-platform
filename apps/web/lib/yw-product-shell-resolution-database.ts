import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  BUILD_371_YW_OBSERVATION,
  composeBuild371YwResolution
} from "./yw-product-shell-resolution";
import type {
  ConvergenceLedgerReceipt,
  OwnerDecisionAuditEvent,
  SignerRegistryEvent
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import type { CustodyIntakeEvent } from "./manifest-custody-receipt-decision";

type SignerRow = {
  event_id: string; source_id: "yw"; event_type: "ENROLLED"|"REVOKED";
  key_id: string; public_key_spki_sha256: string; custody_evidence_uri: string;
  independently_verified_at: Date; recorded_at: Date;
};
type CustodyRow = {
  event_id: string; intake_id: string; source_id: "yw";
  event_type: CustodyIntakeEvent["eventType"]; key_id: string;
  computed_spki_sha256: string|null; independent_pin_spki_sha256: string|null;
  pin_evidence_uri: string|null; custody_evidence_uri: string|null;
  witness_evidence_uri: string|null; recorded_at: Date;
};
type ReceiptRow = {
  receipt_id: string; source_id: "yw"; key_id: string; source_revision: string;
  manifest_revision: string; receipt_sha256: string; nonce: string;
  issued_at: Date; health_observed_at: Date; health_state: "HEALTHY";
  source_runtime: string; verification_state: "VERIFIED_SOURCE_BOUND_HEALTH";
  verified_at: Date;
};
type AdmissionRow = {
  admission_event_id: string; source_id: "yw"; key_id: string;
  receipt_sha256: string; source_revision: string; outcome: "ADMITTED"|"REJECTED";
  receipt_id: string|null; blockers: unknown; recorded_at: Date;
};
type DecisionRow = {
  decision_id: string; source_id: "yw"; receipt_id: string|null;
  decision: "HOLD"|"ACCEPT"|"REJECT"; evidence_uri: string; detail: string;
  decided_at: Date; recorded_at: Date;
};

async function requireAdmin(client: PoolClient) {
  const r=await client.query<{allowed:boolean}>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if(!r.rows[0]?.allowed) throw new Error("build371_suite_admin_required");
}
async function requireOwner(client: PoolClient) {
  const r=await client.query<{allowed:boolean}>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner') as allowed`);
  if(!r.rows[0]?.allowed) throw new Error("build371_suite_owner_required");
}

const signerRow=(r:SignerRow):SignerRegistryEvent=>({
  eventId:r.event_id,sourceId:r.source_id,eventType:r.event_type,keyId:r.key_id,
  publicKeySpkiSha256:r.public_key_spki_sha256,custodyEvidenceURI:r.custody_evidence_uri,
  independentlyVerifiedAt:r.independently_verified_at.toISOString(),
  recordedAt:r.recorded_at.toISOString()
});
const custodyRow=(r:CustodyRow):CustodyIntakeEvent=>({
  eventId:r.event_id,intakeId:r.intake_id,sourceId:r.source_id,eventType:r.event_type,
  keyId:r.key_id,computedSpkiSha256:r.computed_spki_sha256,
  independentPinSpkiSha256:r.independent_pin_spki_sha256,pinEvidenceURI:r.pin_evidence_uri,
  custodyEvidenceURI:r.custody_evidence_uri,witnessEvidenceURI:r.witness_evidence_uri,
  recordedAt:r.recorded_at.toISOString()
});
const receiptRow=(r:ReceiptRow):ConvergenceLedgerReceipt=>({
  receiptId:r.receipt_id,sourceId:r.source_id,keyId:r.key_id,
  sourceRevision:r.source_revision,manifestRevision:r.manifest_revision,
  receiptSha256:r.receipt_sha256,nonce:r.nonce,issuedAt:r.issued_at.toISOString(),
  healthObservedAt:r.health_observed_at.toISOString(),healthState:r.health_state,
  sourceRuntime:r.source_runtime,verificationState:r.verification_state,
  verifiedAt:r.verified_at.toISOString()
});
const admissionRow=(r:AdmissionRow):HealthAdmissionEvent=>({
  admissionEventId:r.admission_event_id,sourceId:r.source_id,keyId:r.key_id,
  receiptSha256:r.receipt_sha256,sourceRevision:r.source_revision,outcome:r.outcome,
  receiptId:r.receipt_id,blockers:Array.isArray(r.blockers)?r.blockers.filter((x):x is string=>typeof x==="string"):[],
  recordedAt:r.recorded_at.toISOString()
});
const decisionRow=(r:DecisionRow):OwnerDecisionAuditEvent=>({
  decisionId:r.decision_id,sourceId:r.source_id,receiptId:r.receipt_id,
  decision:r.decision,evidenceURI:r.evidence_uri,detail:r.detail,
  decidedAt:r.decided_at.toISOString(),recordedAt:r.recorded_at.toISOString()
});

async function loadEvidence(client:PoolClient){
  const [signers,custody,receipts,admissions,decisions]=await Promise.all([
    client.query<SignerRow>(`select event_id,source_id,event_type,key_id,public_key_spki_sha256,
      custody_evidence_uri,independently_verified_at,recorded_at
      from app.master_source_signer_registry_events where source_id='yw'
      order by recorded_at desc limit 500`),
    client.query<CustodyRow>(`select event_id,intake_id,source_id,event_type,key_id,
      computed_spki_sha256,independent_pin_spki_sha256,pin_evidence_uri,
      custody_evidence_uri,witness_evidence_uri,recorded_at
      from app.master_source_signer_enrollment_intake_events where source_id='yw'
      order by recorded_at desc limit 500`),
    client.query<ReceiptRow>(`select receipt_id,source_id,key_id,source_revision,manifest_revision,
      receipt_sha256,nonce,issued_at,health_observed_at,health_state,source_runtime,
      verification_state,verified_at from app.master_convergence_receipt_ledger
      where source_id='yw' order by verified_at desc limit 500`),
    client.query<AdmissionRow>(`select admission_event_id,source_id,key_id,receipt_sha256,
      source_revision,outcome,receipt_id,blockers,recorded_at
      from app.master_source_health_admission_events where source_id='yw'
      order by recorded_at desc limit 500`),
    client.query<DecisionRow>(`select decision_id,source_id,receipt_id,decision,evidence_uri,
      detail,decided_at,recorded_at from app.master_owner_decision_audit
      where source_id='yw' order by recorded_at desc limit 500`)
  ]);
  return {
    signerEvents:signers.rows.map(signerRow),custodyEvents:custody.rows.map(custodyRow),
    receipts:receipts.rows.map(receiptRow),admissionEvents:admissions.rows.map(admissionRow),
    ownerDecisions:decisions.rows.map(decisionRow)
  };
}

export async function listBuild371YwResolutionForUser(userId:string){
  return withUserDatabase(userId,async client=>{
    await requireAdmin(client);
    const history=await client.query(
      `select * from app.master_yw_source_resolution_events order by recorded_at desc limit 100`
    );
    return {model:composeBuild371YwResolution(await loadEvidence(client)),history:history.rows};
  });
}

export async function recordBuild371YwResolution(userId:string){
  return withUserDatabase(userId,async client=>{
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))",[
      "build371-yw-product-shell-resolution"
    ]);
    const model=composeBuild371YwResolution(await loadEvidence(client));
    const now=new Date().toISOString();
    const o=BUILD_371_YW_OBSERVATION;

    const observationId=randomUUID();
    await client.query(`insert into app.master_deployed_manifest_observation_events(
      observation_id,actor_user_id,source_id,source_production_revision,deployment_id,
      deployment_url,deployment_git_revision,observed_manifest_revision,observed_source_id,
      observed_source_role,tenant_boundary,signature_state,connection_state,observation_state,
      response_etag,request_trace,evidence_uri,observed_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,'yw',
      'platform_shell','platform_shell',$7,$8,$9,$10,$11,$12,$13::timestamptz)`,[
      observationId,o.productionMain,o.deploymentId,o.deploymentUrl,o.deploymentGitRevision,
      o.deployedManifestRevision,o.signatureState,o.connectionState,
      model.identityState==="VERIFIED_EXACT"?"VERIFIED_EXACT":"HOLD_UNVERIFIED",
      o.responseEtag,o.requestTrace,o.evidenceURI,o.observedAt
    ]);

    const correlationId=randomUUID();
    await client.query(`insert into app.master_source_custody_correlation_events(
      correlation_id,actor_user_id,source_id,source_production_revision,signer_key_id,
      registry_event_id,enrollment_intake_id,computed_spki_sha256,independent_pin_spki_sha256,
      custody_evidence_uri,witness_evidence_uri,custody_state,blockers,checked_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::timestamptz)`,[
      correlationId,o.productionMain,model.signer?.keyId??null,model.signer?.eventId??null,
      model.custodyIntake?.intakeId??null,model.custodyIntake?.computedSpkiSha256??null,
      model.custodyIntake?.independentPinSpkiSha256??null,
      model.custodyIntake?.custodyEvidenceURI??null,model.custodyIntake?.witnessEvidenceURI??null,
      model.signerState,JSON.stringify(model.blockers.filter(b=>/signer|custody|SPKI|pin|witness/i.test(b))),now
    ]);

    const receiptClosureId=randomUUID();
    await client.query(`insert into app.master_fresh_receipt_admission_closure_events(
      closure_id,actor_user_id,source_id,source_production_revision,manifest_observation_id,
      custody_correlation_id,receipt_id,receipt_state,closure_state,blockers,checked_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8::jsonb,$9::timestamptz)`,[
      receiptClosureId,o.productionMain,observationId,correlationId,
      model.latestReceipt?.receiptId??null,model.receiptState,
      model.sourceClosureState==="READY"?"VERIFIED_CURRENT":"HOLD",
      JSON.stringify(model.blockers),now
    ]);

    const runtimeDecisionId=randomUUID();
    await client.query(`insert into app.master_three_master_runtime_decision_rechecks(
      decision_recheck_id,actor_user_id,source_id,source_production_revision,
      manifest_observation_id,custody_correlation_id,receipt_closure_id,
      controller_base_revision,ai_hub_ack,ai_hub_main,comms_handoff,comms_main,
      master_gate_state,source_closure_state,decision_state,blockers,checked_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::timestamptz)`,[
      runtimeDecisionId,o.productionMain,observationId,correlationId,receiptClosureId,
      model.controllerBaseRevision,model.master.snapshot.aiHub.ack,model.master.snapshot.aiHub.main,
      model.master.snapshot.comms.handoff,model.master.snapshot.comms.main,model.master.gateState,
      model.sourceClosureState,model.resolutionState==="READY_FOR_OWNER_DECISION"?"READY_FOR_OWNER_DECISION":"HOLD",
      JSON.stringify(model.blockers),now
    ]);

    const resolutionEventId=randomUUID();
    await client.query(`insert into app.master_yw_source_resolution_events(
      resolution_event_id,actor_user_id,source_id,source_production_revision,deployment_id,
      deployment_git_revision,deployed_manifest_revision,source_role,tenant_boundary,
      identity_state,signer_state,receipt_state,three_master_state,resolution_state,
      manifest_observation_id,custody_correlation_id,receipt_closure_id,
      runtime_decision_recheck_id,evidence_uri,blockers,observed_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,
      'platform_shell','platform_shell',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::timestamptz)`,[
      resolutionEventId,o.productionMain,o.deploymentId,o.deploymentGitRevision,
      o.deployedManifestRevision,model.identityState,model.signerState,model.receiptState,
      model.master.gateState,model.resolutionState,observationId,correlationId,receiptClosureId,
      runtimeDecisionId,o.evidenceURI,JSON.stringify(model.blockers),o.observedAt
    ]);

    return {resolutionEventId,observationId,correlationId,receiptClosureId,
      runtimeDecisionId,identityState:model.identityState,signerState:model.signerState,
      receiptState:model.receiptState,threeMasterState:model.master.gateState,
      resolutionState:model.resolutionState,blockers:model.blockers};
  });
}
