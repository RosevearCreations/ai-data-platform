import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  BUILD_369_SOURCE_BASELINES,
  composeBuild369SourceRefreshIntake,
  type SourceRefreshEvidenceEvent
} from "./source-refresh-evidence";
import type {
  ConvergenceLedgerReceipt,
  OwnerDecisionAuditEvent,
  SignerRegistryEvent,
  Source365Id
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";

type SignerRow = {
  event_id: string;
  source_id: Source365Id;
  event_type: "ENROLLED" | "REVOKED";
  key_id: string;
  public_key_spki_sha256: string;
  custody_evidence_uri: string;
  independently_verified_at: Date;
  recorded_at: Date;
};
type ReceiptRow = {
  receipt_id: string;
  source_id: Source365Id;
  key_id: string;
  source_revision: string;
  manifest_revision: string;
  receipt_sha256: string;
  nonce: string;
  issued_at: Date;
  health_observed_at: Date;
  health_state: "HEALTHY";
  source_runtime: string;
  verification_state: "VERIFIED_SOURCE_BOUND_HEALTH";
  verified_at: Date;
};
type AdmissionRow = {
  admission_event_id: string;
  source_id: Source365Id;
  key_id: string;
  receipt_sha256: string;
  source_revision: string;
  outcome: "ADMITTED" | "REJECTED";
  receipt_id: string | null;
  blockers: unknown;
  recorded_at: Date;
};
type DecisionRow = {
  decision_id: string;
  source_id: Source365Id;
  receipt_id: string | null;
  decision: "HOLD" | "ACCEPT" | "REJECT";
  evidence_uri: string;
  detail: string;
  decided_at: Date;
  recorded_at: Date;
};
type RefreshEvidenceRow = {
  evidence_event_id: string;
  source_id: Source365Id;
  handoff_token: string;
  source_production_revision: string;
  manifest_baseline_revision: string | null;
  deployed_manifest_revision: string | null;
  manifest_confirmation_state: SourceRefreshEvidenceEvent["manifestConfirmationState"];
  tenant_boundary: "platform_shell";
  signer_state: SourceRefreshEvidenceEvent["signerState"];
  receipt_id: string | null;
  receipt_state: SourceRefreshEvidenceEvent["receiptState"];
  durable_replay_state: SourceRefreshEvidenceEvent["durableReplayState"];
  evidence_uri: string;
  evidence_digest: string | null;
  sanitized_ack: string;
  blockers: unknown;
  received_at: Date;
  recorded_at: Date;
};

async function requireAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) throw new Error("build369_suite_admin_required");
}

async function requireOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role='owner'
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) throw new Error("build369_suite_owner_required");
}

function parseSourceId(value: unknown): Source365Id {
  if (value !== "yw" && value !== "icamp") throw new Error("build369_source_invalid");
  return value;
}

function evidenceURI(value: unknown) {
  const uri = String(value ?? "").trim();
  if (
    !(uri.startsWith("https://") || uri.startsWith("urn:rosevear:evidence:")) ||
    /\s/.test(uri) ||
    uri.length > 500
  ) {
    throw new Error("build369_evidence_uri_invalid");
  }
  return uri;
}

function evidenceDigest(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const digest = String(value).trim().toLowerCase();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error("build369_evidence_digest_invalid");
  }
  return digest;
}

function sanitizedAck(value: unknown) {
  const ack = String(value ?? "").trim();
  if (ack.length < 1 || ack.length > 4000) {
    throw new Error("build369_ack_invalid");
  }
  if (/(private[_ -]?key|secret|password|access[_ -]?token)\s*=/i.test(ack)) {
    throw new Error("build369_ack_secret_material_rejected");
  }
  return ack;
}

