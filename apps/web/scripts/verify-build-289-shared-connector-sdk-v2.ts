import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CONNECTOR_SDK_VERSION,
  CONNECTOR_MANIFEST_VERSION,
  CONNECTOR_SDK_V2_FEATURES,
  validateConnectorManifest
} from "@rosevear/ai-data-connector-sdk";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 289 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  ensure(CONNECTOR_SDK_VERSION === 2, "SDK version 2");
  ensure(CONNECTOR_MANIFEST_VERSION === 2, "manifest version 2");
  ensure(CONNECTOR_SDK_V2_FEATURES.exactOriginAllowlist, "exact origin allowlist");
  ensure(CONNECTOR_SDK_V2_FEATURES.boundedRetries, "bounded retries");
  ensure(CONNECTOR_SDK_V2_FEATURES.cursorPagination, "cursor pagination");
  ensure(CONNECTOR_SDK_V2_FEATURES.pageNumberPagination, "page-number pagination");
  ensure(CONNECTOR_SDK_V2_FEATURES.healthChecks, "health checks");
  ensure(CONNECTOR_SDK_V2_FEATURES.normalizedErrors, "normalized errors");
  ensure(CONNECTOR_SDK_V2_FEATURES.secretValuesInAudit === false, "no secrets in audit");

  const localManifest = {
    manifestVersion: 2 as const,
    sdkVersion: 2 as const,
    key: "verify.local",
    version: "2.0.0",
    displayName: "Verify local",
    description: "Build 289 verifier local connector.",
    capabilities: ["import" as const],
    configSchema: [],
    secrets: [],
    limits: { maxExecutionMs: 1000, maxInputBytes: 2000, maxOutputBytes: 2000 },
    transport: { kind: "local" as const }
  };
  ensure(validateConnectorManifest(localManifest).valid, "v2 local manifest");

  const [
    sdk,
    sdkPackage,
    sdkTests,
    registry,
    sandbox,
    database,
    migration,
    page,
    manager,
    docs,
    statusRaw,
    roadmap
  ] = await Promise.all([
    source("../../packages/connector-sdk/src/index.ts"),
    source("../../packages/connector-sdk/package.json"),
    source("../../packages/connector-sdk/tests/sdk.test.mjs"),
    source("lib/connectors/registry.ts"),
    source("lib/connectors/sandbox.ts"),
    source("lib/connector-database.ts"),
    source("../../db/migrations/0092_shared_connector_sdk_v2.sql"),
    source("app/connectors/page.tsx"),
    source("app/connectors/ConnectorManager.tsx"),
    source("../../docs/BUILD_289_SHARED_CONNECTOR_SDK_V2.md"),
    source("../../docs/integration/ql266-ai-data-platform-build289-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md")
  ]);

  for (const token of [
    "createConnectorHttpClient",
    "createExecutionHttpClient",
    "ConnectorSdkError",
    "Retry-After",
    "api-key-header",
    "cursor",
    "page-number",
    "health",
    "request-retrying",
    "connector_http_destination_not_allowed",
    "idempotency-key"
  ]) ensure(sdk.includes(token), "SDK token " + token);

  ensure(sdkPackage.includes('"version": "2.0.0"'), "package version 2.0.0");
  ensure(
    sdkPackage.includes("node --test tests/sdk.test.mjs"),
    "SDK tests are part of package build gate"
  );
  for (const token of [
    "injects auth",
    "retries bounded 503",
    "POST is not retried",
    "cursor pagination",
    "health checks",
    "outside the exact manifest origin"
  ]) ensure(sdkTests.includes(token), "SDK test token " + token);

  ensure(
    registry.includes("manifestVersion: 2") &&
      registry.includes("sdkVersion: 2") &&
      registry.includes('transport: { kind: "local" }'),
    "registered connector upgraded to v2"
  );
  ensure(
    sandbox.includes("createExecutionHttpClient") &&
      sandbox.includes("connectorSdkEvidence") &&
      sandbox.includes("sdkAuditEvents"),
    "execution boundary v2 transport and failure evidence"
  );
  for (const token of [
    "sdkVersion",
    "manifestVersion",
    "transportKind",
    "requestCount",
    "retryCount",
    "pageCount",
    "healthCheckCount",
    "sdkAuditEvents"
  ]) ensure(database.includes(token), "database audit token " + token);

  for (const token of [
    "sdk_version",
    "manifest_version",
    "transport_kind",
    "request_count",
    "retry_count",
    "page_count",
    "health_check_count",
    "transport_evidence",
    "sdk_audit_events"
  ]) ensure(migration.includes(token), "migration token " + token);

  ensure(
    page.includes("Build 289") &&
      page.includes("Rosevear Shared Connector SDK 2.0"),
    "Build 289 connector operator page"
  );
  ensure(
    manager.includes("SDK v{manifest.sdkVersion}") &&
      manager.includes("requests {event.requestCount}") &&
      manager.includes("retries {event.retryCount}"),
    "operator transport evidence"
  );
  ensure(
    docs.includes("0092_shared_connector_sdk_v2.sql") &&
      docs.includes("Build 290 — Webhook Gateway & Event Intake Center") &&
      docs.includes("UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED"),
    "documentation and next-build continuity"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 289, "status build");
  ensure(status.shared_connector_sdk_v2.sdk_version === 2, "status SDK v2");
  ensure(status.shared_connector_sdk_v2.exact_https_origin_allowlist === true, "origin guard");
  ensure(status.shared_connector_sdk_v2.bounded_retries === true, "retry guard");
  ensure(status.shared_connector_sdk_v2.sanitized_transport_audit_events === true, "audit events");
  ensure(status.shared_connector_sdk_v2.raw_secret_values_stored === false, "no raw secret persistence");
  ensure(status.shared_connector_sdk_v2.external_requests === 0, "no build-time external requests");
  ensure(status.shared_connector_sdk_v2.live_exchanges === 0, "no live exchanges");
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 290, "next build 290");
  ensure(
    roadmap.includes("Build 289 — Rosevear Shared Connector SDK 2.0") &&
      roadmap.includes("Build 290 — Webhook Gateway & Event Intake Center"),
    "official roadmap continuity"
  );

  console.log("Build 289 Rosevear Shared Connector SDK 2.0 verification passed.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
