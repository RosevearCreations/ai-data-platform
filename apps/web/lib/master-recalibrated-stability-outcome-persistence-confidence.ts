import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build396ThresholdFeedbackGovernance } from "./master-threshold-drift-outcome-feedback-recalibration";

export const BUILD_397 = 397 as const;
export const BUILD_397_SCHEMA =
  "rosevear.ai-data-platform.recalibrated-stability-outcome-persistence-confidence.v1" as const;
export const BUILD_397_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_397_MIN_CONFIDENCE_BPS = 7000 as const;

export type Build397RecalibratedThresholdStability = {
  validationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  warningThresholdBps: number;
  escalationThresholdBps: number;
  observationWindowHours: number;
  sampleCount: number;
  thresholdBreachCount: number;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  stabilityState: "STABLE" | "UNSTABLE" | "HOLD";
};

export type Build397InterventionOutcomePersistence = {
  persistenceId: string;
  shellId: Build391ShellId;
  observedAt: string;
  interventionOccurred: boolean;
  persistenceWindowHours: number;
  sampleCount: number;
  baselinePostInterventionRiskBps: number;
  currentRiskBps: number;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  persistenceState: "NOT_REQUIRED" | "PERSISTENT" | "REGRESSED" | "HOLD";
};

export type Build397EscalationConfidenceGovernance = {
  confidenceId: string;
  shellId: Build391ShellId;
  observedAt: string;
  evidencePoints: number;
  confidenceBps: number;
  thresholdEvidenceCurrent: boolean;
  interventionEvidenceCurrent: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  confidenceState: "VERIFIED" | "LOW_CONFIDENCE" | "HOLD" | "REJECTED";
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

export function assessBuild397StabilityPersistenceConfidence(input: {
  build396: Build396ThresholdFeedbackGovernance;
  thresholdStability?: readonly Build397RecalibratedThresholdStability[];
  interventionPersistence?: readonly Build397InterventionOutcomePersistence[];
  escalationConfidence?: readonly Build397EscalationConfidenceGovernance[];
}) {
  const build396Eligible =
    input.build396.governanceState === "THRESHOLD_FEEDBACK_RECALIBRATION_VERIFIED";

  const stabilityByShell = latestByShell(input.thresholdStability ?? []);
  const missingStabilityShells = REQUIRED_SHELLS.filter(
    (shellId) => !stabilityByShell.has(shellId)
  );
  const unstableThresholdShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = stabilityByShell.get(shellId);
    if (!item) return false;
    return !(
      validBps(item.warningThresholdBps) &&
      validBps(item.escalationThresholdBps) &&
      item.warningThresholdBps < item.escalationThresholdBps &&
      item.observationWindowHours >= 24 &&
      item.sampleCount >= 3 &&
      item.thresholdBreachCount === 0 &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.stabilityState === "STABLE"
    );
  });

  const persistenceByShell = latestByShell(input.interventionPersistence ?? []);
  const missingPersistenceShells = REQUIRED_SHELLS.filter(
    (shellId) => !persistenceByShell.has(shellId)
  );
  const regressedInterventionShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = persistenceByShell.get(shellId);
    if (!item) return false;
    if (!item.interventionOccurred) {
      return !(
        item.persistenceState === "NOT_REQUIRED" &&
        item.ownerReviewed &&
        item.independentlyVerified
      );
    }
    return !(
      validBps(item.baselinePostInterventionRiskBps) &&
      validBps(item.currentRiskBps) &&
      item.persistenceWindowHours >= 48 &&
      item.sampleCount >= 3 &&
      item.currentRiskBps <= item.baselinePostInterventionRiskBps &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.persistenceState === "PERSISTENT"
    );
  });

  const confidenceByShell = latestByShell(input.escalationConfidence ?? []);
  const missingConfidenceShells = REQUIRED_SHELLS.filter(
    (shellId) => !confidenceByShell.has(shellId)
  );
  const lowConfidenceShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = confidenceByShell.get(shellId);
    if (!item) return false;
    return !(
      item.evidencePoints >= 5 &&
      validBps(item.confidenceBps) &&
      item.confidenceBps >= BUILD_397_MIN_CONFIDENCE_BPS &&
      item.thresholdEvidenceCurrent &&
      item.interventionEvidenceCurrent &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.confidenceState === "VERIFIED"
    );
  });

  const governanceState =
    !build396Eligible
      ? ("HOLD_BUILD396_NOT_VERIFIED" as const)
      : missingStabilityShells.length > 0
        ? ("RECALIBRATED_THRESHOLD_STABILITY_REQUIRED" as const)
        : unstableThresholdShells.length > 0
          ? ("RECALIBRATED_THRESHOLD_UNSTABLE" as const)
          : missingPersistenceShells.length > 0
            ? ("INTERVENTION_PERSISTENCE_REQUIRED" as const)
            : regressedInterventionShells.length > 0
              ? ("INTERVENTION_OUTCOME_REGRESSION" as const)
              : missingConfidenceShells.length > 0
                ? ("ESCALATION_CONFIDENCE_REQUIRED" as const)
                : lowConfidenceShells.length > 0
                  ? ("ESCALATION_CONFIDENCE_INSUFFICIENT" as const)
                  : ("STABILITY_PERSISTENCE_CONFIDENCE_VERIFIED" as const);

  return {
    schema: BUILD_397_SCHEMA,
    build: BUILD_397,
    themeVersion: BUILD_397_THEME_VERSION,
    minimumConfidenceBps: BUILD_397_MIN_CONFIDENCE_BPS,
    build396Eligible,
    missingStabilityShells,
    unstableThresholdShells,
    missingPersistenceShells,
    regressedInterventionShells,
    missingConfidenceShells,
    lowConfidenceShells,
    governanceState,
    blockers: [
      ...(!build396Eligible
        ? ["Build 396 threshold feedback recalibration must be verified before Build 397 can close."]
        : []),
      ...(missingStabilityShells.length
        ? ["Recalibrated threshold stability evidence is missing for: " + missingStabilityShells.join(", ")]
        : []),
      ...(unstableThresholdShells.length
        ? ["Recalibrated thresholds are unstable or unverified for: " + unstableThresholdShells.join(", ")]
        : []),
      ...(missingPersistenceShells.length
        ? ["Intervention outcome persistence evidence is missing for: " + missingPersistenceShells.join(", ")]
        : []),
      ...(regressedInterventionShells.length
        ? ["Intervention outcome regression detected for: " + regressedInterventionShells.join(", ")]
        : []),
      ...(missingConfidenceShells.length
        ? ["Escalation confidence evidence is missing for: " + missingConfidenceShells.join(", ")]
        : []),
      ...(lowConfidenceShells.length
        ? ["Escalation confidence is insufficient for: " + lowConfidenceShells.join(", ")]
        : [])
    ],
    policy: {
      recalibratedThresholdsRequire24HourStability: true,
      effectiveInterventionsRequire48HourPersistence: true,
      recurrenceOrThresholdBreachBlocksClosure: true,
      escalationConfidenceRequiresCurrentThresholdAndInterventionEvidence: true,
      minimumEscalationConfidenceBps: BUILD_397_MIN_CONFIDENCE_BPS,
      ownerAndIndependentVerificationRequired: true,
      deploymentGreenCannotSubstituteForStabilityPersistenceOrConfidenceEvidence: true
    }
  };
}

export type Build397StabilityPersistenceConfidence = ReturnType<
  typeof assessBuild397StabilityPersistenceConfidence
>;
