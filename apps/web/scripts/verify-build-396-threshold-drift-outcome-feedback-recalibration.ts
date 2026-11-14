import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build395PredictiveRecurrenceGovernance } from "../lib/master-predictive-threshold-intervention-escalation";
import {
  BUILD_396,
  BUILD_396_MIN_FEEDBACK_EVIDENCE_POINTS,
  BUILD_396_THEME_VERSION,
  assessBuild396ThresholdFeedbackGovernance
} from "../lib/master-threshold-drift-outcome-feedback-recalibration";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_396, 396);
assert.equal(BUILD_396_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_396_MIN_FEEDBACK_EVIDENCE_POINTS, 5);

const build395Verified = {
  governanceState: "PREDICTIVE_RECURRENCE_GOVERNANCE_VERIFIED"
} as unknown as Build395PredictiveRecurrenceGovernance;

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const drift = shellIds.map((shellId) => ({
  observationId: "drift-" + shellId,
  shellId,
  observedAt: "2026-11-14T01:55:00.000Z",
  sampleCount: 6,
  calibratedWarningThresholdBps: 2500,
  calibratedEscalationThresholdBps: 5000,
  recommendedWarningThresholdBps: 2500,
  recommendedEscalationThresholdBps: 5000,
  warningDriftBps: 0,
  escalationDriftBps: 0,
  independentlyObserved: true,
  driftState: "STABLE" as const
}));

const outcomes = shellIds.map((shellId) => ({
  outcomeId: "outcome-" + shellId,
  shellId,
  observedAt: "2026-11-14T01:56:00.000Z",
  interventionOccurred: false,
  preInterventionRiskBps: 0,
  postInterventionRiskBps: 0,
  observationWindowHours: 0,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  outcomeState: "NOT_REQUIRED" as const
}));

const recalibrations = shellIds.map((shellId) => ({
  recalibrationId: "recalibration-" + shellId,
  shellId,
  observedAt: "2026-11-14T01:57:00.000Z",
  priorWarningThresholdBps: 2500,
  priorEscalationThresholdBps: 5000,
  proposedWarningThresholdBps: 2500,
  proposedEscalationThresholdBps: 5000,
  feedbackEvidencePoints: 8,
  interventionFeedbackCount: 0,
  escalationFeedbackCount: 3,
  ownerApproved: true,
  independentlyVerified: true,
  recalibrationState: "RETAINED" as const
}));

const build395Held = {
  governanceState: "RISK_ESCALATION_POLICY_BREACH"
} as unknown as Build395PredictiveRecurrenceGovernance;
assert.equal(
  assessBuild396ThresholdFeedbackGovernance({
    build395: build395Held,
    thresholdDriftObservations: drift,
    interventionOutcomes: outcomes,
    feedbackRecalibrations: recalibrations
  }).governanceState,
  "HOLD_BUILD395_NOT_VERIFIED"
);

const missingDrift = assessBuild396ThresholdFeedbackGovernance({
  build395: build395Verified
});
assert.equal(
  missingDrift.governanceState,
  "THRESHOLD_DRIFT_EVIDENCE_REQUIRED"
);
assert.equal(missingDrift.missingDriftShells.length, 5);

const invalidDrift = assessBuild396ThresholdFeedbackGovernance({
  build395: build395Verified,
  thresholdDriftObservations: drift.map((item) =>
    item.shellId === "icamp"
      ? { ...item, warningDriftBps: 100 }
      : item
  )
});
assert.equal(
  invalidDrift.governanceState,
  "THRESHOLD_DRIFT_EVIDENCE_INVALID"
);
assert.deepEqual(invalidDrift.invalidDriftShells, ["icamp"]);

const missingOutcome = assessBuild396ThresholdFeedbackGovernance({
  build395: build395Verified,
  thresholdDriftObservations: drift
});
assert.equal(
  missingOutcome.governanceState,
  "INTERVENTION_OUTCOME_EVIDENCE_REQUIRED"
);

