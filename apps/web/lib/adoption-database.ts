import { createHash, randomUUID } from "node:crypto";

import { listWorkspacesForUser, withUserDatabase } from "./database";
import {
  buildConnectorGrantOutcome,
  buildPermissionOutcome,
  buildProfileCapabilityOutcome,
  type ConnectorAuditEvidence,
  type ConnectorInstallationEvidence,
  type ProfileCapabilityKey
} from "./adoption";

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

export interface AdoptionWorkspaceReview {
  workspaceId: string;
  workspaceName: string;
  profileKey: string;
  profileName: string;
  role: "owner" | "admin" | "member";
  activityEvents: number;
  activity: {
    sync: number;
    sourcePolicySources: number;
    scheduledJobs: number;
    scheduledAttempts: number;
    remoteJobs: number;
    remoteRuns: number;
    barcodeCaptures: number;
    integrationEvents: number;
    connectorExecutions: number;
  };
  capabilities: {
    enabled: ProfileCapabilityKey[];
    used: ProfileCapabilityKey[];
    unusedEnabled: ProfileCapabilityKey[];
    highRiskUnused: ProfileCapabilityKey[];
    disabledUsed: ProfileCapabilityKey[];
  };
  connectors: {
    installations: number;
    enabledInstallations: number;
    grants: string[];
    usedGrants: string[];
    unusedGrants: string[];
    staleUnusedGrants: string[];
    executions: number;
    blockedAttempts: number;
  };
  permissions: {
    owners: number;
    admins: number;
    members: number;
    status: "healthy" | "watch" | "action";
    recommendations: string[];
  };
  trend: {
    previousSnapshotAt: string | null;
    activityEventsDelta: number | null;
    usedCapabilitiesDelta: number | null;
    connectorUsedGrantsDelta: number | null;
  };
  snapshotCount: number;
}

export interface AdoptionProfileReview {
  profileKey: string;
  profileName: string;
  workspaces: number;
  activeWorkspaces: number;
  activityEvents: number;
  enabledCapabilitySlots: number;
  usedCapabilitySlots: number;
  highRiskUnusedCapabilitySlots: number;
  connectorInstallations: number;
  connectorUsedGrants: number;
}

