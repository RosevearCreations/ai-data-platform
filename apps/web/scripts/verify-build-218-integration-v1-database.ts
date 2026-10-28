import { createHmac, generateKeyPairSync, randomBytes } from "node:crypto";

import { authPool, closeDatabasePools } from "../lib/database";
import {
  authenticateIntegrationV1Get,
  INTEGRATION_V1_CONTRACT,
  INTEGRATION_V1_PATHS,
  integrationV1CanonicalGet,
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
const oldConnection = "np-build218-db-test";
const oldKeyId = "np-build218-test-key";
const newConnection = "np-build218-db-test-rotated";
const newKeyId = "np-build218-test-key-rotated";
const oldEnv = "ROSEVEAR_INTEGRATION_V1_BUILD218_TEST_KEY_B64";
const newEnv = "ROSEVEAR_INTEGRATION_V1_BUILD218_TEST_KEY_ROTATED_B64";

function signedRequest(input: {
  method?: string;
  businessId?: string;
  tenantId?: string | null;
  keyId?: string;
  secret: Buffer;
  nonce?: string;
  timestamp?: number;
  path?: string;
}) {
  const method = input.method ?? "GET";
  const path = input.path ?? INTEGRATION_V1_PATHS.health;
  const businessId = input.businessId ?? business;
  const tenantId = input.tenantId ?? null;
  const keyId = input.keyId ?? oldKeyId;
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
    keyId
  });
  const signature = createHmac("sha256", input.secret).update(canonical).digest("base64url");
  return new Request("https://nonproduction.example.com" + path, {
    method,
    headers: {
      Accept: "application/json",
      "X-Rosevear-Contract": INTEGRATION_V1_CONTRACT,
      "X-Rosevear-Environment": "nonproduction",
      "X-Rosevear-Source": source,
      "X-Rosevear-Destination": destination,
      "X-Rosevear-Business": businessId,
      "X-Rosevear-Tenant": tenantId ?? "-",
      "X-Rosevear-Key-Id": keyId,
      "X-Rosevear-Timestamp": String(timestamp),
      "X-Rosevear-Nonce": nonce,
      "X-Rosevear-Signature": signature
    }
  });
}

async function cleanup() {
  await authPool.query(
    "delete from app.integration_v1_request_audit where connection_id = any($1::text[])",
    [[oldConnection, newConnection]]
  );
  await authPool.query(
    "delete from app.integration_v1_nonces where key_id = any($1::text[])",
    [[oldKeyId, newKeyId]]
  );
  await authPool.query(
    "delete from app.integration_v1_receipts where connection_id = any($1::text[])",
    [[oldConnection, newConnection]]
  );
  await authPool.query(
    "delete from app.integration_v1_connections where connection_id = any($1::text[])",
    [[oldConnection, newConnection, "np-comms-hub-devilndove"]]
  );
}

