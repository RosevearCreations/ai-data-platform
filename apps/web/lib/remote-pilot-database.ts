import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";
import {
  normalizeRemoteSourceOrigin,
  selectRemoteSourcePolicy,
  type RemoteExecutionPolicyPin
} from "./remote-execution";
import type { BrowserlessRegion } from "./browserless-provider";

export interface RemotePilotControl {
  workspaceId: string;
  providerKey: "browserless";
  region: BrowserlessRegion;
  enabled: boolean;
  killSwitch: boolean;
  egressMode: "direct";
  maxConcurrency: 1;
  maxUnitsPerRun: number;
  activeJobId: string | null;
  activeSlotExpiresAt: Date | null;
  updatedAt: Date;
}

export interface RemotePilotAllowlistEntry {
  workspaceId: string;
  sourceOrigin: string;
  policyId: string;
  policyRevision: number;
  policyFingerprint: string;
  enabled: boolean;
  maxPages: 1;
  maxRecords: number;
  maxRuntimeSeconds: number;
  maxUnitsPerRun: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RemotePilotEvent {
  workspaceId: string;
  eventId: string;
  jobId: string | null;
  eventType: string;
  providerKey: "browserless";
  region: BrowserlessRegion;
  egressMode: "direct";
  unitsEstimated: number;
  durationMs: number | null;
  responseCode: number | null;
  details: Record<string, unknown>;
  createdAt: Date;
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

async function requireWorkspaceAdmin(
  client: PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    "select role from app.workspace_members where workspace_id = $1 and user_id = nullif(current_setting('app.user_id', true), '') limit 1",
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("workspace_admin_required");
  }
}

function controlFromRow(row: QueryResultRow): RemotePilotControl {
  return {
    workspaceId: String(row.workspace_id),
    providerKey: "browserless",
    region: row.region as BrowserlessRegion,
    enabled: Boolean(row.enabled),
    killSwitch: Boolean(row.kill_switch),
    egressMode: "direct",
    maxConcurrency: 1,
    maxUnitsPerRun: Number(row.max_units_per_run),
    activeJobId: row.active_job_id ? String(row.active_job_id) : null,
    activeSlotExpiresAt: row.active_slot_expires_at
      ? new Date(row.active_slot_expires_at)
      : null,
    updatedAt: new Date(row.updated_at)
  };
}

function allowlistFromRow(row: QueryResultRow): RemotePilotAllowlistEntry {
  return {
    workspaceId: String(row.workspace_id),
    sourceOrigin: String(row.source_origin),
    policyId: String(row.policy_id),
    policyRevision: Number(row.policy_revision),
    policyFingerprint: String(row.policy_fingerprint),
    enabled: Boolean(row.enabled),
    maxPages: 1,
    maxRecords: Number(row.max_records),
    maxRuntimeSeconds: Number(row.max_runtime_seconds),
    maxUnitsPerRun: Number(row.max_units_per_run),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function eventFromRow(row: QueryResultRow): RemotePilotEvent {
  return {
    workspaceId: String(row.workspace_id),
    eventId: String(row.event_id),
    jobId: row.job_id ? String(row.job_id) : null,
    eventType: String(row.event_type),
    providerKey: "browserless",
    region: row.region as BrowserlessRegion,
    egressMode: "direct",
    unitsEstimated: Number(row.units_estimated),
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    responseCode:
      row.response_code === null ? null : Number(row.response_code),
    details:
      row.details && typeof row.details === "object"
        ? (row.details as Record<string, unknown>)
        : {},
    createdAt: new Date(row.created_at)
  };
}

async function insertEvent(
  client: PoolClient,
  input: {
    workspaceId: string;
    jobId?: string | null;
    eventType: string;
    region: BrowserlessRegion;
    unitsEstimated?: number;
    durationMs?: number | null;
    responseCode?: number | null;
    details?: Record<string, unknown>;
  }
) {
  await client.query(
    `
      insert into app.remote_execution_provider_events (
        workspace_id,
        event_id,
        job_id,
        event_type,
        provider_key,
        region,
        egress_mode,
        units_estimated,
        duration_ms,
        response_code,
        details
      )
      values ($1,$2,$3,$4,'browserless',$5,'direct',$6,$7,$8,$9::jsonb)
    `,
    [
      input.workspaceId,
      randomUUID(),
      input.jobId ?? null,
      input.eventType,
      input.region,
      input.unitsEstimated ?? 0,
      input.durationMs ?? null,
      input.responseCode ?? null,
      JSON.stringify(input.details ?? {})
    ]
  );
}

async function currentPolicyPayload(
  client: PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ payload: Record<string, unknown> }>(
    "select payload from app.workspace_intelligence_modules where workspace_id = $1 and module_key = 'source-policy' limit 1",
    [workspaceId]
  );
  if (!result.rows[0]?.payload) {
    throw new Error("remote_source_policy_registry_missing");
  }
  return result.rows[0].payload;
}

export async function setRemotePilotControl(
  userId: string,
  input: {
    workspaceId: string;
    enabled: boolean;
    killSwitch: boolean;
    region: BrowserlessRegion;
    maxUnitsPerRun?: number;
  }
) {
  const maxUnitsPerRun = Math.min(
    2,
    Math.max(1, Math.floor(input.maxUnitsPerRun ?? 2))
  );

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `
        insert into app.remote_execution_controls (
          workspace_id,
          provider_key,
          region,
          enabled,
          kill_switch,
          egress_mode,
          max_concurrency,
          max_units_per_run,
          updated_by
        )
        values ($1,'browserless',$2,$3,$4,'direct',1,$5,$6)
        on conflict (workspace_id)
        do update set
          region = excluded.region,
          enabled = excluded.enabled,
          kill_switch = excluded.kill_switch,
          max_units_per_run = excluded.max_units_per_run,
          active_job_id = case
            when excluded.kill_switch then null
            else app.remote_execution_controls.active_job_id
          end,
          active_slot_expires_at = case
            when excluded.kill_switch then null
            else app.remote_execution_controls.active_slot_expires_at
          end,
          updated_by = excluded.updated_by,
          updated_at = now()
        returning *
      `,
      [
        input.workspaceId,
        input.region,
        input.enabled,
        input.killSwitch,
        maxUnitsPerRun,
        userId
      ]
    );
    await insertEvent(client, {
      workspaceId: input.workspaceId,
      eventType: input.killSwitch ? "kill-switch" : "control-updated",
      region: input.region,
      details: {
        enabled: input.enabled,
        killSwitch: input.killSwitch,
        maxConcurrency: 1,
        maxUnitsPerRun
      }
    });
    return controlFromRow(result.rows[0]);
  });
}

