import { createHash } from "node:crypto";

import type { HostEnvironment } from "./universal-module-contract";

export const AUTONOMOUS_MODULE_SUPERVISOR_VERSION = "1.0.0" as const;
export const AUTONOMOUS_MODULE_SUPERVISOR_SCHEMA =
  "rosevear.ai-data-platform.autonomous-module-supervisor.v1" as const;
export const MODULE_SUPERVISOR_WORK_ITEM_SCHEMA =
  "rosevear.ai-data-platform.module-supervisor-work-item.v1" as const;
export const MODULE_SUPERVISOR_CYCLE_SCHEMA =
  "rosevear.ai-data-platform.module-supervisor-cycle.v1" as const;
export const MODULE_SUPERVISOR_SAFE_GRANT_SCHEMA =
  "rosevear.ai-data-platform.module-supervisor-safe-health-grant.v1" as const;

export const MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS = 3;
export const MODULE_SUPERVISOR_CERTIFICATION_MAX_AGE_MS =
  15 * 60 * 1000;

const APPLICATION_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{5,159}$/;

export type ModuleSupervisorHostScope = {
  hostApplicationId: string;
  hostInstanceId: string;
  environment: HostEnvironment;
  workspaceId: string;
  tenantId: string;
};

export type ModuleSupervisorHealthObservation = {
  evidenceId: string;
  category:
    | "module-runtime"
    | "transport"
    | "offline-queue"
    | "connector"
    | "certification";
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  observedAt: string;
  maximumAgeMs: number;
};

export type ModuleSupervisorCertificationSnapshot = {
  evidenceId: string;
  runId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  workspaceId: string;
  tenantId: string;
  environment: HostEnvironment;
  outcome: "passed" | "failed" | "blocked";
  passed: number;
  failed: number;
  blocked: number;
  refreshedAt: string;
};

export type ModuleSupervisorFreshnessEvidence = {
  evidenceId: string;
  kind: "mapping" | "credential-reference" | "configuration";
  status: "current" | "stale" | "expired" | "revoked" | "missing";
  updatedAt: string | null;
  expiresAt: string | null;
};

export type ModuleSupervisorRecoveryOpportunity = {
  planId: string;
  evidenceId: string;
  hostApplicationId: string | null;
  hostInstanceId: string | null;
  workspaceId: string;
  tenantId: string;
  environment: HostEnvironment;
  action:
    | "connector-health-retry"
    | "event-replay"
    | "credential-remediation"
    | "connector-remediation";
  method: "GET" | "HEAD" | null;
  state:
    | "ready"
    | "cooldown"
    | "recovered"
    | "exhausted"
    | "expired"
    | "approval-required"
    | "approved"
    | "rejected"
    | "not-retryable";
  autoExecutionAllowed: boolean;
  expiresAt: string | null;
};

export type ModuleSupervisorSafeHealthGrant = {
  schema: typeof MODULE_SUPERVISOR_SAFE_GRANT_SCHEMA;
  grantId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  workspaceId: string;
  tenantId: string;
  environment: HostEnvironment;
  action: "connector-health-retry";
  allowedMethods: Array<"GET" | "HEAD">;
  maximumActions: number;
  issuedAt: string;
  expiresAt: string;
  ownerPolicyEvidenceId: string;
  consequentialPeerMutationAuthorized: false;
};

export type ModuleSupervisorWorkItem = {
  schema: typeof MODULE_SUPERVISOR_WORK_ITEM_SCHEMA;
  version: typeof AUTONOMOUS_MODULE_SUPERVISOR_VERSION;
  workItemIdSha256: string;
  hostApplicationId: string;
  hostInstanceId: string;
  workspaceId: string;
  tenantId: string;
  environment: HostEnvironment;
  kind:
    | "health-attention"
    | "certification-attention"
    | "stale-mapping"
    | "stale-credential-reference"
    | "stale-configuration"
    | "recovery-review"
    | "safe-health-grant-required"
    | "safe-health-execution-failed";
  priority: "P0" | "P1" | "P2";
  title: string;
  reason: string;
  sourceRef: string;
  evidenceIds: string[];
  ownerReviewRequired: true;
  authorizationGranted: false;
  consequentialActionExecuted: false;
  createdAt: string;
};

