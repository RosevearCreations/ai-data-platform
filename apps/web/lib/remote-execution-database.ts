import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  boundedRemoteLeaseSeconds,
  createRemoteExecutionJobSpec,
  isRemoteProviderExecutionEnabled,
  normalizeRemoteSourceOrigin,
  remoteExecutionResultFingerprint,
  selectRemoteSourcePolicy,
  validateRemoteExecutionResultPayload,
  type RemoteExecutionBudget,
  type RemoteExecutionJobStatus,
  type RemoteExecutionPolicyPin,
  type RemoteExecutionPolicySnapshot
} from "./remote-execution";

interface RemoteExecutionJobDbRow extends QueryResultRow {
  workspace_id: string;
  job_id: string;
  saved_scraper_id: string;
  provider_key: string;
  config_ref: string | null;
  source_url: string;
  source_origin: string;
  source_policy_id: string;
  source_policy_revision: number;
  source_policy_fingerprint: string;
  source_policy_snapshot: Record<string, unknown>;
  max_pages: number;
  max_records: number;
  max_runtime_seconds: number;
  minimum_delay_ms: number;
  status: RemoteExecutionJobStatus;
  lease_owner: string | null;
  lease_expires_at: Date | null;
  heartbeat_at: Date | null;
  cancel_requested_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  failure_code: string | null;
  attempt_count: number;
  result_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceRemoteExecutionJob {
  workspaceId: string;
  jobId: string;
  savedScraperId: string;
  providerKey: string;
  configRef: string | null;
  sourceUrl: string;
  sourceOrigin: string;
  sourcePolicyId: string;
  sourcePolicyRevision: number;
  sourcePolicyFingerprint: string;
  sourcePolicySnapshot: RemoteExecutionPolicySnapshot;
  budget: RemoteExecutionBudget;
  status: RemoteExecutionJobStatus;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  heartbeatAt: Date | null;
  cancelRequestedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failureCode: string | null;
  attemptCount: number;
  resultCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const remoteJobColumns =
  "workspace_id, job_id, saved_scraper_id, provider_key, config_ref, source_url, source_origin, source_policy_id, source_policy_revision, source_policy_fingerprint, source_policy_snapshot, max_pages, max_records, max_runtime_seconds, minimum_delay_ms, status, lease_owner, lease_expires_at, heartbeat_at, cancel_requested_at, started_at, completed_at, failure_code, attempt_count, result_count, created_by, created_at, updated_at";

function mapRemoteJob(row: RemoteExecutionJobDbRow): WorkspaceRemoteExecutionJob {
  return {
    workspaceId: row.workspace_id,
    jobId: row.job_id,
    savedScraperId: row.saved_scraper_id,
    providerKey: row.provider_key,
    configRef: row.config_ref,
    sourceUrl: row.source_url,
    sourceOrigin: row.source_origin,
    sourcePolicyId: row.source_policy_id,
    sourcePolicyRevision: Number(row.source_policy_revision),
    sourcePolicyFingerprint: row.source_policy_fingerprint,
    sourcePolicySnapshot:
      row.source_policy_snapshot as unknown as RemoteExecutionPolicySnapshot,
    budget: {
      maxPages: Number(row.max_pages),
      maxRecords: Number(row.max_records),
      maxRuntimeSeconds: Number(row.max_runtime_seconds),
      minimumDelayMs: Number(row.minimum_delay_ms)
    },
    status: row.status,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at,
    heartbeatAt: row.heartbeat_at,
    cancelRequestedAt: row.cancel_requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failureCode: row.failure_code,
    attemptCount: Number(row.attempt_count),
    resultCount: Number(row.result_count),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function requireWorkspaceAccess(
  client: PoolClient,
  workspaceId: string
) {
  const result = await client.query(
    "select 1 from app.workspaces where id = $1",
    [workspaceId]
  );
  if (!result.rowCount) {
    throw new Error("workspace_access_denied");
  }
}

export async function listWorkspaceRemoteExecutionJobs(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);
    const result = await client.query<RemoteExecutionJobDbRow>(
      "select " + remoteJobColumns +
        " from app.remote_execution_jobs where workspace_id = $1 order by created_at desc limit 250",
      [workspaceId]
    );
    return result.rows.map(mapRemoteJob);
  });
}

export async function createWorkspaceRemoteExecutionJob(
  userId: string,
  input: {
    workspaceId: string;
    jobId: string;
    savedScraperId: string;
    providerKey: string;
    configRef?: string | null;
    sourceUrl: string;
    sourcePolicyPin: Omit<RemoteExecutionPolicyPin, "workspaceId" | "origin">;
    requestedBudget?: Partial<RemoteExecutionBudget>;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);
    const policyState = await client.query<{ payload: Record<string, unknown> }>(
      "select payload from app.workspace_intelligence_modules where workspace_id = $1 and module_key = 'source-policy' limit 1",
      [input.workspaceId]
    );
    const payload = policyState.rows[0]?.payload;
    if (!payload) {
      throw new Error("remote_source_policy_registry_missing");
    }

    const origin = normalizeRemoteSourceOrigin(input.sourceUrl);
    const policy = selectRemoteSourcePolicy(payload, {
      workspaceId: input.workspaceId,
      origin,
      policyId: input.sourcePolicyPin.policyId,
      policyRevision: input.sourcePolicyPin.policyRevision,
      policyFingerprint: input.sourcePolicyPin.policyFingerprint
    });
    const spec = createRemoteExecutionJobSpec({
      jobId: input.jobId,
      workspaceId: input.workspaceId,
      savedScraperId: input.savedScraperId,
      providerKey: input.providerKey,
      configRef: input.configRef,
      sourceUrl: input.sourceUrl,
      policy,
      requestedBudget: input.requestedBudget
    });

    const result = await client.query<RemoteExecutionJobDbRow>(
      "insert into app.remote_execution_jobs (workspace_id, job_id, saved_scraper_id, provider_key, config_ref, source_url, source_origin, source_policy_id, source_policy_revision, source_policy_fingerprint, source_policy_snapshot, max_pages, max_records, max_runtime_seconds, minimum_delay_ms, status, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,'prepared',$16) returning " +
        remoteJobColumns,
      [
        input.workspaceId,
        input.jobId,
        spec.savedScraperId,
        spec.providerKey,
        spec.configRef,
        spec.sourceUrl,
        spec.sourceOrigin,
        policy.policyId,
        policy.revision,
        policy.fingerprint,
        JSON.stringify(policy),
        spec.budget.maxPages,
        spec.budget.maxRecords,
        spec.budget.maxRuntimeSeconds,
        spec.budget.minimumDelayMs,
        userId
      ]
    );
    return mapRemoteJob(result.rows[0]);
  });
}