export async function upsertRemotePilotAllowlist(
  userId: string,
  input: {
    workspaceId: string;
    sourceUrl: string;
    policyPin: Omit<RemoteExecutionPolicyPin, "workspaceId" | "origin">;
    enabled?: boolean;
    maxRecords?: number;
    maxRuntimeSeconds?: number;
    maxUnitsPerRun?: number;
  }
) {
  const source = new URL(input.sourceUrl);
  if (source.protocol !== "https:") {
    throw new Error("remote_pilot_https_required");
  }
  const sourceOrigin = normalizeRemoteSourceOrigin(input.sourceUrl);

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const policyPayload = await currentPolicyPayload(client, input.workspaceId);
    const policy = selectRemoteSourcePolicy(policyPayload, {
      workspaceId: input.workspaceId,
      origin: sourceOrigin,
      policyId: input.policyPin.policyId,
      policyRevision: input.policyPin.policyRevision,
      policyFingerprint: input.policyPin.policyFingerprint
    });

    if (
      policy.dataSensitivity !== "public-facts" ||
      policy.collectionMethod !== "public-webpage" ||
      policy.robotsDecision !== "allowed"
    ) {
      throw new Error("remote_pilot_public_non_sensitive_policy_required");
    }

    const maxRecords = Math.min(
      policy.maxRecordsPerRun,
      500,
      Math.max(1, Math.floor(input.maxRecords ?? 100))
    );
    const maxRuntimeSeconds = Math.min(
      60,
      Math.max(10, Math.floor(input.maxRuntimeSeconds ?? 60))
    );
    const maxUnitsPerRun = Math.min(
      2,
      Math.max(1, Math.floor(input.maxUnitsPerRun ?? 2))
    );

    const result = await client.query(
      `
        insert into app.remote_execution_source_allowlist (
          workspace_id,
          source_origin,
          policy_id,
          policy_revision,
          policy_fingerprint,
          enabled,
          max_pages,
          max_records,
          max_runtime_seconds,
          max_units_per_run,
          created_by,
          updated_by
        )
        values ($1,$2,$3,$4,$5,$6,1,$7,$8,$9,$10,$10)
        on conflict (workspace_id, source_origin)
        do update set
          policy_id = excluded.policy_id,
          policy_revision = excluded.policy_revision,
          policy_fingerprint = excluded.policy_fingerprint,
          enabled = excluded.enabled,
          max_pages = 1,
          max_records = excluded.max_records,
          max_runtime_seconds = excluded.max_runtime_seconds,
          max_units_per_run = excluded.max_units_per_run,
          updated_by = excluded.updated_by,
          updated_at = now()
        returning *
      `,
      [
        input.workspaceId,
        sourceOrigin,
        policy.policyId,
        policy.revision,
        policy.fingerprint,
        input.enabled ?? true,
        maxRecords,
        maxRuntimeSeconds,
        maxUnitsPerRun,
        userId
      ]
    );
    await insertEvent(client, {
      workspaceId: input.workspaceId,
      eventType: "allowlist-upserted",
      region: "us-east",
      details: {
        sourceOrigin,
        policyId: policy.policyId,
        policyRevision: policy.revision,
        policyFingerprint: policy.fingerprint,
        enabled: input.enabled ?? true
      }
    });
    return allowlistFromRow(result.rows[0]);
  });
}