export type ModuleSupervisorSafeHealthExecutionResult = {
  planId: string;
  method: "GET" | "HEAD";
  state: "healthy" | "unhealthy" | "failed";
  evidenceId: string;
  checkedAt: string;
  connectionActivated: false;
  peerMutationExecuted: false;
  credentialMutationExecuted: false;
  eventReplayExecuted: false;
};

export type ModuleSupervisorCertificationRefresher = {
  refresh(
    host: ModuleSupervisorHostScope
  ): Promise<ModuleSupervisorCertificationSnapshot>;
};

export type ModuleSupervisorSafeHealthExecutor = {
  execute(input: {
    host: ModuleSupervisorHostScope;
    plan: ModuleSupervisorRecoveryOpportunity;
    grant: ModuleSupervisorSafeHealthGrant;
  }): Promise<ModuleSupervisorSafeHealthExecutionResult>;
};

export type ModuleSupervisorWorkItemSink = {
  create(items: readonly ModuleSupervisorWorkItem[]): Promise<void>;
};

export type ModuleSupervisorCycleResult = {
  schema: typeof MODULE_SUPERVISOR_CYCLE_SCHEMA;
  version: typeof AUTONOMOUS_MODULE_SUPERVISOR_VERSION;
  host: ModuleSupervisorHostScope;
  state: "healthy" | "attention" | "blocked";
  startedAt: string;
  completedAt: string;
  certification: {
    refreshed: boolean;
    evidence: ModuleSupervisorCertificationSnapshot | null;
  };
  health: {
    observed: number;
    healthy: number;
    attention: number;
    stale: number;
  };
  recovery: {
    scanned: number;
    safeEligible: number;
    executed: number;
    healthy: number;
    unhealthyOrFailed: number;
    heldForReview: number;
  };
  freshness: {
    scanned: number;
    staleMappings: number;
    staleCredentialReferences: number;
    staleConfigurations: number;
  };
  workItems: ModuleSupervisorWorkItem[];
  safeHealthExecutions: ModuleSupervisorSafeHealthExecutionResult[];
  security: {
    consequentialPeerMutationExecuted: false;
    connectionActivated: false;
    credentialMutationExecuted: false;
    eventReplayExecuted: false;
    workflowReleaseExecuted: false;
    trustMutationExecuted: false;
    workItemsGrantAuthorization: false;
  };
};

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function assertApplicationId(value: string, code: string) {
  if (
    !APPLICATION_ID_PATTERN.test(value) ||
    value.length > 120
  ) {
    throw new Error(code);
  }
}

function assertId(value: string, code: string) {
  if (!ID_PATTERN.test(value)) throw new Error(code);
}

function assertIso(value: string, code: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return new Date(parsed).toISOString();
}

function normalizeHost(
  host: ModuleSupervisorHostScope
): ModuleSupervisorHostScope {
  assertApplicationId(
    host.hostApplicationId,
    "module_supervisor_host_application_invalid"
  );
  assertId(
    host.hostInstanceId,
    "module_supervisor_host_instance_invalid"
  );
  assertId(
    host.workspaceId,
    "module_supervisor_workspace_invalid"
  );
  assertId(host.tenantId, "module_supervisor_tenant_invalid");
  return Object.freeze({ ...host });
}

function exactHostMatch(
  host: ModuleSupervisorHostScope,
  candidate: {
    hostApplicationId: string | null;
    hostInstanceId: string | null;
    workspaceId: string;
    tenantId: string;
    environment: HostEnvironment;
  }
) {
  return (
    candidate.hostApplicationId === host.hostApplicationId &&
    candidate.hostInstanceId === host.hostInstanceId &&
    candidate.workspaceId === host.workspaceId &&
    candidate.tenantId === host.tenantId &&
    candidate.environment === host.environment
  );
}

