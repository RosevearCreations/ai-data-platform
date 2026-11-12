import { createPublicKey, verify } from "node:crypto";

import { trustedSignerFingerprint } from "@/lib/source-trust-ledger";
import { admitBuild380ExternalRuntimeActivation } from "@/lib/yw562-external-runtime-activation-closure-database";
import {
  BUILD_380_CONTROLLER_BASE_REVISION,
  BUILD_380_RUNTIME,
  build380Digest,
  canonicalBuild380ExternalActivationEnvelope,
  canonicalBuild380MasterRuntimeReceipt,
  type Build380ExternalActivationEnvelope,
  type Build380MasterReceiptBinding,
  type Build380MasterRuntimeReceipt
} from "@/lib/yw562-external-runtime-activation-closure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA64 = /^[a-f0-9]{64}$/;
const SHA40 = /^[a-f0-9]{40}$/;
const MAX_BODY_BYTES = 40_960;

const MASTER_KEY_ENV = {
  "rosevear-ai-hub": "BUILD380_AI_HUB_RUNTIME_PUBLIC_KEY_PEM",
  "rosevear-comms-hub": "BUILD380_COMMS_RUNTIME_PUBLIC_KEY_PEM",
  "ai-data-platform": "BUILD380_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM"
} as const;

function exactString(value: unknown, name: string, max = 512) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max || /[\u0000-\u001f]/.test(result)) {
    throw new Error("build380_" + name + "_invalid");
  }
  return result;
}

function uuid(value: unknown, name: string) {
  const result = exactString(value, name, 64);
  if (!UUID.test(result)) throw new Error("build380_" + name + "_invalid");
  return result;
}

function digest(value: unknown, name: string) {
  const result = String(value ?? "").toLowerCase();
  if (!SHA64.test(result)) throw new Error("build380_" + name + "_invalid");
  return result;
}

function revision(value: unknown, name: string) {
  const result = String(value ?? "").toLowerCase();
  if (!SHA40.test(result)) throw new Error("build380_" + name + "_invalid");
  return result;
}

function evidenceURI(value: unknown, name: string) {
  const result = exactString(value, name, 512);
  if (
    !(result.startsWith("https://") ||
      result.startsWith("urn:rosevear:evidence:")) ||
    /\s/.test(result)
  ) {
    throw new Error("build380_" + name + "_invalid");
  }
  return result;
}

function isoTime(value: unknown, name: string) {
  const text = exactString(value, name, 64);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) throw new Error("build380_" + name + "_invalid");
  return new Date(parsed).toISOString();
}

function parseSignature(value: unknown, name: string) {
  const base64 = exactString(value, name, 512);
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new Error("build380_" + name + "_invalid");
  }
  const signature = Buffer.from(base64, "base64");
  if (signature.length !== 64) {
    throw new Error("build380_" + name + "_invalid");
  }
  return signature;
}

function parseAndVerifyMasterReceipts(
  body: Record<string, unknown>,
  binding: Build380MasterReceiptBinding
): Build380MasterRuntimeReceipt[] {
  const rawReceipts = Array.isArray(body.masterReceipts)
    ? body.masterReceipts
    : [];

  const receipts = rawReceipts.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("build380_master_receipts_invalid");
    }

    const item = raw as Record<string, unknown>;
    const masterId = exactString(item.masterId, "master_id", 64);
    if (
      masterId !== "rosevear-ai-hub" &&
      masterId !== "rosevear-comms-hub" &&
      masterId !== "ai-data-platform"
    ) {
      throw new Error("build380_master_id_invalid");
    }
    if (item.runtimeState !== "CONNECTED_SYNCED") {
      throw new Error("build380_master_runtime_state_invalid");
    }

    const typedMasterId =
      masterId as Build380MasterRuntimeReceipt["masterId"];
    const signerKeyId = exactString(item.signerKeyId, "master_signer_key_id", 160);
    const unsignedReceipt = {
      masterId: typedMasterId,
      receiptId: exactString(item.receiptId, "master_receipt_id", 160),
      digest: digest(item.digest, "master_receipt_digest"),
      runtimeState: "CONNECTED_SYNCED" as const,
      signerKeyId
    };

    const envName = MASTER_KEY_ENV[typedMasterId];
    const pem = process.env[envName]?.trim();
    if (!pem) {
      throw new Error("build380_master_runtime_authority_not_configured");
    }
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("build380_master_runtime_authority_key_invalid");
    }
    const fingerprint = trustedSignerFingerprint(pem);
    if (fingerprint !== signerKeyId) {
      throw new Error("build380_master_signer_key_id_mismatch");
    }

    const signature = parseSignature(
      item.signatureBase64,
      "master_receipt_signature"
    );
    const canonical = canonicalBuild380MasterRuntimeReceipt(
      unsignedReceipt,
      binding
    );
    if (!verify(null, Buffer.from(canonical, "utf8"), key, signature)) {
      throw new Error("build380_master_runtime_signature_invalid");
    }

    return {
      ...unsignedReceipt,
      signatureSha256: build380Digest(signature)
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
    throw new Error("build380_three_master_receipts_invalid");
  }

  return receipts;
}

