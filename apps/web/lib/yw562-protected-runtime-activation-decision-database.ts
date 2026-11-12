import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withProtectedDatabase, withUserDatabase } from "./database";
import {
  BUILD_378_CONTROLLER_BASE_REVISION,
  BUILD_378_RUNTIME
} from "./yw562-runtime-ql422-protected-readiness";
import {
  loadBuild378RuntimeQl422ReadinessFromClient
} from "./yw562-runtime-ql422-protected-readiness-database";
import {
  BUILD_379_CONTROLLER_BASE_REVISION,
  BUILD_379_RUNTIME,
  composeBuild379ProtectedActivation,
  type Build379ActivationDecisionEvent,
  type Build379ActivationExecutionEvent,
  type Build379ProtectedAdmissionEvent,
  type Build379ProtectedEnvelope
} from "./yw562-protected-runtime-activation-decision";

type ProtectedAdmissionRow = {
  admission_event_id: string;
  authority_key_id: string;
  authority_key_spki_sha256: string;
  envelope_sha256: string;
  signature_sha256: string;
  nonce: string;
  controller_revision: string;
  source_revision: string;
  ai_hub_main: string;
  comms_main: string;
  original_host_id: string;
  prerequisite_evidence_id: string;
  fresh_receipt_admission_event_id: string;
  exact_receipt_id: string;
  owner_decision_id: string;
  ql422_correlation_event_id: string;
  evidence_uri: string;
  observed_at: Date;
  admission_state: "VERIFIED_ADMITTED";
  recorded_at: Date;
};

type DecisionRow = {
  decision_event_id: string;
  protected_admission_event_id: string;
  exact_receipt_id: string;
  owner_decision_id: string;
  decision: "APPROVE_ACTIVATION" | "REJECT_ACTIVATION";
  decision_state:
    | "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME"
    | "REJECTED_HOLD";
  decided_at: Date;
  recorded_at: Date;
};

type ExecutionRow = {
  execution_event_id: string;
  decision_event_id: string;
  protected_admission_event_id: string;
  exact_receipt_id: string;
  execution_state:
    | "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED"
    | "SUPERVISED_ACTIVATION_REJECTED_HOLD";
  receiver_state: "OFF";
  connection_state: "DISCONNECTED_HOLD";
  masters_synced: false;
  executed_at: Date;
  recorded_at: Date;
};

function protectedAdmission(row: ProtectedAdmissionRow): Build379ProtectedAdmissionEvent {
  return {
    admissionEventId: row.admission_event_id,
    authorityKeyId: row.authority_key_id,
    authorityKeySpkiSha256: row.authority_key_spki_sha256,
    envelopeSha256: row.envelope_sha256,
    signatureSha256: row.signature_sha256,
    nonce: row.nonce,
    controllerRevision: row.controller_revision,
    sourceRevision: row.source_revision,
    aiHubMain: row.ai_hub_main,
    commsMain: row.comms_main,
    originalHostId: row.original_host_id,
    prerequisiteEvidenceId: row.prerequisite_evidence_id,
    freshReceiptAdmissionEventId: row.fresh_receipt_admission_event_id,
    exactReceiptId: row.exact_receipt_id,
    ownerDecisionId: row.owner_decision_id,
    ql422CorrelationEventId: row.ql422_correlation_event_id,
    evidenceURI: row.evidence_uri,
    observedAt: row.observed_at.toISOString(),
    admissionState: row.admission_state,
    recordedAt: row.recorded_at.toISOString()
  };
}

