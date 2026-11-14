import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build400PredictiveRenewalAssessment } from "../lib/master-warning-response-assurance-recovery-predictive-renewal";
import {
  BUILD_401,
  BUILD_401_MAX_FORECAST_ERROR_BPS,
  BUILD_401_MIN_CONFIDENCE_BPS,
  BUILD_401_MIN_EXECUTION_LEAD_HOURS,
  BUILD_401_MIN_RESTORATION_BPS,
  BUILD_401_THEME_VERSION,
  assessBuild401PredictiveRenewalExecution
} from "../lib/master-predictive-renewal-execution-confidence-forecast-accuracy";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_401, 401);
assert.equal(BUILD_401_THEME_VERSION, "rosevear-master-instrument.v1");
assert.equal(BUILD_401_MIN_CONFIDENCE_BPS, 7000);
assert.equal(BUILD_401_MIN_RESTORATION_BPS, 250);
assert.equal(BUILD_401_MAX_FORECAST_ERROR_BPS, 500);
assert.equal(BUILD_401_MIN_EXECUTION_LEAD_HOURS, 6);

const build400Verified = {
  governanceState: "PREDICTIVE_RENEWAL_GOVERNANCE_VERIFIED"
} as unknown as Build400PredictiveRenewalAssessment;

const shellIds = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
] as const;

const executions = shellIds.map((shellId) => ({
  executionId: "execution-" + shellId,
  shellId,
  observedAt: "2026-11-14T14:00:00.000Z",
  advanceRenewalRequired: false,
  executionLeadHours: 0,
  executionEvidenceCurrent: true,
  ownerReviewed: true,
  independentlyVerified: true,
  executionState: "NOT_REQUIRED" as const
}));

const restorations = shellIds.map((shellId) => ({
  restorationId: "restoration-" + shellId,
  shellId,
  observedAt: "2026-11-14T14:01:00.000Z",
  renewalExecuted: false,
  preRenewalConfidenceBps: 8300,
  postRenewalConfidenceBps: 8300,
  observationWindowHours: 0,
  sampleCount: 0,
  recurrenceDetected: false,
  ownerReviewed: true,
  independentlyVerified: true,
  restorationState: "NOT_REQUIRED" as const
}));

const forecasts = shellIds.map((shellId) => ({
  forecastId: "forecast-" + shellId,
  shellId,
  observedAt: "2026-11-14T14:02:00.000Z",
  predictedConfidenceBps: 8200,
  observedConfidenceBps: 8100,
  absoluteErrorBps: 100,
  forecastHorizonHours: 72,
  sampleCount: 5,
  ownerReviewed: true,
  independentlyVerified: true,
  accuracyState: "ACCURATE" as const
}));

const held = {
  governanceState: "PREDICTIVE_RENEWAL_ACTION_REQUIRED"
} as unknown as Build400PredictiveRenewalAssessment;
assert.equal(
  assessBuild401PredictiveRenewalExecution({
    build400: held,
    renewalExecutions: executions,
    confidenceRestorations: restorations,
    forecastAccuracy: forecasts
  }).governanceState,
  "HOLD_BUILD400_NOT_VERIFIED"
);

const missingExecution = assessBuild401PredictiveRenewalExecution({
  build400: build400Verified
});
assert.equal(
  missingExecution.governanceState,
  "PREDICTIVE_RENEWAL_EXECUTION_REQUIRED"
);
assert.equal(missingExecution.missingExecutionShells.length, 5);

const ineffectiveExecution = assessBuild401PredictiveRenewalExecution({
  build400: build400Verified,
  renewalExecutions: executions.map((item) =>
    item.shellId === "icamp"
      ? {
          ...item,
          advanceRenewalRequired: true,
          executionLeadHours: 2,
          executionState: "LATE" as const
        }
      : item
  )
});
assert.equal(
  ineffectiveExecution.governanceState,
  "PREDICTIVE_RENEWAL_EXECUTION_INEFFECTIVE"
);
assert.deepEqual(ineffectiveExecution.ineffectiveExecutionShells, ["icamp"]);

const missingRestoration = assessBuild401PredictiveRenewalExecution({
  build400: build400Verified,
  renewalExecutions: executions
});
assert.equal(
  missingRestoration.governanceState,
  "POST_RENEWAL_CONFIDENCE_EVIDENCE_REQUIRED"
);

const unrestored = assessBuild401PredictiveRenewalExecution({
  build400: build400Verified,
  renewalExecutions: executions,
  confidenceRestorations: restorations.map((item) =>
    item.shellId === "yw"
      ? {
          ...item,
          renewalExecuted: true,
          preRenewalConfidenceBps: 6800,
          postRenewalConfidenceBps: 6950,
          observationWindowHours: 24,
          sampleCount: 3,
          restorationState: "NOT_RESTORED" as const
        }
      : item
  )
});
assert.equal(
  unrestored.governanceState,
  "POST_RENEWAL_CONFIDENCE_NOT_RESTORED"
);
assert.deepEqual(unrestored.unrestoredConfidenceShells, ["yw"]);

