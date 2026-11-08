import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  classifyRoutePerformance,
  routePerformancePolicy
} from "../lib/route-performance-diagnostics";
import { rateExperienceMetric } from "../lib/experience-telemetry";

const root = resolve(process.cwd());
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

assert.equal(rateExperienceMetric("hydration_ready_ms", 800), "good");
assert.equal(rateExperienceMetric("hydration_ready_ms", 1800), "needs-improvement");
assert.equal(rateExperienceMetric("hydration_ready_ms", 3000), "poor");

assert.equal(
  classifyRoutePerformance({
    lcpP75: 2000,
    clsP75: 0.05,
    inpP75: 150,
    routeTransitionP75: 300,
    hydrationReadyP75: 700,
    longTaskP95: 80
  }),
  "good"
);
assert.equal(
  classifyRoutePerformance({
    lcpP75: 3200,
    clsP75: 0.08,
    inpP75: 180,
    routeTransitionP75: 300,
    hydrationReadyP75: 700,
    longTaskP95: 80
  }),
  "needs-attention"
);
assert.equal(
  classifyRoutePerformance({
    lcpP75: 4500,
    clsP75: null,
    inpP75: null,
    routeTransitionP75: null,
    hydrationReadyP75: null,
    longTaskP95: null
  }),
  "poor"
);
assert.equal(
  classifyRoutePerformance({
    lcpP75: null,
    clsP75: null,
    inpP75: null,
    routeTransitionP75: null,
    hydrationReadyP75: null,
    longTaskP95: null
  }),
  "unmeasured"
);

assert.equal(routePerformancePolicy.hydrationIsCoreWebVital, false);
assert.equal(routePerformancePolicy.rawUrlsStored, false);
assert.equal(routePerformancePolicy.automaticOptimization, false);
assert.equal(routePerformancePolicy.automaticReleaseBlocking, false);
assert.equal(routePerformancePolicy.syntheticEvidenceTreatedAsLive, false);

const telemetry = source("lib/experience-telemetry.ts");
assert.ok(telemetry.includes('"hydration_ready_ms"'));
assert.ok(telemetry.includes('"hydration"'));

const migration = source("../../db/migrations/0116_route_performance_rendering_diagnostics.sql");
for (const token of [
  "hydration_ready_ms",
  "experience_telemetry_events_metric_key_check",
  "experience_telemetry_events_sample_kind_check",
  "'hydration'"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}

const collector = source("app/ExperienceTelemetryCollector.tsx");
assert.ok(collector.includes('enqueue("hydration_ready_ms"'));
assert.ok(collector.includes("performance.now()"));
assert.ok(collector.includes("not a Core Web Vital"));
assert.ok(!collector.includes("location.search"));
assert.ok(!collector.includes("innerText"));
assert.ok(!collector.includes("textContent"));

const database = source("lib/experience-telemetry-database.ts");
for (const token of [
  "listRoutePerformanceDiagnosticsForUser",
  "lcp_p75",
  "cls_p75",
  "inp_p75",
  "route_transition_p75",
  "hydration_ready_p75",
  "long_task_p95",
  "classifyRoutePerformance"
]) {
  assert.ok(database.includes(token), "database token " + token);
}

const api = source("app/api/route-performance/route.ts");
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("listRoutePerformanceDiagnosticsForUser"));
assert.ok(api.includes("Cache-Control"));

const page = source("app/route-performance/page.tsx");
assert.ok(page.includes("Rendering Diagnostics"));
assert.ok(page.includes("Core Web Vitals"));
assert.ok(page.includes("Hydration-ready"));
assert.ok(page.replace(/\\s+/g, " ").includes("does not automatically optimize production"));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/route-performance"'));
assert.ok(navigation.includes('label: "Route Performance"'));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build333-review.json")
);
assert.equal(review.build, 333);
assert.deepEqual(review.analysis.coreWebVitals, ["lcp_ms", "cls_score", "inp_ms"]);
assert.equal(review.hydration.coreWebVital, false);
assert.equal(review.safety.automaticOptimization, false);
assert.equal(review.safety.automaticReleaseBlocking, false);
assert.equal(review.nextQueuedBuild, 334);

const documentation = source(
  "../../docs/BUILD_333_ROUTE_PERFORMANCE_CORE_WEB_VITALS_RENDERING_DIAGNOSTICS.md"
);
assert.ok(documentation.includes("Missing evidence never becomes success"));
assert.ok(
  documentation.includes(
    "Build 334 — API, Database Query & Dependency Performance Observatory"
  )
);

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-333-route-performance-rendering-diagnostics.ts";
assert.equal(String(pkg.scripts["verify:build333"]), verifier);
assert.ok(String(pkg.scripts.build).includes(verifier));
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-332-real-user-monitoring-experience-telemetry.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-333-route-performance-rendering-diagnostics.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-333-route-performance-rendering-diagnostics.ts"
  ) < String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 333 Route Performance, Core Web Vitals & Rendering Diagnostics verification passed."
);
