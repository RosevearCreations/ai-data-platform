import { createHash, randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  canonicalConvergenceReceiptPayload,
  composeConvergenceReceiptIntake,
  type ConvergenceReceipt,
  type TrustedSourceSigner
} from "./convergence-receipt-intake";
import { withUserDatabase } from "./database";
import { composeMasterActivationEvidenceReconciliation } from "./master-activation-evidence-reconciliation";
import {
  composeSourceTrustLedger,
  trustedSignerFingerprint,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent,
  type Source365Id
} from "./source-trust-ledger";

type SignerRow = {
  event_id: string;
  source_id: Source365Id;
  event_type: "ENROLLED" | "REVOKED";
  key_id: string;
  public_key_pem: string;
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

async function requireSuiteAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) {
    throw new Error("build365_suite_admin_required");
  }
}

async function requireSuiteOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1 from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role='owner'
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) {
    throw new Error("build365_suite_owner_required");
  }
}

function parseSourceId(value: unknown): Source365Id {
  if (value !== "yw" && value !== "icamp") {
    throw new Error("build365_source_invalid");
  }
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

export async function listSourceTrustLedgerForUser(
  userId: string,
  now = new Date()
) {
  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    const [signers, receipts, decisions] = await Promise.all([
      client.query<SignerRow>(
        `select event_id,source_id,event_type,key_id,public_key_pem,
                public_key_spki_sha256,custody_evidence_uri,
                independently_verified_at,recorded_at
         from app.master_source_signer_registry_events
         order by recorded_at desc
         limit 500`
      ),
      client.query<ReceiptRow>(
        `select receipt_id,source_id,key_id,source_revision,manifest_revision,
                receipt_sha256,nonce,issued_at,health_observed_at,health_state,
                source_runtime,verification_state,verified_at
         from app.master_convergence_receipt_ledger
         order by verified_at desc
         limit 500`
      ),
      client.query<DecisionRow>(
        `select decision_id,source_id,receipt_id,decision,evidence_uri,detail,
                decided_at,recorded_at
         from app.master_owner_decision_audit
         order by recorded_at desc
         limit 500`
      )
    ]);

    return composeSourceTrustLedger({
      signerEvents: signers.rows.map(signerRow),
      receipts: receipts.rows.map(receiptRow),
      ownerDecisions: decisions.rows.map(decisionRow),
      now
    });
  });
}

export async function recordTrustedSourceSignerEvent(
  userId: string,
  input: {
    sourceId: unknown;
    eventType: unknown;
    keyId: unknown;
    publicKeyPem: unknown;
    custodyEvidenceURI: unknown;
    independentlyVerifiedAt: unknown;
    note?: unknown;
  }
) {
  const sourceId = parseSourceId(input.sourceId);
  const eventType = String(input.eventType ?? "");
  if (eventType !== "ENROLLED" && eventType !== "REVOKED") {
    throw new Error("build365_signer_event_invalid");
  }
  const keyId = String(input.keyId ?? "").trim();
  const publicKeyPem = String(input.publicKeyPem ?? "");
  const custodyEvidenceURI = String(input.custodyEvidenceURI ?? "").trim();
  const independentlyVerifiedAt = String(input.independentlyVerifiedAt ?? "");
  if (!keyId || keyId.length > 160) throw new Error("build365_key_id_invalid");
  if (!/^(https://|urn:rosevear:evidence:)S{1,500}$/.test(custodyEvidenceURI)) {
    throw new Error("build365_custody_evidence_invalid");
  }
  const verifiedAt = new Date(independentlyVerifiedAt);
  if (!Number.isFinite(verifiedAt.getTime())) {
    throw new Error("build365_verified_at_invalid");
  }
  const fingerprint = trustedSignerFingerprint(publicKeyPem);

  return withUserDatabase(userId, async (client) => {
    await requireSuiteOwner(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build365-signer:" + sourceId
    ]);
    const eventId = randomUUID();
    await client.query(
      `insert into app.master_source_signer_registry_events (
         event_id,actor_user_id,source_id,event_type,key_id,public_key_pem,
         public_key_spki_sha256,custody_evidence_uri,
         independently_verified_at,note
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,
         $6,$7,$8::timestamptz,$9
       )`,
      [
        eventId,
        sourceId,
        eventType,
        keyId,
        publicKeyPem,
        fingerprint,
        custodyEvidenceURI,
        independentlyVerifiedAt,
        input.note ? String(input.note).slice(0, 1200) : null
      ]
    );
    return { eventId, sourceId, eventType, keyId, fingerprint };
  });
}

async function currentTrustedSigner(
  client: PoolClient,
  sourceId: Source365Id,
  keyId: string
) {
  const result = await client.query<SignerRow>(
    `select event_id,source_id,event_type,key_id,public_key_pem,
            public_key_spki_sha256,custody_evidence_uri,
            independently_verified_at,recorded_at
     from app.master_source_signer_registry_events
     where source_id=$1 and key_id=$2
     order by recorded_at desc
     limit 1`,
    [sourceId, keyId]
  );
  const row = result.rows[0];
  if (!row || row.event_type !== "ENROLLED") {
    throw new Error("build365_trusted_signer_not_enrolled");
  }
  return row;
}

