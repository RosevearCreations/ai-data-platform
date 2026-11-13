import {
  createPublicKey,
  randomUUID,
  verify
} from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import { trustedSignerFingerprint } from "./source-trust-ledger";
import { loadBuild373EvidenceFromClient } from "./yw561-live-signer-receipt-replay-owner-recheck-database";
import {
  BUILD_378_CONTROLLER_BASE_REVISION,
  BUILD_378_REQUIRED_YW_TABLES,
  BUILD_378_RUNTIME,
  build378EvidenceDigest,
  canonicalBuild378RuntimePrerequisitePayload,
  composeBuild378RuntimeQl422Readiness,
  type Build378FreshReceiptAdmissionEvent,
  type Build378Ql422CorrelationEvent,
  type Build378Ql422MasterReceipt,
  type Build378RuntimePrerequisiteEvidence
} from "./yw562-runtime-ql422-protected-readiness";

const SHA64 = /^[a-f0-9]{64}$/;
const SHA40 = /^[a-f0-9]{40}$/;

type RuntimePrerequisiteRow = {
  evidence_id: string;
  source_id: "yw";
  key_id: string;
  source_production_revision: string;
  required_tables: unknown;
  schema_chain_verified: boolean;
  rls_verified: boolean;
  owner_helper_verified: boolean;
  protected_summary_verified: boolean;
  evidence_uri: string;
  report_digest: string;
  signature_digest: string;
  nonce: string;
  checked_at: Date;
  verification_state: "VERIFIED_CURRENT";
  recorded_at: Date;
};

type FreshAdmissionRow = {
  admission_event_id: string;
  prerequisite_evidence_id: string;
  receipt_id: string;
  receipt_sha256: string;
  source_revision: string;
  admission_state: "ADMITTED_CURRENT";
  admitted_at: Date;
  recorded_at: Date;
};

type Ql422Row = {
  correlation_event_id: string;
  evidence_authority: "owner-reference-only" | "protected-runtime";
  controller_revision: string;
  yw_source_revision: string;
  ai_hub_main: string;
  comms_main: string;
  original_host_id: string;
  source_episode_id: string;
  source_receipt_digest: string;
  receiver_ack_digest: string;
  closure_digest: string;
  handoff_receipt_id: string;
  witness_digest: string;
  master_receipts: unknown;
  terminal_ledger_digest: string;
  evidence_uri: string;
  correlation_state: "CANDIDATE_HOLD" | "VERIFIED_CORRELATED";
  observed_at: Date;
  recorded_at: Date;
};

type ActiveSignerRow = {
  key_id: string;
  public_key_spki_sha256: string;
};

