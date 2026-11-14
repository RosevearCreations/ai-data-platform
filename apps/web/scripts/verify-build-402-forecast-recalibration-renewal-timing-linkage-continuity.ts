import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build401PredictiveRenewalExecutionAssessment } from "../lib/master-predictive-renewal-execution-confidence-forecast-accuracy";
import {
  BUILD_402,
  BUILD_402_APPLICATION_REPOSITORIES,
  BUILD_402_MAX_FORECAST_ERROR_BPS,
  BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS,
  BUILD_402_MAX_RENEWAL_LEAD_HOURS,
  BUILD_402_MIN_RECALIBRATION_SAMPLES,
  BUILD_402_MIN_RECALIBRATION_WINDOW_HOURS,
  BUILD_402_MIN_RENEWAL_LEAD_HOURS,
  BUILD_402_THEME_VERSION,
  BUILD_402_TOPOLOGY_ID,
  assessBuild402Governance
} from "../lib/master-forecast-recalibration-renewal-timing-linkage-continuity";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_402, 402);
assert.equal(BUILD_402_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_402_MAX_FORECAST_ERROR_BPS, 500);
assert.equal(BUILD_402_MIN_RECALIBRATION_WINDOW_HOURS, 24);
assert.equal(BUILD_402_MIN_RECALIBRATION_SAMPLES, 5);
assert.equal(BUILD_402_MIN_RENEWAL_LEAD_HOURS, 6);
assert.equal(BUILD_402_MAX_RENEWAL_LEAD_HOURS, 24);
assert.equal(BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS, 24);
assert.equal(BUILD_402_TOPOLOGY_ID, "rosevear-master-shell-seven-apps.v1");

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

const build401Verified = {
  governanceState: "PREDICTIVE_RENEWAL_EXECUTION_GOVERNANCE_VERIFIED"
} as unknown as Build401PredictiveRenewalExecutionAssessment;

const recalibrations = shellIds.map((shellId) => ({
  recalibrationId: "recal-" + shellId,
  shellId,
  observedAt: "2026-11-14T16:00:00.000Z",
  recalibrationRequired: false,
  baselineAbsoluteErrorBps: 200,
  postRecalibrationAbsoluteErrorBps: 200,
  observationWindowHours: 0,
  sampleCount: 0,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  recalibrationState: "NOT_REQUIRED" as const
}));

const timing = shellIds.map((shellId) => ({
  timingId: "timing-" + shellId,
  shellId,
  observedAt: "2026-11-14T16:01:00.000Z",
  advanceRenewalRequired: false,
  executionLeadHours: 0,
  thresholdBreachOccurred: false,
  ownerReviewed: true,
  independentlyVerified: true,
  timingState: "NOT_REQUIRED" as const
}));

const continuity = appIds.map((appId) => ({
  continuityId: "continuity-" + appId,
  appId,
  repository: BUILD_402_APPLICATION_REPOSITORIES[appId],
  topologyId: BUILD_402_TOPOLOGY_ID,
  observedAt: "2026-11-14T16:02:00.000Z",
  productionMainSha: "a".repeat(40),
  manifestSha256: "b".repeat(64),
  evidenceAgeHours: 1,
  selfIdentityMatches: true,
  canonicalTopologyMatches: true,
  validationAuthorityMatches: true,
  authorityTransferFalse: true,
  ownerReviewed: true,
  independentlyVerified: true,
  continuityState: "CURRENT" as const
}));

const held401 = {
  governanceState: "FORECAST_RECALIBRATION_REQUIRED"
} as unknown as Build401PredictiveRenewalExecutionAssessment;
assert.equal(
  assessBuild402Governance({
    build401: held401,
    recalibrations,
    renewalTiming: timing,
    linkageContinuity: continuity
  }).governanceState,
  "HOLD_BUILD401_NOT_VERIFIED"
);

const missingRecal = assessBuild402Governance({ build401: build401Verified });
assert.equal(
  missingRecal.governanceState,
  "FORECAST_RECALIBRATION_EVIDENCE_REQUIRED"
);
assert.equal(missingRecal.missingRecalibrationShells.length, 5);

const ineffectiveRecal = assessBuild402Governance({
  build401: build401Verified,
  recalibrations: recalibrations.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          recalibrationRequired: true,
          baselineAbsoluteErrorBps: 800,
          postRecalibrationAbsoluteErrorBps: 650,
          observationWindowHours: 24,
          sampleCount: 5,
          recalibrationState: "INEFFECTIVE" as const
        }
      : item
  )
});
assert.equal(
  ineffectiveRecal.governanceState,
  "FORECAST_RECALIBRATION_INEFFECTIVE"
);
assert.deepEqual(ineffectiveRecal.ineffectiveRecalibrationShells, [
  "rosevear-ai-hub"
]);

const missingTiming = assessBuild402Governance({
  build401: build401Verified,
  recalibrations
});
assert.equal(missingTiming.governanceState, "RENEWAL_TIMING_EVIDENCE_REQUIRED");