function decision(row: DecisionRow): Build379ActivationDecisionEvent {
  return {
    decisionEventId: row.decision_event_id,
    protectedAdmissionEventId: row.protected_admission_event_id,
    exactReceiptId: row.exact_receipt_id,
    ownerDecisionId: row.owner_decision_id,
    decision: row.decision,
    decisionState: row.decision_state,
    decidedAt: row.decided_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function execution(row: ExecutionRow): Build379ActivationExecutionEvent {
  return {
    executionEventId: row.execution_event_id,
    decisionEventId: row.decision_event_id,
    protectedAdmissionEventId: row.protected_admission_event_id,
    exactReceiptId: row.exact_receipt_id,
    executionState: row.execution_state,
    receiverState: row.receiver_state,
    connectionState: row.connection_state,
    mastersSynced: row.masters_synced,
    executedAt: row.executed_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build379_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner') as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build379_suite_owner_required");
}

async function protectedAdmissions(client: PoolClient) {
  const result = await client.query<ProtectedAdmissionRow>(`
    select admission_event_id,authority_key_id,authority_key_spki_sha256,
      envelope_sha256,signature_sha256,nonce,controller_revision,source_revision,
      ai_hub_main,comms_main,original_host_id,prerequisite_evidence_id,
      fresh_receipt_admission_event_id,exact_receipt_id,owner_decision_id,
      ql422_correlation_event_id,evidence_uri,observed_at,admission_state,recorded_at
    from app.master_build379_protected_runtime_admission_events
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(protectedAdmission);
}

async function activationDecisions(client: PoolClient) {
  const result = await client.query<DecisionRow>(`
    select decision_event_id,protected_admission_event_id,exact_receipt_id,
      owner_decision_id,decision,decision_state,decided_at,recorded_at
    from app.master_build379_supervised_activation_decision_events
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(decision);
}

async function activationExecutions(client: PoolClient) {
  const result = await client.query<ExecutionRow>(`
    select execution_event_id,decision_event_id,protected_admission_event_id,
      exact_receipt_id,execution_state,receiver_state,connection_state,
      masters_synced,executed_at,recorded_at
    from app.master_build379_activation_decision_execution_events
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(execution);
}

async function build379Model(client: PoolClient) {
  const build378 = await loadBuild378RuntimeQl422ReadinessFromClient(client);
  const [admissions, decisions, executions] = await Promise.all([
    protectedAdmissions(client),
    activationDecisions(client),
    activationExecutions(client)
  ]);
  return composeBuild379ProtectedActivation({
    build378,
    protectedAdmissions: admissions,
    activationDecisions: decisions,
    activationExecutions: executions
  });
}

export async function listBuild379ProtectedActivationForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const model = await build379Model(client);
    const [admissionHistory, decisionHistory, executionHistory] = await Promise.all([
      client.query(`select * from app.master_build379_protected_runtime_admission_events order by recorded_at desc limit 100`),
      client.query(`select * from app.master_build379_supervised_activation_decision_events order by recorded_at desc limit 100`),
      client.query(`select * from app.master_build379_activation_decision_execution_events order by recorded_at desc limit 100`)
    ]);
    return {
      model,
      admissionHistory: admissionHistory.rows,
      decisionHistory: decisionHistory.rows,
      executionHistory: executionHistory.rows
    };
  });
}

export async function admitBuild379ProtectedRuntimeEvidence(input: {
  envelope: Build379ProtectedEnvelope;
  authorityKeySpkiSha256: string;
  envelopeSha256: string;
  signatureSha256: string;
}) {
  return withProtectedDatabase(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build379-protected-runtime-admission"
    ]);

    const before = await loadBuild378RuntimeQl422ReadinessFromClient(client);

    if (input.envelope.controllerRevision !== BUILD_379_CONTROLLER_BASE_REVISION) {
      throw new Error("build379_controller_revision_mismatch");
    }
    if (
      input.envelope.ql422ControllerRevision !== BUILD_378_CONTROLLER_BASE_REVISION
    ) {
      throw new Error("build379_ql422_controller_revision_mismatch");
    }
    if (
      input.envelope.sourceRevision !== BUILD_379_RUNTIME.yw.main ||
      input.envelope.aiHubMain !== BUILD_379_RUNTIME.aiHub.main ||
      input.envelope.commsMain !== BUILD_379_RUNTIME.comms.main ||
      input.envelope.originalHostId !== BUILD_379_RUNTIME.aiHub.originalHost
    ) {
      throw new Error("build379_external_revision_binding_mismatch");
    }
    if (
      before.runtimePrerequisiteState !== "VERIFIED_CURRENT" ||
      before.sourceReceiptState !== "ACTIVE_CURRENT" ||
      before.freshSourceBoundReceiptAdmissionState !== "ADMITTED_CURRENT" ||
      before.exactOwnerAcceptanceState !== "ACCEPTED_CURRENT"
    ) {
      throw new Error("build379_build378_evidence_not_ready");
    }
    if (
      input.envelope.prerequisiteEvidenceId !==
        before.latestRuntimePrerequisiteEvidence?.evidenceId ||
      input.envelope.freshReceiptAdmissionEventId !==
        before.currentFreshReceiptAdmission?.admissionEventId ||
      input.envelope.exactReceiptId !== before.exactCurrentReceiptId ||
      input.envelope.exactReceiptSha256 !==
        before.exactCurrentReceipt?.receiptSha256 ||
      input.envelope.ownerDecisionId !== before.exactOwnerDecisionId
    ) {
      throw new Error("build379_exact_receipt_owner_binding_mismatch");
    }

    const ql422CorrelationEventId = randomUUID();
    await client.query(`insert into app.master_ql422_original_host_three_master_correlation_events(
      correlation_event_id,actor_user_id,evidence_authority,
      controller_revision,yw_source_revision,ai_hub_main,comms_main,
      original_host_id,source_episode_id,source_receipt_digest,
      receiver_ack_digest,closure_digest,handoff_receipt_id,witness_digest,
      master_receipts,terminal_ledger_digest,evidence_uri,correlation_state,
      observed_at
    ) values(
      $1,null,'protected-runtime',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
      $13::jsonb,$14,$15,'VERIFIED_CORRELATED',$16::timestamptz
    )`,[
      ql422CorrelationEventId,
      input.envelope.ql422ControllerRevision,
      input.envelope.sourceRevision,
      input.envelope.aiHubMain,
      input.envelope.commsMain,
      input.envelope.originalHostId,
      input.envelope.sourceEpisodeId,
      input.envelope.sourceReceiptDigest,
      input.envelope.receiverAckDigest,
      input.envelope.closureDigest,
      input.envelope.handoffReceiptId,
      input.envelope.witnessDigest,
      JSON.stringify(input.envelope.masterReceipts),
      input.envelope.terminalLedgerDigest,
      input.envelope.evidenceURI,
      input.envelope.observedAt
    ]);

    const build378 = await loadBuild378RuntimeQl422ReadinessFromClient(client);
    if (
      build378.protectedActivationReadinessState !==
        "READY_FOR_PROTECTED_ACTIVATION" ||
      build378.latestProtectedQl422Correlation?.correlationEventId !==
        ql422CorrelationEventId
    ) {
      throw new Error("build379_ql422_protected_correlation_not_closed");
    }

    const admissionEventId = randomUUID();
    await client.query(`insert into app.master_build379_protected_runtime_admission_events(
      admission_event_id,authority_key_id,authority_key_spki_sha256,
      envelope_sha256,signature_sha256,nonce,controller_revision,
      source_revision,ai_hub_main,comms_main,original_host_id,
      prerequisite_evidence_id,fresh_receipt_admission_event_id,exact_receipt_id,
      owner_decision_id,ql422_correlation_event_id,evidence_uri,observed_at,
      admission_state
    ) values(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
      $18::timestamptz,'VERIFIED_ADMITTED'
    )`,[
      admissionEventId,
      input.envelope.authorityKeyId,
      input.authorityKeySpkiSha256,
      input.envelopeSha256,
      input.signatureSha256,
      input.envelope.nonce,
      input.envelope.controllerRevision,
      input.envelope.sourceRevision,
      input.envelope.aiHubMain,
      input.envelope.commsMain,
      input.envelope.originalHostId,
      input.envelope.prerequisiteEvidenceId,
      input.envelope.freshReceiptAdmissionEventId,
      input.envelope.exactReceiptId,
      input.envelope.ownerDecisionId,
      ql422CorrelationEventId,
      input.envelope.evidenceURI,
      input.envelope.observedAt
    ]);

    const admissions = await protectedAdmissions(client);
    const model = composeBuild379ProtectedActivation({
      build378,
      protectedAdmissions: admissions
    });
    if (model.protectedRuntimeEvidenceState !== "VERIFIED_CURRENT") {
      throw new Error("build379_protected_admission_not_current");
    }

    return {
      admissionEventId,
      ql422CorrelationEventId,
      model
    };
  });
}

export async function executeBuild379SupervisedActivationDecision(
  userId: string,
  input: {
    decision: "APPROVE_ACTIVATION" | "REJECT_ACTIVATION";
    ownerNote: string;
    ownerAttested: boolean;
  }
) {
  const ownerNote = input.ownerNote.trim();
  if (ownerNote.length < 15 || ownerNote.length > 500) {
    throw new Error("build379_owner_note_invalid");
  }
  if (input.ownerAttested !== true) {
    throw new Error("build379_owner_attestation_required");
  }
  if (
    input.decision !== "APPROVE_ACTIVATION" &&
    input.decision !== "REJECT_ACTIVATION"
  ) {
    throw new Error("build379_activation_decision_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build379-supervised-activation-decision"
    ]);

    const before = await build379Model(client);
    const admission = before.latestProtectedAdmission;
    if (!admission) {
      throw new Error("build379_protected_admission_required");
    }
    if (
      input.decision === "APPROVE_ACTIVATION" &&
      before.supervisedActivationDecisionState !== "READY_FOR_OWNER_DECISION"
    ) {
      throw new Error(
        "build379_activation_not_ready:" +
          before.supervisedActivationDecisionState
      );
    }
    if (
      before.protectedRuntimeEvidenceState !== "VERIFIED_CURRENT" ||
      before.exactReceiptOwnerContinuityState !== "VERIFIED_CONTINUOUS" ||
      before.ql422ProtectedCorrelationClosureState !== "CLOSED_VERIFIED"
    ) {
      throw new Error("build379_protected_continuity_not_current");
    }

    const existing = await client.query<{ decision_event_id: string }>(`
      select decision_event_id
      from app.master_build379_supervised_activation_decision_events
      where protected_admission_event_id=$1
      limit 1
    `,[admission.admissionEventId]);
    if (existing.rowCount) {
      throw new Error("build379_activation_decision_already_executed");
    }

    const decisionEventId = randomUUID();
    const executionEventId = randomUUID();
    const now = new Date().toISOString();
    const decisionState =
      input.decision === "APPROVE_ACTIVATION"
        ? "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME"
        : "REJECTED_HOLD";
    const executionState =
      input.decision === "APPROVE_ACTIVATION"
        ? "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED"
        : "SUPERVISED_ACTIVATION_REJECTED_HOLD";

    await client.query(`insert into app.master_build379_supervised_activation_decision_events(
      decision_event_id,actor_user_id,protected_admission_event_id,
      exact_receipt_id,owner_decision_id,decision,owner_attested,owner_note,
      decision_state,decided_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,true,$6,$7,
      $8::timestamptz
    )`,[
      decisionEventId,
      admission.admissionEventId,
      admission.exactReceiptId,
      admission.ownerDecisionId,
      input.decision,
      ownerNote,
      decisionState,
      now
    ]);

    await client.query(`insert into app.master_build379_activation_decision_execution_events(
      execution_event_id,actor_user_id,decision_event_id,
      protected_admission_event_id,exact_receipt_id,execution_state,
      receiver_state,connection_state,masters_synced,executed_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,
      'OFF','DISCONNECTED_HOLD',false,$6::timestamptz
    )`,[
      executionEventId,
      decisionEventId,
      admission.admissionEventId,
      admission.exactReceiptId,
      executionState,
      now
    ]);

    const model = await build379Model(client);
    return {
      decisionEventId,
      executionEventId,
      model
    };
  });
}

export async function recheckBuild379ProtectedActivation(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    return build379Model(client);
  });
}
