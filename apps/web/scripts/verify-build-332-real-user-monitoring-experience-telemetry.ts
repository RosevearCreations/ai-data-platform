import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  experienceTelemetryPolicy,
  rateExperienceMetric,
  sanitizeExperienceRoute
} from "../lib/experience-telemetry";

const root = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function count(value: string, token: string) {
  return value.split(token).length - 1;
}

assert.equal(
  sanitizeExperienceRoute(
    "/customer/550e8400-e29b-41d4-a716-446655440000?token=secret"
  ),
  "/customer/:id"
);
assert.equal(
  sanitizeExperienceRoute("/jobs/123456?customer=private"),
  "/jobs/:id"
);
assert.equal(rateExperienceMetric("lcp_ms", 2000), "good");
assert.equal(rateExperienceMetric("lcp_ms", 3500), "needs-improvement");
assert.equal(rateExperienceMetric("lcp_ms", 5000), "poor");
assert.equal(rateExperienceMetric("cls_score", 0.05), "good");
assert.equal(experienceTelemetryPolicy.rawUrlsStored, false);
assert.equal(experienceTelemetryPolicy.queryStringsStored, false);
assert.equal(experienceTelemetryPolicy.domTextStored, false);
assert.equal(experienceTelemetryPolicy.customerDataStored, false);
assert.equal(experienceTelemetryPolicy.automaticOptimization, false);

const migration = source(
  "../../db/migrations/0115_real_user_experience_telemetry.sql"
);
for (const token of [
  "experience_telemetry_events",
  "enable row level security",
  "grant select, insert",
  "revoke update, delete",
  "route_transition_ms",
  "inp_ms",
  "lcp_ms",
  "cls_score"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}

const database = source("lib/experience-telemetry-database.ts");
for (const token of [
  "recordExperienceTelemetry",
  "listExperienceTelemetryForUser",
  "percentile_cont(0.50)",
  "percentile_cont(0.75)",
  "percentile_cont(0.95)",
  "on conflict (event_id) do nothing",
  "sanitizeExperienceRoute"
]) {
  assert.ok(database.includes(token), "database token " + token);
}

const api = source("app/api/experience-telemetry/route.ts");
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("recordExperienceTelemetry"));
assert.ok(api.includes("Cache-Control"));
assert.ok(api.includes("status: 204"));

const collector = source("app/ExperienceTelemetryCollector.tsx");
for (const token of [
  "PerformanceObserver",
  "largest-contentful-paint",
  "layout-shift",
  "route_transition_ms",
  "long_task_ms",
  "sanitizeExperienceRoute",
  "MAX_EVENTS_PER_PAGE",
  "keepalive: true"
]) {
  assert.ok(collector.includes(token), "collector token " + token);
}
assert.ok(!collector.includes("location.search"));
assert.ok(!collector.includes("innerText"));
assert.ok(!collector.includes("textContent"));

const page = source("app/experience-telemetry/page.tsx");
assert.ok(page.includes("Experience Telemetry"));
assert.ok(page.includes("Privacy-minimized RUM only."));
assert.ok(page.includes("Current I.T. truth model"));

const shell = source("app/application-shell.tsx");
assert.ok(shell.includes("<ExperienceTelemetryCollector />"));
assert.ok(
  shell.includes(
    'pathname.startsWith("/integration-health") ? "opsTopLink active"'
  )
);
assert.ok(shell.includes('href="/integration-health">System Status</Link>'));

const navigation = source("lib/application-navigation.ts");
assert.equal(count(navigation, 'href: "/experience-telemetry"'), 1);
assert.equal(count(navigation, 'href: "/performance-baseline"'), 1);
assert.equal(count(navigation, 'href: "/owner-acceptance"'), 0);
assert.equal(count(navigation, 'href: "/evidence-baseline"'), 0);

const moduleTools = source("lib/module-operator-tools.ts");
assert.ok(!moduleTools.includes('itemHrefs: ["/performance-baseline"]'));

