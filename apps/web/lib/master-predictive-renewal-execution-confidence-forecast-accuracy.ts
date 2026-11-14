import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build400PredictiveRenewalAssessment } from "./master-warning-response-assurance-recovery-predictive-renewal";

export const BUILD_401 = 401 as const;
export const BUILD_401_SCHEMA =
  "rosevear.ai-data-platform.predictive-renewal-execution-confidence-forecast-accuracy.v1" as const;
export const BUILD_401_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_401_MIN_CONFIDENCE_BPS = 7000 as const;
export const BUILD_401_MIN_RESTORATION_BPS = 250 as const;
export const BUILD_401_MAX_FORECAST_ERROR_BPS = 500 as const;
export const BUILD_401_MIN_EXECUTION_LEAD_HOURS = 6 as const;

export type Build401PredictiveRenewalExecution = {
  executionId: string;
  shellId: Build391ShellId;
  observedAt: string;
  advanceRenewalRequired: boolean;
  executionLeadHours: number;
  executionEvidenceCurrent: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  executionState: "NOT_REQUIRED" | "EXECUTED" | "LATE" | "FAILED" | "HOLD";
};

export type Build401PostRenewalConfidenceRestoration = {
  restorationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  renewalExecuted: boolean;
  preRenewalConfidenceBps: number;
  postRenewalConfidenceBps: number;
  observationWindowHours: number;
  sampleCount: number;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  restorationState: "NOT_REQUIRED" | "RESTORED" | "NOT_RESTORED" | "HOLD";
};

export type Build401ForecastAccuracyGovernance = {
  forecastId: string;
  shellId: Build391ShellId;
  observedAt: string;
  predictedConfidenceBps: number;
  observedConfidenceBps: number;
  absoluteErrorBps: number;
  forecastHorizonHours: number;
  sampleCount: number;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  accuracyState: "ACCURATE" | "TOLERABLE" | "RECALIBRATE" | "HOLD";
};

const REQUIRED_SHELLS: readonly Build391ShellId[] = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
];

function latestByShell<T extends { shellId: Build391ShellId; observedAt: string }>(
  values: readonly T[]
) {
  const latest = new Map<Build391ShellId, T>();
  for (const item of [...values].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latest.has(item.shellId)) latest.set(item.shellId, item);
  }
  return latest;
}

function validBps(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 10_000;
}

