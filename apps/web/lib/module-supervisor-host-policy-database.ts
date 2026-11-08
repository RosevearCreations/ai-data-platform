import { randomUUID } from "node:crypto";

import {
  createPolicyBoundSafeHealthGrant,
  evaluateModuleSupervisorHostPolicy,
  normalizeModuleSupervisorHostPolicy,
  validateModuleSupervisorHostScope,
  type ModuleSupervisorGlobalControl,
  type ModuleSupervisorHostPolicy,
  type ModuleSupervisorHostPolicyInput,
  type ModuleSupervisorMaintenanceWindow
} from "./module-supervisor-host-policy";
import type { ModuleSupervisorHostScope } from "./autonomous-module-supervisor";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";

type RawRow = Record<string, unknown>;

const SAFE_GRANT_TTL_MS = 10 * 60 * 1000;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function dateIso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function nullableDateIso(value: unknown) {
  return value ? dateIso(value) : null;
}

function maintenanceWindowFromRow(
  value: unknown
): ModuleSupervisorMaintenanceWindow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const days = Array.isArray(row.daysOfWeekUtc)
    ? row.daysOfWeekUtc.map(Number)
    : [];
  return {
    daysOfWeekUtc: days,
    startMinuteUtc: Number(row.startMinuteUtc ?? 0),
    endMinuteUtc: Number(row.endMinuteUtc ?? 0)
  };
}

function hostFromRow(row: RawRow): ModuleSupervisorHostScope {
  return {
    hostApplicationId: String(row.host_application_id),
    hostInstanceId: String(row.host_instance_id),
    environment: String(row.environment) as ModuleSupervisorHostScope["environment"],
    workspaceId: String(row.workspace_id),
    tenantId: String(row.tenant_id)
  };
}

function policyFromRow(row: RawRow): ModuleSupervisorHostPolicy {
  return {
    schema: "rosevear.ai-data-platform.module-supervisor-host-policy.v1",
    version: "1.0.0",
    host: hostFromRow(row),
    enabled: Boolean(row.enabled),
    killSwitchEngaged: Boolean(row.kill_switch_engaged),
    safeActions: Array.isArray(row.safe_actions)
      ? row.safe_actions.map(String).filter(
          (value): value is "connector-health-retry" =>
            value === "connector-health-retry"
        )
      : [],
    maxCyclesPerHour: Number(row.max_cycles_per_hour),
    maxSafeHealthActionsPerCycle: Number(
      row.max_safe_health_actions_per_cycle
    ),
    maxSafeHealthActionsPerHour: Number(
      row.max_safe_health_actions_per_hour
    ),
    maxSafeHealthActionsPerDay: Number(
      row.max_safe_health_actions_per_day
    ),
    maintenanceWindow: maintenanceWindowFromRow(
      row.maintenance_window
    ),
    policyRevision: Number(row.policy_revision),
    updatedAt: dateIso(row.updated_at)
  };
}

function globalControlFromRow(
  row: RawRow | undefined
): ModuleSupervisorGlobalControl | null {
  if (!row) return null;
  return {
    schema:
      "rosevear.ai-data-platform.module-supervisor-global-control.v1",
    version: "1.0.0",
    emergencyStopEngaged: Boolean(row.emergency_stop_engaged),
    revision: Number(row.revision),
    reason: row.reason ? String(row.reason) : null,
    updatedAt: dateIso(row.updated_at)
  };
}

async function requireAnyOwnerAdmin(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  if (
    !workspaces.some(
      (item) => item.role === "owner" || item.role === "admin"
    )
  ) {
    throw new Error("module_supervisor_owner_admin_required");
  }
  return workspaces;
}

async function requireWorkspaceOwnerAdmin(
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
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("module_supervisor_workspace_admin_required");
  }
}

function policySnapshot(
  policy: ModuleSupervisorHostPolicyInput & {
    host: ModuleSupervisorHostScope;
  }
) {
  return {
    host: policy.host,
    enabled: policy.enabled,
    killSwitchEngaged: policy.killSwitchEngaged,
    safeActions: policy.safeActions,
    maxCyclesPerHour: policy.maxCyclesPerHour,
    maxSafeHealthActionsPerCycle:
      policy.maxSafeHealthActionsPerCycle,
    maxSafeHealthActionsPerHour:
      policy.maxSafeHealthActionsPerHour,
    maxSafeHealthActionsPerDay:
      policy.maxSafeHealthActionsPerDay,
    maintenanceWindow: policy.maintenanceWindow
  };
}

