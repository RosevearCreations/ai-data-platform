import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  randomUUID,
  sign as signDetached,
  timingSafeEqual
} from "node:crypto";

import type { PoolClient, QueryResultRow } from "pg";

import { authPool, withIntegrationDatabase } from "./database";

export const INTEGRATION_V1_CONTRACT = "rosevear.integration.v1" as const;
export const INTEGRATION_V1_GATEWAY_ID = "ai-data-platform" as const;
export const INTEGRATION_V1_ENVIRONMENT = "nonproduction" as const;
export const INTEGRATION_V1_STATUS = "HOLD" as const;
export const INTEGRATION_V1_MAX_SKEW_MS = 300_000;
export const INTEGRATION_V1_EMPTY_BODY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export const INTEGRATION_V1_PATHS = Object.freeze({
  health: "/api/integration/v1/health",
  capabilities: "/api/integration/v1/capabilities",
  auditPrefix: "/api/integration/v1/audit/receipts/"
});

export const INTEGRATION_V1_BUSINESS_CAPABILITIES = Object.freeze({
  devilndove: Object.freeze(["read_product_reference", "read_listing_reference"]),
  rosiedazzlers: Object.freeze(["read_quote_reference", "read_booking_reference"]),
  yw: Object.freeze(["read_job_reference", "read_property_reference"]),
  icamp: Object.freeze(["read_reservation_reference", "read_site_reference"]),
  "rosevear-ai-hub": Object.freeze(["read_service_health"])
});

const RECEIPT_KEYS = Object.freeze([
  "schema_version", "gateway_id", "business_id", "tenant_id", "environment",
  "kind", "method", "path", "connection_status", "capabilities",
  "receipt_id", "nonce", "issued_at", "key_id"
] as const);

const GATEWAY_AUDIT_KEYS = Object.freeze([
  "schema_version", "issuer", "business_id", "tenant_id", "environment", "kind",
  "method", "connection_status", "health_receipt_id", "capabilities_receipt_id",
  "gateway_audit_id", "source_revision", "gateway_key_id", "nonce", "issued_at",
  "negative_test_results"
] as const);

const NEGATIVE_CODES = Object.freeze([
  "wrong_business_denied",
  "wrong_tenant_denied",
  "revoked_key_denied",
  "write_denied",
  "replay_denied"
] as const);

type NegativeCode = (typeof NEGATIVE_CODES)[number];

export interface IntegrationV1Connection extends QueryResultRow {
  connectionId: string;
  sourceSystem: string;
  destinationSystem: string;
  businessId: string;
  tenantId: string | null;
  tenantKey: string;
  environment: "nonproduction";
  keyId: string;
  secretEnvVar: string;
  keyState: "active" | "revoked";
  connectionState: "HOLD";
  capabilities: string[];
  healthReceiptId: string;
  capabilitiesReceiptId: string;
  gatewayAuditId: string;
}

export interface IntegrationV1AuthenticatedGet {
  connection: IntegrationV1Connection;
  nonce: string;
  requestTimestamp: number;
  path: string;
}

export type IntegrationV1AuthResult =
  | { ok: true; value: IntegrationV1AuthenticatedGet }
  | { ok: false; status: number; error: string };

function header(request: Request, name: string) {
  return (request.headers.get(name) ?? "").trim();
}

function safeToken(value: string, max = 128) {
  return value.length > 0 && value.length <= max && /^[a-z0-9][a-z0-9._-]*$/.test(value);
}

function safeReceiptId(value: string) {
  return /^np-[a-z0-9-]{6,70}$/.test(value);
}

function safeKeyId(value: string) {
  return /^np-[a-z0-9-]{4,50}$/.test(value);
}

function safeNonce(value: string) {
  return /^np-[a-f0-9]{32}$/.test(value);
}

function sourceRevision() {
  const revision = (
    process.env.ROSEVEAR_INTEGRATION_V1_SOURCE_REVISION ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    ""
  ).trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error("integration_v1_source_revision_unavailable");
  }
  return revision;
}