const ineffective = assessBuild396ThresholdFeedbackGovernance({
  build395: build395Verified,
  thresholdDriftObservations: drift,
  interventionOutcomes: outcomes.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          interventionOccurred: true,
          preInterventionRiskBps: 6200,
          postInterventionRiskBps: 6500,
          observationWindowHours: 24,
          recurrenceDetected: true,
          outcomeState: "INEFFECTIVE" as const
        }
      : item
  )
});
assert.equal(
  ineffective.governanceState,
  "INTERVENTION_OUTCOME_INEFFECTIVE"
);
assert.deepEqual(ineffective.ineffectiveOutcomeShells, ["rosevear-ai-hub"]);

const missingRecalibration = assessBuild396ThresholdFeedbackGovernance({
  build395: build395Verified,
  thresholdDriftObservations: drift,
  interventionOutcomes: outcomes
});
assert.equal(
  missingRecalibration.governanceState,
  "FEEDBACK_RECALIBRATION_REQUIRED"
);

const drifted = drift.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        recommendedWarningThresholdBps: 2200,
        recommendedEscalationThresholdBps: 4700,
        warningDriftBps: 300,
        escalationDriftBps: 300,
        driftState: "DRIFTING" as const
      }
    : item
);

const badRecalibration = assessBuild396ThresholdFeedbackGovernance({
  build395: build395Verified,
  thresholdDriftObservations: drifted,
  interventionOutcomes: outcomes,
  feedbackRecalibrations: recalibrations
});
assert.equal(
  badRecalibration.governanceState,
  "FEEDBACK_RECALIBRATION_INVALID"
);
assert.deepEqual(badRecalibration.invalidRecalibrationShells, ["yw"]);

const corrected = recalibrations.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        proposedWarningThresholdBps: 2200,
        proposedEscalationThresholdBps: 4700,
        interventionFeedbackCount: 1,
        recalibrationState: "RECALIBRATED" as const
      }
    : item
);

const verified = assessBuild396ThresholdFeedbackGovernance({
  build395: build395Verified,
  thresholdDriftObservations: drifted,
  interventionOutcomes: outcomes,
  feedbackRecalibrations: corrected
});
assert.equal(
  verified.governanceState,
  "THRESHOLD_FEEDBACK_RECALIBRATION_VERIFIED"
);

const migration = source(
  "../../db/migrations/0159_master_threshold_drift_outcome_feedback_recalibration.sql"
);
for (const token of [
  "master_build396_threshold_drift_observations",
  "master_build396_intervention_outcome_effectiveness",
  "master_build396_escalation_feedback_recalibrations",
  "DRIFTING",
  "EFFECTIVE",
  "RECALIBRATED",
  "feedback_evidence_points >= 5",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_396_THRESHOLD_DRIFT_OUTCOME_FEEDBACK_RECALIBRATION.md"
);
for (const token of [
  "exact basis-point drift",
  "at least a 24-hour observation window",
  "Stable thresholds may be explicitly RETAINED",
  "Drifted thresholds must be RECALIBRATED",
  "Deployment GREEN cannot substitute for threshold-drift evidence"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 396 feedback governance"));
assert.ok(masterPage.includes("Threshold drift monitoring"));
assert.ok(masterPage.includes("Intervention outcome effectiveness"));
assert.ok(masterPage.includes("Feedback recalibration"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build396_threshold_drift_observations"',
  '"master_build396_intervention_outcome_effectiveness"',
  '"master_build396_escalation_feedback_recalibrations"',
  '"0159_master_threshold_drift_outcome_feedback_recalibration.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-396-threshold-drift-outcome-feedback-recalibration.ts";
assert.equal(String(pkg.scripts["verify:build396"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 396 Predictive Threshold Drift Monitoring, Preventive-Intervention Outcome Effectiveness & Cross-Shell Escalation Feedback Recalibration verification passed."
);
