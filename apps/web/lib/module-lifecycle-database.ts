import { randomUUID } from "node:crypto";

import {
  buildModuleRollbackPlan,
  buildModuleUpgradePlan,
  moduleLifecycleManagerDescriptor,
  type ModuleMigrationStep,
  type ModuleUpgradePolicy,
  type ModuleUpgradePrerequisites
} from "./module-lifecycle-manager";
import { listWorkspacesForUser, withUserDatabase } from "./database";

type RawRow = Record<string, unknown>;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function dateIso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function nullableIso(value: unknown) {
  return value ? dateIso(value) : null;
}

function evidenceText(value: unknown, code: string) {
  const result = String(value ?? "").trim();
  if (result.length < 8 || result.length > 1000 || /[\0]/.test(result)) {
    throw new Error(code);
  }
  return result;
}

async function requireWorkspaceAdmin(
  client: import("pg").PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  if (!["owner", "admin"].includes(result.rows[0]?.role ?? "")) {
    throw new Error("module_lifecycle_workspace_admin_required");
  }
}

function hostInstanceRow(row: RawRow) {
  return {
    moduleHostInstanceId: String(row.module_host_instance_id),
    enrollmentId: String(row.enrollment_id),
    workspaceId: String(row.workspace_id),
    hostApplicationId: String(row.host_application_id),
    hostInstanceId: String(row.host_instance_id),
    environment: String(row.environment),
    currentVersion: String(row.current_version),
    lastKnownGoodVersion: String(row.last_known_good_version),
    lifecycleState: String(row.lifecycle_state),
    installationEvidence: String(row.installation_evidence),
    observedAt: dateIso(row.observed_at),
    revision: Number(row.revision),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function upgradeRunRow(row: RawRow) {
  return {
    runId: String(row.run_id),
    moduleHostInstanceId: String(row.module_host_instance_id),
    workspaceId: String(row.workspace_id),
    fromVersion: String(row.from_version),
    targetVersion: String(row.target_version),
    lastKnownGoodVersion: String(row.last_known_good_version),
    canary: row.canary === true,
    breakingBoundary: row.breaking_boundary === true,
    compatibilityState: String(row.compatibility_state),
    prerequisites: object(row.prerequisite_snapshot),
    migrations: array(row.migration_plan),
    migrationPlanSha256: String(row.migration_plan_sha256),
    rollback: object(row.rollback_snapshot),
    plan: object(row.plan_snapshot),
    state: String(row.state),
    ownerPolicyAllowsBreaking:
      row.owner_policy_allows_breaking === true,
    ownerDecisionBy: row.owner_decision_by
      ? String(row.owner_decision_by)
      : null,
    ownerDecisionAt: nullableIso(row.owner_decision_at),
    ownerDecisionReason: row.owner_decision_reason
      ? String(row.owner_decision_reason)
      : null,
    outcomeEvidence: row.outcome_evidence
      ? object(row.outcome_evidence)
      : null,
    appliedAt: nullableIso(row.applied_at),
    completedAt: nullableIso(row.completed_at),
    revision: Number(row.revision),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function upgradeEventRow(row: RawRow) {
  return {
    eventId: String(row.event_id),
    runId: String(row.run_id),
    moduleHostInstanceId: String(row.module_host_instance_id),
    workspaceId: String(row.workspace_id),
    revision: Number(row.revision),
    eventType: String(row.event_type),
    details: object(row.details),
    actorUserId: String(row.actor_user_id),
    occurredAt: dateIso(row.occurred_at)
  };
}

async function appendUpgradeEvent(
  client: import("pg").PoolClient,
  userId: string,
  input: {
    runId: string;
    moduleHostInstanceId: string;
    workspaceId: string;
    revision: number;
    eventType:
      | "upgrade-plan-held"
      | "upgrade-plan-ready"
      | "owner-approved"
      | "owner-rejected"
      | "upgrade-applied"
      | "upgrade-failed"
      | "rollback-prepared"
      | "rollback-completed"
      | "stable-version-confirmed";
    details?: Record<string, unknown>;
  }
) {
  const eventId = randomUUID();
  await client.query(
    `insert into app.module_upgrade_events (
      event_id,run_id,module_host_instance_id,owner_user_id,
      workspace_id,revision,event_type,details,actor_user_id
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$4)`,
    [
      eventId,
      input.runId,
      input.moduleHostInstanceId,
      userId,
      input.workspaceId,
      input.revision,
      input.eventType,
      JSON.stringify(input.details ?? {})
    ]
  );
  return eventId;
}

export async function registerInstalledModuleHost(
  userId: string,
  input: {
    enrollmentId: string;
    observedVersion: string;
    installationEvidence: string;
    observedAt?: string | null;
  }
) {
  const installationEvidence = evidenceText(
    input.installationEvidence,
    "module_lifecycle_installation_evidence_invalid"
  );

  return withUserDatabase(userId, async (client) => {
    const enrollment = await client.query(
      `select *
       from app.module_host_enrollments
       where enrollment_id=$1
       for update`,
      [String(input.enrollmentId ?? "")]
    );
    const row = enrollment.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_lifecycle_enrollment_not_found");
    }

    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (
      String(row.state) !== "approved" ||
      !row.package_sha256 ||
      !row.package_generated_at
    ) {
      throw new Error("module_lifecycle_approved_package_required");
    }

    const observedVersion = String(input.observedVersion ?? "").trim();
    if (observedVersion !== String(row.module_version)) {
      throw new Error("module_lifecycle_observed_version_mismatch");
    }

    const observedAt = input.observedAt
      ? new Date(input.observedAt)
      : new Date();
    if (!Number.isFinite(observedAt.getTime())) {
      throw new Error("module_lifecycle_observed_at_invalid");
    }

    const moduleHostInstanceId = randomUUID();
    const result = await client.query(
      `insert into app.module_host_instances (
        module_host_instance_id,enrollment_id,owner_user_id,workspace_id,
        host_application_id,host_instance_id,environment,
        current_version,last_known_good_version,lifecycle_state,
        installation_evidence,observed_at,revision,
        created_by,updated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$8,'installed',$9,$10,1,$3,$3
      )
      on conflict (enrollment_id) do update set
        current_version=excluded.current_version,
        last_known_good_version=excluded.last_known_good_version,
        lifecycle_state='installed',
        installation_evidence=excluded.installation_evidence,
        observed_at=excluded.observed_at,
        revision=app.module_host_instances.revision+1,
        updated_by=$3,
        updated_at=now()
      returning *`,
      [
        moduleHostInstanceId,
        String(row.enrollment_id),
        userId,
        workspaceId,
        String(row.host_application_id),
        String(row.host_instance_id),
        String(row.environment),
        observedVersion,
        installationEvidence,
        observedAt
      ]
    );

    return hostInstanceRow(result.rows[0] as RawRow);
  });
}

export async function prepareModuleUpgrade(
  userId: string,
  input: {
    moduleHostInstanceId: string;
    targetVersion: string;
    canary: boolean;
    prerequisites: ModuleUpgradePrerequisites;
    policy: ModuleUpgradePolicy;
    migrations: ModuleMigrationStep[];
  }
) {
  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select *
       from app.module_host_instances
       where module_host_instance_id=$1
       for update`,
      [String(input.moduleHostInstanceId ?? "")]
    );
    const row = current.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_lifecycle_host_instance_not_found");
    }

    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    const plan = buildModuleUpgradePlan({
      currentVersion: String(row.current_version),
      targetVersion: String(input.targetVersion ?? ""),
      lastKnownGoodVersion: String(row.last_known_good_version),
      canary: input.canary === true,
      prerequisites: input.prerequisites,
      policy: input.policy,
      migrations: input.migrations
    });

    const runId = randomUUID();
    const runState = plan.state;
    const instanceState =
      plan.state === "held"
        ? "upgrade-held"
        : plan.canary
          ? "canary"
          : "upgrade-planned";

    const result = await client.query(
      `insert into app.module_upgrade_runs (
        run_id,module_host_instance_id,owner_user_id,workspace_id,
        from_version,target_version,last_known_good_version,
        canary,breaking_boundary,compatibility_state,
        prerequisite_snapshot,migration_plan,migration_plan_sha256,
        rollback_snapshot,plan_snapshot,state,
        owner_policy_allows_breaking,revision,created_by,updated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11::jsonb,$12::jsonb,$13,$14::jsonb,$15::jsonb,$16,
        $17,1,$3,$3
      )
      returning *`,
      [
        runId,
        String(row.module_host_instance_id),
        userId,
        workspaceId,
        String(row.current_version),
        plan.targetVersion,
        String(row.last_known_good_version),
        plan.canary,
        plan.breakingCompatibilityBoundary,
        plan.state === "held" ? "held" : "pass",
        JSON.stringify(input.prerequisites),
        JSON.stringify(plan.migrations),
        plan.migrationPlanSha256,
        JSON.stringify(plan.rollback),
        JSON.stringify(plan),
        runState,
        input.policy.allowBreakingCompatibilityBoundary === true
      ]
    );

    await client.query(
      `update app.module_host_instances
       set lifecycle_state=$2,
           revision=revision+1,
           updated_by=$3,
           updated_at=now()
       where module_host_instance_id=$1`,
      [String(row.module_host_instance_id), instanceState, userId]
    );

    await appendUpgradeEvent(client, userId, {
      runId,
      moduleHostInstanceId: String(row.module_host_instance_id),
      workspaceId,
      revision: 1,
      eventType:
        plan.state === "held"
          ? "upgrade-plan-held"
          : "upgrade-plan-ready",
      details: {
        targetVersion: plan.targetVersion,
        canary: plan.canary,
        breakingCompatibilityBoundary:
          plan.breakingCompatibilityBoundary,
        heldChecks: plan.checks
          .filter((item) => item.state === "held")
          .map((item) => item.id),
        migrationPlanSha256: plan.migrationPlanSha256,
        automaticExecution: false
      }
    });

    return upgradeRunRow(result.rows[0] as RawRow);
  });
}

export async function decideModuleUpgrade(
  userId: string,
  input: {
    runId: string;
    decision: "approve" | "reject";
    reason: string;
  }
) {
  const reason = String(input.reason ?? "").trim();
  if (reason.length < 3 || reason.length > 500) {
    throw new Error("module_lifecycle_owner_decision_reason_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select *
       from app.module_upgrade_runs
       where run_id=$1
       for update`,
      [String(input.runId ?? "")]
    );
    const row = current.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_lifecycle_upgrade_run_not_found");
    }

    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (
      input.decision === "approve" &&
      String(row.state) !== "ready-for-owner-approval"
    ) {
      throw new Error("module_lifecycle_ready_plan_required");
    }

    if (
      !["ready-for-owner-approval", "held"].includes(String(row.state))
    ) {
      throw new Error("module_lifecycle_owner_decision_state_invalid");
    }

    const revision = Number(row.revision) + 1;
    const nextState =
      input.decision === "approve" ? "approved" : "rejected";
    const result = await client.query(
      `update app.module_upgrade_runs
       set state=$2,
           owner_decision_by=$3,
           owner_decision_at=now(),
           owner_decision_reason=$4,
           revision=$5,
           updated_by=$3,
           updated_at=now()
       where run_id=$1
       returning *`,
      [String(row.run_id), nextState, userId, reason, revision]
    );

    if (input.decision === "reject") {
      await client.query(
        `update app.module_host_instances
         set lifecycle_state='installed',
             revision=revision+1,
             updated_by=$2,
             updated_at=now()
         where module_host_instance_id=$1`,
        [String(row.module_host_instance_id), userId]
      );
    }

    await appendUpgradeEvent(client, userId, {
      runId: String(row.run_id),
      moduleHostInstanceId: String(row.module_host_instance_id),
      workspaceId,
      revision,
      eventType:
        input.decision === "approve"
          ? "owner-approved"
          : "owner-rejected",
      details: {
        reason,
        executionAuthorized: input.decision === "approve",
        automaticExecution: false
      }
    });

    return upgradeRunRow(result.rows[0] as RawRow);
  });
}