const badTiming = assessBuild402Governance({
  build401: build401Verified,
  recalibrations,
  renewalTiming: timing.map((item) =>
    item.shellId === "yw"
      ? {
          ...item,
          advanceRenewalRequired: true,
          executionLeadHours: 3,
          timingState: "LATE" as const
        }
      : item
  )
});
assert.equal(
  badTiming.governanceState,
  "RENEWAL_TIMING_OPTIMIZATION_REQUIRED"
);
assert.deepEqual(badTiming.nonOptimalTimingShells, ["yw"]);

const missingContinuity = assessBuild402Governance({
  build401: build401Verified,
  recalibrations,
  renewalTiming: timing
});
assert.equal(
  missingContinuity.governanceState,
  "LINKAGE_CONTINUITY_EVIDENCE_REQUIRED"
);
assert.equal(missingContinuity.missingContinuityApplications.length, 7);

const driftedContinuity = assessBuild402Governance({
  build401: build401Verified,
  recalibrations,
  renewalTiming: timing,
  linkageContinuity: continuity.map((item) =>
    item.appId === "devilndove"
      ? {
          ...item,
          canonicalTopologyMatches: false,
          continuityState: "DRIFTED" as const
        }
      : item
  )
});
assert.equal(
  driftedContinuity.governanceState,
  "LINKAGE_CONTINUITY_DRIFT_DETECTED"
);
assert.deepEqual(driftedContinuity.linkageDriftApplications, ["devilndove"]);

const effectiveRecal = recalibrations.map((item) =>
  item.shellId === "rosevear-ai-hub"
    ? {
        ...item,
        recalibrationRequired: true,
        baselineAbsoluteErrorBps: 800,
        postRecalibrationAbsoluteErrorBps: 350,
        observationWindowHours: 36,
        sampleCount: 6,
        recalibrationState: "EFFECTIVE" as const
      }
    : item
);
const optimizedTiming = timing.map((item) =>
  item.shellId === "yw"
    ? {
        ...item,
        advanceRenewalRequired: true,
        executionLeadHours: 12,
        timingState: "OPTIMAL" as const
      }
    : item
);
assert.equal(
  assessBuild402Governance({
    build401: build401Verified,
    recalibrations: effectiveRecal,
    renewalTiming: optimizedTiming,
    linkageContinuity: continuity
  }).governanceState,
  "SEVEN_APPLICATION_CONTINUITY_GOVERNANCE_VERIFIED"
);

const topology = JSON.parse(
  source("../../.github/rosevear-master-topology.v1.json")
);
assert.equal(topology.topologyId, BUILD_402_TOPOLOGY_ID);
assert.equal(topology.applications.length, 7);
assert.equal(topology.rules.masterApplications, 3);
assert.equal(topology.rules.governedExternalShellApplications, 2);
assert.equal(topology.rules.directMasterApplications, 2);
assert.equal(topology.rules.authorityTransfer, false);

const migration = source(
  "../../db/migrations/0165_master_forecast_recalibration_renewal_timing_linkage_continuity.sql"
);
for (const token of [
  "master_build402_forecast_recalibration_effectiveness",
  "master_build402_renewal_timing_optimization",
  "master_build402_linkage_continuity",
  "post_recalibration_absolute_error_bps <= 500",
  "execution_lead_hours between 6 and 24",
  "rosevear-master-shell-seven-apps.v1",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_402_FORECAST_RECALIBRATION_RENEWAL_TIMING_LINKAGE_CONTINUITY.md"
);
for (const token of [
  "500 basis points or less",
  "6–24 hours",
  "All seven applications",
  "authorityTransfer=false",
  "Evidence older than 24 hours"
]) assert.ok(docs.includes(token), "documentation token " + token);

const envGuide = source(
  "../../docs/AI_DATA_PLATFORM_VARIABLES_AND_SECRETS_SETUP.md"
);
for (const token of [
  "Vercel → ai-data-platform → Settings → Environment Variables",
  "GitHub Actions — clean result",
  "Cloudflare — clean result",
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BROWSERLESS_API_TOKEN",
  "AI_GATEWAY_API_KEY",
  "rotate, do not copy"
]) assert.ok(envGuide.includes(token), "environment-guide token " + token);
for (const forbidden of ["postgresql://", "cfut_", "BEGIN PRIVATE KEY"]) {
  assert.ok(!envGuide.includes(forbidden), "environment guide must not contain secret material: " + forbidden);
}

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 402 continuity governance",
  "Forecast recalibration effectiveness",
  "Renewal timing optimization",
  "Seven-application linkage continuity",
  "Fail-closed continuity"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build402_forecast_recalibration_effectiveness"',
  '"master_build402_renewal_timing_optimization"',
  '"master_build402_linkage_continuity"',
  '"0165_master_forecast_recalibration_renewal_timing_linkage_continuity.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-402-forecast-recalibration-renewal-timing-linkage-continuity.ts";
assert.equal(String(pkg.scripts["verify:build402"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 402 Forecast Recalibration Effectiveness, Renewal Timing Optimization & Seven-Application Master/Shell Linkage Continuity Governance verification passed."
);
