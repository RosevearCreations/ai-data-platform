import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import {
  getDatabasePoolStats,
  withUserDatabase
} from "./database";
import {
  classifyPerformanceOperation,
  type PerformanceObservatoryKind
} from "./performance-observatory";

type ServiceSummaryRow = {
  sample_kind: "api" | "database";
  operation_key: string;
  samples: string;
  failures: string;
  p50_ms: string | null;
  p75_ms: string | null;
  p95_ms: string | null;
  average_ms: string | null;
  max_pool_waiting: string | null;
  last_observed_at: Date | null;
};

type DependencySummaryRow = {
  workspace_id: string;
  connector_key: string;
  samples: string;
  failures: string;
  p50_ms: string | null;
  p95_ms: string | null;
  average_ms: string | null;
  last_observed_at: Date | null;
};

const OPERATION_KEY = /^(api|database)\.[a-z0-9.-]{1,119}$/;

function boundedDuration(value: number) {
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.min(600000, Math.round(value * 10000) / 10000);
}

function numberOrNull(value: string | null) {
  return value === null ? null : Number(value);
}

function failureRate(samples: number, failures: number) {
  return samples > 0 ? Math.round((failures / samples) * 10000) / 100 : null;
}

export async function recordServicePerformanceEvent(
  userId: string,
  input: {
    sampleKind: "api" | "database";
    operationKey: string;
    durationMs: number;
    outcome: "succeeded" | "failed";
    statusCode?: number | null;
    observedAt?: string;
  }
) {
  const durationMs = boundedDuration(input.durationMs);
  if (
    durationMs === null ||
    !OPERATION_KEY.test(input.operationKey) ||
    (input.statusCode !== undefined &&
      input.statusCode !== null &&
      (!Number.isInteger(input.statusCode) ||
        input.statusCode < 100 ||
        input.statusCode > 599))
  ) {
    throw new Error("service_performance_event_invalid");
  }

  const pools = getDatabasePoolStats();
  const observedAt = new Date(input.observedAt ?? new Date().toISOString());
  if (!Number.isFinite(observedAt.getTime())) {
    throw new Error("service_performance_observed_at_invalid");
  }

  await withUserDatabase(userId, async (client) => {
    await client.query(
      `insert into app.service_performance_events (
        event_id,actor_user_id,sample_kind,operation_key,duration_ms,outcome,
        status_code,app_pool_total,app_pool_idle,app_pool_waiting,observed_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        randomUUID(),
        userId,
        input.sampleKind,
        input.operationKey,
        durationMs,
        input.outcome,
        input.statusCode ?? null,
        pools.app.totalCount,
        pools.app.idleCount,
        pools.app.waitingCount,
        observedAt
      ]
    );
  });
}

export async function observeApiOperation(
  userId: string,
  operationKey: string,
  operation: () => Promise<Response>
) {
  const startedAt = performance.now();

  try {
    const response = await operation();
    const durationMs = performance.now() - startedAt;
    void recordServicePerformanceEvent(userId, {
      sampleKind: "api",
      operationKey,
      durationMs,
      outcome: response.ok ? "succeeded" : "failed",
      statusCode: response.status
    }).catch(() => {
      // Performance evidence must never break the authenticated operation.
    });
    return response;
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    void recordServicePerformanceEvent(userId, {
      sampleKind: "api",
      operationKey,
      durationMs,
      outcome: "failed",
      statusCode: null
    }).catch(() => {
      // Preserve original failure semantics.
    });
    throw error;
  }
}

async function recordAuthorizedDatabaseProbe(userId: string) {
  const startedAt = performance.now();
  let outcome: "succeeded" | "failed" = "succeeded";
  try {
    await withUserDatabase(userId, async (client) => {
      await client.query("select 1 as build_334_probe");
    });
  } catch (error) {
    outcome = "failed";
    throw error;
  } finally {
    const durationMs = performance.now() - startedAt;
    await recordServicePerformanceEvent(userId, {
      sampleKind: "database",
      operationKey: "database.authorized-probe",
      durationMs,
      outcome,
      statusCode: null
    }).catch(() => {
      // A telemetry write failure is an instrumentation gap, not a probe rewrite.
    });
  }
}

export async function listPerformanceObservatoryForUser(userId: string) {
  await recordAuthorizedDatabaseProbe(userId);

  const evidence = await withUserDatabase(userId, async (client) => {
    const [serviceRows, dependencyRows] = await Promise.all([
      client.query<ServiceSummaryRow>(`
        select
          sample_kind,
          operation_key,
          count(*)::text as samples,
          count(*) filter (where outcome='failed')::text as failures,
          percentile_cont(0.50) within group (order by duration_ms)::text as p50_ms,
          percentile_cont(0.75) within group (order by duration_ms)::text as p75_ms,
          percentile_cont(0.95) within group (order by duration_ms)::text as p95_ms,
          avg(duration_ms)::text as average_ms,
          max(app_pool_waiting)::text as max_pool_waiting,
          max(observed_at) as last_observed_at
        from app.service_performance_events
        where actor_user_id=$1
          and recorded_at>=now()-interval '7 days'
        group by sample_kind,operation_key
        order by sample_kind,operation_key
      `, [userId]),
      client.query<DependencySummaryRow>(`
        select
          workspace_id,
          connector_key,
          count(*)::text as samples,
          count(*) filter (where status='failed')::text as failures,
          percentile_cont(0.50) within group (order by duration_ms)
            filter (where duration_ms is not null)::text as p50_ms,
          percentile_cont(0.95) within group (order by duration_ms)
            filter (where duration_ms is not null)::text as p95_ms,
          avg(duration_ms) filter (where duration_ms is not null)::text as average_ms,
          max(created_at) as last_observed_at
        from app.workspace_connector_audit
        where created_at>=now()-interval '7 days'
          and status in ('succeeded','failed')
        group by workspace_id,connector_key
        order by workspace_id,connector_key
      `)
    ]);

    return {
      services: serviceRows.rows,
      dependencies: dependencyRows.rows
    };
  });

  const services = evidence.services.map((row) => {
    const samples = Number(row.samples);
    const failures = Number(row.failures);
    const failureRatePct = failureRate(samples, failures);
    const p95Ms = numberOrNull(row.p95_ms);
    const kind = row.sample_kind as Exclude<PerformanceObservatoryKind, "dependency">;
    return {
      kind,
      operationKey: row.operation_key,
      samples,
      failures,
      failureRatePct,
      p50Ms: numberOrNull(row.p50_ms),
      p75Ms: numberOrNull(row.p75_ms),
      p95Ms,
      averageMs: numberOrNull(row.average_ms),
      maxPoolWaiting: Number(row.max_pool_waiting ?? 0),
      lastObservedAt: row.last_observed_at?.toISOString() ?? null,
      state: classifyPerformanceOperation(kind, p95Ms, failureRatePct)
    };
  });

  const dependencies = evidence.dependencies.map((row) => {
    const samples = Number(row.samples);
    const failures = Number(row.failures);
    const failureRatePct = failureRate(samples, failures);
    const p95Ms = numberOrNull(row.p95_ms);
    return {
      kind: "dependency" as const,
      workspaceId: row.workspace_id,
      connectorKey: row.connector_key,
      samples,
      failures,
      failureRatePct,
      p50Ms: numberOrNull(row.p50_ms),
      p95Ms,
      averageMs: numberOrNull(row.average_ms),
      lastObservedAt: row.last_observed_at?.toISOString() ?? null,
      state: classifyPerformanceOperation("dependency", p95Ms, failureRatePct)
    };
  });

  const pools = getDatabasePoolStats();
  const api = services.filter((item) => item.kind === "api");
  const database = services.filter((item) => item.kind === "database");
  const maxObservedPoolWaiting = services.reduce(
    (max, item) => Math.max(max, item.maxPoolWaiting),
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    analysisWindow: "7d",
    api,
    database,
    dependencies,
    pools: {
      current: pools,
      maxObservedAppWaiting: maxObservedPoolWaiting
    },
    instrumentation: {
      apiOperationCount: api.length,
      databaseOperationCount: database.length,
      dependencyOperationCount: dependencies.length,
      missingApiEvidence: api.length === 0,
      missingDependencyEvidence: dependencies.length === 0
    },
    policy: {
      rawUrlsStored: false,
      queryStringsStored: false,
      sqlTextStored: false,
      requestBodiesStored: false,
      responseBodiesStored: false,
      customerDataStored: false,
      credentialValuesStored: false,
      automaticOptimization: false,
      automaticReleaseBlocking: false,
      dependencyEvidenceSource: "existing-authorized-connector-audit"
    }
  };
}