export async function updateModuleSupervisorGlobalStop(
  userId: string,
  input: {
    emergencyStopEngaged: boolean;
    reason: string | null;
  }
) {
  await requireAnyOwnerAdmin(userId);
  const reason = input.reason?.trim() || null;
  if (reason && (reason.length < 3 || reason.length > 240)) {
    throw new Error("module_supervisor_global_stop_reason_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const existing = await client.query(
      `select *
       from app.module_supervisor_global_controls
       where owner_user_id=$1
       for update`,
      [userId]
    );
    const prior = existing.rows[0] as RawRow | undefined;
    const revision = Number(prior?.revision ?? 0) + 1;

    const result = await client.query(
      `insert into app.module_supervisor_global_controls (
        owner_user_id,emergency_stop_engaged,revision,reason,
        updated_by,updated_at
      ) values ($1,$2,$3,$4,$1,now())
      on conflict (owner_user_id) do update set
        emergency_stop_engaged=excluded.emergency_stop_engaged,
        revision=excluded.revision,
        reason=excluded.reason,
        updated_by=excluded.updated_by,
        updated_at=now()
      returning *`,
      [
        userId,
        input.emergencyStopEngaged === true,
        revision,
        reason
      ]
    );

    const control = globalControlFromRow(
      result.rows[0] as RawRow
    );
    if (!control) {
      throw new Error(
        "module_supervisor_global_control_write_failed"
      );
    }

    let action:
      | "created"
      | "emergency-stop-engaged"
      | "emergency-stop-released"
      | "reason-updated" = prior ? "reason-updated" : "created";

    if (prior) {
      const priorEngaged = Boolean(prior.emergency_stop_engaged);
      if (!priorEngaged && control.emergencyStopEngaged) {
        action = "emergency-stop-engaged";
      } else if (
        priorEngaged &&
        !control.emergencyStopEngaged
      ) {
        action = "emergency-stop-released";
      }
    }

    await client.query(
      `insert into app.module_supervisor_global_control_events (
        event_id,owner_user_id,revision,action,control_snapshot,
        actor_user_id
      ) values ($1,$2,$3,$4,$5::jsonb,$2)`,
      [
        randomUUID(),
        userId,
        revision,
        action,
        JSON.stringify(control)
      ]
    );

    return control;
  });
}