export async function enqueueWorkspaceRemoteExecutionJob(
  userId: string,
  workspaceId: string,
  jobId: string
) {
  if (!isRemoteProviderExecutionEnabled()) {
    throw new Error("remote_provider_execution_disabled");
  }
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);
    const result = await client.query<RemoteExecutionJobDbRow>(
      "update app.remote_execution_jobs set status = 'queued', updated_at = now() where workspace_id = $1 and job_id = $2 and status = 'prepared' and cancel_requested_at is null returning " +
        remoteJobColumns,
      [workspaceId, jobId]
    );
    if (!result.rows[0]) {
      throw new Error("remote_job_not_prepared");
    }
    return mapRemoteJob(result.rows[0]);
  });
}

export async function leaseWorkspaceRemoteExecutionJob(
  userId: string,
  input: {
    workspaceId: string;
    jobId: string;
    workerId: string;
    leaseSeconds?: number;
  }
) {
  if (!isRemoteProviderExecutionEnabled()) {
    throw new Error("remote_provider_execution_disabled");
  }
  const leaseExpiresAt = new Date(
    Date.now() + boundedRemoteLeaseSeconds(input.leaseSeconds) * 1000
  );
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);
    const result = await client.query<RemoteExecutionJobDbRow>(
      "update app.remote_execution_jobs set status = 'leased', lease_owner = $3, lease_expires_at = $4, heartbeat_at = now(), started_at = coalesce(started_at, now()), attempt_count = attempt_count + 1, updated_at = now() where workspace_id = $1 and job_id = $2 and status = 'queued' and cancel_requested_at is null returning " +
        remoteJobColumns,
      [input.workspaceId, input.jobId, input.workerId.trim(), leaseExpiresAt]
    );
    if (!result.rows[0]) {
      throw new Error("remote_job_not_leaseable");
    }
    return mapRemoteJob(result.rows[0]);
  });
}

export async function heartbeatWorkspaceRemoteExecutionJob(
  userId: string,
  input: { workspaceId: string; jobId: string; workerId: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);
    const result = await client.query<RemoteExecutionJobDbRow>(
      "update app.remote_execution_jobs set status = 'running', heartbeat_at = now(), updated_at = now() where workspace_id = $1 and job_id = $2 and lease_owner = $3 and status in ('leased','running') and lease_expires_at > now() returning " +
        remoteJobColumns,
      [input.workspaceId, input.jobId, input.workerId.trim()]
    );
    if (!result.rows[0]) {
      throw new Error("remote_job_heartbeat_rejected");
    }
    return mapRemoteJob(result.rows[0]);
  });
}

