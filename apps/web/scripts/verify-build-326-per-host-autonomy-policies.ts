import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  createPolicyBoundSafeHealthGrant,
  evaluateModuleSupervisorHostPolicy,
  moduleSupervisorHostPolicyDescriptor,
  normalizeModuleSupervisorHostPolicy,
  type ModuleSupervisorGlobalControl,
  type ModuleSupervisorHostPolicy
} from "../lib/module-supervisor-host-policy";
import {
  runAutonomousModuleSupervisorCycle,
  type ModuleSupervisorHostScope,
  type ModuleSupervisorRecoveryOpportunity
} from "../lib/autonomous-module-supervisor";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const host: ModuleSupervisorHostScope = {
  hostApplicationId: "rosevear.icamp",
  hostInstanceId: "host-build326-primary",
  environment: "production",
  workspaceId: "workspace-build326",
  tenantId: "tenant-build326"
};

const releasedGlobal: ModuleSupervisorGlobalControl = {
  schema:
    "rosevear.ai-data-platform.module-supervisor-global-control.v1",
  version: "1.0.0",
  emergencyStopEngaged: false,
  revision: 4,
  reason: "approved production autonomy window",
  updatedAt: "2026-11-08T12:00:00.000Z"
};

function policy(
  overrides: Partial<ModuleSupervisorHostPolicy> = {}
): ModuleSupervisorHostPolicy {
  return {
    schema:
      "rosevear.ai-data-platform.module-supervisor-host-policy.v1",
    version: "1.0.0",
    host,
    enabled: true,
    killSwitchEngaged: false,
    safeActions: ["connector-health-retry"],
    maxCyclesPerHour: 4,
    maxSafeHealthActionsPerCycle: 3,
    maxSafeHealthActionsPerHour: 8,
    maxSafeHealthActionsPerDay: 20,
    maintenanceWindow: null,
    policyRevision: 7,
    updatedAt: "2026-11-08T12:00:00.000Z",
    ...overrides
  };
}

function usage(overrides?: Partial<{
  cyclesLastHour: number;
  safeHealthActionsReservedLastHour: number;
  safeHealthActionsReservedLastDay: number;
}>) {
  return {
    cyclesLastHour: 0,
    safeHealthActionsReservedLastHour: 0,
    safeHealthActionsReservedLastDay: 0,
    ...overrides
  };
}

function recovery(
  suffix: string
): ModuleSupervisorRecoveryOpportunity {
  return {
    planId: "plan-build326-" + suffix,
    evidenceId: "evidence-build326-" + suffix,
    hostApplicationId: host.hostApplicationId,
    hostInstanceId: host.hostInstanceId,
    workspaceId: host.workspaceId,
    tenantId: host.tenantId,
    environment: host.environment,
    action: "connector-health-retry",
    method: "GET",
    state: "ready",
    autoExecutionAllowed: true,
    expiresAt: "2026-11-08T14:00:00.000Z"
  };
}

