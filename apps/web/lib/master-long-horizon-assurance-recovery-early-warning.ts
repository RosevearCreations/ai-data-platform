import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build398AssuranceRenewal } from "./master-confidence-stability-persistence-drift-assurance-renewal";

export const BUILD_399 = 399 as const;
export const BUILD_399_SCHEMA =
  "rosevear.ai-data-platform.long-horizon-assurance-recovery-early-warning.v1" as const;
export const BUILD_399_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_399_MIN_CONFIDENCE_BPS = 7000 as const;
export const BUILD_399_WATCH_DROP_BPS = 500 as const;
export const BUILD_399_MAX_MANAGED_DROP_BPS = 1000 as const;
export const BUILD_399_MAX_RECOVERY_RESIDUAL_DRIFT_BPS = 250 as const;

export type Build399LongHorizonAssuranceStability = {
  observationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  observationWindowHours: number;
  renewalCount: number;
  missedRenewalCount: number;
  evidenceCurrent: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  stabilityState: "STABLE" | "UNSTABLE" | "HOLD";
};

export type Build399PersistenceDriftRecoveryEffectiveness = {
  recoveryId: string;
  shellId: Build391ShellId;
  observedAt: string;
  driftOccurred: boolean;
  preRecoveryDriftBps: number;
  postRecoveryDriftBps: number;
  recoveryWindowHours: number;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  recoveryState: "NOT_REQUIRED" | "EFFECTIVE" | "INEFFECTIVE" | "HOLD";
};

