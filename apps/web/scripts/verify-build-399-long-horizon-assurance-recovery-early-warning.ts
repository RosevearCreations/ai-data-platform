import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build398AssuranceRenewal } from "../lib/master-confidence-stability-persistence-drift-assurance-renewal";
import {
  BUILD_399,
  BUILD_399_MAX_MANAGED_DROP_BPS,
  BUILD_399_MAX_RECOVERY_RESIDUAL_DRIFT_BPS,
  BUILD_399_MIN_CONFIDENCE_BPS,
  BUILD_399_THEME_VERSION,
  BUILD_399_WATCH_DROP_BPS,
  assessBuild399LongHorizonGovernance
} from "../lib/master-long-horizon-assurance-recovery-early-warning";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_399, 399);
assert.equal(BUILD_399_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_399_MIN_CONFIDENCE_BPS, 7000);
assert.equal(BUILD_399_WATCH_DROP_BPS, 500);
assert.equal(BUILD_399_MAX_MANAGED_DROP_BPS, 1000);
assert.equal(BUILD_399_MAX_RECOVERY_RESIDUAL_DRIFT_BPS, 250);

const build398Verified = {
  governanceState: "POST_RECALIBRATION_ASSURANCE_RENEWED"
} as unknown as Build398AssuranceRenewal;

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const stability = shellIds.map((shellId) => ({
  observationId: "stability-" + shellId,
  shellId,
  observedAt: "2026-11-14T04:00:00.000Z",
  observationWindowHours: 72,
  renewalCount: 3,
  missedRenewalCount: 0,
  evidenceCurrent: true,
  ownerReviewed: true,
  independentlyVerified: true,
  stabilityState: "STABLE" as const
}));

const recovery = shellIds.map((shellId) => ({
  recoveryId: "recovery-" + shellId,
  shellId,
  observedAt: "2026-11-14T04:01:00.000Z",
  driftOccurred: false,
  preRecoveryDriftBps: 0,
  postRecoveryDriftBps: 0,
  recoveryWindowHours: 0,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  recoveryState: "NOT_REQUIRED" as const
}));

const warnings = shellIds.map((shellId) => ({
  warningId: "warning-" + shellId,
  shellId,
  observedAt: "2026-11-14T04:02:00.000Z",
  currentConfidenceBps: 8500,
  projectedConfidenceBps: 8200,
  forecastHorizonHours: 24,
  sampleCount: 5,
  ownerAcknowledged: true,
  mitigationReady: true,
  independentlyVerified: true,
  warningState: "CLEAR" as const
}));

const build398Held = {
  governanceState: "ESCALATION_ASSURANCE_RENEWAL_INVALID"
} as unknown as Build398AssuranceRenewal;
assert.equal(
  assessBuild399LongHorizonGovernance({
    build398: build398Held,
    assuranceStability: stability,
    recoveryEffectiveness: recovery,
    confidenceEarlyWarning: warnings
  }).governanceState,
  "HOLD_BUILD398_NOT_RENEWED"
);

const missingStability = assessBuild399LongHorizonGovernance({
  build398: build398Verified
});
assert.equal(
  missingStability.governanceState,
  "LONG_HORIZON_RENEWAL_STABILITY_REQUIRED"
);
assert.equal(missingStability.missingStabilityShells.length, 5);

const unstable = assessBuild399LongHorizonGovernance({
  build398: build398Verified,
  assuranceStability: stability.map((item) =>
    item.shellId === "icamp"
      ? { ...item, missedRenewalCount: 1, stabilityState: "UNSTABLE" as const }
      : item
  )
});
assert.equal(unstable.governanceState, "LONG_HORIZON_RENEWAL_UNSTABLE");
assert.deepEqual(unstable.unstableRenewalShells, ["icamp"]);

const missingRecovery = assessBuild399LongHorizonGovernance({
  build398: build398Verified,
  assuranceStability: stability
});
assert.equal(
  missingRecovery.governanceState,
  "DRIFT_RECOVERY_EFFECTIVENESS_REQUIRED"
);

