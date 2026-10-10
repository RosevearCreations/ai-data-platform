import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { listWorkspacesForUser, withUserDatabase } from "./database";
import {
  RETENTION_BUDGETS,
  RETENTION_CLASSES,
  retentionBudgetBreaches,
  type RetentionClassKey
} from "./retention";

function numeric(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function budgetMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return RETENTION_BUDGETS;
  }
  const raw = value as Record<string, unknown>;
  return Object.fromEntries(
    RETENTION_CLASSES.map((item) => [
      item.key,
      Math.max(1, numeric(raw[item.key]) || item.budgetBytes)
    ])
  ) as Record<RetentionClassKey, number>;
}

async function requireWorkspaceAdmin(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: string }>(
    `
      select role
      from app.workspace_members
      where workspace_id=$1
        and user_id=nullif(current_setting('app.user_id',true),'')
      limit 1
    `,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("workspace_admin_required");
  }
}

export interface RetentionClassEvidence {
  key: RetentionClassKey;
  label: string;
  budgetBytes: number;
  measuredBytes: number;
  rows: number;
  archiveEligibleRows: number;
  deleteEligibleRows: number;
  deleteEligibleBytes: number;
  retentionDays: number | null;
  disposition: string;
  protectedEvidence: boolean;
  description: string;
  overBudget: boolean;
}

export interface RetentionWorkspaceOverview {
  workspace: Awaited<ReturnType<typeof listWorkspacesForUser>>[number];
  policyPresent: boolean;
  cleanupApproved: boolean;
  approvedAt: Date | null;
  maxRowsPerRun: number;
  measuredBytes: number;
  managedRows: number;
  archiveEligibleRows: number;
  deleteEligibleRows: number;
  deleteEligibleBytes: number;
  budgetBreaches: RetentionClassKey[];
  classes: RetentionClassEvidence[];
  recentRuns: Array<{
    runId: string;
    status: "completed" | "failed";
    beforeRows: number;
    afterRows: number;
    beforeStorageBytes: number;
    afterStorageBytes: number;
    eligibleRows: number;
    eligibleStorageBytes: number;
    deletedBarcodeRows: number;
    deletedRemoteJobs: number;
    errorCode: string | null;
    createdAt: Date;
  }>;
}

const metricColumns: Record<
  RetentionClassKey,
  { rows: string; bytes: string; archive?: string; deleteRows?: string; deleteBytes?: string }
> = {
  "sync-payloads": {
    rows: "sync_payload_rows",
    bytes: "sync_payload_bytes",
    archive: "sync_archive_eligible_rows"
  },
  "intelligence-modules": {
    rows: "intelligence_module_rows",
    bytes: "intelligence_module_bytes"
  },
  "barcode-terminal": {
    rows: "barcode_rows",
    bytes: "barcode_bytes",
    deleteRows: "barcode_delete_eligible_rows",
    deleteBytes: "barcode_delete_eligible_bytes"
  },
  "remote-terminal": {
    rows: "remote_rows",
    bytes: "remote_bytes",
    deleteRows: "remote_delete_eligible_jobs",
    deleteBytes: "remote_delete_eligible_bytes"
  },
  "intelligence-audit": {
    rows: "intelligence_audit_rows",
    bytes: "intelligence_audit_bytes"
  },
  "remote-provider-audit": {
    rows: "provider_audit_rows",
    bytes: "provider_audit_bytes"
  },
  "connector-audit": {
    rows: "connector_rows",
    bytes: "connector_bytes"
  },
  "operational-outcomes": {
    rows: "operational_rows",
    bytes: "operational_bytes"
  },
  "production-learning-snapshots": {
    rows: "snapshot_rows",
    bytes: "snapshot_bytes"
  },
  "integration-delivery-audit": {
    rows: "delivery_audit_rows",
    bytes: "delivery_audit_bytes"
  },
  "retention-control-audit": {
    rows: "retention_audit_rows",
    bytes: "retention_audit_bytes"
  }
};

