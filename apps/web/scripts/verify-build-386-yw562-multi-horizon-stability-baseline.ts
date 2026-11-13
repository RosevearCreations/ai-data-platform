import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build385LongHorizonContinuityStabilityModel } from "../lib/yw562-long-horizon-continuity-stability";
import {
  BUILD_386,
  BUILD_386_CONTROLLER_BASE_REVISION,
  composeBuild386MultiHorizonStabilityBaseline
} from "../lib/yw562-multi-horizon-stability-baseline";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_386, 386);
assert.equal(
  BUILD_386_CONTROLLER_BASE_REVISION,
  "3630ffcd668d63961411589c93b88141ee46abfb"
);

const connected385 = {
  connectionState: "CONNECTED"
} as unknown as Build385LongHorizonContinuityStabilityModel;

const now = new Date("2026-11-13T02:20:00.000Z");
const horizonSamples = Array.from({length:12}, (_, index) => ({
  sampleId: "sample-" + index,
  observedAt: new Date(now.getTime() - index * 2 * 60 * 60_000).toISOString(),
  connectionState: "CONNECTED" as const,
  stabilityRatio: 1,
  preventiveControlsHealthy: true
}));

const healthy = composeBuild386MultiHorizonStabilityBaseline({
  build385: connected385,
  horizonSamples,
  preventiveControlSignals: [{
    controlId: "renewal-drift-prevention",
    previousScore: 0.99,
    currentScore: 0.98,
    aiHubAcknowledged: true,
    commsAcknowledged: true,
    controllerAcknowledged: true
  }],
  now
});
assert.equal(healthy.baselineComplete, true);
assert.equal(healthy.baselineHealthy, true);
assert.equal(healthy.degradationState, "NO_DEGRADATION_DETECTED");
assert.equal(healthy.earlyWarningState, "BASELINE_HEALTHY");
assert.equal(healthy.connectionState, "CONNECTED");

const degraded = composeBuild386MultiHorizonStabilityBaseline({
  build385: connected385,
  horizonSamples,
  preventiveControlSignals: [{
    controlId: "renewal-drift-prevention",
    previousScore: 0.99,
    currentScore: 0.80,
    aiHubAcknowledged: true,
    commsAcknowledged: false,
    controllerAcknowledged: true
  }],
  now
});
assert.equal(degraded.degradationState, "DEGRADATION_ESCALATION_REQUIRED");
assert.equal(degraded.earlyWarningState, "EARLY_WARNING_ACTIVE");
assert.equal(degraded.connectionState, "DISCONNECTED_HOLD");

const migration = source(
  "../../db/migrations/0150_master_yw562_multi_horizon_stability_baseline.sql"
);
for (const token of [
  "master_build386_multi_horizon_stability_samples",
  "master_build386_preventive_control_degradation_events",
  "master_build386_early_warning_escalation_audits",
  "DEGRADATION_ESCALATION_REQUIRED",
  "EARLY_WARNING_ACTIVE",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build386_multi_horizon_stability_samples"',
  '"master_build386_preventive_control_degradation_events"',
  '"master_build386_early_warning_escalation_audits"',
  '"0150_master_yw562_multi_horizon_stability_baseline.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-386-yw562-multi-horizon-stability-baseline.ts";
assert.equal(String(pkg.scripts["verify:build386"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 386 Multi-Horizon Stability Baseline, Preventive-Control Degradation Detection & Three-Master Early-Warning Escalation Audit verification passed."
);
