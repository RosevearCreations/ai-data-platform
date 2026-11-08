import {
  createModuleSupervisorSafeHealthGrant,
  type ModuleSupervisorHostScope,
  type ModuleSupervisorSafeHealthGrant
} from "./autonomous-module-supervisor";

export const MODULE_SUPERVISOR_HOST_POLICY_VERSION = "1.0.0" as const;
export const MODULE_SUPERVISOR_HOST_POLICY_SCHEMA =
  "rosevear.ai-data-platform.module-supervisor-host-policy.v1" as const;
export const MODULE_SUPERVISOR_GLOBAL_CONTROL_SCHEMA =
  "rosevear.ai-data-platform.module-supervisor-global-control.v1" as const;
export const MODULE_SUPERVISOR_POLICY_DECISION_SCHEMA =
  "rosevear.ai-data-platform.module-supervisor-policy-decision.v1" as const;

export const MODULE_SUPERVISOR_SAFE_ACTIONS = [
  "connector-health-retry"
] as const;

const APPLICATION_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const OPAQUE_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{5,159}$/;

export type ModuleSupervisorSafeAction =
  (typeof MODULE_SUPERVISOR_SAFE_ACTIONS)[number];

export type ModuleSupervisorMaintenanceWindow = {
  daysOfWeekUtc: number[];
  startMinuteUtc: number;
  endMinuteUtc: number;
};

export type ModuleSupervisorHostPolicyInput = {
  enabled: boolean;
  killSwitchEngaged: boolean;
  safeActions: ModuleSupervisorSafeAction[];
  maxCyclesPerHour: number;
  maxSafeHealthActionsPerCycle: number;
  maxSafeHealthActionsPerHour: number;
  maxSafeHealthActionsPerDay: number;
  maintenanceWindow: ModuleSupervisorMaintenanceWindow | null;
};

export type ModuleSupervisorHostPolicy =
  ModuleSupervisorHostPolicyInput & {
    schema: typeof MODULE_SUPERVISOR_HOST_POLICY_SCHEMA;
    version: typeof MODULE_SUPERVISOR_HOST_POLICY_VERSION;
    host: ModuleSupervisorHostScope;
    policyRevision: number;
    updatedAt: string;
  };

export type ModuleSupervisorGlobalControl = {
  schema: typeof MODULE_SUPERVISOR_GLOBAL_CONTROL_SCHEMA;
  version: typeof MODULE_SUPERVISOR_HOST_POLICY_VERSION;
  emergencyStopEngaged: boolean;
  revision: number;
  reason: string | null;
  updatedAt: string | null;
};

export type ModuleSupervisorPolicyUsage = {
  cyclesLastHour: number;
  safeHealthActionsReservedLastHour: number;
  safeHealthActionsReservedLastDay: number;
};

export type ModuleSupervisorPolicyDecision = {
  schema: typeof MODULE_SUPERVISOR_POLICY_DECISION_SCHEMA;
  version: typeof MODULE_SUPERVISOR_HOST_POLICY_VERSION;
  host: ModuleSupervisorHostScope;
  policyRevision: number | null;
  globalControlRevision: number | null;
  state: "blocked" | "observe-only" | "safe-health";
  reason:
    | "global-emergency-stop"
    | "host-policy-missing"
    | "host-policy-disabled"
    | "host-kill-switch-engaged"
    | "outside-maintenance-window"
    | "cycle-budget-exhausted"
    | "safe-action-not-allowed"
    | "safe-health-budget-exhausted"
    | "observe-only"
    | "safe-health-authorized";
  cycleAuthorized: boolean;
  safeHealthAuthorized: boolean;
  maximumSafeHealthActions: number;
  evaluatedAt: string;
  boundaries: {
    globalStopOverridesHostPolicy: true;
    connectionActivationAuthorized: false;
    peerMutationAuthorized: false;
    eventReplayAuthorized: false;
    credentialMutationAuthorized: false;
    workflowReleaseAuthorized: false;
    trustMutationAuthorized: false;
  };
};

export function validateModuleSupervisorHostScope(
  host: ModuleSupervisorHostScope
) {
  if (
    !APPLICATION_ID_PATTERN.test(host.hostApplicationId) ||
    host.hostApplicationId.length > 120
  ) {
    throw new Error("module_supervisor_policy_host_application_invalid");
  }
  if (!OPAQUE_ID_PATTERN.test(host.hostInstanceId)) {
    throw new Error("module_supervisor_policy_host_instance_invalid");
  }
  if (!OPAQUE_ID_PATTERN.test(host.workspaceId)) {
    throw new Error("module_supervisor_policy_workspace_invalid");
  }
  if (!OPAQUE_ID_PATTERN.test(host.tenantId)) {
    throw new Error("module_supervisor_policy_tenant_invalid");
  }
  if (
    !["development", "test", "staging", "production"].includes(
      host.environment
    )
  ) {
    throw new Error("module_supervisor_policy_environment_invalid");
  }
  return Object.freeze({ ...host });
}