type EnrollmentKeyRow = {
  public_key_pem: string;
};

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')) as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build378_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(`select exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner') as allowed`);
  if (!result.rows[0]?.allowed) throw new Error("build378_suite_owner_required");
}

function evidenceURI(value: unknown, name: string) {
  const result = String(value ?? "").trim();
  if (
    !(
      result.startsWith("https://") ||
      result.startsWith("urn:rosevear:evidence:")
    ) ||
    /\s/.test(result) ||
    result.length > 500
  ) {
    throw new Error("build378_" + name + "_invalid");
  }
  return result;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function exactRequiredTables(value: unknown) {
  const actual = [...new Set(stringArray(value))].sort();
  const expected = [...BUILD_378_REQUIRED_YW_TABLES].sort();
  if (
    actual.length !== expected.length ||
    !actual.every((item, index) => item === expected[index])
  ) {
    throw new Error("build378_required_tables_invalid");
  }
  return actual;
}

function digest(value: unknown, name: string) {
  const result = String(value ?? "").toLowerCase();
  if (!SHA64.test(result)) throw new Error("build378_" + name + "_invalid");
  return result;
}

function timestamp(value: unknown, name: string) {
  const result = String(value ?? "");
  const parsed = Date.parse(result);
  if (!Number.isFinite(parsed)) throw new Error("build378_" + name + "_invalid");
  return new Date(parsed).toISOString();
}

function runtimeRow(row: RuntimePrerequisiteRow): Build378RuntimePrerequisiteEvidence {
  return {
    evidenceId: row.evidence_id,
    sourceId: row.source_id,
    keyId: row.key_id,
    sourceProductionRevision: row.source_production_revision,
    requiredTables: stringArray(row.required_tables),
    schemaChainVerified: row.schema_chain_verified,
    rlsVerified: row.rls_verified,
    ownerHelperVerified: row.owner_helper_verified,
    protectedSummaryVerified: row.protected_summary_verified,
    evidenceURI: row.evidence_uri,
    reportDigest: row.report_digest,
    signatureDigest: row.signature_digest,
    nonce: row.nonce,
    checkedAt: row.checked_at.toISOString(),
    recordedAt: row.recorded_at.toISOString(),
    verificationState: row.verification_state
  };
}

function admissionRow(row: FreshAdmissionRow): Build378FreshReceiptAdmissionEvent {
  return {
    admissionEventId: row.admission_event_id,
    prerequisiteEvidenceId: row.prerequisite_evidence_id,
    receiptId: row.receipt_id,
    receiptSha256: row.receipt_sha256,
    sourceRevision: row.source_revision,
    admissionState: row.admission_state,
    admittedAt: row.admitted_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function parseMasterReceipts(value: unknown): Build378Ql422MasterReceipt[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item)
    )
    .map((item) => ({
      masterId: String(item.masterId) as Build378Ql422MasterReceipt["masterId"],
      receiptId: String(item.receiptId ?? ""),
      digest: String(item.digest ?? "").toLowerCase()
    }));
}

function ql422Row(row: Ql422Row): Build378Ql422CorrelationEvent {
  return {
    correlationEventId: row.correlation_event_id,
    evidenceAuthority: row.evidence_authority,
    controllerRevision: row.controller_revision,
    ywSourceRevision: row.yw_source_revision,
    aiHubMain: row.ai_hub_main,
    commsMain: row.comms_main,
    originalHostId: row.original_host_id,
    sourceEpisodeId: row.source_episode_id,
    sourceReceiptDigest: row.source_receipt_digest,
    receiverAckDigest: row.receiver_ack_digest,
    closureDigest: row.closure_digest,
    handoffReceiptId: row.handoff_receipt_id,
    witnessDigest: row.witness_digest,
    masterReceipts: parseMasterReceipts(row.master_receipts),
    terminalLedgerDigest: row.terminal_ledger_digest,
    evidenceURI: row.evidence_uri,
    observedAt: row.observed_at.toISOString(),
    recordedAt: row.recorded_at.toISOString(),
    correlationState: row.correlation_state
  };
}

async function activeYwSigner(client: PoolClient) {
  const result = await client.query<ActiveSignerRow>(`
    select e.key_id,e.public_key_spki_sha256
    from app.master_source_signer_registry_events e
    where e.source_id='yw'
      and e.event_type='ENROLLED'
      and not exists (
        select 1
        from app.master_source_signer_registry_events later
        where later.source_id=e.source_id
          and later.key_id=e.key_id
          and later.recorded_at>e.recorded_at
          and later.event_type='REVOKED'
      )
    order by e.recorded_at desc
    limit 2
  `);
  if (result.rows.length !== 1) {
    throw new Error("build378_exactly_one_active_yw_signer_required");
  }
  return result.rows[0];
}

async function enrolledPublicKey(
  client: PoolClient,
  keyId: string
) {
  const result = await client.query<EnrollmentKeyRow>(`
    select public_key_pem
    from app.master_source_signer_enrollment_intake_events
    where source_id='yw'
      and key_id=$1
      and event_type='ENROLLMENT_COMMITTED'
      and public_key_pem is not null
    order by recorded_at desc
    limit 1
  `, [keyId]);
  const pem = result.rows[0]?.public_key_pem;
  if (!pem) throw new Error("build378_enrolled_public_key_not_found");
  return pem;
}

async function runtimePrerequisiteEvents(client: PoolClient) {
  const result = await client.query<RuntimePrerequisiteRow>(`
    select evidence_id,source_id,key_id,source_production_revision,
      required_tables,schema_chain_verified,rls_verified,owner_helper_verified,
      protected_summary_verified,evidence_uri,report_digest,signature_digest,
      nonce,checked_at,verification_state,recorded_at
    from app.master_yw562_runtime_prerequisite_evidence_intakes
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(runtimeRow);
}

