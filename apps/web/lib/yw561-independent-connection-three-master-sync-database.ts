import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import { loadBuild373EvidenceFromClient } from "./yw561-live-signer-receipt-replay-owner-recheck-database";
import {
  BUILD_376_CONTROLLER_BASE_REVISION,
  BUILD_376_MASTER_RUNTIME,
  composeBuild376Yw561ConnectionSync,
  type Build376ConnectionIntakeEvent,
  type Build376ConnectionRegistryEvidence
} from "./yw561-independent-connection-three-master-sync";

type RuntimeGateRow = { current_gate_state: "OPEN" | "HOLD" };

type RegistryRow = {
  evidence_id: string;
  source_id: "yw";
  record_version: string;
  environment: "nonproduction" | "production";
  declared_status: Build376ConnectionRegistryEvidence["declaredStatus"];
  status_observed_at: Date;
  status_expires_at: Date;
  evidence_uri: string;
  immutable_revision: string | null;
  signer_key_id: string | null;
  signer_fingerprint: string | null;
  test_evidence_uri: string | null;
  connection_evidence_uri: string | null;
  owner_authorized: boolean;
  independent_test_verified: boolean;
  independent_connection_verified: boolean;
  evidence_authority: Build376ConnectionRegistryEvidence["evidenceAuthority"];
};

type IntakeRow = {
  intake_event_id: string;
  registry_evidence_id: string;
  source_production_revision: string;
  exact_receipt_id: string | null;
  verification_state: "VERIFIED_CURRENT";
  checked_at: Date;
  recorded_at: Date;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build376_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner') as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build376_suite_owner_required");
}

function registryRow(row: RegistryRow): Build376ConnectionRegistryEvidence {
  return {
    evidenceId: row.evidence_id,
    sourceId: row.source_id,
    recordVersion: Number(row.record_version),
    environment: row.environment,
    declaredStatus: row.declared_status,
    statusObservedAt: row.status_observed_at.toISOString(),
    statusExpiresAt: row.status_expires_at.toISOString(),
    evidenceURI: row.evidence_uri,
    immutableRevision: row.immutable_revision,
    signerKeyId: row.signer_key_id,
    signerFingerprint: row.signer_fingerprint,
    testEvidenceURI: row.test_evidence_uri,
    connectionEvidenceURI: row.connection_evidence_uri,
    ownerAuthorized: row.owner_authorized,
    independentTestVerified: row.independent_test_verified,
    independentConnectionVerified: row.independent_connection_verified,
    evidenceAuthority: row.evidence_authority
  };
}

