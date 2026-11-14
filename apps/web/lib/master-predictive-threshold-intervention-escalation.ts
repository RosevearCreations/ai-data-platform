import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build394LongHorizonVisualStability } from "./master-long-horizon-visual-stability-risk";

export const BUILD_395 = 395 as const;
export const BUILD_395_SCHEMA =
  "rosevear.ai-data-platform.predictive-threshold-intervention-escalation.v1" as const;
export const BUILD_395_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_395_MIN_CALIBRATION_EVIDENCE_POINTS = 5 as const;

export type Build395RecurrenceThresholdCalibration = {
  calibrationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  evidencePoints: number;
  baselineProbabilityBps: number;
  warningThresholdBps: number;
  escalationThresholdBps: number;
  falsePositiveRateBps: number;
  falseNegativeRateBps: number;
  ownerApproved: boolean;
  independentlyVerified: boolean;
  calibrationState: "CALIBRATED" | "HOLD" | "REJECTED";
};

export type Build395PreventiveInterventionReadiness = {
  readinessId: string;
  shellId: Build391ShellId;
  observedAt: string;
  requiredControls: number;
  readyControls: number;
  runbookVerified: boolean;
  rollbackReady: boolean;
  ownerOnCallAssigned: boolean;
  independentlyVerified: boolean;
  readinessState: "READY" | "NOT_READY" | "HOLD";
};