export async function recordModuleUpgradeOutcome(
  userId: string,
  input: {
    runId: string;
    outcome: "applied" | "failed";
    evidence: string;
  }
) {
  const evidence = evidenceText(
    input.evidence,
    "module_lifecycle_outcome_evidence_invalid"
  );

  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select *
       from app.module_upgrade_runs
       where run_id=$1
       for update`,
      [String(input.runId ?? "")]
    );
    const row = current.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_lifecycle_upgrade_run_not_found");
    }
    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (String(row.state) !== "approved") {
      throw new Error("module_lifecycle_owner_approval_required");
    }

    const revision = Number(row.revision) + 1;
    const applied = input.outcome === "applied";
    const outcomeEvidence = {
      kind: "owner-recorded-host-outcome",
      evidence,
      observedAt: new Date().toISOString(),
      synthetic: false
    };

    const result = await client.query(
      `update app.module_upgrade_runs
       set state=$2,
           outcome_evidence=$3::jsonb,
           applied_at=case when $2='applied' then now() else null end,
           completed_at=now(),
           revision=$4,
           updated_by=$5,
           updated_at=now()
       where run_id=$1
       returning *`,
      [
        String(row.run_id),
        applied ? "applied" : "failed",
        JSON.stringify(outcomeEvidence),
        revision,
        userId
      ]
    );

    await client.query(
      `update app.module_host_instances
       set current_version=case when $2 then $3 else current_version end,
           lifecycle_state=case when $2 then 'installed' else 'rollback-ready' end,
           revision=revision+1,
           updated_by=$4,
           updated_at=now()
       where module_host_instance_id=$1`,
      [
        String(row.module_host_instance_id),
        applied,
        String(row.target_version),
        userId
      ]
    );

    await appendUpgradeEvent(client, userId, {
      runId: String(row.run_id),
      moduleHostInstanceId: String(row.module_host_instance_id),
      workspaceId,
      revision,
      eventType: applied ? "upgrade-applied" : "upgrade-failed",
      details: {
        evidence,
        targetVersion: String(row.target_version),
        rollbackAvailable: true
      }
    });

    return upgradeRunRow(result.rows[0] as RawRow);
  });
}

export async function prepareModuleRollback(
  userId: string,
  input: { runId: string }
) {
  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select *
       from app.module_upgrade_runs
       where run_id=$1
       for update`,
      [String(input.runId ?? "")]
    );
    const row = current.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_lifecycle_upgrade_run_not_found");
    }
    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (!["applied", "failed"].includes(String(row.state))) {
      throw new Error("module_lifecycle_rollback_state_invalid");
    }

    const rollback = buildModuleRollbackPlan({
      currentVersion:
        String(row.state) === "failed"
          ? String(row.target_version)
          : String(row.target_version),
      lastKnownGoodVersion: String(row.last_known_good_version),
      migrations: array(row.migration_plan) as ModuleMigrationStep[]
    });

    const revision = Number(row.revision) + 1;
    if (rollback.state === "ready") {
      await client.query(
        `update app.module_upgrade_runs
         set state='rollback-prepared',
             rollback_snapshot=$2::jsonb,
             revision=$3,
             updated_by=$4,
             updated_at=now()
         where run_id=$1`,
        [String(row.run_id), JSON.stringify(rollback), revision, userId]
      );
    }

    await appendUpgradeEvent(client, userId, {
      runId: String(row.run_id),
      moduleHostInstanceId: String(row.module_host_instance_id),
      workspaceId,
      revision,
      eventType: "rollback-prepared",
      details: {
        rollback,
        executable: rollback.state === "ready",
        automaticExecution: false
      }
    });

    return rollback;
  });
}