function workItem(input: {
  host: ModuleSupervisorHostScope;
  kind: ModuleSupervisorWorkItem["kind"];
  priority: ModuleSupervisorWorkItem["priority"];
  title: string;
  reason: string;
  sourceRef: string;
  evidenceIds: string[];
  createdAt: string;
}): ModuleSupervisorWorkItem {
  assertId(input.sourceRef, "module_supervisor_source_ref_invalid");
  const evidenceIds = [...new Set(input.evidenceIds)];
  evidenceIds.forEach((value) =>
    assertId(value, "module_supervisor_evidence_id_invalid")
  );
  const id = sha256([
    "rosevear-module-supervisor-work-item-v1",
    input.host.hostApplicationId,
    input.host.hostInstanceId,
    input.host.workspaceId,
    input.host.tenantId,
    input.host.environment,
    input.kind,
    input.sourceRef,
    input.reason
  ]);

  return Object.freeze({
    schema: MODULE_SUPERVISOR_WORK_ITEM_SCHEMA,
    version: AUTONOMOUS_MODULE_SUPERVISOR_VERSION,
    workItemIdSha256: id,
    hostApplicationId: input.host.hostApplicationId,
    hostInstanceId: input.host.hostInstanceId,
    workspaceId: input.host.workspaceId,
    tenantId: input.host.tenantId,
    environment: input.host.environment,
    kind: input.kind,
    priority: input.priority,
    title: input.title,
    reason: input.reason,
    sourceRef: input.sourceRef,
    evidenceIds,
    ownerReviewRequired: true as const,
    authorizationGranted: false as const,
    consequentialActionExecuted: false as const,
    createdAt: input.createdAt
  });
}

function validateCertification(
  host: ModuleSupervisorHostScope,
  evidence: ModuleSupervisorCertificationSnapshot
) {
  assertId(
    evidence.evidenceId,
    "module_supervisor_certification_evidence_invalid"
  );
  assertId(
    evidence.runId,
    "module_supervisor_certification_run_invalid"
  );
  assertIso(
    evidence.refreshedAt,
    "module_supervisor_certification_time_invalid"
  );
  if (!exactHostMatch(host, evidence)) {
    throw new Error("module_supervisor_certification_scope_mismatch");
  }
  if (
    !Number.isInteger(evidence.passed) ||
    !Number.isInteger(evidence.failed) ||
    !Number.isInteger(evidence.blocked) ||
    evidence.passed < 0 ||
    evidence.failed < 0 ||
    evidence.blocked < 0
  ) {
    throw new Error("module_supervisor_certification_counts_invalid");
  }
}

function validateGrant(
  host: ModuleSupervisorHostScope,
  grant: ModuleSupervisorSafeHealthGrant,
  nowMs: number
) {
  if (grant.schema !== MODULE_SUPERVISOR_SAFE_GRANT_SCHEMA) {
    return false;
  }
  assertId(grant.grantId, "module_supervisor_grant_id_invalid");
  assertId(
    grant.ownerPolicyEvidenceId,
    "module_supervisor_policy_evidence_invalid"
  );
  if (
    !exactHostMatch(host, grant) ||
    grant.action !== "connector-health-retry" ||
    grant.consequentialPeerMutationAuthorized !== false ||
    grant.allowedMethods.length < 1 ||
    grant.allowedMethods.some(
      (method) => method !== "GET" && method !== "HEAD"
    ) ||
    !Number.isInteger(grant.maximumActions) ||
    grant.maximumActions < 1 ||
    grant.maximumActions > MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS
  ) {
    return false;
  }
  const issuedAt = Date.parse(grant.issuedAt);
  const expiresAt = Date.parse(grant.expiresAt);
  return (
    Number.isFinite(issuedAt) &&
    Number.isFinite(expiresAt) &&
    issuedAt <= nowMs &&
    expiresAt > nowMs
  );
}

function safeRecoveryEligible(
  host: ModuleSupervisorHostScope,
  plan: ModuleSupervisorRecoveryOpportunity,
  nowMs: number
) {
  if (!exactHostMatch(host, plan)) return false;
  if (
    plan.action !== "connector-health-retry" ||
    (plan.method !== "GET" && plan.method !== "HEAD") ||
    plan.state !== "ready" ||
    plan.autoExecutionAllowed !== true
  ) {
    return false;
  }
  if (
    plan.expiresAt !== null &&
    Date.parse(plan.expiresAt) <= nowMs
  ) {
    return false;
  }
  return true;
}

