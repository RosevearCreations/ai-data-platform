import { randomUUID } from "node:crypto";

import {
  buildProductionLearningVII,
  productionLearningVIIDescriptor,
  type ProductionLearningVIIInput
} from "./production-learning-vii";
import { listAutonomousOperationsForUser } from "./autonomous-operations-database";
import { listCrossHostCertificationForUser } from "./cross-host-certification-database";
import { listIntegrationRecoveryForUser } from "./integration-recovery-database";
import { listModuleLifecycleForUser } from "./module-lifecycle-database";
import { listModuleSupervisorPoliciesForUser } from "./module-supervisor-host-policy-database";
import { buildProductionLearningReview } from "./production-learning-database";
import { listWorkspacesForUser, withUserDatabase } from "./database";

type RawRow = Record<string, unknown>;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function dateIso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function snapshotRow(row: RawRow) {
  return {
    snapshotId: String(row.snapshot_id),
    overallState: String(row.overall_state) as
      | "healthy"
      | "attention"
      | "blocked",
    installedHosts: Number(row.installed_hosts ?? 0),
    liveCertifiedHosts: Number(row.live_certified_hosts ?? 0),
    upgradeRuns: Number(row.upgrade_runs ?? 0),
    autonomousCycles: Number(row.autonomous_cycles ?? 0),
    recoveryPlans: Number(row.recovery_plans ?? 0),
    blockerCount: Number(row.blocker_count ?? 0),
    attentionCount: Number(row.attention_count ?? 0),
    candidateCount: Number(row.candidate_count ?? 0),
    evidence: object(row.evidence_snapshot),
    model: object(row.model_snapshot),
    generatedAt: dateIso(row.generated_at)
  };
}

function candidateRow(row: RawRow) {
  return {
    candidateId: String(row.candidate_id),
    snapshotId: String(row.snapshot_id),
    priority: String(row.priority) as "P0" | "P1" | "P2",
    area: String(row.area),
    title: String(row.title),
    rationale: String(row.rationale),
    evidence: String(row.evidence),
    sourceHref: String(row.source_href),
    state: "candidate" as const,
    numberedBuild: null,
    createdAt: dateIso(row.created_at)
  };
}

async function requireOwnerAdmin(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  if (!workspaces.some(
    item => item.role === "owner" || item.role === "admin"
  )) {
    throw new Error("production_learning_vii_owner_admin_required");
  }
  return workspaces;
}

async function activityEvidence(userId: string) {
  return withUserDatabase(userId, async (client) => {
    const [eventResult, workflowResult, connectorResult] =
      await Promise.all([
        client.query<{ count: string }>(
          "select count(*)::text as count from app.event_bus_publications"
        ),
        client.query<{ count: string }>(
          "select count(*)::text as count from app.workflow_automation_action_intents"
        ),
        client.query<{
          succeeded: string;
          failed: string;
        }>(
          `select
             count(*) filter (where status='succeeded')::text as succeeded,
             count(*) filter (where status='failed')::text as failed
           from app.workspace_connector_audit`
        )
      ]);

    return {
      eventPublications: Number(eventResult.rows[0]?.count ?? 0),
      workflowIntents: Number(workflowResult.rows[0]?.count ?? 0),
      connectorSucceeded: Number(
        connectorResult.rows[0]?.succeeded ?? 0
      ),
      connectorFailed: Number(
        connectorResult.rows[0]?.failed ?? 0
      )
    };
  });
}

function latestCertificationRuns(
  runs: Array<{
    moduleHostInstanceId: string;
    liveCertified: boolean;
    fixtureCertified: boolean;
    overallOutcome: string;
    healthState: string;
  }>
) {
  const seen = new Set<string>();
  return runs.filter((run) => {
    if (seen.has(run.moduleHostInstanceId)) return false;
    seen.add(run.moduleHostInstanceId);
    return true;
  });
}

