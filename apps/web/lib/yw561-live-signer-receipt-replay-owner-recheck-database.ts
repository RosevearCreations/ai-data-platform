import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import type {
  ConvergenceLedgerReceipt,
  OwnerDecisionAuditEvent,
  SignerRegistryEvent
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import type { CustodyIntakeEvent } from "./manifest-custody-receipt-decision";
import type {
  Build372CustodyEvidenceEvent,
  Build372ReplayCorrelationEvent
} from "./yw561-signer-receipt-replay-closure";
import {
  BUILD_373_YW561_LIVE_OBSERVATION,
  composeBuild373Yw561OwnerRecheck
} from "./yw561-live-signer-receipt-replay-owner-recheck";

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
type CustodyEvidenceRow = {
  evidence_event_id: string; source_production_revision: string; key_id: string;
  public_key_spki_sha256: string; pin_evidence_uri: string; custody_evidence_uri: string;
  witness_evidence_uri: string; registry_event_id: string|null;
  enrollment_event_id: string|null;
  custody_state: Build372CustodyEvidenceEvent["custodyState"];
  blockers: unknown; checked_at: Date; recorded_at: Date;
};
type ReplayRow = {
  replay_event_id: string; source_production_revision: string; manifest_revision: string;
  receipt_id: string; receipt_sha256: string; nonce_sha256: string;
  replay_evidence_uri: string; replay_evidence_digest: string;
  correlation_state: Build372ReplayCorrelationEvent["correlationState"];
  blockers: unknown; checked_at: Date; recorded_at: Date;
};

async function requireAdmin(client: PoolClient) {
  const r = await client.query<{allowed:boolean}>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!r.rows[0]?.allowed) throw new Error("build373_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const r = await client.query<{allowed:boolean}>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner') as allowed`);
  if (!r.rows[0]?.allowed) throw new Error("build373_suite_owner_required");
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
const custodyEvidenceRow=(r:CustodyEvidenceRow):Build372CustodyEvidenceEvent=>({
  evidenceEventId:r.evidence_event_id,sourceProductionRevision:r.source_production_revision,
  keyId:r.key_id,publicKeySpkiSha256:r.public_key_spki_sha256,
  pinEvidenceURI:r.pin_evidence_uri,custodyEvidenceURI:r.custody_evidence_uri,
  witnessEvidenceURI:r.witness_evidence_uri,registryEventId:r.registry_event_id,
  enrollmentEventId:r.enrollment_event_id,custodyState:r.custody_state,
  blockers:Array.isArray(r.blockers)?r.blockers.filter((x):x is string=>typeof x==="string"):[],
  checkedAt:r.checked_at.toISOString(),recordedAt:r.recorded_at.toISOString()
});
const replayRow=(r:ReplayRow):Build372ReplayCorrelationEvent=>({
  replayEventId:r.replay_event_id,sourceProductionRevision:r.source_production_revision,
  manifestRevision:r.manifest_revision,receiptId:r.receipt_id,receiptSha256:r.receipt_sha256,
  nonceSha256:r.nonce_sha256,replayEvidenceURI:r.replay_evidence_uri,
  replayEvidenceDigest:r.replay_evidence_digest,correlationState:r.correlation_state,
  blockers:Array.isArray(r.blockers)?r.blockers.filter((x):x is string=>typeof x==="string"):[],
  checkedAt:r.checked_at.toISOString(),recordedAt:r.recorded_at.toISOString()
});

async function loadEvidence(client: PoolClient) {
  const [signers,custody,receipts,admissions,decisions,custodyEvidence,replay] =
    await Promise.all([
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
        where source_id='yw' order by recorded_at desc limit 500`),
      client.query<CustodyEvidenceRow>(`select evidence_event_id,source_production_revision,key_id,
        public_key_spki_sha256,pin_evidence_uri,custody_evidence_uri,witness_evidence_uri,
        registry_event_id,enrollment_event_id,custody_state,blockers,checked_at,recorded_at
        from app.master_yw561_custody_evidence_intake_events
        order by recorded_at desc limit 500`),
      client.query<ReplayRow>(`select replay_event_id,source_production_revision,manifest_revision,
        receipt_id,receipt_sha256,nonce_sha256,replay_evidence_uri,replay_evidence_digest,
        correlation_state,blockers,checked_at,recorded_at
        from app.master_yw561_replay_correlation_events
        order by recorded_at desc limit 500`)
    ]);

  return {
    signerEvents:signers.rows.map(signerRow),
    custodyEvents:custody.rows.map(custodyRow),
    receipts:receipts.rows.map(receiptRow),
    admissionEvents:admissions.rows.map(admissionRow),
    ownerDecisions:decisions.rows.map(decisionRow),
    custodyEvidenceEvents:custodyEvidence.rows.map(custodyEvidenceRow),
    replayEvents:replay.rows.map(replayRow)
  };
}

export async function listBuild373Yw561OwnerRecheckForUser(userId:string) {
  return withUserDatabase(userId,async client=>{
    await requireAdmin(client);
    const [signerHistory,receiptHistory,replayHistory,ownerHistory]=await Promise.all([
      client.query(`select * from app.master_yw561_live_signer_correlation_events order by recorded_at desc limit 100`),
      client.query(`select * from app.master_yw561_exact_health_receipt_closure_events order by recorded_at desc limit 100`),
      client.query(`select * from app.master_yw561_durable_replay_acceptance_events order by recorded_at desc limit 100`),
      client.query(`select * from app.master_yw561_three_master_owner_decision_rechecks order by recorded_at desc limit 100`)
    ]);
    return {
      model:composeBuild373Yw561OwnerRecheck(await loadEvidence(client)),
      signerHistory:signerHistory.rows,
      receiptHistory:receiptHistory.rows,
      replayHistory:replayHistory.rows,
      ownerHistory:ownerHistory.rows
    };
  });
}

export async function recordBuild373Yw561OwnerRecheck(userId:string) {
  return withUserDatabase(userId,async client=>{
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))",[
      "build373-yw561-live-signer-receipt-replay-owner-recheck"
    ]);

    const model=composeBuild373Yw561OwnerRecheck(await loadEvidence(client));
    const now=new Date().toISOString();
    const o=BUILD_373_YW561_LIVE_OBSERVATION;

    const signerCorrelationEventId=randomUUID();
    await client.query(`insert into app.master_yw561_live_signer_correlation_events(
      correlation_event_id,actor_user_id,source_id,source_production_revision,
      deployed_manifest_revision,live_manifest_signature_state,signer_registry_event_id,
      enrollment_intake_event_id,custody_evidence_event_id,key_id,public_key_spki_sha256,
      correlation_state,blockers,checked_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::timestamptz)`,[
      signerCorrelationEventId,o.productionMain,o.deployedManifestRevision,
      model.liveManifestSignatureState,model.signer?.eventId??null,
      model.custodyIntake?.eventId??null,model.custodyEvidenceEvent?.evidenceEventId??null,
      model.signer?.keyId??null,model.signer?.publicKeySpkiSha256??null,
      model.signerCorrelationState,JSON.stringify(model.blockers.filter(b=>/signer|custody|enrollment|SPKI/i.test(b))),now
    ]);

    const receiptClosureEventId=randomUUID();
    await client.query(`insert into app.master_yw561_exact_health_receipt_closure_events(
      receipt_closure_event_id,actor_user_id,source_id,source_production_revision,
      manifest_revision,signer_correlation_event_id,receipt_id,admission_event_id,
      receipt_state,blockers,checked_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::timestamptz)`,[
      receiptClosureEventId,o.productionMain,o.deployedManifestRevision,
      signerCorrelationEventId,model.receipt?.receiptId??null,model.admission?.admissionEventId??null,
      model.receiptClosureState,JSON.stringify(model.blockers.filter(b=>/receipt|HEALTHY|admission/i.test(b))),now
    ]);

    const replayAcceptanceEventId=randomUUID();
    await client.query(`insert into app.master_yw561_durable_replay_acceptance_events(
      replay_acceptance_event_id,actor_user_id,source_id,source_production_revision,
      receipt_closure_event_id,replay_correlation_event_id,replay_state,blockers,checked_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6::jsonb,$7::timestamptz)`,[
      replayAcceptanceEventId,o.productionMain,receiptClosureEventId,
      model.replayEvent?.replayEventId??null,model.replayAcceptanceState,
      JSON.stringify(model.blockers.filter(b=>/replay/i.test(b))),now
    ]);

    const ownerRecheckId=randomUUID();
    await client.query(`insert into app.master_yw561_three_master_owner_decision_rechecks(
      owner_recheck_id,actor_user_id,source_id,source_production_revision,
      signer_correlation_event_id,receipt_closure_event_id,replay_acceptance_event_id,
      latest_owner_decision_id,controller_base_revision,ai_hub_main,comms_main,
      source_evidence_state,master_gate_state,owner_decision_state,blockers,checked_at
    ) values($1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::timestamptz)`,[
      ownerRecheckId,o.productionMain,signerCorrelationEventId,receiptClosureEventId,
      replayAcceptanceEventId,model.latestExactReceiptOwnerDecisionId,
      model.controllerBaseRevision,model.master.snapshot.aiHub.main,
      model.master.snapshot.comms.main,model.sourceEvidenceState,model.master.gateState,
      model.ownerDecisionState,JSON.stringify(model.blockers),now
    ]);

    return {
      signerCorrelationEventId,
      receiptClosureEventId,
      replayAcceptanceEventId,
      ownerRecheckId,
      signerCorrelationState:model.signerCorrelationState,
      receiptClosureState:model.receiptClosureState,
      replayAcceptanceState:model.replayAcceptanceState,
      sourceEvidenceState:model.sourceEvidenceState,
      masterGateState:model.master.gateState,
      ownerDecisionState:model.ownerDecisionState,
      blockers:model.blockers
    };
  });
}
