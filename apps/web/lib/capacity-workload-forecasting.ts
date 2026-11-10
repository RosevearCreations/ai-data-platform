import type { CapacityPlanningModel } from "./capacity-planning";

export const CAPACITY_WORKLOAD_FORECASTING_BUILD = 356 as const;
export const CAPACITY_WORKLOAD_FORECASTING_SCHEMA =
  "rosevear.ai-data-platform.capacity-workload-resource-demand-forecasting.v1" as const;

export type ForecastPressure =
  | "NOMINAL"
  | "ATTENTION"
  | "CRITICAL"
  | "UNMEASURED";

type PerformanceObservatoryInput = {
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

type ForecastMetric = {
  key:
    | "storage"
    | "records"
    | "provider-units"
    | "collection-frequency"
    | "integration-volume"
    | "retention";
  label: string;
  current: number;
  forecast: number;
  delta: number;
  unit: "bytes" | "records" | "units" | "attempts" | "events";
  sourceHref: string;
};

function pressureFromPerformance(input: PerformanceObservatoryInput) {
  const poor =
    input.api.filter((item) => item.state === "poor").length +
    input.database.filter((item) => item.state === "poor").length +
    input.dependencies.filter((item) => item.state === "poor").length;
  const attention =
    input.api.filter((item) => item.state === "needs-attention").length +
    input.database.filter((item) => item.state === "needs-attention").length +
    input.dependencies.filter((item) => item.state === "needs-attention").length;

  return {
    poor,
    attention,
    maxPoolWaiting: input.pools.maxObservedAppWaiting
  };
}

function classifyPressure(input: {
  multiplier: number;
  current: number;
  poorSignals: number;
  attentionSignals: number;
  maxPoolWaiting: number;
}): ForecastPressure {
  if (input.current <= 0) return "UNMEASURED";

  if (
    input.poorSignals > 0 ||
    input.maxPoolWaiting >= 5 ||
    (input.multiplier >= 2 && input.attentionSignals > 0)
  ) {
    return "CRITICAL";
  }

  if (
    input.attentionSignals > 0 ||
    input.maxPoolWaiting > 0 ||
    input.multiplier > 1
  ) {
    return "ATTENTION";
  }

  return "NOMINAL";
}

function recommendation(
  metric: ForecastMetric,
  pressure: ForecastPressure
) {
  if (pressure === "UNMEASURED") {
    return {
      action:
        "Collect more measured workload evidence before making a capacity decision.",
      trigger:
        "Re-evaluate after current usage or an authoritative hard capacity limit is available."
    };
  }

  if (pressure === "CRITICAL") {
    return {
      action:
        metric.key === "storage"
          ? "Review retention, archival eligibility and storage growth before any storage-tier purchase."
          : metric.key === "records" || metric.key === "integration-volume"
            ? "Review query, batching, pagination and processing throughput before adding capacity."
            : metric.key === "provider-units"
              ? "Review provider demand, retry amplification and scheduled workload before any provider upgrade."
              : metric.key === "collection-frequency"
                ? "Review scheduling, concurrency and duplicate collection work before increasing execution capacity."
                : "Review retention workload timing and maintenance windows; do not delete records automatically.",
      trigger:
        "Require fresh measured performance and workload evidence after any approved mitigation."
    };
  }

  if (pressure === "ATTENTION") {
    return {
      action:
        "Plan the forecasted increase, validate bottlenecks and preserve rollback before changing capacity or scheduling.",
      trigger:
        "Escalate only when measured pressure or a known capacity ceiling confirms the need."
    };
  }

  return {
    action:
      "Keep monitoring. No capacity change is justified by the current measured evidence.",
    trigger:
      "Re-evaluate when demand, latency, failures, pool waiting or authoritative capacity limits change."
  };
}

export function composeCapacityWorkloadForecast(input: {
  capacity: CapacityPlanningModel;
  observatory: PerformanceObservatoryInput;
  generatedAt?: Date;
}) {
  const performance = pressureFromPerformance(input.observatory);

  const totalsByKey = new Map<ForecastMetric["key"], ForecastMetric>([
    [
      "storage",
      {
        key: "storage",
        label: "Storage workload",
        current: input.capacity.totals.storageBytes,
        forecast: input.capacity.forecastTotals.storageBytes,
        delta:
          input.capacity.forecastTotals.storageBytes -
          input.capacity.totals.storageBytes,
        unit: "bytes",
        sourceHref: "/capacity-planning"
      }
    ],
    [
      "records",
      {
        key: "records",
        label: "Operational record workload",
        current: input.capacity.totals.recordVolume,
        forecast: input.capacity.forecastTotals.recordVolume,
        delta:
          input.capacity.forecastTotals.recordVolume -
          input.capacity.totals.recordVolume,
        unit: "records",
        sourceHref: "/capacity-planning"
      }
    ],
    [
      "provider-units",
      {
        key: "provider-units",
        label: "Provider demand",
        current: input.capacity.totals.providerUnits,
        forecast: input.capacity.forecastTotals.providerUnits,
        delta:
          input.capacity.forecastTotals.providerUnits -
          input.capacity.totals.providerUnits,
        unit: "units",
        sourceHref: "/capacity-planning"
      }
    ],
    [
      "collection-frequency",
      {
        key: "collection-frequency",
        label: "Collection workload",
        current: input.capacity.totals.collectionAttempts,
        forecast: input.capacity.forecastTotals.collectionAttempts,
        delta:
          input.capacity.forecastTotals.collectionAttempts -
          input.capacity.totals.collectionAttempts,
        unit: "attempts",
        sourceHref: "/capacity-planning"
      }
    ],
    [
      "integration-volume",
      {
        key: "integration-volume",
        label: "Integration workload",
        current: input.capacity.totals.integrationEvents,
        forecast: input.capacity.forecastTotals.integrationEvents,
        delta:
          input.capacity.forecastTotals.integrationEvents -
          input.capacity.totals.integrationEvents,
        unit: "events",
        sourceHref: "/capacity-planning"
      }
    ],
    [
      "retention",
      {
        key: "retention",
        label: "Retention workload",
        current: input.capacity.totals.retentionRows,
        forecast: input.capacity.forecastTotals.retentionRows,
        delta:
          input.capacity.forecastTotals.retentionRows -
          input.capacity.totals.retentionRows,
        unit: "records",
        sourceHref: "/retention"
      }
    ]
  ]);

  const forecasts = Array.from(totalsByKey.values()).map((metric) => {
    const pressure = classifyPressure({
      multiplier: input.capacity.scenario.multiplier,
      current: metric.current,
      poorSignals: performance.poor,
      attentionSignals: performance.attention,
      maxPoolWaiting: performance.maxPoolWaiting
    });
    const guidance = recommendation(metric, pressure);

    return {
      ...metric,
      pressure,
      growthMultiplier: input.capacity.scenario.multiplier,
      knownHardCapacity: null,
      headroomKnown: false as const,
      forecastIsDemandProxy: true as const,
      recommendation: guidance.action,
      recheckTrigger: guidance.trigger
    };
  });

  const ranked = [...forecasts].sort((a, b) => {
    const score = (value: ForecastPressure) =>
      value === "CRITICAL" ? 3 : value === "ATTENTION" ? 2 : value === "NOMINAL" ? 1 : 0;
    return score(b.pressure) - score(a.pressure) || b.delta - a.delta;
  });

  return {
    schema: CAPACITY_WORKLOAD_FORECASTING_SCHEMA,
    build: CAPACITY_WORKLOAD_FORECASTING_BUILD,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    scenario: input.capacity.scenario,
    forecasts,
    ranked,
    performanceContext: {
      poorSignals: performance.poor,
      attentionSignals: performance.attention,
      maxPoolWaiting: performance.maxPoolWaiting
    },
    summary: {
      forecastDimensions: forecasts.length,
      critical: forecasts.filter((item) => item.pressure === "CRITICAL").length,
      attention: forecasts.filter((item) => item.pressure === "ATTENTION").length,
      nominal: forecasts.filter((item) => item.pressure === "NOMINAL").length,
      unmeasured: forecasts.filter((item) => item.pressure === "UNMEASURED").length
    },
    boundaries: {
      hardInfrastructureCapacityImported: false,
      cloudProviderQuotasImported: false,
      actualBillingImported: false,
      staffingCapacityImported: false,
      sourceAppCapacityImported: false,
      headroomClaimedWithoutLimitEvidence: false
    },
    policy: {
      measuredEvidenceOnly: true,
      forecastsAreOperationalProxies: true,
      missingEvidenceIsSuccess: false,
      automaticScaling: false,
      automaticPurchasing: false,
      automaticProviderUpgrade: false,
      automaticStaffingChange: false,
      automaticScheduleMutation: false,
      automaticRetentionDeletion: false,
      automaticSourceAppMutation: false,
      operatorApprovalRequired: true,
      validateAfterChange: true,
      rollbackRequired: true
    }
  };
}

export type CapacityWorkloadForecastModel = ReturnType<
  typeof composeCapacityWorkloadForecast
>;
