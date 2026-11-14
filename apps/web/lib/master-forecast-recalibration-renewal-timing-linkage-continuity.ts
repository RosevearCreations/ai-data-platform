import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build401PredictiveRenewalExecutionAssessment } from "./master-predictive-renewal-execution-confidence-forecast-accuracy";

export const BUILD_402 = 402 as const;
export const BUILD_402_SCHEMA =
  "rosevear.ai-data-platform.forecast-recalibration-renewal-timing-linkage-continuity.v1" as const;
export const BUILD_402_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_402_MAX_FORECAST_ERROR_BPS = 500 as const;
export const BUILD_402_MIN_RECALIBRATION_WINDOW_HOURS = 24 as const;
export const BUILD_402_MIN_RECALIBRATION_SAMPLES = 5 as const;
export const BUILD_402_MIN_RENEWAL_LEAD_HOURS = 6 as const;
export const BUILD_402_MAX_RENEWAL_LEAD_HOURS = 24 as const;
export const BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS = 24 as const;
export const BUILD_402_TOPOLOGY_ID = "rosevear-master-shell-seven-apps.v1" as const;

export type Build402ApplicationId =
  | "ai-data-platform"
  | "rosevear-comms-hub"
  | "rosevear-ai-hub"
  | "yw"
  | "icamp"
  | "devilndove"
  | "rosiedazzlers";

export const BUILD_402_APPLICATION_REPOSITORIES: Readonly<
  Record<Build402ApplicationId, string>
> = {
  "ai-data-platform": "RosevearCreations/ai-data-platform",
  "rosevear-comms-hub": "RosevearCreations/rosevear-comms-hub",
  "rosevear-ai-hub": "RosevearCreations/rosevear-ai-hub",
  yw: "RosevearCreations/yw",
  icamp: "RosevearCreations/iCamp",
  devilndove: "RosevearCreations/devilndove-site",
  rosiedazzlers: "RosevearCreations/rosiedazzlers"
};

const REQUIRED_SHELLS: readonly Build391ShellId[] = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
];

const REQUIRED_APPLICATIONS = Object.keys(
  BUILD_402_APPLICATION_REPOSITORIES
) as Build402ApplicationId[];

export type Build402ForecastRecalibrationEffectiveness = {
  recalibrationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  recalibrationRequired: boolean;
  baselineAbsoluteErrorBps: number;
  postRecalibrationAbsoluteErrorBps: number;
  observationWindowHours: number;
  sampleCount: number;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  recalibrationState: "NOT_REQUIRED" | "EFFECTIVE" | "INEFFECTIVE" | "HOLD";
};

export type Build402RenewalTimingOptimization = {
  timingId: string;
  shellId: Build391ShellId;
  observedAt: string;
  advanceRenewalRequired: boolean;
  executionLeadHours: number;
  thresholdBreachOccurred: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  timingState: "NOT_REQUIRED" | "OPTIMAL" | "EARLY" | "LATE" | "HOLD";
};

export type Build402LinkageContinuity = {
  continuityId: string;
  appId: Build402ApplicationId;
  repository: string;
  topologyId: string;
  observedAt: string;
  productionMainSha: string;
  manifestSha256: string;
  evidenceAgeHours: number;
  selfIdentityMatches: boolean;
  canonicalTopologyMatches: boolean;
  validationAuthorityMatches: boolean;
  authorityTransferFalse: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  continuityState: "CURRENT" | "DRIFTED" | "STALE" | "HOLD";
};

function latestByShell<T extends { shellId: Build391ShellId; observedAt: string }>(
  records: readonly T[]
) {
  const latest = new Map<Build391ShellId, T>();
  for (const item of [...records].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latest.has(item.shellId)) latest.set(item.shellId, item);
  }
  return latest;
}

function latestByApplication<
  T extends { appId: Build402ApplicationId; observedAt: string }
>(records: readonly T[]) {
  const latest = new Map<Build402ApplicationId, T>();
  for (const item of [...records].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latest.has(item.appId)) latest.set(item.appId, item);
  }
  return latest;
}

function validBps(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 10_000;
}

function validHex(value: string, length: number) {
  return new RegExp("^[0-9a-f]{" + length + "}$").test(value);
}

