import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import {
  buildPerformanceBaseline,
  type PerformanceMetricKey
} from "./performance-baseline";
import { listWorkspacesForUser, withUserDatabase } from "./database";

type RawRow = Record<string, unknown>;

function dateIso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function snapshotRow(row: RawRow) {
  return {
    snapshotId: String(row.snapshot_id),
    overallState: String(row.overall_state) as
      | "healthy"
      | "attention"
      | "critical",
    comparisonSnapshotId: row.comparison_snapshot_id
      ? String(row.comparison_snapshot_id)
      : null,
    windowHours: Number(row.window_hours ?? 24),
    databaseProbeMs: Number(row.database_probe_ms ?? 0),
    connectorSampleCount: Number(row.connector_sample_count ?? 0),
    connectorP95Ms:
      row.connector_p95_ms === null || row.connector_p95_ms === undefined
        ? null
        : Number(row.connector_p95_ms),
    connectorErrorRatePct:
      row.connector_error_rate_pct === null ||
      row.connector_error_rate_pct === undefined
        ? null
        : Number(row.connector_error_rate_pct),
    webhookSampleCount: Number(row.webhook_sample_count ?? 0),
    webhookDeniedRatePct:
      row.webhook_denied_rate_pct === null ||
      row.webhook_denied_rate_pct === undefined
        ? null
        : Number(row.webhook_denied_rate_pct),
    deliveryFailures24h: Number(row.delivery_failures_24h ?? 0),
    metrics: Array.isArray(row.metric_snapshot) ? row.metric_snapshot : [],
    budgets: Array.isArray(row.budget_snapshot) ? row.budget_snapshot : [],
    regressions: Array.isArray(row.regression_snapshot)
      ? row.regression_snapshot
      : [],
    instrumentationGaps: Array.isArray(row.instrumentation_gaps)
      ? row.instrumentation_gaps
      : [],
    generatedAt: dateIso(row.generated_at)
  };
}

async function requireOwnerAdmin(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  if (
    !workspaces.some(
      item => item.role === "owner" || item.role === "admin"
    )
  ) {
    throw new Error("performance_baseline_owner_admin_required");
  }
}

function previousMetricMap(row: RawRow | undefined) {
  if (!row || !Array.isArray(row.metric_snapshot)) return null;
  const result: Partial<Record<PerformanceMetricKey, number | null>> = {};
  for (const item of row.metric_snapshot) {
    if (!item || typeof item !== "object") continue;
    const metric = item as Record<string, unknown>;
    const key = String(metric.key ?? "") as PerformanceMetricKey;
    if (
      ![
        "database_probe_ms",
        "connector_p95_ms",
        "connector_error_rate_pct",
        "webhook_denied_rate_pct",
        "delivery_failures_24h"
      ].includes(key)
    ) {
      continue;
    }
    result[key] =
      metric.value === null || metric.value === undefined
        ? null
        : Number(metric.value);
  }
  return result;
}

