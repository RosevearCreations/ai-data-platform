import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  composeBuild367OwnerReview,
  type Build367SourceSnapshot
} from "./source-owner-review";
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
type OwnerDecisionRow = {
  decision_id: string;
  source_id: Source365Id;
  receipt_id: string | null;
  decision: "HOLD" | "ACCEPT" | "REJECT";
  evidence_uri: string;
  detail: string;
  decided_at: Date;
  recorded_at: Date;
};
type PacketRow = {
  packet_id: string;
  source_id: Source365Id;
  source_production_revision: string;
  source_manifest_revision: string | null;
  source_revision_state: "VERIFIED_CURRENT" | "HOLD_MANIFEST_STALE" | "HOLD_MANIFEST_UNVERIFIED";
  signer_key_id: string | null;
  signer_state: "TRUSTED_SIGNER_ENROLLED" | "HOLD_UNENROLLED" | "HOLD_AMBIGUOUS";
  receipt_id: string | null;
  receipt_state:
    | "VERIFIED_CURRENT"
    | "HOLD_NOT_RECEIVED"
    | "HOLD_STALE"
    | "HOLD_REVISION_MISMATCH"
    | "HOLD_NOT_ADMITTED";
  admission_event_id: string | null;
  master_gate_state: "OPEN" | "HOLD";
  blockers: unknown;
  packet_state: "READY_FOR_OWNER_DECISION" | "HOLD";
  captured_at: Date;
  recorded_at: Date;
};
type Decision367Row = {
  decision_event_id: string;
  packet_id: string;
  source_id: Source365Id;
  receipt_id: string | null;
  decision: "HOLD" | "ACCEPT" | "REJECT";
  evidence_uri: string;
  detail: string;
  decided_at: Date;
  recorded_at: Date;
};

async function requireSuiteAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) throw new Error("build367_suite_admin_required");
}

async function requireSuiteOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role='owner'
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) throw new Error("build367_suite_owner_required");
}

function parseSourceId(value: unknown): Source365Id {
  if (value !== "yw" && value !== "icamp") throw new Error("build367_source_invalid");
  return value;
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

function ownerDecisionRow(row: OwnerDecisionRow): OwnerDecisionAuditEvent {
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

async function loadEvidence(client: PoolClient) {
  const [signers, receipts, admissions, ownerDecisions] = await Promise.all([
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
    client.query<OwnerDecisionRow>(
      `select decision_id,source_id,receipt_id,decision,evidence_uri,detail,
              decided_at,recorded_at
       from app.master_owner_decision_audit
       order by recorded_at desc limit 1000`
    )
  ]);
  return {
    signerEvents: signers.rows.map(signerRow),
    receipts: receipts.rows.map(receiptRow),
    admissionEvents: admissions.rows.map(admissionRow),
    ownerDecisions: ownerDecisions.rows.map(ownerDecisionRow)
  };
}

export async function listBuild367OwnerReviewForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    const [packets, decisions] = await Promise.all([
      client.query<PacketRow>(
        `select packet_id,source_id,source_production_revision,source_manifest_revision,
                source_revision_state,signer_key_id,signer_state,receipt_id,
                receipt_state,admission_event_id,master_gate_state,blockers,
                packet_state,captured_at,recorded_at
         from app.master_source_owner_review_packets
         order by recorded_at desc limit 100`
      ),
      client.query<Decision367Row>(
        `select decision_event_id,packet_id,source_id,receipt_id,decision,
                evidence_uri,detail,decided_at,recorded_at
         from app.master_source_acceptance_decision_events
         order by recorded_at desc limit 100`
      )
    ]);
    return {
      model: composeBuild367OwnerReview(await loadEvidence(client)),
      packets: packets.rows,
      decisions: decisions.rows
    };
  });
}

export async function prepareBuild367OwnerReviewPacket(
  userId: string,
  sourceValue: unknown
) {
  const sourceId = parseSourceId(sourceValue);
  return withUserDatabase(userId, async (client) => {
    await requireSuiteOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build367-owner-review:" + sourceId
    ]);
    const model = composeBuild367OwnerReview(await loadEvidence(client));
    const source = model.sources.find((item) => item.sourceId === sourceId);
    if (!source) throw new Error("build367_source_snapshot_missing");

    const packetId = randomUUID();
    await client.query(
      `insert into app.master_source_owner_review_packets (
         packet_id,actor_user_id,source_id,source_production_revision,
         source_manifest_revision,source_revision_state,signer_key_id,signer_state,
         receipt_id,receipt_state,admission_event_id,master_gate_state,
         master_snapshot,blockers,packet_state,captured_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15::timestamptz
       )`,
      [
        packetId,
        sourceId,
        source.productionMain,
        source.manifestRevision,
        source.sourceRevisionState,
        source.activeSignerKeyId,
        source.signerState,
        source.latestReceipt?.receiptId ?? null,
        source.receiptState,
        source.latestAdmission?.admissionEventId ?? null,
        source.masterGateState,
        JSON.stringify(model.master.snapshot),
        JSON.stringify(source.blockers),
        source.packetState,
        new Date().toISOString()
      ]
    );

    return {
      packetId,
      sourceId,
      packetState: source.packetState,
      blockers: source.blockers,
      receiptId: source.latestReceipt?.receiptId ?? null,
      masterGateState: source.masterGateState
    };
  });
}

