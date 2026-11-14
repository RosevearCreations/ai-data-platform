import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build394LongHorizonVisualStability } from "../lib/master-long-horizon-visual-stability-risk";
import {
  BUILD_395,
  BUILD_395_MIN_CALIBRATION_EVIDENCE_POINTS,
  BUILD_395_THEME_VERSION,
  assessBuild395PredictiveRecurrenceGovernance
} from "../lib/master-predictive-threshold-intervention-escalation";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_395, 395);
assert.equal(BUILD_395_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_395_MIN_CALIBRATION_EVIDENCE_POINTS, 5);

const build394Verified = {
  governanceState: "LONG_HORIZON_VISUAL_STABILITY_VERIFIED"
} as unknown as Build394LongHorizonVisualStability;

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const calibrations = shellIds.map((shellId) => ({
  calibrationId: "calibration-" + shellId,
  shellId,
  observedAt: "2026-11-14T00:45:00.000Z",
  evidencePoints: 8,
  baselineProbabilityBps: 500,
  warningThresholdBps: 2500,
  escalationThresholdBps: 5000,
  falsePositiveRateBps: 400,
  falseNegativeRateBps: 300,
  ownerApproved: true,
  independentlyVerified: true,
  calibrationState: "CALIBRATED" as const
}));

const readiness = shellIds.map((shellId) => ({
  readinessId: "readiness-" + shellId,
  shellId,
  observedAt: "2026-11-14T00:46:00.000Z",
  requiredControls: 4,
  readyControls: 4,
  runbookVerified: true,
  rollbackReady: true,
  ownerOnCallAssigned: true,
  independentlyVerified: true,
  readinessState: "READY" as const
}));

const escalations = shellIds.map((shellId) => ({
  escalationId: "escalation-" + shellId,
  shellId,
  observedAt: "2026-11-14T00:47:00.000Z",
  recurrenceRiskBps: 900,
  warningThresholdBps: 2500,
  escalationThresholdBps: 5000,
  escalationLevel: "NORMAL" as const,
  interventionInvoked: false,
  ownerAcknowledged: false,
  independentlyVerified: true,
  escalationState: "VERIFIED" as const
}));

const build394Held = {
  governanceState: "RECURRENCE_RISK_ELEVATED"
} as unknown as Build394LongHorizonVisualStability;
assert.equal(
  assessBuild395PredictiveRecurrenceGovernance({
    build394: build394Held,
    calibrations,
    interventionReadiness: readiness,
    escalations
  }).governanceState,
  "HOLD_BUILD394_NOT_VERIFIED"
);

const missingCalibration = assessBuild395PredictiveRecurrenceGovernance({
  build394: build394Verified
});
assert.equal(
  missingCalibration.governanceState,
  "THRESHOLD_CALIBRATION_REQUIRED"
);
assert.equal(missingCalibration.missingCalibrationShells.length, 5);

const invalidCalibration = assessBuild395PredictiveRecurrenceGovernance({
  build394: build394Verified,
  calibrations: calibrations.map((item) =>
    item.shellId === "icamp"
      ? { ...item, evidencePoints: 4 }
      : item
  )
});
assert.equal(
  invalidCalibration.governanceState,
  "THRESHOLD_CALIBRATION_INVALID"
);
assert.deepEqual(invalidCalibration.invalidCalibrationShells, ["icamp"]);

const needsReadiness = assessBuild395PredictiveRecurrenceGovernance({
  build394: build394Verified,
  calibrations
});
assert.equal(
  needsReadiness.governanceState,
  "INTERVENTION_READINESS_REQUIRED"
);

const unready = assessBuild395PredictiveRecurrenceGovernance({
  build394: build394Verified,
  calibrations,
  interventionReadiness: readiness.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          readyControls: 3,
          rollbackReady: false,
          readinessState: "NOT_READY" as const
        }
      : item
  )
});
assert.equal(unready.governanceState, "INTERVENTION_NOT_READY");
assert.deepEqual(unready.unreadyInterventionShells, ["rosevear-ai-hub"]);

const needsEscalation = assessBuild395PredictiveRecurrenceGovernance({
  build394: build394Verified,
  calibrations,
  interventionReadiness: readiness
});
assert.equal(
  needsEscalation.governanceState,
  "RISK_ESCALATION_EVIDENCE_REQUIRED"
);

const badEscalation = assessBuild395PredictiveRecurrenceGovernance({
  build394: build394Verified,
  calibrations,
  interventionReadiness: readiness,
  escalations: escalations.map((item) =>
    item.shellId === "yw"
      ? {
          ...item,
          recurrenceRiskBps: 6200,
          escalationLevel: "WATCH" as const,
          ownerAcknowledged: true
        }
      : item
  )
});
assert.equal(
  badEscalation.governanceState,
  "RISK_ESCALATION_POLICY_BREACH"
);
assert.deepEqual(badEscalation.escalationPolicyBreachShells, ["yw"]);

const actionEscalation = escalations.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        recurrenceRiskBps: 6200,
        escalationLevel: "ACTION" as const,
        interventionInvoked: true,
        ownerAcknowledged: true
      }
    : item
);

const verified = assessBuild395PredictiveRecurrenceGovernance({
  build394: build394Verified,
  calibrations,
  interventionReadiness: readiness,
  escalations: actionEscalation
});
assert.equal(
  verified.governanceState,
  "PREDICTIVE_RECURRENCE_GOVERNANCE_VERIFIED"
);

const migration = source(
  "../../db/migrations/0158_master_predictive_threshold_intervention_escalation.sql"
);
for (const token of [
  "master_build395_recurrence_threshold_calibrations",
  "master_build395_preventive_intervention_readiness",
  "master_build395_cross_shell_risk_escalations",
  "CALIBRATED",
  "READY",
  "CRITICAL",
  "evidence_points >= 5",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_395_PREDICTIVE_THRESHOLD_INTERVENTION_ESCALATION.md"
);
for (const token of [
  "at least five evidence points",
  "False-positive and false-negative rates",
  "rollback is ready",
  "ACTION or CRITICAL risk",
  "Deployment GREEN cannot substitute for threshold calibration"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 395 predictive governance"));
assert.ok(masterPage.includes("Intervention readiness"));
assert.ok(masterPage.includes("Cross-shell escalation"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build395_recurrence_threshold_calibrations"',
  '"master_build395_preventive_intervention_readiness"',
  '"master_build395_cross_shell_risk_escalations"',
  '"0158_master_predictive_threshold_intervention_escalation.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-395-predictive-threshold-intervention-escalation.ts";
assert.equal(String(pkg.scripts["verify:build395"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 395 Predictive Visual Recurrence Threshold Calibration, Preventive-Control Intervention Readiness & Cross-Shell Risk Escalation Governance verification passed."
);
