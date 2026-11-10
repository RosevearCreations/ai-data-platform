import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  CAPACITY_WORKLOAD_FORECASTING_BUILD,
  composeCapacityWorkloadForecast
} from "../lib/capacity-workload-forecasting";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(CAPACITY_WORKLOAD_FORECASTING_BUILD, 356);

const model = composeCapacityWorkloadForecast({
  generatedAt: new Date("2026-11-10T13:55:00.000Z"),
  capacity: {
    schema: "ai-data-platform.capacity-planning.v1",
    generatedAt: "2026-11-10T13:55:00.000Z",
    scenario: {
      id: "growth",
      label: "Moderate growth",
      multiplier: 1.5,
      description: "Plans for approximately 50% more measured operational usage."
    },
    scenarios: [],
    workspaces: [],
    totals: {
      storageBytes: 1000,
      recordVolume: 100,
      providerUnits: 20,
      collectionAttempts: 40,
      integrationEvents: 60,
      retentionRows: 10
    },
    forecastTotals: {
      storageBytes: 1500,
      recordVolume: 150,
      providerUnits: 30,
      collectionAttempts: 60,
      integrationEvents: 90,
      retentionRows: 15
    },
    billingBoundary: {
      actualBillingImported: false,
      currencyPricingApplied: false,
      estimatesAreOperationalProxies: true
    }
  },
  observatory: {
    api: [
      {
        operationKey: "api.example",
        state: "needs-attention",
        p95Ms: 1200,
        failureRatePct: 0
      }
    ],
    database: [
      {
        operationKey: "database.example",
        state: "good",
        p95Ms: 50,
        failureRatePct: 0,
        maxPoolWaiting: 1
      }
    ],
    dependencies: [],
    pools: {
      maxObservedAppWaiting: 1
    }
  }
});

assert.equal(model.forecasts.length, 6);
assert.equal(model.policy.measuredEvidenceOnly, true);
assert.equal(model.policy.missingEvidenceIsSuccess, false);
assert.equal(model.policy.automaticScaling, false);
assert.equal(model.policy.automaticPurchasing, false);
assert.equal(model.policy.automaticProviderUpgrade, false);
assert.equal(model.policy.automaticStaffingChange, false);
assert.equal(model.policy.automaticScheduleMutation, false);
assert.equal(model.policy.automaticRetentionDeletion, false);
assert.equal(model.policy.automaticSourceAppMutation, false);
assert.equal(model.policy.operatorApprovalRequired, true);
assert.equal(model.policy.rollbackRequired, true);
assert.equal(model.boundaries.hardInfrastructureCapacityImported, false);
assert.equal(model.boundaries.cloudProviderQuotasImported, false);
assert.equal(model.boundaries.staffingCapacityImported, false);
assert.equal(model.boundaries.headroomClaimedWithoutLimitEvidence, false);
assert.ok(model.forecasts.every((item) => item.headroomKnown === false));
assert.ok(model.forecasts.every((item) => item.knownHardCapacity === null));
assert.ok(model.forecasts.some((item) => item.pressure === "ATTENTION"));

const page = source("app/capacity-workload-forecasting/page.tsx");
for (const token of [
  "Capacity, Workload, Resource &amp; Demand Forecasting",
  "Demand forecast, not a hard-capacity claim.",
  "Where demand pressure needs attention",
  "No automatic capacity action."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/capacity-workload-forecasting"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/capacity-workload-forecasting"'));

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(
  roadmap.includes(
    "Build 356 — Moderate Capacity, Workload, Resource & Demand Forecasting"
  )
);

const documentation = source(
  "../../docs/BUILD_356_CAPACITY_WORKLOAD_RESOURCE_DEMAND_FORECASTING.md"
);
assert.ok(documentation.includes("Hard capacity remains unknown"));
assert.ok(documentation.includes("Build 357"));

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-356-capacity-workload-resource-demand-forecasting.ts";
assert.equal(String(pkg.scripts["verify:build356"]), verifier);
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));

console.log(
  "Build 356 Moderate Capacity, Workload, Resource & Demand Forecasting verification passed."
);