function parseEvidenceURI(value: unknown) {
  const uri = String(value ?? "").trim();
  if (
    !(uri.startsWith("https://") || uri.startsWith("urn:rosevear:evidence:")) ||
    /\s/.test(uri) ||
    uri.length > 500
  ) {
    throw new Error("build367_evidence_uri_invalid");
  }
  return uri;
}

export async function recordBuild367ExplicitDecision(
  userId: string,
  input: {
    packetId: unknown;
    decision: unknown;
    evidenceURI: unknown;
    detail: unknown;
    decidedAt: unknown;
  }
) {
  const packetId = String(input.packetId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(packetId)) throw new Error("build367_packet_id_invalid");
  const decision = String(input.decision ?? "");
  if (!["HOLD", "ACCEPT", "REJECT"].includes(decision)) {
    throw new Error("build367_decision_invalid");
  }
  const evidenceURI = parseEvidenceURI(input.evidenceURI);
  const detail = String(input.detail ?? "");
  if (detail.length < 1 || detail.length > 1800) throw new Error("build367_detail_invalid");
  const decidedAt = String(input.decidedAt ?? "");
  if (!Number.isFinite(Date.parse(decidedAt))) throw new Error("build367_decided_at_invalid");

  return withUserDatabase(userId, async (client) => {
    await requireSuiteOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build367-decision:" + packetId
    ]);

    const packetResult = await client.query<PacketRow>(
      `select packet_id,source_id,source_production_revision,source_manifest_revision,
              source_revision_state,signer_key_id,signer_state,receipt_id,
              receipt_state,admission_event_id,master_gate_state,blockers,
              packet_state,captured_at,recorded_at
       from app.master_source_owner_review_packets
       where packet_id=$1`,
      [packetId]
    );
    const packet = packetResult.rows[0];
    if (!packet) throw new Error("build367_packet_not_found");

    const current = composeBuild367OwnerReview(await loadEvidence(client));
    const source = current.sources.find((item) => item.sourceId === packet.source_id);
    if (!source) throw new Error("build367_source_snapshot_missing");

    if (decision === "ACCEPT") {
      const packetStillCurrent =
        packet.packet_state === "READY_FOR_OWNER_DECISION" &&
        packet.source_production_revision === source.productionMain &&
        packet.receipt_id !== null &&
        packet.receipt_id === source.latestReceipt?.receiptId &&
        source.packetState === "READY_FOR_OWNER_DECISION" &&
        source.receiptState === "VERIFIED_CURRENT" &&
        source.signerState === "TRUSTED_SIGNER_ENROLLED" &&
        source.masterGateState === "OPEN";

      if (!packetStillCurrent) throw new Error("build367_acceptance_gate_hold");
    }

    const receiptId = decision === "ACCEPT" ? packet.receipt_id : packet.receipt_id;
    const legacyDecisionId = randomUUID();
    await client.query(
      `insert into app.master_owner_decision_audit (
         decision_id,actor_user_id,source_id,receipt_id,decision,
         evidence_uri,detail,decided_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7::timestamptz
       )`,
      [
        legacyDecisionId,
        packet.source_id,
        receiptId,
        decision,
        evidenceURI,
        "Build 367 packet " + packetId + ": " + detail,
        decidedAt
      ]
    );

    const decisionEventId = randomUUID();
    await client.query(
      `insert into app.master_source_acceptance_decision_events (
         decision_event_id,actor_user_id,packet_id,source_id,receipt_id,
         decision,evidence_uri,detail,decided_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7,$8::timestamptz
       )`,
      [
        decisionEventId,
        packetId,
        packet.source_id,
        receiptId,
        decision,
        evidenceURI,
        detail,
        decidedAt
      ]
    );

    return {
      decisionEventId,
      legacyDecisionId,
      packetId,
      sourceId: packet.source_id,
      receiptId,
      decision
    };
  });
}
