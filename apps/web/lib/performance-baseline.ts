export const PERFORMANCE_BASELINE_VERSION = "1.0.0" as const;
export const PERFORMANCE_BASELINE_SCHEMA =
  "rosevear.ai-data-platform.performance-baseline.v1" as const;

export type PerformanceMetricKey =
  | "database_probe_ms"
  | "connector_p95_ms"
  | "connector_error_rate_pct"
  | "webhook_denied_rate_pct"
  | "delivery_failures_24h";

export type PerformanceMetric = {
  key: PerformanceMetricKey;
  label: string;
  value: number | null;
  unit: "ms" | "percent" | "count";
  sampleCount: number;
  measured: boolean;
};

export type PerformanceBudgetStatus =
  | "healthy"
  | "warning"
  | "critical"
  | "unmeasured";

export type PerformanceBudgetResult = {
  metricKey: PerformanceMetricKey;
  warningThreshold: number;
  criticalThreshold: number;
  status: PerformanceBudgetStatus;
};

export type PerformanceRegression = {
  metricKey: PerformanceMetricKey;
  baselineValue: number | null;
  currentValue: number | null;
  allowedIncrease: number | null;
  regressed: boolean;
  comparable: boolean;
};

export type PerformanceEvidenceInput = {
  databaseProbeMs: number;
  connectorDurationsMs: number[];
  connectorSucceeded: number;
  connectorFailed: number;
  webhookAccepted: number;
  webhookDenied: number;
  deliveryFailures24h: number;
};

export type PreviousPerformanceBaseline = Partial<
  Record<PerformanceMetricKey, number | null>
> | null;

const budgets: Record<
  PerformanceMetricKey,
  {
    warning: number;
    critical: number;
    relativeRegressionPct: number;
    absoluteRegression: number;
  }
> = {
  database_probe_ms: {
    warning: 250,
    critical: 750,
    relativeRegressionPct: 25,
    absoluteRegression: 100
  },
  connector_p95_ms: {
    warning: 1500,
    critical: 4000,
    relativeRegressionPct: 25,
    absoluteRegression: 300
  },
  connector_error_rate_pct: {
    warning: 5,
    critical: 15,
    relativeRegressionPct: 0,
    absoluteRegression: 2
  },
  webhook_denied_rate_pct: {
    warning: 5,
    critical: 15,
    relativeRegressionPct: 0,
    absoluteRegression: 2
  },
  delivery_failures_24h: {
    warning: 1,
    critical: 5,
    relativeRegressionPct: 0,
    absoluteRegression: 1
  }
};

function round(value: number, digits = 3) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

export function percentile(values: number[], percentileValue: number) {
  const safe = values
    .filter(value => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  if (!safe.length) return null;
  const index = Math.min(
    safe.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * safe.length) - 1)
  );
  return round(safe[index]);
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return round((numerator / denominator) * 100, 4);
}

function budgetStatus(
  value: number | null,
  warning: number,
  critical: number
): PerformanceBudgetStatus {
  if (value === null) return "unmeasured";
  if (value >= critical) return "critical";
  if (value >= warning) return "warning";
  return "healthy";
}