async function workspaceAdoptionReview(
  userId: string,
  workspace: Awaited<ReturnType<typeof listWorkspacesForUser>>[number]
): Promise<AdoptionWorkspaceReview> {
  return withUserDatabase(userId, async (client) => {
    const [
      syncResult,
      intelligenceResult,
      barcodeResult,
      remoteResult,
      integrationResult,
      installationsResult,
      connectorAuditResult,
      memberResult
    ] = await Promise.all([
      client.query(
        `
          select (
            (select count(*) from app.workspace_saved_scrapers where workspace_id=$1 and deleted_at is null) +
            (select count(*) from app.workspace_reviewed_datasets where workspace_id=$1 and deleted_at is null) +
            coalesce((select sum(greatest(server_version-1,0)) from app.workspace_saved_scrapers where workspace_id=$1),0) +
            coalesce((select sum(greatest(server_version-1,0)) from app.workspace_reviewed_datasets where workspace_id=$1),0)
          )::bigint as sync_activity
        `,
        [workspace.id]
      ),
      client.query<{
        module_key: string;
        summary: Record<string, unknown>;
      }>(
        "select module_key,summary from app.workspace_intelligence_modules where workspace_id=$1",
        [workspace.id]
      ),
      client.query(
        "select count(*)::int as captures from app.workspace_barcode_captures where workspace_id=$1",
        [workspace.id]
      ),
      client.query(
        `
          select
            (select count(*) from app.remote_execution_jobs where workspace_id=$1)::int as jobs,
            (select count(*) from app.remote_execution_provider_events where workspace_id=$1 and event_type in ('run-succeeded','run-failed'))::int as runs
        `,
        [workspace.id]
      ),
      client.query(
        `
          select
            (
              (select count(*) from app.workspace_intelligence_audit where workspace_id=$1) +
              (select count(*) from app.integration_delivery_events where workspace_id=$1)
            )::int as events
        `,
        [workspace.id]
      ),
      client.query<{
        connector_key: string;
        enabled: boolean;
        granted_capabilities: unknown;
        updated_at: Date;
      }>(
        `
          select connector_key,enabled,granted_capabilities,updated_at
          from app.workspace_connector_installations
          where workspace_id=$1
          order by connector_key
        `,
        [workspace.id]
      ),
      client.query<{
        connector_key: string;
        capability: string;
        status: "succeeded" | "failed" | "blocked";
        created_at: Date;
      }>(
        `
          select connector_key,capability,status,created_at
          from app.workspace_connector_audit
          where workspace_id=$1
          order by created_at desc
        `,
        [workspace.id]
      ),
      client.query<{ role: string; count: string }>(
        `
          select role,count(*)::text as count
          from app.workspace_members
          where workspace_id=$1
          group by role
        `,
        [workspace.id]
      )
    ]);

    const sourcePolicy = intelligenceResult.rows.find(
      (row) => row.module_key === "source-policy"
    );
    const scheduled = intelligenceResult.rows.find(
      (row) => row.module_key === "scheduled-jobs"
    );
    const syncActivity = numeric(syncResult.rows[0]?.sync_activity);
    const sourcePolicySources = summaryNumber(sourcePolicy?.summary, "sources");
    const scheduledJobs = summaryNumber(scheduled?.summary, "jobs");
    const scheduledAttempts = summaryNumber(scheduled?.summary, "attempts");
    const remoteJobs = numeric(remoteResult.rows[0]?.jobs);
    const remoteRuns = numeric(remoteResult.rows[0]?.runs);
    const barcodeCaptures = numeric(barcodeResult.rows[0]?.captures);
    const integrationEvents = numeric(integrationResult.rows[0]?.events);

    const installations: ConnectorInstallationEvidence[] =
      installationsResult.rows.map((row) => ({
        connectorKey: row.connector_key,
        enabled: Boolean(row.enabled),
        grantedCapabilities: Array.isArray(row.granted_capabilities)
          ? row.granted_capabilities.map(String)
          : [],
        updatedAt: new Date(row.updated_at)
      }));
    const connectorAudit: ConnectorAuditEvidence[] =
      connectorAuditResult.rows.map((row) => ({
        connectorKey: row.connector_key,
        capability: row.capability,
        status: row.status,
        createdAt: new Date(row.created_at)
      }));
    const connectorOutcome = buildConnectorGrantOutcome(
      installations,
      connectorAudit
    );

    const capabilityOutcome = buildProfileCapabilityOutcome(
      workspace.profileCapabilities,
      {
        syncActivity,
        sourcePolicySources,
        scheduledJobs,
        scheduledAttempts,
        remoteJobs,
        remoteRuns,
        barcodeCaptures,
        integrationEvents
      }
    );

    const memberCounts = Object.fromEntries(
      memberResult.rows.map((row) => [row.role, numeric(row.count)])
    );
    const owners = numeric(memberCounts.owner);
    const admins = numeric(memberCounts.admin);
    const members = numeric(memberCounts.member);
    const permissionOutcome = buildPermissionOutcome({
      owners,
      admins,
      members,
      highRiskUnusedCapabilities: capabilityOutcome.highRiskUnused.length,
      connectorUnusedGrants: connectorOutcome.unusedGrants.length,
      disabledUsedCapabilities: capabilityOutcome.disabledUsed.length
    });

    const activityEvents =
      syncActivity +
      sourcePolicySources +
      scheduledJobs +
      scheduledAttempts +
      remoteJobs +
      remoteRuns +
      barcodeCaptures +
      integrationEvents +
      connectorOutcome.executions;

    const fingerprintPayload = {
      profileKey: workspace.profileKey,
      enabled: capabilityOutcome.enabled,
      used: capabilityOutcome.used,
      unusedEnabled: capabilityOutcome.unusedEnabled,
      highRiskUnused: capabilityOutcome.highRiskUnused,
      disabledUsed: capabilityOutcome.disabledUsed,
      connectorInstallations: connectorOutcome.installations,
      connectorEnabled: connectorOutcome.enabledInstallations,
      connectorGrants: connectorOutcome.grants,
      connectorUsedGrants: connectorOutcome.usedGrants,
      connectorUnusedGrants: connectorOutcome.unusedGrants,
      connectorStaleGrants: connectorOutcome.staleUnusedGrants,
      connectorBlockedAttempts: connectorOutcome.blockedAttempts,
      syncActivity,
      sourcePolicySources,
      scheduledJobs,
      scheduledAttempts,
      remoteJobs,
      remoteRuns,
      barcodeCaptures,
      integrationEvents,
      owners,
      admins,
      members,
      activityEvents
    };
    const evidenceFingerprint = createHash("sha256")
      .update(JSON.stringify(fingerprintPayload))
      .digest("hex");

    const previousResult = await client.query<{
      generated_at: Date;
      activity_events: string;
      used_capability_count: number;
      connector_used_grants: number;
    }>(
      `
        select
          generated_at,activity_events,used_capability_count,connector_used_grants
        from app.workspace_adoption_review_snapshots
        where workspace_id=$1 and evidence_fingerprint<>$2
        order by generated_at desc
        limit 1
      `,
      [workspace.id, evidenceFingerprint]
    );

    await client.query(
      `
        insert into app.workspace_adoption_review_snapshots (
          workspace_id,snapshot_id,evidence_fingerprint,profile_key,
          enabled_capabilities,used_capabilities,unused_enabled_capabilities,
          high_risk_unused_capabilities,disabled_used_capabilities,
          connector_installations,connector_enabled,connector_grants,
          connector_used_grants,connector_unused_grants,connector_stale_grants,
          connector_blocked_attempts,sync_activity,source_policy_sources,
          scheduled_jobs,scheduled_attempts,remote_jobs,remote_runs,
          barcode_captures,integration_events,owners,admins,members,
          activity_events,used_capability_count,created_by,generated_at
        )
        values (
          $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,
          $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
          $25,$26,$27,$28,$29,$30,now()
        )
        on conflict (workspace_id,evidence_fingerprint) do nothing
      `,
      [
        workspace.id,
        randomUUID(),
        evidenceFingerprint,
        workspace.profileKey,
        JSON.stringify(capabilityOutcome.enabled),
        JSON.stringify(capabilityOutcome.used),
        JSON.stringify(capabilityOutcome.unusedEnabled),
        JSON.stringify(capabilityOutcome.highRiskUnused),
        JSON.stringify(capabilityOutcome.disabledUsed),
        connectorOutcome.installations,
        connectorOutcome.enabledInstallations,
        connectorOutcome.grants.length,
        connectorOutcome.usedGrants.length,
        connectorOutcome.unusedGrants.length,
        connectorOutcome.staleUnusedGrants.length,
        connectorOutcome.blockedAttempts,
        syncActivity,
        sourcePolicySources,
        scheduledJobs,
        scheduledAttempts,
        remoteJobs,
        remoteRuns,
        barcodeCaptures,
        integrationEvents,
        owners,
        admins,
        members,
        activityEvents,
        capabilityOutcome.used.length,
        userId
      ]
    );

    const snapshotCountResult = await client.query<{ count: string }>(
      "select count(*)::text as count from app.workspace_adoption_review_snapshots where workspace_id=$1",
      [workspace.id]
    );
    const previous = previousResult.rows[0] ?? null;

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      profileKey: workspace.profileKey,
      profileName: workspace.profileName,
      role: workspace.role,
      activityEvents,
      activity: {
        sync: syncActivity,
        sourcePolicySources,
        scheduledJobs,
        scheduledAttempts,
        remoteJobs,
        remoteRuns,
        barcodeCaptures,
        integrationEvents,
        connectorExecutions: connectorOutcome.executions
      },
      capabilities: capabilityOutcome,
      connectors: connectorOutcome,
      permissions: {
        owners,
        admins,
        members,
        status: permissionOutcome.status,
        recommendations: permissionOutcome.recommendations
      },
      trend: {
        previousSnapshotAt: previous
          ? previous.generated_at.toISOString()
          : null,
        activityEventsDelta: previous
          ? activityEvents - numeric(previous.activity_events)
          : null,
        usedCapabilitiesDelta: previous
          ? capabilityOutcome.used.length - numeric(previous.used_capability_count)
          : null,
        connectorUsedGrantsDelta: previous
          ? connectorOutcome.usedGrants.length -
            numeric(previous.connector_used_grants)
          : null
      },
      snapshotCount: numeric(snapshotCountResult.rows[0]?.count)
    };
  });
}