export async function requestWorkspaceRemoteExecutionCancellation(
  userId: string,
  workspaceId: string,
  jobId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);
    const result = await client.query<RemoteExecutionJobDbRow>(
      "update app.remote_execution_jobs set cancel_requested_at = coalesce(cancel_requested_at, now()), status = case when status in ('prepared','queued') then 'cancelled' else status end, completed_at = case when status in ('prepared','queued') then coalesce(completed_at, now()) else completed_at end, updated_at = now() where workspace_id = $1 and job_id = $2 and status not in ('succeeded','failed','cancelled','timed-out') returning " +
        remoteJobColumns,
      [workspaceId, jobId]
    );
    if (result.rows[0]) {
      return mapRemoteJob(result.rows[0]);
    }
    const current = await client.query<RemoteExecutionJobDbRow>(
      "select " + remoteJobColumns +
        " from app.remote_execution_jobs where workspace_id = $1 and job_id = $2",
      [workspaceId, jobId]
    );
    if (!current.rows[0]) {
      throw new Error("remote_job_not_found");
    }
    return mapRemoteJob(current.rows[0]);
  });
}

export async function expireWorkspaceRemoteExecutionJob(
  userId: string,
  workspaceId: string,
  jobId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);
    const result = await client.query<RemoteExecutionJobDbRow>(
      "update app.remote_execution_jobs set status = 'timed-out', failure_code = 'lease_or_runtime_timeout', completed_at = coalesce(completed_at, now()), updated_at = now() where workspace_id = $1 and job_id = $2 and status in ('leased','running') and ((lease_expires_at is not null and lease_expires_at <= now()) or (started_at is not null and started_at + max_runtime_seconds * interval '1 second' <= now())) returning " +
        remoteJobColumns,
      [workspaceId, jobId]
    );
    if (result.rows[0]) {
      return mapRemoteJob(result.rows[0]);
    }
    const current = await client.query<RemoteExecutionJobDbRow>(
      "select " + remoteJobColumns +
        " from app.remote_execution_jobs where workspace_id = $1 and job_id = $2",
      [workspaceId, jobId]
    );
    if (!current.rows[0]) {
      throw new Error("remote_job_not_found");
    }
    return mapRemoteJob(current.rows[0]);
  });
}

export async function completeWorkspaceRemoteExecutionJob(
  userId: string,
  input: {
    workspaceId: string;
    jobId: string;
    workerId: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);
    const currentResult = await client.query<RemoteExecutionJobDbRow>(
      "select " + remoteJobColumns +
        " from app.remote_execution_jobs where workspace_id = $1 and job_id = $2 for update",
      [input.workspaceId, input.jobId]
    );
    const current = currentResult.rows[0];
    if (!current) {
      throw new Error("remote_job_not_found");
    }

    const fingerprint = remoteExecutionResultFingerprint(input.payload);
    const existing = await client.query<{ result_fingerprint: string }>(
      "select result_fingerprint from app.remote_execution_results where workspace_id = $1 and job_id = $2 and idempotency_key = $3 limit 1",
      [input.workspaceId, input.jobId, input.idempotencyKey]
    );
    if (existing.rows[0]) {
      if (existing.rows[0].result_fingerprint !== fingerprint) {
        throw new Error("remote_result_idempotency_conflict");
      }
      return {
        job: mapRemoteJob(current),
        duplicate: true,
        resultFingerprint: fingerprint
      };
    }

    if (current.status !== "leased" && current.status !== "running") {
      throw new Error("remote_job_not_completable");
    }
    if (current.lease_owner !== input.workerId.trim()) {
      throw new Error("remote_job_worker_mismatch");
    }
    if (current.cancel_requested_at) {
      throw new Error("remote_job_cancel_requested");
    }
    if (current.lease_expires_at && current.lease_expires_at <= new Date()) {
      throw new Error("remote_job_lease_expired");
    }

    const budget: RemoteExecutionBudget = {
      maxPages: Number(current.max_pages),
      maxRecords: Number(current.max_records),
      maxRuntimeSeconds: Number(current.max_runtime_seconds),
      minimumDelayMs: Number(current.minimum_delay_ms)
    };
    validateRemoteExecutionResultPayload(input.payload, budget);

    await client.query(
      "insert into app.remote_execution_results (workspace_id, job_id, idempotency_key, result_fingerprint, payload) values ($1,$2,$3,$4,$5::jsonb)",
      [
        input.workspaceId,
        input.jobId,
        input.idempotencyKey,
        fingerprint,
        JSON.stringify(input.payload)
      ]
    );

    const updated = await client.query<RemoteExecutionJobDbRow>(
      "update app.remote_execution_jobs set status = 'succeeded', completed_at = now(), result_count = result_count + 1, updated_at = now() where workspace_id = $1 and job_id = $2 returning " +
        remoteJobColumns,
      [input.workspaceId, input.jobId]
    );
    return {
      job: mapRemoteJob(updated.rows[0]),
      duplicate: false,
      resultFingerprint: fingerprint
    };
  });
}
