import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build399LongHorizonGovernance } from "../lib/master-long-horizon-assurance-recovery-early-warning";
import {
  BUILD_400,
  BUILD_400_MIN_CONFIDENCE_BPS,
  BUILD_400_MIN_RESPONSE_RECOVERY_BPS,
  BUILD_400_PREDICTIVE_ACTION_DROP_BPS,
  BUILD_400_PREDICTIVE_WATCH_DROP_BPS,
  BUILD_400_THEME_VERSION,
  assessBuild400PredictiveRenewalGovernance
} from "../lib/master-warning-response-assurance-recovery-predictive-renewal";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_400, 400);
assert.equal(BUILD_400_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_400_MIN_CONFIDENCE_BPS, 7000);
assert.equal(BUILD_400_MIN_RESPONSE_RECOVERY_BPS, 250);
assert.equal(BUILD_400_PREDICTIVE_WATCH_DROP_BPS, 500);
assert.equal(BUILD_400_PREDICTIVE_ACTION_DROP_BPS, 1000);

const build399Verified = {
  governanceState: "LONG_HORIZON_ASSURANCE_GOVERNANCE_VERIFIED"
} as unknown as Build399LongHorizonGovernance;

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const responses = shellIds.map((shellId) => ({
  responseId: "response-" + shellId,
  shellId,
  observedAt: "2026-11-14T13:45:00.000Z",
  warningTriggered: false,
  preResponseProjectedConfidenceBps: 8200,
  postResponseObservedConfidenceBps: 8200,
  responseWindowHours: 0,
  sampleCount: 0,
  ownerReviewed: true,
  independentlyVerified: true,
  responseState: "NOT_REQUIRED" as const
}));

const recoveries = shellIds.map((shellId) => ({
  recoveryId: "recovery-" + shellId,
  shellId,
  observedAt: "2026-11-14T13:46:00.000Z",
  degradationDetected: false,
  degradedRenewalCount: 0,
  recoveredRenewalCount: 0,
  recoveryWindowHours: 0,
  missedRenewalCount: 0,
  evidenceCurrent: true,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  recoveryState: "NOT_REQUIRED" as const
}));

const predictions = shellIds.map((shellId) => ({
  predictionId: "prediction-" + shellId,
  shellId,
  observedAt: "2026-11-14T13:47:00.000Z",
  currentConfidenceBps: 8500,
  projectedConfidenceBps: 8200,
  forecastHorizonHours: 72,
  sampleCount: 5,
  evidencePoints: 6,
  advanceRenewalScheduled: false,
  ownerApproved: true,
  independentlyVerified: true,
  renewalState: "CURRENT" as const
}));

const build399Held = {
  governanceState: "CONFIDENCE_DEGRADATION_ACTION_REQUIRED"
} as unknown as Build399LongHorizonGovernance;
assert.equal(
  assessBuild400PredictiveRenewalGovernance({
    build399: build399Held,
    warningResponses: responses,
    assuranceRecoveries: recoveries,
    predictiveRenewals: predictions
  }).governanceState,
  "HOLD_BUILD399_NOT_VERIFIED"
);

const missingResponses = assessBuild400PredictiveRenewalGovernance({
  build399: build399Verified
});
assert.equal(
  missingResponses.governanceState,
  "EARLY_WARNING_RESPONSE_EVIDENCE_REQUIRED"
);
assert.equal(missingResponses.missingResponseShells.length, 5);

const ineffectiveResponse = assessBuild400PredictiveRenewalGovernance({
  build399: build399Verified,
  warningResponses: responses.map((item) =>
    item.shellId === "yw"
      ? {
          ...item,
          warningTriggered: true,
          preResponseProjectedConfidenceBps: 6800,
          postResponseObservedConfidenceBps: 6950,
          responseWindowHours: 24,
          sampleCount: 3,
          responseState: "INEFFECTIVE" as const
        }
      : item
  )
});
assert.equal(
  ineffectiveResponse.governanceState,
  "EARLY_WARNING_RESPONSE_INEFFECTIVE"
);
assert.deepEqual(ineffectiveResponse.ineffectiveResponseShells, ["yw"]);

const missingRecovery = assessBuild400PredictiveRenewalGovernance({
  build399: build399Verified,
  warningResponses: responses
});
assert.equal(
  missingRecovery.governanceState,
  "ASSURANCE_DEGRADATION_RECOVERY_REQUIRED"
);