function signerRow(row: SignerRow): SignerRegistryEvent {
  return {
    eventId: row.event_id,
    sourceId: row.source_id,
    eventType: row.event_type,
    keyId: row.key_id,
    publicKeySpkiSha256: row.public_key_spki_sha256,
    custodyEvidenceURI: row.custody_evidence_uri,
    independentlyVerifiedAt: row.independently_verified_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function receiptRow(row: ReceiptRow): ConvergenceLedgerReceipt {
  return {
    receiptId: row.receipt_id,
    sourceId: row.source_id,
    keyId: row.key_id,
    sourceRevision: row.source_revision,
    manifestRevision: row.manifest_revision,
    receiptSha256: row.receipt_sha256,
    nonce: row.nonce,
    issuedAt: row.issued_at.toISOString(),
    healthObservedAt: row.health_observed_at.toISOString(),
    healthState: row.health_state,
    sourceRuntime: row.source_runtime,
    verificationState: row.verification_state,
    verifiedAt: row.verified_at.toISOString()
  };
}

function admissionRow(row: AdmissionRow): HealthAdmissionEvent {
  return {
    admissionEventId: row.admission_event_id,
    sourceId: row.source_id,
    keyId: row.key_id,
    receiptSha256: row.receipt_sha256,
    sourceRevision: row.source_revision,
    outcome: row.outcome,
    receiptId: row.receipt_id,
    blockers: Array.isArray(row.blockers)
      ? row.blockers.filter((item): item is string => typeof item === "string")
      : [],
    recordedAt: row.recorded_at.toISOString()
  };
}

function decisionRow(row: DecisionRow): OwnerDecisionAuditEvent {
  return {
    decisionId: row.decision_id,
    sourceId: row.source_id,
    receiptId: row.receipt_id,
    decision: row.decision,
    evidenceURI: row.evidence_uri,
    detail: row.detail,
    decidedAt: row.decided_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function refreshRow(row: RefreshEvidenceRow): SourceRefreshEvidenceEvent {
  return {
    evidenceEventId: row.evidence_event_id,
    sourceId: row.source_id,
    handoffToken: row.handoff_token,
    sourceProductionRevision: row.source_production_revision,
    manifestBaselineRevision: row.manifest_baseline_revision,
    deployedManifestRevision: row.deployed_manifest_revision,
    manifestConfirmationState: row.manifest_confirmation_state,
    tenantBoundary: row.tenant_boundary,
    signerState: row.signer_state,
    receiptId: row.receipt_id,
    receiptState: row.receipt_state,
    durableReplayState: row.durable_replay_state,
    evidenceURI: row.evidence_uri,
    evidenceDigest: row.evidence_digest,
    sanitizedAck: row.sanitized_ack,
    blockers: Array.isArray(row.blockers)
      ? row.blockers.filter((item): item is string => typeof item === "string")
      : [],
    receivedAt: row.received_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

async function loadEvidence(client: PoolClient) {
  const [signers, receipts, admissions, decisions, refresh] = await Promise.all([
    client.query<SignerRow>(
      `select event_id,source_id,event_type,key_id,public_key_spki_sha256,
              custody_evidence_uri,independently_verified_at,recorded_at
       from app.master_source_signer_registry_events
       order by recorded_at desc limit 1000`
    ),
    client.query<ReceiptRow>(
      `select receipt_id,source_id,key_id,source_revision,manifest_revision,
              receipt_sha256,nonce,issued_at,health_observed_at,health_state,
              source_runtime,verification_state,verified_at
       from app.master_convergence_receipt_ledger
       order by verified_at desc limit 1000`
    ),
    client.query<AdmissionRow>(
      `select admission_event_id,source_id,key_id,receipt_sha256,source_revision,
              outcome,receipt_id,blockers,recorded_at
       from app.master_source_health_admission_events
       order by recorded_at desc limit 1000`
    ),
    client.query<DecisionRow>(
      `select decision_id,source_id,receipt_id,decision,evidence_uri,detail,
              decided_at,recorded_at
       from app.master_owner_decision_audit
       order by recorded_at desc limit 1000`
    ),
    client.query<RefreshEvidenceRow>(
      `select evidence_event_id,source_id,handoff_token,source_production_revision,
              manifest_baseline_revision,deployed_manifest_revision,
              manifest_confirmation_state,tenant_boundary,signer_state,receipt_id,
              receipt_state,durable_replay_state,evidence_uri,evidence_digest,
              sanitized_ack,blockers,received_at,recorded_at
       from app.master_source_refresh_evidence_events
       order by recorded_at desc limit 1000`
    )
  ]);

  return {
    signerEvents: signers.rows.map(signerRow),
    receipts: receipts.rows.map(receiptRow),
    admissionEvents: admissions.rows.map(admissionRow),
    ownerDecisions: decisions.rows.map(decisionRow),
    refreshEvidenceEvents: refresh.rows.map(refreshRow)
  };
}

export async function listBuild369SourceRefreshForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireAdmin(client);
    const rechecks = await client.query(
      `select * from app.master_three_master_acceptance_rechecks
       order by recorded_at desc limit 100`
    );
    return {
      model: composeBuild369SourceRefreshIntake(await loadEvidence(client)),
      acceptanceRechecks: rechecks.rows
    };
  });
}

export async function recordBuild369SourceRefreshEvidence(
  userId: string,
  input: {
    sourceId: unknown;
    handoffToken: unknown;
    sourceProductionRevision: unknown;
    manifestBaselineRevision?: unknown;
    deployedManifestRevision?: unknown;
    tenantBoundary: unknown;
    durableReplayState: unknown;
    evidenceURI: unknown;
    evidenceDigest?: unknown;
    sanitizedAck: unknown;
    receivedAt: unknown;
  }
) {
  const sourceId = parseSourceId(input.sourceId);
  const baseline = BUILD_369_SOURCE_BASELINES.find(
    (source) => source.sourceId === sourceId
  );
  if (!baseline) throw new Error("build369_source_baseline_missing");

  const handoffToken = String(input.handoffToken ?? "").trim();
  if (handoffToken !== baseline.previousHandoffToken) {
    throw new Error("build369_handoff_token_mismatch");
  }

  const sourceProductionRevision = String(input.sourceProductionRevision ?? "").trim();
  if (sourceProductionRevision !== baseline.productionMain) {
    throw new Error("build369_source_revision_mismatch");
  }

  const tenantBoundary = String(input.tenantBoundary ?? "");
  if (tenantBoundary !== "platform_shell") {
    throw new Error("build369_tenant_boundary_invalid");
  }

  const manifestBaselineRevision =
    input.manifestBaselineRevision === undefined ||
    input.manifestBaselineRevision === null ||
    input.manifestBaselineRevision === ""
      ? null
      : String(input.manifestBaselineRevision);
  const deployedManifestRevision =
    input.deployedManifestRevision === undefined ||
    input.deployedManifestRevision === null ||
    input.deployedManifestRevision === ""
      ? null
      : String(input.deployedManifestRevision);

  for (const value of [manifestBaselineRevision, deployedManifestRevision]) {
    if (value !== null && !/^[a-f0-9]{40}$/.test(value)) {
      throw new Error("build369_manifest_revision_invalid");
    }
  }

  const durableReplayState = String(input.durableReplayState ?? "");
  if (!["VERIFIED", "CODE_READY_RUNTIME_HOLD", "HOLD"].includes(durableReplayState)) {
    throw new Error("build369_durable_replay_state_invalid");
  }
  const uri = evidenceURI(input.evidenceURI);
  const digest = evidenceDigest(input.evidenceDigest);
  const ack = sanitizedAck(input.sanitizedAck);
  const receivedAt = String(input.receivedAt ?? "");
  if (!Number.isFinite(Date.parse(receivedAt))) {
    throw new Error("build369_received_at_invalid");
  }
  if (durableReplayState === "VERIFIED" && !digest) {
    throw new Error("build369_verified_replay_digest_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build369-source-refresh:" + sourceId
    ]);

    const evidence = await loadEvidence(client);
    const current = composeBuild369SourceRefreshIntake(evidence);
    const source = current.sources.find((item) => item.sourceId === sourceId);
    if (!source) throw new Error("build369_source_model_missing");

    const manifestConfirmationState =
      deployedManifestRevision === baseline.productionMain
        ? ("CONFIRMED_EXACT" as const)
        : deployedManifestRevision
          ? ("HOLD_STALE" as const)
          : ("HOLD_DEPLOYED_CONFIRMATION_REQUIRED" as const);

    const blockers = [
      ...(manifestConfirmationState !== "CONFIRMED_EXACT"
        ? ["Exact deployed manifest revision has not been independently confirmed."]
        : []),
      ...(source.signerState !== "TRUSTED_SIGNER_ENROLLED"
        ? ["Independent Ed25519 source signer is not enrolled in the controller registry."]
        : []),
      ...(source.receiptState !== "VERIFIED_CURRENT"
        ? ["Fresh admitted signed HEALTHY receipt for the exact current production revision is not verified."]
        : []),
      ...(durableReplayState !== "VERIFIED"
        ? ["Durable replay evidence remains unverified."]
        : [])
    ];

    const eventId = randomUUID();
    await client.query(
      `insert into app.master_source_refresh_evidence_events (
         evidence_event_id,actor_user_id,source_id,handoff_token,
         source_production_revision,manifest_baseline_revision,
         deployed_manifest_revision,manifest_confirmation_state,tenant_boundary,
         signer_state,receipt_id,receipt_state,durable_replay_state,
         evidence_uri,evidence_digest,sanitized_ack,blockers,received_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,$8,
         $9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::timestamptz
       )`,
      [
        eventId,
        sourceId,
        handoffToken,
        sourceProductionRevision,
        manifestBaselineRevision,
        deployedManifestRevision,
        manifestConfirmationState,
        tenantBoundary,
        source.signerState,
        source.latestReceipt?.receiptId ?? null,
        source.receiptState,
        durableReplayState,
        uri,
        digest,
        ack,
        JSON.stringify(blockers),
        receivedAt
      ]
    );

    return {
      evidenceEventId: eventId,
      sourceId,
      sourceProductionRevision,
      manifestConfirmationState,
      signerState: source.signerState,
      receiptState: source.receiptState,
      durableReplayState,
      blockers
    };
  });
}

export async function recordBuild369ThreeMasterAcceptanceRecheck(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build369-three-master-acceptance"
    ]);

    const model = composeBuild369SourceRefreshIntake(await loadEvidence(client));
    const checkedAt = new Date().toISOString();
    const results = [];

    for (const source of model.sources) {
      const recheckId = randomUUID();
      await client.query(
        `insert into app.master_three_master_acceptance_rechecks (
           acceptance_recheck_id,actor_user_id,source_id,source_evidence_event_id,
           source_production_revision,controller_base_revision,ai_hub_ack,ai_hub_main,
           comms_ack,comms_main,master_gate_state,source_evidence_state,
           signed_health_state,acceptance_state,blockers,checked_at
         ) values (
           $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12,$13,$14::jsonb,$15::timestamptz
         )`,
        [
          recheckId,
          source.sourceId,
          source.sourceEvidence?.evidenceEventId ?? null,
          source.productionMain,
          model.controllerBaseRevision,
          model.master.snapshot.aiHub.ack,
          model.master.snapshot.aiHub.main,
          model.master.snapshot.comms.ack,
          model.master.snapshot.comms.main,
          model.master.gateState,
          source.sourceEvidenceState,
          source.receiptState === "VERIFIED_CURRENT" ? "VERIFIED_CURRENT" : "HOLD",
          source.acceptanceState,
          JSON.stringify(source.blockers),
          checkedAt
        ]
      );
      results.push({
        sourceId: source.sourceId,
        acceptanceRecheckId: recheckId,
        sourceEvidenceState: source.sourceEvidenceState,
        acceptanceState: source.acceptanceState,
        blockers: source.blockers
      });
    }

    return {
      threeMasterGate: model.master.gateState,
      checkedAt,
      results
    };
  });
}
