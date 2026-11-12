import { createPublicKey, verify } from "node:crypto";

import { trustedSignerFingerprint } from "@/lib/source-trust-ledger";
import { admitBuild381RuntimeRenewal } from "@/lib/yw562-receiver-health-continuity-database";
import {
  BUILD_381_CONTROLLER_BASE_REVISION,
  BUILD_381_RUNTIME,
  build381Digest,
  canonicalBuild381MasterRenewalReceipt,
  canonicalBuild381RenewalEnvelope,
  type Build381MasterRenewalReceipt,
  type Build381RenewalBinding,
  type Build381RenewalEnvelope
} from "@/lib/yw562-receiver-health-continuity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA64 = /^[a-f0-9]{64}$/;
const SHA40 = /^[a-f0-9]{40}$/;
const MAX_BODY_BYTES = 48_000;

const MASTER_KEY_ENV = {
  "rosevear-ai-hub": "BUILD381_AI_HUB_RUNTIME_PUBLIC_KEY_PEM",
  "rosevear-comms-hub": "BUILD381_COMMS_RUNTIME_PUBLIC_KEY_PEM",
  "ai-data-platform": "BUILD381_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM"
} as const;

function exactString(value: unknown, name: string, max = 512) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max || /[\u0000-\u001f]/.test(result)) {
    throw new Error("build381_" + name + "_invalid");
  }
  return result;
}

function uuid(value: unknown, name: string) {
  const result = exactString(value, name, 64);
  if (!UUID.test(result)) throw new Error("build381_" + name + "_invalid");
  return result;
}

function digest(value: unknown, name: string) {
  const result = String(value ?? "").toLowerCase();
  if (!SHA64.test(result)) throw new Error("build381_" + name + "_invalid");
  return result;
}

function revision(value: unknown, name: string) {
  const result = String(value ?? "").toLowerCase();
  if (!SHA40.test(result)) throw new Error("build381_" + name + "_invalid");
  return result;
}

function evidenceURI(value: unknown, name: string) {
  const result = exactString(value, name, 512);
  if (
    !(result.startsWith("https://") ||
      result.startsWith("urn:rosevear:evidence:")) ||
    /\s/.test(result)
  ) {
    throw new Error("build381_" + name + "_invalid");
  }
  return result;
}

function isoTime(value: unknown, name: string) {
  const text = exactString(value, name, 64);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) throw new Error("build381_" + name + "_invalid");
  return new Date(parsed).toISOString();
}

function signature(value: unknown, name: string) {
  const base64 = exactString(value, name, 512);
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new Error("build381_" + name + "_invalid");
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length !== 64) throw new Error("build381_" + name + "_invalid");
  return bytes;
}

function verifyMasterReceipts(
  body: Record<string, unknown>,
  binding: Build381RenewalBinding
): Build381MasterRenewalReceipt[] {
  const raw = Array.isArray(body.masterReceipts) ? body.masterReceipts : [];
  const receipts = raw.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("build381_master_receipts_invalid");
    }
    const item = entry as Record<string, unknown>;
    const masterId = exactString(item.masterId, "master_id", 64);
    if (
      masterId !== "rosevear-ai-hub" &&
      masterId !== "rosevear-comms-hub" &&
      masterId !== "ai-data-platform"
    ) {
      throw new Error("build381_master_id_invalid");
    }
    if (item.runtimeState !== "CONNECTED_HEALTHY") {
      throw new Error("build381_master_runtime_state_invalid");
    }
    const typedMasterId = masterId as Build381MasterRenewalReceipt["masterId"];
    const signerKeyId = exactString(item.signerKeyId, "master_signer_key_id", 160);
    const unsigned = {
      masterId: typedMasterId,
      receiptId: exactString(item.receiptId, "master_receipt_id", 160),
      digest: digest(item.digest, "master_receipt_digest"),
      runtimeState: "CONNECTED_HEALTHY" as const,
      signerKeyId
    };
    const pem = process.env[MASTER_KEY_ENV[typedMasterId]]?.trim();
    if (!pem) throw new Error("build381_master_authority_not_configured");
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("build381_master_authority_key_invalid");
    }
    if (trustedSignerFingerprint(pem) !== signerKeyId) {
      throw new Error("build381_master_signer_key_mismatch");
    }
    const sig = signature(item.signatureBase64, "master_signature");
    const canonical = canonicalBuild381MasterRenewalReceipt(unsigned, binding);
    if (!verify(null, Buffer.from(canonical, "utf8"), key, sig)) {
      throw new Error("build381_master_signature_invalid");
    }
    return {
      ...unsigned,
      signatureSha256: build381Digest(sig)
    };
  });

  const ids = receipts.map((item) => item.masterId);
  if (
    receipts.length !== 3 ||
    new Set(ids).size !== 3 ||
    !["rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform"].every(
      (id) => ids.includes(id as (typeof ids)[number])
    )
  ) {
    throw new Error("build381_three_master_receipts_invalid");
  }
  return receipts;
}

