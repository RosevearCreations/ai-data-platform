import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import { loadBuild373EvidenceFromClient } from "./yw561-live-signer-receipt-replay-owner-recheck-database";
import type { Build376ConnectionRegistryEvidence } from "./yw561-independent-connection-three-master-sync";
import {
  BUILD_377_CONTROLLER_BASE_REVISION,
  BUILD_377_MASTER_RUNTIME,
  BUILD_377_SOURCE_RUNTIME,
  composeBuild377YwLiveConnectionContinuity,
  type Build377LiveConnectionExecutionEvent,
  type Build377MasterRuntimeEvidence,
  type Build377SyncActivationEvent
} from "./yw562-live-trusted-connection-continuity";

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

type RuntimeRow = {
  recheck_id: string;
  controller_revision: string;
  ai_hub_main: string;
  ai_hub_state: unknown;
  comms_main: string;
  comms_state: unknown;
  blockers: unknown;
  gate_state: "OPEN" | "HOLD";
  checked_at: Date;
  recorded_at: Date;
};

type ExecutionRow = {
  execution_event_id: string;
  registry_evidence_id: string;
  source_production_revision: string;
  exact_receipt_id: string;
  owner_decision_id: string;
  connection_evidence_uri: string;
  execution_state: "EXECUTED_CURRENT";
  executed_at: Date;
  recorded_at: Date;
};