export async function listRetentionOverviewForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const result: RetentionWorkspaceOverview[] = [];

  for (const workspace of workspaces) {
    const overview = await withUserDatabase(userId, async (client) => {
      const [metricResult, policyResult, runResult] = await Promise.all([
        client.query<Record<string, unknown>>(
          "select * from app.workspace_retention_metrics where workspace_id=$1",
          [workspace.id]
        ),
        client.query<{
          cleanup_approved: boolean;
          approved_at: Date | null;
          max_rows_per_run: number;
          budgets: Record<string, unknown>;
        }>(
          `
            select cleanup_approved,approved_at,max_rows_per_run,budgets
            from app.workspace_retention_policies
            where workspace_id=$1
          `,
          [workspace.id]
        ),
        client.query<{
          run_id: string;
          status: "completed" | "failed";
          before_rows: number;
          after_rows: number;
          before_storage_bytes: string;
          after_storage_bytes: string;
          eligible_rows: number;
          eligible_storage_bytes: string;
          deleted_barcode_rows: number;
          deleted_remote_jobs: number;
          error_code: string | null;
          created_at: Date;
        }>(
          `
            select
              run_id,status,before_rows,after_rows,before_storage_bytes,
              after_storage_bytes,eligible_rows,eligible_storage_bytes,
              deleted_barcode_rows,deleted_remote_jobs,error_code,created_at
            from app.workspace_retention_cleanup_runs
            where workspace_id=$1
            order by created_at desc
            limit 10
          `,
          [workspace.id]
        )
      ]);

      const metrics = metricResult.rows[0] ?? {};
      const policy = policyResult.rows[0] ?? null;
      const budgets = budgetMap(policy?.budgets);
      const measuredByClass = Object.fromEntries(
        RETENTION_CLASSES.map((item) => {
          const mapping = metricColumns[item.key];
          return [item.key, numeric(metrics[mapping.bytes])];
        })
      ) as Record<RetentionClassKey, number>;
      const breaches = retentionBudgetBreaches(measuredByClass, budgets);
      const breachSet = new Set(breaches);

      const classes = RETENTION_CLASSES.map((item) => {
        const mapping = metricColumns[item.key];
        return {
          key: item.key,
          label: item.label,
          budgetBytes: budgets[item.key],
          measuredBytes: measuredByClass[item.key],
          rows: numeric(metrics[mapping.rows]),
          archiveEligibleRows: mapping.archive
            ? numeric(metrics[mapping.archive])
            : 0,
          deleteEligibleRows: mapping.deleteRows
            ? numeric(metrics[mapping.deleteRows])
            : 0,
          deleteEligibleBytes: mapping.deleteBytes
            ? numeric(metrics[mapping.deleteBytes])
            : 0,
          retentionDays: item.retentionDays,
          disposition: item.disposition,
          protectedEvidence: item.protectedEvidence,
          description: item.description,
          overBudget: breachSet.has(item.key)
        } satisfies RetentionClassEvidence;
      });

      return {
        policyPresent: Boolean(policy),
        cleanupApproved: Boolean(policy?.cleanup_approved),
        approvedAt: policy?.approved_at ?? null,
        maxRowsPerRun: numeric(policy?.max_rows_per_run) || 100,
        measuredBytes: numeric(metrics.total_measured_bytes),
        managedRows: numeric(metrics.total_managed_rows),
        archiveEligibleRows: classes.reduce(
          (total, item) => total + item.archiveEligibleRows,
          0
        ),
        deleteEligibleRows: classes.reduce(
          (total, item) => total + item.deleteEligibleRows,
          0
        ),
        deleteEligibleBytes: classes.reduce(
          (total, item) => total + item.deleteEligibleBytes,
          0
        ),
        budgetBreaches: breaches,
        classes,
        recentRuns: runResult.rows.map((row) => ({
          runId: row.run_id,
          status: row.status,
          beforeRows: numeric(row.before_rows),
          afterRows: numeric(row.after_rows),
          beforeStorageBytes: numeric(row.before_storage_bytes),
          afterStorageBytes: numeric(row.after_storage_bytes),
          eligibleRows: numeric(row.eligible_rows),
          eligibleStorageBytes: numeric(row.eligible_storage_bytes),
          deletedBarcodeRows: numeric(row.deleted_barcode_rows),
          deletedRemoteJobs: numeric(row.deleted_remote_jobs),
          errorCode: row.error_code,
          createdAt: row.created_at
        }))
      };
    });

    result.push({ workspace, ...overview });
  }

  return result;
}

export async function setRetentionCleanupApproval(
  userId: string,
  input: {
    workspaceId: string;
    approved: boolean;
    confirmation: string;
  }
) {
  const expected = input.approved ? "APPROVE CLEANUP" : "REVOKE CLEANUP";
  if (input.confirmation !== expected) {
    throw new Error("retention_confirmation_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const budgets = JSON.stringify(RETENTION_BUDGETS);
    const result = await client.query<{
      cleanup_approved: boolean;
      approved_at: Date | null;
      max_rows_per_run: number;
    }>(
      `
        insert into app.workspace_retention_policies (
          workspace_id,cleanup_approved,approved_by,approved_at,
          max_rows_per_run,budgets,updated_by,updated_at
        )
        values ($1,$2,$3,case when $2 then now() else null end,100,$4::jsonb,$3,now())
        on conflict (workspace_id)
        do update set
          cleanup_approved=excluded.cleanup_approved,
          approved_by=case when excluded.cleanup_approved then excluded.approved_by else null end,
          approved_at=case when excluded.cleanup_approved then now() else null end,
          updated_by=excluded.updated_by,
          updated_at=now()
        returning cleanup_approved,approved_at,max_rows_per_run
      `,
      [input.workspaceId, input.approved, userId, budgets]
    );

    await client.query(
      `
        insert into app.workspace_retention_policy_events (
          workspace_id,event_id,event_type,policy_version,actor_user_id,details
        )
        values ($1,$2,$3,1,$4,$5::jsonb)
      `,
      [
        input.workspaceId,
        randomUUID(),
        input.approved ? "cleanup-approved" : "cleanup-revoked",
        userId,
        JSON.stringify({
          maxRowsPerRun: result.rows[0]?.max_rows_per_run ?? 100,
          protectedEvidenceUntouched: true
        })
      ]
    );

    return {
      cleanupApproved: Boolean(result.rows[0]?.cleanup_approved),
      approvedAt: result.rows[0]?.approved_at ?? null,
      maxRowsPerRun: numeric(result.rows[0]?.max_rows_per_run) || 100
    };
  });
}

export async function executeRetentionCleanup(
  userId: string,
  input: {
    workspaceId: string;
    confirmation: string;
    maxRows?: number;
  }
) {
  if (input.confirmation !== "RUN CLEANUP") {
    throw new Error("retention_run_confirmation_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const maxRows = Math.min(250, Math.max(1, Math.floor(input.maxRows ?? 100)));
    const result = await client.query<{ result: Record<string, unknown> }>(
      "select app.execute_workspace_retention_cleanup($1,$2) as result",
      [input.workspaceId, maxRows]
    );
    return result.rows[0]?.result ?? { status: "failed", errorCode: "no_result" };
  });
}