function assertSafeExecution(
  host: ModuleSupervisorHostScope,
  plan: ModuleSupervisorRecoveryOpportunity,
  result: ModuleSupervisorSafeHealthExecutionResult
) {
  if (
    result.planId !== plan.planId ||
    result.method !== plan.method ||
    result.connectionActivated !== false ||
    result.peerMutationExecuted !== false ||
    result.credentialMutationExecuted !== false ||
    result.eventReplayExecuted !== false
  ) {
    throw new Error("module_supervisor_executor_boundary_violation");
  }
  assertId(
    result.evidenceId,
    "module_supervisor_execution_evidence_invalid"
  );
  assertIso(
    result.checkedAt,
    "module_supervisor_execution_time_invalid"
  );
  if (!exactHostMatch(host, plan)) {
    throw new Error("module_supervisor_execution_scope_mismatch");
  }
}

export function createModuleSupervisorSafeHealthGrant(input: {
  grantId: string;
  host: ModuleSupervisorHostScope;
  allowedMethods?: Array<"GET" | "HEAD">;
  maximumActions?: number;
  issuedAt: string;
  expiresAt: string;
  ownerPolicyEvidenceId: string;
}): ModuleSupervisorSafeHealthGrant {
  const host = normalizeHost(input.host);
  assertId(input.grantId, "module_supervisor_grant_id_invalid");
  assertId(
    input.ownerPolicyEvidenceId,
    "module_supervisor_policy_evidence_invalid"
  );
  const issuedAt = assertIso(
    input.issuedAt,
    "module_supervisor_grant_issued_at_invalid"
  );
  const expiresAt = assertIso(
    input.expiresAt,
    "module_supervisor_grant_expires_at_invalid"
  );
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) {
    throw new Error("module_supervisor_grant_expiry_invalid");
  }
  const allowedMethods: Array<"GET" | "HEAD"> = [
    ...new Set<"GET" | "HEAD">(
      input.allowedMethods ?? ["GET", "HEAD"]
    )
  ];
  const maximumActions = Math.min(
    MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS,
    Math.max(1, Math.trunc(input.maximumActions ?? MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS))
  );
  if (
    allowedMethods.length < 1 ||
    allowedMethods.some(
      (method) => method !== "GET" && method !== "HEAD"
    )
  ) {
    throw new Error("module_supervisor_grant_methods_invalid");
  }

  return Object.freeze({
    schema: MODULE_SUPERVISOR_SAFE_GRANT_SCHEMA,
    grantId: input.grantId,
    ...host,
    action: "connector-health-retry" as const,
    allowedMethods,
    maximumActions,
    issuedAt,
    expiresAt,
    ownerPolicyEvidenceId: input.ownerPolicyEvidenceId,
    consequentialPeerMutationAuthorized: false as const
  });
}

