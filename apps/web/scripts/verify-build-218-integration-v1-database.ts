import { createHmac, randomBytes } from "node:crypto";

import { authPool, closeDatabasePools } from "../lib/database";
import {
  authenticateIntegrationV1Get,
  INTEGRATION_V1_CONTRACT,
  INTEGRATION_V1_PATHS,
  integrationV1CanonicalGet,
  recordIntegrationV1DeniedMethod,
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
}) {
  const method = input.method ?? "GET";
  const businessId = input.businessId ?? business;
  const tenantId = input.tenantId ?? null;
  const keyId = input.keyId ?? oldKeyId;
  const nonce = input.nonce ?? "np-" + randomBytes(16).toString("hex");
  const timestamp = input.timestamp ?? Date.now();
  const canonical = integrationV1CanonicalGet({
    path: INTEGRATION_V1_PATHS.health,
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
  return new Request("https://nonproduction.example.com" + INTEGRATION_V1_PATHS.health, {
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
    [[oldConnection, newConnection]]
  );
}

async function main() {
  process.env.ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED = "true";
  process.env.VERCEL_ENV = "preview";

  const oldSecret = randomBytes(32);
  const newSecret = randomBytes(32);
  process.env[oldEnv] = oldSecret.toString("base64");
  process.env[newEnv] = newSecret.toString("base64");

  await cleanup();
  try {
    await authPool.query(
      `insert into app.integration_v1_connections (
        connection_id,source_system,destination_system,business_id,tenant_id,tenant_key,
        environment,key_id,secret_env_var,key_state,connection_state,capabilities,
        health_receipt_id,capabilities_receipt_id,gateway_audit_id
      ) values ($1,$2,$3,$4,null,'-','nonproduction',$5,$6,'active','HOLD',
        '["read_product_reference","read_listing_reference"]'::jsonb,$7,$8,$9)`,
      [
        oldConnection, source, destination, business, oldKeyId, oldEnv,
        "np-build218-test-health", "np-build218-test-caps", "np-build218-test-audit"
      ]
    );

    const nonce = "np-" + randomBytes(16).toString("hex");
    const goodRequest = signedRequest({ secret: oldSecret, nonce });
    const first = await authenticateIntegrationV1Get(goodRequest, INTEGRATION_V1_PATHS.health);
    assert(first.ok, "Build 218 valid signed GET must authenticate.");

    const replay = await authenticateIntegrationV1Get(goodRequest, INTEGRATION_V1_PATHS.health);
    assert(!replay.ok && replay.error === "replay_denied", "Build 218 must atomically deny nonce replay.");

    const wrongBusiness = await authenticateIntegrationV1Get(
      signedRequest({ secret: oldSecret, businessId: "wrongbusiness" }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!wrongBusiness.ok && wrongBusiness.error === "wrong_business_denied",
      "Build 218 must deny a signed wrong-business request.");

    const wrongTenant = await authenticateIntegrationV1Get(
      signedRequest({ secret: oldSecret, tenantId: "wrong-tenant" }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!wrongTenant.ok && wrongTenant.error === "wrong_tenant_denied",
      "Build 218 must deny a signed cross-tenant request.");

    await recordIntegrationV1DeniedMethod(
      signedRequest({ secret: oldSecret, method: "POST" }),
      "write_denied"
    );

    const stale = await authenticateIntegrationV1Get(
      signedRequest({ secret: oldSecret, timestamp: Date.now() - 301_000 }),
      INTEGRATION_V1_PATHS.health
    );
    assert(!stale.ok, "Build 218 must deny stale signed requests.");

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
      gatewayAuditId: "np-build218-rotated-audit"
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

    const evidence = await authPool.query<{ reason_code: string; identity_verified: boolean }>(
      `select reason_code, identity_verified
       from app.integration_v1_request_audit
       where connection_id=$1 and reason_code = any($2::text[])`,
      [oldConnection, [
        "wrong_business_denied", "wrong_tenant_denied", "write_denied",
        "replay_denied", "revoked_key_denied"
      ]]
    );
    const verified = new Set(
      evidence.rows.filter((row) => row.identity_verified).map((row) => row.reason_code)
    );
    for (const code of [
      "wrong_business_denied", "wrong_tenant_denied", "write_denied",
      "replay_denied", "revoked_key_denied"
    ]) {
      assert(verified.has(code), "Build 218 missing verified denial evidence: " + code);
    }

    console.log("Build 218 Integration v1 database/replay/rotation verification passed.");
  } finally {
    oldSecret.fill(0);
    newSecret.fill(0);
    delete process.env[oldEnv];
    delete process.env[newEnv];
    await cleanup();
  }
}

void main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
