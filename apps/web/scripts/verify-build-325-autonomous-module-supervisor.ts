import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS,
  autonomousModuleSupervisorDescriptor,
  createModuleSupervisorSafeHealthGrant,
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
  hostInstanceId: "host-build325-primary",
  environment: "production",
  workspaceId: "workspace-build325",
  tenantId: "tenant-build325"
};

function recovery(
  suffix: string,
  overrides: Partial<ModuleSupervisorRecoveryOpportunity> = {}
): ModuleSupervisorRecoveryOpportunity {
  return {
    planId: "plan-build325-" + suffix,
    evidenceId: "evidence-build325-" + suffix,
    hostApplicationId: host.hostApplicationId,
    hostInstanceId: host.hostInstanceId,
    workspaceId: host.workspaceId,
    tenantId: host.tenantId,
    environment: host.environment,
    action: "connector-health-retry",
    method: "GET",
    state: "ready",
    autoExecutionAllowed: true,
    expiresAt: "2026-11-08T14:00:00.000Z",
    ...overrides
  };
}

async function main() {
  const grant = createModuleSupervisorSafeHealthGrant({
    grantId: "grant-build325-safe-health",
    host,
    allowedMethods: ["GET", "HEAD"],
    issuedAt: "2026-11-08T12:00:00.000Z",
    expiresAt: "2026-11-08T14:00:00.000Z",
    ownerPolicyEvidenceId: "policy-build305-owner-001"
  });

  assert.equal(
    grant.consequentialPeerMutationAuthorized,
    false
  );
  assert.deepEqual(grant.allowedMethods, ["GET", "HEAD"]);

  let refreshCalls = 0;
  let executorCalls = 0;
  const executedPlans: string[] = [];
  const sinkItems: string[] = [];

  const result = await runAutonomousModuleSupervisorCycle({
    host,
    now: "2026-11-08T13:00:00.000Z",
    refreshCertification: true,
    certification: null,
    certificationRefresher: {
      async refresh(scope) {
        refreshCalls += 1;
        assert.deepEqual(scope, host);
        return {
          evidenceId: "cert-evidence-build325-001",
          runId: "cert-run-build325-001",
          ...host,
          outcome: "passed",
          passed: 5,
          failed: 0,
          blocked: 0,
          refreshedAt: "2026-11-08T12:59:00.000Z"
        };
      }
    },
    healthObservations: [
      {
        evidenceId: "health-build325-runtime",
        category: "module-runtime",
        status: "healthy",
        observedAt: "2026-11-08T12:59:30.000Z",
        maximumAgeMs: 300_000
      },
      {
        evidenceId: "health-build325-transport",
        category: "transport",
        status: "degraded",
        observedAt: "2026-11-08T12:59:00.000Z",
        maximumAgeMs: 300_000
      },
      {
        evidenceId: "health-build325-queue-stale",
        category: "offline-queue",
        status: "healthy",
        observedAt: "2026-11-08T12:40:00.000Z",
        maximumAgeMs: 300_000
      }
    ],
    freshnessEvidence: [
      {
        evidenceId: "mapping-build325-stale",
        kind: "mapping",
        status: "stale",
        updatedAt: "2026-11-01T00:00:00.000Z",
        expiresAt: null
      },
      {
        evidenceId: "credential-build325-revoked",
        kind: "credential-reference",
        status: "revoked",
        updatedAt: "2026-11-07T00:00:00.000Z",
        expiresAt: null
      },
      {
        evidenceId: "configuration-build325-current",
        kind: "configuration",
        status: "current",
        updatedAt: "2026-11-08T12:50:00.000Z",
        expiresAt: "2026-11-09T00:00:00.000Z"
      }
    ],
    recoveryOpportunities: [
      recovery("safe-1"),
      recovery("safe-2", { method: "HEAD" }),
      recovery("safe-3"),
      recovery("safe-4"),
      recovery("event", {
        action: "event-replay",
        method: null,
        autoExecutionAllowed: false,
        state: "approval-required"
      }),
      recovery("credential", {
        action: "credential-remediation",
        method: null,
        autoExecutionAllowed: false,
        state: "approval-required"
      }),
      recovery("scope-mismatch", {
        hostInstanceId: "host-build325-other"
      })
    ],
    safeHealthGrant: grant,
    safeHealthExecutor: {
      async execute(input) {
        executorCalls += 1;
        executedPlans.push(input.plan.planId);
        assert.equal(
          input.grant.grantId,
          "grant-build325-safe-health"
        );
        assert.equal(
          input.plan.action,
          "connector-health-retry"
        );
        assert.ok(
          input.plan.method === "GET" ||
            input.plan.method === "HEAD"
        );
        return {
          planId: input.plan.planId,
          method: input.plan.method === "HEAD" ? "HEAD" : "GET",
          state: "healthy",
          evidenceId:
            "execution-" + input.plan.planId,
          checkedAt: "2026-11-08T13:00:30.000Z",
          connectionActivated: false,
          peerMutationExecuted: false,
          credentialMutationExecuted: false,
          eventReplayExecuted: false
        };
      }
    },
    workItemSink: {
      async create(items) {
        sinkItems.push(
          ...items.map((item) => item.workItemIdSha256)
        );
      }
    }
  });

  assert.equal(refreshCalls, 1);
  assert.equal(
    executorCalls,
    MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS
  );
  assert.equal(result.recovery.executed, 3);
  assert.equal(result.recovery.safeEligible, 5);
  assert.equal(result.recovery.healthy, 3);
  assert.equal(result.recovery.unhealthyOrFailed, 0);
  assert.equal(result.certification.refreshed, true);
  assert.equal(result.certification.evidence?.outcome, "passed");
  assert.equal(result.health.observed, 3);
  assert.equal(result.health.healthy, 1);
  assert.equal(result.health.attention, 2);
  assert.equal(result.health.stale, 1);
  assert.equal(result.freshness.staleMappings, 1);
  assert.equal(result.freshness.staleCredentialReferences, 1);
  assert.equal(result.freshness.staleConfigurations, 0);
  assert.equal(
    result.security.consequentialPeerMutationExecuted,
    false
  );
  assert.equal(result.security.connectionActivated, false);
  assert.equal(result.security.credentialMutationExecuted, false);
  assert.equal(result.security.eventReplayExecuted, false);
  assert.equal(result.security.workflowReleaseExecuted, false);
  assert.equal(result.security.trustMutationExecuted, false);
  assert.equal(
    result.security.workItemsGrantAuthorization,
    false
  );

  assert.equal(
    executedPlans.some((value) => value.includes("event")),
    false
  );
  assert.equal(
    executedPlans.some((value) => value.includes("credential")),
    false
  );
  assert.equal(
    executedPlans.some((value) =>
      value.includes("scope-mismatch")
    ),
    false
  );
  assert.equal(sinkItems.length, result.workItems.length);
  assert.ok(
    result.workItems.some(
      (item) => item.kind === "stale-mapping"
    )
  );
  assert.ok(
    result.workItems.some(
      (item) =>
        item.kind === "stale-credential-reference"
    )
  );
  assert.ok(
    result.workItems.some(
      (item) =>
        item.reason === "recovery-host-scope-not-proven"
    )
  );
  assert.ok(
    result.workItems.some(
      (item) =>
        item.reason ===
        "supervisor-safe-health-cycle-cap-reached"
    )
  );
  assert.ok(
    result.workItems.every(
      (item) =>
        item.ownerReviewRequired === true &&
        item.authorizationGranted === false &&
        item.consequentialActionExecuted === false
    )
  );

  const noGrant = await runAutonomousModuleSupervisorCycle({
    host,
    now: "2026-11-08T13:00:00.000Z",
    certification: {
      evidenceId: "cert-evidence-build325-no-grant",
      runId: "cert-run-build325-no-grant",
      ...host,
      outcome: "passed",
      passed: 5,
      failed: 0,
      blocked: 0,
      refreshedAt: "2026-11-08T12:59:00.000Z"
    },
    healthObservations: [],
    freshnessEvidence: [],
    recoveryOpportunities: [recovery("no-grant")],
    safeHealthGrant: null,
    safeHealthExecutor: {
      async execute() {
        throw new Error("executor-must-not-run-without-grant");
      }
    }
  });
  assert.equal(noGrant.recovery.executed, 0);
  assert.ok(
    noGrant.workItems.some(
      (item) =>
        item.reason === "exact-safe-health-grant-required"
    )
  );

  const expiredGrant = createModuleSupervisorSafeHealthGrant({
    grantId: "grant-build325-expired",
    host,
    issuedAt: "2026-11-08T11:00:00.000Z",
    expiresAt: "2026-11-08T12:00:00.000Z",
    ownerPolicyEvidenceId: "policy-build305-owner-expired"
  });
  const expired = await runAutonomousModuleSupervisorCycle({
    host,
    now: "2026-11-08T13:00:00.000Z",
    certification: {
      evidenceId: "cert-evidence-build325-expired",
      runId: "cert-run-build325-expired",
      ...host,
      outcome: "passed",
      passed: 5,
      failed: 0,
      blocked: 0,
      refreshedAt: "2026-11-08T12:59:00.000Z"
    },
    healthObservations: [],
    freshnessEvidence: [],
    recoveryOpportunities: [recovery("expired-grant")],
    safeHealthGrant: expiredGrant,
    safeHealthExecutor: {
      async execute() {
        throw new Error("executor-must-not-run-with-expired-grant");
      }
    }
  });
  assert.equal(expired.recovery.executed, 0);
  assert.ok(
    expired.workItems.some(
      (item) =>
        item.reason === "exact-safe-health-grant-required"
    )
  );

  const boundary = await runAutonomousModuleSupervisorCycle({
    host,
    now: "2026-11-08T13:00:00.000Z",
    certification: {
      evidenceId: "cert-evidence-build325-boundary",
      runId: "cert-run-build325-boundary",
      ...host,
      outcome: "passed",
      passed: 5,
      failed: 0,
      blocked: 0,
      refreshedAt: "2026-11-08T12:59:00.000Z"
    },
    healthObservations: [],
    freshnessEvidence: [],
    recoveryOpportunities: [recovery("boundary")],
    safeHealthGrant: grant,
    safeHealthExecutor: {
      async execute(input) {
        return {
          planId: input.plan.planId,
          method: "GET",
          state: "healthy",
          evidenceId: "execution-build325-boundary",
          checkedAt: "2026-11-08T13:00:10.000Z",
          connectionActivated: true,
          peerMutationExecuted: false,
          credentialMutationExecuted: false,
          eventReplayExecuted: false
        } as never;
      }
    }
  });
  assert.equal(boundary.recovery.executed, 0);
  assert.ok(
    boundary.workItems.some(
      (item) =>
        item.reason ===
        "module_supervisor_executor_boundary_violation"
    )
  );

  await assert.rejects(
    () =>
      runAutonomousModuleSupervisorCycle({
        host,
        now: "2026-11-08T13:00:00.000Z",
        refreshCertification: true,
        certification: null,
        certificationRefresher: {
          async refresh() {
            return {
              evidenceId: "cert-evidence-build325-wrong-scope",
              runId: "cert-run-build325-wrong-scope",
              ...host,
              hostInstanceId: "host-build325-other",
              outcome: "passed",
              passed: 5,
              failed: 0,
              blocked: 0,
              refreshedAt: "2026-11-08T12:59:00.000Z"
            };
          }
        },
        healthObservations: [],
        recoveryOpportunities: [],
        freshnessEvidence: []
      }),
    /module_supervisor_certification_scope_mismatch/
  );

  const descriptor = autonomousModuleSupervisorDescriptor();
  assert.equal(descriptor.sourceBuild, 305);
  assert.equal(
    descriptor.safeHealth.maximumActionsPerCycle,
    3
  );
  assert.equal(
    descriptor.safeHealth.exactScopedGrantRequired,
    true
  );
  assert.equal(
    descriptor.policyBoundary
      .perHostEnableDisableDeferredToBuild326,
    true
  );
  assert.equal(
    descriptor.security.automaticConsequentialPeerMutation,
    false
  );
  assert.equal(
    descriptor.security.eventReplayAutomatic,
    false
  );
  assert.equal(
    descriptor.security.credentialMutationAutomatic,
    false
  );

  const [
    moduleSource,
    discoveryApi,
    page,
    manifest,
    docs,
    review,
    roadmap,
    packageRaw
  ] = await Promise.all([
    source("lib/autonomous-module-supervisor.ts"),
    source("app/api/module-supervisor/route.ts"),
    source("app/autonomous-operations/page.tsx"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_325_AUTONOMOUS_MODULE_SUPERVISOR_V1.md"),
    source("../../docs/integration/ai-data-platform-build325-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "MODULE_SUPERVISOR_MAX_SAFE_HEALTH_ACTIONS = 3",
    "ModuleSupervisorCertificationRefresher",
    "ModuleSupervisorSafeHealthExecutor",
    "ModuleSupervisorWorkItemSink",
    "connector-health-retry",
    '"GET"',
    '"HEAD"',
    "exactHostMatch",
    "module_supervisor_executor_boundary_violation",
    "recovery-host-scope-not-proven",
    "supervisor-safe-health-cycle-cap-reached",
    "consequentialPeerMutationExecuted: false",
    "connectionActivated: false",
    "credentialMutationExecuted: false",
    "eventReplayExecuted: false"
  ]) {
    assert.ok(
      moduleSource.includes(token),
      "Build 325 module source missing " + token
    );
  }

  for (const token of [
    "discoveryOnly: true",
    "liveHostCycleRequiresValidatedAdapters: true",
    "safeHealthExecutionRequiresExactScopedGrant: true",
    "safeHealthExecutionLimitedToGetHead: true",
    "consequentialPeerMutationsRemainOwnerControlled: true",
    "build326WillAddPerHostPolicyBudgets: true"
  ]) {
    assert.ok(
      discoveryApi.includes(token),
      "Build 325 discovery API missing " + token
    );
  }

  assert.ok(
    page.includes("Build 325 Autonomous Module Supervisor") &&
      page.includes("/api/module-supervisor")
  );

  for (const token of [
    '"autonomous-module-supervisor-v1"',
    '"per-host-health-monitoring-v1"',
    '"certification-refresh-adapter-v1"',
    '"safe-health-supervision-v1"',
    '"owner-review-work-items-v1"',
    "moduleSupervisorConsequentialPeerMutationAutomatic: false",
    "moduleSupervisorConnectionActivationAutomatic: false",
    "moduleSupervisorEventReplayAutomatic: false",
    "moduleSupervisorCredentialMutationAutomatic: false",
    "moduleSupervisorRequiresExactHostScope: true",
    "moduleSupervisorRequiresExplicitSafeHealthGrant: true",
    "moduleSupervisorWorkItemsGrantAuthorization: false"
  ]) {
    assert.ok(
      manifest.includes(token),
      "Build 325 manifest missing " + token
    );
  }

  for (const token of [
    "Build 325",
    "Per-host scope",
    "Health monitoring",
    "Certification refresh",
    "Safe recovery scan",
    "Explicit safe-health grant",
    "Execution cap",
    "Stale configuration detection",
    "Owner-review work items",
    "Build 326"
  ]) {
    assert.ok(
      docs.includes(token),
      "Build 325 docs missing " + token
    );
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 325);
  assert.equal(
    reviewJson.security.automaticConsequentialPeerMutation,
    false
  );
  assert.equal(
    reviewJson.security.safeHealthGetHeadOnly,
    true
  );
  assert.equal(
    reviewJson.security.maximumSafeHealthActionsPerCycle,
    3
  );
  assert.equal(reviewJson.nextQueuedBuild, 326);

  assert.ok(
    roadmap.includes(
      "Build 325 — Autonomous Module Supervisor V1"
    ) &&
      roadmap.includes(
        "Build 326 — Per-Host Owner Policies, Kill Switches & Autonomy Budgets"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-325-autonomous-module-supervisor.ts"
      ),
      "Build 325 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 325 Autonomous Module Supervisor V1 verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