function exactHostScope(
  left: ModuleSupervisorHostScope,
  right: ModuleSupervisorHostScope
) {
  return (
    left.hostApplicationId === right.hostApplicationId &&
    left.hostInstanceId === right.hostInstanceId &&
    left.environment === right.environment &&
    left.workspaceId === right.workspaceId &&
    left.tenantId === right.tenantId
  );
}

function boundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  code: string
) {
  const number = Number(value);
  if (
    !Number.isInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    throw new Error(code);
  }
  return number;
}

function safeIso(value: string, code: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return new Date(parsed).toISOString();
}

function normalizeMaintenanceWindow(
  input: ModuleSupervisorMaintenanceWindow | null
): ModuleSupervisorMaintenanceWindow | null {
  if (input === null) return null;
  if (
    !Array.isArray(input.daysOfWeekUtc) ||
    input.daysOfWeekUtc.length < 1 ||
    input.daysOfWeekUtc.some(
      (value) =>
        !Number.isInteger(value) || value < 0 || value > 6
    )
  ) {
    throw new Error("module_supervisor_maintenance_window_invalid");
  }
  const daysOfWeekUtc = [
    ...new Set(input.daysOfWeekUtc)
  ].sort((left, right) => left - right);
  if (
    !Number.isInteger(input.startMinuteUtc) ||
    input.startMinuteUtc < 0 ||
    input.startMinuteUtc > 1439 ||
    !Number.isInteger(input.endMinuteUtc) ||
    input.endMinuteUtc < 0 ||
    input.endMinuteUtc > 1439
  ) {
    throw new Error("module_supervisor_maintenance_window_invalid");
  }
  const startMinuteUtc = input.startMinuteUtc;
  const endMinuteUtc = input.endMinuteUtc;
  if (
    daysOfWeekUtc.length === 0 ||
    startMinuteUtc === endMinuteUtc
  ) {
    throw new Error("module_supervisor_maintenance_window_invalid");
  }
  return {
    daysOfWeekUtc,
    startMinuteUtc,
    endMinuteUtc
  };
}

export function normalizeModuleSupervisorHostPolicy(
  input: ModuleSupervisorHostPolicyInput
): ModuleSupervisorHostPolicyInput {
  const safeActions = [
    ...new Set(
      input.safeActions.filter((action) =>
        MODULE_SUPERVISOR_SAFE_ACTIONS.includes(action)
      )
    )
  ];
  const maxSafeHealthActionsPerCycle = boundedInteger(
    input.maxSafeHealthActionsPerCycle,
    0,
    3,
    "module_supervisor_policy_cycle_recovery_budget_invalid"
  );
  const maxSafeHealthActionsPerHour = boundedInteger(
    input.maxSafeHealthActionsPerHour,
    0,
    20,
    "module_supervisor_policy_hourly_recovery_budget_invalid"
  );
  const maxSafeHealthActionsPerDay = boundedInteger(
    input.maxSafeHealthActionsPerDay,
    0,
    50,
    "module_supervisor_policy_daily_recovery_budget_invalid"
  );

  return {
    enabled: Boolean(input.enabled),
    killSwitchEngaged: Boolean(input.killSwitchEngaged),
    safeActions,
    maxCyclesPerHour: boundedInteger(
      input.maxCyclesPerHour,
      1,
      12,
      "module_supervisor_policy_cycle_budget_invalid"
    ),
    maxSafeHealthActionsPerCycle,
    maxSafeHealthActionsPerHour,
    maxSafeHealthActionsPerDay,
    maintenanceWindow: normalizeMaintenanceWindow(
      input.maintenanceWindow
    )
  };
}

function withinMaintenanceWindow(
  window: ModuleSupervisorMaintenanceWindow | null,
  now: Date
) {
  if (window === null) return true;
  const day = now.getUTCDay();
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();

  if (window.startMinuteUtc < window.endMinuteUtc) {
    return (
      window.daysOfWeekUtc.includes(day) &&
      minute >= window.startMinuteUtc &&
      minute < window.endMinuteUtc
    );
  }

  if (
    window.daysOfWeekUtc.includes(day) &&
    minute >= window.startMinuteUtc
  ) {
    return true;
  }

  const previousDay = (day + 6) % 7;
  return (
    window.daysOfWeekUtc.includes(previousDay) &&
    minute < window.endMinuteUtc
  );
}

