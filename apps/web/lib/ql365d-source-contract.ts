import { sign } from "node:crypto";

import {
  canonicalRosevearCommsValue,
  hashRosevearCommsValue,
  inspectQl365dSourceSigner
} from "./ql365d-comms-source-runtime";

export const QL365D_SOURCE_CONTRACT_SCHEMA =
  "rosevear.hub.ql363.six-source-health-contract.v1" as const;
export const QL365D_SOURCE_RECEIPT_SCHEMA =
  "rosevear.hub.ql363.source-signed-health-receipt.v1" as const;
export const QL365D_SOURCE_HEALTH_SCHEMA =
  "rosevear.hub.ql362.source-health-receipt.v1" as const;
export const QL365D_SOURCE_HEALTH_PATH =
  "/api/integration/v1/shell/health" as const;

const COMMIT = /^[0-9a-f]{40}$/;

type SignerEnvironment = Parameters<typeof inspectQl365dSourceSigner>[0];

type DiscoveryManifest = {
  schema: "rosevear.integration.discovery.v1";
  manifest_version: string;
  source_id: "ai-data-platform";
  source_app_id: "ai-data-platform";
  source_role: "support_broker";
  repository: "RosevearCreations/ai-data-platform";
  source_revision: string;
  issuer: "ai-data-platform";
  audience: "rosevear-master";
  tenant_boundary: "no_customer_tenant";
  legacy_integration_v1: {
    app_id: "ai-data-platform";
    method: "GET";
    allowed_paths: string[];
    authorization: "source_owned_required";
  };
  transport: {
    origin: null;
    manifest_path: "/.well-known/rosevear-integration-manifest.json";
    redirects: "DENY";
  };
  requested_scope: "public_nonsecret_discovery_only";
  failure_behavior: "HOLD_AND_QUARANTINE";
  signature: {
    algorithm: "Ed25519";
    key_id: string | null;
    value: string | null;
    state: "AWAITING_INDEPENDENT_SOURCE_SIGNER" | "SIGNED";
  };
  connection_state: "DISCONNECTED / HOLD";
};

function validManifestIdentity(manifest: DiscoveryManifest) {
  return (
    manifest.schema === "rosevear.integration.discovery.v1" &&
    /^1\.\d+\.\d+$/.test(manifest.manifest_version) &&
    manifest.source_id === "ai-data-platform" &&
    manifest.source_app_id === "ai-data-platform" &&
    manifest.source_role === "support_broker" &&
    manifest.repository === "RosevearCreations/ai-data-platform" &&
    COMMIT.test(manifest.source_revision) &&
    manifest.issuer === "ai-data-platform" &&
    manifest.audience === "rosevear-master" &&
    manifest.tenant_boundary === "no_customer_tenant" &&
    manifest.legacy_integration_v1.app_id === "ai-data-platform" &&
    manifest.legacy_integration_v1.method === "GET" &&
    JSON.stringify(manifest.legacy_integration_v1.allowed_paths) ===
      JSON.stringify([
        "/api/integration/v1/health",
        "/api/integration/v1/capabilities"
      ]) &&
    manifest.legacy_integration_v1.authorization ===
      "source_owned_required" &&
    manifest.transport.origin === null &&
    manifest.transport.manifest_path ===
      "/.well-known/rosevear-integration-manifest.json" &&
    manifest.transport.redirects === "DENY" &&
    manifest.requested_scope === "public_nonsecret_discovery_only" &&
    manifest.failure_behavior === "HOLD_AND_QUARANTINE" &&
    manifest.connection_state === "DISCONNECTED / HOLD" &&
    manifest.signature.algorithm === "Ed25519"
  );
}

