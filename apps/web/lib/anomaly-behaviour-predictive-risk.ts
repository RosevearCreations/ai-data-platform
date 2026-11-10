import type { CapacityWorkloadForecastModel } from "./capacity-workload-forecasting";
import type { IncidentRunbookRecoveryModel } from "./incident-runbook-recovery-orchestration";

export const ANOMALY_BEHAVIOUR_PREDICTIVE_RISK_BUILD = 358 as const;
export const ANOMALY_BEHAVIOUR_PREDICTIVE_RISK_SCHEMA =
  "rosevear.ai-data-platform.anomaly-behaviour-predictive-risk.v1" as const;

export type AnomalyState =
  | "NORMAL"
  | "ATTENTION"
  | "ANOMALOUS"
  | "UNMEASURED";

export type BaselineQuality =
  | "INSUFFICIENT"
  | "LIMITED"
  | "ESTABLISHED";

export type PredictiveRiskBand =
  | "LOW"
  | "GUARDED"
  | "ELEVATED"
  | "CRITICAL";

type CurrentMetric = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  sampleCount: number;
  measured: boolean;
};

type PerformanceBaselineInput = {
  live: {
    overallState: string;
    metrics: CurrentMetric[];
    budgetResults: Array<{
      metricKey: string;
      status: string;
    }>;
    regressions: Array<{
      metricKey: string;
      regressed: boolean;
      comparable: boolean;
    }>;
  };
  snapshots: Array<{
    generatedAt: string;
    metrics: unknown[];
  }>;
};

