import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build397StabilityPersistenceConfidence } from "../lib/master-recalibrated-stability-outcome-persistence-confidence";
import {
  BUILD_398,
  BUILD_398_MAX_CONFIDENCE_DROP_BPS,
  BUILD_398_MAX_PERSISTENCE_RISK_DRIFT_BPS,
  BUILD_398_MIN_CONFIDENCE_BPS,
  BUILD_398_THEME_VERSION,
  assessBuild398AssuranceRenewal
} from "../lib/master-confidence-stability-persistence-drift-assurance-renewal";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_398, 398);
assert.equal(BUILD_398_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_398_MIN_CONFIDENCE_BPS, 7000);
assert.equal(BUILD_398_MAX_CONFIDENCE_DROP_BPS, 1000);
assert.equal(BUILD_398_MAX_PERSISTENCE_RISK_DRIFT_BPS, 500);

const build397Verified = {
  governanceState: "STABILITY_PERSISTENCE_CONFIDENCE_VERIFIED"
} as unknown as Build397StabilityPersistenceConfidence;

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const confidence = shellIds.map((shellId) => ({
  observationId: "confidence-" + shellId,
  shellId,
  observedAt: "2026-11-14T03:05:00.000Z",
  priorConfidenceBps: 8500,
  currentConfidenceBps: 8300,
  observationWindowHours: 24,
  sampleCount: 4,
  evidenceCurrent: true,
  ownerReviewed: true,
  independentlyVerified: true,
  stabilityState: "STABLE" as const
}));

const drift = shellIds.map((shellId) => ({
  driftId: "drift-" + shellId,
  shellId,
  observedAt: "2026-11-14T03:06:00.000Z",
  interventionOccurred: false,
  baselineRiskBps: 0,
  currentRiskBps: 0,
  riskDriftBps: 0,
  observationWindowHours: 0,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  driftState: "NOT_REQUIRED" as const
}));

const renewals = shellIds.map((shellId) => ({
  renewalId: "renewal-" + shellId,
  shellId,
  observedAt: "2026-11-14T03:07:00.000Z",
  evidencePoints: 8,
  confidenceEvidenceCurrent: true,
  thresholdEvidenceCurrent: true,
  persistenceEvidenceCurrent: true,
  ownerRenewed: true,
  independentlyVerified: true,
  renewalState: "RENEWED" as const
}));

const build397Held = {
  governanceState: "ESCALATION_CONFIDENCE_INSUFFICIENT"
} as unknown as Build397StabilityPersistenceConfidence;
assert.equal(
  assessBuild398AssuranceRenewal({
    build397: build397Held,
    confidenceStability: confidence,
    persistenceDrift: drift,
    assuranceRenewals: renewals
  }).governanceState,
  "HOLD_BUILD397_NOT_VERIFIED"
);

const missingConfidence = assessBuild398AssuranceRenewal({
  build397: build397Verified
});
assert.equal(
  missingConfidence.governanceState,
  "CONFIDENCE_STABILITY_EVIDENCE_REQUIRED"
);
assert.equal(missingConfidence.missingConfidenceStabilityShells.length, 5);

const degradedConfidence = assessBuild398AssuranceRenewal({
  build397: build397Verified,
  confidenceStability: confidence.map((item) =>
    item.shellId === "icamp"
      ? { ...item, currentConfidenceBps: 6900, stabilityState: "DEGRADING" as const }
      : item
  )
});
assert.equal(
  degradedConfidence.governanceState,
  "CONFIDENCE_STABILITY_DEGRADED"
);
assert.deepEqual(degradedConfidence.degradingConfidenceShells, ["icamp"]);

const missingDrift = assessBuild398AssuranceRenewal({
  build397: build397Verified,
  confidenceStability: confidence
});
assert.equal(
  missingDrift.governanceState,
  "PERSISTENCE_DRIFT_EVIDENCE_REQUIRED"
);

const drifted = assessBuild398AssuranceRenewal({
  build397: build397Verified,
  confidenceStability: confidence,
  persistenceDrift: drift.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          interventionOccurred: true,
          baselineRiskBps: 1800,
          currentRiskBps: 2600,
          riskDriftBps: 800,
          observationWindowHours: 48,
          driftState: "DRIFTING" as const
        }
      : item
  )
});
assert.equal(
  drifted.governanceState,
  "INTERVENTION_PERSISTENCE_DRIFT_DETECTED"
);
assert.deepEqual(drifted.persistenceDriftShells, ["rosevear-ai-hub"]);

const missingRenewal = assessBuild398AssuranceRenewal({
  build397: build397Verified,
  confidenceStability: confidence,
  persistenceDrift: drift
});
assert.equal(
  missingRenewal.governanceState,
  "ESCALATION_ASSURANCE_RENEWAL_REQUIRED"
);

const invalidRenewal = assessBuild398AssuranceRenewal({
  build397: build397Verified,
  confidenceStability: confidence,
  persistenceDrift: drift,
  assuranceRenewals: renewals.map((item) =>
    item.shellId === "yw"
      ? { ...item, persistenceEvidenceCurrent: false, renewalState: "HOLD" as const }
      : item
  )
});
assert.equal(
  invalidRenewal.governanceState,
  "ESCALATION_ASSURANCE_RENEWAL_INVALID"
);
assert.deepEqual(invalidRenewal.invalidRenewalShells, ["yw"]);

const persistentIntervention = drift.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        interventionOccurred: true,
        baselineRiskBps: 2100,
        currentRiskBps: 2300,
        riskDriftBps: 200,
        observationWindowHours: 72,
        driftState: "STABLE" as const
      }
    : item
);

const verified = assessBuild398AssuranceRenewal({
  build397: build397Verified,
  confidenceStability: confidence,
  persistenceDrift: persistentIntervention,
  assuranceRenewals: renewals
});
assert.equal(
  verified.governanceState,
  "POST_RECALIBRATION_ASSURANCE_RENEWED"
);

const migration = source(
  "../../db/migrations/0161_master_confidence_stability_persistence_drift_assurance_renewal.sql"
);
for (const token of [
  "master_build398_confidence_stability_observations",
  "master_build398_intervention_persistence_drift",
  "master_build398_escalation_assurance_renewals",
  "current_confidence_bps >= 7000",
  "risk_drift_bps <= 500",
  "RENEWED",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_398_CONFIDENCE_STABILITY_PERSISTENCE_DRIFT_ASSURANCE_RENEWAL.md"
);
for (const token of [
  "may not fall by more than 1000 basis points",
  "Drift may not exceed 500 basis points",
  "No-intervention shells record an explicit NOT_REQUIRED decision",
  "explicit owner renewal plus independent verification",
  "Deployment GREEN cannot substitute for assurance-renewal evidence"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 398 assurance renewal"));
assert.ok(masterPage.includes("Confidence stability monitoring"));
assert.ok(masterPage.includes("Persistence drift detection"));
assert.ok(masterPage.includes("Escalation assurance renewal"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build398_confidence_stability_observations"',
  '"master_build398_intervention_persistence_drift"',
  '"master_build398_escalation_assurance_renewals"',
  '"0161_master_confidence_stability_persistence_drift_assurance_renewal.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-398-confidence-stability-persistence-drift-assurance-renewal.ts";
assert.equal(String(pkg.scripts["verify:build398"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 398 Post-Recalibration Confidence Stability Monitoring, Intervention Persistence Drift Detection & Cross-Shell Escalation Assurance Renewal verification passed."
);