export function buildPerformanceBaseline(
  input: PerformanceEvidenceInput,
  previous: PreviousPerformanceBaseline
) {
  const connectorCount =
    input.connectorSucceeded + input.connectorFailed;
  const webhookCount = input.webhookAccepted + input.webhookDenied;

  const metrics: PerformanceMetric[] = [
    {
      key: "database_probe_ms",
      label: "Database probe latency",
      value: round(input.databaseProbeMs),
      unit: "ms",
      sampleCount: 1,
      measured: true
    },
    {
      key: "connector_p95_ms",
      label: "Connector P95 latency",
      value: percentile(input.connectorDurationsMs, 95),
      unit: "ms",
      sampleCount: input.connectorDurationsMs.length,
      measured: input.connectorDurationsMs.length > 0
    },
    {
      key: "connector_error_rate_pct",
      label: "Connector error rate",
      value: rate(input.connectorFailed, connectorCount),
      unit: "percent",
      sampleCount: connectorCount,
      measured: connectorCount > 0
    },
    {
      key: "webhook_denied_rate_pct",
      label: "Webhook denial rate",
      value: rate(input.webhookDenied, webhookCount),
      unit: "percent",
      sampleCount: webhookCount,
      measured: webhookCount > 0
    },
    {
      key: "delivery_failures_24h",
      label: "Event delivery failures",
      value: input.deliveryFailures24h,
      unit: "count",
      sampleCount: 1,
      measured: true
    }
  ];

  const budgetResults: PerformanceBudgetResult[] = metrics.map(metric => ({
    metricKey: metric.key,
    warningThreshold: budgets[metric.key].warning,
    criticalThreshold: budgets[metric.key].critical,
    status: budgetStatus(
      metric.value,
      budgets[metric.key].warning,
      budgets[metric.key].critical
    )
  }));

  const regressions: PerformanceRegression[] = metrics.map(metric => {
    const baselineValue = previous?.[metric.key] ?? null;
    if (metric.value === null || baselineValue === null) {
      return {
        metricKey: metric.key,
        baselineValue,
        currentValue: metric.value,
        allowedIncrease: null,
        regressed: false,
        comparable: false
      };
    }
    const rule = budgets[metric.key];
    const allowedIncrease = Math.max(
      rule.absoluteRegression,
      baselineValue * (rule.relativeRegressionPct / 100)
    );
    return {
      metricKey: metric.key,
      baselineValue,
      currentValue: metric.value,
      allowedIncrease: round(allowedIncrease),
      regressed: metric.value > baselineValue + allowedIncrease,
      comparable: true
    };
  });

  const hasCritical = budgetResults.some(item => item.status === "critical");
  const hasWarning = budgetResults.some(item => item.status === "warning");
  const hasRegression = regressions.some(item => item.regressed);
  const baselineEstablished = Boolean(previous);

  const overallState: "healthy" | "attention" | "critical" = hasCritical
    ? "critical"
    : hasWarning || hasRegression || !baselineEstablished
      ? "attention"
      : "healthy";

  return {
    schema: PERFORMANCE_BASELINE_SCHEMA,
    version: PERFORMANCE_BASELINE_VERSION,
    build: 331,
    windowHours: 24,
    overallState,
    baselineEstablished,
    metrics,
    budgetResults,
    regressions,
    instrumentationGaps: [
      {
        key: "browser_page_load_percentiles",
        state: "not-yet-instrumented",
        plannedBuild: 332,
        note: "Build 331 does not infer browser page-load timing without real-user telemetry."
      },
      {
        key: "route_interaction_percentiles",
        state: "not-yet-instrumented",
        plannedBuild: 332,
        note: "Interaction timing requires real client measurements."
      },
      {
        key: "api_endpoint_percentiles",
        state: "not-yet-instrumented",
        plannedBuild: 333,
        note: "Full route/API percentile instrumentation is not fabricated from a single request."
      },
      {
        key: "server_cpu_memory",
        state: "not-yet-instrumented",
        plannedBuild: 340,
        note: "Host resource metrics require a supported production telemetry source."
      }
    ],
    policy: {
      measuredEvidenceOnly: true,
      missingEvidenceIsHealthy: false,
      syntheticEvidenceCountsAsProduction: false,
      automaticOptimization: false,
      automaticBudgetChanges: false,
      automaticReleaseBlocking: false,
      ql266Resumed: false
    }
  };
}

export const performanceBaselineDescriptor = {
  build: 331,
  name: "Production Performance Baseline, SLOs & Regression Budgets",
  evidenceWindowHours: 24,
  measuredEvidenceOnly: true,
  browserRumInvented: false,
  automaticOptimization: false,
  automaticReleaseBlocking: false,
  ql266Resumed: false
} as const;