const ineffectiveRecovery = assessBuild399LongHorizonGovernance({
  build398: build398Verified,
  assuranceStability: stability,
  recoveryEffectiveness: recovery.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          driftOccurred: true,
          preRecoveryDriftBps: 800,
          postRecoveryDriftBps: 600,
          recoveryWindowHours: 48,
          recoveryState: "INEFFECTIVE" as const
        }
      : item
  )
});
assert.equal(
  ineffectiveRecovery.governanceState,
  "PERSISTENCE_DRIFT_RECOVERY_INEFFECTIVE"
);
assert.deepEqual(ineffectiveRecovery.ineffectiveRecoveryShells, ["rosevear-ai-hub"]);

const missingWarning = assessBuild399LongHorizonGovernance({
  build398: build398Verified,
  assuranceStability: stability,
  recoveryEffectiveness: recovery
});
assert.equal(
  missingWarning.governanceState,
  "CONFIDENCE_EARLY_WARNING_REQUIRED"
);

const misclassifiedAction = assessBuild399LongHorizonGovernance({
  build398: build398Verified,
  assuranceStability: stability,
  recoveryEffectiveness: recovery,
  confidenceEarlyWarning: warnings.map((item) =>
    item.shellId === "yw"
      ? {
          ...item,
          currentConfidenceBps: 7600,
          projectedConfidenceBps: 6400,
          warningState: "WATCH" as const
        }
      : item
  )
});
assert.equal(
  misclassifiedAction.governanceState,
  "CONFIDENCE_DEGRADATION_ACTION_REQUIRED"
);
assert.deepEqual(misclassifiedAction.actionRequiredShells, ["yw"]);

const managedWatch = warnings.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        currentConfidenceBps: 8200,
        projectedConfidenceBps: 7500,
        warningState: "WATCH" as const
      }
    : item
);
const effectiveRecovery = recovery.map((item) =>
  item.shellId === "rosevear-ai-hub"
    ? {
        ...item,
        driftOccurred: true,
        preRecoveryDriftBps: 800,
        postRecoveryDriftBps: 200,
        recoveryWindowHours: 72,
        recoveryState: "EFFECTIVE" as const
      }
    : item
);

const verified = assessBuild399LongHorizonGovernance({
  build398: build398Verified,
  assuranceStability: stability,
  recoveryEffectiveness: effectiveRecovery,
  confidenceEarlyWarning: managedWatch
});
assert.equal(
  verified.governanceState,
  "LONG_HORIZON_ASSURANCE_GOVERNANCE_VERIFIED"
);

const migration = source(
  "../../db/migrations/0162_master_long_horizon_assurance_recovery_confidence_warning.sql"
);
for (const token of [
  "master_build399_long_horizon_assurance_stability",
  "master_build399_persistence_drift_recovery_effectiveness",
  "master_build399_confidence_degradation_early_warnings",
  "renewal_count >= 3",
  "post_recovery_drift_bps <= 250",
  "projected_confidence_bps < 7000",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_399_LONG_HORIZON_ASSURANCE_RECOVERY_CONFIDENCE_WARNING.md"
);
for (const token of [
  "at least a 72-hour observation window",
  "residual drift no greater than 250 basis points",
  "A projected drop of up to 500 basis points remains CLEAR",
  "requires ACTION",
  "Deployment GREEN cannot substitute for long-horizon assurance"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 399 long-horizon governance"));
assert.ok(masterPage.includes("Assurance renewal stability"));
assert.ok(masterPage.includes("Drift recovery effectiveness"));
assert.ok(masterPage.includes("Confidence degradation early warning"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build399_long_horizon_assurance_stability"',
  '"master_build399_persistence_drift_recovery_effectiveness"',
  '"master_build399_confidence_degradation_early_warnings"',
  '"0162_master_long_horizon_assurance_recovery_confidence_warning.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-399-long-horizon-assurance-recovery-early-warning.ts";
assert.equal(String(pkg.scripts["verify:build399"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 399 Long-Horizon Assurance Renewal Stability, Persistence Drift Recovery Effectiveness & Cross-Shell Confidence Degradation Early-Warning Governance verification passed."
);
