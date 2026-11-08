import { randomUUID } from "node:crypto";

import { withUserDatabase } from "./database";
import { classifyRoutePerformance } from "./route-performance-diagnostics";
import {
  normalizeExperienceValue,
  rateExperienceMetric,
  sanitizeExperienceRoute,
  type ExperienceMetricKey,
  type ExperienceSampleKind,
  type ExperienceTelemetryEventInput
} from "./experience-telemetry";

type MetricRow = {
  metric_key: ExperienceMetricKey;
  samples: string;
  p50: string | null;
  p75: string | null;
  p95: string | null;
  average: string | null;
  poor_samples: string;
  last_observed_at: Date | null;
};

const metricKeys = new Set<ExperienceMetricKey>([
  "navigation_load_ms",
  "fcp_ms",
  "lcp_ms",
  "cls_score",
  "inp_ms",
  "hydration_ready_ms",
  "route_transition_ms",
  "long_task_ms"
]);

const sampleKinds = new Set<ExperienceSampleKind>([
  "navigation",
  "paint",
  "layout",
  "interaction",
  "hydration",
  "route-transition",
  "long-task"
]);

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeEvent(value: ExperienceTelemetryEventInput) {
  if (
    !value ||
    typeof value !== "object" ||
    !validUuid(String(value.eventId ?? "")) ||
    !metricKeys.has(value.metricKey) ||
    !sampleKinds.has(value.sampleKind)
  ) {
    throw new Error("experience_telemetry_event_invalid");
  }

  const metricValue = normalizeExperienceValue(
    value.metricKey,
    Number(value.metricValue)
  );
  if (metricValue === null) {
    throw new Error("experience_telemetry_value_invalid");
  }

  const observedAt = new Date(String(value.observedAt ?? ""));
  if (!Number.isFinite(observedAt.getTime())) {
    throw new Error("experience_telemetry_observed_at_invalid");
  }

  const expectedUnit = value.metricKey === "cls_score" ? "score" : "ms";
  if (value.unit !== expectedUnit) {
    throw new Error("experience_telemetry_unit_invalid");
  }

  return {
    eventId: value.eventId,
    routeFamily: sanitizeExperienceRoute(String(value.routeFamily ?? "/")),
    metricKey: value.metricKey,
    metricValue,
    unit: expectedUnit,
    rating: rateExperienceMetric(value.metricKey, metricValue),
    sampleKind: value.sampleKind,
    navigationType: [
      "navigate",
      "reload",
      "back_forward",
      "prerender",
      "unknown"
    ].includes(String(value.navigationType ?? ""))
      ? String(value.navigationType)
      : null,
    viewportClass: ["compact", "standard", "wide", "unknown"].includes(
      String(value.viewportClass ?? "")
    )
      ? String(value.viewportClass)
      : "unknown",
    visibilityState: ["visible", "hidden", "unknown"].includes(
      String(value.visibilityState ?? "")
    )
      ? String(value.visibilityState)
      : "unknown",
    observedAt
  };
}

export async function recordExperienceTelemetry(
  userId: string,
  events: ExperienceTelemetryEventInput[]
) {
  if (!Array.isArray(events) || events.length < 1 || events.length > 20) {
    throw new Error("experience_telemetry_batch_invalid");
  }

  const normalized = events.map(normalizeEvent);

  return withUserDatabase(userId, async (client) => {
    let inserted = 0;
    for (const event of normalized) {
      const result = await client.query(
        `insert into app.experience_telemetry_events (
          event_id, actor_user_id, route_family, metric_key, metric_value,
          unit, rating, sample_kind, navigation_type, viewport_class,
          visibility_state, observed_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )
        on conflict (event_id) do nothing`,
        [
          event.eventId,
          userId,
          event.routeFamily,
          event.metricKey,
          event.metricValue,
          event.unit,
          event.rating,
          event.sampleKind,
          event.navigationType,
          event.viewportClass,
          event.visibilityState,
          event.observedAt
        ]
      );
      inserted += result.rowCount ?? 0;
    }

    return {
      accepted: normalized.length,
      inserted,
      duplicateIgnored: normalized.length - inserted
    };
  });
}

