export const PERFORMANCE_OBSERVATORY_BUILD = 334 as const;

export type PerformanceObservatoryKind = "api" | "database" | "dependency";
export type PerformanceObservatoryState =
  | "good"
  | "needs-attention"
  | "poor"
  | "unmeasured";

export function classifyPerformanceOperation(
  kind: PerformanceObservatoryKind,
  p95Ms: number | null,
  failureRatePct: number | null
): PerformanceObservatoryState {
  if (p95Ms === null && failureRatePct === null) return "unmeasured";

  const latency = {
    api: { attention: 1000, poor: 3000 },
    database: { attention: 100, poor: 500 },
    dependency: { attention: 1500, poor: 5000 }
  }[kind];

  if (
    (failureRatePct !== null && failureRatePct > 10) ||
    (p95Ms !== null && p95Ms > latency.poor)
  ) {
    return "poor";
  }

  if (
    (failureRatePct !== null && failureRatePct > 2) ||
    (p95Ms !== null && p95Ms > latency.attention)
  ) {
    return "needs-attention";
  }

  return "good";
}

export const performanceObservatoryPolicy = {
  build: PERFORMANCE_OBSERVATORY_BUILD,
  analysisWindow: "7d",
  rawUrlsStored: false,
  queryStringsStored: false,
  sqlTextStored: false,
  requestBodiesStored: false,
  responseBodiesStored: false,
  customerDataStored: false,
  credentialValuesStored: false,
  poolConnectionStringsStored: false,
  automaticOptimization: false,
  automaticReleaseBlocking: false,
  dependencyEvidenceSource: "existing-authorized-connector-audit"
} as const;
