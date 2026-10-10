import { createHash, randomUUID } from "node:crypto";

import { buildAdoptionReview } from "./adoption-database";
import { browserlessPilotReadiness } from "./browserless-provider";
import { listWorkspacesForUser, withUserDatabase } from "./database";
import {
  RETENTION_BUDGETS,
  retentionBudgetBreaches,
  type RetentionClassKey
} from "./retention";
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

function approvedPublicSourceCount(payload: unknown, at = Date.now()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const entries = (payload as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return 0;

  return entries.filter((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const policy = entry as Record<string, unknown>;
    const expires =
      typeof policy.reviewExpiresAt === "string"
        ? Date.parse(policy.reviewExpiresAt)
        : Number.NaN;
    return (
      policy.status === "approved" &&
      policy.collectionMethod === "public-webpage" &&
      policy.dataSensitivity === "public-facts" &&
      policy.publicOrAuthorized === true &&
      policy.termsReviewed === true &&
      policy.noAccessControlBypass === true &&
      policy.robotsDecision === "allowed" &&
      Number.isFinite(expires) &&
      expires > at
    );
  }).length;
}

async function workspaceEvidence(
  userId: string,
  workspace: Awaited<ReturnType<typeof listWorkspacesForUser>>[number]
): Promise<ProductionLearningWorkspaceEvidence> {
  return withUserDatabase(userId, async (client) => {
    const syncResult = await client.query(
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
    );

    const outcomeResult = await client.query(
      `
        select
          count(*) filter (where event_family='sync')::int as sync_events,
          count(*) filter (where event_type='sync-applied')::int as sync_applied,
          count(*) filter (where event_type='sync-deleted')::int as sync_deleted,
          count(*) filter (where event_type='sync-conflict')::int as sync_conflicts,
          count(*) filter (where event_type='sync-noop')::int as sync_noops,
          count(*) filter (where event_type='sync-error')::int as sync_errors,
          count(*) filter (where event_type='repair-proposed')::int as repair_proposed,
          count(*) filter (where event_type='repair-approved')::int as repair_approved,
          count(*) filter (where event_type='repair-rejected')::int as repair_rejected,
          count(*) filter (where event_type='repair-rolled-back')::int as repair_rolled_back,
          count(*) filter (where event_type='repair-compatibility')::int as repair_compatibility_checks,
          count(*) filter (
            where event_type='repair-compatibility' and compatibility_status='healthy'
          )::int as repair_healthy,
          count(*) filter (
            where event_type='repair-compatibility' and compatibility_status='degraded'
          )::int as repair_degraded,
          count(*) filter (
            where event_type='repair-compatibility' and compatibility_status='broken'
          )::int as repair_broken,
          coalesce(sum(pg_column_size(details)),0)::bigint as storage_bytes
        from app.workspace_operational_outcomes
        where workspace_id=$1
      `,
      [workspace.id]
    );

    const intelligenceResult = await client.query<{
      module_key: string;
      summary: Record<string, unknown>;
      payload: Record<string, unknown>;
      payload_bytes: number;
    }>(
      `
        select module_key, summary, payload, pg_column_size(payload)::int as payload_bytes
        from app.workspace_intelligence_modules
        where workspace_id=$1
      `,
      [workspace.id]
    );

    const integrationResult = await client.query<{
      action: string;
      count: string;
    }>(
      `
        select action, count(*)::text as count
        from app.workspace_intelligence_audit
        where workspace_id=$1
        group by action
      `,
      [workspace.id]
    );

    const integrationDeliveryResult = await client.query(
      `
        select
          count(*) filter (where event_type='delivery-attempted')::int as delivery_attempts,
          count(*) filter (
            where event_type='delivery-accepted' and transport_mode='conformance'
          )::int as conformance_accepted,
          count(*) filter (
            where event_type='delivery-accepted' and transport_mode='live'
          )::int as live_accepted,
          count(*) filter (where event_type='delivery-rejected')::int as delivery_rejected,
          count(*) filter (where event_type='transport-error')::int as transport_errors,
          count(*) filter (where event_type='handshake-accepted')::int as handshake_accepted,
          count(*) filter (where event_type='handshake-rejected')::int as handshake_rejected,
          coalesce(sum(pg_column_size(details)),0)::bigint as storage_bytes
        from app.integration_delivery_events
        where workspace_id=$1
      `,
      [workspace.id]
    );

    const retentionResult = await client.query(
      `
        select
          metrics.*,
          (policy.workspace_id is not null) as policy_present,
          coalesce(policy.cleanup_approved,false) as cleanup_approved,
          coalesce((select count(*) from app.workspace_retention_cleanup_runs r where r.workspace_id=$1),0)::int as cleanup_runs,
          coalesce((select sum(r.deleted_barcode_rows+r.deleted_remote_jobs) from app.workspace_retention_cleanup_runs r where r.workspace_id=$1 and r.status='completed'),0)::bigint as deleted_rows,
          coalesce((select count(*) from app.workspace_retention_cleanup_runs r where r.workspace_id=$1 and r.status='failed'),0)::int as failed_runs
        from app.workspace_retention_metrics metrics
        left join app.workspace_retention_policies policy
          on policy.workspace_id=metrics.workspace_id
        where metrics.workspace_id=$1
      `,
      [workspace.id]
    );

    const barcodeResult = await client.query(
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
    );

    const remoteJobResult = await client.query(
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
    );

    const remotePilotResult = await client.query(
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
          (
            select event_type
            from app.remote_execution_provider_events latest
            where latest.workspace_id=$1
              and latest.event_type in ('run-succeeded','run-failed')
            order by latest.created_at desc
            limit 1
          ) as latest_event_type,
          (
            select units_estimated
            from app.remote_execution_provider_events latest
            where latest.workspace_id=$1
              and latest.event_type in ('run-succeeded','run-failed')
            order by latest.created_at desc
            limit 1
          )::int as latest_units,
          (
            select duration_ms
            from app.remote_execution_provider_events latest
            where latest.workspace_id=$1
              and latest.event_type in ('run-succeeded','run-failed')
            order by latest.created_at desc
            limit 1
          )::int as latest_duration_ms,
          (
            select response_code
            from app.remote_execution_provider_events latest
            where latest.workspace_id=$1
              and latest.event_type in ('run-succeeded','run-failed')
            order by latest.created_at desc
            limit 1
          )::int as latest_response_code,
          (
            select details->>'finalUrl'
            from app.remote_execution_provider_events latest
            where latest.workspace_id=$1
              and latest.event_type='run-succeeded'
            order by latest.created_at desc
            limit 1
          ) as latest_final_url,
          (
            select details->>'contentSha256'
            from app.remote_execution_provider_events latest
            where latest.workspace_id=$1
              and latest.event_type='run-succeeded'
            order by latest.created_at desc
            limit 1
          ) as latest_content_sha256,
          coalesce(sum(pg_column_size(details)),0)::bigint as storage_bytes
        from app.remote_execution_provider_events
        where workspace_id=$1
      `,
      [workspace.id]
    );

    const connectorResult = await client.query(
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
    );

    const memberResult = await client.query<{ role: string; count: string }>(
      `
        select role, count(*)::text as count
        from app.workspace_members
        where workspace_id=$1
        group by role
      `,
      [workspace.id]
    );

    const sync = syncResult.rows[0] as Record<string, unknown>;
    const outcomes = outcomeResult.rows[0] as Record<string, unknown>;
    const barcode = barcodeResult.rows[0] as Record<string, unknown>;
    const retention = retentionResult.rows[0] as Record<string, unknown>;
    const integrationDelivery =
      integrationDeliveryResult.rows[0] as Record<string, unknown>;
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

    const snapshotCounts = {
      syncEvents: numeric(outcomes.sync_events),
      syncConflicts: numeric(outcomes.sync_conflicts),
      syncErrors: numeric(outcomes.sync_errors),
      repairTerminalEvents:
        numeric(outcomes.repair_approved) +
        numeric(outcomes.repair_rejected) +
        numeric(outcomes.repair_rolled_back),
      repairCompatibilityChecks: numeric(outcomes.repair_compatibility_checks),
      repairHealthyChecks: numeric(outcomes.repair_healthy),
      repairRollbacks: numeric(outcomes.repair_rolled_back)
    };
    const evidenceFingerprint = createHash("sha256")
      .update(JSON.stringify(snapshotCounts))
      .digest("hex");

    const previousSnapshotResult = await client.query<{
      generated_at: Date;
      sync_events: number;
      sync_conflicts: number;
      repair_compatibility_checks: number;
      repair_healthy_checks: number;
    }>(
      `
        select
          generated_at,
          sync_events,
          sync_conflicts,
          repair_compatibility_checks,
          repair_healthy_checks
        from app.production_learning_review_snapshots
        where workspace_id=$1
          and evidence_fingerprint<>$2
        order by generated_at desc
        limit 1
      `,
      [workspace.id, evidenceFingerprint]
    );

    await client.query(
      `
        insert into app.production_learning_review_snapshots (
          workspace_id,
          snapshot_id,
          evidence_fingerprint,
          sync_events,
          sync_conflicts,
          sync_errors,
          repair_terminal_events,
          repair_compatibility_checks,
          repair_healthy_checks,
          repair_rollbacks,
          created_by,
          generated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
        on conflict (workspace_id, evidence_fingerprint) do nothing
      `,
      [
        workspace.id,
        randomUUID(),
        evidenceFingerprint,
        snapshotCounts.syncEvents,
        snapshotCounts.syncConflicts,
        snapshotCounts.syncErrors,
        snapshotCounts.repairTerminalEvents,
        snapshotCounts.repairCompatibilityChecks,
        snapshotCounts.repairHealthyChecks,
        snapshotCounts.repairRollbacks,
        userId
      ]
    );

    const previousSnapshot = previousSnapshotResult.rows[0] ?? null;

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
      outcomes: {
        storageBytes: numeric(outcomes.storage_bytes),
        sync: {
          events: numeric(outcomes.sync_events),
          applied: numeric(outcomes.sync_applied),
          deleted: numeric(outcomes.sync_deleted),
          conflicts: numeric(outcomes.sync_conflicts),
          noops: numeric(outcomes.sync_noops),
          errors: numeric(outcomes.sync_errors)
        },
        repair: {
          proposed: numeric(outcomes.repair_proposed),
          approved: numeric(outcomes.repair_approved),
          rejected: numeric(outcomes.repair_rejected),
          rolledBack: numeric(outcomes.repair_rolled_back),
          compatibilityChecks: numeric(outcomes.repair_compatibility_checks),
          healthy: numeric(outcomes.repair_healthy),
          degraded: numeric(outcomes.repair_degraded),
          broken: numeric(outcomes.repair_broken)
        }
      },
      continuity: {
        previousSnapshotAt: previousSnapshot
          ? previousSnapshot.generated_at.toISOString()
          : null,
        previousSyncEvents: previousSnapshot
          ? numeric(previousSnapshot.sync_events)
          : 0,
        previousSyncConflicts: previousSnapshot
          ? numeric(previousSnapshot.sync_conflicts)
          : 0,
        previousRepairCompatibilityChecks: previousSnapshot
          ? numeric(previousSnapshot.repair_compatibility_checks)
          : 0,
        previousRepairHealthyChecks: previousSnapshot
          ? numeric(previousSnapshot.repair_healthy_checks)
          : 0
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
        cancelled: numeric(integrationCounts.cancelled),
        deliveryAttempts: numeric(integrationDelivery.delivery_attempts),
        conformanceAccepted: numeric(integrationDelivery.conformance_accepted),
        liveAccepted: numeric(integrationDelivery.live_accepted),
        deliveryRejected: numeric(integrationDelivery.delivery_rejected),
        transportErrors: numeric(integrationDelivery.transport_errors),
        handshakeAccepted: numeric(integrationDelivery.handshake_accepted),
        handshakeRejected: numeric(integrationDelivery.handshake_rejected),
        storageBytes: numeric(integrationDelivery.storage_bytes)
      },
      retention: {
        policyPresent: Boolean(retention.policy_present),
        cleanupApproved: Boolean(retention.cleanup_approved),
        archiveEligibleRows: numeric(retention.sync_archive_eligible_rows),
        deleteEligibleRows:
          numeric(retention.barcode_delete_eligible_rows) +
          numeric(retention.remote_delete_eligible_jobs),
        deleteEligibleBytes:
          numeric(retention.barcode_delete_eligible_bytes) +
          numeric(retention.remote_delete_eligible_bytes),
        cleanupRuns: numeric(retention.cleanup_runs),
        deletedRows: numeric(retention.deleted_rows),
        failedRuns: numeric(retention.failed_runs),
        budgetBreaches: retentionBudgetBreaches(
          {
            "sync-payloads": numeric(retention.sync_payload_bytes),
            "intelligence-modules": numeric(retention.intelligence_module_bytes),
            "barcode-terminal": numeric(retention.barcode_bytes),
            "remote-terminal": numeric(retention.remote_bytes),
            "intelligence-audit": numeric(retention.intelligence_audit_bytes),
            "remote-provider-audit": numeric(retention.provider_audit_bytes),
            "connector-audit": numeric(retention.connector_bytes),
            "operational-outcomes": numeric(retention.operational_bytes),
            "production-learning-snapshots": numeric(retention.snapshot_bytes),
            "integration-delivery-audit": numeric(retention.delivery_audit_bytes),
            "retention-control-audit": numeric(retention.retention_audit_bytes)
          } satisfies Record<RetentionClassKey, number>,
          RETENTION_BUDGETS
        ).length
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
        approvedPublicSources: approvedPublicSourceCount(sourcePolicy?.payload),
        lastRun:
          remote.latest_event_type
            ? {
                status:
                  remote.latest_event_type === "run-succeeded"
                    ? "succeeded"
                    : "failed",
                units: numeric(remote.latest_units),
                durationMs:
                  remote.latest_duration_ms === null
                    ? null
                    : numeric(remote.latest_duration_ms),
                responseCode:
                  remote.latest_response_code === null
                    ? null
                    : numeric(remote.latest_response_code),
                finalUrl:
                  typeof remote.latest_final_url === "string"
                    ? remote.latest_final_url
                    : null,
                contentSha256:
                  typeof remote.latest_content_sha256 === "string"
                    ? remote.latest_content_sha256
                    : null
              }
            : null,
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

async function buildRenewalEvidence(
  userId: string,
  workspaceEvidenceRows: ProductionLearningWorkspaceEvidence[],
  adoptionReview: Awaited<ReturnType<typeof buildAdoptionReview>>
): Promise<ProductionLearningEvidence["renewal"]> {
  const baseline = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      baseline_snapshots: string;
      baseline_generated_at: Date | null;
      sync_events: string;
      sync_conflicts: string;
      repair_checks: string;
      repair_healthy: string;
    }>(
      `
        with first_snapshots as (
          select distinct on (workspace_id)
            workspace_id,
            generated_at,
            sync_events,
            sync_conflicts,
            repair_compatibility_checks,
            repair_healthy_checks
          from app.production_learning_review_snapshots
          order by workspace_id, generated_at asc, created_at asc
        )
        select
          count(*)::text as baseline_snapshots,
          min(generated_at) as baseline_generated_at,
          coalesce(sum(sync_events),0)::text as sync_events,
          coalesce(sum(sync_conflicts),0)::text as sync_conflicts,
          coalesce(sum(repair_compatibility_checks),0)::text as repair_checks,
          coalesce(sum(repair_healthy_checks),0)::text as repair_healthy
        from first_snapshots
      `
    );
    return result.rows[0];
  });

  const adoptionByWorkspace = new Map(
    adoptionReview.workspaces.map((workspace) => [workspace.workspaceId, workspace])
  );

  for (const workspace of workspaceEvidenceRows) {
    const adoption = adoptionByWorkspace.get(workspace.workspaceId);
    const snapshot = {
      syncEvents: workspace.outcomes.sync.events,
      syncConflicts: workspace.outcomes.sync.conflicts,
      syncErrors: workspace.outcomes.sync.errors,
      repairChecks: workspace.outcomes.repair.compatibilityChecks,
      repairHealthy: workspace.outcomes.repair.healthy,
      repairRollbacks: workspace.outcomes.repair.rolledBack,
      providerRuns: workspace.remote.providerRuns,
      providerSuccesses: workspace.remote.providerSuccesses,
      providerUnits: workspace.remote.providerUnits,
      integrationAttempts: workspace.integrations.deliveryAttempts,
      integrationLiveAccepted: workspace.integrations.liveAccepted,
      integrationRejected: workspace.integrations.deliveryRejected,
      integrationTransportErrors: workspace.integrations.transportErrors,
      retentionBudgetBreaches: workspace.retention.budgetBreaches,
      retentionDeleteEligible: workspace.retention.deleteEligibleRows,
      retentionCleanupRuns: workspace.retention.cleanupRuns,
      retentionFailedRuns: workspace.retention.failedRuns,
      adoptionActivityEvents: adoption?.activityEvents ?? 0,
      adoptionUsedCapabilities: adoption?.capabilities.used.length ?? 0,
      adoptionHighRiskUnused: adoption?.capabilities.highRiskUnused.length ?? 0,
      connectorUnusedGrants: adoption?.connectors.unusedGrants.length ?? 0,
      permissionReviewRequired:
        adoption ? adoption.permissions.status !== "healthy" : false
    };
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(snapshot))
      .digest("hex");

    await withUserDatabase(userId, async (client) => {
      await client.query(
        `
          insert into app.production_learning_cycle_snapshots (
            workspace_id,snapshot_id,cycle_key,evidence_fingerprint,
            sync_events,sync_conflicts,sync_errors,
            repair_checks,repair_healthy,repair_rollbacks,
            provider_runs,provider_successes,provider_units,
            integration_attempts,integration_live_accepted,integration_rejected,
            integration_transport_errors,retention_budget_breaches,
            retention_delete_eligible,retention_cleanup_runs,retention_failed_runs,
            adoption_activity_events,adoption_used_capabilities,
            adoption_high_risk_unused,connector_unused_grants,
            permission_review_required,created_by,generated_at
          )
          values (
            $1,$2,'build-036',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
            $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,now()
          )
          on conflict (workspace_id,cycle_key,evidence_fingerprint) do nothing
        `,
        [
          workspace.workspaceId,
          randomUUID(),
          fingerprint,
          snapshot.syncEvents,
          snapshot.syncConflicts,
          snapshot.syncErrors,
          snapshot.repairChecks,
          snapshot.repairHealthy,
          snapshot.repairRollbacks,
          snapshot.providerRuns,
          snapshot.providerSuccesses,
          snapshot.providerUnits,
          snapshot.integrationAttempts,
          snapshot.integrationLiveAccepted,
          snapshot.integrationRejected,
          snapshot.integrationTransportErrors,
          snapshot.retentionBudgetBreaches,
          snapshot.retentionDeleteEligible,
          snapshot.retentionCleanupRuns,
          snapshot.retentionFailedRuns,
          snapshot.adoptionActivityEvents,
          snapshot.adoptionUsedCapabilities,
          snapshot.adoptionHighRiskUnused,
          snapshot.connectorUnusedGrants,
          snapshot.permissionReviewRequired,
          userId
        ]
      );
    });
  }

  const cycleSnapshots = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{ count: string }>(
      "select count(*)::text as count from app.production_learning_cycle_snapshots where cycle_key='build-036'"
    );
    return numeric(result.rows[0]?.count);
  });

  return {
    cycleSnapshots,
    baselineSnapshots: numeric(baseline?.baseline_snapshots),
    baselineGeneratedAt: baseline?.baseline_generated_at
      ? baseline.baseline_generated_at.toISOString()
      : null,
    baselineSyncEvents: numeric(baseline?.sync_events),
    baselineSyncConflicts: numeric(baseline?.sync_conflicts),
    baselineRepairChecks: numeric(baseline?.repair_checks),
    baselineRepairHealthy: numeric(baseline?.repair_healthy)
  };
}

export async function buildProductionLearningReview(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const [workspaceEvidenceRows, profiles, adoptionReview] = await Promise.all([
    Promise.all(workspaces.map((workspace) => workspaceEvidence(userId, workspace))),
    withUserDatabase(userId, async (client) => {
      const result = await client.query<{
        is_builtin: boolean;
        archived_at: Date | null;
      }>(
        "select is_builtin, archived_at from app.workspace_profiles"
      );
      return result.rows;
    }),
    buildAdoptionReview(userId)
  ]);

  const readiness = browserlessPilotReadiness();
  const renewal = await buildRenewalEvidence(
    userId,
    workspaceEvidenceRows,
    adoptionReview
  );
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
    adoption: {
      reviewSnapshots: adoptionReview.totals.reviewSnapshots,
      activeWorkspaces: adoptionReview.totals.activeWorkspaces,
      noActivityWorkspaces: adoptionReview.totals.noActivityWorkspaces,
      enabledCapabilities: adoptionReview.totals.enabledCapabilities,
      usedCapabilities: adoptionReview.totals.usedCapabilities,
      unusedEnabledCapabilities: adoptionReview.totals.unusedEnabledCapabilities,
      highRiskUnusedCapabilities:
        adoptionReview.totals.highRiskUnusedCapabilities,
      disabledUsedCapabilities:
        adoptionReview.totals.disabledUsedCapabilities,
      connectorGrants: adoptionReview.totals.connectorGrants,
      connectorUsedGrants: adoptionReview.totals.connectorUsedGrants,
      connectorUnusedGrants: adoptionReview.totals.connectorUnusedGrants,
      connectorStaleGrants: adoptionReview.totals.connectorStaleGrants,
      permissionReviewWorkspaces:
        adoptionReview.totals.permissionReviewWorkspaces,
      barcodeWorkspaces: adoptionReview.totals.barcodeWorkspaces,
      scheduledWorkspaces: adoptionReview.totals.scheduledWorkspaces,
      remoteWorkspaces: adoptionReview.totals.remoteWorkspaces,
      integrationWorkspaces: adoptionReview.totals.integrationWorkspaces
    },
    renewal,
    workspaces: workspaceEvidenceRows
  };

  return {
    evidence,
    ...buildProductionLearningAssessment(evidence)
  };
}
