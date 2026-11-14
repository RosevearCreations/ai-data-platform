import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build393PostRecertificationStability } from "../lib/master-post-recertification-visual-stability";
import {
  BUILD_394,
  BUILD_394_MIN_TREND_WINDOW_HOURS,
  BUILD_394_THEME_VERSION,
  assessBuild394LongHorizonVisualStability
} from "../lib/master-long-horizon-visual-stability-risk";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_394, 394);
assert.equal(BUILD_394_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_394_MIN_TREND_WINDOW_HOURS, 24);

const build393Verified = {
  governanceState: "POST_RECERTIFICATION_STABILITY_VERIFIED"
} as unknown as Build393PostRecertificationStability;

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const trendWindows = shellIds.map((shellId) => ({
  windowId: "trend-" + shellId,
  shellId,
  windowStart: "2026-11-12T19:30:00.000Z",
  windowEnd: "2026-11-13T19:30:00.000Z",
  sampleCount: 4,
  stableRatio: 1,
  recurrenceCount: 0,
  trendState: "STABLE" as const,
  independentlyObserved: true
}));

const controlReviews = shellIds.map((shellId) => ({
  reviewId: "control-" + shellId,
  shellId,
  observedAt: "2026-11-13T19:31:00.000Z",
  controlsExpected: 4,
  controlsHealthy: 4,
  degradationSignals: 0,
  ownerReviewed: true,
  independentlyVerified: true,
  controlState: "HEALTHY" as const
}));

const forecasts = shellIds.map((shellId) => ({
  forecastId: "forecast-" + shellId,
  shellId,
  observedAt: "2026-11-13T19:32:00.000Z",
  horizonHours: 72,
  evidencePoints: 4,
  recurrenceProbabilityBps: 500,
  riskBand: "LOW" as const,
  ownerReviewed: true,
  independentlyVerified: true,
  forecastState: "VERIFIED" as const
}));

const build393Held = {
  governanceState: "RECURRENCE_PREVENTION_AUDIT_REQUIRED"
} as unknown as Build393PostRecertificationStability;
assert.equal(
  assessBuild394LongHorizonVisualStability({
    build393: build393Held,
    trendWindows,
    preventiveControlReviews: controlReviews,
    recurrenceRiskForecasts: forecasts
  }).governanceState,
  "HOLD_BUILD393_NOT_VERIFIED"
);

const missingTrend = assessBuild394LongHorizonVisualStability({
  build393: build393Verified
});
assert.equal(missingTrend.governanceState, "LONG_HORIZON_EVIDENCE_INCOMPLETE");
assert.equal(missingTrend.missingTrendShells.length, 5);

const shortTrend = assessBuild394LongHorizonVisualStability({
  build393: build393Verified,
  trendWindows: trendWindows.map((item) =>
    item.shellId === "icamp"
      ? { ...item, windowStart: "2026-11-13T18:30:00.000Z" }
      : item
  )
});
assert.equal(shortTrend.governanceState, "LONG_HORIZON_EVIDENCE_INCOMPLETE");
assert.deepEqual(shortTrend.insufficientTrendShells, ["icamp"]);

const degradingTrend = assessBuild394LongHorizonVisualStability({
  build393: build393Verified,
  trendWindows: trendWindows.map((item) =>
    item.shellId === "yw"
      ? { ...item, stableRatio: 0.9, trendState: "DEGRADING" as const }
      : item
  )
});
assert.equal(
  degradingTrend.governanceState,
  "VISUAL_STABILITY_TREND_DEGRADING"
);
assert.deepEqual(degradingTrend.degradingTrendShells, ["yw"]);

const needsControls = assessBuild394LongHorizonVisualStability({
  build393: build393Verified,
  trendWindows
});
assert.equal(
  needsControls.governanceState,
  "PREVENTIVE_CONTROL_HEALTH_REQUIRED"
);

const degradedControls = assessBuild394LongHorizonVisualStability({
  build393: build393Verified,
  trendWindows,
  preventiveControlReviews: controlReviews.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          controlsHealthy: 3,
          degradationSignals: 1,
          controlState: "DEGRADED" as const
        }
      : item
  )
});
assert.equal(
  degradedControls.governanceState,
  "PREVENTIVE_CONTROL_DEGRADATION_DETECTED"
);
assert.deepEqual(degradedControls.degradedControlShells, ["rosevear-ai-hub"]);

const needsForecast = assessBuild394LongHorizonVisualStability({
  build393: build393Verified,
  trendWindows,
  preventiveControlReviews: controlReviews
});
assert.equal(
  needsForecast.governanceState,
  "RECURRENCE_RISK_FORECAST_REQUIRED"
);

const elevatedRisk = assessBuild394LongHorizonVisualStability({
  build393: build393Verified,
  trendWindows,
  preventiveControlReviews: controlReviews,
  recurrenceRiskForecasts: forecasts.map((item) =>
    item.shellId === "icamp"
      ? {
          ...item,
          recurrenceProbabilityBps: 4200,
          riskBand: "HIGH" as const
        }
      : item
  )
});
assert.equal(elevatedRisk.governanceState, "RECURRENCE_RISK_ELEVATED");
assert.deepEqual(elevatedRisk.elevatedRiskShells, ["icamp"]);

const verified = assessBuild394LongHorizonVisualStability({
  build393: build393Verified,
  trendWindows,
  preventiveControlReviews: controlReviews,
  recurrenceRiskForecasts: forecasts
});
assert.equal(
  verified.governanceState,
  "LONG_HORIZON_VISUAL_STABILITY_VERIFIED"
);

const migration = source(
  "../../db/migrations/0157_master_long_horizon_visual_stability_risk.sql"
);
for (const token of [
  "master_build394_visual_stability_trend_windows",
  "master_build394_preventive_control_health_reviews",
  "master_build394_recurrence_risk_forecasts",
  "DEGRADING",
  "DEGRADED",
  "CRITICAL",
  "86400",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source("../../docs/BUILD_394_LONG_HORIZON_VISUAL_STABILITY_RISK.md");
for (const token of [
  "at least 24 hours",
  "zero degradation signals",
  "at least three evidence points",
  "High or critical risk blocks long-horizon closure",
  "Deployment GREEN cannot erase trend degradation"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 394 long-horizon governance"));
assert.ok(masterPage.includes("Recurrence risk forecasting"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build394_visual_stability_trend_windows"',
  '"master_build394_preventive_control_health_reviews"',
  '"master_build394_recurrence_risk_forecasts"',
  '"0157_master_long_horizon_visual_stability_risk.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-394-long-horizon-visual-stability-risk.ts";
assert.equal(String(pkg.scripts["verify:build394"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 394 Long-Horizon Visual Stability Trend Correlation, Preventive-Control Degradation Detection & Cross-Shell Recurrence Risk Forecasting verification passed."
);
