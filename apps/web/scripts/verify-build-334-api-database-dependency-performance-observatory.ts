import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  classifyPerformanceOperation,
  performanceObservatoryPolicy
} from "../lib/performance-observatory";

const root = resolve(process.cwd());
const source = (path: string) => readFileSync(resolve(root, path), "utf8");
const count = (value: string, token: string) => value.split(token).length - 1;

assert.equal(classifyPerformanceOperation("api", 500, 0), "good");
assert.equal(classifyPerformanceOperation("api", 1500, 0), "needs-attention");
assert.equal(classifyPerformanceOperation("api", 4000, 0), "poor");
assert.equal(classifyPerformanceOperation("database", null, null), "unmeasured");
assert.equal(classifyPerformanceOperation("dependency", 1000, 15), "poor");

assert.equal(performanceObservatoryPolicy.rawUrlsStored, false);
assert.equal(performanceObservatoryPolicy.queryStringsStored, false);
assert.equal(performanceObservatoryPolicy.sqlTextStored, false);
assert.equal(performanceObservatoryPolicy.requestBodiesStored, false);
assert.equal(performanceObservatoryPolicy.responseBodiesStored, false);
assert.equal(performanceObservatoryPolicy.credentialValuesStored, false);
assert.equal(performanceObservatoryPolicy.automaticOptimization, false);
assert.equal(performanceObservatoryPolicy.automaticReleaseBlocking, false);

const migration = source(
  "../../db/migrations/0117_service_performance_observatory.sql"
);
for (const token of [
  "service_performance_events",
  "enable row level security",
  "grant select, insert",
  "revoke update, delete",
  "app_pool_waiting",
  "sample_kind in ('api','database')"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
for (const forbidden of [
  "raw_url",
  "query_string",
  "sql_text",
  "request_body",
  "response_body",
  "credential_value",
  "connection_string"
]) {
  assert.ok(!migration.includes(forbidden), "forbidden migration field " + forbidden);
}

const database = source("lib/database.ts");
for (const token of [
  "getDatabasePoolStats",
  "totalCount",
  "idleCount",
  "waitingCount"
]) {
  assert.ok(database.includes(token), "pool telemetry token " + token);
}
assert.ok(!database.includes("getDatabaseConnectionString"));

const observatory = source("lib/performance-observatory-database.ts");
for (const token of [
  "recordServicePerformanceEvent",
  "observeApiOperation",
  "recordAuthorizedDatabaseProbe",
  "listPerformanceObservatoryForUser",
  "percentile_cont(0.50)",
  "percentile_cont(0.75)",
  "percentile_cont(0.95)",
  "workspace_connector_audit",
  "getDatabasePoolStats",
  "existing-authorized-connector-audit"
]) {
  assert.ok(observatory.includes(token), "observatory token " + token);
}
assert.ok(observatory.includes("Performance evidence must never break"));
assert.ok(!observatory.includes("request.url"));
assert.ok(!observatory.includes("location.search"));

const instrumented = [
  ["app/api/performance-baseline/route.ts", "api.performance-baseline.get", "api.performance-baseline.post"],
  ["app/api/experience-telemetry/route.ts", "api.experience-telemetry.get", "api.experience-telemetry.post"],
  ["app/api/route-performance/route.ts", "api.route-performance.get"]
] as const;
for (const [path, ...keys] of instrumented) {
  const route = source(path);
  assert.ok(route.includes("observeApiOperation"), path + " missing observer");
  for (const key of keys) {
    assert.ok(route.includes(key), path + " missing operation " + key);
  }
}

const api = source("app/api/performance-observatory/route.ts");
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("listPerformanceObservatoryForUser"));
assert.ok(api.includes("Cache-Control"));

const page = source("app/performance-observatory/page.tsx");
for (const token of [
  "Performance Observatory",
  "Database connection pressure",
  "API operations",
  "Database operations",
  "Dependency performance",
  "Missing evidence remains unmeasured"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.equal(count(navigation, 'href: "/performance-observatory"'), 1);
assert.ok(navigation.includes('label: "Performance Observatory"'));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build334-review.json")
);
assert.equal(review.build, 334);
assert.equal(review.privacy.rawUrlsStored, false);
assert.equal(review.safety.automaticPoolResize, false);
assert.equal(review.masterShell.fullMasterCompletionImplemented, false);
assert.equal(review.masterShell.missingEvidenceState, "UNKNOWN_OR_HOLD");
assert.equal(review.nextQueuedBuild, 335);

const handoff = source("../../docs/MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md");
for (const token of [
  "Master Intelligence and Monitoring",
  "UNKNOWN/STALE/HOLD",
  "Master Completion Dashboard",
  "Protected `dev`/`main` promotion remains a software release gate",
  "does not replace functional acceptance"
]) {
  assert.ok(handoff.includes(token), "Master Shell response token " + token);
}

const documentation = source(
  "../../docs/BUILD_334_API_DATABASE_DEPENDENCY_PERFORMANCE_OBSERVATORY.md"
);
assert.ok(documentation.includes("Build 335 — Cross-Application Interaction Trace & Correlation IDs"));
assert.ok(documentation.includes("Missing API or dependency evidence remains explicitly unmeasured"));

const architecture = source("../../docs/ARCHITECTURE.md");
const security = source("../../docs/SECURITY.md");
assert.ok(architecture.includes("Build 334 — API, Database Query & Dependency Performance Observatory"));
assert.ok(security.includes("Build 334 API, database, pool and dependency observatory security"));

const compactDb = source("scripts/verify-ci-integration-spine-database.ts");
assert.equal(count(compactDb, '"service_performance_events"'), 2);

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-334-api-database-dependency-performance-observatory.ts";
assert.equal(String(pkg.scripts["verify:build334"]), verifier);
assert.ok(String(pkg.scripts.build).includes(verifier));
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-333-route-performance-rendering-diagnostics.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-334-api-database-dependency-performance-observatory.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-334-api-database-dependency-performance-observatory.ts"
  ) < String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 334 API, Database Query & Dependency Performance Observatory verification passed."
);
