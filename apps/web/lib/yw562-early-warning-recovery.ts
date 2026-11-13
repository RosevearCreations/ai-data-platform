import type { Build386MultiHorizonStabilityBaselineModel } from "./yw562-multi-horizon-stability-baseline";

export const BUILD_387 = 387 as const;
export const BUILD_387_SCHEMA =
  "rosevear.ai-data-platform.yw562-early-warning-recovery.v1" as const;
export const BUILD_387_CONTROLLER_BASE_REVISION =
  "e5a3e1a253c8746cbf096ec6d03f67f2f1aff899" as const;

export type Build387RecoveryObservation = {
  observationId: string;
  observedAt: string;
  warningState: "CLEAR" | "EARLY_WARNING_ACTIVE";
  remediationState: "NOT_REQUIRED" | "IN_PROGRESS" | "VERIFIED";
  baselineRestored: boolean;
  aiHubAcknowledged: boolean;
  commsAcknowledged: boolean;
  controllerAcknowledged: boolean;
};

export type Build387RemediationReview = {
  remediationId: string;
  controlId: string;
  previousScore: number;
  restoredScore: number;
  independentlyVerified: boolean;
};

export function composeBuild387EarlyWarningRecovery(input: {
  build386: Build386MultiHorizonStabilityBaselineModel;
  recoveryObservations?: readonly Build387RecoveryObservation[];
  remediationReviews?: readonly Build387RemediationReview[];
}) {
  const observations=[...(input.recoveryObservations ?? [])].sort((a,b)=>b.observedAt.localeCompare(a.observedAt));
  const latest=observations[0] ?? null;
  const reviews=[...(input.remediationReviews ?? [])];

  const allThreeMastersAcknowledged = latest
    ? latest.aiHubAcknowledged && latest.commsAcknowledged && latest.controllerAcknowledged
    : false;

  const remediationEffective =
    reviews.length > 0 &&
    reviews.every(
      (review) =>
        review.independentlyVerified &&
        review.restoredScore >= review.previousScore
    );

  const recoveryState =
    input.build386.earlyWarningState !== "EARLY_WARNING_ACTIVE"
      ? ("NO_ACTIVE_WARNING" as const)
      : !latest
        ? ("RECOVERY_EVIDENCE_REQUIRED" as const)
        : latest.remediationState === "IN_PROGRESS"
          ? ("RECOVERY_IN_PROGRESS" as const)
          : latest.remediationState === "VERIFIED" &&
              latest.baselineRestored &&
              allThreeMastersAcknowledged &&
              remediationEffective
            ? ("RECOVERY_VERIFIED" as const)
            : ("RECOVERY_VERIFICATION_REQUIRED" as const);

  const baselineRestorationState =
    latest?.baselineRestored && remediationEffective
      ? ("MULTI_HORIZON_BASELINE_RESTORED" as const)
      : input.build386.baselineHealthy
        ? ("BASELINE_ALREADY_HEALTHY" as const)
        : ("BASELINE_RESTORATION_REQUIRED" as const);

  const warningClosureState =
    recoveryState === "RECOVERY_VERIFIED" ||
    recoveryState === "NO_ACTIVE_WARNING"
      ? ("WARNING_CLOSED" as const)
      : ("WARNING_OPEN" as const);

  const connectionState =
    input.build386.connectionState === "CONNECTED" &&
    warningClosureState === "WARNING_CLOSED" &&
    baselineRestorationState !== "BASELINE_RESTORATION_REQUIRED"
      ? ("CONNECTED" as const)
      : ("DISCONNECTED_HOLD" as const);

  return {
    schema: BUILD_387_SCHEMA,
    build: BUILD_387,
    controllerBaseRevision: BUILD_387_CONTROLLER_BASE_REVISION,
    build386: input.build386,
    latestRecoveryObservation: latest,
    recoveryState,
    remediationEffective,
    allThreeMastersAcknowledged,
    baselineRestorationState,
    warningClosureState,
    connectionState,
    blockers: [
      ...(recoveryState === "RECOVERY_EVIDENCE_REQUIRED"
        ? ["Active early warning requires a durable recovery observation."]
        : []),
      ...(recoveryState === "RECOVERY_VERIFICATION_REQUIRED"
        ? ["Recovery requires verified remediation, restored baseline evidence, and acknowledgement by all three masters."]
        : []),
      ...(!remediationEffective && input.build386.earlyWarningState === "EARLY_WARNING_ACTIVE"
        ? ["Remediation effectiveness must restore each reviewed preventive control to at least its pre-degradation score."]
        : []),
      ...(baselineRestorationState === "BASELINE_RESTORATION_REQUIRED"
        ? ["Multi-horizon baseline restoration evidence is incomplete."]
        : [])
    ],
    policy: {
      independentRemediationVerificationRequired: true,
      restoredScoreMustMeetOrExceedPreviousScore: true,
      allThreeMastersRequiredForWarningClosure: true,
      multiHorizonBaselineRestorationRequired: true,
      warningClosureMustBeDurable: true,
      codeGreenCannotCloseRuntimeWarning: true
    }
  };
}

export type Build387EarlyWarningRecoveryModel = ReturnType<
  typeof composeBuild387EarlyWarningRecovery
>;
