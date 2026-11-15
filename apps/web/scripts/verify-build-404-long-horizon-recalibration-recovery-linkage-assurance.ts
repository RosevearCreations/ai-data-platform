import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_402_APPLICATION_REPOSITORIES,
  BUILD_402_TOPOLOGY_ID
} from "../lib/master-forecast-recalibration-renewal-timing-linkage-continuity";
import type { Build403GovernanceAssessment } from "../lib/master-recalibration-persistence-renewal-drift-linkage-recurrence-prevention";
import {
  BUILD_404,
  BUILD_404_MIN_LINKAGE_ASSURANCE_SAMPLES,
  BUILD_404_MIN_LONG_HORIZON_HOURS,
  BUILD_404_MIN_RECALIBRATION_SAMPLES,
  BUILD_404_MIN_RECOVERY_EFFECTIVENESS_HOURS,
  BUILD_404_MIN_RECOVERY_EFFECTIVENESS_SAMPLES,
  BUILD_404_THEME_VERSION,
  assessBuild404Governance
} from "../lib/master-long-horizon-recalibration-recovery-linkage-assurance";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_404, 404);
assert.equal(BUILD_404_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_404_MIN_LONG_HORIZON_HOURS, 168);
assert.equal(BUILD_404_MIN_RECALIBRATION_SAMPLES, 14);
assert.equal(BUILD_404_MIN_RECOVERY_EFFECTIVENESS_HOURS, 72);
assert.equal(BUILD_404_MIN_RECOVERY_EFFECTIVENESS_SAMPLES, 5);
assert.equal(BUILD_404_MIN_LINKAGE_ASSURANCE_SAMPLES, 7);

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const appIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp",
  "devilndove",
  "rosiedazzlers"
] as const;

const build403Verified = {
  governanceState: "RECURRENCE_PREVENTION_GOVERNANCE_VERIFIED"
} as unknown as Build403GovernanceAssessment;

const stability = shellIds.map((shellId) => ({
  stabilityId: "stability-" + shellId,
  shellId,
  observedAt: "2026-11-15T00:30:00.000Z",
  observationWindowHours: 192,
  sampleCount: 16,
  maximumAbsoluteErrorBps: 430,
  latestAbsoluteErrorBps: 260,
  samplesOutsideBudget: 0,
  recurrenceCount: 0,
  ownerReviewed: true,
  independentlyVerified: true,
  stabilityState: "STABLE" as const
}));

const effectiveness = shellIds.map((shellId) => ({
  effectivenessId: "effectiveness-" + shellId,
  shellId,
  observedAt: "2026-11-15T00:31:00.000Z",
  driftEventCount: 0,
  recoveredEventCount: 0,
  observationWindowHours: 96,
  sampleCount: 6,
  latestPostRecoveryLeadHours: 0,
  thresholdBreachCount: 0,
  recurrenceCount: 0,
  ownerReviewed: true,
  independentlyVerified: true,
  effectivenessState: "NOT_REQUIRED" as const
}));

const assurance = appIds.map((appId) => ({
  assuranceId: "assurance-" + appId,
  appId,
  repository: BUILD_402_APPLICATION_REPOSITORIES[appId],
  topologyId: BUILD_402_TOPOLOGY_ID,
  observedAt: "2026-11-15T00:32:00.000Z",
  productionMainSha: "e".repeat(40),
  manifestSha256: "f".repeat(64),
  evidenceAgeHours: 1,
  observationWindowHours: 192,
  sampleCount: 8,
  selfIdentityMatches: true,
  canonicalTopologyMatches: true,
  validationAuthorityMatches: true,
  continuityBreakCount: 0,
  staleEvidenceRecurrenceCount: 0,
  authorityTransferCount: 0,
  ownerReviewed: true,
  independentlyVerified: true,
  assuranceState: "ASSURED" as const
}));

const held403 = {
  governanceState: "LINKAGE_RECURRENCE_DETECTED"
} as unknown as Build403GovernanceAssessment;
assert.equal(
  assessBuild404Governance({
    build403: held403,
    recalibrationStability: stability,
    recoveryEffectiveness: effectiveness,
    linkageAssurance: assurance
  }).governanceState,
  "HOLD_BUILD403_NOT_VERIFIED"
);

const missingStability = assessBuild404Governance({ build403: build403Verified });
assert.equal(
  missingStability.governanceState,
  "LONG_HORIZON_RECALIBRATION_EVIDENCE_REQUIRED"
);
assert.equal(missingStability.missingStabilityShells.length, 5);

