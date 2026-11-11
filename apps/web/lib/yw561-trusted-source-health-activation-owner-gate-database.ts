import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import { loadBuild373EvidenceFromClient } from "./yw561-live-signer-receipt-replay-owner-recheck-database";
import {
  BUILD_374_CONTROLLER_BASE_REVISION,
  BUILD_374_MASTER_RUNTIME,
  composeBuild374Yw561Activation
} from "./yw561-trusted-source-health-activation-owner-gate";

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build374_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner') as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build374_suite_owner_required");
}

export async function listBuild374Yw561ActivationForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const evidence = await loadBuild373EvidenceFromClient(client);
    const [signerHistory, activationHistory, masterHistory, ownerGateHistory] = await Promise.all([
      client.query(`select * from app.master_yw561_trusted_signer_admission_events order by recorded_at desc limit 100`),
      client.query(`select * from app.master_yw561_current_receipt_replay_activation_events order by recorded_at desc limit 100`),
      client.query(`select * from app.master_yw561_three_master_runtime_correlation_events order by recorded_at desc limit 100`),
      client.query(`select * from app.master_yw561_owner_acceptance_gate_events order by recorded_at desc limit 100`)
    ]);
    return {
      model: composeBuild374Yw561Activation(evidence),
      signerHistory: signerHistory.rows,
      activationHistory: activationHistory.rows,
      masterHistory: masterHistory.rows,
      ownerGateHistory: ownerGateHistory.rows
    };
  });
}

export async function recordBuild374Yw561Activation(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build374-yw561-trusted-source-health-activation-owner-gate"
    ]);

    const evidence = await loadBuild373EvidenceFromClient(client);
    const model = composeBuild374Yw561Activation(evidence);
    const checkedAt = new Date().toISOString();

    const signerAdmissionEventId = randomUUID();
    await client.query(`insert into app.master_yw561_trusted_signer_admission_events(
      signer_admission_event_id,actor_user_id,source_id,source_production_revision,
      signer_registry_event_id,enrollment_intake_event_id,custody_evidence_event_id,
      key_id,public_key_spki_sha256,admission_state,blockers,checked_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::timestamptz
    )`,[
      signerAdmissionEventId,
      model.observation.productionMain,
      model.trustedSigner?.eventId ?? null,
      model.custodyIntake?.eventId ?? null,
      model.custodyEvidenceEvent?.evidenceEventId ?? null,
      model.trustedSigner?.keyId ?? null,
      model.trustedSigner?.publicKeySpkiSha256 ?? null,
      model.trustedSignerAdmissionState,
      JSON.stringify(model.blockers.filter((b) => /signer|custody|enrollment/i.test(b))),
      checkedAt
    ]);

    const activationEventId = randomUUID();
    await client.query(`insert into app.master_yw561_current_receipt_replay_activation_events(
      activation_event_id,actor_user_id,source_id,source_production_revision,
      signer_admission_event_id,receipt_id,health_admission_event_id,replay_correlation_event_id,
      receipt_activation_state,replay_activation_state,activation_state,blockers,checked_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::timestamptz
    )`,[
      activationEventId,
      model.observation.productionMain,
      signerAdmissionEventId,
      model.currentReceipt?.receiptId ?? null,
      model.currentReceiptAdmission?.admissionEventId ?? null,
      model.currentReplayEvidence?.replayEventId ?? null,
      model.currentReceiptActivationState,
      model.currentReplayActivationState,
      model.sourceHealthActivationState,
      JSON.stringify(model.blockers.filter((b) => /receipt|HEALTHY|replay|activation/i.test(b))),
      checkedAt
    ]);

    const masterCorrelationEventId = randomUUID();
    await client.query(`insert into app.master_yw561_three_master_runtime_correlation_events(
      correlation_event_id,actor_user_id,source_id,source_production_revision,
      activation_event_id,controller_base_revision,ai_hub_main,comms_main,
      master_gate_state,correlation_state,blockers,checked_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::timestamptz
    )`,[
      masterCorrelationEventId,
      model.observation.productionMain,
      activationEventId,
      BUILD_374_CONTROLLER_BASE_REVISION,
      BUILD_374_MASTER_RUNTIME.aiHub.main,
      BUILD_374_MASTER_RUNTIME.comms.main,
      model.threeMasterRuntimeGate,
      model.threeMasterRuntimeCorrelationState,
      JSON.stringify(model.blockers.filter((b) => /Master|runtime|AI Hub|Comms/i.test(b))),
      checkedAt
    ]);

    const ownerGateEventId = randomUUID();
    await client.query(`insert into app.master_yw561_owner_acceptance_gate_events(
      owner_gate_event_id,actor_user_id,source_id,source_production_revision,
      activation_event_id,master_correlation_event_id,current_receipt_id,
      latest_owner_decision_id,gate_state,connection_state,blockers,checked_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::timestamptz
    )`,[
      ownerGateEventId,
      model.observation.productionMain,
      activationEventId,
      masterCorrelationEventId,
      model.currentReceipt?.receiptId ?? null,
      model.latestExactReceiptOwnerDecisionId,
      model.ownerAcceptanceGateState,
      model.connectionState,
      JSON.stringify(model.blockers),
      checkedAt
    ]);

    return {
      signerAdmissionEventId,
      activationEventId,
      masterCorrelationEventId,
      ownerGateEventId,
      model
    };
  });
}
