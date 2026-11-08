export const EXPERIENCE_TELEMETRY_SCHEMA =
  "rosevear.ai-data-platform.experience-telemetry.v1" as const;

export const EXPERIENCE_TELEMETRY_BUILD = 332 as const;

export type ExperienceMetricKey =
  | "navigation_load_ms"
  | "fcp_ms"
  | "lcp_ms"
  | "cls_score"
  | "inp_ms"
  | "route_transition_ms"
  | "long_task_ms";

export type ExperienceRating =
  | "good"
  | "needs-improvement"
  | "poor"
  | "unknown";

export type ExperienceSampleKind =
  | "navigation"
  | "paint"
  | "layout"
  | "interaction"
  | "route-transition"
  | "long-task";

export type ExperienceTelemetryEventInput = {
  eventId: string;
  routeFamily: string;
  metricKey: ExperienceMetricKey;
  metricValue: number;
  unit: "ms" | "score";
  rating: ExperienceRating;
  sampleKind: ExperienceSampleKind;
  navigationType:
    | "navigate"
    | "reload"
    | "back_forward"
    | "prerender"
    | "unknown"
    | null;
  viewportClass: "compact" | "standard" | "wide" | "unknown";
  visibilityState: "visible" | "hidden" | "unknown";
  observedAt: string;
};

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LONG_HEX = /^[0-9a-f]{16,}$/i;
const NUMERIC = /^\d{3,}$/;

export function sanitizeExperienceRoute(value: string) {
  let pathname = "/";
  try {
    pathname = new URL(value, "https://local.invalid").pathname;
  } catch {
    pathname = value.split(/[?#]/, 1)[0] || "/";
  }

  const parts = pathname
    .split("/")
    .filter(Boolean)
    .slice(0, 12)
    .map((part) => {
      const decoded = decodeURIComponent(part).slice(0, 80);
      if (
        UUID_SEGMENT.test(decoded) ||
        LONG_HEX.test(decoded) ||
        NUMERIC.test(decoded)
      ) {
        return ":id";
      }
      return decoded.replace(/[^a-zA-Z0-9._~:@+-]/g, "-");
    });

  return ("/" + parts.join("/")).slice(0, 180) || "/";
}

export function rateExperienceMetric(
  key: ExperienceMetricKey,
  value: number
): ExperienceRating {
  if (!Number.isFinite(value) || value < 0) return "unknown";

  const thresholds: Record<
    ExperienceMetricKey,
    { good: number; poor: number }
  > = {
    navigation_load_ms: { good: 2500, poor: 5000 },
    fcp_ms: { good: 1800, poor: 3000 },
    lcp_ms: { good: 2500, poor: 4000 },
    cls_score: { good: 0.1, poor: 0.25 },
    inp_ms: { good: 200, poor: 500 },
    route_transition_ms: { good: 500, poor: 1500 },
    long_task_ms: { good: 100, poor: 250 }
  };

  const threshold = thresholds[key];
  if (value <= threshold.good) return "good";
  if (value > threshold.poor) return "poor";
  return "needs-improvement";
}

export function normalizeExperienceValue(
  key: ExperienceMetricKey,
  value: number
) {
  if (!Number.isFinite(value) || value < 0) return null;
  const max = key === "cls_score" ? 100 : 600000;
  return Math.min(max, Math.round(value * 10000) / 10000);
}

export const experienceTelemetryPolicy = {
  build: EXPERIENCE_TELEMETRY_BUILD,
  rawUrlsStored: false,
  queryStringsStored: false,
  domTextStored: false,
  formValuesStored: false,
  customerDataStored: false,
  exactViewportStored: false,
  routeIdentifiersCollapsed: true,
  appendOnly: true,
  automaticOptimization: false,
  automaticReleaseBlocking: false
} as const;
