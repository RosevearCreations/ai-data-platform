import type { Build384PostRecoveryContinuityWatchModel } from "./yw562-post-recovery-continuity-watch";

export const BUILD_385 = 385 as const;
export const BUILD_385_SCHEMA =
  "rosevear.ai-data-platform.yw562-long-horizon-continuity-stability.v1" as const;
export const BUILD_385_CONTROLLER_BASE_REVISION =
  "89786962864596ed702ceafae123a32d65340041" as const;

export type Build385StabilitySample = {
  sampleId: string;
  observedAt: string;
  connectionState: "CONNECTED" | "DISCONNECTED_HOLD";
  recurrenceDetected: boolean;
  masterReceiptsHealthy: boolean;
};

export type Build385PreventiveControlReview = {
  controlId: string;
  aiHubEffective: boolean;
  commsEffective: boolean;
  controllerEffective: boolean;
  independentlyVerified: boolean;
};

export function composeBuild385LongHorizonContinuityStability(input: {
  build384: Build384PostRecoveryContinuityWatchModel;
  stabilitySamples?: readonly Build385StabilitySample[];
  preventiveControls?: readonly Build385PreventiveControlReview[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const horizonMs = 24 * 60 * 60_000;
  const samples = [...(input.stabilitySamples ?? [])]
    .filter((sample) => {
      const observed = Date.parse(sample.observedAt);
      return Number.isFinite(observed) && now.getTime() - observed <= horizonMs;
    })
    .sort((a,b) => a.observedAt.localeCompare(b.observedAt));

  const stableSamples = samples.filter(
    (sample) =>
      sample.connectionState === "CONNECTED" &&
      !sample.recurrenceDetected &&
      sample.masterReceiptsHealthy
  );
  const recurrenceCount = samples.filter((sample) => sample.recurrenceDetected).length;
  const stabilityRatio = samples.length === 0 ? 0 : stableSamples.length / samples.length;

  const continuityStabilityState =
    input.build384.connectionState !== "CONNECTED"
      ? ("HOLD_BUILD384_NOT_CONNECTED" as const)
      : samples.length < 6
        ? ("STABILITY_EVIDENCE_INCOMPLETE" as const)
        : stabilityRatio >= 0.95 && recurrenceCount === 0
          ? ("LONG_HORIZON_STABLE" as const)
          : ("LONG_HORIZON_UNSTABLE" as const);

  const trendState =
    recurrenceCount === 0
      ? ("NO_RECURRENCE_TREND" as const)
      : recurrenceCount === 1
        ? ("ISOLATED_RECURRENCE" as const)
        : ("RECURRING_DRIFT_TREND" as const);

  const controls = [...(input.preventiveControls ?? [])];
  const effectiveControls = controls.filter(
    (control) =>
      control.aiHubEffective &&
      control.commsEffective &&
      control.controllerEffective &&
      control.independentlyVerified
  );

  const preventiveControlEffectivenessState =
    controls.length === 0
      ? ("REVIEW_REQUIRED" as const)
      : effectiveControls.length === controls.length
        ? ("THREE_MASTER_CONTROLS_EFFECTIVE" as const)
        : ("CONTROL_GAPS_DETECTED" as const);

  const connectionState =
    continuityStabilityState === "LONG_HORIZON_STABLE" &&
    trendState === "NO_RECURRENCE_TREND" &&
    preventiveControlEffectivenessState === "THREE_MASTER_CONTROLS_EFFECTIVE"
      ? ("CONNECTED" as const)
      : ("DISCONNECTED_HOLD" as const);

  return {
    schema: BUILD_385_SCHEMA,
    build: BUILD_385,
    controllerBaseRevision: BUILD_385_CONTROLLER_BASE_REVISION,
    build384: input.build384,
    sampleCount: samples.length,
    stabilityRatio,
    recurrenceCount,
    continuityStabilityState,
    trendState,
    preventiveControlEffectivenessState,
    connectionState,
    blockers: [
      ...(continuityStabilityState === "STABILITY_EVIDENCE_INCOMPLETE"
        ? ["At least six long-horizon stability samples are required within 24 hours."]
        : []),
      ...(continuityStabilityState === "LONG_HORIZON_UNSTABLE"
        ? ["Long-horizon stability fell below the required 95% recurrence-free threshold."]
        : []),
      ...(trendState === "RECURRING_DRIFT_TREND"
        ? ["Multiple recurrence events require three-master trend remediation."]
        : []),
      ...(preventiveControlEffectivenessState !== "THREE_MASTER_CONTROLS_EFFECTIVE"
        ? ["All preventive controls must be effective across AI Hub, Comms Hub, and AI Data Platform and independently verified."]
        : [])
    ],
    policy: {
      observationWindowHours: 24,
      minimumSamples: 6,
      minimumStabilityRatio: 0.95,
      noRecurrenceRequiredForConnected: true,
      allThreeMasterControlsMustBeEffective: true,
      independentControlVerificationRequired: true,
      recurringTrendForcesHold: true,
      historicalGreenCannotOverrideLongHorizonEvidence: true
    }
  };
}

export type Build385LongHorizonContinuityStabilityModel = ReturnType<
  typeof composeBuild385LongHorizonContinuityStability
>;