export function assessBuild402Governance(input: {
  build401: Build401PredictiveRenewalExecutionAssessment;
  recalibrations?: readonly Build402ForecastRecalibrationEffectiveness[];
  renewalTiming?: readonly Build402RenewalTimingOptimization[];
  linkageContinuity?: readonly Build402LinkageContinuity[];
}) {
  const build401Eligible =
    input.build401.governanceState ===
    "PREDICTIVE_RENEWAL_EXECUTION_GOVERNANCE_VERIFIED";

  const recalibrationByShell = latestByShell(input.recalibrations ?? []);
  const missingRecalibrationShells = REQUIRED_SHELLS.filter(
    (shellId) => !recalibrationByShell.has(shellId)
  );
  const ineffectiveRecalibrationShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = recalibrationByShell.get(shellId);
    if (!item) return false;

    if (!item.recalibrationRequired) {
      return !(
        validBps(item.baselineAbsoluteErrorBps) &&
        validBps(item.postRecalibrationAbsoluteErrorBps) &&
        item.baselineAbsoluteErrorBps <= BUILD_402_MAX_FORECAST_ERROR_BPS &&
        item.postRecalibrationAbsoluteErrorBps <=
          BUILD_402_MAX_FORECAST_ERROR_BPS &&
        !item.recurrenceDetected &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.recalibrationState === "NOT_REQUIRED"
      );
    }

    return !(
      validBps(item.baselineAbsoluteErrorBps) &&
      validBps(item.postRecalibrationAbsoluteErrorBps) &&
      item.baselineAbsoluteErrorBps > BUILD_402_MAX_FORECAST_ERROR_BPS &&
      item.postRecalibrationAbsoluteErrorBps <
        item.baselineAbsoluteErrorBps &&
      item.postRecalibrationAbsoluteErrorBps <=
        BUILD_402_MAX_FORECAST_ERROR_BPS &&
      item.observationWindowHours >=
        BUILD_402_MIN_RECALIBRATION_WINDOW_HOURS &&
      item.sampleCount >= BUILD_402_MIN_RECALIBRATION_SAMPLES &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.recalibrationState === "EFFECTIVE"
    );
  });

  const timingByShell = latestByShell(input.renewalTiming ?? []);
  const missingTimingShells = REQUIRED_SHELLS.filter(
    (shellId) => !timingByShell.has(shellId)
  );
  const nonOptimalTimingShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = timingByShell.get(shellId);
    if (!item) return false;

    if (!item.advanceRenewalRequired) {
      return !(
        item.executionLeadHours === 0 &&
        !item.thresholdBreachOccurred &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.timingState === "NOT_REQUIRED"
      );
    }

    return !(
      item.executionLeadHours >= BUILD_402_MIN_RENEWAL_LEAD_HOURS &&
      item.executionLeadHours <= BUILD_402_MAX_RENEWAL_LEAD_HOURS &&
      !item.thresholdBreachOccurred &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.timingState === "OPTIMAL"
    );
  });

  const continuityByApp = latestByApplication(input.linkageContinuity ?? []);
  const missingContinuityApplications = REQUIRED_APPLICATIONS.filter(
    (appId) => !continuityByApp.has(appId)
  );
  const linkageDriftApplications = REQUIRED_APPLICATIONS.filter((appId) => {
    const item = continuityByApp.get(appId);
    if (!item) return false;

    return !(
      item.repository === BUILD_402_APPLICATION_REPOSITORIES[appId] &&
      item.topologyId === BUILD_402_TOPOLOGY_ID &&
      validHex(item.productionMainSha, 40) &&
      validHex(item.manifestSha256, 64) &&
      item.evidenceAgeHours >= 0 &&
      item.evidenceAgeHours <= BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS &&
      item.selfIdentityMatches &&
      item.canonicalTopologyMatches &&
      item.validationAuthorityMatches &&
      item.authorityTransferFalse &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.continuityState === "CURRENT"
    );
  });

  const governanceState =
    !build401Eligible
      ? ("HOLD_BUILD401_NOT_VERIFIED" as const)
      : missingRecalibrationShells.length
        ? ("FORECAST_RECALIBRATION_EVIDENCE_REQUIRED" as const)
        : ineffectiveRecalibrationShells.length
          ? ("FORECAST_RECALIBRATION_INEFFECTIVE" as const)
          : missingTimingShells.length
            ? ("RENEWAL_TIMING_EVIDENCE_REQUIRED" as const)
            : nonOptimalTimingShells.length
              ? ("RENEWAL_TIMING_OPTIMIZATION_REQUIRED" as const)
              : missingContinuityApplications.length
                ? ("LINKAGE_CONTINUITY_EVIDENCE_REQUIRED" as const)
                : linkageDriftApplications.length
                  ? ("LINKAGE_CONTINUITY_DRIFT_DETECTED" as const)
                  : ("SEVEN_APPLICATION_CONTINUITY_GOVERNANCE_VERIFIED" as const);

  return {
    schema: BUILD_402_SCHEMA,
    build: BUILD_402,
    themeVersion: BUILD_402_THEME_VERSION,
    topologyId: BUILD_402_TOPOLOGY_ID,
    build401Eligible,
    missingRecalibrationShells,
    ineffectiveRecalibrationShells,
    missingTimingShells,
    nonOptimalTimingShells,
    missingContinuityApplications,
    linkageDriftApplications,
    governanceState,
    policy: {
      recalibratedForecastErrorMustReturnTo500BpsOrLess: true,
      recalibrationRequires24HoursAndFiveSamples: true,
      renewalLeadWindowHours: {
        minimum: BUILD_402_MIN_RENEWAL_LEAD_HOURS,
        maximum: BUILD_402_MAX_RENEWAL_LEAD_HOURS
      },
      allSevenApplicationsRequireIndependentContinuityEvidence: true,
      linkageEvidenceMaximumAgeHours:
        BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS,
      productionGreenCannotSubstituteForGovernanceEvidence: true
    }
  };
}

export type Build402GovernanceAssessment = ReturnType<
  typeof assessBuild402Governance
>;