export async function runAutonomousModuleSupervisorCycle(input: {
  host: ModuleSupervisorHostScope;
  healthObservations: readonly ModuleSupervisorHealthObservation[];
  certification: ModuleSupervisorCertificationSnapshot | null;
  recoveryOpportunities: readonly ModuleSupervisorRecoveryOpportunity[];
  freshnessEvidence: readonly ModuleSupervisorFreshnessEvidence[];
  refreshCertification?: boolean;
  safeHealthGrant?: ModuleSupervisorSafeHealthGrant | null;
  certificationRefresher?: ModuleSupervisorCertificationRefresher;
  safeHealthExecutor?: ModuleSupervisorSafeHealthExecutor;
  workItemSink?: ModuleSupervisorWorkItemSink;
  now?: string;
}): Promise<ModuleSupervisorCycleResult> {
  const host = normalizeHost(input.host);
  const startedAt = assertIso(
    input.now ?? new Date().toISOString(),
    "module_supervisor_cycle_time_invalid"
  );
  const nowMs = Date.parse(startedAt);
  const workItems: ModuleSupervisorWorkItem[] = [];
  const executions: ModuleSupervisorSafeHealthExecutionResult[] = [];

  let certification = input.certification;
  let certificationRefreshed = false;
  if (input.refreshCertification === true) {
    if (!input.certificationRefresher) {
      workItems.push(
        workItem({
          host,
          kind: "certification-attention",
          priority: "P1",
          title: "Certification refresh adapter is unavailable",
          reason: "certification-refresh-adapter-unavailable",
          sourceRef: "supervisor-certification-refresh",
          evidenceIds: [],
          createdAt: startedAt
        })
      );
    } else {
      certification = await input.certificationRefresher.refresh(host);
      validateCertification(host, certification);
      certificationRefreshed = true;
    }
  }

  if (certification) {
    validateCertification(host, certification);
    const certificationAge =
      nowMs - Date.parse(certification.refreshedAt);
    if (
      certificationAge >
        MODULE_SUPERVISOR_CERTIFICATION_MAX_AGE_MS ||
      certification.outcome !== "passed"
    ) {
      workItems.push(
        workItem({
          host,
          kind: "certification-attention",
          priority:
            certification.outcome === "failed" ? "P0" : "P1",
          title:
            certification.outcome === "failed"
              ? "Resolve failed host certification evidence"
              : "Refresh or complete host certification evidence",
          reason:
            certificationAge >
            MODULE_SUPERVISOR_CERTIFICATION_MAX_AGE_MS
              ? "certification-evidence-stale"
              : "certification-" + certification.outcome,
          sourceRef: certification.runId,
          evidenceIds: [certification.evidenceId],
          createdAt: startedAt
        })
      );
    }
  } else {
    workItems.push(
      workItem({
        host,
        kind: "certification-attention",
        priority: "P1",
        title: "Host certification evidence is missing",
        reason: "certification-evidence-missing",
        sourceRef: "supervisor-certification-missing",
        evidenceIds: [],
        createdAt: startedAt
      })
    );
  }

  let healthyHealth = 0;
  let attentionHealth = 0;
  let staleHealth = 0;
  for (const observation of input.healthObservations) {
    assertId(
      observation.evidenceId,
      "module_supervisor_health_evidence_invalid"
    );
    const observedAt = Date.parse(
      assertIso(
        observation.observedAt,
        "module_supervisor_health_time_invalid"
      )
    );
    if (
      !Number.isInteger(observation.maximumAgeMs) ||
      observation.maximumAgeMs < 60_000 ||
      observation.maximumAgeMs > 24 * 60 * 60 * 1000
    ) {
      throw new Error("module_supervisor_health_max_age_invalid");
    }
    const stale =
      observedAt > nowMs + 30_000 ||
      nowMs - observedAt > observation.maximumAgeMs;
    if (stale) staleHealth += 1;
    if (!stale && observation.status === "healthy") {
      healthyHealth += 1;
      continue;
    }
    attentionHealth += 1;
    workItems.push(
      workItem({
        host,
        kind: "health-attention",
        priority:
          observation.status === "unhealthy" ? "P0" : "P1",
        title: "Review host health evidence",
        reason: stale
          ? "health-evidence-stale"
          : "health-" + observation.status,
        sourceRef: observation.evidenceId,
        evidenceIds: [observation.evidenceId],
        createdAt: startedAt
      })
    );
  }

  let staleMappings = 0;
  let staleCredentialReferences = 0;
  let staleConfigurations = 0;
  for (const evidence of input.freshnessEvidence) {
    assertId(
      evidence.evidenceId,
      "module_supervisor_freshness_evidence_invalid"
    );
    if (evidence.updatedAt !== null) {
      assertIso(
        evidence.updatedAt,
        "module_supervisor_freshness_updated_at_invalid"
      );
    }
    const expiredByTime =
      evidence.expiresAt !== null &&
      Date.parse(
        assertIso(
          evidence.expiresAt,
          "module_supervisor_freshness_expires_at_invalid"
        )
      ) <= nowMs;
    const stale =
      evidence.status !== "current" || expiredByTime;
    if (!stale) continue;

    if (evidence.kind === "mapping") staleMappings += 1;
    if (evidence.kind === "credential-reference") {
      staleCredentialReferences += 1;
    }
    if (evidence.kind === "configuration") {
      staleConfigurations += 1;
    }

    workItems.push(
      workItem({
        host,
        kind:
          evidence.kind === "mapping"
            ? "stale-mapping"
            : evidence.kind === "credential-reference"
              ? "stale-credential-reference"
              : "stale-configuration",
        priority:
          evidence.status === "revoked" ||
          evidence.status === "expired"
            ? "P0"
            : "P1",
        title:
          evidence.kind === "mapping"
            ? "Review stale host mapping"
            : evidence.kind === "credential-reference"
              ? "Review stale credential reference"
              : "Review stale host configuration",
        reason: expiredByTime
          ? "freshness-evidence-expired"
          : "freshness-" + evidence.status,
        sourceRef: evidence.evidenceId,
        evidenceIds: [evidence.evidenceId],
        createdAt: startedAt
      })
    );
  }

  const validGrant =
    input.safeHealthGrant &&
    validateGrant(host, input.safeHealthGrant, nowMs)
      ? input.safeHealthGrant
      : null;

  let safeEligible = 0;
  let heldForReview = 0;

  for (const plan of input.recoveryOpportunities) {
    assertId(plan.planId, "module_supervisor_plan_id_invalid");
    assertId(
      plan.evidenceId,
      "module_supervisor_recovery_evidence_invalid"
    );

    const safe = safeRecoveryEligible(host, plan, nowMs);
    if (!safe) {
      if (
        plan.state === "ready" ||
        plan.state === "approval-required" ||
        plan.state === "approved"
      ) {
        heldForReview += 1;
        workItems.push(
          workItem({
            host,
            kind: "recovery-review",
            priority:
              plan.action === "event-replay" ||
              plan.action === "credential-remediation"
                ? "P0"
                : "P1",
            title: "Owner review required for recovery opportunity",
            reason: exactHostMatch(host, plan)
              ? "recovery-not-safe-health-only"
              : "recovery-host-scope-not-proven",
            sourceRef: plan.planId,
            evidenceIds: [plan.evidenceId],
            createdAt: startedAt
          })
        );
      }
      continue;
    }

    safeEligible += 1;

    if (
      !validGrant ||
      !plan.method ||
      !validGrant.allowedMethods.includes(plan.method) ||
      !input.safeHealthExecutor ||
      executions.length >=
        Math.min(
          MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS,
          validGrant.maximumActions
        )
    ) {
      heldForReview += 1;
      workItems.push(
        workItem({
          host,
          kind: "safe-health-grant-required",
          priority: "P1",
          title: "Safe health recovery is ready but not authorized",
          reason:
            executions.length >=
            Math.min(
              MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS,
              validGrant?.maximumActions ??
                MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS
            )
              ? "supervisor-safe-health-cycle-cap-reached"
              : !validGrant
                ? "exact-safe-health-grant-required"
                : !input.safeHealthExecutor
                  ? "safe-health-executor-unavailable"
                  : "safe-health-method-not-granted",
          sourceRef: plan.planId,
          evidenceIds: [plan.evidenceId],
          createdAt: startedAt
        })
      );
      continue;
    }

    try {
      const result = await input.safeHealthExecutor.execute({
        host,
        plan,
        grant: validGrant
      });
      assertSafeExecution(host, plan, result);
      executions.push(Object.freeze({ ...result }));
      if (result.state !== "healthy") {
        workItems.push(
          workItem({
            host,
            kind: "safe-health-execution-failed",
            priority: "P1",
            title: "Safe health recovery did not restore health",
            reason: "safe-health-" + result.state,
            sourceRef: plan.planId,
            evidenceIds: [plan.evidenceId, result.evidenceId],
            createdAt: startedAt
          })
        );
      }
    } catch (error) {
      heldForReview += 1;
      workItems.push(
        workItem({
          host,
          kind: "safe-health-execution-failed",
          priority: "P1",
          title: "Safe health recovery execution needs review",
          reason:
            error instanceof Error
              ? error.message.slice(0, 120)
              : "safe-health-execution-failed",
          sourceRef: plan.planId,
          evidenceIds: [plan.evidenceId],
          createdAt: startedAt
        })
      );
    }
  }

  const dedupedWorkItems = workItems.filter(
    (item, index, all) =>
      all.findIndex(
        (other) =>
          other.workItemIdSha256 === item.workItemIdSha256
      ) === index
  );

  if (dedupedWorkItems.length && input.workItemSink) {
    await input.workItemSink.create(dedupedWorkItems);
  }

  const unhealthyExecutions = executions.filter(
    (item) => item.state !== "healthy"
  ).length;
  const blocked =
    certification?.outcome === "failed" ||
    input.healthObservations.some(
      (item) => item.status === "unhealthy"
    );

  const completedAt = new Date(nowMs).toISOString();

  return Object.freeze({
    schema: MODULE_SUPERVISOR_CYCLE_SCHEMA,
    version: AUTONOMOUS_MODULE_SUPERVISOR_VERSION,
    host,
    state: blocked
      ? ("blocked" as const)
      : dedupedWorkItems.length > 0 ||
          unhealthyExecutions > 0
        ? ("attention" as const)
        : ("healthy" as const),
    startedAt,
    completedAt,
    certification: Object.freeze({
      refreshed: certificationRefreshed,
      evidence: certification
    }),
    health: Object.freeze({
      observed: input.healthObservations.length,
      healthy: healthyHealth,
      attention: attentionHealth,
      stale: staleHealth
    }),
    recovery: Object.freeze({
      scanned: input.recoveryOpportunities.length,
      safeEligible,
      executed: executions.length,
      healthy: executions.filter(
        (item) => item.state === "healthy"
      ).length,
      unhealthyOrFailed: unhealthyExecutions,
      heldForReview
    }),
    freshness: Object.freeze({
      scanned: input.freshnessEvidence.length,
      staleMappings,
      staleCredentialReferences,
      staleConfigurations
    }),
    workItems: dedupedWorkItems,
    safeHealthExecutions: executions,
    security: Object.freeze({
      consequentialPeerMutationExecuted: false as const,
      connectionActivated: false as const,
      credentialMutationExecuted: false as const,
      eventReplayExecuted: false as const,
      workflowReleaseExecuted: false as const,
      trustMutationExecuted: false as const,
      workItemsGrantAuthorization: false as const
    })
  });
}

