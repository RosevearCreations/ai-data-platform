import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build402GovernanceAssessment } from "../lib/master-forecast-recalibration-renewal-timing-linkage-continuity";
import {
  BUILD_402_APPLICATION_REPOSITORIES,
  BUILD_402_TOPOLOGY_ID
} from "../lib/master-forecast-recalibration-renewal-timing-linkage-continuity";
import {
  BUILD_403,
  BUILD_403_MIN_LINKAGE_PREVENTION_SAMPLES,
  BUILD_403_MIN_LINKAGE_PREVENTION_WINDOW_HOURS,
  BUILD_403_MIN_RECALIBRATION_PERSISTENCE_HOURS,
  BUILD_403_MIN_RECALIBRATION_PERSISTENCE_SAMPLES,
  BUILD_403_MIN_TIMING_RECOVERY_HOURS,
  BUILD_403_MIN_TIMING_RECOVERY_SAMPLES,
  BUILD_403_THEME_VERSION,
  assessBuild403Governance
} from "../lib/master-recalibration-persistence-renewal-drift-linkage-recurrence-prevention";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_403, 403);
assert.equal(BUILD_403_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_403_MIN_RECALIBRATION_PERSISTENCE_HOURS, 72);
assert.equal(BUILD_403_MIN_RECALIBRATION_PERSISTENCE_SAMPLES, 7);
assert.equal(BUILD_403_MIN_TIMING_RECOVERY_HOURS, 24);
assert.equal(BUILD_403_MIN_TIMING_RECOVERY_SAMPLES, 3);
assert.equal(BUILD_403_MIN_LINKAGE_PREVENTION_WINDOW_HOURS, 72);
assert.equal(BUILD_403_MIN_LINKAGE_PREVENTION_SAMPLES, 3);

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

const build402Verified = {
  governanceState: "SEVEN_APPLICATION_CONTINUITY_GOVERNANCE_VERIFIED"
} as unknown as Build402GovernanceAssessment;

const persistence = shellIds.map((shellId) => ({
  persistenceId: "persistence-" + shellId,
  shellId,
  observedAt: "2026-11-14T21:00:00.000Z",
  observationWindowHours: 96,
  sampleCount: 8,
  maximumAbsoluteErrorBps: 420,
  latestAbsoluteErrorBps: 275,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  persistenceState: "PERSISTENT" as const
}));

const timingRecovery = shellIds.map((shellId) => ({
  recoveryId: "timing-recovery-" + shellId,
  shellId,
  observedAt: "2026-11-14T21:01:00.000Z",
  driftDetected: false,
  preRecoveryLeadHours: 0,
  postRecoveryLeadHours: 0,
  recoveryWindowHours: 0,
  sampleCount: 1,
  thresholdBreachOccurred: false,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  recoveryState: "NOT_REQUIRED" as const
}));

const linkagePrevention = appIds.map((appId) => ({
  preventionId: "linkage-prevention-" + appId,
  appId,
  repository: BUILD_402_APPLICATION_REPOSITORIES[appId],
  topologyId: BUILD_402_TOPOLOGY_ID,
  observedAt: "2026-11-14T21:02:00.000Z",
  productionMainSha: "c".repeat(40),
  manifestSha256: "d".repeat(64),
  evidenceAgeHours: 1,
  observationWindowHours: 96,
  sampleCount: 4,
  selfIdentityMatches: true,
  canonicalTopologyMatches: true,
  validationAuthorityMatches: true,
  linkageRecurrenceDetected: false,
  staleEvidenceRecurrenceDetected: false,
  authorityTransferDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  preventionState: "PREVENTED" as const
}));

const held402 = {
  governanceState: "LINKAGE_CONTINUITY_DRIFT_DETECTED"
} as unknown as Build402GovernanceAssessment;
assert.equal(
  assessBuild403Governance({
    build402: held402,
    recalibrationPersistence: persistence,
    renewalTimingRecovery: timingRecovery,
    linkageRecurrencePrevention: linkagePrevention
  }).governanceState,
  "HOLD_BUILD402_NOT_VERIFIED"
);

const missingPersistence = assessBuild403Governance({
  build402: build402Verified
});
assert.equal(
  missingPersistence.governanceState,
  "RECALIBRATION_PERSISTENCE_EVIDENCE_REQUIRED"
);
assert.equal(missingPersistence.missingPersistenceShells.length, 5);

const driftedPersistence = assessBuild403Governance({
  build402: build402Verified,
  recalibrationPersistence: persistence.map((item) =>
    item.shellId === "rosevear-comms-hub"
      ? {
          ...item,
          maximumAbsoluteErrorBps: 650,
          latestAbsoluteErrorBps: 575,
          recurrenceDetected: true,
          persistenceState: "DRIFTED" as const
        }
      : item
  )
});
assert.equal(
  driftedPersistence.governanceState,
  "RECALIBRATION_PERSISTENCE_DRIFT_DETECTED"
);
assert.deepEqual(driftedPersistence.recalibrationPersistenceDriftShells, [
  "rosevear-comms-hub"
]);

