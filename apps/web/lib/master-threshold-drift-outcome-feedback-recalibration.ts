import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build395PredictiveRecurrenceGovernance } from "./master-predictive-threshold-intervention-escalation";

export const BUILD_396 = 396 as const;
export const BUILD_396_SCHEMA =
  "rosevear.ai-data-platform.threshold-drift-outcome-feedback-recalibration.v1" as const;
export const BUILD_396_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_396_MIN_FEEDBACK_EVIDENCE_POINTS = 5 as const;

export type Build396ThresholdDriftObservation = {
  observationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  sampleCount: number;
  calibratedWarningThresholdBps: number;
  calibratedEscalationThresholdBps: number;
  recommendedWarningThresholdBps: number;
  recommendedEscalationThresholdBps: number;
  warningDriftBps: number;
  escalationDriftBps: number;
  independentlyObserved: boolean;
  driftState: "STABLE" | "DRIFTING" | "HOLD";
};

export type Build396InterventionOutcomeEffectiveness = {
  outcomeId: string;
  shellId: Build391ShellId;
  observedAt: string;
  interventionOccurred: boolean;
  preInterventionRiskBps: number;
  postInterventionRiskBps: number;
  observationWindowHours: number;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  outcomeState: "NOT_REQUIRED" | "EFFECTIVE" | "INEFFECTIVE" | "HOLD";
};