async function main() {
  const missingGlobal = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy(),
    globalControl: null,
    usage: usage(),
    requestSafeHealth: true,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(missingGlobal.state, "blocked");
  assert.equal(missingGlobal.reason, "global-emergency-stop");
  assert.equal(missingGlobal.cycleAuthorized, false);

  const engagedGlobal = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy(),
    globalControl: {
      ...releasedGlobal,
      emergencyStopEngaged: true,
      revision: 5
    },
    usage: usage(),
    requestSafeHealth: true,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(engagedGlobal.reason, "global-emergency-stop");

  const missingPolicy = evaluateModuleSupervisorHostPolicy({
    host,
    policy: null,
    globalControl: releasedGlobal,
    usage: usage(),
    requestSafeHealth: false,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(missingPolicy.reason, "host-policy-missing");

  const disabled = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy({ enabled: false }),
    globalControl: releasedGlobal,
    usage: usage(),
    requestSafeHealth: false,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(disabled.reason, "host-policy-disabled");

  const killed = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy({ killSwitchEngaged: true }),
    globalControl: releasedGlobal,
    usage: usage(),
    requestSafeHealth: false,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(killed.reason, "host-kill-switch-engaged");

  const outsideWindow = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy({
      maintenanceWindow: {
        daysOfWeekUtc: [0],
        startMinuteUtc: 60,
        endMinuteUtc: 120
      }
    }),
    globalControl: releasedGlobal,
    usage: usage(),
    requestSafeHealth: false,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(outsideWindow.reason, "outside-maintenance-window");

  const overnightWindow = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy({
      maintenanceWindow: {
        daysOfWeekUtc: [0],
        startMinuteUtc: 1380,
        endMinuteUtc: 60
      }
    }),
    globalControl: releasedGlobal,
    usage: usage(),
    requestSafeHealth: true,
    now: "2026-11-09T00:30:00.000Z"
  });
  assert.equal(overnightWindow.state, "safe-health");

  const cycleBudget = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy({ maxCyclesPerHour: 2 }),
    globalControl: releasedGlobal,
    usage: usage({ cyclesLastHour: 2 }),
    requestSafeHealth: false,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(cycleBudget.reason, "cycle-budget-exhausted");

  const observeOnly = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy(),
    globalControl: releasedGlobal,
    usage: usage(),
    requestSafeHealth: false,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(observeOnly.state, "observe-only");
  assert.equal(observeOnly.cycleAuthorized, true);

  const actionNotAllowed = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy({
      safeActions: [],
      maxSafeHealthActionsPerCycle: 0,
      maxSafeHealthActionsPerHour: 0,
      maxSafeHealthActionsPerDay: 0
    }),
    globalControl: releasedGlobal,
    usage: usage(),
    requestSafeHealth: true,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(
    actionNotAllowed.reason,
    "safe-action-not-allowed"
  );

  const recoveryBudget = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy({
      maxSafeHealthActionsPerHour: 3
    }),
    globalControl: releasedGlobal,
    usage: usage({
      safeHealthActionsReservedLastHour: 3
    }),
    requestSafeHealth: true,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(
    recoveryBudget.reason,
    "safe-health-budget-exhausted"
  );

  const authorized = evaluateModuleSupervisorHostPolicy({
    host,
    policy: policy({
      maxSafeHealthActionsPerCycle: 3,
      maxSafeHealthActionsPerHour: 4,
      maxSafeHealthActionsPerDay: 10
    }),
    globalControl: releasedGlobal,
    usage: usage({
      safeHealthActionsReservedLastHour: 3,
      safeHealthActionsReservedLastDay: 7
    }),
    requestSafeHealth: true,
    now: "2026-11-08T13:00:00.000Z"
  });
  assert.equal(authorized.state, "safe-health");
  assert.equal(authorized.safeHealthAuthorized, true);
  assert.equal(authorized.maximumSafeHealthActions, 1);
  assert.equal(
    authorized.boundaries.globalStopOverridesHostPolicy,
    true
  );
  assert.equal(
    authorized.boundaries.peerMutationAuthorized,
    false
  );

  const grant = createPolicyBoundSafeHealthGrant({
    decision: authorized,
    ownerPolicyEvidenceId:
      "policy-build326-host-primary-revision-7",
    grantId: "grant-build326-policy-bound",
    expiresAt: "2026-11-08T13:10:00.000Z"
  });
  assert.equal(grant.maximumActions, 1);
  assert.deepEqual(grant.allowedMethods, ["GET", "HEAD"]);
  assert.deepEqual(grant.policyBinding, {
    policyRevision: 7,
    globalControlRevision: 4
  });
  assert.equal(
    grant.consequentialPeerMutationAuthorized,
    false
  );

  let executions = 0;
  const supervisor = await runAutonomousModuleSupervisorCycle({
    host,
    now: "2026-11-08T13:01:00.000Z",
    certification: {
      evidenceId: "cert-evidence-build326",
      runId: "cert-run-build326",
      ...host,
      outcome: "passed",
      passed: 5,
      failed: 0,
      blocked: 0,
      refreshedAt: "2026-11-08T13:00:30.000Z"
    },
    healthObservations: [],
    freshnessEvidence: [],
    recoveryOpportunities: [
      recovery("one"),
      recovery("two")
    ],
    safeHealthGrant: grant,
    policyControlVerifier: {
      async verify() {
        return {
          emergencyStopEngaged: false,
          globalControlRevision: 4,
          policyRevision: 7,
          hostPolicyEnabled: true,
          hostKillSwitchEngaged: false,
          checkedAt: "2026-11-08T13:01:15.000Z"
        };
      }
    },
    safeHealthExecutor: {
      async execute(input) {
        executions += 1;
        return {
          planId: input.plan.planId,
          method: input.plan.method === "HEAD" ? "HEAD" : "GET",
          state: "healthy",
          evidenceId:
            "execution-build326-" + String(executions),
          checkedAt: "2026-11-08T13:01:30.000Z",
          connectionActivated: false,
          peerMutationExecuted: false,
          credentialMutationExecuted: false,
          eventReplayExecuted: false
        };
      }
    }
  });
  assert.equal(executions, 1);
  assert.equal(supervisor.recovery.executed, 1);
  assert.ok(
    supervisor.workItems.some(
      (item) =>
        item.reason ===
        "supervisor-safe-health-cycle-cap-reached"
    )
  );

  let revokedExecutions = 0;
  const revoked = await runAutonomousModuleSupervisorCycle({
    host,
    now: "2026-11-08T13:02:00.000Z",
    certification: {
      evidenceId: "cert-evidence-build326-revoked",
      runId: "cert-run-build326-revoked",
      ...host,
      outcome: "passed",
      passed: 5,
      failed: 0,
      blocked: 0,
      refreshedAt: "2026-11-08T13:01:30.000Z"
    },
    healthObservations: [],
    freshnessEvidence: [],
    recoveryOpportunities: [recovery("revoked")],
    safeHealthGrant: grant,
    policyControlVerifier: {
      async verify() {
        return {
          emergencyStopEngaged: true,
          globalControlRevision: 5,
          policyRevision: 7,
          hostPolicyEnabled: true,
          hostKillSwitchEngaged: false,
          checkedAt: "2026-11-08T13:02:05.000Z"
        };
      }
    },
    safeHealthExecutor: {
      async execute(input) {
        revokedExecutions += 1;
        return {
          planId: input.plan.planId,
          method: "GET",
          state: "healthy",
          evidenceId: "execution-build326-revoked",
          checkedAt: "2026-11-08T13:02:10.000Z",
          connectionActivated: false,
          peerMutationExecuted: false,
          credentialMutationExecuted: false,
          eventReplayExecuted: false
        };
      }
    }
  });
  assert.equal(revokedExecutions, 0);
  assert.equal(revoked.recovery.executed, 0);
  assert.ok(
    revoked.workItems.some(
      (item) =>
        item.reason ===
        "module_supervisor_policy_bound_grant_revoked"
    )
  );

  await assert.rejects(
    async () =>
      evaluateModuleSupervisorHostPolicy({
        host,
        policy: policy({
          host: {
            ...host,
            hostInstanceId: "host-build326-other"
          }
        }),
        globalControl: releasedGlobal,
        usage: usage(),
        requestSafeHealth: true,
        now: "2026-11-08T13:00:00.000Z"
      }),
    /module_supervisor_policy_scope_mismatch/
  );

  assert.throws(
    () =>
      evaluateModuleSupervisorHostPolicy({
        host,
        policy: policy(),
        globalControl: releasedGlobal,
        usage: usage({ cyclesLastHour: -1 }),
        requestSafeHealth: false,
        now: "2026-11-08T13:00:00.000Z"
      }),
    /module_supervisor_policy_usage_invalid/
  );

  assert.throws(
    () =>
      normalizeModuleSupervisorHostPolicy({
        enabled: true,
        killSwitchEngaged: false,
        safeActions: [],
        maxCyclesPerHour: 1,
        maxSafeHealthActionsPerCycle: 0,
        maxSafeHealthActionsPerHour: 0,
        maxSafeHealthActionsPerDay: 0,
        maintenanceWindow: {
          daysOfWeekUtc: [1],
          startMinuteUtc: 2000,
          endMinuteUtc: 100
        }
      }),
    /module_supervisor_maintenance_window_invalid/
  );

  const descriptor = moduleSupervisorHostPolicyDescriptor();
  assert.equal(
    descriptor.defaults.globalEmergencyStopEngagedWhenMissing,
    true
  );
  assert.equal(
    descriptor.security.missingHostPolicyFailsClosed,
    true
  );
  assert.equal(
    descriptor.security.globalStopOverridesEveryHost,
    true
  );
  assert.equal(
    descriptor.budgets.safeHealthPerCycle.maximum,
    3
  );
  assert.equal(
    descriptor.budgets.policyGrantRequiresLiveControlRecheck,
    true
  );
  assert.equal(
    descriptor.security.globalStopRevokesPolicyGrantBeforeNextAction,
    true
  );

  const [
    policySource,
    supervisorSource,
    databaseSource,
    apiSource,
    uiSource,
    pageSource,
    migrationSource,
    manifestSource,
    docsSource,
    reviewSource,
    roadmapSource,
    packageRaw
  ] = await Promise.all([
    source("lib/module-supervisor-host-policy.ts"),
    source("lib/autonomous-module-supervisor.ts"),
    source("lib/module-supervisor-host-policy-database.ts"),
    source("app/api/module-supervisor/policy/route.ts"),
    source("app/autonomous-operations/ModuleSupervisorPolicyConsole.tsx"),
    source("app/autonomous-operations/page.tsx"),
    source("../../db/migrations/0109_module_supervisor_host_policies.sql"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_326_PER_HOST_OWNER_POLICIES_KILL_SWITCHES_AUTONOMY_BUDGETS.md"),
    source("../../docs/integration/ai-data-platform-build326-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "global-emergency-stop",
    "host-policy-missing",
    "host-kill-switch-engaged",
    "outside-maintenance-window",
    "cycle-budget-exhausted",
    "safe-action-not-allowed",
    "safe-health-budget-exhausted",
    "safe-health-authorized",
    "globalStopOverridesHostPolicy: true",
    "reservationsAreConservative: true"
  ]) {
    assert.ok(
      policySource.includes(token),
      "Build 326 policy core missing " + token
    );
  }

  for (const token of [
    "maximumActions: number",
    "module_supervisor_grant_action_budget_invalid",
    "policyGrantMayLowerCycleMaximum: true",
    "ModuleSupervisorPolicyControlVerifier",
    "module_supervisor_policy_bound_grant_revoked",
    "validGrant.maximumActions"
  ]) {
    assert.ok(
      supervisorSource.includes(token),
      "Build 326 supervisor integration missing " + token
    );
  }

  for (const token of [
    "SAFE_GRANT_TTL_MS = 10 * 60 * 1000",
    "for update",
    "module_supervisor_budget_reservations",
    "safe_health_quantity",
    "evaluateModuleSupervisorHostPolicy",
    "createPolicyBoundSafeHealthGrant",
    "readModuleSupervisorPolicyControlState",
    "missing-control-fails-closed"
  ]) {
    assert.ok(
      databaseSource.includes(token),
      "Build 326 policy database missing " + token
    );
  }

  for (const token of [
    '"set-global-stop"',
    '"upsert-host-policy"',
    '"authorize-cycle"',
    '"control-state"',
    "authentication_required",
    "Cache-Control"
  ]) {
    assert.ok(
      apiSource.includes(token),
      "Build 326 policy API missing " + token
    );
  }

  for (const token of [
    "Global stop",
    "Host policy editor",
    "Enable autonomous cycles for this exact host",
    "Host kill switch engaged",
    "Allow connector-health GET/HEAD recovery",
    "Cycles per hour",
    "UTC maintenance window",
    "Fail-closed precedence"
  ]) {
    assert.ok(
      uiSource.includes(token),
      "Build 326 policy UI missing " + token
    );
  }

  assert.ok(
    pageSource.includes("ModuleSupervisorPolicyConsole") &&
      pageSource.includes("listModuleSupervisorPoliciesForUser")
  );

  for (const token of [
    "create table if not exists app.module_supervisor_global_controls",
    "emergency_stop_engaged boolean not null default true",
    "create table if not exists app.module_supervisor_host_policies",
    "enabled boolean not null default false",
    "kill_switch_engaged boolean not null default true",
    "safe_actions text[] not null default '{}'::text[]",
    "max_safe_health_actions_per_cycle",
    "maintenance_window jsonb",
    "module_supervisor_host_policy_events",
    "module_supervisor_global_control_events",
    "module_supervisor_budget_reservations",
    "enable row level security",
    "revoke update, delete"
  ]) {
    assert.ok(
      migrationSource.includes(token),
      "Build 326 migration missing " + token
    );
  }

  for (const token of [
    '"per-host-autonomy-policy-v1"',
    '"global-emergency-stop-v1"',
    '"autonomy-budget-reservation-v1"',
    '"maintenance-window-policy-v1"',
    '"policy-audit-history-v1"',
    "moduleSupervisorMissingGlobalControlBlocks: true",
    "moduleSupervisorMissingHostPolicyBlocks: true",
    "moduleSupervisorGlobalStopOverridesHostPolicy: true",
    "moduleSupervisorHostKillSwitchFailClosed: true",
    "moduleSupervisorBudgetReservationRequired: true",
    "moduleSupervisorPolicyBoundGrantLiveRecheckRequired: true",
    "moduleSupervisorGlobalStopRevokesOutstandingGrant: true",
    "moduleSupervisorPolicyCanAuthorizeConsequentialMutations: false"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 326 manifest missing " + token
    );
  }

  for (const token of [
    "Build 326",
    "Emergency global stop",
    "Per-host defaults",
    "Safe-action allowlist",
    "Cycle and recovery budgets",
    "Maintenance windows",
    "Authorization precedence",
    "Short-lived safe-health grant",
    "live control-state verifier",
    "Durable evidence",
    "Build 327"
  ]) {
    assert.ok(
      docsSource.includes(token),
      "Build 326 docs missing " + token
    );
  }

  const review = JSON.parse(reviewSource);
  assert.equal(review.build, 326);
  assert.equal(
    review.security.missingGlobalControlFailsClosed,
    true
  );
  assert.equal(
    review.security.globalStopOverridesEveryHost,
    true
  );
  assert.equal(
    review.security.policyBoundGrantRequiresLiveRecheck,
    true
  );
  assert.equal(
    review.security.globalStopRevokesOutstandingPolicyGrant,
    true
  );
  assert.equal(review.nextQueuedBuild, 327);

  assert.ok(
    roadmapSource.includes(
      "Build 326 — Per-Host Owner Policies, Kill Switches & Autonomy Budgets"
    ) &&
      roadmapSource.includes(
        "Build 327 — Zero-Touch Module Installer & Guided Host Enrollment"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-326-per-host-autonomy-policies.ts"
      ),
      "Build 326 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 326 Per-Host Owner Policies, Kill Switches & Autonomy Budgets verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