export type Build399ConfidenceDegradationEarlyWarning = {
  warningId: string;
  shellId: Build391ShellId;
  observedAt: string;
  currentConfidenceBps: number;
  projectedConfidenceBps: number;
  forecastHorizonHours: number;
  sampleCount: number;
  ownerAcknowledged: boolean;
  mitigationReady: boolean;
  independentlyVerified: boolean;
  warningState: "CLEAR" | "WATCH" | "ACTION" | "HOLD";
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

export function assessBuild399LongHorizonGovernance(input: {
  build398: Build398AssuranceRenewal;
  assuranceStability?: readonly Build399LongHorizonAssuranceStability[];
  recoveryEffectiveness?: readonly Build399PersistenceDriftRecoveryEffectiveness[];
  confidenceEarlyWarning?: readonly Build399ConfidenceDegradationEarlyWarning[];
}) {
  const build398Eligible =
    input.build398.governanceState === "POST_RECALIBRATION_ASSURANCE_RENEWED";

  const stabilityByShell = latestByShell(input.assuranceStability ?? []);
  const missingStabilityShells = REQUIRED_SHELLS.filter(
    (shellId) => !stabilityByShell.has(shellId)
  );
  const unstableRenewalShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = stabilityByShell.get(shellId);
    if (!item) return false;
    return !(
      item.observationWindowHours >= 72 &&
      item.renewalCount >= 3 &&
      item.missedRenewalCount === 0 &&
      item.evidenceCurrent &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.stabilityState === "STABLE"
    );
  });

  const recoveryByShell = latestByShell(input.recoveryEffectiveness ?? []);
  const missingRecoveryShells = REQUIRED_SHELLS.filter(
    (shellId) => !recoveryByShell.has(shellId)
  );
  const ineffectiveRecoveryShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = recoveryByShell.get(shellId);
    if (!item) return false;

    if (!item.driftOccurred) {
      return !(
        item.preRecoveryDriftBps === 0 &&
        item.postRecoveryDriftBps === 0 &&
        !item.recurrenceDetected &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.recoveryState === "NOT_REQUIRED"
      );
    }

    return !(
      validBps(item.preRecoveryDriftBps) &&
      validBps(item.postRecoveryDriftBps) &&
      item.preRecoveryDriftBps > 0 &&
      item.postRecoveryDriftBps < item.preRecoveryDriftBps &&
      item.postRecoveryDriftBps <= BUILD_399_MAX_RECOVERY_RESIDUAL_DRIFT_BPS &&
      item.recoveryWindowHours >= 48 &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.recoveryState === "EFFECTIVE"
    );
  });

  const warningByShell = latestByShell(input.confidenceEarlyWarning ?? []);
  const missingWarningShells = REQUIRED_SHELLS.filter(
    (shellId) => !warningByShell.has(shellId)
  );
  const actionRequiredShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = warningByShell.get(shellId);
    if (!item) return false;

    const valid =
      validBps(item.currentConfidenceBps) &&
      validBps(item.projectedConfidenceBps) &&
      item.forecastHorizonHours >= 24 &&
      item.sampleCount >= 5 &&
      item.ownerAcknowledged &&
      item.independentlyVerified;
    if (!valid) return true;

    const projectedDrop = Math.max(
      0,
      item.currentConfidenceBps - item.projectedConfidenceBps
    );
    const shouldAction =
      item.projectedConfidenceBps < BUILD_399_MIN_CONFIDENCE_BPS ||
      projectedDrop > BUILD_399_MAX_MANAGED_DROP_BPS;
    if (shouldAction) return item.warningState !== "ACTION";

    const shouldWatch = projectedDrop > BUILD_399_WATCH_DROP_BPS;
    if (shouldWatch) {
      return !(
        item.warningState === "WATCH" &&
        item.mitigationReady
      );
    }

    return item.warningState !== "CLEAR";
  });

  const governanceState =
    !build398Eligible
      ? ("HOLD_BUILD398_NOT_RENEWED" as const)
      : missingStabilityShells.length > 0
        ? ("LONG_HORIZON_RENEWAL_STABILITY_REQUIRED" as const)
        : unstableRenewalShells.length > 0
          ? ("LONG_HORIZON_RENEWAL_UNSTABLE" as const)
          : missingRecoveryShells.length > 0
            ? ("DRIFT_RECOVERY_EFFECTIVENESS_REQUIRED" as const)
            : ineffectiveRecoveryShells.length > 0
              ? ("PERSISTENCE_DRIFT_RECOVERY_INEFFECTIVE" as const)
              : missingWarningShells.length > 0
                ? ("CONFIDENCE_EARLY_WARNING_REQUIRED" as const)
                : actionRequiredShells.length > 0
                  ? ("CONFIDENCE_DEGRADATION_ACTION_REQUIRED" as const)
                  : ("LONG_HORIZON_ASSURANCE_GOVERNANCE_VERIFIED" as const);

  return {
    schema: BUILD_399_SCHEMA,
    build: BUILD_399,
    themeVersion: BUILD_399_THEME_VERSION,
    minimumConfidenceBps: BUILD_399_MIN_CONFIDENCE_BPS,
    watchDropBps: BUILD_399_WATCH_DROP_BPS,
    maximumManagedDropBps: BUILD_399_MAX_MANAGED_DROP_BPS,
    maximumRecoveryResidualDriftBps:
      BUILD_399_MAX_RECOVERY_RESIDUAL_DRIFT_BPS,
    build398Eligible,
    missingStabilityShells,
    unstableRenewalShells,
    missingRecoveryShells,
    ineffectiveRecoveryShells,
    missingWarningShells,
    actionRequiredShells,
    governanceState,
    blockers: [
      ...(!build398Eligible
        ? ["Build 398 post-recalibration assurance must be renewed before Build 399 can close."]
        : []),
      ...(missingStabilityShells.length
        ? ["Long-horizon assurance stability evidence is missing for: " + missingStabilityShells.join(", ")]
        : []),
      ...(unstableRenewalShells.length
        ? ["Assurance renewal cadence is unstable or unverified for: " + unstableRenewalShells.join(", ")]
        : []),
      ...(missingRecoveryShells.length
        ? ["Persistence-drift recovery effectiveness evidence is missing for: " + missingRecoveryShells.join(", ")]
        : []),
      ...(ineffectiveRecoveryShells.length
        ? ["Persistence-drift recovery is ineffective or unverified for: " + ineffectiveRecoveryShells.join(", ")]
        : []),
      ...(missingWarningShells.length
        ? ["Confidence degradation early-warning evidence is missing for: " + missingWarningShells.join(", ")]
        : []),
      ...(actionRequiredShells.length
        ? ["Confidence degradation requires corrected warning state or mitigation for: " + actionRequiredShells.join(", ")]
        : [])
    ],
    policy: {
      assuranceRenewalRequires72HourStabilityAndThreeRenewals: true,
      missedRenewalBlocksClosure: true,
      driftRecoveryRequires48HourEffectivenessWindow: true,
      residualDriftMustBeAtOrBelow250Bps: true,
      watchSignalsRequireMitigationReadiness: true,
      actionSignalsCannotBeMisclassifiedAsClearOrWatch: true,
      deploymentGreenCannotSubstituteForLongHorizonEvidence: true
    }
  };
}

export type Build399LongHorizonGovernance = ReturnType<
  typeof assessBuild399LongHorizonGovernance
>;
