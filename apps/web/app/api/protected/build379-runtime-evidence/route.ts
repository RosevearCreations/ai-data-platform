import { createPublicKey, verify } from "node:crypto";

import { trustedSignerFingerprint } from "@/lib/source-trust-ledger";
import {
  admitBuild379ProtectedRuntimeEvidence
} from "@/lib/yw562-protected-runtime-activation-decision-database";
import {
  BUILD_379_CONTROLLER_BASE_REVISION,
  BUILD_379_RUNTIME,
  build379Digest,
  canonicalBuild379ProtectedEnvelope,
  type Build379ProtectedEnvelope
} from "@/lib/yw562-protected-runtime-activation-decision";
import {
  BUILD_378_CONTROLLER_BASE_REVISION,
  BUILD_378_RUNTIME
} from "@/lib/yw562-runtime-ql422-protected-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA64 = /^[a-f0-9]{64}$/;
const MAX_BODY_BYTES = 32_768;

function exactString(value: unknown, name: string, max = 512) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max || /[\u0000-\u001f]/.test(result)) {
    throw new Error("build379_" + name + "_invalid");
  }
  return result;
}

function uuid(value: unknown, name: string) {
  const result = exactString(value, name, 64);
  if (!UUID.test(result)) throw new Error("build379_" + name + "_invalid");
  return result;
}

function digest(value: unknown, name: string) {
  const result = String(value ?? "").toLowerCase();
  if (!SHA64.test(result)) throw new Error("build379_" + name + "_invalid");
  return result;
}

function evidenceURI(value: unknown) {
  const result = exactString(value, "evidence_uri", 512);
  if (
    !(result.startsWith("https://") || result.startsWith("urn:rosevear:evidence:")) ||
    /\s/.test(result)
  ) {
    throw new Error("build379_evidence_uri_invalid");
  }
  return result;
}

function parseEnvelope(body: Record<string, unknown>): Build379ProtectedEnvelope {
  const receipts = Array.isArray(body.masterReceipts) ? body.masterReceipts : [];
  const masterReceipts = receipts.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("build379_master_receipts_invalid");
    }
    const item = raw as Record<string, unknown>;
    const masterId = exactString(item.masterId, "master_id", 64);
    if (
      masterId !== "rosevear-ai-hub" &&
      masterId !== "rosevear-comms-hub" &&
      masterId !== "ai-data-platform"
    ) {
      throw new Error("build379_master_id_invalid");
    }
    return {
      masterId,
      receiptId: exactString(item.receiptId, "master_receipt_id", 160),
      digest: digest(item.digest, "master_receipt_digest")
    };
  });
  const ids = masterReceipts.map((item) => item.masterId);
  if (
    masterReceipts.length !== 3 ||
    new Set(ids).size !== 3 ||
    !["rosevear-ai-hub","rosevear-comms-hub","ai-data-platform"].every((id) =>
      ids.includes(id as (typeof ids)[number])
    )
  ) {
    throw new Error("build379_three_master_receipts_invalid");
  }

  const observedAt = exactString(body.observedAt, "observed_at", 64);
  const observed = Date.parse(observedAt);
  const now = Date.now();
  if (
    !Number.isFinite(observed) ||
    observed > now + 2 * 60_000 ||
    now - observed > 5 * 60_000
  ) {
    throw new Error("build379_protected_evidence_stale");
  }

  const nonce = exactString(body.nonce, "nonce", 160);
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(nonce)) {
    throw new Error("build379_nonce_invalid");
  }

  const envelope: Build379ProtectedEnvelope = {
    authorityKeyId: exactString(body.authorityKeyId, "authority_key_id", 160),
    controllerRevision: exactString(body.controllerRevision, "controller_revision", 40),
    ql422ControllerRevision: exactString(body.ql422ControllerRevision, "ql422_controller_revision", 40),
    build378AiHubRevision: exactString(body.build378AiHubRevision, "build378_ai_hub_revision", 40),
    build378CommsRevision: exactString(body.build378CommsRevision, "build378_comms_revision", 40),
    sourceRevision: exactString(body.sourceRevision, "source_revision", 40),
    aiHubMain: exactString(body.aiHubMain, "ai_hub_main", 40),
    commsMain: exactString(body.commsMain, "comms_main", 40),
    originalHostId: exactString(body.originalHostId, "original_host_id", 128),
    prerequisiteEvidenceId: uuid(body.prerequisiteEvidenceId, "prerequisite_evidence_id"),
    freshReceiptAdmissionEventId: uuid(body.freshReceiptAdmissionEventId, "fresh_receipt_admission_event_id"),
    exactReceiptId: uuid(body.exactReceiptId, "exact_receipt_id"),
    exactReceiptSha256: digest(body.exactReceiptSha256, "exact_receipt_sha256"),
    ownerDecisionId: uuid(body.ownerDecisionId, "owner_decision_id"),
    sourceEpisodeId: exactString(body.sourceEpisodeId, "source_episode_id", 160),
    sourceReceiptDigest: digest(body.sourceReceiptDigest, "source_receipt_digest"),
    receiverAckDigest: digest(body.receiverAckDigest, "receiver_ack_digest"),
    closureDigest: digest(body.closureDigest, "closure_digest"),
    handoffReceiptId: exactString(body.handoffReceiptId, "handoff_receipt_id", 160),
    witnessDigest: digest(body.witnessDigest, "witness_digest"),
    masterReceipts,
    terminalLedgerDigest: digest(body.terminalLedgerDigest, "terminal_ledger_digest"),
    evidenceURI: evidenceURI(body.evidenceURI),
    nonce,
    observedAt: new Date(observed).toISOString()
  };

  if (
    envelope.controllerRevision !== BUILD_379_CONTROLLER_BASE_REVISION ||
    envelope.ql422ControllerRevision !== BUILD_378_CONTROLLER_BASE_REVISION ||
    envelope.build378AiHubRevision !== BUILD_378_RUNTIME.aiHub.main ||
    envelope.build378CommsRevision !== BUILD_378_RUNTIME.comms.main ||
    envelope.sourceRevision !== BUILD_379_RUNTIME.yw.main ||
    envelope.aiHubMain !== BUILD_379_RUNTIME.aiHub.main ||
    envelope.commsMain !== BUILD_379_RUNTIME.comms.main ||
    envelope.originalHostId !== BUILD_379_RUNTIME.aiHub.originalHost
  ) {
    throw new Error("build379_exact_revision_binding_required");
  }

  return envelope;
}