export async function upsertModuleSupervisorHostPolicy(
  userId: string,
  input: {
    host: ModuleSupervisorHostScope;
    policy: ModuleSupervisorHostPolicyInput;
  }
) {
  const host = validateModuleSupervisorHostScope(input.host);
  const normalized = normalizeModuleSupervisorHostPolicy(
    input.policy
  );

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceOwnerAdmin(
      client,
      host.workspaceId
    );

    const existing = await client.query(
      `select *
       from app.module_supervisor_host_policies
       where owner_user_id=$1
         and workspace_id=$2
         and host_application_id=$3
         and host_instance_id=$4
         and environment=$5
         and tenant_id=$6
       for update`,
      [
        userId,
        host.workspaceId,
        host.hostApplicationId,
        host.hostInstanceId,
        host.environment,
        host.tenantId
      ]
    );

    const prior = existing.rows[0] as RawRow | undefined;
    const policyId = prior
      ? String(prior.policy_id)
      : randomUUID();
    const revision = Number(prior?.policy_revision ?? 0) + 1;

    const result = await client.query(
      `insert into app.module_supervisor_host_policies (
        policy_id,owner_user_id,workspace_id,host_application_id,
        host_instance_id,environment,tenant_id,enabled,
        kill_switch_engaged,safe_actions,max_cycles_per_hour,
        max_safe_health_actions_per_cycle,
        max_safe_health_actions_per_hour,
        max_safe_health_actions_per_day,maintenance_window,
        policy_revision,updated_by,updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[],$11,$12,$13,$14,
        $15::jsonb,$16,$2,now()
      )
      on conflict (
        owner_user_id,workspace_id,host_application_id,
        host_instance_id,environment,tenant_id
      ) do update set
        enabled=excluded.enabled,
        kill_switch_engaged=excluded.kill_switch_engaged,
        safe_actions=excluded.safe_actions,
        max_cycles_per_hour=excluded.max_cycles_per_hour,
        max_safe_health_actions_per_cycle=
          excluded.max_safe_health_actions_per_cycle,
        max_safe_health_actions_per_hour=
          excluded.max_safe_health_actions_per_hour,
        max_safe_health_actions_per_day=
          excluded.max_safe_health_actions_per_day,
        maintenance_window=excluded.maintenance_window,
        policy_revision=excluded.policy_revision,
        updated_by=excluded.updated_by,
        updated_at=now()
      returning *`,
      [
        policyId,
        userId,
        host.workspaceId,
        host.hostApplicationId,
        host.hostInstanceId,
        host.environment,
        host.tenantId,
        normalized.enabled,
        normalized.killSwitchEngaged,
        normalized.safeActions,
        normalized.maxCyclesPerHour,
        normalized.maxSafeHealthActionsPerCycle,
        normalized.maxSafeHealthActionsPerHour,
        normalized.maxSafeHealthActionsPerDay,
        normalized.maintenanceWindow
          ? JSON.stringify(normalized.maintenanceWindow)
          : null,
        revision
      ]
    );

    const policy = policyFromRow(
      result.rows[0] as RawRow
    );

    let action:
      | "created"
      | "updated"
      | "enabled"
      | "disabled"
      | "kill-switch-engaged"
      | "kill-switch-released" = prior ? "updated" : "created";

    if (prior) {
      if (!Boolean(prior.enabled) && policy.enabled) {
        action = "enabled";
      } else if (Boolean(prior.enabled) && !policy.enabled) {
        action = "disabled";
      } else if (
        !Boolean(prior.kill_switch_engaged) &&
        policy.killSwitchEngaged
      ) {
        action = "kill-switch-engaged";
      } else if (
        Boolean(prior.kill_switch_engaged) &&
        !policy.killSwitchEngaged
      ) {
        action = "kill-switch-released";
      }
    }

    await client.query(
      `insert into app.module_supervisor_host_policy_events (
        event_id,policy_id,owner_user_id,workspace_id,
        policy_revision,action,policy_snapshot,actor_user_id
      ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$3)`,
      [
        randomUUID(),
        policyId,
        userId,
        host.workspaceId,
        revision,
        action,
        JSON.stringify(
          policySnapshot({
            host,
            ...normalized
          })
        )
      ]
    );

    return {
      policyId,
      policy
    };
  });
}

export async function readModuleSupervisorPolicyControlState(
  userId: string,
  input: {
    host: ModuleSupervisorHostScope;
  }
) {
  const host = validateModuleSupervisorHostScope(input.host);
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceOwnerAdmin(client, host.workspaceId);

    const [globalResult, policyResult] = await Promise.all([
      client.query(
        `select *
         from app.module_supervisor_global_controls
         where owner_user_id=$1
         limit 1`,
        [userId]
      ),
      client.query(
        `select *
         from app.module_supervisor_host_policies
         where owner_user_id=$1
           and workspace_id=$2
           and host_application_id=$3
           and host_instance_id=$4
           and environment=$5
           and tenant_id=$6
         limit 1`,
        [
          userId,
          host.workspaceId,
          host.hostApplicationId,
          host.hostInstanceId,
          host.environment,
          host.tenantId
        ]
      )
    ]);

    const globalControl = globalControlFromRow(
      globalResult.rows[0] as RawRow | undefined
    );
    const policyRow = policyResult.rows[0] as RawRow | undefined;
    const policy = policyRow ? policyFromRow(policyRow) : null;

    return {
      emergencyStopEngaged:
        globalControl?.emergencyStopEngaged ?? true,
      globalControlRevision: globalControl?.revision ?? 0,
      policyRevision: policy?.policyRevision ?? 0,
      hostPolicyEnabled: policy?.enabled ?? false,
      hostKillSwitchEngaged:
        policy?.killSwitchEngaged ?? true,
      checkedAt: new Date().toISOString()
    };
  });
}