export async function recordVerifiedConvergenceReceipt(
  userId: string,
  receipt: ConvergenceReceipt
) {
  const sourceId = parseSourceId(receipt.sourceId);

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      "build365-receipt:" + sourceId
    ]);

    const signer = await currentTrustedSigner(client, sourceId, receipt.keyId);
    const seen = await client.query<{ nonce: string }>(
      `select nonce from app.master_convergence_receipt_ledger
       where source_id=$1`,
      [sourceId]
    );
    const trustedSigner: TrustedSourceSigner = {
      keyId: signer.key_id,
      publicKeyPem: signer.public_key_pem
    };
    const model = composeConvergenceReceiptIntake({
      now: new Date().toISOString(),
      receipts: { [sourceId]: { receipt } },
      trustedSigners: { [sourceId]: trustedSigner },
      seenNonces: seen.rows.map((row) => row.nonce)
    });
    const source = model.sources.find((item) => item.sourceId === sourceId);
    if (!source?.sourceEvidenceVerified) {
      throw new Error(
        "build365_receipt_verification_failed:" +
          (source?.blockers.join("|") ?? "source_missing")
      );
    }

    const payload = canonicalConvergenceReceiptPayload({
      schema: receipt.schema,
      receiptVersion: receipt.receiptVersion,
      handoffToken: receipt.handoffToken,
      sourceId: receipt.sourceId,
      sourceAppId: receipt.sourceAppId,
      repository: receipt.repository,
      sourceRevision: receipt.sourceRevision,
      manifestRevision: receipt.manifestRevision,
      keyId: receipt.keyId,
      issuedAt: receipt.issuedAt,
      nonce: receipt.nonce,
      health: receipt.health
    });
    const receiptSha256 = createHash("sha256").update(payload).digest("hex");
    const receiptId = randomUUID();

    try {
      await client.query(
        `insert into app.master_convergence_receipt_ledger (
           receipt_id,actor_user_id,source_id,signer_event_id,key_id,
           source_revision,manifest_revision,receipt_sha256,nonce,issued_at,
           health_observed_at,health_state,source_runtime,canonical_payload,
           signature_base64,verification_state
         ) values (
           $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,
           $5,$6,$7,$8,$9::timestamptz,$10::timestamptz,$11,$12,$13::jsonb,
           $14,'VERIFIED_SOURCE_BOUND_HEALTH'
         )`,
        [
          receiptId,
          sourceId,
          signer.event_id,
          receipt.keyId,
          receipt.sourceRevision,
          receipt.manifestRevision,
          receiptSha256,
          receipt.nonce,
          receipt.issuedAt,
          receipt.health.observedAt,
          receipt.health.state,
          receipt.health.sourceRuntime,
          payload,
          receipt.signatureBase64
        ]
      );
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        throw new Error("build365_receipt_replay_or_duplicate");
      }
      throw error;
    }

    return { receiptId, sourceId, receiptSha256, verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const };
  });
}

export async function recordOwnerDecisionAudit(
  userId: string,
  input: {
    sourceId: unknown;
    receiptId?: unknown;
    decision: unknown;
    evidenceURI: unknown;
    detail: unknown;
    decidedAt: unknown;
  }
) {
  const sourceId = parseSourceId(input.sourceId);
  const decision = String(input.decision ?? "");
  if (!["HOLD", "ACCEPT", "REJECT"].includes(decision)) {
    throw new Error("build365_owner_decision_invalid");
  }
  const receiptId =
    input.receiptId === undefined || input.receiptId === null || input.receiptId === ""
      ? null
      : String(input.receiptId);
  const evidenceURI = String(input.evidenceURI ?? "");
  const detail = String(input.detail ?? "");
  const decidedAt = String(input.decidedAt ?? "");
  if (!/^(https://|urn:rosevear:evidence:)S{1,500}$/.test(evidenceURI)) {
    throw new Error("build365_owner_evidence_invalid");
  }
  if (detail.length < 1 || detail.length > 1800) {
    throw new Error("build365_owner_detail_invalid");
  }
  if (!Number.isFinite(Date.parse(decidedAt))) {
    throw new Error("build365_owner_decided_at_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    await requireSuiteOwner(client);

    if (receiptId) {
      const receipt = await client.query<{ source_id: Source365Id }>(
        `select source_id from app.master_convergence_receipt_ledger
         where receipt_id=$1`,
        [receiptId]
      );
      if (!receipt.rows[0] || receipt.rows[0].source_id !== sourceId) {
        throw new Error("build365_owner_receipt_invalid");
      }
    }

    if (decision === "ACCEPT") {
      if (!receiptId) throw new Error("build365_owner_accept_receipt_required");
      const master = composeMasterActivationEvidenceReconciliation();
      if (!master.summary.mastersSynced) {
        throw new Error("build365_owner_accept_master_gate_hold");
      }
    }

    const decisionId = randomUUID();
    await client.query(
      `insert into app.master_owner_decision_audit (
         decision_id,actor_user_id,source_id,receipt_id,decision,
         evidence_uri,detail,decided_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,$5,$6,$7::timestamptz
       )`,
      [decisionId, sourceId, receiptId, decision, evidenceURI, detail, decidedAt]
    );
    return { decisionId, sourceId, receiptId, decision };
  });
}
