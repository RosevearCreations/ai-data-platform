import { browserlessPilotReadiness } from "./browserless-provider";
import { listWorkspacesForUser, withUserDatabase } from "./database";
import {
  buildProductionLearningAssessment,
  type ProductionLearningEvidence,
  type ProductionLearningWorkspaceEvidence
} from "./production-learning";

function numeric(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function summaryNumber(
  value: Record<string, unknown> | null | undefined,
  key: string
) {
  return numeric(value?.[key]);
}

async function workspaceEvidence(
  userId: string,
  workspace: Awaited<ReturnType<typeof listWorkspacesForUser>>[number]
): Promise<ProductionLearningWorkspaceEvidence> {
  return withUserDatabase(userId, async (client) => {
    const [
      syncResult,
      intelligenceResult,
      integrationResult,
      barcodeResult,
      remoteJobResult,
      remotePilotResult,
      connectorResult,
      memberResult
    ] = await Promise.all([
      client.query(
        `
          select
            (select count(*) from app.workspace_saved_scrapers where workspace_id=$1 and deleted_at is null)::int as active_scrapers,
            (select count(*) from app.workspace_saved_scrapers where workspace_id=$1 and deleted_at is not null)::int as deleted_scrapers,
            (select count(*) from app.workspace_reviewed_datasets where workspace_id=$1 and deleted_at is null)::int as reviewed_datasets,
            (select count(*) from app.workspace_reviewed_datasets where workspace_id=$1 and deleted_at is not null)::int as deleted_datasets,
            coalesce((select sum(row_count) from app.workspace_reviewed_datasets where workspace_id=$1 and deleted_at is null),0)::bigint as reviewed_rows,
            (
              coalesce((select sum(greatest(server_version - 1,0)) from app.workspace_saved_scrapers where workspace_id=$1),0) +
              coalesce((select sum(greatest(server_version - 1,0)) from app.workspace_reviewed_datasets where workspace_id=$1),0)
            )::bigint as version_changes,
            (
              coalesce((select sum(pg_column_size(payload)) from app.workspace_saved_scrapers where workspace_id=$1),0) +
              coalesce((select sum(pg_column_size(payload)) from app.workspace_reviewed_datasets where workspace_id=$1),0)
            )::bigint as storage_bytes
        `,
        [workspace.id]
      ),
      client.query<{
        module_key: string;
        summary: Record<string, unknown>;
        payload_bytes: number;
      }>(
        `
          select module_key, summary, pg_column_size(payload)::int as payload_bytes
          from app.workspace_intelligence_modules
          where workspace_id=$1
        `,
        [workspace.id]
      ),
      client.query<{ action: string; count: string }>(
        `
          select action, count(*)::text as count
          from app.workspace_intelligence_audit
          where workspace_id=$1
          group by action
        `,
        [workspace.id]
      ),
      client.query(
        `
          select
            count(*)::int as captures,
            count(*) filter (where review_status='pending')::int as pending,
            count(*) filter (where review_status='approved')::int as approved,
            count(*) filter (where review_status='rejected')::int as rejected,
            count(*) filter (where match_status='duplicate')::int as duplicates,
            count(*) filter (where capture_method='camera')::int as camera,
            count(*) filter (where capture_method='manual')::int as manual,
            coalesce(sum(pg_column_size(provenance)+pg_column_size(match_payload)),0)::bigint as storage_bytes
          from app.workspace_barcode_captures
          where workspace_id=$1
        `,
        [workspace.id]
      ),
      client.query(
        `
          select
            count(*)::int as jobs,
            count(*) filter (where status='succeeded')::int as succeeded_jobs,
            count(*) filter (where status='failed')::int as failed_jobs,
            count(*) filter (where status='cancelled')::int as cancelled_jobs,
            count(*) filter (where status='timed-out')::int as timed_out_jobs,
            (
              coalesce((select sum(pg_column_size(source_policy_snapshot)) from app.remote_execution_jobs where workspace_id=$1),0) +
              coalesce((select sum(pg_column_size(payload)) from app.remote_execution_results where workspace_id=$1),0)
            )::bigint as storage_bytes
          from app.remote_execution_jobs
          where workspace_id=$1
        `,
        [workspace.id]
      ),
      client.query(
        `
          select
            (select count(*) from app.remote_execution_source_allowlist where workspace_id=$1 and enabled=true)::int as allowlisted_sources,
            coalesce((select enabled from app.remote_execution_controls where workspace_id=$1),false) as workspace_enabled,
            coalesce((select kill_switch from app.remote_execution_controls where workspace_id=$1),true) as workspace_killed,
            count(*) filter (where event_type in ('run-succeeded','run-failed'))::int as provider_runs,
            count(*) filter (where event_type='run-succeeded')::int as provider_successes,
            count(*) filter (where event_type='run-failed')::int as provider_failures,
            coalesce(sum(units_estimated) filter (where event_type in ('run-succeeded','run-failed')),0)::bigint as provider_units,
            round(avg(duration_ms) filter (where event_type in ('run-succeeded','run-failed') and duration_ms is not null))::int as average_duration_ms,
            coalesce(sum(pg_column_size(details)),0)::bigint as storage_bytes
          from app.remote_execution_provider_events
          where workspace_id=$1
        `,
        [workspace.id]
      ),
      client.query(
        `
          select
            (select count(*) from app.workspace_connector_installations where workspace_id=$1)::int as installations,
            (select count(*) from app.workspace_connector_installations where workspace_id=$1 and enabled=true)::int as enabled,
            count(*) filter (where status='succeeded')::int as succeeded,
            count(*) filter (where status='failed')::int as failed,
            count(*) filter (where status='blocked')::int as blocked,
            (
              coalesce((select sum(pg_column_size(config)+pg_column_size(granted_capabilities)+pg_column_size(secret_refs)) from app.workspace_connector_installations where workspace_id=$1),0) +
              coalesce(sum(pg_column_size(input_summary)+pg_column_size(output_summary)),0)
            )::bigint as storage_bytes
          from app.workspace_connector_audit
          where workspace_id=$1
        `,
        [workspace.id]
      ),
      client.query<{ role: string; count: string }>(
        `
          select role, count(*)::text as count
          from app.workspace_members
          where workspace_id=$1
          group by role
        `,
        [workspace.id]
      )
    ]);

    const sync = syncResult.rows[0] as Record<string, unknown>;
    const barcode = barcodeResult.rows[0] as Record<string, unknown>;
    const remoteJobs = remoteJobResult.rows[0] as Record<string, unknown>;
    const remote = remotePilotResult.rows[0] as Record<string, unknown>;
    const connectors = connectorResult.rows[0] as Record<string, unknown>;
    const sourcePolicy = intelligenceResult.rows.find(
      (row) => row.module_key === "source-policy"
    );
    const scheduled = intelligenceResult.rows.find(
      (row) => row.module_key === "scheduled-jobs"
    );
    const integrationCounts = Object.fromEntries(
      integrationResult.rows.map((row) => [row.action, numeric(row.count)])
    );
    const memberCounts = Object.fromEntries(
      memberResult.rows.map((row) => [row.role, numeric(row.count)])
    );

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      profileKey: workspace.profileKey,
      profileName: workspace.profileName,
      role: workspace.role,
      sync: {
        activeScrapers: numeric(sync.active_scrapers),
        deletedScrapers: numeric(sync.deleted_scrapers),
        reviewedDatasets: numeric(sync.reviewed_datasets),
        deletedDatasets: numeric(sync.deleted_datasets),
        reviewedRows: numeric(sync.reviewed_rows),
        versionChanges: numeric(sync.version_changes),
        storageBytes: numeric(sync.storage_bytes)
      },
      intelligence: {
        modules: intelligenceResult.rows.length,
        storageBytes: intelligenceResult.rows.reduce(
          (total, row) => total + numeric(row.payload_bytes),
          0
        ),
        sourcePolicy: {
          present: Boolean(sourcePolicy),
          sources: summaryNumber(sourcePolicy?.summary, "sources"),
          approved: summaryNumber(sourcePolicy?.summary, "approved"),
          blocked: summaryNumber(sourcePolicy?.summary, "blocked"),
          reviewRequired: summaryNumber(sourcePolicy?.summary, "reviewRequired"),
          expired: summaryNumber(sourcePolicy?.summary, "expired")
        },
        scheduled: {
          present: Boolean(scheduled),
          jobs: summaryNumber(scheduled?.summary, "jobs"),
          enabled: summaryNumber(scheduled?.summary, "enabled"),
          due: summaryNumber(scheduled?.summary, "due"),
          unread: summaryNumber(scheduled?.summary, "unread"),
          attempts: summaryNumber(scheduled?.summary, "attempts")
        }
      },
      integrations: {
        dryRuns: numeric(integrationCounts["dry-run-created"]),
        approved: numeric(integrationCounts.approved),
        exported: numeric(integrationCounts.exported),
        cancelled: numeric(integrationCounts.cancelled)
      },
      barcode: {
        captures: numeric(barcode.captures),
        pending: numeric(barcode.pending),
        approved: numeric(barcode.approved),
        rejected: numeric(barcode.rejected),
        duplicates: numeric(barcode.duplicates),
        camera: numeric(barcode.camera),
        manual: numeric(barcode.manual),
        storageBytes: numeric(barcode.storage_bytes)
      },
      remote: {
        jobs: numeric(remoteJobs.jobs),
        succeededJobs: numeric(remoteJobs.succeeded_jobs),
        failedJobs: numeric(remoteJobs.failed_jobs),
        cancelledJobs: numeric(remoteJobs.cancelled_jobs),
        timedOutJobs: numeric(remoteJobs.timed_out_jobs),
        providerRuns: numeric(remote.provider_runs),
        providerSuccesses: numeric(remote.provider_successes),
        providerFailures: numeric(remote.provider_failures),
        providerUnits: numeric(remote.provider_units),
        averageDurationMs:
          remote.average_duration_ms === null
            ? null
            : numeric(remote.average_duration_ms),
        allowlistedSources: numeric(remote.allowlisted_sources),
        workspaceEnabled: Boolean(remote.workspace_enabled),
        workspaceKilled: Boolean(remote.workspace_killed),
        storageBytes:
          numeric(remoteJobs.storage_bytes) + numeric(remote.storage_bytes)
      },
      connectors: {
        installations: numeric(connectors.installations),
        enabled: numeric(connectors.enabled),
        succeeded: numeric(connectors.succeeded),
        failed: numeric(connectors.failed),
        blocked: numeric(connectors.blocked),
        storageBytes: numeric(connectors.storage_bytes)
      },
      security: {
        owners: numeric(memberCounts.owner),
        admins: numeric(memberCounts.admin),
        members: numeric(memberCounts.member)
      }
    };
  });
}

