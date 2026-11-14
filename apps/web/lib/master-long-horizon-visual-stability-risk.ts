import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build393PostRecertificationStability } from "./master-post-recertification-visual-stability";

export const BUILD_394 = 394 as const;
export const BUILD_394_SCHEMA =
  "rosevear.ai-data-platform.long-horizon-visual-stability-risk.v1" as const;
export const BUILD_394_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_394_MIN_TREND_WINDOW_HOURS = 24 as const;

export type Build394VisualStabilityTrendWindow = {
  windowId: string;
  shellId: Build391ShellId;
  windowStart: string;
  windowEnd: string;
  sampleCount: number;
  stableRatio: number;
  recurrenceCount: number;
  trendState: "IMPROVING" | "STABLE" | "DEGRADING" | "HOLD";
  independentlyObserved: boolean;
};

export type Build394PreventiveControlHealthReview = {
  reviewId: string;
  shellId: Build391ShellId;
  observedAt: string;
  controlsExpected: number;
  controlsHealthy: number;
  degradationSignals: number;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  controlState: "HEALTHY" | "DEGRADED" | "HOLD";
};

export type Build394RecurrenceRiskForecast = {
  forecastId: string;
  shellId: Build391ShellId;
  observedAt: string;
  horizonHours: number;
  evidencePoints: number;
  recurrenceProbabilityBps: number;
  riskBand: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  forecastState: "VERIFIED" | "HOLD" | "REJECTED";
};

const REQUIRED_SHELLS: readonly Build391ShellId[] = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
];

function durationHours(start: string, end: string) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  return (endMs - startMs) / 3_600_000;
}