export function autonomousModuleSupervisorDescriptor() {
  return Object.freeze({
    schema: AUTONOMOUS_MODULE_SUPERVISOR_SCHEMA,
    version: AUTONOMOUS_MODULE_SUPERVISOR_VERSION,
    sourceBuild: 305,
    perHostScope: {
      exactApplication: true,
      exactHostInstance: true,
      exactWorkspace: true,
      exactTenant: true,
      exactEnvironment: true
    },
    capabilities: {
      healthMonitoring: true,
      certificationRefreshAdapter: true,
      safeRecoveryOpportunityScan: true,
      safeHealthRetry: true,
      staleMappingDetection: true,
      staleCredentialReferenceDetection: true,
      staleConfigurationDetection: true,
      ownerReviewWorkItems: true
    },
    safeHealth: {
      allowedAction: "connector-health-retry",
      allowedMethods: ["GET", "HEAD"] as const,
      maximumActionsPerCycle:
        MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS,
      policyGrantMayLowerCycleMaximum: true,
      exactScopedGrantRequired: true,
      executorBoundaryValidated: true
    },
    policyBoundary: {
      perHostEnableDisableDeferredToBuild326: true,
      hiddenSupervisorEnableSwitchCreated: false,
      ownerPolicyEvidenceRequiredForExecutionGrant: true
    },
    security: {
      automaticConsequentialPeerMutation: false,
      connectionActivationAutomatic: false,
      eventReplayAutomatic: false,
      credentialMutationAutomatic: false,
      workflowReleaseAutomatic: false,
      trustMutationAutomatic: false,
      hostScopeFallbackAllowed: false,
      workItemsGrantAuthorization: false
    }
  });
}
