import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build396ThresholdFeedbackGovernance } from "../lib/master-threshold-drift-outcome-feedback-recalibration";
import {
  BUILD_397,
  BUILD_397_MIN_CONFIDENCE_BPS,
  BUILD_397_THEME_VERSION,
  assessBuild397StabilityPersistenceConfidence
} from "../lib/master-recalibrated-stability-outcome-persistence-confidence";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_397, 397);
assert.equal(BUILD_397_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_397_MIN_CONFIDENCE_BPS, 7000);

const build396Verified = {
  governanceState: "THRESHOLD_FEEDBACK_RECALIBRATION_VERIFIED"
} as unknown as Build396ThresholdFeedbackGovernance;

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const stability = shellIds.map((shellId) => ({
  validationId: "stability-" + shellId,
  shellId,
  observedAt: "2026-11-14T02:20:00.000Z",
  warningThresholdBps: 2500,
  escalationThresholdBps: 5000,
  observationWindowHours: 24,
  sampleCount: 4,
  thresholdBreachCount: 0,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  stabilityState: "STABLE" as const
}));

const persistence = shellIds.map((shellId) => ({
  persistenceId: "persistence-" + shellId,
  shellId,
  observedAt: "2026-11-14T02:21:00.000Z",
  interventionOccurred: false,
  persistenceWindowHours: 0,
  sampleCount: 0,
  baselinePostInterventionRiskBps: 0,
  currentRiskBps: 0,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  persistenceState: "NOT_REQUIRED" as const
}));

const confidence = shellIds.map((shellId) => ({
  confidenceId: "confidence-" + shellId,
  shellId,
  observedAt: "2026-11-14T02:22:00.000Z",
  evidencePoints: 8,
  confidenceBps: 8500,
  thresholdEvidenceCurrent: true,
  interventionEvidenceCurrent: true,
  ownerReviewed: true,
  independentlyVerified: true,
  confidenceState: "VERIFIED" as const
}));

const build396Held = {
  governanceState: "FEEDBACK_RECALIBRATION_INVALID"
} as unknown as Build396ThresholdFeedbackGovernance;
assert.equal(
  assessBuild397StabilityPersistenceConfidence({
    build396: build396Held,
    thresholdStability: stability,
    interventionPersistence: persistence,
    escalationConfidence: confidence
  }).governanceState,
  "HOLD_BUILD396_NOT_VERIFIED"
);

const missingStability = assessBuild397StabilityPersistenceConfidence({
  build396: build396Verified
});
assert.equal(
  missingStability.governanceState,
  "RECALIBRATED_THRESHOLD_STABILITY_REQUIRED"
);
assert.equal(missingStability.missingStabilityShells.length, 5);

const unstable = assessBuild397StabilityPersistenceConfidence({
  build396: build396Verified,
  thresholdStability: stability.map((item) =>
    item.shellId === "icamp"
      ? { ...item, thresholdBreachCount: 1, stabilityState: "UNSTABLE" as const }
      : item
  )
});
assert.equal(unstable.governanceState, "RECALIBRATED_THRESHOLD_UNSTABLE");
assert.deepEqual(unstable.unstableThresholdShells, ["icamp"]);

const missingPersistence = assessBuild397StabilityPersistenceConfidence({
  build396: build396Verified,
  thresholdStability: stability
});
assert.equal(
  missingPersistence.governanceState,
  "INTERVENTION_PERSISTENCE_REQUIRED"
);

const regressed = assessBuild397StabilityPersistenceConfidence({
  build396: build396Verified,
  thresholdStability: stability,
  interventionPersistence: persistence.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          interventionOccurred: true,
          persistenceWindowHours: 48,
          sampleCount: 4,
          baselinePostInterventionRiskBps: 1800,
          currentRiskBps: 2600,
          recurrenceDetected: true,
          persistenceState: "REGRESSED" as const
        }
      : item
  )
});
assert.equal(regressed.governanceState, "INTERVENTION_OUTCOME_REGRESSION");
assert.deepEqual(regressed.regressedInterventionShells, ["rosevear-ai-hub"]);

const missingConfidence = assessBuild397StabilityPersistenceConfidence({
  build396: build396Verified,
  thresholdStability: stability,
  interventionPersistence: persistence
});
assert.equal(
  missingConfidence.governanceState,
  "ESCALATION_CONFIDENCE_REQUIRED"
);

const lowConfidence = assessBuild397StabilityPersistenceConfidence({
  build396: build396Verified,
  thresholdStability: stability,
  interventionPersistence: persistence,
  escalationConfidence: confidence.map((item) =>
    item.shellId === "yw"
      ? { ...item, confidenceBps: 6200, confidenceState: "LOW_CONFIDENCE" as const }
      : item
  )
});
assert.equal(
  lowConfidence.governanceState,
  "ESCALATION_CONFIDENCE_INSUFFICIENT"
);
assert.deepEqual(lowConfidence.lowConfidenceShells, ["yw"]);

const persistentIntervention = persistence.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        interventionOccurred: true,
        persistenceWindowHours: 72,
        sampleCount: 5,
        baselinePostInterventionRiskBps: 2100,
        currentRiskBps: 1800,
        persistenceState: "PERSISTENT" as const
      }
    : item
);

const verified = assessBuild397StabilityPersistenceConfidence({
  build396: build396Verified,
  thresholdStability: stability,
  interventionPersistence: persistentIntervention,
  escalationConfidence: confidence
});
assert.equal(
  verified.governanceState,
  "STABILITY_PERSISTENCE_CONFIDENCE_VERIFIED"
);

const migration = source(
  "../../db/migrations/0160_master_recalibrated_stability_outcome_persistence_confidence.sql"
);
for (const token of [
  "master_build397_recalibrated_threshold_stability",
  "master_build397_intervention_outcome_persistence",
  "master_build397_escalation_confidence_governance",
  "STABLE",
  "PERSISTENT",
  "confidence_bps >= 7000",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_397_RECALIBRATED_STABILITY_OUTCOME_PERSISTENCE_CONFIDENCE.md"
);
for (const token of [
  "at least a 24-hour validation window",
  "at least 48 hours",
  "confidence score of at least 7000 basis points",
  "Threshold evidence and intervention evidence must both be current",
  "Deployment GREEN cannot substitute for stability validation"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 397 confidence governance"));
assert.ok(masterPage.includes("Recalibrated threshold stability"));
assert.ok(masterPage.includes("Intervention outcome persistence"));
assert.ok(masterPage.includes("Escalation confidence"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build397_recalibrated_threshold_stability"',
  '"master_build397_intervention_outcome_persistence"',
  '"master_build397_escalation_confidence_governance"',
  '"0160_master_recalibrated_stability_outcome_persistence_confidence.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-397-recalibrated-stability-outcome-persistence-confidence.ts";
assert.equal(String(pkg.scripts["verify:build397"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 397 Recalibrated Threshold Stability Validation, Intervention-Outcome Persistence & Cross-Shell Escalation Confidence Governance verification passed."
);