const unstable = assessBuild404Governance({
  build403: build403Verified,
  recalibrationStability: stability.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          maximumAbsoluteErrorBps: 650,
          samplesOutsideBudget: 2,
          recurrenceCount: 1,
          stabilityState: "DEGRADED" as const
        }
      : item
  )
});
assert.equal(
  unstable.governanceState,
  "RECALIBRATION_LONG_HORIZON_INSTABILITY_DETECTED"
);
assert.deepEqual(unstable.unstableRecalibrationShells, ["rosevear-ai-hub"]);

const missingEffectiveness = assessBuild404Governance({
  build403: build403Verified,
  recalibrationStability: stability
});
assert.equal(
  missingEffectiveness.governanceState,
  "RENEWAL_RECOVERY_EFFECTIVENESS_EVIDENCE_REQUIRED"
);

const ineffective = assessBuild404Governance({
  build403: build403Verified,
  recalibrationStability: stability,
  recoveryEffectiveness: effectiveness.map((item) =>
    item.shellId === "yw"
      ? {
          ...item,
          driftEventCount: 2,
          recoveredEventCount: 1,
          latestPostRecoveryLeadHours: 28,
          recurrenceCount: 1,
          effectivenessState: "INEFFECTIVE" as const
        }
      : item
  )
});
assert.equal(ineffective.governanceState, "RENEWAL_DRIFT_RECOVERY_INEFFECTIVE");
assert.deepEqual(ineffective.ineffectiveRecoveryShells, ["yw"]);

const recovered = effectiveness.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        driftEventCount: 2,
        recoveredEventCount: 2,
        latestPostRecoveryLeadHours: 12,
        effectivenessState: "EFFECTIVE" as const
      }
    : item
);

const missingAssurance = assessBuild404Governance({
  build403: build403Verified,
  recalibrationStability: stability,
  recoveryEffectiveness: recovered
});
assert.equal(
  missingAssurance.governanceState,
  "LINKAGE_PREVENTION_ASSURANCE_EVIDENCE_REQUIRED"
);
assert.equal(missingAssurance.missingAssuranceApplications.length, 7);

const degradedAssurance = assessBuild404Governance({
  build403: build403Verified,
  recalibrationStability: stability,
  recoveryEffectiveness: recovered,
  linkageAssurance: assurance.map((item) =>
    item.appId === "devilndove"
      ? {
          ...item,
          staleEvidenceRecurrenceCount: 1,
          assuranceState: "DEGRADED" as const
        }
      : item
  )
});
assert.equal(
  degradedAssurance.governanceState,
  "LINKAGE_PREVENTION_ASSURANCE_DEGRADED"
);
assert.deepEqual(degradedAssurance.degradedAssuranceApplications, [
  "devilndove"
]);

const verified = assessBuild404Governance({
  build403: build403Verified,
  recalibrationStability: stability,
  recoveryEffectiveness: recovered,
  linkageAssurance: assurance
});
assert.equal(
  verified.governanceState,
  "LONG_HORIZON_PREVENTION_ASSURANCE_GOVERNANCE_VERIFIED"
);

const topology = JSON.parse(
  source("../../.github/rosevear-master-topology.v1.json")
);
assert.equal(topology.topologyId, BUILD_402_TOPOLOGY_ID);
assert.equal(topology.applications.length, 7);
assert.equal(topology.rules.authorityTransfer, false);

const migration = source(
  "../../db/migrations/0167_master_long_horizon_recalibration_recovery_linkage_assurance.sql"
);
for (const token of [
  "master_build404_long_horizon_recalibration_stability",
  "master_build404_renewal_drift_recovery_effectiveness",
  "master_build404_linkage_prevention_assurance",
  "observation_window_hours >= 168",
  "latest_post_recovery_lead_hours between 6 and 24",
  "rosevear-master-shell-seven-apps.v1",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_404_LONG_HORIZON_RECALIBRATION_RECOVERY_LINKAGE_ASSURANCE.md"
);
for (const token of [
  "seven-day",
  "14 samples",
  "72-hour",
  "All seven applications",
  "continuity break",
  "authority transfer remains forbidden"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 404 long-horizon assurance governance",
  "Long-horizon recalibration stability",
  "Renewal drift recovery effectiveness",
  "Seven-application prevention assurance",
  "Fail-closed long-horizon assurance"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build404_long_horizon_recalibration_stability"',
  '"master_build404_renewal_drift_recovery_effectiveness"',
  '"master_build404_linkage_prevention_assurance"',
  '"0167_master_long_horizon_recalibration_recovery_linkage_assurance.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-404-long-horizon-recalibration-recovery-linkage-assurance.ts";
assert.equal(String(pkg.scripts["verify:build404"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 404 Long-Horizon Recalibration Persistence Stability, Renewal Drift Recovery Effectiveness & Seven-Application Linkage Prevention Assurance Governance verification passed."
);
