import type { Build385LongHorizonContinuityStabilityModel } from "./yw562-long-horizon-continuity-stability";

export const BUILD_386 = 386 as const;
export const BUILD_386_SCHEMA =
  "rosevear.ai-data-platform.yw562-multi-horizon-stability-baseline.v1" as const;
export const BUILD_386_CONTROLLER_BASE_REVISION =
  "3630ffcd668d63961411589c93b88141ee46abfb" as const;

export type Build386HorizonSample = {
  sampleId: string;
  observedAt: string;
  connectionState: "CONNECTED" | "DISCONNECTED_HOLD";
  stabilityRatio: number;
  preventiveControlsHealthy: boolean;
};

export type Build386PreventiveControlSignal = {
  controlId: string;
  previousScore: number;
  currentScore: number;
  aiHubAcknowledged: boolean;
  commsAcknowledged: boolean;
  controllerAcknowledged: boolean;
};

export function composeBuild386MultiHorizonStabilityBaseline(input: {
  build385: Build385LongHorizonContinuityStabilityModel;
  horizonSamples?: readonly Build386HorizonSample[];
  preventiveControlSignals?: readonly Build386PreventiveControlSignal[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const samples = [...(input.horizonSamples ?? [])];

  const withinHours = (hours: number) =>
    samples.filter((sample) => {
      const observed = Date.parse(sample.observedAt);
      return Number.isFinite(observed) && now.getTime() - observed <= hours * 60 * 60_000;
    });

  const evaluateHorizon = (hours: number, minSamples: number, minRatio: number) => {
    const horizon = withinHours(hours);
    const stable = horizon.filter(
      (sample) =>
        sample.connectionState === "CONNECTED" &&
        sample.stabilityRatio >= minRatio &&
        sample.preventiveControlsHealthy
    );
    return {
      hours,
      sampleCount: horizon.length,
      stableCount: stable.length,
      stabilityRatio: horizon.length === 0 ? 0 : stable.length / horizon.length,
      complete: horizon.length >= minSamples
    };
  };

  const horizons = {
    sixHour: evaluateHorizon(6, 3, 0.95),
    twentyFourHour: evaluateHorizon(24, 6, 0.95),
    seventyTwoHour: evaluateHorizon(72, 12, 0.98)
  };

  const baselineComplete =
    horizons.sixHour.complete &&
    horizons.twentyFourHour.complete &&
    horizons.seventyTwoHour.complete;

  const baselineHealthy =
    baselineComplete &&
    horizons.sixHour.stabilityRatio >= 0.95 &&
    horizons.twentyFourHour.stabilityRatio >= 0.95 &&
    horizons.seventyTwoHour.stabilityRatio >= 0.98;

  const signals = [...(input.preventiveControlSignals ?? [])];
  const degradedControls = signals.filter(
    (signal) => signal.currentScore < signal.previousScore - 0.05
  );

  const allThreeMastersAcknowledged =
    degradedControls.length === 0 ||
    degradedControls.every(
      (signal) =>
        signal.aiHubAcknowledged &&
        signal.commsAcknowledged &&
        signal.controllerAcknowledged
    );

  const degradationState =
    degradedControls.length === 0
      ? ("NO_DEGRADATION_DETECTED" as const)
      : allThreeMastersAcknowledged
        ? ("DEGRADATION_ACKNOWLEDGED" as const)
        : ("DEGRADATION_ESCALATION_REQUIRED" as const);

  const earlyWarningState =
    !baselineComplete
      ? ("BASELINE_INCOMPLETE" as const)
      : degradedControls.length > 0
        ? ("EARLY_WARNING_ACTIVE" as const)
        : baselineHealthy
          ? ("BASELINE_HEALTHY" as const)
          : ("BASELINE_DEGRADED" as const);

  const connectionState =
    input.build385.connectionState === "CONNECTED" &&
    baselineHealthy &&
    degradationState === "NO_DEGRADATION_DETECTED"
      ? ("CONNECTED" as const)
      : ("DISCONNECTED_HOLD" as const);

  return {
    schema: BUILD_386_SCHEMA,
    build: BUILD_386,
    controllerBaseRevision: BUILD_386_CONTROLLER_BASE_REVISION,
    build385: input.build385,
    horizons,
    baselineComplete,
    baselineHealthy,
    degradedControlCount: degradedControls.length,
    degradationState,
    allThreeMastersAcknowledged,
    earlyWarningState,
    connectionState,
    blockers: [
      ...(!baselineComplete
        ? ["Multi-horizon stability baseline requires complete 6h, 24h, and 72h evidence."]
        : []),
      ...(baselineComplete && !baselineHealthy
        ? ["One or more stability horizons fell below the required baseline threshold."]
        : []),
      ...(degradationState === "DEGRADATION_ESCALATION_REQUIRED"
        ? ["Preventive-control degradation requires acknowledgement from all three masters."]
        : []),
      ...(earlyWarningState === "EARLY_WARNING_ACTIVE"
        ? ["Early-warning escalation remains active until degraded controls are remediated."]
        : [])
    ],
    policy: {
      sixHourMinimumSamples: 3,
      twentyFourHourMinimumSamples: 6,
      seventyTwoHourMinimumSamples: 12,
      sixHourMinimumStabilityRatio: 0.95,
      twentyFourHourMinimumStabilityRatio: 0.95,
      seventyTwoHourMinimumStabilityRatio: 0.98,
      degradationThreshold: 0.05,
      allThreeMastersRequiredForDegradationAcknowledgement: true,
      degradationForcesHold: true,
      codeGreenCannotOverrideBaselineEvidence: true
    }
  };
}

export type Build386MultiHorizonStabilityBaselineModel = ReturnType<
  typeof composeBuild386MultiHorizonStabilityBaseline
>;