type ActivationRow = {
  activation_event_id: string;
  connection_execution_event_id: string;
  source_production_revision: string;
  exact_receipt_id: string;
  master_runtime_recheck_id: string;
  controller_revision: string;
  ai_hub_main: string;
  comms_main: string;
  activation_state: "ACTIVE_SYNCED";
  activated_at: Date;
  recorded_at: Date;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build377_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner') as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build377_suite_owner_required");
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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

function runtimeRow(row: RuntimeRow): Build377MasterRuntimeEvidence {
  return {
    recheckId: row.recheck_id,
    controllerRevision: row.controller_revision,
    aiHubMain: row.ai_hub_main,
    aiHubState: object(row.ai_hub_state),
    commsMain: row.comms_main,
    commsState: object(row.comms_state),
    blockers: stringArray(row.blockers),
    gateState: row.gate_state,
    checkedAt: row.checked_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function executionRow(row: ExecutionRow): Build377LiveConnectionExecutionEvent {
  return {
    executionEventId: row.execution_event_id,
    registryEvidenceId: row.registry_evidence_id,
    sourceProductionRevision: row.source_production_revision,
    exactReceiptId: row.exact_receipt_id,
    ownerDecisionId: row.owner_decision_id,
    connectionEvidenceURI: row.connection_evidence_uri,
    executionState: row.execution_state,
    executedAt: row.executed_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function activationRow(row: ActivationRow): Build377SyncActivationEvent {
  return {
    activationEventId: row.activation_event_id,
    connectionExecutionEventId: row.connection_execution_event_id,
    sourceProductionRevision: row.source_production_revision,
    exactReceiptId: row.exact_receipt_id,
    masterRuntimeRecheckId: row.master_runtime_recheck_id,
    controllerRevision: row.controller_revision,
    aiHubMain: row.ai_hub_main,
    commsMain: row.comms_main,
    activationState: row.activation_state,
    activatedAt: row.activated_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
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

async function latestMasterRuntimeEvidence(client: PoolClient) {
  const result = await client.query<RuntimeRow>(`
    select recheck_id,controller_revision,ai_hub_main,ai_hub_state,
      comms_main,comms_state,blockers,gate_state,checked_at,recorded_at
    from app.master_runtime_evidence_rechecks
    order by recorded_at desc
    limit 1
  `);
  return result.rows[0] ? runtimeRow(result.rows[0]) : null;
}

async function connectionExecutionEvents(client: PoolClient) {
  const result = await client.query<ExecutionRow>(`
    select execution_event_id,registry_evidence_id,source_production_revision,
      exact_receipt_id,owner_decision_id,connection_evidence_uri,execution_state,
      executed_at,recorded_at
    from app.master_yw562_live_connection_intake_execution_events
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(executionRow);
}

async function syncActivationEvents(client: PoolClient) {
  const result = await client.query<ActivationRow>(`
    select activation_event_id,connection_execution_event_id,
      source_production_revision,exact_receipt_id,master_runtime_recheck_id,
      controller_revision,ai_hub_main,comms_main,activation_state,
      activated_at,recorded_at
    from app.master_yw562_three_master_sync_activation_events
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(activationRow);
}

async function buildCurrentModel(client: PoolClient) {
  const [
    evidence,
    connectionRegistryEvidence,
    masterRuntimeEvidence,
    executionEvents,
    activationEvents
  ] = await Promise.all([
    loadBuild373EvidenceFromClient(client),
    latestYwRegistryEvidence(client),
    latestMasterRuntimeEvidence(client),
    connectionExecutionEvents(client),
    syncActivationEvents(client)
  ]);

  return composeBuild377YwLiveConnectionContinuity({
    signerEvents: evidence.signerEvents,
    receipts: evidence.receipts,
    admissionEvents: evidence.admissionEvents,
    ownerDecisions: evidence.ownerDecisions,
    replayEvents: evidence.replayEvents,
    connectionRegistryEvidence,
    masterRuntimeEvidence,
    connectionExecutionEvents: executionEvents,
    syncActivationEvents: activationEvents
  });
}

async function recordAcceptanceRevalidation(
  client: PoolClient,
  model: ReturnType<typeof composeBuild377YwLiveConnectionContinuity>
) {
  const revalidationEventId = randomUUID();
  const checkedAt = new Date().toISOString();
  await client.query(`insert into app.master_yw562_exact_receipt_acceptance_revalidation_events(
    revalidation_event_id,actor_user_id,source_id,source_production_revision,
    exact_receipt_id,owner_decision_id,receipt_state,acceptance_state,
    blockers,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7::jsonb,$8::timestamptz
  )`,[
    revalidationEventId,
    BUILD_377_SOURCE_RUNTIME.currentMain,
    model.exactCurrentReceiptId,
    model.exactOwnerDecisionId,
    model.exactReceiptState,
    model.acceptanceRevalidationState,
    JSON.stringify(model.blockers),
    checkedAt
  ]);
  return revalidationEventId;
}

async function recordContinuity(
  client: PoolClient,
  model: ReturnType<typeof composeBuild377YwLiveConnectionContinuity>
) {
  const monitorEventId = randomUUID();
  const checkedAt = new Date().toISOString();
  await client.query(`insert into app.master_yw562_post_connection_continuity_events(
    monitor_event_id,actor_user_id,source_id,source_production_revision,
    sync_activation_event_id,registry_evidence_id,exact_receipt_id,
    owner_decision_id,master_runtime_recheck_id,connection_candidate_state,
    receipt_state,acceptance_state,master_runtime_state,continuity_state,
    connected,masters_synced,blockers,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,
    $8,$9,$10,$11,$12,$13,$14::jsonb,$15::timestamptz
  )`,[
    monitorEventId,
    BUILD_377_SOURCE_RUNTIME.currentMain,
    model.currentSyncActivation?.activationEventId ?? null,
    model.connectionRegistryEvidence?.evidenceId ?? null,
    model.exactCurrentReceiptId,
    model.exactOwnerDecisionId,
    model.masterRuntimeEvidence?.recheckId ?? null,
    model.connectionCandidateState,
    model.exactReceiptState,
    model.acceptanceRevalidationState,
    model.currentMasterRuntimeState,
    model.postConnectionContinuityState,
    model.connectionState === "CONNECTED",
    model.mastersSynced,
    JSON.stringify(model.blockers),
    checkedAt
  ]);
  return monitorEventId;
}

export async function listBuild377YwLiveConnectionContinuityForUser(
  userId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const model = await buildCurrentModel(client);
    const [executionHistory, revalidationHistory, activationHistory, continuityHistory] =
      await Promise.all([
        client.query(`select * from app.master_yw562_live_connection_intake_execution_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw562_exact_receipt_acceptance_revalidation_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw562_three_master_sync_activation_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw562_post_connection_continuity_events order by recorded_at desc limit 100`)
      ]);
    return {
      model,
      executionHistory: executionHistory.rows,
      revalidationHistory: revalidationHistory.rows,
      activationHistory: activationHistory.rows,
      continuityHistory: continuityHistory.rows
    };
  });
}

export async function recordBuild377AcceptanceRevalidation(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build377-yw562-acceptance-revalidation"
    ]);
    const model = await buildCurrentModel(client);
    const revalidationEventId = await recordAcceptanceRevalidation(client, model);
    const monitorEventId = await recordContinuity(client, model);
    return { revalidationEventId, monitorEventId, model };
  });
}

export async function executeBuild377LiveTrustedConnectionIntake(
  userId: string,
  input: { registryEvidenceId: unknown }
) {
  const registryEvidenceId = String(input.registryEvidenceId ?? "");
  if (!UUID.test(registryEvidenceId)) {
    throw new Error("build377_registry_evidence_id_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build377-yw562-live-connection-intake"
    ]);

    const before = await buildCurrentModel(client);
    if (
      !before.connectionRegistryEvidence ||
      before.connectionRegistryEvidence.evidenceId !== registryEvidenceId
    ) {
      throw new Error("build377_latest_yw_registry_evidence_required");
    }
    if (before.connectionCandidateState !== "READY_FOR_LIVE_INTAKE") {
      throw new Error(
        "build377_connection_evidence_not_ready:" +
          before.connectionCandidateState
      );
    }
    if (before.acceptanceRevalidationState !== "ACCEPTED_CURRENT") {
      throw new Error("build377_exact_receipt_acceptance_required");
    }
    if (
      !before.exactCurrentReceiptId ||
      !before.exactOwnerDecisionId ||
      !before.connectionRegistryEvidence.connectionEvidenceURI
    ) {
      throw new Error("build377_connection_binding_incomplete");
    }
    if (before.currentConnectionExecution) {
      throw new Error("build377_live_connection_intake_already_executed");
    }

    const executionEventId = randomUUID();
    const executedAt = new Date().toISOString();
    await client.query(`insert into app.master_yw562_live_connection_intake_execution_events(
      execution_event_id,actor_user_id,source_id,previous_source_revision,
      source_production_revision,registry_evidence_id,registry_record_version,
      exact_receipt_id,owner_decision_id,connection_evidence_uri,
      execution_state,executed_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,'EXECUTED_CURRENT',$9::timestamptz
    )`,[
      executionEventId,
      BUILD_377_SOURCE_RUNTIME.previousMain,
      BUILD_377_SOURCE_RUNTIME.currentMain,
      registryEvidenceId,
      before.connectionRegistryEvidence.recordVersion,
      before.exactCurrentReceiptId,
      before.exactOwnerDecisionId,
      before.connectionRegistryEvidence.connectionEvidenceURI,
      executedAt
    ]);

    const after = await buildCurrentModel(client);
    const revalidationEventId = await recordAcceptanceRevalidation(client, after);
    const monitorEventId = await recordContinuity(client, after);
    return {
      executionEventId,
      revalidationEventId,
      monitorEventId,
      model: after
    };
  });
}