export async function buildAdoptionReview(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const workspaceReviews = await Promise.all(
    workspaces.map((workspace) => workspaceAdoptionReview(userId, workspace))
  );

  const profiles = new Map<string, AdoptionProfileReview>();
  for (const workspace of workspaceReviews) {
    const existing = profiles.get(workspace.profileKey) ?? {
      profileKey: workspace.profileKey,
      profileName: workspace.profileName,
      workspaces: 0,
      activeWorkspaces: 0,
      activityEvents: 0,
      enabledCapabilitySlots: 0,
      usedCapabilitySlots: 0,
      highRiskUnusedCapabilitySlots: 0,
      connectorInstallations: 0,
      connectorUsedGrants: 0
    };
    existing.workspaces += 1;
    existing.activeWorkspaces += workspace.activityEvents > 0 ? 1 : 0;
    existing.activityEvents += workspace.activityEvents;
    existing.enabledCapabilitySlots += workspace.capabilities.enabled.length;
    existing.usedCapabilitySlots += workspace.capabilities.used.length;
    existing.highRiskUnusedCapabilitySlots +=
      workspace.capabilities.highRiskUnused.length;
    existing.connectorInstallations += workspace.connectors.installations;
    existing.connectorUsedGrants += workspace.connectors.usedGrants.length;
    profiles.set(workspace.profileKey, existing);
  }

  const totals = {
    workspaces: workspaceReviews.length,
    activeWorkspaces: workspaceReviews.filter(
      (workspace) => workspace.activityEvents > 0
    ).length,
    noActivityWorkspaces: workspaceReviews.filter(
      (workspace) => workspace.activityEvents === 0
    ).length,
    reviewSnapshots: workspaceReviews.reduce(
      (total, workspace) => total + workspace.snapshotCount,
      0
    ),
    enabledCapabilities: workspaceReviews.reduce(
      (total, workspace) => total + workspace.capabilities.enabled.length,
      0
    ),
    usedCapabilities: workspaceReviews.reduce(
      (total, workspace) => total + workspace.capabilities.used.length,
      0
    ),
    unusedEnabledCapabilities: workspaceReviews.reduce(
      (total, workspace) => total + workspace.capabilities.unusedEnabled.length,
      0
    ),
    highRiskUnusedCapabilities: workspaceReviews.reduce(
      (total, workspace) => total + workspace.capabilities.highRiskUnused.length,
      0
    ),
    disabledUsedCapabilities: workspaceReviews.reduce(
      (total, workspace) => total + workspace.capabilities.disabledUsed.length,
      0
    ),
    connectorInstallations: workspaceReviews.reduce(
      (total, workspace) => total + workspace.connectors.installations,
      0
    ),
    connectorGrants: workspaceReviews.reduce(
      (total, workspace) => total + workspace.connectors.grants.length,
      0
    ),
    connectorUsedGrants: workspaceReviews.reduce(
      (total, workspace) => total + workspace.connectors.usedGrants.length,
      0
    ),
    connectorUnusedGrants: workspaceReviews.reduce(
      (total, workspace) => total + workspace.connectors.unusedGrants.length,
      0
    ),
    connectorStaleGrants: workspaceReviews.reduce(
      (total, workspace) => total + workspace.connectors.staleUnusedGrants.length,
      0
    ),
    connectorBlockedAttempts: workspaceReviews.reduce(
      (total, workspace) => total + workspace.connectors.blockedAttempts,
      0
    ),
    owners: workspaceReviews.reduce(
      (total, workspace) => total + workspace.permissions.owners,
      0
    ),
    admins: workspaceReviews.reduce(
      (total, workspace) => total + workspace.permissions.admins,
      0
    ),
    members: workspaceReviews.reduce(
      (total, workspace) => total + workspace.permissions.members,
      0
    ),
    permissionReviewWorkspaces: workspaceReviews.filter(
      (workspace) => workspace.permissions.status !== "healthy"
    ).length,
    barcodeWorkspaces: workspaceReviews.filter(
      (workspace) => workspace.activity.barcodeCaptures > 0
    ).length,
    scheduledWorkspaces: workspaceReviews.filter(
      (workspace) =>
        workspace.activity.scheduledJobs > 0 ||
        workspace.activity.scheduledAttempts > 0
    ).length,
    remoteWorkspaces: workspaceReviews.filter(
      (workspace) =>
        workspace.activity.remoteJobs > 0 || workspace.activity.remoteRuns > 0
    ).length,
    integrationWorkspaces: workspaceReviews.filter(
      (workspace) => workspace.activity.integrationEvents > 0
    ).length
  };

  const recommendations: string[] = [];
  if (totals.activeWorkspaces === 0) {
    recommendations.push(
      "No workspace has durable operational adoption yet; keep feature expansion conservative until real usage appears."
    );
  } else {
    recommendations.push(
      "Prioritize further investment in profiles and capabilities with observed durable activity rather than enabled-but-unused surface area."
    );
  }
  if (totals.highRiskUnusedCapabilities > 0) {
    recommendations.push(
      String(totals.highRiskUnusedCapabilities) +
        " high-risk enabled capability slot(s) have no durable usage; review them before expanding automation."
    );
  }
  if (totals.connectorUnusedGrants > 0) {
    recommendations.push(
      String(totals.connectorUnusedGrants) +
        " connector grant(s) have no successful/failed execution evidence; review least privilege manually."
    );
  }
  if (totals.disabledUsedCapabilities > 0) {
    recommendations.push(
      String(totals.disabledUsedCapabilities) +
        " observed capability use(s) conflict with the current profile configuration and require investigation."
    );
  }
  if (totals.permissionReviewWorkspaces === 0) {
    recommendations.push(
      "Current workspace ownership/admin distribution has no measured least-privilege exception."
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    totals,
    profiles: [...profiles.values()].sort(
      (a, b) =>
        b.activityEvents - a.activityEvents ||
        a.profileName.localeCompare(b.profileName)
    ),
    workspaces: workspaceReviews,
    recommendations
  };
}