export async function assertRemotePilotAuthorized(
  userId: string,
  input: {
    workspaceId: string;
    sourceUrl: string;
    policyPin: Omit<RemoteExecutionPolicyPin, "workspaceId" | "origin">;
  }
) {
  const source = new URL(input.sourceUrl);
  if (source.protocol !== "https:") {
    throw new Error("remote_pilot_https_required");
  }
  const sourceOrigin = normalizeRemoteSourceOrigin(input.sourceUrl);

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);

    const [controlResult, allowlistResult] = await Promise.all([
      client.query(
        "select * from app.remote_execution_controls where workspace_id = $1",
        [input.workspaceId]
      ),
      client.query(
        "select * from app.remote_execution_source_allowlist where workspace_id = $1 and source_origin = $2",
        [input.workspaceId, sourceOrigin]
      )
    ]);
    const controlRow = controlResult.rows[0];
    const allowlistRow = allowlistResult.rows[0];
    if (!controlRow || !controlRow.enabled || controlRow.kill_switch) {
      throw new Error("remote_workspace_kill_switch_active");
    }
    if (!allowlistRow || !allowlistRow.enabled) {
      throw new Error("remote_source_not_allowlisted");
    }

    const control = controlFromRow(controlRow);
    const allowlist = allowlistFromRow(allowlistRow);
    if (
      allowlist.policyId !== input.policyPin.policyId ||
      allowlist.policyRevision !== input.policyPin.policyRevision ||
      allowlist.policyFingerprint !== input.policyPin.policyFingerprint
    ) {
      throw new Error("remote_allowlist_policy_pin_drift");
    }

    const policyPayload = await currentPolicyPayload(client, input.workspaceId);
    const currentPolicy = selectRemoteSourcePolicy(policyPayload, {
      workspaceId: input.workspaceId,
      origin: sourceOrigin,
      policyId: allowlist.policyId,
      policyRevision: allowlist.policyRevision,
      policyFingerprint: allowlist.policyFingerprint
    });
    if (
      currentPolicy.dataSensitivity !== "public-facts" ||
      currentPolicy.collectionMethod !== "public-webpage" ||
      currentPolicy.robotsDecision !== "allowed"
    ) {
      throw new Error("remote_pilot_public_non_sensitive_policy_required");
    }

    return { control, allowlist, policy: currentPolicy };
  });
}

export async function reserveRemotePilotSlot(
  userId: string,
  input: {
    workspaceId: string;
    jobId: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);
    const result = await client.query(
      `
        update app.remote_execution_controls
        set
          active_job_id = $2,
          active_slot_expires_at = now() + interval '90 seconds',
          updated_at = now()
        where workspace_id = $1
          and enabled = true
          and kill_switch = false
          and (
            active_job_id is null
            or active_slot_expires_at is null
            or active_slot_expires_at <= now()
          )
        returning *
      `,
      [input.workspaceId, input.jobId]
    );
    if (!result.rows[0]) {
      throw new Error("remote_pilot_concurrency_limit_reached");
    }
    const control = controlFromRow(result.rows[0]);
    await insertEvent(client, {
      workspaceId: input.workspaceId,
      jobId: input.jobId,
      eventType: "slot-reserved",
      region: control.region,
      details: { maxConcurrency: 1 }
    });
    return control;
  });
}