function parseEnvelope(
  body: Record<string, unknown>
): Build380ExternalActivationEnvelope {
  const controllerRevision = revision(
    body.controllerRevision,
    "controller_revision"
  );
  const sourceRevision = revision(body.sourceRevision, "source_revision");
  const aiHubMain = revision(body.aiHubMain, "ai_hub_main");
  const commsMain = revision(body.commsMain, "comms_main");
  const build379DecisionEventId = uuid(
    body.build379DecisionEventId,
    "build379_decision_event_id"
  );
  const exactReceiptId = uuid(body.exactReceiptId, "exact_receipt_id");
  const observedAt = isoTime(body.observedAt, "observed_at");

  const receiverStartedAt = isoTime(
    body.receiverStartedAt,
    "receiver_started_at"
  );
  const receiverProbeObservedAt = isoTime(
    body.receiverProbeObservedAt,
    "receiver_probe_observed_at"
  );
  const now = Date.now();
  const observed = Date.parse(observedAt);
  const started = Date.parse(receiverStartedAt);
  const probed = Date.parse(receiverProbeObservedAt);
  if (
    observed > now + 2 * 60_000 ||
    now - observed > 5 * 60_000 ||
    started > probed ||
    probed > observed + 2 * 60_000 ||
    now - probed > 5 * 60_000
  ) {
    throw new Error("build380_runtime_evidence_stale");
  }

  const nonce = exactString(body.nonce, "nonce", 160);
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(nonce)) {
    throw new Error("build380_nonce_invalid");
  }

  const binding: Build380MasterReceiptBinding = {
    controllerRevision,
    sourceRevision,
    aiHubMain,
    commsMain,
    exactReceiptId,
    build379DecisionEventId,
    observedAt
  };

  const masterReceipts = parseAndVerifyMasterReceipts(body, binding);

  const envelope: Build380ExternalActivationEnvelope = {
    authorityKeyId: exactString(body.authorityKeyId, "authority_key_id", 160),
    controllerRevision,
    sourceRevision,
    aiHubMain,
    commsMain,
    originalHostId: exactString(body.originalHostId, "original_host_id", 128),
    build379ProtectedAdmissionEventId: uuid(
      body.build379ProtectedAdmissionEventId,
      "build379_protected_admission_event_id"
    ),
    build379DecisionEventId,
    build379ExecutionEventId: uuid(
      body.build379ExecutionEventId,
      "build379_execution_event_id"
    ),
    exactReceiptId,
    exactReceiptSha256: digest(
      body.exactReceiptSha256,
      "exact_receipt_sha256"
    ),
    ownerDecisionId: uuid(body.ownerDecisionId, "owner_decision_id"),
    priorRegistryEvidenceId: uuid(
      body.priorRegistryEvidenceId,
      "prior_registry_evidence_id"
    ),
    receiverInstanceId: exactString(
      body.receiverInstanceId,
      "receiver_instance_id",
      160
    ),
    receiverBootId: exactString(body.receiverBootId, "receiver_boot_id", 160),
    receiverStartedAt,
    receiverProbeObservedAt,
    receiverProofURI: evidenceURI(
      body.receiverProofURI,
      "receiver_proof_uri"
    ),
    receiverProofDigest: digest(
      body.receiverProofDigest,
      "receiver_proof_digest"
    ),
    sourceHandshakeReceiptId: exactString(
      body.sourceHandshakeReceiptId,
      "source_handshake_receipt_id",
      160
    ),
    sourceHandshakeDigest: digest(
      body.sourceHandshakeDigest,
      "source_handshake_digest"
    ),
    aiHubConnection:
      body.aiHubConnection === "CONNECTED"
        ? "CONNECTED"
        : (() => {
            throw new Error("build380_ai_hub_connection_invalid");
          })(),
    aiHubMasterSync:
      body.aiHubMasterSync === "SYNCED"
        ? "SYNCED"
        : (() => {
            throw new Error("build380_ai_hub_sync_invalid");
          })(),
    commsReceiver:
      body.commsReceiver === "ON"
        ? "ON"
        : (() => {
            throw new Error("build380_comms_receiver_invalid");
          })(),
    commsConnection:
      body.commsConnection === "CONNECTED"
        ? "CONNECTED"
        : (() => {
            throw new Error("build380_comms_connection_invalid");
          })(),
    commsOwnerAcceptance:
      body.commsOwnerAcceptance === "ACCEPTED"
        ? "ACCEPTED"
        : (() => {
            throw new Error("build380_comms_owner_acceptance_invalid");
          })(),
    commsSlaveGate:
      body.commsSlaveGate === "OPEN"
        ? "OPEN"
        : (() => {
            throw new Error("build380_comms_slave_gate_invalid");
          })(),
    controllerGate:
      body.controllerGate === "OPEN"
        ? "OPEN"
        : (() => {
            throw new Error("build380_controller_gate_invalid");
          })(),
    masterReceipts,
    terminalSyncDigest: digest(
      body.terminalSyncDigest,
      "terminal_sync_digest"
    ),
    evidenceURI: evidenceURI(body.evidenceURI, "evidence_uri"),
    nonce,
    observedAt
  };

  if (
    envelope.controllerRevision !== BUILD_380_CONTROLLER_BASE_REVISION ||
    envelope.sourceRevision !== BUILD_380_RUNTIME.yw.main ||
    envelope.aiHubMain !== BUILD_380_RUNTIME.aiHub.main ||
    envelope.commsMain !== BUILD_380_RUNTIME.comms.main ||
    envelope.originalHostId !== BUILD_380_RUNTIME.aiHub.originalHost
  ) {
    throw new Error("build380_exact_runtime_revision_binding_required");
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
    message.includes("_not_current") ||
    message.includes("_not_ready") ||
    message.includes("_not_activated") ||
    message.includes("_not_available") ||
    message.includes("_not_verified")
  ) return 400;
  return 500;
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return Response.json(
        { error: "build380_body_invalid" },
        { status: 400 }
      );
    }

    const body = JSON.parse(raw) as Record<string, unknown>;
    const activationSignature = parseSignature(
      body.signatureBase64,
      "signature"
    );

    const pem =
      process.env.BUILD380_EXTERNAL_ACTIVATION_PUBLIC_KEY_PEM?.trim();
    if (!pem) {
      throw new Error("build380_activation_authority_not_configured");
    }

    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") {
      throw new Error("build380_activation_authority_key_invalid");
    }

    const authorityFingerprint = trustedSignerFingerprint(pem);
    const envelope = parseEnvelope(body);
    if (envelope.authorityKeyId !== authorityFingerprint) {
      throw new Error("build380_authority_key_id_mismatch");
    }

    const canonical = canonicalBuild380ExternalActivationEnvelope(envelope);
    if (
      !verify(
        null,
        Buffer.from(canonical, "utf8"),
        key,
        activationSignature
      )
    ) {
      throw new Error("build380_external_activation_signature_invalid");
    }

    const result = await admitBuild380ExternalRuntimeActivation({
      envelope,
      authorityKeySpkiSha256: authorityFingerprint,
      envelopeSha256: build380Digest(canonical),
      signatureSha256: build380Digest(activationSignature)
    });

    return Response.json(
      { activated: true, result },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "build380_json_invalid"
        : error instanceof Error
          ? error.message
          : "build380_external_activation_failed";

    return Response.json(
      { error: message },
      {
        status: statusFor(message),
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}

export function GET() {
  return Response.json(
    { error: "build380_protected_activation_post_only" },
    {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" }
    }
  );
}