function decision(input: {
  host: ModuleSupervisorHostScope;
  policyRevision: number | null;
  globalControlRevision: number | null;
  state: ModuleSupervisorPolicyDecision["state"];
  reason: ModuleSupervisorPolicyDecision["reason"];
  cycleAuthorized: boolean;
  safeHealthAuthorized: boolean;
  maximumSafeHealthActions: number;
  evaluatedAt: string;
}): ModuleSupervisorPolicyDecision {
  return Object.freeze({
    schema: MODULE_SUPERVISOR_POLICY_DECISION_SCHEMA,
    version: MODULE_SUPERVISOR_HOST_POLICY_VERSION,
    host: Object.freeze({ ...input.host }),
    policyRevision: input.policyRevision,
    globalControlRevision: input.globalControlRevision,
    state: input.state,
    reason: input.reason,
    cycleAuthorized: input.cycleAuthorized,
    safeHealthAuthorized: input.safeHealthAuthorized,
    maximumSafeHealthActions: input.maximumSafeHealthActions,
    evaluatedAt: input.evaluatedAt,
    boundaries: Object.freeze({
      globalStopOverridesHostPolicy: true as const,
      connectionActivationAuthorized: false as const,
      peerMutationAuthorized: false as const,
      eventReplayAuthorized: false as const,
      credentialMutationAuthorized: false as const,
      workflowReleaseAuthorized: false as const,
      trustMutationAuthorized: false as const
    })
  });
}

