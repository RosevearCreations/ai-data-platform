import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build399LongHorizonGovernance } from "./master-long-horizon-assurance-recovery-early-warning";

export const BUILD_400 = 400 as const;
export const BUILD_400_SCHEMA =
  "rosevear.ai-data-platform.warning-response-assurance-recovery-predictive-renewal.v1" as const;
export const BUILD_400_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_400_MIN_CONFIDENCE_BPS = 7000 as const;
export const BUILD_400_MIN_RESPONSE_RECOVERY_BPS = 250 as const;
export const BUILD_400_PREDICTIVE_WATCH_DROP_BPS = 500 as const;
export const BUILD_400_PREDICTIVE_ACTION_DROP_BPS = 1000 as const;

export type Build400EarlyWarningResponseEffectiveness = {
  responseId: string;
  shellId: Build391ShellId;
  observedAt: string;
  warningTriggered: boolean;
  preResponseProjectedConfidenceBps: number;
  postResponseObservedConfidenceBps: number;
  responseWindowHours: number;
  sampleCount: number;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  responseState: "NOT_REQUIRED" | "EFFECTIVE" | "INEFFECTIVE" | "HOLD";
};

export type Build400AssuranceDegradationRecovery = {
  recoveryId: string;
  shellId: Build391ShellId;
  observedAt: string;
  degradationDetected: boolean;
  degradedRenewalCount: number;
  recoveredRenewalCount: number;
  recoveryWindowHours: number;
  missedRenewalCount: number;
  evidenceCurrent: boolean;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  recoveryState: "NOT_REQUIRED" | "RECOVERED" | "DEGRADED" | "HOLD";
};