async function currentProductionLearningVII(userId: string) {
  const [
    learning,
    autonomy,
    hostPolicies,
    lifecycle,
    certification,
    recovery,
    activity
  ] = await Promise.all([
    buildProductionLearningReview(userId),
    listAutonomousOperationsForUser(userId),
    listModuleSupervisorPoliciesForUser(userId),
    listModuleLifecycleForUser(userId),
    listCrossHostCertificationForUser(userId),
    listIntegrationRecoveryForUser(userId),
    activityEvidence(userId)
  ]);

  const latestRuns = latestCertificationRuns(
    certification.runs.map((run) => ({
      moduleHostInstanceId: run.moduleHostInstanceId,
      liveCertified: run.liveCertified,
      fixtureCertified: run.fixtureCertified,
      overallOutcome: run.overallOutcome,
      healthState: run.healthState
    }))
  );

  const tenantAssertions = certification.assertions.filter(
    item =>
      item.dimension === "tenant" &&
      item.synthetic === false
  );
  const offlineAssertions = certification.assertions.filter(
    item =>
      item.dimension === "offline" &&
      item.synthetic === false
  );
  const searchAssertions = certification.assertions.filter(
    item =>
      item.dimension === "search" &&
      item.synthetic === false
  );

  const lifecycleStates = lifecycle.runs.map(item => item.state);
  const cycles = autonomy.cycles;

  const evidence: ProductionLearningVIIInput = {
    installedHosts: lifecycle.instances.length,
    capabilities: {
      enabled: learning.evidence.adoption.enabledCapabilities,
      used: learning.evidence.adoption.usedCapabilities,
      unusedEnabled:
        learning.evidence.adoption.unusedEnabledCapabilities,
      highRiskUnused:
        learning.evidence.adoption.highRiskUnusedCapabilities,
      disabledUsed:
        learning.evidence.adoption.disabledUsedCapabilities
    },
    certification: {
      latestHosts: latestRuns.length,
      liveCertified: latestRuns.filter(item => item.liveCertified).length,
      fixtureCertified: latestRuns.filter(
        item => item.fixtureCertified
      ).length,
      failed: latestRuns.filter(
        item => item.overallOutcome === "failed"
      ).length,
      blocked: latestRuns.filter(
        item => item.overallOutcome === "blocked"
      ).length,
      unhealthy: latestRuns.filter(
        item => item.healthState === "unhealthy"
      ).length,
      degraded: latestRuns.filter(
        item => item.healthState === "degraded"
      ).length,
      unknown: latestRuns.filter(
        item => item.healthState === "unknown"
      ).length
    },
    lifecycle: {
      upgradeRuns: lifecycle.runs.length,
      applied: lifecycleStates.filter(item => item === "applied").length,
      failed: lifecycleStates.filter(item => item === "failed").length,
      rollbackPrepared: lifecycleStates.filter(
        item => item === "rollback-prepared"
      ).length,
      rolledBack: lifecycleStates.filter(
        item => item === "rolled-back"
      ).length
    },
    autonomy: {
      cycles: cycles.length,
      completed: cycles.filter(item => item.state === "completed").length,
      blocked: cycles.filter(item => item.state === "blocked").length,
      failed: cycles.filter(item => item.state === "failed").length,
      safeRecoveriesExecuted: cycles.reduce(
        (sum, item) => sum + item.safeRecoveriesExecuted,
        0
      ),
      safeRecoveriesSucceeded: cycles.reduce(
        (sum, item) => sum + item.safeRecoveriesSucceeded,
        0
      ),
      safeRecoveriesFailed: cycles.reduce(
        (sum, item) => sum + item.safeRecoveriesFailed,
        0
      )
    },
    recovery: {
      total: recovery.summary.total,
      recovered: recovery.summary.recovered,
      failedAttempts: recovery.plans.reduce(
        (sum, plan) =>
          sum +
          plan.attempts.filter(
            attempt => attempt.outcome === "failed"
          ).length,
        0
      ),
      approvalRequired: recovery.summary.approvalRequired,
      exhausted: recovery.summary.exhausted,
      notRetryable: recovery.summary.notRetryable
    },
    tenantIsolation: {
      livePass: tenantAssertions.filter(
        item => item.outcome === "pass"
      ).length,
      liveFail: tenantAssertions.filter(
        item => item.outcome === "fail"
      ).length,
      liveBlocked: tenantAssertions.filter(
        item => item.outcome === "blocked"
      ).length
    },
    activity: {
      eventPublications: activity.eventPublications,
      workflowIntents: activity.workflowIntents,
      liveSearchEvidencePass: searchAssertions.filter(
        item => item.outcome === "pass"
      ).length
    },
    health: {
      connectorSucceeded: activity.connectorSucceeded,
      connectorFailed: activity.connectorFailed,
      offlineLivePass: offlineAssertions.filter(
        item => item.outcome === "pass"
      ).length,
      offlineLiveFail: offlineAssertions.filter(
        item => item.outcome === "fail"
      ).length,
      offlineLiveBlocked: offlineAssertions.filter(
        item => item.outcome === "blocked"
      ).length,
      relayRuntimeEvidenceCount: 0
    },
    ownerPolicy: {
      globalPolicyConfigured:
        hostPolicies.globalControl.revision > 0,
      globalEmergencyStopEngaged:
        hostPolicies.globalControl.emergencyStopEngaged,
      hostPolicies: hostPolicies.policies.length,
      enabledHostPolicies: hostPolicies.policies.filter(
        item => item.policy.enabled
      ).length,
      hostKillSwitchesEngaged: hostPolicies.policies.filter(
        item => item.policy.killSwitchEngaged
      ).length,
      reservations24h: hostPolicies.reservations.length,
      policyEvents:
        hostPolicies.policyEvents.length +
        hostPolicies.globalEvents.length +
        autonomy.policyEvents.length
    },
    existingLearningFindings: learning.findings.map(item => ({
      key: item.key,
      category: item.category,
      status: item.status,
      title: item.title,
      evidence: item.evidence,
      action: item.action
    }))
  };

  return buildProductionLearningVII(evidence);
}