async function freshReceiptAdmissionEvents(client: PoolClient) {
  const result = await client.query<FreshAdmissionRow>(`
    select admission_event_id,prerequisite_evidence_id,receipt_id,
      receipt_sha256,source_revision,admission_state,admitted_at,recorded_at
    from app.master_yw562_fresh_source_receipt_admission_events
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(admissionRow);
}

async function ql422CorrelationEvents(client: PoolClient) {
  const result = await client.query<Ql422Row>(`
    select correlation_event_id,evidence_authority,controller_revision,
      yw_source_revision,ai_hub_main,comms_main,original_host_id,
      source_episode_id,source_receipt_digest,receiver_ack_digest,
      closure_digest,handoff_receipt_id,witness_digest,master_receipts,
      terminal_ledger_digest,evidence_uri,correlation_state,observed_at,recorded_at
    from app.master_ql422_original_host_three_master_correlation_events
    order by recorded_at desc
    limit 200
  `);
  return result.rows.map(ql422Row);
}

export async function loadBuild378RuntimeQl422ReadinessFromClient(client: PoolClient) {
  const [evidence, runtime, receiptAdmissions, ql422] = await Promise.all([
    loadBuild373EvidenceFromClient(client),
    runtimePrerequisiteEvents(client),
    freshReceiptAdmissionEvents(client),
    ql422CorrelationEvents(client)
  ]);
  return composeBuild378RuntimeQl422Readiness({
    signerEvents: evidence.signerEvents,
    receipts: evidence.receipts,
    admissionEvents: evidence.admissionEvents,
    replayEvents: evidence.replayEvents,
    ownerDecisions: evidence.ownerDecisions,
    runtimePrerequisiteEvents: runtime,
    freshReceiptAdmissionEvents: receiptAdmissions,
    ql422CorrelationEvents: ql422
  });
}

async function recordReadiness(
  client: PoolClient,
  model: ReturnType<typeof composeBuild378RuntimeQl422Readiness>
) {
  const readinessEventId = randomUUID();
  const checkedAt = new Date().toISOString();
  await client.query(`insert into app.master_build378_protected_activation_readiness_events(
    readiness_event_id,actor_user_id,source_id,source_revision,
    prerequisite_evidence_id,fresh_receipt_admission_event_id,exact_receipt_id,
    owner_decision_id,ql422_correlation_event_id,runtime_prerequisite_state,
    source_receipt_state,fresh_receipt_admission_state,owner_acceptance_state,
    ql422_correlation_state,readiness_state,blockers,checked_at
  ) values(
    $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,$6,$7,
    $8,$9,$10,$11,$12,$13,$14::jsonb,$15::timestamptz
  )`,[
    readinessEventId,
    BUILD_378_RUNTIME.yw.main,
    model.latestRuntimePrerequisiteEvidence?.evidenceId ?? null,
    model.currentFreshReceiptAdmission?.admissionEventId ?? null,
    model.exactCurrentReceiptId,
    model.exactOwnerDecisionId,
    model.latestQl422Correlation?.correlationEventId ?? null,
    model.runtimePrerequisiteState,
    model.sourceReceiptState,
    model.freshSourceBoundReceiptAdmissionState,
    model.exactOwnerAcceptanceState,
    model.ql422CorrelationState,
    model.protectedActivationReadinessState,
    JSON.stringify(model.blockers),
    checkedAt
  ]);
  return readinessEventId;
}

export async function listBuild378RuntimeQl422ReadinessForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const model = await loadBuild378RuntimeQl422ReadinessFromClient(client);
    const [runtimeHistory, receiptHistory, ql422History, readinessHistory] =
      await Promise.all([
        client.query(`select * from app.master_yw562_runtime_prerequisite_evidence_intakes order by recorded_at desc limit 100`),
        client.query(`select * from app.master_yw562_fresh_source_receipt_admission_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_ql422_original_host_three_master_correlation_events order by recorded_at desc limit 100`),
        client.query(`select * from app.master_build378_protected_activation_readiness_events order by recorded_at desc limit 100`)
      ]);
    return {
      model,
      runtimeHistory: runtimeHistory.rows,
      receiptHistory: receiptHistory.rows,
      ql422History: ql422History.rows,
      readinessHistory: readinessHistory.rows
    };
  });
}

export async function intakeBuild378RuntimePrerequisiteEvidence(
  userId: string,
  input: Record<string, unknown>
) {
  const keyId = String(input.keyId ?? "").trim();
  if (!keyId || keyId.length > 160) {
    throw new Error("build378_key_id_invalid");
  }
  const sourceProductionRevision = String(
    input.sourceProductionRevision ?? ""
  ).toLowerCase();
  if (
    !SHA40.test(sourceProductionRevision) ||
    sourceProductionRevision !== BUILD_378_RUNTIME.yw.main
  ) {
    throw new Error("build378_source_revision_invalid");
  }
  const requiredTables = exactRequiredTables(input.requiredTables);
  const schemaChainVerified = input.schemaChainVerified === true;
  const rlsVerified = input.rlsVerified === true;
  const ownerHelperVerified = input.ownerHelperVerified === true;
  const protectedSummaryVerified = input.protectedSummaryVerified === true;
  if (
    !schemaChainVerified ||
    !rlsVerified ||
    !ownerHelperVerified ||
    !protectedSummaryVerified
  ) {
    throw new Error("build378_runtime_prerequisites_not_verified");
  }
  const evidenceUri = evidenceURI(input.evidenceURI, "evidence_uri");
  const nonce = String(input.nonce ?? "").trim();
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(nonce)) {
    throw new Error("build378_nonce_invalid");
  }
  const checkedAt = timestamp(input.checkedAt, "checked_at");
  const checkedMs = Date.parse(checkedAt);
  const nowMs = Date.now();
  if (checkedMs > nowMs + 2 * 60_000 || nowMs - checkedMs > 15 * 60_000) {
    throw new Error("build378_runtime_evidence_stale");
  }
  const signatureBase64 = String(input.signatureBase64 ?? "");
  if (
    signatureBase64.length < 40 ||
    signatureBase64.length > 512 ||
    !/^[A-Za-z0-9+/=]+$/.test(signatureBase64)
  ) {
    throw new Error("build378_signature_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build378-yw562-runtime-prerequisite-intake"
    ]);

    const signer = await activeYwSigner(client);
    if (signer.key_id !== keyId) {
      throw new Error("build378_active_signer_key_mismatch");
    }
    const publicKeyPem = await enrolledPublicKey(client, keyId);
    if (trustedSignerFingerprint(publicKeyPem) !== signer.public_key_spki_sha256) {
      throw new Error("build378_signer_fingerprint_mismatch");
    }

    const payload = canonicalBuild378RuntimePrerequisitePayload({
      keyId,
      sourceProductionRevision,
      requiredTables,
      schemaChainVerified,
      rlsVerified,
      ownerHelperVerified,
      protectedSummaryVerified,
      evidenceURI: evidenceUri,
      nonce,
      checkedAt
    });
    const key = createPublicKey(publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("build378_signer_not_ed25519");
    }
    const signature = Buffer.from(signatureBase64, "base64");
    const valid = verify(
      null,
      Buffer.from(payload, "utf8"),
      key,
      signature
    );
    if (!valid) throw new Error("build378_runtime_signature_invalid");

    const evidenceId = randomUUID();
    await client.query(`insert into app.master_yw562_runtime_prerequisite_evidence_intakes(
      evidence_id,actor_user_id,source_id,key_id,source_production_revision,
      required_tables,schema_chain_verified,rls_verified,owner_helper_verified,
      protected_summary_verified,evidence_uri,report_digest,signature_digest,
      nonce,checked_at,verification_state
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4::jsonb,
      true,true,true,true,$5,$6,$7,$8,$9::timestamptz,'VERIFIED_CURRENT'
    )`,[
      evidenceId,
      keyId,
      sourceProductionRevision,
      JSON.stringify(requiredTables),
      evidenceUri,
      build378EvidenceDigest(payload),
      build378EvidenceDigest(signature),
      nonce,
      checkedAt
    ]);

    const model = await loadBuild378RuntimeQl422ReadinessFromClient(client);
    const readinessEventId = await recordReadiness(client, model);
    return { evidenceId, readinessEventId, model };
  });
}

export async function admitBuild378FreshSourceBoundReceipt(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build378-yw562-fresh-receipt-admission"
    ]);

    const before = await loadBuild378RuntimeQl422ReadinessFromClient(client);
    if (before.runtimePrerequisiteState !== "VERIFIED_CURRENT") {
      throw new Error("build378_runtime_prerequisites_required");
    }
    if (before.sourceReceiptState !== "ACTIVE_CURRENT") {
      throw new Error("build378_current_source_receipt_required");
    }
    if (
      before.freshSourceBoundReceiptAdmissionState !==
      "READY_FOR_RECEIPT_ADMISSION"
    ) {
      throw new Error(
        "build378_receipt_admission_not_ready:" +
          before.freshSourceBoundReceiptAdmissionState
      );
    }
    if (
      !before.latestRuntimePrerequisiteEvidence ||
      !before.exactCurrentReceipt
    ) {
      throw new Error("build378_receipt_admission_binding_incomplete");
    }

    const admissionEventId = randomUUID();
    const admittedAt = new Date().toISOString();
    await client.query(`insert into app.master_yw562_fresh_source_receipt_admission_events(
      admission_event_id,actor_user_id,source_id,prerequisite_evidence_id,
      receipt_id,receipt_sha256,source_revision,admission_state,admitted_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),'yw',$2,$3,$4,$5,
      'ADMITTED_CURRENT',$6::timestamptz
    )`,[
      admissionEventId,
      before.latestRuntimePrerequisiteEvidence.evidenceId,
      before.exactCurrentReceipt.receiptId,
      before.exactCurrentReceipt.receiptSha256,
      BUILD_378_RUNTIME.yw.main,
      admittedAt
    ]);

    const model = await loadBuild378RuntimeQl422ReadinessFromClient(client);
    const readinessEventId = await recordReadiness(client, model);
    return { admissionEventId, readinessEventId, model };
  });
}

export async function recordBuild378Ql422ReferenceCandidate(
  userId: string,
  input: Record<string, unknown>
) {
  const sourceEpisodeId = String(input.sourceEpisodeId ?? "").trim();
  const handoffReceiptId = String(input.handoffReceiptId ?? "").trim();
  const originalHostId = String(input.originalHostId ?? "").trim();
  if (
    sourceEpisodeId.length < 8 ||
    sourceEpisodeId.length > 160 ||
    handoffReceiptId.length < 8 ||
    handoffReceiptId.length > 160
  ) {
    throw new Error("build378_ql422_reference_id_invalid");
  }
  if (originalHostId !== BUILD_378_RUNTIME.aiHub.originalHost) {
    throw new Error("build378_original_host_invalid");
  }

  const masterReceipts = parseMasterReceipts(input.masterReceipts);
  const masterIds = masterReceipts.map((item) => item.masterId);
  if (
    masterReceipts.length !== 3 ||
    new Set(masterIds).size !== 3 ||
    ![
      "rosevear-ai-hub",
      "rosevear-comms-hub",
      "ai-data-platform"
    ].every((masterId) => masterIds.includes(masterId as Build378Ql422MasterReceipt["masterId"])) ||
    masterReceipts.some(
      (item) => !item.receiptId || !SHA64.test(item.digest)
    )
  ) {
    throw new Error("build378_three_master_references_invalid");
  }

  const sourceReceiptDigest = digest(
    input.sourceReceiptDigest,
    "source_receipt_digest"
  );
  const receiverAckDigest = digest(
    input.receiverAckDigest,
    "receiver_ack_digest"
  );
  const closureDigest = digest(input.closureDigest, "closure_digest");
  const witnessDigest = digest(input.witnessDigest, "witness_digest");
  const terminalLedgerDigest = digest(
    input.terminalLedgerDigest,
    "terminal_ledger_digest"
  );
  const evidenceUri = evidenceURI(input.evidenceURI, "ql422_evidence_uri");
  const observedAt = timestamp(input.observedAt, "observed_at");

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build378-ql422-reference-candidate"
    ]);

    const correlationEventId = randomUUID();
    await client.query(`insert into app.master_ql422_original_host_three_master_correlation_events(
      correlation_event_id,actor_user_id,evidence_authority,
      controller_revision,yw_source_revision,ai_hub_main,comms_main,
      original_host_id,source_episode_id,source_receipt_digest,
      receiver_ack_digest,closure_digest,handoff_receipt_id,witness_digest,
      master_receipts,terminal_ledger_digest,evidence_uri,correlation_state,
      observed_at
    ) values(
      $1,nullif(current_setting('app.user_id',true),''),
      'owner-reference-only',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
      $13::jsonb,$14,$15,'CANDIDATE_HOLD',$16::timestamptz
    )`,[
      correlationEventId,
      BUILD_378_CONTROLLER_BASE_REVISION,
      BUILD_378_RUNTIME.yw.main,
      BUILD_378_RUNTIME.aiHub.main,
      BUILD_378_RUNTIME.comms.main,
      originalHostId,
      sourceEpisodeId,
      sourceReceiptDigest,
      receiverAckDigest,
      closureDigest,
      handoffReceiptId,
      witnessDigest,
      JSON.stringify(masterReceipts),
      terminalLedgerDigest,
      evidenceUri,
      observedAt
    ]);

    const model = await loadBuild378RuntimeQl422ReadinessFromClient(client);
    const readinessEventId = await recordReadiness(client, model);
    return { correlationEventId, readinessEventId, model };
  });
}

export async function recordBuild378ProtectedActivationReadiness(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build378-protected-activation-readiness"
    ]);
    const model = await loadBuild378RuntimeQl422ReadinessFromClient(client);
    const readinessEventId = await recordReadiness(client, model);
    return { readinessEventId, model };
  });
}
