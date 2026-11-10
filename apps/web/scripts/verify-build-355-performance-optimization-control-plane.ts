import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  PERFORMANCE_OPTIMIZATION_CONTROL_PLANE_BUILD,
  composePerformanceOptimizationControlPlane
} from "../lib/performance-optimization-control-plane";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(PERFORMANCE_OPTIMIZATION_CONTROL_PLANE_BUILD, 355);

const model = composePerformanceOptimizationControlPlane({
  generatedAt: new Date("2026-11-10T13:40:00.000Z"),
  baseline: {
    live: {
      overallState: "attention",
      budgetResults: [
        { metricKey: "database_probe_ms", status: "warning" },
        { metricKey: "connector_p95_ms", status: "critical" }
      ],
      regressions: [
        {
          metricKey: "database_probe_ms",
          regressed: true,
          comparable: true
        }
      ]
    }
  },
  routes: {
    routes: [
      {
        routeFamily: "/master-shell-command-center",
        status: "needs-attention",
        lcpP75: 3000,
        clsP75: 0.05,
        inpP75: 180,
        routeTransitionP75: 700,
        hydrationReadyP75: 1200,
        longTaskP95: 140
      }
    ]
  },
  observatory: {
    api: [
      {
        operationKey: "api.master-shell-command-center.get",
        state: "needs-attention",
        p95Ms: 1400,
        failureRatePct: 0
      }
    ],
    database: [
      {
        operationKey: "database.authorized-probe",
        state: "needs-attention",
        p95Ms: 180,
        failureRatePct: 0,
        maxPoolWaiting: 2
      }
    ],
    dependencies: [
      {
        connectorKey: "rosevear-comms-hub",
        state: "poor",
        p95Ms: 6000,
        failureRatePct: 12
      }
    ],
    pools: {
      maxObservedAppWaiting: 2
    }
  }
});

assert.ok(model.candidates.some((item) => item.area === "CACHE"));
assert.ok(model.candidates.some((item) => item.area === "QUERY"));
assert.ok(model.candidates.some((item) => item.area === "RENDER"));
assert.ok(model.candidates.some((item) => item.area === "DEPENDENCY"));
assert.ok(model.candidates.every((item) => item.automaticApply === false));
assert.ok(model.candidates.every((item) => item.approvalRequired === true));

assert.equal(model.policy.measuredEvidenceOnly, true);
assert.equal(model.policy.missingEvidenceIsSuccess, false);
assert.equal(model.policy.automaticOptimization, false);
assert.equal(model.policy.automaticCacheActivation, false);
assert.equal(model.policy.automaticQueryRewrite, false);
assert.equal(model.policy.automaticIndexCreation, false);
assert.equal(model.policy.automaticRenderingRewrite, false);
assert.equal(model.policy.automaticPoolResize, false);
assert.equal(model.policy.ownerOrOperatorApprovalRequired, true);
assert.equal(model.policy.rollbackRequired, true);

assert.equal(model.controls.cache.defaultAuthenticatedResponse, "NO_STORE");
assert.equal(model.controls.cache.secretCachingAllowed, false);
assert.equal(model.controls.query.automaticIndexCreation, false);
assert.equal(model.controls.query.automaticPoolResize, false);
assert.equal(model.controls.render.automaticStaticConversion, false);
assert.equal(model.controls.render.authorizationBoundaryMustBePreserved, true);
assert.equal(model.controls.dependency.sourceAuthorityPreserved, true);

const page = source("app/performance-optimization-control-plane/page.tsx");
for (const token of [
  "Performance Optimization Control Plane",
  "Measured, reversible change plans",
  "Authorization-safe caching",
  "Measured database optimization",
  "Rendering and hydration",
  "External dependency tuning"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(
  navigation.includes('href: "/performance-optimization-control-plane"')
);

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(
  operatorTools.includes('"/performance-optimization-control-plane"')
);

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(
  roadmap.includes(
    "Build 355 — Moderate Performance Optimization, Caching, Query & Rendering Control Plane"
  )
);

const documentation = source(
  "../../docs/BUILD_355_PERFORMANCE_OPTIMIZATION_CONTROL_PLANE.md"
);
assert.ok(documentation.includes("No automatic optimization"));
assert.ok(documentation.includes("Build 356"));

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-355-performance-optimization-control-plane.ts";
assert.equal(String(pkg.scripts["verify:build355"]), verifier);
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));

console.log(
  "Build 355 Moderate Performance Optimization, Caching, Query & Rendering Control Plane verification passed."
);