export async function authorizeModuleSupervisorHostCycle(
  userId: string,
  input: {
    host: ModuleSupervisorHostScope;
    requestSafeHealth: boolean;
  }
) {
  const host = validateModuleSupervisorHostScope(input.host);
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceOwnerAdmin(
      client,
      host.workspaceId
    );

    const globalResult = await client.query(
      `select *
       from app.module_supervisor_global_controls
       where owner_user_id=$1
       for update`,
      [userId]
    );
    const globalControl = globalControlFromRow(
      globalResult.rows[0] as RawRow | undefined
    );

    const policyResult = await client.query(
      `select *
       from app.module_supervisor_host_policies
       where owner_user_id=$1
         and workspace_id=$2
         and host_application_id=$3
         and host_instance_id=$4
         and environment=$5
         and tenant_id=$6
       for update`,
      [
        userId,
        host.workspaceId,
        host.hostApplicationId,
        host.hostInstanceId,
        host.environment,
        host.tenantId
      ]
    );

    const policyRow = policyResult.rows[0] as
      | RawRow
      | undefined;
    const policy = policyRow
      ? policyFromRow(policyRow)
      : null;

    let usage = {
      cyclesLastHour: 0,
      safeHealthActionsReservedLastHour: 0,
      safeHealthActionsReservedLastDay: 0
    };

    if (policyRow) {
      const usageResult = await client.query<{
        cycles_last_hour: string;
        safe_last_hour: string;
        safe_last_day: string;
      }>(
        `select
          coalesce(sum(cycle_quantity) filter (
            where reserved_at>=now()-interval '1 hour'
          ),0)::text as cycles_last_hour,
          coalesce(sum(safe_health_quantity) filter (
            where reserved_at>=now()-interval '1 hour'
          ),0)::text as safe_last_hour,
          coalesce(sum(safe_health_quantity) filter (
            where reserved_at>=now()-interval '1 day'
          ),0)::text as safe_last_day
         from app.module_supervisor_budget_reservations
         where policy_id=$1`,
        [String(policyRow.policy_id)]
      );
      usage = {
        cyclesLastHour: Number(
          usageResult.rows[0]?.cycles_last_hour ?? 0
        ),
        safeHealthActionsReservedLastHour: Number(
          usageResult.rows[0]?.safe_last_hour ?? 0
        ),
        safeHealthActionsReservedLastDay: Number(
          usageResult.rows[0]?.safe_last_day ?? 0
        )
      };
    }

    const evaluatedAt = new Date().toISOString();
    const decision = evaluateModuleSupervisorHostPolicy({
      host,
      policy,
      globalControl,
      usage,
      requestSafeHealth: input.requestSafeHealth,
      now: evaluatedAt
    });

    if (
      !decision.cycleAuthorized ||
      !policyRow ||
      !policy ||
      !globalControl
    ) {
      return {
        decision,
        reservationId: null,
        safeHealthGrant: null
      };
    }

    const reservationId = randomUUID();
    const grantExpiresAt = decision.safeHealthAuthorized
      ? new Date(
          Date.parse(evaluatedAt) + SAFE_GRANT_TTL_MS
        ).toISOString()
      : null;

    await client.query(
      `insert into app.module_supervisor_budget_reservations (
        reservation_id,policy_id,owner_user_id,workspace_id,
        policy_revision,global_control_revision,cycle_quantity,
        safe_health_quantity,decision_reason,reserved_at,
        grant_expires_at
      ) values ($1,$2,$3,$4,$5,$6,1,$7,$8,$9,$10)`,
      [
        reservationId,
        String(policyRow.policy_id),
        userId,
        host.workspaceId,
        policy.policyRevision,
        globalControl.revision,
        decision.maximumSafeHealthActions,
        decision.reason,
        evaluatedAt,
        grantExpiresAt
      ]
    );

    const safeHealthGrant =
      decision.safeHealthAuthorized && grantExpiresAt
        ? createPolicyBoundSafeHealthGrant({
            decision,
            grantId: "grant_" + randomUUID(),
            ownerPolicyEvidenceId:
              "policy:" +
              String(policyRow.policy_id) +
              ":revision:" +
              String(policy.policyRevision),
            expiresAt: grantExpiresAt
          })
        : null;

    return {
      decision,
      reservationId,
      safeHealthGrant
    };
  });
}