const registry = source("lib/app-connection-registry.ts");
assert.ok(registry.includes('connectionState: "UNMEASURED"'));
assert.ok(registry.includes("legacyQl266PrerequisiteRetired: true"));
assert.ok(!registry.includes("connectionState: INTEGRATION_V1_STATUS"));

const health = source("lib/integration-health-command-center.ts");
const healthClient = source(
  "app/integration-health/IntegrationHealthCommandCenter.tsx"
);
assert.ok(health.includes("unmeasuredPeers"));
assert.ok(
  health.includes(
    "Legacy QL-266 disconnected state is retired"
  )
);
assert.ok(health.includes("legacyQl266PrerequisiteRetired:true"));
assert.ok(healthClient.includes("peer states awaiting current evidence"));
assert.ok(healthClient.includes("Legacy QL-266 prerequisite retired"));

for (const path of [
  "app/app-connections/page.tsx",
  "app/connector-setup/page.tsx",
  "app/credential-vault/page.tsx",
  "app/connection-validation/page.tsx",
  "app/data-contracts/page.tsx",
  "app/field-mappings/page.tsx",
  "app/schema-drift/page.tsx",
  "app/integration-health/page.tsx"
]) {
  const active = source(path);
  assert.ok(
    !active.includes("QL-266 remains UNDER_REVIEW"),
    path + " still presents QL-266 as active"
  );
  assert.ok(
    !active.includes("UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED"),
    path + " still presents retired QL-266 triplet as active"
  );
}

const delivery = source("app/integration-delivery/page.tsx");
assert.ok(delivery.includes("Legacy QL-266 retired"));
assert.ok(!delivery.includes("QL-266 under review</OperationsStatusBadge>"));
assert.ok(!delivery.includes('value: "UNDER REVIEW"'));
assert.ok(!delivery.includes('state="UNDER REVIEW"'));

const ownerAcceptance = source("app/owner-acceptance/page.tsx");
assert.ok(ownerAcceptance.includes("Historical checkpoint"));
assert.ok(
  ownerAcceptance.includes("not a current") &&
    ownerAcceptance.includes("prerequisite")
);

const ql365dHistorical = JSON.parse(
  source("../../docs/integration/ql365d-ai-data-platform-attachment-status.json")
);
assert.equal(ql365dHistorical.lifecycle.state, "HISTORICAL_SNAPSHOT");
assert.equal(ql365dHistorical.lifecycle.currentPrerequisite, false);
assert.equal(ql365dHistorical.connected, false);

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build332-review.json")
);
assert.equal(review.build, 332);
assert.equal(review.itTruthCleanup.ql266GlobalPrerequisiteRetired, true);
assert.equal(review.itTruthCleanup.unknownPeerState, "UNMEASURED");
assert.equal(review.privacy.rawUrlsStored, false);
assert.equal(review.nextQueuedBuild, 333);

const retirement = source("../../docs/IT_TRUTH_RETIREMENT_BUILD_332.md");
assert.ok(retirement.includes("Retired from the active task queue"));
assert.ok(retirement.includes("Still authoritative"));
assert.ok(retirement.includes("UNMEASURED"));

const documentation = source(
  "../../docs/BUILD_332_REAL_USER_MONITORING_INTERACTION_EXPERIENCE_TELEMETRY.md"
);
assert.ok(
  documentation.includes(
    "Build 333 — Route Performance, Core Web Vitals & Rendering Diagnostics"
  )
);

const compactDb = source("scripts/verify-ci-integration-spine-database.ts");
assert.equal(count(compactDb, '"experience_telemetry_events"'), 2);

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-332-real-user-monitoring-experience-telemetry.ts";
assert.equal(String(pkg.scripts["verify:build332"]), verifier);
assert.ok(String(pkg.scripts.build).includes(verifier));
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-331-production-performance-baseline.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-332-real-user-monitoring-experience-telemetry.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-332-real-user-monitoring-experience-telemetry.ts"
  ) < String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 332 Real User Monitoring, Interaction Timing & Experience Telemetry verification passed."
);