export function signQl365dDiscoveryManifest(
  manifest: DiscoveryManifest,
  env: SignerEnvironment = process.env
): DiscoveryManifest {
  if (
    !validManifestIdentity(manifest) ||
    manifest.signature.state !== "AWAITING_INDEPENDENT_SOURCE_SIGNER" ||
    manifest.signature.key_id !== null ||
    manifest.signature.value !== null
  ) {
    throw new Error("HOLD_QL365D_UNSIGNED_DISCOVERY_MANIFEST_REQUIRED");
  }

  const signer = inspectQl365dSourceSigner(env);
  if (!signer.ready) {
    throw new Error(signer.state);
  }

  const payload = structuredClone(manifest) as unknown as Record<
    string,
    unknown
  >;
  delete payload.signature;
  const signature = sign(
    null,
    Buffer.from(canonicalRosevearCommsValue(payload)),
    signer.privateKey
  ).toString("base64url");

  return {
    ...structuredClone(manifest),
    signature: {
      algorithm: "Ed25519",
      key_id: signer.keyId,
      value: signature,
      state: "SIGNED"
    }
  };
}

export function buildAndSignQl365dSourceHealthContract(
  input: {
    sourceCommitSha: string;
    manifest: DiscoveryManifest;
    sourceOrigin: string;
    issuedAt?: string;
    expiresAt?: string;
  },
  env: SignerEnvironment = process.env
) {
  if (
    !COMMIT.test(input.sourceCommitSha) ||
    !validManifestIdentity(input.manifest) ||
    input.manifest.signature.state !== "SIGNED" ||
    typeof input.manifest.signature.key_id !== "string" ||
    typeof input.manifest.signature.value !== "string"
  ) {
    throw new Error("HOLD_QL365D_SIGNED_MANIFEST_AND_IMMUTABLE_COMMIT_REQUIRED");
  }

  let origin: URL;
  try {
    origin = new URL(input.sourceOrigin);
  } catch {
    throw new Error("HOLD_QL365D_PINNED_HTTPS_ORIGIN_REQUIRED");
  }
  if (
    origin.protocol !== "https:" ||
    origin.origin !== input.sourceOrigin ||
    origin.pathname !== "/" ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("HOLD_QL365D_PINNED_HTTPS_ORIGIN_REQUIRED");
  }

  const signer = inspectQl365dSourceSigner(env);
  if (!signer.ready) throw new Error(signer.state);
  if (input.manifest.signature.key_id !== signer.keyId) {
    throw new Error("HOLD_QL365D_MANIFEST_SIGNER_CHANGED");
  }

  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const start = Date.parse(issuedAt);
  const expiresAt =
    input.expiresAt ??
    new Date(start + 24 * 60 * 60 * 1000).toISOString();
  const end = Date.parse(expiresAt);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    issuedAt !== new Date(start).toISOString() ||
    expiresAt !== new Date(end).toISOString() ||
    end <= start ||
    end - start > 24 * 60 * 60 * 1000
  ) {
    throw new Error("HOLD_QL365D_CONTRACT_WINDOW_INVALID");
  }

  const payload = {
    schema: QL365D_SOURCE_CONTRACT_SCHEMA,
    sourceId: "ai-data-platform",
    sourceAppId: "ai-data-platform",
    repository: "RosevearCreations/ai-data-platform",
    tenantBoundary: "no_customer_tenant",
    sourceCommitSha: input.sourceCommitSha,
    manifestSha256: hashRosevearCommsValue(input.manifest),
    sourceOrigin: input.sourceOrigin,
    environment: "TEST",
    method: "GET",
    path: QL365D_SOURCE_HEALTH_PATH,
    responseSchema: QL365D_SOURCE_HEALTH_SCHEMA,
    receiptSchema: QL365D_SOURCE_RECEIPT_SCHEMA,
    scope: "HEALTH_METADATA_ONLY_NO_CUSTOMERS_OR_DEVICES",
    redirects: "DENY",
    maxResponseBytes: 4096,
    persistentConnectionAllowed: false,
    issuedAt,
    expiresAt
  };

  return {
    schema: QL365D_SOURCE_CONTRACT_SCHEMA,
    payload,
    signature: sign(
      null,
      Buffer.from(canonicalRosevearCommsValue(payload)),
      signer.privateKey
    ).toString("base64url"),
    keyId: signer.keyId,
    sourceSignerSpkiSha256: signer.spkiSha256,
    contractSha256: hashRosevearCommsValue(payload),
    connected: false,
    connectionState: "DISCONNECTED / HOLD"
  } as const;
}
