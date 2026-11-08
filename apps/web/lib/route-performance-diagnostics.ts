export const ROUTE_PERFORMANCE_BUILD = 333 as const;

export type RoutePerformanceStatus =
  | "good"
  | "needs-attention"
  | "poor"
  | "unmeasured";

export type RoutePerformanceDiagnosticInput = {
  lcpP75: number | null;
  clsP75: number | null;
  inpP75: number | null;
  routeTransitionP75: number | null;
  hydrationReadyP75: number | null;
  longTaskP95: number | null;
};

function signal(
  value: number | null,
  good: number,
  poor: number
): "good" | "needs-attention" | "poor" | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  if (value <= good) return "good";
  if (value > poor) return "poor";
  return "needs-attention";
}

export function classifyRoutePerformance(
  input: RoutePerformanceDiagnosticInput
): RoutePerformanceStatus {
  const signals = [
    signal(input.lcpP75, 2500, 4000),
    signal(input.clsP75, 0.1, 0.25),
    signal(input.inpP75, 200, 500),
    signal(input.routeTransitionP75, 500, 1500),
    signal(input.hydrationReadyP75, 1000, 2500),
    signal(input.longTaskP95, 100, 250)
  ].filter((value): value is Exclude<typeof value, null> => value !== null);

  if (!signals.length) return "unmeasured";
  if (signals.includes("poor")) return "poor";
  if (signals.includes("needs-attention")) return "needs-attention";
  return "good";
}

export const routePerformancePolicy = {
  build: ROUTE_PERFORMANCE_BUILD,
  analysisWindow: "7d",
  coreWebVitals: ["lcp_ms", "cls_score", "inp_ms"],
  hydrationMetric: "hydration_ready_ms",
  hydrationIsCoreWebVital: false,
  rawUrlsStored: false,
  queryStringsStored: false,
  domTextStored: false,
  automaticOptimization: false,
  automaticReleaseBlocking: false,
  syntheticEvidenceTreatedAsLive: false
} as const;