const unrecovered = assessBuild400PredictiveRenewalGovernance({
  build399: build399Verified,
  warningResponses: responses,
  assuranceRecoveries: recoveries.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          degradationDetected: true,
          degradedRenewalCount: 2,
          recoveredRenewalCount: 1,
          recoveryWindowHours: 72,
          recoveryState: "DEGRADED" as const
        }
      : item
  )
});
assert.equal(
  unrecovered.governanceState,
  "ASSURANCE_DEGRADATION_NOT_RECOVERED"
);
assert.deepEqual(unrecovered.unrecoveredAssuranceShells, ["rosevear-ai-hub"]);

const missingPrediction = assessBuild400PredictiveRenewalGovernance({
  build399: build399Verified,
  warningResponses: responses,
  assuranceRecoveries: recoveries
});
assert.equal(
  missingPrediction.governanceState,
  "PREDICTIVE_RENEWAL_EVIDENCE_REQUIRED"
);

const invalidPrediction = assessBuild400PredictiveRenewalGovernance({
  build399: build399Verified,
  warningResponses: responses,
  assuranceRecoveries: recoveries,
  predictiveRenewals: predictions.map((item) =>
    item.shellId === "icamp"
      ? {
          ...item,
          currentConfidenceBps: 8200,
          projectedConfidenceBps: 7400,
          advanceRenewalScheduled: false,
          renewalState: "CURRENT" as const
        }
      : item
  )
});
assert.equal(
  invalidPrediction.governanceState,
  "PREDICTIVE_RENEWAL_ACTION_REQUIRED"
);
assert.deepEqual(invalidPrediction.invalidPredictiveRenewalShells, ["icamp"]);

const effectiveResponse = responses.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        warningTriggered: true,
        preResponseProjectedConfidenceBps: 6800,
        postResponseObservedConfidenceBps: 7200,
        responseWindowHours: 36,
        sampleCount: 4,
        responseState: "EFFECTIVE" as const
      }
    : item
);
const recoveredAssurance = recoveries.map((item) =>
  item.shellId === "rosevear-ai-hub"
    ? {
        ...item,
        degradationDetected: true,
        degradedRenewalCount: 2,
        recoveredRenewalCount: 2,
        recoveryWindowHours: 96,
        recoveryState: "RECOVERED" as const
      }
    : item
);
const predictiveRenewals = predictions.map((item) =>
  item.shellId === "icamp"
    ? {
        ...item,
        currentConfidenceBps: 8200,
        projectedConfidenceBps: 7400,
        advanceRenewalScheduled: true,
        renewalState: "ADVANCE_RENEWAL" as const
      }
    : item
);

const verified = assessBuild400PredictiveRenewalGovernance({
  build399: build399Verified,
  warningResponses: effectiveResponse,
  assuranceRecoveries: recoveredAssurance,
  predictiveRenewals
});
assert.equal(
  verified.governanceState,
  "PREDICTIVE_RENEWAL_GOVERNANCE_VERIFIED"
);

const migration = source(
  "../../db/migrations/0163_master_warning_response_assurance_recovery_predictive_renewal.sql"
);
for (const token of [
  "master_build400_early_warning_response_effectiveness",
  "master_build400_assurance_degradation_recovery",
  "master_build400_predictive_renewal_governance",
  "post_response_observed_confidence_bps-pre_response_projected_confidence_bps) >= 250",
  "recovery_window_hours >= 72",
  "advance_renewal_scheduled",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_400_WARNING_RESPONSE_ASSURANCE_RECOVERY_PREDICTIVE_RENEWAL.md"
);
for (const token of [
  "at least 250 basis points of confidence recovery",
  "at least 72 hours of evidence",
  "require an advance renewal schedule",
  "Stable forecasts remain CURRENT",
  "Deployment GREEN cannot substitute for warning-response"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 400 predictive renewal governance"));
assert.ok(masterPage.includes("Warning response effectiveness"));
assert.ok(masterPage.includes("Assurance degradation recovery"));
assert.ok(masterPage.includes("Predictive renewal governance"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build400_early_warning_response_effectiveness"',
  '"master_build400_assurance_degradation_recovery"',
  '"master_build400_predictive_renewal_governance"',
  '"0163_master_warning_response_assurance_recovery_predictive_renewal.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-400-warning-response-assurance-recovery-predictive-renewal.ts";
assert.equal(String(pkg.scripts["verify:build400"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 400 Confidence Early-Warning Response Effectiveness, Long-Horizon Assurance Degradation Recovery & Cross-Shell Predictive Renewal Governance verification passed."
);