export async function activateBuild377ThreeMasterSync(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build377-yw562-three-master-sync-activation"
    ]);

    const before = await buildCurrentModel(client);
    if (
      before.threeMasterSyncActivationState !==
      "READY_FOR_EXPLICIT_SYNC_ACTIVATION"
    ) {
      throw new Error(
        "build377_three_master_sync_not_ready:" +
          before.threeMasterSyncActivationState
      );
    }
    if (
      !before.currentConnectionExecution ||
      !before.exactCurrentReceiptId ||
      !before.masterRuntimeEvidence
    ) {
      throw new Error("build377_sync_activation_binding_incomplete");
    }

    const activationEventId = randomUUID();
    const activatedAt = new Date().toISOString();
    await client.query(`insert into app.master_yw562_three_master_sync_activation_events(
      activation_event_id,actor_user_id,source_id,source_production_revision,
      connection_execution_event_id,exact_receipt_id,master_runtime_recheck_id,
      controller_revision,ai_hub_main,comms_main,activation_state,activated_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,'ACTIVE_SYNCED',$9::timestamptz
    )`,[
      activationEventId,
      BUILD_377_SOURCE_RUNTIME.currentMain,
      before.currentConnectionExecution.executionEventId,
      before.exactCurrentReceiptId,
      before.masterRuntimeEvidence.recheckId,
      BUILD_377_CONTROLLER_BASE_REVISION,
      BUILD_377_MASTER_RUNTIME.aiHub.main,
      BUILD_377_MASTER_RUNTIME.comms.main,
      activatedAt
    ]);

    const after = await buildCurrentModel(client);
    const revalidationEventId = await recordAcceptanceRevalidation(client, after);
    const monitorEventId = await recordContinuity(client, after);
    return {
      activationEventId,
      revalidationEventId,
      monitorEventId,
      model: after
    };
  });
}

export async function recordBuild377PostConnectionContinuity(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build377-yw562-post-connection-continuity"
    ]);
    const model = await buildCurrentModel(client);
    const monitorEventId = await recordContinuity(client, model);
    return { monitorEventId, model };
  });
}