export type Build395CrossShellRiskEscalation = {
  escalationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  recurrenceRiskBps: number;
  warningThresholdBps: number;
  escalationThresholdBps: number;
  escalationLevel: "NORMAL" | "WATCH" | "ACTION" | "CRITICAL";
  interventionInvoked: boolean;
  ownerAcknowledged: boolean;
  independentlyVerified: boolean;
  escalationState: "VERIFIED" | "HOLD" | "REJECTED";
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

function expectedEscalationLevel(
  riskBps: number,
  warningThresholdBps: number,
  escalationThresholdBps: number
) {
  if (riskBps >= Math.min(9_000, escalationThresholdBps + 2_000)) {
    return "CRITICAL" as const;
  }
  if (riskBps >= escalationThresholdBps) return "ACTION" as const;
  if (riskBps >= warningThresholdBps) return "WATCH" as const;
  return "NORMAL" as const;
}

export function assessBuild395PredictiveRecurrenceGovernance(input: {
  build394: Build394LongHorizonVisualStability;
  calibrations?: readonly Build395RecurrenceThresholdCalibration[];
  interventionReadiness?: readonly Build395PreventiveInterventionReadiness[];
  escalations?: readonly Build395CrossShellRiskEscalation[];
}) {
  const build394Eligible =
    input.build394.governanceState === "LONG_HORIZON_VISUAL_STABILITY_VERIFIED";

  const calibrationByShell = latestByShell(input.calibrations ?? []);
  const missingCalibrationShells = REQUIRED_SHELLS.filter(
    (shellId) => !calibrationByShell.has(shellId)
  );

  const invalidCalibrationShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = calibrationByShell.get(shellId);
    if (!item) return false;
    return !(
      item.evidencePoints >= BUILD_395_MIN_CALIBRATION_EVIDENCE_POINTS &&
      validBps(item.baselineProbabilityBps) &&
      validBps(item.warningThresholdBps) &&
      validBps(item.escalationThresholdBps) &&
      validBps(item.falsePositiveRateBps) &&
      validBps(item.falseNegativeRateBps) &&
      item.baselineProbabilityBps < item.warningThresholdBps &&
      item.warningThresholdBps < item.escalationThresholdBps &&
      item.ownerApproved &&
      item.independentlyVerified &&
      item.calibrationState === "CALIBRATED"
    );
  });

  const readinessByShell = latestByShell(input.interventionReadiness ?? []);
  const missingReadinessShells = REQUIRED_SHELLS.filter(
    (shellId) => !readinessByShell.has(shellId)
  );

  const unreadyInterventionShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = readinessByShell.get(shellId);
    if (!item) return false;
    return !(
      item.requiredControls >= 1 &&
      item.readyControls === item.requiredControls &&
      item.runbookVerified &&
      item.rollbackReady &&
      item.ownerOnCallAssigned &&
      item.independentlyVerified &&
      item.readinessState === "READY"
    );
  });

  const escalationByShell = latestByShell(input.escalations ?? []);
  const missingEscalationShells = REQUIRED_SHELLS.filter(
    (shellId) => !escalationByShell.has(shellId)
  );

  const escalationPolicyBreachShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = escalationByShell.get(shellId);
    const calibration = calibrationByShell.get(shellId);
    const readiness = readinessByShell.get(shellId);
    if (!item || !calibration) return false;

    const thresholdsMatch =
      item.warningThresholdBps === calibration.warningThresholdBps &&
      item.escalationThresholdBps === calibration.escalationThresholdBps;
    const expectedLevel = expectedEscalationLevel(
      item.recurrenceRiskBps,
      item.warningThresholdBps,
      item.escalationThresholdBps
    );
    const elevated = expectedLevel === "ACTION" || expectedLevel === "CRITICAL";

    return !(
      validBps(item.recurrenceRiskBps) &&
      thresholdsMatch &&
      item.escalationLevel === expectedLevel &&
      (!elevated || Boolean(readiness && readiness.readinessState === "READY")) &&
      (!elevated || item.interventionInvoked) &&
      (expectedLevel === "NORMAL" || item.ownerAcknowledged) &&
      item.independentlyVerified &&
      item.escalationState === "VERIFIED"
    );
  });

  const governanceState =
    !build394Eligible
      ? ("HOLD_BUILD394_NOT_VERIFIED" as const)
      : missingCalibrationShells.length > 0
        ? ("THRESHOLD_CALIBRATION_REQUIRED" as const)
        : invalidCalibrationShells.length > 0
          ? ("THRESHOLD_CALIBRATION_INVALID" as const)
          : missingReadinessShells.length > 0
            ? ("INTERVENTION_READINESS_REQUIRED" as const)
            : unreadyInterventionShells.length > 0
              ? ("INTERVENTION_NOT_READY" as const)
              : missingEscalationShells.length > 0
                ? ("RISK_ESCALATION_EVIDENCE_REQUIRED" as const)
                : escalationPolicyBreachShells.length > 0
                  ? ("RISK_ESCALATION_POLICY_BREACH" as const)
                  : ("PREDICTIVE_RECURRENCE_GOVERNANCE_VERIFIED" as const);

  return {
    schema: BUILD_395_SCHEMA,
    build: BUILD_395,
    themeVersion: BUILD_395_THEME_VERSION,
    minimumCalibrationEvidencePoints:
      BUILD_395_MIN_CALIBRATION_EVIDENCE_POINTS,
    build394Eligible,
    missingCalibrationShells,
    invalidCalibrationShells,
    missingReadinessShells,
    unreadyInterventionShells,
    missingEscalationShells,
    escalationPolicyBreachShells,
    governanceState,
    blockers: [
      ...(!build394Eligible
        ? ["Build 394 long-horizon visual stability must be verified before predictive threshold governance can close."]
        : []),
      ...(missingCalibrationShells.length
        ? ["Predictive recurrence threshold calibration is missing for: " + missingCalibrationShells.join(", ")]
        : []),
      ...(invalidCalibrationShells.length
        ? ["Threshold calibration is invalid or insufficiently evidenced for: " + invalidCalibrationShells.join(", ")]
        : []),
      ...(missingReadinessShells.length
        ? ["Preventive-control intervention readiness evidence is missing for: " + missingReadinessShells.join(", ")]
        : []),
      ...(unreadyInterventionShells.length
        ? ["Preventive intervention is not ready for: " + unreadyInterventionShells.join(", ")]
        : []),
      ...(missingEscalationShells.length
        ? ["Current risk escalation decisions are missing for: " + missingEscalationShells.join(", ")]
        : []),
      ...(escalationPolicyBreachShells.length
        ? ["Cross-shell risk escalation policy breach detected for: " + escalationPolicyBreachShells.join(", ")]
        : [])
    ],
    policy: {
      calibrationRequiresMeasuredEvidence: true,
      warningThresholdMustBeBelowEscalationThreshold: true,
      ownerAndIndependentCalibrationApprovalRequired: true,
      interventionsMustBeReadyBeforeElevatedRiskAction: true,
      elevatedRiskRequiresOwnerAcknowledgement: true,
      allFiveShellsRequireCurrentEscalationDecision: true,
      deploymentGreenCannotSubstituteForCalibrationOrEscalationEvidence: true
    }
  };
}

export type Build395PredictiveRecurrenceGovernance = ReturnType<
  typeof assessBuild395PredictiveRecurrenceGovernance
>;