export function evaluateModuleSupervisorHostPolicy(input: {
  host: ModuleSupervisorHostScope;
  policy: ModuleSupervisorHostPolicy | null;
  globalControl: ModuleSupervisorGlobalControl | null;
  usage: ModuleSupervisorPolicyUsage;
  requestSafeHealth: boolean;
  now?: string;
}): ModuleSupervisorPolicyDecision {
  const host = validateModuleSupervisorHostScope(input.host);
  const evaluatedAt = safeIso(
    input.now ?? new Date().toISOString(),
    "module_supervisor_policy_time_invalid"
  );
  const policy = input.policy
    ? {
        ...input.policy,
        ...normalizeModuleSupervisorHostPolicy(input.policy),
        host: validateModuleSupervisorHostScope(input.policy.host)
      }
    : null;
  const globalControl = input.globalControl;

  if (policy && !exactHostScope(host, policy.host)) {
    throw new Error("module_supervisor_policy_scope_mismatch");
  }

  for (const [key, value] of Object.entries(input.usage)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(
        "module_supervisor_policy_usage_invalid:" + key
      );
    }
  }

  if (
    !globalControl ||
    globalControl.emergencyStopEngaged === true
  ) {
    return decision({
      host,
      policyRevision: policy?.policyRevision ?? null,
      globalControlRevision: globalControl?.revision ?? null,
      state: "blocked",
      reason: "global-emergency-stop",
      cycleAuthorized: false,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  if (!policy) {
    return decision({
      host,
      policyRevision: null,
      globalControlRevision: globalControl.revision,
      state: "blocked",
      reason: "host-policy-missing",
      cycleAuthorized: false,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  if (!policy.enabled) {
    return decision({
      host,
      policyRevision: policy.policyRevision,
      globalControlRevision: globalControl.revision,
      state: "blocked",
      reason: "host-policy-disabled",
      cycleAuthorized: false,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  if (policy.killSwitchEngaged) {
    return decision({
      host,
      policyRevision: policy.policyRevision,
      globalControlRevision: globalControl.revision,
      state: "blocked",
      reason: "host-kill-switch-engaged",
      cycleAuthorized: false,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  if (
    !withinMaintenanceWindow(
      policy.maintenanceWindow,
      new Date(evaluatedAt)
    )
  ) {
    return decision({
      host,
      policyRevision: policy.policyRevision,
      globalControlRevision: globalControl.revision,
      state: "blocked",
      reason: "outside-maintenance-window",
      cycleAuthorized: false,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  if (input.usage.cyclesLastHour >= policy.maxCyclesPerHour) {
    return decision({
      host,
      policyRevision: policy.policyRevision,
      globalControlRevision: globalControl.revision,
      state: "blocked",
      reason: "cycle-budget-exhausted",
      cycleAuthorized: false,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  if (!input.requestSafeHealth) {
    return decision({
      host,
      policyRevision: policy.policyRevision,
      globalControlRevision: globalControl.revision,
      state: "observe-only",
      reason: "observe-only",
      cycleAuthorized: true,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  if (!policy.safeActions.includes("connector-health-retry")) {
    return decision({
      host,
      policyRevision: policy.policyRevision,
      globalControlRevision: globalControl.revision,
      state: "observe-only",
      reason: "safe-action-not-allowed",
      cycleAuthorized: true,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  const remainingPerHour = Math.max(
    0,
    policy.maxSafeHealthActionsPerHour -
      input.usage.safeHealthActionsReservedLastHour
  );
  const remainingPerDay = Math.max(
    0,
    policy.maxSafeHealthActionsPerDay -
      input.usage.safeHealthActionsReservedLastDay
  );
  const maximumSafeHealthActions = Math.min(
    3,
    policy.maxSafeHealthActionsPerCycle,
    remainingPerHour,
    remainingPerDay
  );

  if (maximumSafeHealthActions <= 0) {
    return decision({
      host,
      policyRevision: policy.policyRevision,
      globalControlRevision: globalControl.revision,
      state: "observe-only",
      reason: "safe-health-budget-exhausted",
      cycleAuthorized: true,
      safeHealthAuthorized: false,
      maximumSafeHealthActions: 0,
      evaluatedAt
    });
  }

  return decision({
    host,
    policyRevision: policy.policyRevision,
    globalControlRevision: globalControl.revision,
    state: "safe-health",
    reason: "safe-health-authorized",
    cycleAuthorized: true,
    safeHealthAuthorized: true,
    maximumSafeHealthActions,
    evaluatedAt
  });
}

export function createPolicyBoundSafeHealthGrant(input: {
  decision: ModuleSupervisorPolicyDecision;
  ownerPolicyEvidenceId: string;
  grantId: string;
  expiresAt: string;
}): ModuleSupervisorSafeHealthGrant {
  if (
    input.decision.state !== "safe-health" ||
    input.decision.safeHealthAuthorized !== true ||
    input.decision.maximumSafeHealthActions < 1
  ) {
    throw new Error(
      "module_supervisor_policy_safe_health_not_authorized"
    );
  }

  return createModuleSupervisorSafeHealthGrant({
    grantId: input.grantId,
    host: validateModuleSupervisorHostScope(input.decision.host),
    allowedMethods: ["GET", "HEAD"],
    maximumActions: input.decision.maximumSafeHealthActions,
    policyBinding: {
      policyRevision: input.decision.policyRevision!,
      globalControlRevision:
        input.decision.globalControlRevision!
    },
    issuedAt: input.decision.evaluatedAt,
    expiresAt: safeIso(
      input.expiresAt,
      "module_supervisor_policy_grant_expiry_invalid"
    ),
    ownerPolicyEvidenceId: input.ownerPolicyEvidenceId
  });
}

export function moduleSupervisorHostPolicyDescriptor() {
  return Object.freeze({
    schema: MODULE_SUPERVISOR_HOST_POLICY_SCHEMA,
    version: MODULE_SUPERVISOR_HOST_POLICY_VERSION,
    defaults: {
      globalEmergencyStopEngagedWhenMissing: true,
      hostPolicyEnabled: false,
      hostKillSwitchEngaged: true,
      safeActions: [] as ModuleSupervisorSafeAction[]
    },
    safeActions: MODULE_SUPERVISOR_SAFE_ACTIONS,
    budgets: {
      cyclesPerHour: { minimum: 1, maximum: 12 },
      safeHealthPerCycle: { minimum: 0, maximum: 3 },
      safeHealthPerHour: { minimum: 0, maximum: 20 },
      safeHealthPerDay: { minimum: 0, maximum: 50 },
      reservationsAreConservative: true
    },
    maintenanceWindows: {
      timezone: "UTC",
      overnightWindowsSupported: true,
      nullMeansNoTimeRestrictionAfterExplicitPolicySave: true
    },
    precedence: [
      "global-emergency-stop",
      "host-policy-present",
      "host-enabled",
      "host-kill-switch",
      "maintenance-window",
      "cycle-budget",
      "safe-action-allowlist",
      "recovery-budgets"
    ] as const,
    security: {
      globalStopOverridesEveryHost: true,
      missingGlobalControlFailsClosed: true,
      missingHostPolicyFailsClosed: true,
      safeHealthOnly: true,
      consequentialPeerMutationAuthorized: false,
      connectionActivationAuthorized: false,
      eventReplayAuthorized: false,
      credentialMutationAuthorized: false,
      workflowReleaseAuthorized: false,
      trustMutationAuthorized: false
    }
  });
}