async function collect(userId: string) {
  return withUserDatabase(userId, async client => {
    const probeStarted = performance.now();
    await client.query("select 1 as ok");
    const databaseProbeMs = Math.max(
      0,
      performance.now() - probeStarted
    );

    const [connectorRows, webhookRows, deliveryRows, previousRows] =
      await Promise.all([
        client.query<{
          duration_ms: number | string | null;
          status: string;
        }>(`
          select duration_ms,status
          from app.workspace_connector_audit
          where created_at>=now()-interval '24 hours'
            and status in ('succeeded','failed')
          order by created_at desc
          limit 10000
        `),
        client.query<{ outcome: string; count: string }>(`
          select outcome,count(*)::text as count
          from app.webhook_request_audit
          where occurred_at>=now()-interval '24 hours'
            and outcome in ('accepted','denied')
          group by outcome
        `),
        client.query<{ count: string }>(`
          select count(*)::text as count
          from app.event_bus_delivery_failures
          where failed_at>=now()-interval '24 hours'
        `),
        client.query<RawRow>(`
          select *
          from app.performance_baseline_snapshots
          where owner_user_id=$1
          order by generated_at desc
          limit 1
        `, [userId])
      ]);

    const connectorDurationsMs = connectorRows.rows
      .map(row => Number(row.duration_ms))
      .filter(value => Number.isFinite(value) && value >= 0);
    const connectorSucceeded = connectorRows.rows.filter(
      row => row.status === "succeeded"
    ).length;
    const connectorFailed = connectorRows.rows.filter(
      row => row.status === "failed"
    ).length;
    const webhookCounts = new Map(
      webhookRows.rows.map(row => [row.outcome, Number(row.count)])
    );

    const previousRow = previousRows.rows[0];
    return {
      input: {
        databaseProbeMs,
        connectorDurationsMs,
        connectorSucceeded,
        connectorFailed,
        webhookAccepted: webhookCounts.get("accepted") ?? 0,
        webhookDenied: webhookCounts.get("denied") ?? 0,
        deliveryFailures24h: Number(deliveryRows.rows[0]?.count ?? 0)
      },
      previousRow,
      previousMetrics: previousMetricMap(previousRow)
    };
  });
}

async function liveModel(userId: string) {
  const evidence = await collect(userId);
  return {
    model: buildPerformanceBaseline(
      evidence.input,
      evidence.previousMetrics
    ),
    previousSnapshotId: evidence.previousRow
      ? String(evidence.previousRow.snapshot_id)
      : null
  };
}

export async function listPerformanceBaselineForUser(userId: string) {
  const [live, snapshots] = await Promise.all([
    liveModel(userId),
    withUserDatabase(userId, async client => {
      const result = await client.query<RawRow>(`
        select *
        from app.performance_baseline_snapshots
        where owner_user_id=$1
        order by generated_at desc
        limit 50
      `, [userId]);
      return result.rows.map(snapshotRow);
    })
  ]);

  return {
    canManage: (await listWorkspacesForUser(userId)).some(
      item => item.role === "owner" || item.role === "admin"
    ),
    live: live.model,
    previousSnapshotId: live.previousSnapshotId,
    snapshots,
    latestSnapshot: snapshots[0] ?? null
  };
}

export async function capturePerformanceBaseline(userId: string) {
  await requireOwnerAdmin(userId);
  const live = await liveModel(userId);
  const model = live.model;
  const metric = new Map(
    model.metrics.map(item => [item.key, item])
  );
  const snapshotId = randomUUID();

  await withUserDatabase(userId, async client => {
    await client.query(
      `insert into app.performance_baseline_snapshots (
        snapshot_id,owner_user_id,overall_state,comparison_snapshot_id,
        window_hours,database_probe_ms,connector_sample_count,
        connector_p95_ms,connector_error_rate_pct,webhook_sample_count,
        webhook_denied_rate_pct,delivery_failures_24h,metric_snapshot,
        budget_snapshot,regression_snapshot,instrumentation_gaps,
        generated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17
      )`,
      [
        snapshotId,
        userId,
        model.overallState,
        live.previousSnapshotId,
        model.windowHours,
        metric.get("database_probe_ms")?.value ?? 0,
        metric.get("connector_p95_ms")?.sampleCount ?? 0,
        metric.get("connector_p95_ms")?.value ?? null,
        metric.get("connector_error_rate_pct")?.value ?? null,
        metric.get("webhook_denied_rate_pct")?.sampleCount ?? 0,
        metric.get("webhook_denied_rate_pct")?.value ?? null,
        metric.get("delivery_failures_24h")?.value ?? 0,
        JSON.stringify(model.metrics),
        JSON.stringify(model.budgetResults),
        JSON.stringify(model.regressions),
        JSON.stringify(model.instrumentationGaps),
        userId
      ]
    );
  });

  return {
    snapshotId,
    overallState: model.overallState,
    comparedToSnapshotId: live.previousSnapshotId,
    measuredEvidenceOnly: true,
    automaticOptimizationTriggered: false,
    automaticReleaseBlockingTriggered: false
  };
}
