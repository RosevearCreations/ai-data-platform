import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import { loadBuild373EvidenceFromClient } from "./yw561-live-signer-receipt-replay-owner-recheck-database";
import {
  BUILD_375_CONTROLLER_BASE_REVISION,
  BUILD_375_MASTER_RUNTIME,
  composeBuild375Yw561DecisionRuntimeConnection
} from "./yw561-owner-decision-runtime-connection-reconciliation";

type RuntimeGateRow = {
  current_gate_state: "OPEN" | "HOLD";
};

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build375_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner') as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build375_suite_owner_required");
}

function parseEvidenceURI(value: unknown) {
  const uri = String(value ?? "").trim();
  if (
    !(uri.startsWith("https://") || uri.startsWith("urn:rosevear:evidence:")) ||
    /\s/.test(uri) ||
    uri.length > 500
  ) throw new Error("build375_evidence_uri_invalid");
  return uri;
}

function parseDecision(value: unknown) {
  const decision = String(value ?? "");
  if (decision !== "ACCEPT" && decision !== "REJECT") {
    throw new Error("build375_decision_invalid");
  }
  return decision;
}

function parseDetail(value: unknown) {
  const detail = String(value ?? "").trim();
  if (detail.length < 1 || detail.length > 1800) {
    throw new Error("build375_detail_invalid");
  }
  return detail;
}

function parseDecidedAt(value: unknown) {
  const decidedAt = String(value ?? "");
  if (!Number.isFinite(Date.parse(decidedAt))) {
    throw new Error("build375_decided_at_invalid");
  }
  return decidedAt;
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

async function buildCurrentModel(client: PoolClient) {
  const [evidence, previousRuntimeGateState] = await Promise.all([
    loadBuild373EvidenceFromClient(client),
    latestRuntimeGate(client)
  ]);
  return composeBuild375Yw561DecisionRuntimeConnection({
    ...evidence,
    previousRuntimeGateState
  });
}

async function recordCurrentReconciliation(
  client: PoolClient,
  model: ReturnType<typeof composeBuild375Yw561DecisionRuntimeConnection>
) {
  const checkedAt = new Date().toISOString();

  const continuityEventId = randomUUID();
  await client.query(`insert into app.master_yw561_acceptance_continuity_events(
    continuity_event_id,actor_user_id,source_id,source_production_revision,
    exact_receipt_id,owner_decision_id,owner_decision,source_health_activation_state,
    master_gate_state,continuity_state,blockers,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::timestamptz
  )`,[
    continuityEventId,
    model.activation.observation.productionMain,
    model.exactCurrentReceiptId,
    model.latestExactReceiptOwnerDecisionId,
    model.latestExactReceiptOwnerDecision,
    model.activation.sourceHealthActivationState,
    model.currentRuntimeGateState,
    model.acceptanceContinuityState,
    JSON.stringify(model.blockers),
    checkedAt
  ]);

  const runtimeTransitionEventId = randomUUID();
  await client.query(`insert into app.master_yw561_runtime_gate_transition_events(
    runtime_transition_event_id,actor_user_id,source_id,source_production_revision,
    controller_base_revision,ai_hub_main,comms_main,previous_gate_state,current_gate_state,
    transition_state,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8,$9::timestamptz
  )`,[
    runtimeTransitionEventId,
    model.activation.observation.productionMain,
    BUILD_375_CONTROLLER_BASE_REVISION,
    BUILD_375_MASTER_RUNTIME.aiHub.main,
    BUILD_375_MASTER_RUNTIME.comms.main,
    model.previousRuntimeGateState,
    model.currentRuntimeGateState,
    model.runtimeGateTransitionState,
    checkedAt
  ]);

  const connectionReconciliationEventId = randomUUID();
  await client.query(`insert into app.master_yw561_connection_reconciliation_events(
    connection_reconciliation_event_id,actor_user_id,source_id,source_production_revision,
    continuity_event_id,runtime_transition_event_id,observed_source_connection_state,
    independent_connection_evidence_verified,connection_evidence_uri,
    reconciled_connection_state,connected,blockers,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,false,null,$6,$7,$8::jsonb,$9::timestamptz
  )`,[
    connectionReconciliationEventId,
    model.activation.observation.productionMain,
    continuityEventId,
    runtimeTransitionEventId,
    model.observedSourceConnectionState,
    model.connectionReconciliationState,
    model.connected,
    JSON.stringify(model.blockers),
    checkedAt
  ]);

  return {
    continuityEventId,
    runtimeTransitionEventId,
    connectionReconciliationEventId
  };
}

export async function listBuild375Yw561DecisionRuntimeConnectionForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const model = await buildCurrentModel(client);
    const [decisionHistory, continuityHistory, runtimeHistory, connectionHistory] =
      await Promise.all([
        client.query(`select * from app.master_yw561_owner_decision_execution_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw561_acceptance_continuity_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw561_runtime_gate_transition_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw561_connection_reconciliation_events order by recorded_at desc limit 100`)
      ]);
    return {
      model,
      decisionHistory: decisionHistory.rows,
      continuityHistory: continuityHistory.rows,
      runtimeHistory: runtimeHistory.rows,
      connectionHistory: connectionHistory.rows
    };
  });
}