function parseEnvelope(body: Record<string, unknown>): Build381RenewalEnvelope {
  const controllerRevision = revision(body.controllerRevision, "controller_revision");
  const sourceRevision = revision(body.sourceRevision, "source_revision");
  const aiHubMain = revision(body.aiHubMain, "ai_hub_main");
  const commsMain = revision(body.commsMain, "comms_main");
  const build380CeremonyEventId = uuid(
    body.build380CeremonyEventId,
    "build380_ceremony_event_id"
  );
  const build380TransitionEventId = uuid(
    body.build380TransitionEventId,
    "build380_transition_event_id"
  );
  const build380ClosureEventId = uuid(
    body.build380ClosureEventId,
    "build380_closure_event_id"
  );
  const registryEvidenceId = uuid(body.registryEvidenceId, "registry_evidence_id");
  const receiverHealthSequence = Number(body.receiverHealthSequence);
  if (
    !Number.isSafeInteger(receiverHealthSequence) ||
    receiverHealthSequence < 1
  ) {
    throw new Error("build381_receiver_health_sequence_invalid");
  }

  const observedAt = isoTime(body.observedAt, "observed_at");
  const receiverObservedAt = isoTime(
    body.receiverObservedAt,
    "receiver_observed_at"
  );
  const now = Date.now();
  if (
    Date.parse(observedAt) > now + 2 * 60_000 ||
    now - Date.parse(observedAt) > 2 * 60_000 ||
    Date.parse(receiverObservedAt) > Date.parse(observedAt) + 2 * 60_000 ||
    now - Date.parse(receiverObservedAt) > 2 * 60_000
  ) {
    throw new Error("build381_runtime_renewal_stale");
  }

  const binding: Build381RenewalBinding = {
    controllerRevision,
    sourceRevision,
    aiHubMain,
    commsMain,
    build380CeremonyEventId,
    build380TransitionEventId,
    build380ClosureEventId,
    registryEvidenceId,
    receiverHealthSequence,
    observedAt
  };

  const envelope: Build381RenewalEnvelope = {
    authorityKeyId: exactString(body.authorityKeyId, "authority_key_id", 160),
    controllerRevision,
    sourceRevision,
    aiHubMain,
    commsMain,
    originalHostId: exactString(body.originalHostId, "original_host_id", 128),
    build380CeremonyEventId,
    build380TransitionEventId,
    build380ClosureEventId,
    registryEvidenceId,
    receiverInstanceId: exactString(
      body.receiverInstanceId,
      "receiver_instance_id",
      160
    ),
    receiverBootId: exactString(body.receiverBootId, "receiver_boot_id", 160),
    receiverHealthSequence,
    receiverState:
      body.receiverState === "ON"
        ? "ON"
        : (() => {
            throw new Error("build381_receiver_state_invalid");
          })(),
    receiverObservedAt,
    receiverHealthURI: evidenceURI(body.receiverHealthURI, "receiver_health_uri"),
    receiverHealthDigest: digest(
      body.receiverHealthDigest,
      "receiver_health_digest"
    ),
    masterReceipts: verifyMasterReceipts(body, binding),
    renewalDigest: digest(body.renewalDigest, "renewal_digest"),
    evidenceURI: evidenceURI(body.evidenceURI, "evidence_uri"),
    nonce: exactString(body.nonce, "nonce", 160),
    observedAt
  };

  if (!/^[A-Za-z0-9_-]{16,160}$/.test(envelope.nonce)) {
    throw new Error("build381_nonce_invalid");
  }
  if (
    envelope.controllerRevision !== BUILD_381_CONTROLLER_BASE_REVISION ||
    envelope.sourceRevision !== BUILD_381_RUNTIME.yw.main ||
    envelope.aiHubMain !== BUILD_381_RUNTIME.aiHub.main ||
    envelope.commsMain !== BUILD_381_RUNTIME.comms.main ||
    envelope.originalHostId !== BUILD_381_RUNTIME.aiHub.originalHost
  ) {
    throw new Error("build381_exact_runtime_revision_binding_required");
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
    message.includes("_missing") ||
    message.includes("_replay") ||
    message.includes("_not_connected")
  ) return 400;
  return 500;
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return Response.json({ error: "build381_body_invalid" }, { status: 400 });
    }
    const body = JSON.parse(raw) as Record<string, unknown>;
    const outerSignature = signature(body.signatureBase64, "signature");
    const pem = process.env.BUILD381_CONTINUITY_AUTHORITY_PUBLIC_KEY_PEM?.trim();
    if (!pem) throw new Error("build381_continuity_authority_not_configured");
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("build381_continuity_authority_key_invalid");
    }
    const authorityKeyId = trustedSignerFingerprint(pem);
    const envelope = parseEnvelope(body);
    if (envelope.authorityKeyId !== authorityKeyId) {
      throw new Error("build381_authority_key_mismatch");
    }
    const canonical = canonicalBuild381RenewalEnvelope(envelope);
    if (!verify(null, Buffer.from(canonical, "utf8"), key, outerSignature)) {
      throw new Error("build381_renewal_signature_invalid");
    }
    const result = await admitBuild381RuntimeRenewal({
      envelope,
      authorityKeySpkiSha256: authorityKeyId,
      envelopeSha256: build381Digest(canonical),
      signatureSha256: build381Digest(outerSignature)
    });
    return Response.json(
      { renewed: true, result },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "build381_json_invalid"
        : error instanceof Error
          ? error.message
          : "build381_runtime_renewal_failed";
    return Response.json(
      { error: message },
      { status: statusFor(message), headers: { "Cache-Control": "no-store" } }
    );
  }
}

export function GET() {
  return Response.json(
    { error: "build381_protected_renewal_post_only" },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } }
  );
}
