import {
  createHmac,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  verify
} from "node:crypto";

import { authPool, closeDatabasePools } from "../lib/database";
import {
  authenticateIntegrationV1Get,
  getOrCreateIntegrationV1ReadReceipt,
  INTEGRATION_V1_CONTRACT,
  INTEGRATION_V1_PATHS,
  integrationV1CanonicalGet,
  integrationV1CanonicalQl245Source,
  prepareIntegrationV1GatewayAudit,
  prepareIntegrationV1Ql245SourceEvidence,
  QL245_NEGATIVE_CODES,
  recordIntegrationV1DeniedMethod,
  registerIntegrationV1DevilNDoveConnection,
  rotateIntegrationV1ConnectionKey
} from "../lib/integration-v1-gateway";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const source = "rosevear-comms-hub";
const destination = "ai-data-platform";
const business = "devilndove";
const initialConnection = "np-comms-hub-devilndove";
const rotatedConnection = "np-build220-rotated";
const rotatedKeyId = "np-build220-rotated-key";
const rotatedEnv = "ROSEVEAR_INTEGRATION_V1_BUILD220_ROTATED_KEY_B64";

function signedRequest(input: {
  secret: Buffer;
  keyId: string;
  path?: string;
  method?: string;
  businessId?: string;
  tenantId?: string | null;
  nonce?: string;
  timestamp?: number;
}) {
  const path = input.path ?? INTEGRATION_V1_PATHS.health;
  const method = input.method ?? "GET";
  const businessId = input.businessId ?? business;
  const tenantId = input.tenantId ?? null;
  const nonce = input.nonce ?? "np-" + randomBytes(16).toString("hex");
  const timestamp = input.timestamp ?? Date.now();
  const canonical = integrationV1CanonicalGet({
    path,
    timestamp,
    nonce,
    sourceSystem: source,
    destinationSystem: destination,
    businessId,
    tenantId,
    environment: "nonproduction",
    keyId: input.keyId
  });
  const signature = createHmac("sha256", input.secret).update(canonical).digest("base64url");
  return new Request("https://nonproduction.example.test" + path, {
    method,
    headers: {
      Accept: "application/json",
      "X-Rosevear-Contract": INTEGRATION_V1_CONTRACT,
      "X-Rosevear-Environment": "nonproduction",
      "X-Rosevear-Source": source,
      "X-Rosevear-Destination": destination,
      "X-Rosevear-Business": businessId,
      "X-Rosevear-Tenant": tenantId ?? "-",
      "X-Rosevear-Key-Id": input.keyId,
      "X-Rosevear-Timestamp": String(timestamp),
      "X-Rosevear-Nonce": nonce,
      "X-Rosevear-Signature": signature
    }
  });
}

async function cleanup() {
  await authPool.query(
    "delete from app.integration_v1_request_audit where connection_id = any($1::text[])",
    [[initialConnection, rotatedConnection]]
  );
  await authPool.query(
    "delete from app.integration_v1_nonces where key_id = any($1::text[])",
    [["np-devilndove-current", rotatedKeyId]]
  );
  await authPool.query(
    "delete from app.integration_v1_receipts where connection_id = any($1::text[])",
    [[initialConnection, rotatedConnection]]
  );
  await authPool.query(
    "delete from app.integration_v1_connections where connection_id = any($1::text[])",
    [[initialConnection, rotatedConnection]]
  );
}

