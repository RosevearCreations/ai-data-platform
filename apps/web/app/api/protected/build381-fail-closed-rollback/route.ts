import { createPublicKey, verify } from "node:crypto";

import { trustedSignerFingerprint } from "@/lib/source-trust-ledger";
import { admitBuild381FailClosedRollback } from "@/lib/yw562-receiver-health-continuity-database";
import {
  BUILD_381_CONTROLLER_BASE_REVISION,
  BUILD_381_RUNTIME,
  build381Digest,
  canonicalBuild381ReceiverOffProof,
  canonicalBuild381RollbackEnvelope,
  type Build381RollbackEnvelope
} from "@/lib/yw562-receiver-health-continuity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA64 = /^[a-f0-9]{64}$/;
const SHA40 = /^[a-f0-9]{40}$/;
const MAX_BODY_BYTES = 24_000;

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

function parseRollbackBase(body: Record<string, unknown>) {
  const controllerRevision = revision(body.controllerRevision, "controller_revision");
  const sourceRevision = revision(body.sourceRevision, "source_revision");
  const aiHubMain = revision(body.aiHubMain, "ai_hub_main");
  const commsMain = revision(body.commsMain, "comms_main");
  const observedAt = isoTime(body.observedAt, "observed_at");
  const receiverOffObservedAt = isoTime(
    body.receiverOffObservedAt,
    "receiver_off_observed_at"
  );
  const now = Date.now();
  if (
    Date.parse(observedAt) > now + 2 * 60_000 ||
    now - Date.parse(observedAt) > 2 * 60_000 ||
    now - Date.parse(receiverOffObservedAt) > 2 * 60_000
  ) {
    throw new Error("build381_rollback_evidence_stale");
  }
  const reason = exactString(body.reason, "rollback_reason", 64);
  if (
    reason !== "HEALTH_RENEWAL_EXPIRED" &&
    reason !== "MASTER_REVALIDATION_FAILED" &&
    reason !== "RECEIVER_HEALTH_FAILED" &&
    reason !== "EXPLICIT_PROTECTED_SHUTDOWN"
  ) {
    throw new Error("build381_rollback_reason_invalid");
  }
  return {
    controllerRevision,
    sourceRevision,
    aiHubMain,
    commsMain,
    originalHostId: exactString(body.originalHostId, "original_host_id", 128),
    renewalEventId:
      body.renewalEventId === null || body.renewalEventId === undefined
        ? null
        : uuid(body.renewalEventId, "renewal_event_id"),
    registryEvidenceId: uuid(body.registryEvidenceId, "registry_evidence_id"),
    receiverInstanceId: exactString(
      body.receiverInstanceId,
      "receiver_instance_id",
      160
    ),
    receiverBootId: exactString(body.receiverBootId, "receiver_boot_id", 160),
    receiverState:
      body.receiverState === "OFF"
        ? ("OFF" as const)
        : (() => {
            throw new Error("build381_receiver_off_state_invalid");
          })(),
    reason: reason as Build381RollbackEnvelope["reason"],
    receiverOffObservedAt,
    receiverOffProofURI: evidenceURI(
      body.receiverOffProofURI,
      "receiver_off_proof_uri"
    ),
    receiverOffDigest: digest(body.receiverOffDigest, "receiver_off_digest"),
    receiverOffSignerKeyId: exactString(
      body.receiverOffSignerKeyId,
      "receiver_off_signer_key_id",
      160
    ),
    observedAt
  };
}

function statusFor(message: string) {
  if (message.includes("not_configured")) return 503;
  if (
    message.includes("_invalid") ||
    message.includes("_mismatch") ||
    message.includes("_stale") ||
    message.includes("_required")
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
    const base = parseRollbackBase(body);

    if (
      base.controllerRevision !== BUILD_381_CONTROLLER_BASE_REVISION ||
      base.sourceRevision !== BUILD_381_RUNTIME.yw.main ||
      base.aiHubMain !== BUILD_381_RUNTIME.aiHub.main ||
      base.commsMain !== BUILD_381_RUNTIME.comms.main ||
      base.originalHostId !== BUILD_381_RUNTIME.aiHub.originalHost
    ) {
      throw new Error("build381_exact_runtime_revision_binding_required");
    }

    const receiverPem =
      process.env.BUILD381_RECEIVER_OFF_PUBLIC_KEY_PEM?.trim();
    if (!receiverPem) {
      throw new Error("build381_receiver_off_authority_not_configured");
    }
    const receiverKey = createPublicKey(receiverPem);
    if (receiverKey.asymmetricKeyType !== "ed25519") {
      throw new Error("build381_receiver_off_authority_key_invalid");
    }
    const receiverKeyId = trustedSignerFingerprint(receiverPem);
    if (base.receiverOffSignerKeyId !== receiverKeyId) {
      throw new Error("build381_receiver_off_signer_key_mismatch");
    }
    const receiverSignature = signature(
      body.receiverOffSignatureBase64,
      "receiver_off_signature"
    );
    const receiverCanonical = canonicalBuild381ReceiverOffProof(base);
    if (
      !verify(
        null,
        Buffer.from(receiverCanonical, "utf8"),
        receiverKey,
        receiverSignature
      )
    ) {
      throw new Error("build381_receiver_off_signature_invalid");
    }

    const authorityPem =
      process.env.BUILD381_ROLLBACK_AUTHORITY_PUBLIC_KEY_PEM?.trim();
    if (!authorityPem) {
      throw new Error("build381_rollback_authority_not_configured");
    }
    const authorityKey = createPublicKey(authorityPem);
    if (authorityKey.asymmetricKeyType !== "ed25519") {
      throw new Error("build381_rollback_authority_key_invalid");
    }
    const authorityKeyId = trustedSignerFingerprint(authorityPem);
    const envelope: Build381RollbackEnvelope = {
      authorityKeyId,
      ...base,
      receiverOffSignatureSha256: build381Digest(receiverSignature),
      evidenceURI: evidenceURI(body.evidenceURI, "evidence_uri"),
      nonce: exactString(body.nonce, "nonce", 160)
    };
    if (!/^[A-Za-z0-9_-]{16,160}$/.test(envelope.nonce)) {
      throw new Error("build381_nonce_invalid");
    }

    const outerSignature = signature(body.signatureBase64, "signature");
    const canonical = canonicalBuild381RollbackEnvelope(envelope);
    if (
      !verify(
        null,
        Buffer.from(canonical, "utf8"),
        authorityKey,
        outerSignature
      )
    ) {
      throw new Error("build381_rollback_signature_invalid");
    }

    const result = await admitBuild381FailClosedRollback({
      envelope,
      authorityKeySpkiSha256: authorityKeyId,
      envelopeSha256: build381Digest(canonical),
      signatureSha256: build381Digest(outerSignature)
    });
    return Response.json(
      { rolledBack: true, result },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "build381_json_invalid"
        : error instanceof Error
          ? error.message
          : "build381_fail_closed_rollback_failed";
    return Response.json(
      { error: message },
      { status: statusFor(message), headers: { "Cache-Control": "no-store" } }
    );
  }
}

export function GET() {
  return Response.json(
    { error: "build381_protected_rollback_post_only" },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } }
  );
}