export function assessBuild394LongHorizonVisualStability(input: {
  build393: Build393PostRecertificationStability;
  trendWindows?: readonly Build394VisualStabilityTrendWindow[];
  preventiveControlReviews?: readonly Build394PreventiveControlHealthReview[];
  recurrenceRiskForecasts?: readonly Build394RecurrenceRiskForecast[];
}) {
  const build393Eligible =
    input.build393.governanceState === "POST_RECERTIFICATION_STABILITY_VERIFIED";

  const latestTrendByShell = new Map<
    Build391ShellId,
    Build394VisualStabilityTrendWindow
  >();
  for (const item of [...(input.trendWindows ?? [])].sort((a, b) =>
    b.windowEnd.localeCompare(a.windowEnd)
  )) {
    if (!latestTrendByShell.has(item.shellId)) {
      latestTrendByShell.set(item.shellId, item);
    }
  }

  const missingTrendShells = REQUIRED_SHELLS.filter(
    (shellId) => !latestTrendByShell.has(shellId)
  );

  const insufficientTrendShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = latestTrendByShell.get(shellId);
    if (!item) return false;
    return (
      durationHours(item.windowStart, item.windowEnd) <
        BUILD_394_MIN_TREND_WINDOW_HOURS ||
      item.sampleCount < 2 ||
      item.stableRatio < 0 ||
      item.stableRatio > 1 ||
      !item.independentlyObserved
    );
  });

  const degradingTrendShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = latestTrendByShell.get(shellId);
    if (!item) return false;
    return (
      item.trendState === "DEGRADING" ||
      item.trendState === "HOLD" ||
      item.stableRatio < 0.95 ||
      item.recurrenceCount > 0
    );
  });

  const latestControlByShell = new Map<
    Build391ShellId,
    Build394PreventiveControlHealthReview
  >();
  for (const item of [...(input.preventiveControlReviews ?? [])].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latestControlByShell.has(item.shellId)) {
      latestControlByShell.set(item.shellId, item);
    }
  }

  const missingControlReviewShells = REQUIRED_SHELLS.filter(
    (shellId) => !latestControlByShell.has(shellId)
  );

  const degradedControlShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = latestControlByShell.get(shellId);
    if (!item) return false;
    return !(
      item.controlsExpected >= 1 &&
      item.controlsHealthy === item.controlsExpected &&
      item.degradationSignals === 0 &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.controlState === "HEALTHY"
    );
  });

  const latestForecastByShell = new Map<
    Build391ShellId,
    Build394RecurrenceRiskForecast
  >();
  for (const item of [...(input.recurrenceRiskForecasts ?? [])].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latestForecastByShell.has(item.shellId)) {
      latestForecastByShell.set(item.shellId, item);
    }
  }

  const missingForecastShells = REQUIRED_SHELLS.filter(
    (shellId) => !latestForecastByShell.has(shellId)
  );

  const invalidForecastShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = latestForecastByShell.get(shellId);
    if (!item) return false;
    return !(
      item.horizonHours >= 24 &&
      item.evidencePoints >= 3 &&
      item.recurrenceProbabilityBps >= 0 &&
      item.recurrenceProbabilityBps <= 10_000 &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.forecastState === "VERIFIED"
    );
  });

  const elevatedRiskShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = latestForecastByShell.get(shellId);
    if (!item) return false;
    return item.riskBand === "HIGH" || item.riskBand === "CRITICAL";
  });

  const governanceState =
    !build393Eligible
      ? ("HOLD_BUILD393_NOT_VERIFIED" as const)
      : missingTrendShells.length > 0 || insufficientTrendShells.length > 0
        ? ("LONG_HORIZON_EVIDENCE_INCOMPLETE" as const)
        : degradingTrendShells.length > 0
          ? ("VISUAL_STABILITY_TREND_DEGRADING" as const)
          : missingControlReviewShells.length > 0
            ? ("PREVENTIVE_CONTROL_HEALTH_REQUIRED" as const)
            : degradedControlShells.length > 0
              ? ("PREVENTIVE_CONTROL_DEGRADATION_DETECTED" as const)
              : missingForecastShells.length > 0 || invalidForecastShells.length > 0
                ? ("RECURRENCE_RISK_FORECAST_REQUIRED" as const)
                : elevatedRiskShells.length > 0
                  ? ("RECURRENCE_RISK_ELEVATED" as const)
                  : ("LONG_HORIZON_VISUAL_STABILITY_VERIFIED" as const);

  return {
    schema: BUILD_394_SCHEMA,
    build: BUILD_394,
    themeVersion: BUILD_394_THEME_VERSION,
    minimumTrendWindowHours: BUILD_394_MIN_TREND_WINDOW_HOURS,
    build393Eligible,
    missingTrendShells,
    insufficientTrendShells,
    degradingTrendShells,
    missingControlReviewShells,
    degradedControlShells,
    missingForecastShells,
    invalidForecastShells,
    elevatedRiskShells,
    governanceState,
    blockers: [
      ...(!build393Eligible
        ? ["Build 393 post-recertification stability must be verified before long-horizon trend analysis can close."]
        : []),
      ...(missingTrendShells.length
        ? ["Long-horizon visual trend windows are missing for: " + missingTrendShells.join(", ")]
        : []),
      ...(insufficientTrendShells.length
        ? ["Long-horizon trend evidence is insufficient for: " + insufficientTrendShells.join(", ")]
        : []),
      ...(degradingTrendShells.length
        ? ["Visual stability trend is degrading for: " + degradingTrendShells.join(", ")]
        : []),
      ...(missingControlReviewShells.length
        ? ["Preventive-control health review is required for: " + missingControlReviewShells.join(", ")]
        : []),
      ...(degradedControlShells.length
        ? ["Preventive-control degradation detected for: " + degradedControlShells.join(", ")]
        : []),
      ...(missingForecastShells.length || invalidForecastShells.length
        ? ["Verified recurrence-risk forecasts are required for all five governed shells."]
        : []),
      ...(elevatedRiskShells.length
        ? ["Elevated visual recurrence risk requires owner action for: " + elevatedRiskShells.join(", ")]
        : [])
    ],
    policy: {
      trendWindowMustSpanAtLeast24Hours: true,
      allFiveShellsRequireIndependentTrendEvidence: true,
      preventiveControlsRequireOwnerAndIndependentReview: true,
      recurrenceForecastsRequireThreeOrMoreEvidencePoints: true,
      highOrCriticalRiskBlocksClosure: true,
      deploymentGreenCannotEraseTrendDegradationOrRisk: true
    }
  };
}

export type Build394LongHorizonVisualStability = ReturnType<
  typeof assessBuild394LongHorizonVisualStability
>;