export function assessBuild401PredictiveRenewalExecution(input: {
  build400: Build400PredictiveRenewalAssessment;
  renewalExecutions?: readonly Build401PredictiveRenewalExecution[];
  confidenceRestorations?: readonly Build401PostRenewalConfidenceRestoration[];
  forecastAccuracy?: readonly Build401ForecastAccuracyGovernance[];
}) {
  const build400Eligible =
    input.build400.governanceState === "PREDICTIVE_RENEWAL_GOVERNANCE_VERIFIED";

  const executionByShell = latestByShell(input.renewalExecutions ?? []);
  const missingExecutionShells = REQUIRED_SHELLS.filter(
    (shellId) => !executionByShell.has(shellId)
  );
  const ineffectiveExecutionShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = executionByShell.get(shellId);
    if (!item) return false;

    if (!item.advanceRenewalRequired) {
      return !(
        item.executionLeadHours === 0 &&
        item.executionEvidenceCurrent &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.executionState === "NOT_REQUIRED"
      );
    }

    return !(
      item.executionLeadHours >= BUILD_401_MIN_EXECUTION_LEAD_HOURS &&
      item.executionEvidenceCurrent &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.executionState === "EXECUTED"
    );
  });

  const restorationByShell = latestByShell(input.confidenceRestorations ?? []);
  const missingRestorationShells = REQUIRED_SHELLS.filter(
    (shellId) => !restorationByShell.has(shellId)
  );
  const unrestoredConfidenceShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = restorationByShell.get(shellId);
    if (!item) return false;

    if (!item.renewalExecuted) {
      return !(
        validBps(item.preRenewalConfidenceBps) &&
        validBps(item.postRenewalConfidenceBps) &&
        item.preRenewalConfidenceBps === item.postRenewalConfidenceBps &&
        item.postRenewalConfidenceBps >= BUILD_401_MIN_CONFIDENCE_BPS &&
        !item.recurrenceDetected &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.restorationState === "NOT_REQUIRED"
      );
    }

    const restoredBps = Math.max(
      0,
      item.postRenewalConfidenceBps - item.preRenewalConfidenceBps
    );
    return !(
      validBps(item.preRenewalConfidenceBps) &&
      validBps(item.postRenewalConfidenceBps) &&
      item.observationWindowHours >= 24 &&
      item.sampleCount >= 3 &&
      restoredBps >= BUILD_401_MIN_RESTORATION_BPS &&
      item.postRenewalConfidenceBps >= BUILD_401_MIN_CONFIDENCE_BPS &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.restorationState === "RESTORED"
    );
  });

  const accuracyByShell = latestByShell(input.forecastAccuracy ?? []);
  const missingAccuracyShells = REQUIRED_SHELLS.filter(
    (shellId) => !accuracyByShell.has(shellId)
  );
  const inaccurateForecastShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = accuracyByShell.get(shellId);
    if (!item) return false;

    const expectedError = Math.abs(
      item.predictedConfidenceBps - item.observedConfidenceBps
    );
    return !(
      validBps(item.predictedConfidenceBps) &&
      validBps(item.observedConfidenceBps) &&
      item.absoluteErrorBps === expectedError &&
      item.absoluteErrorBps <= BUILD_401_MAX_FORECAST_ERROR_BPS &&
      item.forecastHorizonHours >= 72 &&
      item.sampleCount >= 5 &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      (item.accuracyState === "ACCURATE" || item.accuracyState === "TOLERABLE")
    );
  });

  const governanceState =
    !build400Eligible
      ? ("HOLD_BUILD400_NOT_VERIFIED" as const)
      : missingExecutionShells.length > 0
        ? ("PREDICTIVE_RENEWAL_EXECUTION_REQUIRED" as const)
        : ineffectiveExecutionShells.length > 0
          ? ("PREDICTIVE_RENEWAL_EXECUTION_INEFFECTIVE" as const)
          : missingRestorationShells.length > 0
            ? ("POST_RENEWAL_CONFIDENCE_EVIDENCE_REQUIRED" as const)
            : unrestoredConfidenceShells.length > 0
              ? ("POST_RENEWAL_CONFIDENCE_NOT_RESTORED" as const)
              : missingAccuracyShells.length > 0
                ? ("FORECAST_ACCURACY_EVIDENCE_REQUIRED" as const)
                : inaccurateForecastShells.length > 0
                  ? ("FORECAST_RECALIBRATION_REQUIRED" as const)
                  : ("PREDICTIVE_RENEWAL_EXECUTION_GOVERNANCE_VERIFIED" as const);

  return {
    schema: BUILD_401_SCHEMA,
    build: BUILD_401,
    themeVersion: BUILD_401_THEME_VERSION,
    minimumConfidenceBps: BUILD_401_MIN_CONFIDENCE_BPS,
    minimumRestorationBps: BUILD_401_MIN_RESTORATION_BPS,
    maximumForecastErrorBps: BUILD_401_MAX_FORECAST_ERROR_BPS,
    minimumExecutionLeadHours: BUILD_401_MIN_EXECUTION_LEAD_HOURS,
    build400Eligible,
    missingExecutionShells,
    ineffectiveExecutionShells,
    missingRestorationShells,
    unrestoredConfidenceShells,
    missingAccuracyShells,
    inaccurateForecastShells,
    governanceState,
    blockers: [
      ...(!build400Eligible
        ? ["Build 400 predictive renewal governance must be verified before Build 401 can close."]
        : []),
      ...(missingExecutionShells.length
        ? ["Predictive renewal execution evidence is missing for: " + missingExecutionShells.join(", ")]
        : []),
      ...(ineffectiveExecutionShells.length
        ? ["Predictive renewal execution is late, failed or unverified for: " + ineffectiveExecutionShells.join(", ")]
        : []),
      ...(missingRestorationShells.length
        ? ["Post-renewal confidence restoration evidence is missing for: " + missingRestorationShells.join(", ")]
        : []),
      ...(unrestoredConfidenceShells.length
        ? ["Post-renewal confidence is not restored or verified for: " + unrestoredConfidenceShells.join(", ")]
        : []),
      ...(missingAccuracyShells.length
        ? ["Forecast accuracy evidence is missing for: " + missingAccuracyShells.join(", ")]
        : []),
      ...(inaccurateForecastShells.length
        ? ["Forecast error exceeds tolerance or requires recalibration for: " + inaccurateForecastShells.join(", ")]
        : [])
    ],
    policy: {
      requiredAdvanceRenewalsMustExecuteAtLeastSixHoursBeforeProjectedBreach: true,
      executedRenewalsRequire24HourConfidenceRestorationEvidence: true,
      postRenewalConfidenceMustRecoverAtLeast250BpsAndReachFloor: true,
      forecastAccuracyUses72HourHorizonAndFiveSamples: true,
      forecastAbsoluteErrorMustNotExceed500Bps: true,
      deploymentGreenCannotSubstituteForExecutionRestorationOrAccuracyEvidence: true
    }
  };
}

export type Build401PredictiveRenewalExecutionAssessment = ReturnType<
  typeof assessBuild401PredictiveRenewalExecution
>;
