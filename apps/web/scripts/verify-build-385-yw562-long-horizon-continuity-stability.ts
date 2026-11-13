import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build384PostRecoveryContinuityWatchModel } from "../lib/yw562-post-recovery-continuity-watch";
import {
  BUILD_385,
  BUILD_385_CONTROLLER_BASE_REVISION,
  composeBuild385LongHorizonContinuityStability
} from "../lib/yw562-long-horizon-continuity-stability";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_385, 385);
assert.equal(
  BUILD_385_CONTROLLER_BASE_REVISION,
  "89786962864596ed702ceafae123a32d65340041"
);

const connected384 = {
  connectionState: "CONNECTED"
} as unknown as Build384PostRecoveryContinuityWatchModel;

const stableSamples = [0,1,2,3,4,5].map((index) => ({
  sampleId: "sample-" + index,
  observedAt: new Date(Date.parse("2026-11-13T01:50:00.000Z") - index * 60 * 60_000).toISOString(),
  connectionState: "CONNECTED" as const,
  recurrenceDetected: false,
  masterReceiptsHealthy: true
}));

const controls = [{
  controlId: "renewal-drift-prevention",
  aiHubEffective: true,
  commsEffective: true,
  controllerEffective: true,
  independentlyVerified: true
}];

const stable = composeBuild385LongHorizonContinuityStability({
  build384: connected384,
  stabilitySamples: stableSamples,
  preventiveControls: controls,
  now: new Date("2026-11-13T01:50:00.000Z")
});
assert.equal(stable.continuityStabilityState, "LONG_HORIZON_STABLE");
assert.equal(stable.trendState, "NO_RECURRENCE_TREND");
assert.equal(stable.preventiveControlEffectivenessState, "THREE_MASTER_CONTROLS_EFFECTIVE");
assert.equal(stable.connectionState, "CONNECTED");

const recurrent = composeBuild385LongHorizonContinuityStability({
  build384: connected384,
  stabilitySamples: [
    ...stableSamples.slice(0,4),
    {...stableSamples[4], recurrenceDetected:true},
    {...stableSamples[5], recurrenceDetected:true}
  ],
  preventiveControls: controls,
  now: new Date("2026-11-13T01:50:00.000Z")
});
assert.equal(recurrent.trendState, "RECURRING_DRIFT_TREND");
assert.equal(recurrent.connectionState, "DISCONNECTED_HOLD");

const migration = source(
  "../../db/migrations/0149_master_yw562_long_horizon_continuity_stability.sql"
);
for (const token of [
  "master_build385_long_horizon_stability_samples",
  "master_build385_recurrence_trend_events",
  "master_build385_preventive_control_effectiveness_reviews",
  "THREE_MASTER_CONTROLS_EFFECTIVE",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build385_long_horizon_stability_samples"',
  '"master_build385_recurrence_trend_events"',
  '"master_build385_preventive_control_effectiveness_reviews"',
  '"0149_master_yw562_long_horizon_continuity_stability.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-385-yw562-long-horizon-continuity-stability.ts";
assert.equal(String(pkg.scripts["verify:build385"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 385 Long-Horizon Continuity Stability, Recurrence Trend Correlation & Three-Master Preventive-Control Effectiveness Review verification passed."
);