const missingAccuracy = assessBuild401PredictiveRenewalExecution({
  build400: build400Verified,
  renewalExecutions: executions,
  confidenceRestorations: restorations
});
assert.equal(
  missingAccuracy.governanceState,
  "FORECAST_ACCURACY_EVIDENCE_REQUIRED"
);

const inaccurate = assessBuild401PredictiveRenewalExecution({
  build400: build400Verified,
  renewalExecutions: executions,
  confidenceRestorations: restorations,
  forecastAccuracy: forecasts.map((item) =>
    item.shellId === "rosevear-ai-hub"
      ? {
          ...item,
          predictedConfidenceBps: 8200,
          observedConfidenceBps: 7500,
          absoluteErrorBps: 700,
          accuracyState: "RECALIBRATE" as const
        }
      : item
  )
});
assert.equal(inaccurate.governanceState, "FORECAST_RECALIBRATION_REQUIRED");
assert.deepEqual(inaccurate.inaccurateForecastShells, ["rosevear-ai-hub"]);

const effectiveExecution = executions.map((item) =>
  item.shellId === "icamp"
    ? {
        ...item,
        advanceRenewalRequired: true,
        executionLeadHours: 10,
        executionState: "EXECUTED" as const
      }
    : item
);
const restored = restorations.map((item) =>
  item.shellId === "icamp"
    ? {
        ...item,
        renewalExecuted: true,
        preRenewalConfidenceBps: 6800,
        postRenewalConfidenceBps: 7300,
        observationWindowHours: 36,
        sampleCount: 4,
        restorationState: "RESTORED" as const
      }
    : item
);
const tolerance = forecasts.map((item) =>
  item.shellId === "rosevear-comms-hub"
    ? {
        ...item,
        predictedConfidenceBps: 8200,
        observedConfidenceBps: 7800,
        absoluteErrorBps: 400,
        accuracyState: "TOLERABLE" as const
      }
    : item
);

const verified = assessBuild401PredictiveRenewalExecution({
  build400: build400Verified,
  renewalExecutions: effectiveExecution,
  confidenceRestorations: restored,
  forecastAccuracy: tolerance
});
assert.equal(
  verified.governanceState,
  "PREDICTIVE_RENEWAL_EXECUTION_GOVERNANCE_VERIFIED"
);

const topology = JSON.parse(
  source("../../.github/rosevear-master-topology.v1.json")
);
assert.equal(topology.schema, "rosevear.master-repository-topology.v1");
assert.equal(topology.topologyId, "rosevear-master-shell-seven-apps.v1");
assert.equal(topology.validationAuthority.appId, "ai-data-platform");
assert.equal(topology.validationAuthority.role, "MASTER_TOP_TIER");
assert.equal(topology.rules.masterApplications, 3);
assert.equal(topology.rules.governedExternalShellApplications, 2);
assert.equal(topology.rules.directMasterApplications, 2);
assert.equal(topology.rules.authorityTransfer, false);
assert.equal(topology.applications.length, 7);
assert.deepEqual(
  topology.applications
    .filter((item: { connectionModel: string }) => item.connectionModel === "GOVERNED_EXTERNAL_SHELL")
    .map((item: { appId: string }) => item.appId)
    .sort(),
  ["icamp", "yw"]
);
assert.deepEqual(
  topology.applications
    .filter((item: { connectionModel: string }) => item.connectionModel === "DIRECT_MASTER_APPLICATION")
    .map((item: { appId: string }) => item.appId)
    .sort(),
  ["devilndove", "rosiedazzlers"]
);

const migration = source(
  "../../db/migrations/0164_master_predictive_renewal_execution_confidence_forecast_accuracy.sql"
);
for (const token of [
  "master_build401_predictive_renewal_execution",
  "master_build401_post_renewal_confidence_restoration",
  "master_build401_forecast_accuracy_governance",
  "execution_lead_hours >= 6",
  "post_renewal_confidence_bps-pre_renewal_confidence_bps) >= 250",
  "absolute_error_bps <= 500",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_401_PREDICTIVE_RENEWAL_EXECUTION_CONFIDENCE_FORECAST_ACCURACY.md"
);
for (const token of [
  "at least six hours of lead time",
  "improve by at least 250 basis points",
  "Absolute forecast error must remain at or below 500 basis points",
  "AI Data Platform is the top-tier validation authority",
  "does not transfer runtime"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 401 execution governance"));
assert.ok(masterPage.includes("Predictive renewal execution"));
assert.ok(masterPage.includes("Post-renewal confidence restoration"));
assert.ok(masterPage.includes("Forecast accuracy governance"));
assert.ok(masterPage.includes("Seven-application GitHub topology"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build401_predictive_renewal_execution"',
  '"master_build401_post_renewal_confidence_restoration"',
  '"master_build401_forecast_accuracy_governance"',
  '"0164_master_predictive_renewal_execution_confidence_forecast_accuracy.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-401-predictive-renewal-execution-confidence-forecast-accuracy.ts";
assert.equal(String(pkg.scripts["verify:build401"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 401 Predictive Renewal Execution Effectiveness, Post-Renewal Confidence Restoration & Cross-Shell Forecast Accuracy Governance verification passed."
);