async function main() {
  process.env.ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED = "true";
  process.env.VERCEL_ENV = "preview";
  process.env.ROSEVEAR_INTEGRATION_V1_SOURCE_REVISION = "a".repeat(40);
  process.env.ROSEVEAR_INTEGRATION_V1_SIGNER_KEY_ID = "np-ai-data-platform-build220";

  const signing = generateKeyPairSync("ed25519");
  process.env.ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM =
    signing.privateKey.export({ format: "pem", type: "pkcs8" }).toString();

  const initialSecret = randomBytes(32);
  const rotatedSecret = randomBytes(32);
  process.env.ROSEVEAR_INTEGRATION_V1_COMMS_DND_HMAC_KEY_B64 =
    initialSecret.toString("base64");
  process.env[rotatedEnv] = rotatedSecret.toString("base64");

  await cleanup();
  try {
    const registration = await registerIntegrationV1DevilNDoveConnection();
    assert(
      registration.created &&
      registration.connectionState === "DISCONNECTED" &&
      registration.capabilities.join(",") === "read_health,read_capabilities",
      "Build 220 registration must be DISCONNECTED and health/capabilities only."
    );

    const replayNonce = "np-" + randomBytes(16).toString("hex");
    const accepted = signedRequest({
      secret: initialSecret,
      keyId: "np-devilndove-current",
      nonce: replayNonce
    });
    const first = await authenticateIntegrationV1Get(accepted, INTEGRATION_V1_PATHS.health);
    assert(first.ok, "Build 220 valid initial signed GET must authenticate.");
    const replay = await authenticateIntegrationV1Get(accepted, INTEGRATION_V1_PATHS.health);
    assert(!replay.ok && replay.error === "nonce_replay_denied",
      "Build 220 must record nonce replay as its own QL-245 denial.");

    const stale = await authenticateIntegrationV1Get(
      signedRequest({
        secret: initialSecret,
        keyId: "np-devilndove-current",
        timestamp: Date.now() - 301_000
      }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!stale.ok && stale.error === "stale_request_denied",
      "Build 220 must record a correctly signed stale request separately.");

    const crossBusiness = await authenticateIntegrationV1Get(
      signedRequest({
        secret: initialSecret,
        keyId: "np-devilndove-current",
        businessId: "wrongbusiness"
      }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!crossBusiness.ok && crossBusiness.error === "cross_business_denied",
      "Build 220 must record cross-business denial.");

    const crossTenant = await authenticateIntegrationV1Get(
      signedRequest({
        secret: initialSecret,
        keyId: "np-devilndove-current",
        tenantId: "np-wrong-tenant"
      }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!crossTenant.ok && crossTenant.error === "cross_tenant_denied",
      "Build 220 must record cross-tenant denial.");

    await recordIntegrationV1DeniedMethod(
      signedRequest({
        secret: initialSecret,
        keyId: "np-devilndove-current",
        method: "POST"
      }),
      "write_denied",
      405
    );
    await recordIntegrationV1DeniedMethod(
      signedRequest({
        secret: initialSecret,
        keyId: "np-devilndove-current",
        path: "/api/integration/v1/dispatch"
      }),
      "dispatch_denied",
      403
    );

    await rotateIntegrationV1ConnectionKey({
      currentConnectionId: initialConnection,
      newConnectionId: rotatedConnection,
      newKeyId: rotatedKeyId,
      newSecretEnvVar: rotatedEnv,
      healthReceiptId: "np-build220-health",
      capabilitiesReceiptId: "np-build220-caps",
      gatewayAuditId: "np-build220-gateway-audit",
      registryReceiptId: "np-build220-registry"
    });

    const revoked = await authenticateIntegrationV1Get(
      signedRequest({
        secret: initialSecret,
        keyId: "np-devilndove-current"
      }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!revoked.ok && revoked.error === "revoked_key_denied",
      "Build 220 must record revoked-key denial.");

    const healthAuth = await authenticateIntegrationV1Get(
      signedRequest({ secret: rotatedSecret, keyId: rotatedKeyId }),
      INTEGRATION_V1_PATHS.health
    );
    assert(healthAuth.ok, "Build 220 rotated health GET must authenticate.");
    const healthEnvelope = await getOrCreateIntegrationV1ReadReceipt(healthAuth.value, "health");
    assert(healthEnvelope.payload.connection_status === "DISCONNECTED",
      "Build 220 health receipt must remain DISCONNECTED.");

    const capabilitiesAuth = await authenticateIntegrationV1Get(
      signedRequest({
        secret: rotatedSecret,
        keyId: rotatedKeyId,
        path: INTEGRATION_V1_PATHS.capabilities
      }),
      INTEGRATION_V1_PATHS.capabilities
    );
    assert(capabilitiesAuth.ok, "Build 220 rotated capabilities GET must authenticate.");
    const capabilitiesEnvelope =
      await getOrCreateIntegrationV1ReadReceipt(capabilitiesAuth.value, "capabilities");
    assert(
      JSON.stringify(capabilitiesEnvelope.payload.capabilities) ===
        JSON.stringify(["read_health", "read_capabilities"]),
      "Build 220 capabilities receipt must not advertise product/listing reads."
    );

    const gatewayAudit = await prepareIntegrationV1GatewayAudit(rotatedConnection);
    const gatewayNegatives =
      gatewayAudit.payload.negative_test_results as Record<string, boolean>;
    assert(
      QL245_NEGATIVE_CODES.every((code) => gatewayNegatives[code] === true),
      "Build 220 gateway audit must require all seven QL-245 denials."
    );

    const ql245 = await prepareIntegrationV1Ql245SourceEvidence({
      connectionId: rotatedConnection,
      ciRunUrl:
        "https://github.com/RosevearCreations/ai-data-platform/actions/runs/123456789"
    });
    const payload = ql245.envelope.payload as Record<string, unknown>;
    assert(
      payload.source_system === "ai-data-platform" &&
      payload.business_id === "devilndove" &&
      payload.tenant_id === null &&
      payload.environment === "nonproduction" &&
      payload.connection_state === "DISCONNECTED" &&
      payload.owner_authorization === "NOT_GIVEN" &&
      payload.audit_storage_review === "INDEPENDENT_RESTART_PROOF_PENDING",
      "Build 220 QL-245 source metadata must preserve the held/disconnected truth boundary."
    );
    assert(
      JSON.stringify(payload.allowed_paths) === JSON.stringify([
        INTEGRATION_V1_PATHS.health,
        INTEGRATION_V1_PATHS.capabilities
      ]) &&
      JSON.stringify(payload.scope) === JSON.stringify(["read_health", "read_capabilities"]),
      "Build 220 QL-245 source metadata must expose only health/capabilities."
    );

    const signatureValid = verify(
      null,
      integrationV1CanonicalQl245Source(payload),
      createPublicKey(ql245.publicKeyPem),
      Buffer.from(ql245.envelope.signature, "base64url")
    );
    assert(signatureValid, "Build 220 QL-245 source envelope signature must verify.");

    const evidence = await authPool.query<{
      reason_code: string;
      response_status: number | null;
      audit_receipt_id: string | null;
    }>(
      `select reason_code,response_status,audit_receipt_id
       from app.integration_v1_request_audit a
       join app.integration_v1_connections c using (connection_id)
       where c.business_id='devilndove'
         and a.identity_verified=true
         and a.reason_code = any($1::text[])`,
      [[...QL245_NEGATIVE_CODES]]
    );
    const signed = new Map(
      evidence.rows
        .filter((row) => row.audit_receipt_id && row.response_status)
        .map((row) => [row.reason_code, row.audit_receipt_id])
    );
    assert(
      QL245_NEGATIVE_CODES.every((code) => signed.has(code)),
      "Build 220 must retain signed receipt IDs for all seven denial categories."
    );

    console.log("Build 220 QL-245 database/evidence verification passed.");
  } finally {
    initialSecret.fill(0);
    rotatedSecret.fill(0);
    delete process.env.ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED;
    delete process.env.VERCEL_ENV;
    delete process.env.ROSEVEAR_INTEGRATION_V1_SOURCE_REVISION;
    delete process.env.ROSEVEAR_INTEGRATION_V1_SIGNER_KEY_ID;
    delete process.env.ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM;
    delete process.env.ROSEVEAR_INTEGRATION_V1_COMMS_DND_HMAC_KEY_B64;
    delete process.env[rotatedEnv];
    await cleanup();
  }
}

void main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