function statusFor(message: string) {
  if (message.includes("not_configured")) return 503;
  if (
    message.includes("_invalid") ||
    message.includes("_mismatch") ||
    message.includes("_stale") ||
    message.includes("_required") ||
    message.includes("_not_ready") ||
    message.includes("_not_current") ||
    message.includes("_not_closed")
  ) return 400;
  return 500;
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return Response.json({ error: "build379_body_invalid" }, { status: 400 });
    }
    const body = JSON.parse(raw) as Record<string, unknown>;
    const signatureBase64 = exactString(body.signatureBase64, "signature", 512);
    if (!/^[A-Za-z0-9+/=]+$/.test(signatureBase64)) {
      throw new Error("build379_signature_invalid");
    }

    const pem = process.env.BUILD379_PROTECTED_INGEST_PUBLIC_KEY_PEM?.trim();
    if (!pem) throw new Error("build379_protected_authority_not_configured");

    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("build379_protected_authority_key_invalid");
    }
    const authorityFingerprint = trustedSignerFingerprint(pem);
    const envelope = parseEnvelope(body);
    if (envelope.authorityKeyId !== authorityFingerprint) {
      throw new Error("build379_authority_key_id_mismatch");
    }

    const canonical = canonicalBuild379ProtectedEnvelope(envelope);
    const signature = Buffer.from(signatureBase64, "base64");
    if (
      signature.length !== 64 ||
      !verify(null, Buffer.from(canonical, "utf8"), key, signature)
    ) {
      throw new Error("build379_protected_signature_invalid");
    }

    const result = await admitBuild379ProtectedRuntimeEvidence({
      envelope,
      authorityKeySpkiSha256: authorityFingerprint,
      envelopeSha256: build379Digest(canonical),
      signatureSha256: build379Digest(signature)
    });

    return Response.json({ admitted: true, result }, {
      status: 201,
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "build379_json_invalid"
        : error instanceof Error
          ? error.message
          : "build379_protected_intake_failed";
    return Response.json({ error: message }, {
      status: statusFor(message),
      headers: { "Cache-Control": "no-store" }
    });
  }
}

export function GET() {
  return Response.json(
    { error: "build379_protected_intake_post_only" },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } }
  );
}