function intakeRow(row: IntakeRow): Build376ConnectionIntakeEvent {
  return {
    intakeEventId: row.intake_event_id,
    registryEvidenceId: row.registry_evidence_id,
    sourceProductionRevision: row.source_production_revision,
    exactReceiptId: row.exact_receipt_id,
    verificationState: row.verification_state,
    checkedAt: row.checked_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

async function latestRuntimeGate(client: PoolClient) {
  const result = await client.query<RuntimeGateRow>(`
    select current_gate_state
    from app.master_yw561_runtime_gate_transition_events
    order by recorded_at desc
    limit 1
  `);
  return result.rows[0]?.current_gate_state ?? null;
}

async function latestYwRegistryEvidence(client: PoolClient) {
  const result = await client.query<RegistryRow>(`
    select evidence_id,source_id,record_version,environment,declared_status,
      status_observed_at,status_expires_at,evidence_uri,immutable_revision,
      signer_key_id,signer_fingerprint,test_evidence_uri,connection_evidence_uri,
      owner_authorized,independent_test_verified,independent_connection_verified,
      evidence_authority
    from app.master_shell_source_registry_evidence
    where source_id='yw'
    order by record_version desc
    limit 1
  `);
  return result.rows[0] ? registryRow(result.rows[0]) : null;
}

async function intakeEvents(client: PoolClient) {
  const result = await client.query<IntakeRow>(`
    select intake_event_id,registry_evidence_id,source_production_revision,
      exact_receipt_id,verification_state,checked_at,recorded_at
    from app.master_yw561_independent_connection_evidence_intake_events
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(intakeRow);
}

async function buildCurrentModel(client: PoolClient) {
  const [evidence, previousRuntimeGateState, connectionRegistryEvidence, connectionIntakeEvents] =
    await Promise.all([
      loadBuild373EvidenceFromClient(client),
      latestRuntimeGate(client),
      latestYwRegistryEvidence(client),
      intakeEvents(client)
    ]);
  return composeBuild376Yw561ConnectionSync({
    ...evidence,
    previousRuntimeGateState,
    connectionRegistryEvidence,
    connectionIntakeEvents
  });
}

async function recordClosureChain(
  client: PoolClient,
  model: ReturnType<typeof composeBuild376Yw561ConnectionSync>
) {
  const checkedAt = new Date().toISOString();

  const recheckEventId = randomUUID();
  await client.query(`insert into app.master_yw561_acceptance_continuity_connection_recheck_events(
    recheck_event_id,actor_user_id,source_id,source_production_revision,
    intake_event_id,exact_receipt_id,owner_decision_id,owner_decision,
    prior_continuity_state,recheck_state,blockers,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::timestamptz
  )`,[
    recheckEventId,
    model.prior.activation.observation.productionMain,
    model.currentConnectionIntake?.intakeEventId ?? null,
    model.exactCurrentReceiptId,
    model.prior.latestExactReceiptOwnerDecisionId,
    model.exactCurrentReceiptOwnerDecision,
    model.prior.acceptanceContinuityState,
    model.exactReceiptAcceptanceContinuityRecheckState,
    JSON.stringify(model.blockers),
    checkedAt
  ]);

  const transitionEventId = randomUUID();
  await client.query(`insert into app.master_yw561_verified_connection_transition_events(
    transition_event_id,actor_user_id,source_id,source_production_revision,
    intake_event_id,acceptance_recheck_event_id,runtime_gate_state,
    prior_connection_state,transition_state,connected,connection_evidence_uri,
    blockers,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::timestamptz
  )`,[
    transitionEventId,
    model.prior.activation.observation.productionMain,
    model.currentConnectionIntake?.intakeEventId ?? null,
    recheckEventId,
    model.currentRuntimeGateState,
    model.prior.connectionReconciliationState,
    model.verifiedConnectedTransitionState,
    model.verifiedConnectedTransitionState === "CONNECTED_VERIFIED",
    model.currentConnectionIntake
      ? model.connectionRegistryEvidence?.connectionEvidenceURI ?? null
      : null,
    JSON.stringify(model.blockers),
    checkedAt
  ]);

  const closureEventId = randomUUID();
  await client.query(`insert into app.master_yw561_three_master_sync_closure_events(
    closure_event_id,actor_user_id,source_id,source_production_revision,
    controller_base_revision,ai_hub_main,comms_main,connection_transition_event_id,
    exact_receipt_id,runtime_gate_state,acceptance_continuity_state,connection_state,
    closure_state,masters_synced,blockers,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::timestamptz
  )`,[
    closureEventId,
    model.prior.activation.observation.productionMain,
    BUILD_376_CONTROLLER_BASE_REVISION,
    BUILD_376_MASTER_RUNTIME.aiHub.main,
    BUILD_376_MASTER_RUNTIME.comms.main,
    transitionEventId,
    model.exactCurrentReceiptId,
    model.currentRuntimeGateState,
    model.exactReceiptAcceptanceContinuityRecheckState,
    model.connectionState,
    model.threeMasterSynchronizationClosureState,
    model.mastersSynced,
    JSON.stringify(model.blockers),
    checkedAt
  ]);

  return { recheckEventId, transitionEventId, closureEventId };
}

export async function listBuild376Yw561ConnectionSyncForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const model = await buildCurrentModel(client);
    const [intakeHistory, recheckHistory, transitionHistory, closureHistory] =
      await Promise.all([
        client.query(`select * from app.master_yw561_independent_connection_evidence_intake_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw561_acceptance_continuity_connection_recheck_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw561_verified_connection_transition_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw561_three_master_sync_closure_events order by recorded_at desc limit 100`)
      ]);
    return {
      model,
      intakeHistory: intakeHistory.rows,
      recheckHistory: recheckHistory.rows,
      transitionHistory: transitionHistory.rows,
      closureHistory: closureHistory.rows
    };
  });
}

export async function intakeBuild376IndependentConnectionEvidence(
  userId: string,
  input: { registryEvidenceId: unknown }
) {
  const registryEvidenceId = String(input.registryEvidenceId ?? "");
  if (!UUID.test(registryEvidenceId)) {
    throw new Error("build376_registry_evidence_id_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build376-yw561-independent-connection-intake"
    ]);

    const latest = await latestYwRegistryEvidence(client);
    if (!latest || latest.evidenceId !== registryEvidenceId) {
      throw new Error("build376_latest_yw_registry_evidence_required");
    }

    const before = await buildCurrentModel(client);
    if (before.independentConnectionEvidenceIntakeState === "VERIFIED_CURRENT") {
      throw new Error("build376_connection_evidence_already_intaked");
    }
    if (before.candidateConnectionEvidenceState !== "READY_FOR_TRUSTED_INTAKE") {
      throw new Error(
        "build376_connection_evidence_not_trusted:" +
          before.candidateConnectionEvidenceState
      );
    }

    const intakeEventId = randomUUID();
    const checkedAt = new Date().toISOString();
    await client.query(`insert into app.master_yw561_independent_connection_evidence_intake_events(
      intake_event_id,actor_user_id,source_id,source_production_revision,
      registry_evidence_id,registry_record_version,exact_receipt_id,evidence_uri,
      test_evidence_uri,connection_evidence_uri,signer_key_id,signer_fingerprint,
      status_observed_at,status_expires_at,verification_state,checked_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12::timestamptz,'VERIFIED_CURRENT',$13::timestamptz
    )`,[
      intakeEventId,
      before.prior.activation.observation.productionMain,
      latest.evidenceId,
      latest.recordVersion,
      before.exactCurrentReceiptId,
      latest.evidenceURI,
      latest.testEvidenceURI,
      latest.connectionEvidenceURI,
      latest.signerKeyId,
      latest.signerFingerprint,
      latest.statusObservedAt,
      latest.statusExpiresAt,
      checkedAt
    ]);

    const after = await buildCurrentModel(client);
    const chain = await recordClosureChain(client, after);
    return { intakeEventId, ...chain, model: after };
  });
}

export async function recordBuild376ConnectionSyncRecheck(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build376-yw561-three-master-sync-recheck"
    ]);
    const model = await buildCurrentModel(client);
    const chain = await recordClosureChain(client, model);
    return { ...chain, model };
  });
}