export type Build400PredictiveRenewalGovernance = {
  predictionId: string;
  shellId: Build391ShellId;
  observedAt: string;
  currentConfidenceBps: number;
  projectedConfidenceBps: number;
  forecastHorizonHours: number;
  sampleCount: number;
  evidencePoints: number;
  advanceRenewalScheduled: boolean;
  ownerApproved: boolean;
  independentlyVerified: boolean;
  renewalState: "CURRENT" | "ADVANCE_RENEWAL" | "HOLD" | "REJECTED";
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

export function assessBuild400PredictiveRenewalGovernance(input: {
  build399: Build399LongHorizonGovernance;
  warningResponses?: readonly Build400EarlyWarningResponseEffectiveness[];
  assuranceRecoveries?: readonly Build400AssuranceDegradationRecovery[];
  predictiveRenewals?: readonly Build400PredictiveRenewalGovernance[];
}) {
  const build399Eligible =
    input.build399.governanceState === "LONG_HORIZON_ASSURANCE_GOVERNANCE_VERIFIED";

  const responseByShell = latestByShell(input.warningResponses ?? []);
  const missingResponseShells = REQUIRED_SHELLS.filter(
    (shellId) => !responseByShell.has(shellId)
  );
  const ineffectiveResponseShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = responseByShell.get(shellId);
    if (!item) return false;

    if (!item.warningTriggered) {
      return !(
        validBps(item.preResponseProjectedConfidenceBps) &&
        validBps(item.postResponseObservedConfidenceBps) &&
        item.postResponseObservedConfidenceBps >= BUILD_400_MIN_CONFIDENCE_BPS &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.responseState === "NOT_REQUIRED"
      );
    }

    const recoveryBps = Math.max(
      0,
      item.postResponseObservedConfidenceBps - item.preResponseProjectedConfidenceBps
    );
    return !(
      validBps(item.preResponseProjectedConfidenceBps) &&
      validBps(item.postResponseObservedConfidenceBps) &&
      item.responseWindowHours >= 24 &&
      item.sampleCount >= 3 &&
      recoveryBps >= BUILD_400_MIN_RESPONSE_RECOVERY_BPS &&
      item.postResponseObservedConfidenceBps >= BUILD_400_MIN_CONFIDENCE_BPS &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.responseState === "EFFECTIVE"
    );
  });

  const recoveryByShell = latestByShell(input.assuranceRecoveries ?? []);
  const missingRecoveryShells = REQUIRED_SHELLS.filter(
    (shellId) => !recoveryByShell.has(shellId)
  );
  const unrecoveredAssuranceShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = recoveryByShell.get(shellId);
    if (!item) return false;

    if (!item.degradationDetected) {
      return !(
        item.degradedRenewalCount === 0 &&
        item.recoveredRenewalCount === 0 &&
        item.missedRenewalCount === 0 &&
        item.evidenceCurrent &&
        !item.recurrenceDetected &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.recoveryState === "NOT_REQUIRED"
      );
    }

    return !(
      item.degradedRenewalCount >= 1 &&
      item.recoveredRenewalCount >= item.degradedRenewalCount &&
      item.recoveryWindowHours >= 72 &&
      item.missedRenewalCount === 0 &&
      item.evidenceCurrent &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.recoveryState === "RECOVERED"
    );
  });

  const predictionByShell = latestByShell(input.predictiveRenewals ?? []);
  const missingPredictiveRenewalShells = REQUIRED_SHELLS.filter(
    (shellId) => !predictionByShell.has(shellId)
  );
  const invalidPredictiveRenewalShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = predictionByShell.get(shellId);
    if (!item) return false;

    const valid =
      validBps(item.currentConfidenceBps) &&
      validBps(item.projectedConfidenceBps) &&
      item.forecastHorizonHours >= 72 &&
      item.sampleCount >= 5 &&
      item.evidencePoints >= 5 &&
      item.ownerApproved &&
      item.independentlyVerified;
    if (!valid) return true;

    const projectedDrop = Math.max(
      0,
      item.currentConfidenceBps - item.projectedConfidenceBps
    );
    const needsAdvanceRenewal =
      item.projectedConfidenceBps < BUILD_400_MIN_CONFIDENCE_BPS ||
      projectedDrop > BUILD_400_PREDICTIVE_ACTION_DROP_BPS;
    if (needsAdvanceRenewal) {
      return !(
        item.renewalState === "ADVANCE_RENEWAL" &&
        item.advanceRenewalScheduled
      );
    }

    const needsWatch =
      projectedDrop > BUILD_400_PREDICTIVE_WATCH_DROP_BPS;
    if (needsWatch) {
      return !(
        item.renewalState === "ADVANCE_RENEWAL" &&
        item.advanceRenewalScheduled
      );
    }

    return !(
      item.renewalState === "CURRENT" &&
      !item.advanceRenewalScheduled
    );
  });

  const governanceState =
    !build399Eligible
      ? ("HOLD_BUILD399_NOT_VERIFIED" as const)
      : missingResponseShells.length > 0
        ? ("EARLY_WARNING_RESPONSE_EVIDENCE_REQUIRED" as const)
        : ineffectiveResponseShells.length > 0
          ? ("EARLY_WARNING_RESPONSE_INEFFECTIVE" as const)
          : missingRecoveryShells.length > 0
            ? ("ASSURANCE_DEGRADATION_RECOVERY_REQUIRED" as const)
            : unrecoveredAssuranceShells.length > 0
              ? ("ASSURANCE_DEGRADATION_NOT_RECOVERED" as const)
              : missingPredictiveRenewalShells.length > 0
                ? ("PREDICTIVE_RENEWAL_EVIDENCE_REQUIRED" as const)
                : invalidPredictiveRenewalShells.length > 0
                  ? ("PREDICTIVE_RENEWAL_ACTION_REQUIRED" as const)
                  : ("PREDICTIVE_RENEWAL_GOVERNANCE_VERIFIED" as const);

  return {
    schema: BUILD_400_SCHEMA,
    build: BUILD_400,
    themeVersion: BUILD_400_THEME_VERSION,
    minimumConfidenceBps: BUILD_400_MIN_CONFIDENCE_BPS,
    minimumResponseRecoveryBps: BUILD_400_MIN_RESPONSE_RECOVERY_BPS,
    predictiveWatchDropBps: BUILD_400_PREDICTIVE_WATCH_DROP_BPS,
    predictiveActionDropBps: BUILD_400_PREDICTIVE_ACTION_DROP_BPS,
    build399Eligible,
    missingResponseShells,
    ineffectiveResponseShells,
    missingRecoveryShells,
    unrecoveredAssuranceShells,
    missingPredictiveRenewalShells,
    invalidPredictiveRenewalShells,
    governanceState,
    blockers: [
      ...(!build399Eligible
        ? ["Build 399 long-horizon assurance governance must be verified before Build 400 can close."]
        : []),
      ...(missingResponseShells.length
        ? ["Early-warning response effectiveness evidence is missing for: " + missingResponseShells.join(", ")]
        : []),
      ...(ineffectiveResponseShells.length
        ? ["Early-warning response is ineffective or unverified for: " + ineffectiveResponseShells.join(", ")]
        : []),
      ...(missingRecoveryShells.length
        ? ["Assurance degradation recovery evidence is missing for: " + missingRecoveryShells.join(", ")]
        : []),
      ...(unrecoveredAssuranceShells.length
        ? ["Long-horizon assurance degradation remains unrecovered for: " + unrecoveredAssuranceShells.join(", ")]
        : []),
      ...(missingPredictiveRenewalShells.length
        ? ["Predictive renewal evidence is missing for: " + missingPredictiveRenewalShells.join(", ")]
        : []),
      ...(invalidPredictiveRenewalShells.length
        ? ["Predictive renewal action is missing, stale or misclassified for: " + invalidPredictiveRenewalShells.join(", ")]
        : [])
    ],
    policy: {
      triggeredWarningsRequireMeasuredConfidenceRecovery: true,
      responseRecoveryMustReachAtLeast250BpsAndConfidenceFloor: true,
      assuranceDegradationRequires72HourSustainedRecovery: true,
      missedRenewalsOrRecurrenceBlockRecovery: true,
      predictiveRenewalUses72HourForecastAndFiveSamples: true,
      forecastedDegradationRequiresAdvanceRenewalScheduling: true,
      deploymentGreenCannotSubstituteForResponseRecoveryOrRenewalEvidence: true
    }
  };
}

export type Build400PredictiveRenewalAssessment = ReturnType<
  typeof assessBuild400PredictiveRenewalGovernance
>;