export async function recordModuleRollbackCompleted(
  userId: string,
  input: { runId: string; evidence: string }
) {
  const evidence = evidenceText(
    input.evidence,
    "module_lifecycle_rollback_evidence_invalid"
  );

  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select *
       from app.module_upgrade_runs
       where run_id=$1
       for update`,
      [String(input.runId ?? "")]
    );
    const row = current.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_lifecycle_upgrade_run_not_found");
    }
    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (String(row.state) !== "rollback-prepared") {
      throw new Error("module_lifecycle_rollback_prepare_required");
    }

    const revision = Number(row.revision) + 1;
    const result = await client.query(
      `update app.module_upgrade_runs
       set state='rolled-back',
           completed_at=now(),
           revision=$2,
           outcome_evidence=coalesce(outcome_evidence,'{}'::jsonb)
             || $3::jsonb,
           updated_by=$4,
           updated_at=now()
       where run_id=$1
       returning *`,
      [
        String(row.run_id),
        revision,
        JSON.stringify({
          rollbackEvidence: evidence,
          rollbackObservedAt: new Date().toISOString()
        }),
        userId
      ]
    );

    await client.query(
      `update app.module_host_instances
       set current_version=last_known_good_version,
           lifecycle_state='installed',
           revision=revision+1,
           updated_by=$2,
           updated_at=now()
       where module_host_instance_id=$1`,
      [String(row.module_host_instance_id), userId]
    );

    await appendUpgradeEvent(client, userId, {
      runId: String(row.run_id),
      moduleHostInstanceId: String(row.module_host_instance_id),
      workspaceId,
      revision,
      eventType: "rollback-completed",
      details: {
        evidence,
        restoredVersion: String(row.last_known_good_version)
      }
    });

    return upgradeRunRow(result.rows[0] as RawRow);
  });
}

export async function confirmModuleStableVersion(
  userId: string,
  input: { runId: string; evidence: string }
) {
  const evidence = evidenceText(
    input.evidence,
    "module_lifecycle_stability_evidence_invalid"
  );

  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select *
       from app.module_upgrade_runs
       where run_id=$1
       for update`,
      [String(input.runId ?? "")]
    );
    const row = current.rows[0] as RawRow | undefined;
    if (!row) {
      throw new Error("module_lifecycle_upgrade_run_not_found");
    }
    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (String(row.state) !== "applied") {
      throw new Error("module_lifecycle_applied_upgrade_required");
    }

    await client.query(
      `update app.module_host_instances
       set last_known_good_version=current_version,
           revision=revision+1,
           updated_by=$2,
           updated_at=now()
       where module_host_instance_id=$1
         and current_version=$3`,
      [
        String(row.module_host_instance_id),
        userId,
        String(row.target_version)
      ]
    );

    const revision = Number(row.revision) + 1;
    await client.query(
      `update app.module_upgrade_runs
       set revision=$2,updated_by=$3,updated_at=now()
       where run_id=$1`,
      [String(row.run_id), revision, userId]
    );

    await appendUpgradeEvent(client, userId, {
      runId: String(row.run_id),
      moduleHostInstanceId: String(row.module_host_instance_id),
      workspaceId,
      revision,
      eventType: "stable-version-confirmed",
      details: {
        evidence,
        lastKnownGoodVersion: String(row.target_version)
      }
    });

    return { stableVersion: String(row.target_version), evidence };
  });
}