export async function releaseRemotePilotSlot(
  userId: string,
  input: {
    workspaceId: string;
    jobId: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);
    const result = await client.query(
      `
        update app.remote_execution_controls
        set
          active_job_id = null,
          active_slot_expires_at = null,
          updated_at = now()
        where workspace_id = $1
          and active_job_id = $2
        returning *
      `,
      [input.workspaceId, input.jobId]
    );
    if (result.rows[0]) {
      const control = controlFromRow(result.rows[0]);
      await insertEvent(client, {
        workspaceId: input.workspaceId,
        jobId: input.jobId,
        eventType: "slot-released",
        region: control.region
      });
      return control;
    }
    return null;
  });
}

export async function isWorkspaceRemotePilotKilled(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);
    const result = await client.query<{
      enabled: boolean;
      kill_switch: boolean;
    }>(
      "select enabled, kill_switch from app.remote_execution_controls where workspace_id = $1",
      [workspaceId]
    );
    const row = result.rows[0];
    return !row || !row.enabled || row.kill_switch;
  });
}

export async function finishRemotePilotJob(
  userId: string,
  input: {
    workspaceId: string;
    jobId: string;
    status: "failed" | "cancelled";
    failureCode: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);
    await client.query(
      `
        update app.remote_execution_jobs
        set
          status = $3,
          failure_code = left($4, 120),
          completed_at = coalesce(completed_at, now()),
          updated_at = now()
        where workspace_id = $1
          and job_id = $2
          and status not in ('succeeded','failed','cancelled','timed-out')
      `,
      [
        input.workspaceId,
        input.jobId,
        input.status,
        input.failureCode
      ]
    );
  });
}

export async function appendRemotePilotEvent(
  userId: string,
  input: {
    workspaceId: string;
    jobId?: string | null;
    eventType: string;
    region: BrowserlessRegion;
    unitsEstimated?: number;
    durationMs?: number | null;
    responseCode?: number | null;
    details?: Record<string, unknown>;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);
    await insertEvent(client, input);
  });
}

export async function listWorkspaceRemotePilotState(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);
    const [controlResult, allowlistResult, eventResult] = await Promise.all([
      client.query(
        "select * from app.remote_execution_controls where workspace_id = $1",
        [workspaceId]
      ),
      client.query(
        "select * from app.remote_execution_source_allowlist where workspace_id = $1 order by source_origin",
        [workspaceId]
      ),
      client.query(
        "select * from app.remote_execution_provider_events where workspace_id = $1 order by created_at desc limit 100",
        [workspaceId]
      )
    ]);

    const events = eventResult.rows.map(eventFromRow);
    const runEvents = events.filter((event) =>
      event.eventType === "run-succeeded" ||
      event.eventType === "run-failed"
    );
    const successes = runEvents.filter(
      (event) => event.eventType === "run-succeeded"
    ).length;

    return {
      control: controlResult.rows[0]
        ? controlFromRow(controlResult.rows[0])
        : null,
      allowlist: allowlistResult.rows.map(allowlistFromRow),
      events,
      report: {
        runs: runEvents.length,
        successes,
        failures: runEvents.length - successes,
        successRate:
          runEvents.length === 0 ? null : successes / runEvents.length,
        providerUnits: runEvents.reduce(
          (sum, event) => sum + event.unitsEstimated,
          0
        ),
        averageDurationMs:
          runEvents.length === 0
            ? null
            : Math.round(
                runEvents.reduce(
                  (sum, event) => sum + (event.durationMs ?? 0),
                  0
                ) / runEvents.length
              )
      }
    };
  });
}

export async function listRemotePilotOverviewForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const result = [];
  for (const workspace of workspaces) {
    result.push({
      workspace,
      ...(await listWorkspaceRemotePilotState(userId, workspace.id))
    });
  }
  return result;
}