function privateSigningKey() {
  const pem = process.env.ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM ?? "";
  if (!pem.includes("BEGIN PRIVATE KEY")) {
    throw new Error("integration_v1_signing_key_unconfigured");
  }
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("integration_v1_signing_key_invalid");
  }
  return key;
}

export function integrationV1GatewayPublicKeyFingerprintSha256() {
  const publicKey = createPublicKey(privateSigningKey());
  return createHash("sha256")
    .update(publicKey.export({ format: "der", type: "spki" }))
    .digest("hex");
}

export function isIntegrationV1NonproductionEnabled() {
  return process.env.ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED === "true" &&
    process.env.VERCEL_ENV !== "production";
}

export function integrationV1CanonicalGet(input: {
  path: string;
  timestamp: number;
  nonce: string;
  sourceSystem: string;
  destinationSystem: string;
  businessId: string;
  tenantId: string | null;
  environment: string;
  keyId: string;
}) {
  return Buffer.from([
    INTEGRATION_V1_CONTRACT,
    "GET",
    input.path,
    String(input.timestamp),
    input.nonce,
    input.sourceSystem,
    input.destinationSystem,
    input.businessId,
    input.tenantId ?? "-",
    input.environment,
    INTEGRATION_V1_EMPTY_BODY_SHA256,
    input.keyId
  ].join("\n"), "utf8");
}

function exactObject(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value as Record<string, unknown>);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

export function integrationV1CanonicalReceipt(payload: Record<string, unknown>) {
  if (!exactObject(payload, RECEIPT_KEYS)) {
    throw new TypeError("integration_v1_receipt_schema_invalid");
  }
  return Buffer.from(
    RECEIPT_KEYS.map((key) => JSON.stringify([key, payload[key]])).join("\n"),
    "utf8"
  );
}

export function integrationV1CanonicalGatewayAudit(payload: Record<string, unknown>) {
  if (!exactObject(payload, GATEWAY_AUDIT_KEYS)) {
    throw new TypeError("integration_v1_gateway_audit_schema_invalid");
  }
  return Buffer.from(
    GATEWAY_AUDIT_KEYS.map((key) => JSON.stringify([key, payload[key]])).join("\n"),
    "utf8"
  );
}

function signEnvelope(payload: Record<string, unknown>, canonical: Buffer) {
  return {
    payload,
    signature: signDetached(null, canonical, privateSigningKey()).toString("base64url")
  };
}

function decodeSecret(environmentVariable: string) {
  const raw = process.env[environmentVariable] ?? "";
  const key = Buffer.from(raw, "base64");
  if (!raw || key.byteLength !== 32 || key.toString("base64") !== raw) {
    key.fill(0);
    return null;
  }
  return key;
}

function parseCapabilities(value: unknown) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return null;
  return value as string[];
}

function capabilityPolicyValid(connection: IntegrationV1Connection) {
  const allowed = INTEGRATION_V1_BUSINESS_CAPABILITIES[
    connection.businessId as keyof typeof INTEGRATION_V1_BUSINESS_CAPABILITIES
  ];
  return Boolean(
    allowed &&
    connection.capabilities.length > 0 &&
    new Set(connection.capabilities).size === connection.capabilities.length &&
    connection.capabilities.every((capability) =>
      new Set<string>(allowed as readonly string[]).has(capability)
    )
  );
}