type ObservatoryInput = {
  api: Array<{
    operationKey: string;
    state: string;
    p95Ms: number | null;
    failureRatePct: number | null;
  }>;
  database: Array<{
    operationKey: string;
    state: string;
    p95Ms: number | null;
    failureRatePct: number | null;
    maxPoolWaiting: number;
  }>;
  dependencies: Array<{
    connectorKey: string;
    state: string;
    p95Ms: number | null;
    failureRatePct: number | null;
  }>;
  pools: {
    maxObservedAppWaiting: number;
  };
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function medianAbsoluteDeviation(values: number[], centre: number) {
  return median(values.map((value) => Math.abs(value - centre)));
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function historicalMetricValues(
  snapshots: PerformanceBaselineInput["snapshots"],
  metricKey: string
) {
  const values: number[] = [];

  for (const snapshot of snapshots) {
    for (const item of snapshot.metrics) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const metric = item as Record<string, unknown>;
      if (String(metric.key ?? "") !== metricKey) continue;
      const value = metric.value;
      if (finite(value)) values.push(value);
    }
  }

  return values;
}

function qualityForSamples(samples: number): BaselineQuality {
  if (samples >= 5) return "ESTABLISHED";
  if (samples >= 3) return "LIMITED";
  return "INSUFFICIENT";
}

function stateForDeviation(input: {
  measured: boolean;
  current: number | null;
  robustZ: number | null;
  budgetStatus: string;
  regressed: boolean;
}): AnomalyState {
  if (!input.measured || input.current === null) return "UNMEASURED";

  if (
    input.budgetStatus === "critical" ||
    input.regressed ||
    (input.robustZ !== null && input.robustZ >= 3.5)
  ) {
    return "ANOMALOUS";
  }

  if (
    input.budgetStatus === "warning" ||
    (input.robustZ !== null && input.robustZ >= 2)
  ) {
    return "ATTENTION";
  }

  return "NORMAL";
}

function riskBand(score: number): PredictiveRiskBand {
  if (score >= 70) return "CRITICAL";
  if (score >= 40) return "ELEVATED";
  if (score >= 20) return "GUARDED";
  return "LOW";
}

function riskConfidence(input: {
  establishedBaselines: number;
  limitedBaselines: number;
  unmeasuredMetrics: number;
  totalMetrics: number;
}) {
  if (
    input.totalMetrics > 0 &&
    input.establishedBaselines >= Math.ceil(input.totalMetrics * 0.6) &&
    input.unmeasuredMetrics === 0
  ) {
    return "HIGH" as const;
  }

  if (
    input.establishedBaselines + input.limitedBaselines > 0 &&
    input.unmeasuredMetrics < input.totalMetrics
  ) {
    return "MEDIUM" as const;
  }

  return "LOW" as const;
}

export function composeAnomalyBehaviourPredictiveRisk(input: {
  baseline: PerformanceBaselineInput;
  observatory: ObservatoryInput;
  capacity: CapacityWorkloadForecastModel;
  incidents: IncidentRunbookRecoveryModel;
  generatedAt?: Date;
}) {
  const budgetByMetric = new Map(
    input.baseline.live.budgetResults.map((item) => [
      item.metricKey,
      item.status
    ])
  );
  const regressionByMetric = new Map(
    input.baseline.live.regressions.map((item) => [
      item.metricKey,
      item.comparable && item.regressed
    ])
  );

  const behaviourBaselines = input.baseline.live.metrics.map((metric) => {
    const history = historicalMetricValues(
      input.baseline.snapshots,
      metric.key
    );
    const centre = median(history);
    const mad =
      centre === null ? null : medianAbsoluteDeviation(history, centre);

    let robustZ: number | null = null;
    if (
      metric.value !== null &&
      centre !== null &&
      mad !== null
    ) {
      if (mad > 0) {
        robustZ = Math.abs(metric.value - centre) / (1.4826 * mad);
      } else if (metric.value !== centre) {
        robustZ = 5;
      } else {
        robustZ = 0;
      }
    }

    const budgetStatus = budgetByMetric.get(metric.key) ?? "unmeasured";
    const regressed = regressionByMetric.get(metric.key) ?? false;
    const quality = qualityForSamples(history.length);
    const state = stateForDeviation({
      measured: metric.measured,
      current: metric.value,
      robustZ,
      budgetStatus,
      regressed
    });

    return {
      metricKey: metric.key,
      label: metric.label,
      unit: metric.unit,
      currentValue: metric.value,
      currentSampleCount: metric.sampleCount,
      historicalSamples: history.length,
      baselineMedian: centre === null ? null : round(centre),
      baselineMad: mad === null ? null : round(mad),
      robustZ: robustZ === null ? null : round(robustZ),
      baselineQuality: quality,
      budgetStatus,
      regressed,
      anomalyState: state,
      method:
        "Median/MAD robust deviation with current budget/regression context."
    };
  });

  const observatorySignals = [
    ...input.observatory.api.map((item) => ({
      id: "api:" + item.operationKey,
      state: item.state,
      evidence:
        "API P95=" +
        String(item.p95Ms ?? "unmeasured") +
        "ms; failure-rate=" +
        String(item.failureRatePct ?? "unmeasured") +
        "%"
    })),
    ...input.observatory.database.map((item) => ({
      id: "database:" + item.operationKey,
      state: item.state,
      evidence:
        "Database P95=" +
        String(item.p95Ms ?? "unmeasured") +
        "ms; failure-rate=" +
        String(item.failureRatePct ?? "unmeasured") +
        "%; pool-wait=" +
        item.maxPoolWaiting
    })),
    ...input.observatory.dependencies.map((item) => ({
      id: "dependency:" + item.connectorKey,
      state: item.state,
      evidence:
        "Dependency P95=" +
        String(item.p95Ms ?? "unmeasured") +
        "ms; failure-rate=" +
        String(item.failureRatePct ?? "unmeasured") +
        "%"
    }))
  ];

  const anomalousMetrics = behaviourBaselines.filter(
    (item) => item.anomalyState === "ANOMALOUS"
  );
  const attentionMetrics = behaviourBaselines.filter(
    (item) => item.anomalyState === "ATTENTION"
  );
  const poorOperations = observatorySignals.filter(
    (item) => item.state === "poor"
  );
  const attentionOperations = observatorySignals.filter(
    (item) => item.state === "needs-attention"
  );
  const criticalCapacity = input.capacity.forecasts.filter(
    (item) => item.pressure === "CRITICAL"
  );
  const attentionCapacity = input.capacity.forecasts.filter(
    (item) => item.pressure === "ATTENTION"
  );
  const criticalIncidents = input.incidents.plans.filter(
    (item) => item.severity === "CRITICAL"
  );
  const blockedIncidents = input.incidents.plans.filter(
    (item) => item.state === "BLOCKED"
  );

  const rawRiskScore =
    anomalousMetrics.length * 20 +
    attentionMetrics.length * 8 +
    poorOperations.length * 15 +
    attentionOperations.length * 6 +
    criticalCapacity.length * 12 +
    attentionCapacity.length * 5 +
    criticalIncidents.length * 10 +
    blockedIncidents.length * 6 +
    Math.min(10, input.observatory.pools.maxObservedAppWaiting * 2);

  const riskScore = Math.min(100, rawRiskScore);
  const band = riskBand(riskScore);

  const drivers = [
    ...anomalousMetrics.map((item) => ({
      id: "anomaly:" + item.metricKey,
      weight: 20,
      category: "BEHAVIOUR_ANOMALY",
      detail:
        item.label +
        " is anomalous against its measured baseline; robust-z=" +
        String(item.robustZ ?? "n/a") +
        "."
    })),
    ...poorOperations.map((item) => ({
      id: "observatory:" + item.id,
      weight: 15,
      category: "SERVICE_PRESSURE",
      detail: item.evidence
    })),
    ...criticalCapacity.map((item) => ({
      id: "capacity:" + item.key,
      weight: 12,
      category: "DEMAND_PRESSURE",
      detail:
        item.label +
        " is CRITICAL under scenario " +
        input.capacity.scenario.label +
        "."
    })),
    ...criticalIncidents.map((item) => ({
      id: "incident:" + item.id,
      weight: 10,
      category: "INCIDENT_PRESSURE",
      detail:
        item.sourceId +
        " has a CRITICAL incident plan in state " +
        item.state +
        "."
    })),
    ...attentionMetrics.map((item) => ({
      id: "attention:" + item.metricKey,
      weight: 8,
      category: "BEHAVIOUR_ATTENTION",
      detail:
        item.label +
        " is outside its normal attention band."
    })),
    ...attentionOperations.map((item) => ({
      id: "observatory-attention:" + item.id,
      weight: 6,
      category: "SERVICE_ATTENTION",
      detail: item.evidence
    }))
  ]
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .slice(0, 12);

  const establishedBaselines = behaviourBaselines.filter(
    (item) => item.baselineQuality === "ESTABLISHED"
  ).length;
  const limitedBaselines = behaviourBaselines.filter(
    (item) => item.baselineQuality === "LIMITED"
  ).length;
  const unmeasuredMetrics = behaviourBaselines.filter(
    (item) => item.anomalyState === "UNMEASURED"
  ).length;
  const confidence = riskConfidence({
    establishedBaselines,
    limitedBaselines,
    unmeasuredMetrics,
    totalMetrics: behaviourBaselines.length
  });

  return {
    schema: ANOMALY_BEHAVIOUR_PREDICTIVE_RISK_SCHEMA,
    build: ANOMALY_BEHAVIOUR_PREDICTIVE_RISK_BUILD,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    behaviourBaselines,
    anomalySummary: {
      anomalous: anomalousMetrics.length,
      attention: attentionMetrics.length,
      normal: behaviourBaselines.filter(
        (item) => item.anomalyState === "NORMAL"
      ).length,
      unmeasured: unmeasuredMetrics,
      establishedBaselines,
      limitedBaselines
    },
    predictiveRisk: {
      score: riskScore,
      band,
      confidence,
      drivers,
      horizon: "NEXT_OBSERVATION_WINDOW" as const,
      assumption:
        "Current measured conditions and selected demand scenario continue until the next evidence refresh.",
      scoreMeaning:
        "Heuristic review-priority index from 0-100; it is not a probability of failure."
    },
    evidenceContext: {
      performanceOverallState: input.baseline.live.overallState,
      poorOperations: poorOperations.length,
      attentionOperations: attentionOperations.length,
      capacityScenario: input.capacity.scenario.label,
      criticalCapacityDimensions: criticalCapacity.length,
      attentionCapacityDimensions: attentionCapacity.length,
      criticalIncidentPlans: criticalIncidents.length,
      blockedIncidentPlans: blockedIncidents.length,
      maxObservedPoolWaiting:
        input.observatory.pools.maxObservedAppWaiting
    },
    intelligence: {
      anomalyDetectionAutomatic: true,
      baselineComputationAutomatic: true,
      riskIndexComputationAutomatic: true,
      recommendationIsAdvisoryOnly: true,
      predictionIsFutureFact: false,
      predictionIsFailureProbability: false
    },
    policy: {
      missingEvidenceIsNormal: false,
      insufficientBaselineCanClaimAnomaly: false,
      anomalyCanChangeSourceTruth: false,
      riskCanReleaseHold: false,
      riskCanCreateAcceptance: false,
      riskCanTriggerPeerRecovery: false,
      riskCanTriggerScaling: false,
      riskCanTriggerCommsIncident: false,
      riskCanTriggerSourceWrite: false,
      explicitOperatorReviewRequired: true,
      sourceAuthorityPreserved: true,
      commsAuthorityPreserved: true
    }
  };
}

export type AnomalyBehaviourPredictiveRiskModel = ReturnType<
  typeof composeAnomalyBehaviourPredictiveRisk
>;