export async function listExperienceTelemetryForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    const [metrics24h, metrics7d, routeRows, recentRows] = await Promise.all([
      client.query<MetricRow>(`
        select
          metric_key,
          count(*)::text as samples,
          percentile_cont(0.50) within group (order by metric_value)::text as p50,
          percentile_cont(0.75) within group (order by metric_value)::text as p75,
          percentile_cont(0.95) within group (order by metric_value)::text as p95,
          avg(metric_value)::text as average,
          count(*) filter (where rating='poor')::text as poor_samples,
          max(observed_at) as last_observed_at
        from app.experience_telemetry_events
        where actor_user_id=$1
          and recorded_at>=now()-interval '24 hours'
        group by metric_key
        order by metric_key
      `, [userId]),
      client.query<MetricRow>(`
        select
          metric_key,
          count(*)::text as samples,
          percentile_cont(0.50) within group (order by metric_value)::text as p50,
          percentile_cont(0.75) within group (order by metric_value)::text as p75,
          percentile_cont(0.95) within group (order by metric_value)::text as p95,
          avg(metric_value)::text as average,
          count(*) filter (where rating='poor')::text as poor_samples,
          max(observed_at) as last_observed_at
        from app.experience_telemetry_events
        where actor_user_id=$1
          and recorded_at>=now()-interval '7 days'
        group by metric_key
        order by metric_key
      `, [userId]),
      client.query<{
        route_family: string;
        samples: string;
        p75_ms: string | null;
        poor_samples: string;
      }>(`
        select
          route_family,
          count(*)::text as samples,
          percentile_cont(0.75) within group (order by metric_value)
            filter (where metric_key in ('navigation_load_ms','route_transition_ms','inp_ms'))::text as p75_ms,
          count(*) filter (where rating='poor')::text as poor_samples
        from app.experience_telemetry_events
        where actor_user_id=$1
          and recorded_at>=now()-interval '7 days'
        group by route_family
        order by count(*) filter (where rating='poor') desc, count(*) desc
        limit 20
      `, [userId]),
      client.query<{
        event_id: string;
        route_family: string;
        metric_key: ExperienceMetricKey;
        metric_value: string;
        unit: "ms" | "score";
        rating: string;
        observed_at: Date;
      }>(`
        select event_id, route_family, metric_key, metric_value, unit, rating, observed_at
        from app.experience_telemetry_events
        where actor_user_id=$1
        order by observed_at desc
        limit 50
      `, [userId])
    ]);

    const convertMetric = (row: MetricRow) => ({
      metricKey: row.metric_key,
      samples: Number(row.samples),
      p50: row.p50 === null ? null : Number(row.p50),
      p75: row.p75 === null ? null : Number(row.p75),
      p95: row.p95 === null ? null : Number(row.p95),
      average: row.average === null ? null : Number(row.average),
      poorSamples: Number(row.poor_samples),
      lastObservedAt: row.last_observed_at?.toISOString() ?? null
    });

    return {
      generatedAt: new Date().toISOString(),
      windows: {
        last24h: metrics24h.rows.map(convertMetric),
        last7d: metrics7d.rows.map(convertMetric)
      },
      routes: routeRows.rows.map((row) => ({
        routeFamily: row.route_family,
        samples: Number(row.samples),
        p75Ms: row.p75_ms === null ? null : Number(row.p75_ms),
        poorSamples: Number(row.poor_samples)
      })),
      recent: recentRows.rows.map((row) => ({
        eventId: row.event_id,
        routeFamily: row.route_family,
        metricKey: row.metric_key,
        metricValue: Number(row.metric_value),
        unit: row.unit,
        rating: row.rating,
        observedAt: row.observed_at.toISOString()
      })),
      privacy: {
        rawUrlsStored: false,
        queryStringsStored: false,
        domTextStored: false,
        formValuesStored: false,
        customerDataStored: false,
        exactViewportStored: false,
        routeIdentifiersCollapsed: true
      },
      ingestion: {
        maxBatchSize: 20,
        eventIdempotency: true,
        appendOnly: true
      }
    };
  });
}


export async function listRoutePerformanceDiagnosticsForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      route_family: string;
      samples: string;
      core_vital_samples: string;
      poor_samples: string;
      lcp_p75: string | null;
      cls_p75: string | null;
      inp_p75: string | null;
      route_transition_p75: string | null;
      hydration_ready_p75: string | null;
      long_task_p95: string | null;
      last_observed_at: Date | null;
    }>(`
      select
        route_family,
        count(*)::text as samples,
        count(*) filter (where metric_key in ('lcp_ms','cls_score','inp_ms'))::text
          as core_vital_samples,
        count(*) filter (where rating='poor')::text as poor_samples,
        (percentile_cont(0.75) within group (order by metric_value)
          filter (where metric_key='lcp_ms'))::text as lcp_p75,
        (percentile_cont(0.75) within group (order by metric_value)
          filter (where metric_key='cls_score'))::text as cls_p75,
        (percentile_cont(0.75) within group (order by metric_value)
          filter (where metric_key='inp_ms'))::text as inp_p75,
        (percentile_cont(0.75) within group (order by metric_value)
          filter (where metric_key='route_transition_ms'))::text as route_transition_p75,
        (percentile_cont(0.75) within group (order by metric_value)
          filter (where metric_key='hydration_ready_ms'))::text as hydration_ready_p75,
        (percentile_cont(0.95) within group (order by metric_value)
          filter (where metric_key='long_task_ms'))::text as long_task_p95,
        max(observed_at) as last_observed_at
      from app.experience_telemetry_events
      where actor_user_id=$1
        and recorded_at>=now()-interval '7 days'
      group by route_family
      order by
        count(*) filter (where rating='poor') desc,
        count(*) desc,
        route_family
      limit 50
    `, [userId]);

    const value = (input: string | null) =>
      input === null ? null : Number(input);

    const routes = result.rows.map((row) => {
      const metrics = {
        lcpP75: value(row.lcp_p75),
        clsP75: value(row.cls_p75),
        inpP75: value(row.inp_p75),
        routeTransitionP75: value(row.route_transition_p75),
        hydrationReadyP75: value(row.hydration_ready_p75),
        longTaskP95: value(row.long_task_p95)
      };

      return {
        routeFamily: row.route_family,
        samples: Number(row.samples),
        coreVitalSamples: Number(row.core_vital_samples),
        poorSamples: Number(row.poor_samples),
        ...metrics,
        status: classifyRoutePerformance(metrics),
        lastObservedAt: row.last_observed_at?.toISOString() ?? null
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      analysisWindow: "7d",
      routes,
      thresholds: {
        lcpP75: { goodAtOrBelow: 2500, poorAbove: 4000, unit: "ms" },
        clsP75: { goodAtOrBelow: 0.1, poorAbove: 0.25, unit: "score" },
        inpP75: { goodAtOrBelow: 200, poorAbove: 500, unit: "ms" },
        routeTransitionP75: { goodAtOrBelow: 500, poorAbove: 1500, unit: "ms" },
        hydrationReadyP75: { goodAtOrBelow: 1000, poorAbove: 2500, unit: "ms" },
        longTaskP95: { goodAtOrBelow: 100, poorAbove: 250, unit: "ms" }
      },
      policy: {
        coreWebVitals: ["lcp_ms", "cls_score", "inp_ms"],
        hydrationIsCoreWebVital: false,
        rawUrlsStored: false,
        automaticOptimization: false,
        automaticReleaseBlocking: false,
        syntheticEvidenceTreatedAsLive: false
      }
    };
  });
}

export function newExperienceEventId() {
  return randomUUID();
}