export async function listModuleSupervisorPoliciesForUser(
  userId: string
) {
  const workspaces = await listWorkspacesForUser(userId);
  const canManage = workspaces.some(
    (item) => item.role === "owner" || item.role === "admin"
  );

  return withUserDatabase(userId, async (client) => {
    const [globalResult, policiesResult, policyEventsResult, globalEventsResult, reservationsResult] =
      await Promise.all([
        client.query(
          `select *
           from app.module_supervisor_global_controls
           where owner_user_id=$1`,
          [userId]
        ),
        client.query(
          `select *
           from app.module_supervisor_host_policies
           where owner_user_id=$1
           order by updated_at desc
           limit 200`,
          [userId]
        ),
        client.query(
          `select *
           from app.module_supervisor_host_policy_events
           where owner_user_id=$1
           order by occurred_at desc
           limit 300`,
          [userId]
        ),
        client.query(
          `select *
           from app.module_supervisor_global_control_events
           where owner_user_id=$1
           order by occurred_at desc
           limit 100`,
          [userId]
        ),
        client.query(
          `select *
           from app.module_supervisor_budget_reservations
           where owner_user_id=$1
             and reserved_at>=now()-interval '1 day'
           order by reserved_at desc
           limit 500`,
          [userId]
        )
      ]);

    return {
      schema:
        "rosevear.ai-data-platform.module-supervisor-policy-center.v1" as const,
      build: 326 as const,
      generatedAt: new Date().toISOString(),
      canManage,
      globalControl:
        globalControlFromRow(
          globalResult.rows[0] as RawRow | undefined
        ) ?? {
          schema:
            "rosevear.ai-data-platform.module-supervisor-global-control.v1" as const,
          version: "1.0.0" as const,
          emergencyStopEngaged: true,
          revision: 0,
          reason: "missing-control-fails-closed",
          updatedAt: null
        },
      policies: policiesResult.rows.map((row) => ({
        policyId: String(row.policy_id),
        policy: policyFromRow(row as RawRow)
      })),
      policyEvents: policyEventsResult.rows.map((row) => ({
        eventId: String(row.event_id),
        policyId: String(row.policy_id),
        workspaceId: String(row.workspace_id),
        policyRevision: Number(row.policy_revision),
        action: String(row.action),
        policySnapshot: object(row.policy_snapshot),
        occurredAt: dateIso(row.occurred_at)
      })),
      globalEvents: globalEventsResult.rows.map((row) => ({
        eventId: String(row.event_id),
        revision: Number(row.revision),
        action: String(row.action),
        controlSnapshot: object(row.control_snapshot),
        occurredAt: dateIso(row.occurred_at)
      })),
      reservations: reservationsResult.rows.map((row) => ({
        reservationId: String(row.reservation_id),
        policyId: String(row.policy_id),
        workspaceId: String(row.workspace_id),
        policyRevision: Number(row.policy_revision),
        globalControlRevision: Number(
          row.global_control_revision
        ),
        cycleQuantity: Number(row.cycle_quantity),
        safeHealthQuantity: Number(row.safe_health_quantity),
        decisionReason: String(row.decision_reason),
        reservedAt: dateIso(row.reserved_at),
        grantExpiresAt: nullableDateIso(row.grant_expires_at)
      })),
      workspaces: workspaces
        .filter(
          (item) =>
            item.role === "owner" || item.role === "admin"
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          role: item.role
        })),
      boundaries: {
        missingGlobalControlEngagesEmergencyStop: true as const,
        missingHostPolicyBlocksCycle: true as const,
        globalStopOverridesHostPolicy: true as const,
        reservationsAreConservative: true as const,
        safeHealthOnly: true as const,
        consequentialPeerMutationAutomatic: false as const
      }
    };
  });
}