export async function buildProductionLearningReview(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const [workspaceEvidenceRows, profiles] = await Promise.all([
    Promise.all(workspaces.map((workspace) => workspaceEvidence(userId, workspace))),
    withUserDatabase(userId, async (client) => {
      const result = await client.query<{
        is_builtin: boolean;
        archived_at: Date | null;
      }>(
        "select is_builtin, archived_at from app.workspace_profiles"
      );
      return result.rows;
    })
  ]);

  const readiness = browserlessPilotReadiness();
  const evidence: ProductionLearningEvidence = {
    generatedAt: new Date().toISOString(),
    browserless: {
      tokenConfigured: readiness.tokenConfigured,
      executionEnabled: readiness.executionEnabled,
      globalKillSwitchActive: readiness.globalKillSwitchActive,
      readyForLivePilot: readiness.readyForLivePilot
    },
    profiles: {
      visible: profiles.length,
      customActive: profiles.filter(
        (profile) => !profile.is_builtin && !profile.archived_at
      ).length,
      customArchived: profiles.filter(
        (profile) => !profile.is_builtin && Boolean(profile.archived_at)
      ).length
    },
    workspaces: workspaceEvidenceRows
  };

  return {
    evidence,
    ...buildProductionLearningAssessment(evidence)
  };
}