async function main() {
  process.env.ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED = "true";
  process.env.VERCEL_ENV = "preview";
  const signing = generateKeyPairSync("ed25519");
  process.env.ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM =
    signing.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  process.env.ROSEVEAR_INTEGRATION_V1_SIGNER_KEY_ID = "np-ai-data-platform-build220-test";

  const oldSecret = randomBytes(32);
  const newSecret = randomBytes(32);
  process.env[oldEnv] = oldSecret.toString("base64");
  process.env[newEnv] = newSecret.toString("base64");
  process.env.ROSEVEAR_INTEGRATION_V1_COMMS_DND_HMAC_KEY_B64 = oldSecret.toString("base64");

  await cleanup();
  try {
    const registered = await registerIntegrationV1DevilNDoveConnection();
    assert(
      registered.created &&
      registered.connectionState === "DISCONNECTED" &&
      registered.capabilities.join(",") === "read_health,read_capabilities",
      "Build 218 must create the first registration only through the explicit nonproduction server command."
    );
    await authPool.query(
      "delete from app.integration_v1_connections where connection_id='np-comms-hub-devilndove'"
    );

    await authPool.query(
      `insert into app.integration_v1_connections (
        connection_id,source_system,destination_system,business_id,tenant_id,tenant_key,
        environment,key_id,secret_env_var,key_state,connection_state,capabilities,
        health_receipt_id,capabilities_receipt_id,gateway_audit_id,registry_receipt_id
      ) values ($1,$2,$3,$4,null,'-','nonproduction',$5,$6,'active','DISCONNECTED',
        '["read_health","read_capabilities"]'::jsonb,$7,$8,$9,$10)`,
      [
        oldConnection, source, destination, business, oldKeyId, oldEnv,
        "np-build218-test-health", "np-build218-test-caps", "np-build218-test-audit",
        "np-build218-test-registry"
      ]
    );

    const nonce = "np-" + randomBytes(16).toString("hex");
    const goodRequest = signedRequest({ secret: oldSecret, nonce });
    const first = await authenticateIntegrationV1Get(goodRequest, INTEGRATION_V1_PATHS.health);
    assert(first.ok, "Build 218 valid signed GET must authenticate.");

    const replay = await authenticateIntegrationV1Get(goodRequest, INTEGRATION_V1_PATHS.health);
    assert(!replay.ok && replay.error === "nonce_replay_denied", "Build 218 must atomically deny nonce replay.");

    const wrongBusiness = await authenticateIntegrationV1Get(
      signedRequest({ secret: oldSecret, businessId: "wrongbusiness" }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!wrongBusiness.ok && wrongBusiness.error === "cross_business_denied",
      "Build 218 must deny a signed wrong-business request.");

    const wrongTenant = await authenticateIntegrationV1Get(
      signedRequest({ secret: oldSecret, tenantId: "wrong-tenant" }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!wrongTenant.ok && wrongTenant.error === "cross_tenant_denied",
      "Build 218 must deny a signed cross-tenant request.");

    await authPool.query(
      "update app.integration_v1_connections set capabilities='[\"read_health\"]'::jsonb where connection_id=$1",
      [oldConnection]
    );
    const missingScope = await authenticateIntegrationV1Get(
      signedRequest({ secret: oldSecret }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!missingScope.ok && missingScope.error === "capability_policy_denied",
      "Build 218 must fail closed when an expected read-only capability is missing.");
    await authPool.query(
      "update app.integration_v1_connections set capabilities='[\"read_health\",\"read_capabilities\"]'::jsonb where connection_id=$1",
      [oldConnection]
    );

    await recordIntegrationV1DeniedMethod(
      signedRequest({ secret: oldSecret, method: "POST" }),
      "write_denied",
      405
    );
    await recordIntegrationV1DeniedMethod(
      signedRequest({
        secret: oldSecret,
        path: "/api/integration/v1/dispatch"
      }),
      "dispatch_denied",
      403
    );

    const stale = await authenticateIntegrationV1Get(
      signedRequest({ secret: oldSecret, timestamp: Date.now() - 301_000 }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!stale.ok && stale.error === "stale_request_denied",
      "Build 218 must deny stale signed requests with distinct QL-245 evidence.");

    const changed = signedRequest({ secret: oldSecret });
    changed.headers.set("X-Rosevear-Signature", "A".repeat(43));
    const tampered = await authenticateIntegrationV1Get(changed, INTEGRATION_V1_PATHS.health);
    assert(!tampered.ok && tampered.error === "signature_denied",
      "Build 218 must deny signature tampering.");

    await rotateIntegrationV1ConnectionKey({
      currentConnectionId: oldConnection,
      newConnectionId: newConnection,
      newKeyId,
      newSecretEnvVar: newEnv,
      healthReceiptId: "np-build218-rotated-health",
      capabilitiesReceiptId: "np-build218-rotated-caps",
      gatewayAuditId: "np-build218-rotated-audit",
      registryReceiptId: "np-build218-rotated-registry"
    });

    const revoked = await authenticateIntegrationV1Get(
      signedRequest({ secret: oldSecret }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!revoked.ok && revoked.error === "revoked_key_denied",
      "Build 218 must deny the rotated/revoked old key.");

    const rotated = await authenticateIntegrationV1Get(
      signedRequest({ secret: newSecret, keyId: newKeyId }),
      INTEGRATION_V1_PATHS.health
    );
    assert(rotated.ok, "Build 218 rotated key metadata must authenticate with its separate secret.");

    const evidence = await authPool.query<{
      reason_code: string;
      identity_verified: boolean;
      audit_receipt_id: string | null;
    }>(
      `select reason_code, identity_verified, audit_receipt_id
       from app.integration_v1_request_audit
       where connection_id=$1 and reason_code = any($2::text[])`,
      [oldConnection, [
        "nonce_replay_denied", "stale_request_denied", "cross_business_denied",
        "cross_tenant_denied", "revoked_key_denied", "write_denied",
        "dispatch_denied"
      ]]
    );
    const verified = new Set(
      evidence.rows
        .filter((row) => row.identity_verified && row.audit_receipt_id)
        .map((row) => row.reason_code)
    );
    for (const code of [
      "nonce_replay_denied", "stale_request_denied", "cross_business_denied",
      "cross_tenant_denied", "revoked_key_denied", "write_denied",
      "dispatch_denied"
    ]) {
      assert(verified.has(code), "Build 218 missing verified denial evidence: " + code);
    }

    console.log("Build 218 Integration v1 database/replay/rotation verification passed.");
  } finally {
    oldSecret.fill(0);
    newSecret.fill(0);
    delete process.env[oldEnv];
    delete process.env[newEnv];
    delete process.env.ROSEVEAR_INTEGRATION_V1_COMMS_DND_HMAC_KEY_B64;
    delete process.env.ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM;
    delete process.env.ROSEVEAR_INTEGRATION_V1_SIGNER_KEY_ID;
    await cleanup();
  }
}

void main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