const missingTiming = assessBuild403Governance({
  build402: build402Verified,
  recalibrationPersistence: persistence
});
assert.equal(
  missingTiming.governanceState,
  "RENEWAL_TIMING_RECOVERY_EVIDENCE_REQUIRED"
);

const unrecoveredTiming = assessBuild403Governance({
  build402: build402Verified,
  recalibrationPersistence: persistence,
  renewalTimingRecovery: timingRecovery.map((item) =>
    item.shellId === "yw"
      ? {
          ...item,
          driftDetected: true,
          preRecoveryLeadHours: 30,
          postRecoveryLeadHours: 28,
          recoveryWindowHours: 24,
          sampleCount: 3,
          recoveryState: "UNRECOVERED" as const
        }
      : item
  )
});
assert.equal(
  unrecoveredTiming.governanceState,
  "RENEWAL_TIMING_DRIFT_NOT_RECOVERED"
);
assert.deepEqual(unrecoveredTiming.unrecoveredTimingDriftShells, ["yw"]);

const recoveredTiming = timingRecovery.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        driftDetected: true,
        preRecoveryLeadHours: 30,
        postRecoveryLeadHours: 12,
        recoveryWindowHours: 36,
        sampleCount: 4,
        recoveryState: "RECOVERED" as const
      }
    : item
);

const missingPrevention = assessBuild403Governance({
  build402: build402Verified,
  recalibrationPersistence: persistence,
  renewalTimingRecovery: recoveredTiming
});
assert.equal(
  missingPrevention.governanceState,
  "LINKAGE_RECURRENCE_PREVENTION_EVIDENCE_REQUIRED"
);
assert.equal(missingPrevention.missingLinkagePreventionApplications.length, 7);

const recurrentLinkage = assessBuild403Governance({
  build402: build402Verified,
  recalibrationPersistence: persistence,
  renewalTimingRecovery: recoveredTiming,
  linkageRecurrencePrevention: linkagePrevention.map((item) =>
    item.appId === "rosiedazzlers"
      ? {
          ...item,
          linkageRecurrenceDetected: true,
          preventionState: "RECURRENCE" as const
        }
      : item
  )
});
assert.equal(recurrentLinkage.governanceState, "LINKAGE_RECURRENCE_DETECTED");
assert.deepEqual(recurrentLinkage.linkageRecurrenceApplications, [
  "rosiedazzlers"
]);

const verified = assessBuild403Governance({
  build402: build402Verified,
  recalibrationPersistence: persistence,
  renewalTimingRecovery: recoveredTiming,
  linkageRecurrencePrevention: linkagePrevention
});
assert.equal(
  verified.governanceState,
  "RECURRENCE_PREVENTION_GOVERNANCE_VERIFIED"
);

const topology = JSON.parse(
  source("../../.github/rosevear-master-topology.v1.json")
);
assert.equal(topology.topologyId, BUILD_402_TOPOLOGY_ID);
assert.equal(topology.applications.length, 7);
assert.equal(topology.rules.authorityTransfer, false);

const migration = source(
  "../../db/migrations/0166_master_recalibration_persistence_renewal_drift_linkage_recurrence_prevention.sql"
);
for (const token of [
  "master_build403_recalibration_persistence_validation",
  "master_build403_renewal_timing_drift_recovery",
  "master_build403_linkage_recurrence_prevention",
  "maximum_absolute_error_bps between 0 and 500",
  "post_recovery_lead_hours between 6 and 24",
  "rosevear-master-shell-seven-apps.v1",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_403_RECALIBRATION_PERSISTENCE_RENEWAL_DRIFT_LINKAGE_RECURRENCE_PREVENTION.md"
);
for (const token of [
  "72-hour",
  "seven samples",
  "6–24-hour",
  "All seven applications",
  "stale-evidence recurrence",
  "authority transfer remains forbidden"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 403 recurrence-prevention governance",
  "Recalibration persistence validation",
  "Renewal timing drift recovery",
  "Seven-application recurrence prevention",
  "Fail-closed recurrence prevention"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build403_recalibration_persistence_validation"',
  '"master_build403_renewal_timing_drift_recovery"',
  '"master_build403_linkage_recurrence_prevention"',
  '"0166_master_recalibration_persistence_renewal_drift_linkage_recurrence_prevention.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-403-recalibration-persistence-renewal-drift-linkage-recurrence-prevention.ts";
assert.equal(String(pkg.scripts["verify:build403"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 403 Recalibration Persistence Validation, Renewal Timing Drift Recovery & Seven-Application Linkage Recurrence Prevention Governance verification passed."
);
