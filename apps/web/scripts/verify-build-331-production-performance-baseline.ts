import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildPerformanceBaseline,
  performanceBaselineDescriptor,
  percentile
} from "../lib/performance-baseline";

const root = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function count(value: string, token: string) {
  return value.split(token).length - 1;
}

const healthy = buildPerformanceBaseline(
  {
    databaseProbeMs: 40,
    connectorDurationsMs: [100, 120, 150, 180],
    connectorSucceeded: 20,
    connectorFailed: 0,
    webhookAccepted: 20,
    webhookDenied: 0,
    deliveryFailures24h: 0
  },
  {
    database_probe_ms: 40,
    connector_p95_ms: 180,
    connector_error_rate_pct: 0,
    webhook_denied_rate_pct: 0,
    delivery_failures_24h: 0
  }
);
assert.equal(healthy.overallState, "healthy");
assert.equal(healthy.policy.measuredEvidenceOnly, true);
assert.equal(healthy.policy.syntheticEvidenceCountsAsProduction, false);
assert.equal(healthy.policy.automaticOptimization, false);
assert.equal(healthy.policy.automaticReleaseBlocking, false);

const first = buildPerformanceBaseline(
  {
    databaseProbeMs: 30,
    connectorDurationsMs: [],
    connectorSucceeded: 0,
    connectorFailed: 0,
    webhookAccepted: 0,
    webhookDenied: 0,
    deliveryFailures24h: 0
  },
  null
);
assert.equal(first.overallState, "attention");
assert.equal(first.baselineEstablished, false);
assert.equal(
  first.metrics.find(item => item.key === "connector_p95_ms")?.value,
  null
);
assert.equal(
  first.budgetResults.find(
    item => item.metricKey === "connector_p95_ms"
  )?.status,
  "unmeasured"
);

const critical = buildPerformanceBaseline(
  {
    databaseProbeMs: 900,
    connectorDurationsMs: [100, 5000],
    connectorSucceeded: 5,
    connectorFailed: 5,
    webhookAccepted: 5,
    webhookDenied: 5,
    deliveryFailures24h: 10
  },
  {
    database_probe_ms: 50,
    connector_p95_ms: 100,
    connector_error_rate_pct: 0,
    webhook_denied_rate_pct: 0,
    delivery_failures_24h: 0
  }
);
assert.equal(critical.overallState, "critical");
assert.ok(critical.regressions.some(item => item.regressed));
assert.equal(percentile([10, 20, 30, 40], 95), 40);
assert.equal(performanceBaselineDescriptor.build, 331);
assert.equal(performanceBaselineDescriptor.browserRumInvented, false);

const migration = source(
  "../../db/migrations/0114_production_performance_baseline_slos.sql"
);
for (const token of [
  "performance_baseline_snapshots",
  "enable row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}

const database = source("../lib/performance-baseline-database.ts");
for (const token of [
  "workspace_connector_audit",
  "webhook_request_audit",
  "event_bus_delivery_failures",
  "performance_baseline_snapshots",
  "performance_baseline_owner_admin_required",
  "capturePerformanceBaseline"
]) {
  assert.ok(database.includes(token), "database token " + token);
}

const api = source("../app/api/performance-baseline/route.ts");
assert.ok(api.includes("capture-performance-baseline"));
assert.ok(api.includes("Cache-Control"));
assert.ok(api.includes("authentication_required"));

const page = source("../app/performance-baseline/page.tsx");
const consoleSource = source(
  "../app/performance-baseline/PerformanceBaselineConsole.tsx"
);
assert.ok(page.includes("Production Performance Baseline"));
assert.ok(page.includes("Missing telemetry is never converted into a PASS"));
assert.ok(consoleSource.includes("Capture performance baseline"));
assert.ok(consoleSource.includes("Observation does not equal automation"));

const navigation = source("../lib/application-navigation.ts");
assert.equal(count(navigation, 'href: "/performance-baseline"'), 1);

const compactDb = source(
  "../scripts/verify-ci-integration-spine-database.ts"
);
assert.equal(count(compactDb, '"performance_baseline_snapshots"'), 2);

const documentation = source(
  "../../docs/BUILD_331_PRODUCTION_PERFORMANCE_BASELINE_SLOS.md"
);
const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
const security = source("../../docs/SECURITY.md");
const architecture = source("../../docs/ARCHITECTURE.md");
assert.ok(documentation.includes("Build 332 — Real User Monitoring"));
assert.ok(roadmap.includes("Build 331 — Production Performance Baseline"));
assert.ok(roadmap.includes("Build 350 — Production Learning VIII"));
assert.ok(security.includes("Build 331 Production Performance Baseline security"));
assert.ok(architecture.includes("Build 331 — Production Performance Baseline"));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build331-review.json")
);
assert.equal(review.build, 331);
assert.equal(review.measuredEvidenceOnly, true);
assert.equal(review.metrics.browserPageLoadPercentiles, false);
assert.equal(review.regressionBudget.automaticReleaseBlocking, false);
assert.equal(review.nextQueuedBuild, 332);
assert.equal(review.ql266Resumed, false);

const pkg = JSON.parse(source("../package.json"));
const verifier =
  "tsx scripts/verify-build-331-production-performance-baseline.ts";
assert.ok(String(pkg.scripts.build).includes(verifier));
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));
assert.equal(String(pkg.scripts["verify:build331"]), verifier);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-330-autonomous-operations-v2-learning-vii.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-331-production-performance-baseline.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-331-production-performance-baseline.ts"
  ) < String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 331 Production Performance Baseline, SLOs & Regression Budgets verification passed."
);