export async function listModuleLifecycleForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);

  return withUserDatabase(userId, async (client) => {
    const [instances, runs, events, enrollments] = await Promise.all([
      client.query(
        `select *
         from app.module_host_instances
         order by updated_at desc
         limit 200`
      ),
      client.query(
        `select *
         from app.module_upgrade_runs
         order by updated_at desc
         limit 300`
      ),
      client.query(
        `select *
         from app.module_upgrade_events
         order by occurred_at desc
         limit 500`
      ),
      client.query(
        `select
           enrollment_id::text,
           workspace_id::text,
           host_application_id,
           host_instance_id,
           environment,
           module_version,
           state,
           package_sha256,
           package_generated_at
         from app.module_host_enrollments
         where state='approved'
         order by updated_at desc
         limit 200`
      )
    ]);

    return {
      descriptor: moduleLifecycleManagerDescriptor,
      workspaces: workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        role: workspace.role
      })),
      eligibleEnrollments: enrollments.rows.map((row) => ({
        enrollmentId: String(row.enrollment_id),
        workspaceId: String(row.workspace_id),
        hostApplicationId: String(row.host_application_id),
        hostInstanceId: String(row.host_instance_id),
        environment: String(row.environment),
        moduleVersion: String(row.module_version),
        state: String(row.state),
        packageSha256: row.package_sha256
          ? String(row.package_sha256)
          : null,
        packageGeneratedAt: nullableIso(row.package_generated_at)
      })),
      instances: instances.rows.map((row) =>
        hostInstanceRow(row as RawRow)
      ),
      runs: runs.rows.map((row) => upgradeRunRow(row as RawRow)),
      events: events.rows.map((row) =>
        upgradeEventRow(row as RawRow)
      )
    };
  });
}