async function persistProductionLearningVII(
  userId: string,
  model: ReturnType<typeof buildProductionLearningVII>
) {
  return withUserDatabase(userId, async (client) => {
    const snapshotId = randomUUID();
    await client.query(
      `insert into app.production_learning_vii_snapshots (
        snapshot_id,owner_user_id,overall_state,installed_hosts,
        live_certified_hosts,upgrade_runs,autonomous_cycles,
        recovery_plans,blocker_count,attention_count,candidate_count,
        evidence_snapshot,model_snapshot,generated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$2
      )`,
      [
        snapshotId,
        userId,
        model.overallState,
        model.summary.installedHosts,
        model.summary.liveCertifiedHosts,
        model.summary.upgradeRuns,
        model.summary.autonomousCycles,
        model.summary.recoveryPlans,
        model.summary.blockers,
        model.summary.attention,
        model.summary.candidateCount,
        JSON.stringify(model.evidence),
        JSON.stringify(model)
      ]
    );

    for (const item of model.candidates) {
      await client.query(
        `insert into app.production_learning_vii_candidates (
          candidate_id,snapshot_id,owner_user_id,priority,area,title,
          rationale,evidence,source_href,state,numbered_build
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,'candidate',null
        )`,
        [
          randomUUID(),
          snapshotId,
          userId,
          item.priority,
          item.area,
          item.title,
          item.rationale,
          item.evidence,
          item.sourceHref
        ]
      );
    }

    return {
      snapshotId,
      candidateCount: model.candidates.length
    };
  });
}

export async function refreshProductionLearningVII(
  userId: string
) {
  await requireOwnerAdmin(userId);
  const model = await currentProductionLearningVII(userId);
  const persisted = await persistProductionLearningVII(
    userId,
    model
  );
  return {
    ...persisted,
    model,
    numberedNextBatchAuthorized: false as const,
    nextBuildNumber: null
  };
}

export async function listProductionLearningVIIForUser(
  userId: string
) {
  const workspaces = await listWorkspacesForUser(userId);
  const canManage = workspaces.some(
    item => item.role === "owner" || item.role === "admin"
  );
  const [live, persisted] = await Promise.all([
    currentProductionLearningVII(userId),
    withUserDatabase(userId, async (client) => {
      const [snapshots, candidates] = await Promise.all([
        client.query(
          `select *
           from app.production_learning_vii_snapshots
           where owner_user_id=$1
           order by generated_at desc
           limit 30`,
          [userId]
        ),
        client.query(
          `select *
           from app.production_learning_vii_candidates
           where owner_user_id=$1
           order by created_at desc
           limit 360`,
          [userId]
        )
      ]);
      return {
        snapshots: snapshots.rows.map(row =>
          snapshotRow(row as RawRow)
        ),
        candidates: candidates.rows.map(row =>
          candidateRow(row as RawRow)
        )
      };
    })
  ]);

  const latestSnapshot = persisted.snapshots[0] ?? null;
  const latestCandidates = latestSnapshot
    ? persisted.candidates.filter(
        item => item.snapshotId === latestSnapshot.snapshotId
      )
    : [];

  return {
    descriptor: productionLearningVIIDescriptor,
    generatedAt: new Date().toISOString(),
    canManage,
    live,
    snapshots: persisted.snapshots,
    latestSnapshot,
    latestCandidates,
    boundaries: {
      refreshIsEvidenceCaptureOnly: true as const,
      candidateExecutesWork: false as const,
      candidateAssignsBuildNumber: false as const,
      ownerAuthorizationRequiredForFutureBatch: true as const,
      autonomousActionEnvelopeExpanded: false as const,
      ql266Resumed: false as const
    }
  };
}