async function appendRequestAudit(
  client: PoolClient,
  input: {
    connectionId?: string | null;
    sourceSystem?: string | null;
    destinationSystem?: string | null;
    businessId?: string | null;
    tenantId?: string | null;
    environment?: string | null;
    keyId?: string | null;
    method: string;
    path: string;
    nonce?: string | null;
    outcome: "accepted" | "denied";
    reasonCode: string;
    identityVerified?: boolean;
  }
) {
  await client.query(
    `insert into app.integration_v1_request_audit (
      audit_id, connection_id, source_system, destination_system, business_id,
      tenant_id, environment, key_id, method, path, nonce, outcome, reason_code,
      identity_verified
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      randomUUID(),
      input.connectionId ?? null,
      input.sourceSystem?.slice(0, 96) ?? null,
      input.destinationSystem?.slice(0, 96) ?? null,
      input.businessId?.slice(0, 96) ?? null,
      input.tenantId?.slice(0, 128) ?? null,
      input.environment?.slice(0, 32) ?? null,
      input.keyId?.slice(0, 96) ?? null,
      input.method.slice(0, 16),
      input.path.slice(0, 256),
      input.nonce?.slice(0, 96) ?? null,
      input.outcome,
      input.reasonCode.slice(0, 96),
      input.identityVerified === true
    ]
  );
}

async function candidateConnections(client: PoolClient, input: {
  sourceSystem: string;
  destinationSystem: string;
  environment: string;
  keyId: string;
}) {
  const result = await client.query<IntegrationV1Connection>(
    `select
      connection_id as "connectionId",
      source_system as "sourceSystem",
      destination_system as "destinationSystem",
      business_id as "businessId",
      tenant_id as "tenantId",
      tenant_key as "tenantKey",
      environment,
      key_id as "keyId",
      secret_env_var as "secretEnvVar",
      key_state as "keyState",
      connection_state as "connectionState",
      capabilities,
      health_receipt_id as "healthReceiptId",
      capabilities_receipt_id as "capabilitiesReceiptId",
      gateway_audit_id as "gatewayAuditId"
    from app.integration_v1_connections
    where source_system=$1
      and destination_system=$2
      and environment=$3
      and key_id=$4`,
    [input.sourceSystem, input.destinationSystem, input.environment, input.keyId]
  );
  return result.rows.map((row) => ({
    ...row,
    capabilities: parseCapabilities(row.capabilities) ?? []
  }));
}

function deny(status: number, error: string): IntegrationV1AuthResult {
  return { ok: false, status, error };
}

export async function authenticateIntegrationV1Get(
  request: Request,
  expectedPath: string,
  now = Date.now()
): Promise<IntegrationV1AuthResult> {
  if (!isIntegrationV1NonproductionEnabled()) {
    return deny(404, "integration_v1_nonproduction_disabled");
  }

  let parsed: URL;
  try {
    parsed = new URL(request.url);
  } catch {
    return deny(400, "integration_v1_url_invalid");
  }

  const sourceSystem = header(request, "X-Rosevear-Source");
  const destinationSystem = header(request, "X-Rosevear-Destination");
  const businessId = header(request, "X-Rosevear-Business");
  const tenantHeader = header(request, "X-Rosevear-Tenant");
  const tenantId = tenantHeader === "-" ? null : tenantHeader;
  const environment = header(request, "X-Rosevear-Environment");
  const keyId = header(request, "X-Rosevear-Key-Id");
  const nonce = header(request, "X-Rosevear-Nonce");
  const timestampRaw = header(request, "X-Rosevear-Timestamp");
  const signatureRaw = header(request, "X-Rosevear-Signature");
  const contract = header(request, "X-Rosevear-Contract");
  const accept = header(request, "Accept");
  const timestamp = Number(timestampRaw);

  const context = {
    sourceSystem, destinationSystem, businessId, tenantId, environment, keyId,
    method: request.method, path: parsed.pathname, nonce
  };

  return withIntegrationDatabase(async (client) => {
    const auditDenied = async (
      status: number,
      error: string,
      connectionId?: string | null,
      identityVerified = false
    ) => {
      await appendRequestAudit(client, {
        ...context,
        connectionId,
        outcome: "denied",
        reasonCode: error,
        identityVerified
      });
      return deny(status, error);
    };

    if (
      request.method !== "GET" ||
      parsed.pathname !== expectedPath ||
      parsed.search ||
      parsed.hash
    ) return auditDenied(405, "write_denied");

    if (
      contract !== INTEGRATION_V1_CONTRACT ||
      environment !== INTEGRATION_V1_ENVIRONMENT ||
      destinationSystem !== INTEGRATION_V1_GATEWAY_ID ||
      !accept.toLowerCase().includes("application/json") ||
      !safeToken(sourceSystem, 96) ||
      !safeToken(businessId, 96) ||
      (tenantId !== null && !safeToken(tenantId, 128)) ||
      !safeKeyId(keyId) ||
      !safeNonce(nonce) ||
      !Number.isSafeInteger(timestamp) ||
      Math.abs(now - timestamp) > INTEGRATION_V1_MAX_SKEW_MS ||
      !/^[A-Za-z0-9_-]{43}$/.test(signatureRaw)
    ) return auditDenied(401, "request_identity_or_freshness_denied");

    const candidates = await candidateConnections(client, {
      sourceSystem, destinationSystem, environment, keyId
    });
    if (!candidates.length) return auditDenied(401, "unregistered_key_denied");

    const signingCandidate = candidates[0]!;
    const secret = decodeSecret(signingCandidate.secretEnvVar);
    if (!secret) {
      return auditDenied(503, "server_key_unconfigured", signingCandidate.connectionId);
    }

    const canonical = integrationV1CanonicalGet({
      path: expectedPath,
      timestamp,
      nonce,
      sourceSystem,
      destinationSystem,
      businessId,
      tenantId,
      environment,
      keyId
    });
    const expected = createHmac("sha256", secret).update(canonical).digest();
    secret.fill(0);
    let received: Buffer;
    try {
      received = Buffer.from(signatureRaw, "base64url");
    } catch {
      return auditDenied(401, "signature_denied", signingCandidate.connectionId);
    }
    if (received.byteLength !== expected.byteLength || !timingSafeEqual(received, expected)) {
      return auditDenied(401, "signature_denied", signingCandidate.connectionId);
    }

    const business = candidates.find((row) => row.businessId === businessId);
    if (!business) {
      return auditDenied(403, "wrong_business_denied", signingCandidate.connectionId, true);
    }

    const connection = candidates.find(
      (row) => row.businessId === businessId && row.tenantId === tenantId
    );
    if (!connection) {
      return auditDenied(403, "wrong_tenant_denied", business.connectionId, true);
    }

    if (connection.keyState !== "active") {
      return auditDenied(401, "revoked_key_denied", connection.connectionId, true);
    }
    if (connection.connectionState !== "HOLD" || !capabilityPolicyValid(connection)) {
      return auditDenied(403, "capability_policy_denied", connection.connectionId, true);
    }

    const nonceInsert = await client.query(
      `insert into app.integration_v1_nonces (
        source_system,business_id,tenant_key,environment,key_id,nonce
      ) values ($1,$2,$3,$4,$5,$6)
      on conflict do nothing
      returning nonce`,
      [sourceSystem, businessId, connection.tenantKey, environment, keyId, nonce]
    );
    if (nonceInsert.rowCount !== 1) {
      return auditDenied(409, "replay_denied", connection.connectionId, true);
    }

    await appendRequestAudit(client, {
      ...context,
      connectionId: connection.connectionId,
      outcome: "accepted",
      reasonCode: "accepted_get",
      identityVerified: true
    });

    return {
      ok: true,
      value: { connection, nonce, requestTimestamp: timestamp, path: expectedPath }
    };
  });
}

export async function recordIntegrationV1DeniedMethod(
  request: Request,
  reasonCode = "write_denied"
) {
  if (!isIntegrationV1NonproductionEnabled()) return;
  const parsed = new URL(request.url);
  const sourceSystem = header(request, "X-Rosevear-Source");
  const destinationSystem = header(request, "X-Rosevear-Destination");
  const businessId = header(request, "X-Rosevear-Business");
  const tenantHeader = header(request, "X-Rosevear-Tenant");
  const tenantId = tenantHeader === "-" ? null : tenantHeader || null;
  const environment = header(request, "X-Rosevear-Environment");
  const keyId = header(request, "X-Rosevear-Key-Id");
  const nonce = header(request, "X-Rosevear-Nonce");

  await withIntegrationDatabase(async (client) => {
    const candidates = safeToken(sourceSystem, 96) && safeToken(destinationSystem, 96) &&
      safeKeyId(keyId) && environment === INTEGRATION_V1_ENVIRONMENT
      ? await candidateConnections(client, { sourceSystem, destinationSystem, environment, keyId })
      : [];
    const connection = candidates.find(
      (row) => row.businessId === businessId && row.tenantId === tenantId
    );
    const timestamp = Number(header(request, "X-Rosevear-Timestamp"));
    const signatureRaw = header(request, "X-Rosevear-Signature");
    let identityVerified = false;
    const signingCandidate = candidates[0];
    if (
      signingCandidate &&
      Number.isSafeInteger(timestamp) &&
      Math.abs(Date.now() - timestamp) <= INTEGRATION_V1_MAX_SKEW_MS &&
      safeNonce(nonce) &&
      /^[A-Za-z0-9_-]{43}$/.test(signatureRaw)
    ) {
      const secret = decodeSecret(signingCandidate.secretEnvVar);
      if (secret) {
        const expected = createHmac("sha256", secret).update(integrationV1CanonicalGet({
          path: parsed.pathname,
          timestamp,
          nonce,
          sourceSystem,
          destinationSystem,
          businessId,
          tenantId,
          environment,
          keyId
        })).digest();
        secret.fill(0);
        const received = Buffer.from(signatureRaw, "base64url");
        identityVerified =
          received.byteLength === expected.byteLength &&
          timingSafeEqual(received, expected);
      }
    }
    await appendRequestAudit(client, {
      connectionId: connection?.connectionId ?? signingCandidate?.connectionId,
      sourceSystem,
      destinationSystem,
      businessId,
      tenantId,
      environment,
      keyId,
      method: request.method,
      path: parsed.pathname,
      nonce,
      outcome: "denied",
      reasonCode,
      identityVerified
    });
  });
}

export async function getOrCreateIntegrationV1ReadReceipt(
  authenticated: IntegrationV1AuthenticatedGet,
  kind: "health" | "capabilities"
) {
  const connection = authenticated.connection;
  const receiptId =
    kind === "health" ? connection.healthReceiptId : connection.capabilitiesReceiptId;
  const path =
    kind === "health" ? INTEGRATION_V1_PATHS.health : INTEGRATION_V1_PATHS.capabilities;

  if (!safeReceiptId(receiptId)) throw new Error("integration_v1_receipt_id_invalid");

  return withIntegrationDatabase(async (client) => {
    if (kind === "capabilities") {
      const priorHealth = await client.query(
        `select 1 from app.integration_v1_receipts
         where receipt_id=$1 and connection_id=$2 and kind='health'`,
        [connection.healthReceiptId, connection.connectionId]
      );
      if (!priorHealth.rowCount) {
        throw new Error("integration_v1_health_receipt_required");
      }
    }

    const existing = await client.query<{ payload: Record<string, unknown>; signature: string }>(
      `select payload, signature
       from app.integration_v1_receipts
       where receipt_id=$1 and connection_id=$2 and kind=$3`,
      [receiptId, connection.connectionId, kind]
    );
    if (existing.rows[0]) {
      return { payload: existing.rows[0].payload, signature: existing.rows[0].signature };
    }

    const payload: Record<string, unknown> = {
      schema_version: INTEGRATION_V1_CONTRACT,
      gateway_id: INTEGRATION_V1_GATEWAY_ID,
      business_id: connection.businessId,
      tenant_id: connection.tenantId,
      environment: INTEGRATION_V1_ENVIRONMENT,
      kind,
      method: "GET",
      path,
      connection_status: INTEGRATION_V1_STATUS,
      capabilities: kind === "health" ? [] : [...connection.capabilities],
      receipt_id: receiptId,
      nonce: authenticated.nonce,
      issued_at: Date.now(),
      key_id: connection.keyId
    };
    const envelope = signEnvelope(payload, integrationV1CanonicalReceipt(payload));
    await client.query(
      `insert into app.integration_v1_receipts (
        receipt_id,connection_id,kind,business_id,tenant_id,environment,key_id,payload,signature
      ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
      on conflict (receipt_id) do nothing`,
      [
        receiptId,
        connection.connectionId,
        kind,
        connection.businessId,
        connection.tenantId,
        INTEGRATION_V1_ENVIRONMENT,
        connection.keyId,
        JSON.stringify(payload),
        envelope.signature
      ]
    );
    const persisted = await client.query<{ payload: Record<string, unknown>; signature: string }>(
      "select payload, signature from app.integration_v1_receipts where receipt_id=$1",
      [receiptId]
    );
    if (!persisted.rows[0]) throw new Error("integration_v1_receipt_persist_failed");
    return { payload: persisted.rows[0].payload, signature: persisted.rows[0].signature };
  });
}

export async function loadIntegrationV1GatewayAuditEnvelope(
  authenticated: IntegrationV1AuthenticatedGet,
  receiptId: string
) {
  if (receiptId !== authenticated.connection.gatewayAuditId || !safeReceiptId(receiptId)) {
    return null;
  }
  return withIntegrationDatabase(async (client) => {
    const result = await client.query<{ payload: Record<string, unknown>; signature: string }>(
      `select payload, signature
       from app.integration_v1_receipts
       where receipt_id=$1
         and connection_id=$2
         and kind='gateway_audit'`,
      [receiptId, authenticated.connection.connectionId]
    );
    return result.rows[0] ?? null;
  });
}

export async function prepareIntegrationV1GatewayAudit(connectionId: string) {
  const connectionResult = await authPool.query<IntegrationV1Connection>(
    `select
      connection_id as "connectionId", source_system as "sourceSystem",
      destination_system as "destinationSystem", business_id as "businessId",
      tenant_id as "tenantId", tenant_key as "tenantKey", environment,
      key_id as "keyId", secret_env_var as "secretEnvVar", key_state as "keyState",
      connection_state as "connectionState", capabilities,
      health_receipt_id as "healthReceiptId",
      capabilities_receipt_id as "capabilitiesReceiptId",
      gateway_audit_id as "gatewayAuditId"
     from app.integration_v1_connections where connection_id=$1`,
    [connectionId]
  );
  const connection = connectionResult.rows[0];
  if (!connection || connection.keyState !== "active" || connection.connectionState !== "HOLD") {
    throw new Error("integration_v1_connection_not_ready");
  }
  connection.capabilities = parseCapabilities(connection.capabilities) ?? [];

  const receipts = await authPool.query<{ receipt_id: string }>(
    `select receipt_id from app.integration_v1_receipts
     where connection_id=$1 and kind in ('health','capabilities')`,
    [connectionId]
  );
  const existingIds = new Set(receipts.rows.map((row) => row.receipt_id));
  if (!existingIds.has(connection.healthReceiptId) ||
      !existingIds.has(connection.capabilitiesReceiptId)) {
    throw new Error("integration_v1_read_receipts_missing");
  }

  const evidence = await authPool.query<{ reason_code: string }>(
    `select distinct reason_code
     from app.integration_v1_request_audit
     where connection_id=$1 and outcome='denied'
       and identity_verified=true
       and reason_code = any($2::text[])`,
    [connectionId, [...NEGATIVE_CODES]]
  );
  const seen = new Set(evidence.rows.map((row) => row.reason_code));
  const negativeTestResults = Object.fromEntries(
    NEGATIVE_CODES.map((code) => [code, seen.has(code)])
  ) as Record<NegativeCode, boolean>;
  if (NEGATIVE_CODES.some((code) => !negativeTestResults[code])) {
    throw new Error("integration_v1_negative_evidence_incomplete");
  }

  const payload: Record<string, unknown> = {
    schema_version: INTEGRATION_V1_CONTRACT,
    issuer: INTEGRATION_V1_GATEWAY_ID,
    business_id: connection.businessId,
    tenant_id: connection.tenantId,
    environment: INTEGRATION_V1_ENVIRONMENT,
    kind: "gateway_audit",
    method: "GET",
    connection_status: INTEGRATION_V1_STATUS,
    health_receipt_id: connection.healthReceiptId,
    capabilities_receipt_id: connection.capabilitiesReceiptId,
    gateway_audit_id: connection.gatewayAuditId,
    source_revision: sourceRevision(),
    gateway_key_id: connection.keyId,
    nonce: "np-" + randomBytes(16).toString("hex"),
    issued_at: Date.now(),
    negative_test_results: negativeTestResults
  };
  const envelope = signEnvelope(payload, integrationV1CanonicalGatewayAudit(payload));

  await authPool.query(
    `insert into app.integration_v1_receipts (
      receipt_id,connection_id,kind,business_id,tenant_id,environment,key_id,
      payload,signature,source_revision
    ) values ($1,$2,'gateway_audit',$3,$4,$5,$6,$7::jsonb,$8,$9)
    on conflict (receipt_id) do nothing`,
    [
      connection.gatewayAuditId,
      connection.connectionId,
      connection.businessId,
      connection.tenantId,
      INTEGRATION_V1_ENVIRONMENT,
      connection.keyId,
      JSON.stringify(payload),
      envelope.signature,
      payload.source_revision
    ]
  );

  const persisted = await authPool.query<{ payload: Record<string, unknown>; signature: string }>(
    "select payload, signature from app.integration_v1_receipts where receipt_id=$1",
    [connection.gatewayAuditId]
  );
  if (!persisted.rows[0]) throw new Error("integration_v1_gateway_audit_persist_failed");
  return persisted.rows[0];
}

export async function rotateIntegrationV1ConnectionKey(input: {
  currentConnectionId: string;
  newConnectionId: string;
  newKeyId: string;
  newSecretEnvVar: string;
  healthReceiptId: string;
  capabilitiesReceiptId: string;
  gatewayAuditId: string;
}) {
  if (
    !safeToken(input.newConnectionId, 96) ||
    !safeKeyId(input.newKeyId) ||
    !/^[A-Z][A-Z0-9_]{2,127}$/.test(input.newSecretEnvVar) ||
    !safeReceiptId(input.healthReceiptId) ||
    !safeReceiptId(input.capabilitiesReceiptId) ||
    !safeReceiptId(input.gatewayAuditId)
  ) {
    throw new Error("integration_v1_rotation_metadata_invalid");
  }

  const client = await authPool.connect();
  try {
    await client.query("begin");
    const current = await client.query<IntegrationV1Connection>(
      `select
        connection_id as "connectionId", source_system as "sourceSystem",
        destination_system as "destinationSystem", business_id as "businessId",
        tenant_id as "tenantId", tenant_key as "tenantKey", environment,
        key_id as "keyId", secret_env_var as "secretEnvVar", key_state as "keyState",
        connection_state as "connectionState", capabilities,
        health_receipt_id as "healthReceiptId",
        capabilities_receipt_id as "capabilitiesReceiptId",
        gateway_audit_id as "gatewayAuditId"
       from app.integration_v1_connections
       where connection_id=$1
       for update`,
      [input.currentConnectionId]
    );
    const row = current.rows[0];
    if (!row || row.environment !== "nonproduction" || row.keyState !== "active") {
      throw new Error("integration_v1_rotation_source_invalid");
    }

    await client.query(
      `update app.integration_v1_connections
       set key_state='revoked', updated_at=now()
       where connection_id=$1`,
      [input.currentConnectionId]
    );
    await client.query(
      `insert into app.integration_v1_connections (
        connection_id,source_system,destination_system,business_id,tenant_id,tenant_key,
        environment,key_id,secret_env_var,key_state,connection_state,capabilities,
        health_receipt_id,capabilities_receipt_id,gateway_audit_id
      ) values ($1,$2,$3,$4,$5,$6,'nonproduction',$7,$8,'active','HOLD',$9::jsonb,$10,$11,$12)`,
      [
        input.newConnectionId,
        row.sourceSystem,
        row.destinationSystem,
        row.businessId,
        row.tenantId,
        row.tenantKey,
        input.newKeyId,
        input.newSecretEnvVar,
        JSON.stringify(parseCapabilities(row.capabilities) ?? []),
        input.healthReceiptId,
        input.capabilitiesReceiptId,
        input.gatewayAuditId
      ]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeIntegrationV1ConnectionKey(connectionId: string) {
  const result = await authPool.query(
    `update app.integration_v1_connections
     set key_state='revoked', updated_at=now()
     where connection_id=$1 and environment='nonproduction' and key_state='active'`,
    [connectionId]
  );
  return result.rowCount === 1;
}
