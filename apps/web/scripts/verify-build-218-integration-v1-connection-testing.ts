import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const [
    gateway,
    database,
    health,
    capabilities,
    audit,
    blocked,
    migration,
    admin,
    env,
    pkg,
    doc,
    recoveryDoc,
    recoveryVerifier
  ] = await Promise.all([
    source("../lib/integration-v1-gateway.ts"),
    source("../lib/database.ts"),
    source("../app/api/integration/v1/health/route.ts"),
    source("../app/api/integration/v1/capabilities/route.ts"),
    source("../app/api/integration/v1/audit/receipts/[receiptId]/route.ts"),
    source("../app/api/integration/v1/[...blocked]/route.ts"),
    source("../../../db/migrations/0086_integration_v1_nonproduction_connection_testing.sql"),
    source("./integration-v1-admin.ts"),
    source("../.env.example"),
    source("../package.json"),
    source("../../../docs/BUILD_218_INTEGRATION_V1_CONNECTION_TESTING.md"),
    source("../../../docs/BUILD_218_REPAIR_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_RECOVERY.md"),
    source("./verify-build-218-repair-persistence-renewal-search-receipt-recovery.ts")
  ]);

  const canonicalTokens = [
    'INTEGRATION_V1_CONTRACT',
    '"GET"',
    'input.path',
    'String(input.timestamp)',
    'input.nonce',
    'input.sourceSystem',
    'input.destinationSystem',
    'input.businessId',
    'input.tenantId ?? "-"',
    'input.environment',
    'INTEGRATION_V1_EMPTY_BODY_SHA256',
    'input.keyId'
  ];
  for (const token of canonicalTokens) {
    assert(gateway.includes(token), "Build 218 canonical GET missing: " + token);
  }
  assert(
    gateway.includes('INTEGRATION_V1_MAX_SKEW_MS = 300_000') &&
    gateway.includes('timingSafeEqual') &&
    gateway.includes('insert into app.integration_v1_nonces') &&
    gateway.includes('on conflict do nothing') &&
    gateway.includes('"replay_denied"'),
    "Build 218 must enforce freshness, constant-time HMAC verification and durable atomic replay denial."
  );

  assert(
    gateway.includes('process.env.ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED === "true"') &&
    gateway.includes('process.env.VERCEL_ENV !== "production"') &&
    gateway.includes('INTEGRATION_V1_STATUS = "DISCONNECTED"') &&
    gateway.includes('identity_verified=true'),
    "Build 218 Integration v1 must remain nonproduction-only and require verified negative evidence after later scope hardening."
  );

  for (const token of [
    "app.integration_v1_connections",
    "app.integration_v1_nonces",
    "app.integration_v1_request_audit",
    "app.integration_v1_receipts",
    "identity_verified boolean not null default false",
    "revoke all on app.integration_v1_connections from public",
    "revoke all on app.integration_v1_nonces from public",
    "revoke all on app.integration_v1_request_audit from public",
    "revoke all on app.integration_v1_receipts from public"
  ]) {
    assert(migration.includes(token), "Build 218 migration contract missing: " + token);
  }
  assert(
    !migration.includes("BEGIN PRIVATE KEY") &&
    !migration.includes("ROSEVEAR_INTEGRATION_V1_COMMS_DND_HMAC_KEY_B64=") &&
    !migration.includes("np-comms-hub-devilndove"),
    "Build 218 migration must contain no secret values or pre-seeded nonproduction connection."
  );

  assert(
    database.includes("withIntegrationDatabase") &&
    database.includes('set local role ai_data_runtime'),
    "Build 218 must keep gateway persistence inside the restricted runtime database role."
  );

  assert(
    health.includes("authenticateIntegrationV1Get") &&
    health.includes('"health"') &&
    capabilities.includes("authenticateIntegrationV1Get") &&
    capabilities.includes('"capabilities"') &&
    audit.includes("loadIntegrationV1GatewayAuditEnvelope") &&
    blocked.includes("integration_v1_write_denied"),
    "Build 218 must expose only the authenticated read-only v1 route surface and deny writes."
  );

  assert(
    gateway.includes("ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM") &&
    gateway.includes("signDetached") &&
    gateway.includes("integrationV1CanonicalReceipt") &&
    gateway.includes("integrationV1CanonicalGatewayAudit"),
    "Build 218 must sign held receipts and gateway audit evidence with a server-only Ed25519 key."
  );

  assert(
    gateway.includes("registerIntegrationV1DevilNDoveConnection") &&
    gateway.includes("ROSEVEAR_INTEGRATION_V1_COMMS_DND_HMAC_KEY_B64") &&
    gateway.includes("read_health") &&
    gateway.includes("read_capabilities") &&
    !gateway.includes('devilndove: Object.freeze(["read_product_reference", "read_listing_reference"])') &&
    gateway.includes("rotateIntegrationV1ConnectionKey") &&
    gateway.includes("revokeIntegrationV1ConnectionKey") &&
    admin.includes('"register-devilndove"') &&
    admin.includes('"prepare-audit"') &&
    admin.includes('"fingerprint"') &&
    admin.includes('"rotate"') &&
    admin.includes('"revoke"'),
    "Build 218 controls must remain available after later QL-245 scope hardening."
  );

  for (const variable of [
    "ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED=false",
    "ROSEVEAR_INTEGRATION_V1_COMMS_DND_HMAC_KEY_B64=",
    "ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM="
  ]) {
    assert(env.includes(variable), "Build 218 environment documentation missing: " + variable);
  }

  const parsed = JSON.parse(pkg) as { scripts?: Record<string, string> };
  assert(
    parsed.scripts?.test?.includes("verify-build-218-repair-persistence-renewal-search-receipt-recovery.ts") &&
    parsed.scripts?.test?.includes("verify-build-218-integration-v1-connection-testing.ts") &&
    parsed.scripts?.["db:verify"]?.includes("verify-build-218-integration-v1-database.ts") &&
    parsed.scripts?.["integration:v1-admin"]?.includes("integration-v1-admin.ts"),
    "Build 218 application and database verification plus trusted admin command must be registered."
  );

  assert(
    "integration-v1-connection-testing" in HELP_TOPICS &&
    HELP_TOPICS["integration-v1-connection-testing"].summary.includes("HOLD"),
    "Build 218 Integration v1 contextual help must preserve HOLD semantics."
  );

  assert(
    doc.includes("AI Data Platform remains the sole integration gateway") &&
    doc.includes("Production deployments fail closed") &&
    doc.includes("Owner pilot authorization **NOT GIVEN**") &&
    doc.includes("No product/customer records are copied into the gateway"),
    "Build 218 Integration v1 documentation must preserve gateway, production fail-closed and owner-HOLD boundaries."
  );

  assert(
    recoveryDoc.toLowerCase().includes("recovery-preference sub-scope") &&
    recoveryDoc.includes("BUILD_218_INTEGRATION_V1_CONNECTION_TESTING.md") &&
    recoveryVerifier.includes('shell.includes("Marble Standard")'),
    "Build 218 recovery documentation must distinguish its browser-local scope from the Integration v1 companion scope."
  );

  console.log("Build 218 Integration v1 connection-testing contract verification passed.");
}

void main();