export async function recordBuild375Reconciliation(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build375-yw561-runtime-connection-reconciliation"
    ]);
    const model = await buildCurrentModel(client);
    const events = await recordCurrentReconciliation(client, model);
    return { ...events, model };
  });
}

export async function executeBuild375OwnerDecision(
  userId: string,
  input: {
    decision: unknown;
    evidenceURI: unknown;
    detail: unknown;
    decidedAt: unknown;
  }
) {
  const decision = parseDecision(input.decision);
  const evidenceURI = parseEvidenceURI(input.evidenceURI);
  const detail = parseDetail(input.detail);
  const decidedAt = parseDecidedAt(input.decidedAt);

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build375-yw561-owner-decision"
    ]);

    const before = await buildCurrentModel(client);
    const receiptId = before.exactCurrentReceiptId;
    if (!receiptId) throw new Error("build375_exact_current_receipt_required");

    if (decision === "ACCEPT") {
      if (before.latestExactReceiptOwnerDecision === "ACCEPT") {
        throw new Error("build375_owner_accept_already_current");
      }
      if (
        before.activation.sourceHealthActivationState !== "ACTIVE" ||
        before.currentRuntimeGateState !== "OPEN"
      ) {
        throw new Error("build375_owner_acceptance_gate_hold");
      }
    }

    const legacyOwnerDecisionId = randomUUID();
    await client.query(`insert into app.master_owner_decision_audit(
      decision_id,actor_user_id,source_id,receipt_id,decision,evidence_uri,detail,decided_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6::timestamptz
    )`,[
      legacyOwnerDecisionId,
      receiptId,
      decision,
      evidenceURI,
      "Build 375 exact-receipt decision: " + detail,
      decidedAt
    ]);

    const decisionExecutionEventId = randomUUID();
    await client.query(`insert into app.master_yw561_owner_decision_execution_events(
      decision_execution_event_id,actor_user_id,source_id,source_production_revision,
      exact_receipt_id,legacy_owner_decision_id,decision,evidence_uri,detail,decided_at,
      source_health_activation_state,master_gate_state,execution_state
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,$8::timestamptz,$9,$10,'EXECUTED'
    )`,[
      decisionExecutionEventId,
      before.activation.observation.productionMain,
      receiptId,
      legacyOwnerDecisionId,
      decision,
      evidenceURI,
      detail,
      decidedAt,
      before.activation.sourceHealthActivationState,
      before.currentRuntimeGateState
    ]);

    const after = await buildCurrentModel(client);
    const events = await recordCurrentReconciliation(client, after);

    return {
      decisionExecutionEventId,
      legacyOwnerDecisionId,
      receiptId,
      decision,
      ...events,
      model: after
    };
  });
}