export type Build396EscalationFeedbackRecalibration = {
  recalibrationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  priorWarningThresholdBps: number;
  priorEscalationThresholdBps: number;
  proposedWarningThresholdBps: number;
  proposedEscalationThresholdBps: number;
  feedbackEvidencePoints: number;
  interventionFeedbackCount: number;
  escalationFeedbackCount: number;
  ownerApproved: boolean;
  independentlyVerified: boolean;
  recalibrationState: "RETAINED" | "RECALIBRATED" | "HOLD" | "REJECTED";
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

export function assessBuild396ThresholdFeedbackGovernance(input: {
  build395: Build395PredictiveRecurrenceGovernance;
  thresholdDriftObservations?: readonly Build396ThresholdDriftObservation[];
  interventionOutcomes?: readonly Build396InterventionOutcomeEffectiveness[];
  feedbackRecalibrations?: readonly Build396EscalationFeedbackRecalibration[];
}) {
  const build395Eligible =
    input.build395.governanceState === "PREDICTIVE_RECURRENCE_GOVERNANCE_VERIFIED";

  const driftByShell = latestByShell(input.thresholdDriftObservations ?? []);
  const missingDriftShells = REQUIRED_SHELLS.filter(
    (shellId) => !driftByShell.has(shellId)
  );

  const invalidDriftShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = driftByShell.get(shellId);
    if (!item) return false;
    const expectedWarningDrift = Math.abs(
      item.recommendedWarningThresholdBps - item.calibratedWarningThresholdBps
    );
    const expectedEscalationDrift = Math.abs(
      item.recommendedEscalationThresholdBps -
        item.calibratedEscalationThresholdBps
    );
    return !(
      item.sampleCount >= 2 &&
      validBps(item.calibratedWarningThresholdBps) &&
      validBps(item.calibratedEscalationThresholdBps) &&
      validBps(item.recommendedWarningThresholdBps) &&
      validBps(item.recommendedEscalationThresholdBps) &&
      item.calibratedWarningThresholdBps < item.calibratedEscalationThresholdBps &&
      item.recommendedWarningThresholdBps <
        item.recommendedEscalationThresholdBps &&
      item.warningDriftBps === expectedWarningDrift &&
      item.escalationDriftBps === expectedEscalationDrift &&
      item.independentlyObserved &&
      item.driftState !== "HOLD"
    );
  });

  const driftingShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = driftByShell.get(shellId);
    if (!item) return false;
    return (
      item.driftState === "DRIFTING" ||
      item.warningDriftBps > 0 ||
      item.escalationDriftBps > 0
    );
  });

  const outcomeByShell = latestByShell(input.interventionOutcomes ?? []);
  const missingOutcomeShells = REQUIRED_SHELLS.filter(
    (shellId) => !outcomeByShell.has(shellId)
  );

  const ineffectiveOutcomeShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = outcomeByShell.get(shellId);
    if (!item) return false;

    if (!item.interventionOccurred) {
      return !(
        item.outcomeState === "NOT_REQUIRED" &&
        item.ownerReviewed &&
        item.independentlyVerified
      );
    }

    return !(
      validBps(item.preInterventionRiskBps) &&
      validBps(item.postInterventionRiskBps) &&
      item.observationWindowHours >= 24 &&
      !item.recurrenceDetected &&
      item.postInterventionRiskBps < item.preInterventionRiskBps &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.outcomeState === "EFFECTIVE"
    );
  });

  const recalibrationByShell = latestByShell(input.feedbackRecalibrations ?? []);
  const missingRecalibrationShells = REQUIRED_SHELLS.filter(
    (shellId) => !recalibrationByShell.has(shellId)
  );

  const invalidRecalibrationShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = recalibrationByShell.get(shellId);
    const drift = driftByShell.get(shellId);
    if (!item || !drift) return false;

    const enoughFeedback =
      item.feedbackEvidencePoints >= BUILD_396_MIN_FEEDBACK_EVIDENCE_POINTS &&
      item.interventionFeedbackCount >= 0 &&
      item.escalationFeedbackCount >= 1;

    const basicValidity =
      validBps(item.priorWarningThresholdBps) &&
      validBps(item.priorEscalationThresholdBps) &&
      validBps(item.proposedWarningThresholdBps) &&
      validBps(item.proposedEscalationThresholdBps) &&
      item.priorWarningThresholdBps < item.priorEscalationThresholdBps &&
      item.proposedWarningThresholdBps < item.proposedEscalationThresholdBps &&
      item.priorWarningThresholdBps === drift.calibratedWarningThresholdBps &&
      item.priorEscalationThresholdBps === drift.calibratedEscalationThresholdBps &&
      enoughFeedback &&
      item.ownerApproved &&
      item.independentlyVerified;

    if (!basicValidity) return true;

    if (driftingShells.includes(shellId)) {
      return !(
        item.recalibrationState === "RECALIBRATED" &&
        item.proposedWarningThresholdBps === drift.recommendedWarningThresholdBps &&
        item.proposedEscalationThresholdBps ===
          drift.recommendedEscalationThresholdBps
      );
    }

    return !(
      item.recalibrationState === "RETAINED" &&
      item.proposedWarningThresholdBps === item.priorWarningThresholdBps &&
      item.proposedEscalationThresholdBps === item.priorEscalationThresholdBps
    );
  });

  const unresolvedFeedbackShells = REQUIRED_SHELLS.filter((shellId) => {
    const drift = driftByShell.get(shellId);
    const outcome = outcomeByShell.get(shellId);
    const recalibration = recalibrationByShell.get(shellId);
    if (!drift || !outcome || !recalibration) return false;

    const needsChange =
      drift.driftState === "DRIFTING" ||
      drift.warningDriftBps > 0 ||
      drift.escalationDriftBps > 0 ||
      outcome.outcomeState === "INEFFECTIVE";

    if (!needsChange) return false;
    return recalibration.recalibrationState !== "RECALIBRATED";
  });

  const governanceState =
    !build395Eligible
      ? ("HOLD_BUILD395_NOT_VERIFIED" as const)
      : missingDriftShells.length > 0
        ? ("THRESHOLD_DRIFT_EVIDENCE_REQUIRED" as const)
        : invalidDriftShells.length > 0
          ? ("THRESHOLD_DRIFT_EVIDENCE_INVALID" as const)
          : missingOutcomeShells.length > 0
            ? ("INTERVENTION_OUTCOME_EVIDENCE_REQUIRED" as const)
            : ineffectiveOutcomeShells.length > 0
              ? ("INTERVENTION_OUTCOME_INEFFECTIVE" as const)
              : missingRecalibrationShells.length > 0
                ? ("FEEDBACK_RECALIBRATION_REQUIRED" as const)
                : invalidRecalibrationShells.length > 0 ||
                    unresolvedFeedbackShells.length > 0
                  ? ("FEEDBACK_RECALIBRATION_INVALID" as const)
                  : ("THRESHOLD_FEEDBACK_RECALIBRATION_VERIFIED" as const);

  return {
    schema: BUILD_396_SCHEMA,
    build: BUILD_396,
    themeVersion: BUILD_396_THEME_VERSION,
    minimumFeedbackEvidencePoints: BUILD_396_MIN_FEEDBACK_EVIDENCE_POINTS,
    build395Eligible,
    missingDriftShells,
    invalidDriftShells,
    driftingShells,
    missingOutcomeShells,
    ineffectiveOutcomeShells,
    missingRecalibrationShells,
    invalidRecalibrationShells,
    unresolvedFeedbackShells,
    governanceState,
    blockers: [
      ...(!build395Eligible
        ? ["Build 395 predictive recurrence governance must be verified before threshold feedback governance can close."]
        : []),
      ...(missingDriftShells.length
        ? ["Threshold drift evidence is missing for: " + missingDriftShells.join(", ")]
        : []),
      ...(invalidDriftShells.length
        ? ["Threshold drift evidence is invalid for: " + invalidDriftShells.join(", ")]
        : []),
      ...(missingOutcomeShells.length
        ? ["Preventive intervention outcome evidence is missing for: " + missingOutcomeShells.join(", ")]
        : []),
      ...(ineffectiveOutcomeShells.length
        ? ["Preventive intervention outcome is ineffective or unverified for: " + ineffectiveOutcomeShells.join(", ")]
        : []),
      ...(missingRecalibrationShells.length
        ? ["Escalation feedback recalibration evidence is missing for: " + missingRecalibrationShells.join(", ")]
        : []),
      ...(invalidRecalibrationShells.length || unresolvedFeedbackShells.length
        ? ["Feedback recalibration is invalid or unresolved for one or more governed shells."]
        : [])
    ],
    policy: {
      thresholdDriftMustBeMeasuredAgainstCurrentCalibration: true,
      interventionOutcomesRequireAtLeast24HourObservationWhenInvoked: true,
      ineffectiveInterventionBlocksClosure: true,
      driftRequiresFeedbackBackedRecalibration: true,
      stableThresholdsMayBeExplicitlyRetained: true,
      ownerAndIndependentRecalibrationApprovalRequired: true,
      deploymentGreenCannotSubstituteForThresholdFeedbackEvidence: true
    }
  };
}

export type Build396ThresholdFeedbackGovernance = ReturnType<
  typeof assessBuild396ThresholdFeedbackGovernance
>;
