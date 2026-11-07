import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildProductionLearningVI,
  normalizeAutonomousOwnerPolicy
} from "../lib/autonomous-operations-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 305 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const disabled = normalizeAutonomousOwnerPolicy({
    enabled: false,
    killSwitchEngaged: true,
    monitoringEnabled: true,
    recoveryScanEnabled: true,
    safeRecoveryEnabled: true,
    maxSafeRecoveriesPerCycle: 0,
    maxCyclesPerHour: 4
  });
  ensure(
    disabled.mode === "observe-only" &&
      disabled.safeRecoveryEnabled === false &&
      disabled.killSwitchEngaged === true,
    "safe recovery fails closed when the per-cycle limit is zero"
  );

  const enabled = normalizeAutonomousOwnerPolicy({
    enabled: true,
    killSwitchEngaged: false,
    monitoringEnabled: true,
    recoveryScanEnabled: true,
    safeRecoveryEnabled: true,
    maxSafeRecoveriesPerCycle: 3,
    maxCyclesPerHour: 4
  });
  ensure(
    enabled.mode === "safe-recovery" &&
      enabled.maxSafeRecoveriesPerCycle === 3 &&
      enabled.maxCyclesPerHour === 4,
    "bounded safe-recovery policy"
  );

  const blockedLearning = buildProductionLearningVI({
    certification: {
      runId: "run-1",
      passed: 20,
      failed: 2,
      blocked: 8
    },
    recovery: {
      readySafeRetries: 2,
      recovered: 4,
      approvalRequired: 1,
      approved: 0,
      rejected: 0,
      exhausted: 1,
      notRetryable: 0
    },
    findings: [
      {
        key: "example",
        category: "Operations",
        status: "action",
        title: "Measured operating issue",
        evidence: "One measured issue remains.",
        action: "Review the measured issue before broadening automation."
      }
    ]
  });
  ensure(
    blockedLearning.overallState === "blocked",
    "certification contradiction blocks learning state"
  );
  ensure(
    blockedLearning.candidates.some(item =>
      item.title.includes("contradictory six-app certification")
    ),
    "certification failure creates a renewal candidate"
  );
  ensure(
    blockedLearning.candidates.some(item =>
      item.title.includes("owner-controlled recovery")
    ),
    "owner-controlled recovery remains a renewal candidate"
  );
  ensure(
    blockedLearning.roadmapRenewal.numberedNextBatchAuthorized === false &&
      blockedLearning.roadmapRenewal.nextBuildNumber === null &&
      blockedLearning.roadmapRenewal.ownerAuthorizationRequired === true,
    "roadmap renewal remains unnumbered pending owner authorization"
  );

  const healthyLearning = buildProductionLearningVI({
    certification: {
      runId: "run-2",
      passed: 30,
      failed: 0,
      blocked: 0
    },
    recovery: {
      readySafeRetries: 0,
      recovered: 1,
      approvalRequired: 0,
      approved: 0,
      rejected: 0,
      exhausted: 0,
      notRetryable: 0
    },
    findings: [
      {
        key: "healthy",
        category: "Operations",
        status: "healthy",
        title: "Healthy",
        evidence: "Measured evidence is healthy.",
        action: "Continue monitoring."
      }
    ]
  });
  ensure(
    healthyLearning.overallState === "healthy" &&
      healthyLearning.candidates.length === 0,
    "healthy measured evidence does not manufacture roadmap work"
  );

  const [
    migration,
    core,
    database,
    api,
    page,
    client,
    navigation,
    productionLearningPage,
    docs,
    renewal,
    security,
    architecture,
    ql266,
    packageRaw,
    ciDb
  ] = await Promise.all([
    source("../../db/migrations/0106_autonomous_operations_owner_controls_learning_vi.sql"),
    source("lib/autonomous-operations-core.ts"),
    source("lib/autonomous-operations-database.ts"),
    source("app/api/autonomous-operations/route.ts"),
    source("app/autonomous-operations/page.tsx"),
    source("app/autonomous-operations/AutonomousOperationsConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("app/production-learning/page.tsx"),
    source("../../docs/BUILD_305_AUTONOMOUS_OPERATIONS_OWNER_CONTROLS_PRODUCTION_LEARNING_VI.md"),
    source("../../docs/ROADMAP_RENEWAL_AFTER_BUILD_305.md"),
    source("../../docs/SECURITY.md"),
    source("../../docs/ARCHITECTURE.md"),
    source("../../docs/integration/ql266-ai-data-platform-build305-review.json"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts")
  ]);

  for (const token of [
    "autonomous_operation_policies",
    "autonomous_operation_policy_events",
    "autonomous_operation_cycles",
    "autonomous_operation_actions",
    "production_learning_vi_snapshots",
    "production_learning_vi_candidates",
    "kill_switch_engaged boolean not null default true",
    "enabled boolean not null default false",
    "max_safe_recoveries_per_cycle between 0 and 10",
    "max_cycles_per_hour between 1 and 12",
    "enable row level security",
    "revoke update, delete"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }

  ensure(
    migration.includes(
      "grant select, insert, update on app.autonomous_operation_policies"
    ),
    "owner policy is the only mutable Build 305 state"
  );

  for (const token of [
    "normalizeAutonomousOwnerPolicy",
    "buildProductionLearningVI",
    "numberedNextBatchAuthorized: false",
    "nextBuildNumber: null",
    "automaticRoadmapExtension: false",
    "automaticEventReplay: false",
    "automaticCredentialMutation: false",
    "automaticTrustMutation: false",
    "ql266Resumed: false"
  ]) {
    ensure(core.includes(token), "core boundary " + token);
  }

  for (const token of [
    "runIntegrationCertification",
    "scanIntegrationRecoveryPlans",
    "executeSafeRecoveryPlan",
    "adminWorkspaceIds.has(item.workspaceId)",
    'item.state === "ready"',
    "item.autoExecutionAllowed === true",
    ".slice(0, policy.maxSafeRecoveriesPerCycle)",
    "policy.killSwitchEngaged",
    "policy.maxCyclesPerHour",
    "connector-health-get-head-only",
    "connectionActivated: false",
    "peerMutationExecuted: false",
    "eventReplayExecuted: false",
    "credentialMutationExecuted: false",
    "trustMutationExecuted: false",
    "ql266Resumed: false"
  ]) {
    ensure(database.includes(token), "runtime boundary " + token);
  }

  for (const forbidden of [
    "setWorkspaceConnectorEnabled(",
    "configureWorkspaceConnector(",
    "requestEventBusReplay(",
    "recordRecoveryDecision(",
    "createWorkflowAutomationRule(",
    "reviewWorkflowAutomationRule(",
    "createNotification(",
    "createSharedTask(",
    "createSharedScheduleItem("
  ]) {
    ensure(
      !database.includes(forbidden),
      "autonomous controller must not call consequential mutator " + forbidden
    );
  }

  ensure(
    api.includes('"run-cycle"') &&
      api.includes('"refresh-learning"') &&
      api.includes('"update-policy"') &&
      api.includes("authentication_required"),
    "authenticated owner API actions"
  );

  ensure(
    page.includes("Build 305") &&
      page.includes("Owner enablement is required.") &&
      page.includes("does not resume QL-266"),
    "operator page boundary"
  );

  for (const token of [
    "Enable autonomous cycles",
    "Kill switch engaged",
    "Permit Build 301 GET/HEAD health recovery",
    "Maximum safe recoveries per cycle",
    "Maximum cycles per hour",
    "Run autonomous cycle",
    "Production Learning VI",
    "does not create Build 306 automatically",
    "Autonomy boundary"
  ]) {
    ensure(client.includes(token), "owner UI token " + token);
  }

  ensure(
    navigation.includes('href: "/autonomous-operations"') &&
      navigation.includes('label: "Autonomous Operations"') &&
      navigation.includes("Production Learning VI"),
    "navigation"
  );

  ensure(
    productionLearningPage.includes(
      "Build 305 · Production Learning VI renewal checkpoint"
    ) &&
      productionLearningPage.includes("/autonomous-operations") &&
      productionLearningPage.includes("No speculative Build 306+"),
    "Production Learning UI renewal checkpoint"
  );

  ensure(
    docs.includes("Build 305 is the mandatory renewal checkpoint") &&
      docs.includes("does **not** assign Build 306") &&
      docs.includes("connector-health GET/HEAD"),
    "Build 305 documentation"
  );

  ensure(
    renewal.includes("no automatically queued Build 306") &&
      renewal.includes("A candidate is not an approved build") &&
      renewal.includes("explicitly authorized by the owner"),
    "post-305 renewal rule"
  );

  ensure(
    security.includes("Build 305 autonomous-operations security") &&
      security.includes("default is disabled with the kill switch engaged"),
    "security documentation"
  );

  ensure(
    architecture.includes(
      "Build 305 — Autonomous Operations V1, Owner Controls & Production Learning VI"
    ) &&
      architecture.includes("does not automatically assigning Build 306") === false &&
      architecture.includes("without automatically assigning Build 306"),
    "architecture documentation"
  );

  const ql = JSON.parse(ql266);
  ensure(
    ql.build === 305 &&
      ql.ql266.review_state === "UNDER_REVIEW" &&
      ql.ql266.external_test_status === "REVIEW_DEFERRED" &&
      ql.ql266.connection_state === "DISCONNECTED" &&
      ql.ql266.resumed_by_build_305 === false,
    "QL-266 remains held"
  );

  const pkg = JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts.build).startsWith(
      "tsx scripts/verify-build-296-shared-media-asset-exchange.ts"
    ),
    "Build 296 remains leading production gate"
  );
  for (const verifier of [
    "verify-build-297-cross-app-notification-consent.ts",
    "verify-build-298-shared-task-work-queue-exchange.ts",
    "verify-build-299-shared-scheduling-calendar-exchange.ts",
    "verify-build-300-unified-integration-health-command-center.ts",
    "verify-build-301-self-healing-safe-retry.ts",
    "verify-build-302-cross-app-workflow-automation.ts",
    "verify-build-303-ai-assisted-integration-suggestions.ts",
    "verify-build-304-six-app-integration-certification.ts",
    "verify-build-305-autonomous-operations-learning-vi.ts"
  ]) {
    ensure(
      String(pkg.scripts.build).includes(verifier),
      "production verifier " + verifier
    );
  }

  ensure(
    String(pkg.scripts["ci:spine"]).includes(
      "verify-build-305-autonomous-operations-learning-vi.ts"
    ),
    "Build 305 is in compact integration spine"
  );

  for (const migrationName of [
    "0099_shared_media_asset_exchange.sql",
    "0100_cross_app_notification_consent.sql",
    "0101_shared_task_work_queue_exchange.sql",
    "0102_shared_scheduling_calendar_exchange.sql",
    "0103_self_healing_connection_recovery.sql",
    "0104_cross_app_workflow_automation.sql",
    "0105_six_app_integration_certification.sql",
    "0106_autonomous_operations_owner_controls_learning_vi.sql"
  ]) {
    ensure(
      ciDb.includes(migrationName),
      "inherited migration evidence " + migrationName
    );
  }

  for (const table of [
    "autonomous_operation_policies",
    "autonomous_operation_policy_events",
    "autonomous_operation_cycles",
    "autonomous_operation_actions",
    "production_learning_vi_snapshots",
    "production_learning_vi_candidates"
  ]) {
    ensure(ciDb.includes('"' + table + '"'), "compact DB gate table " + table);
  }

  console.log(
    "Build 305 verification passed: owner-disabled-by-default autonomy can only execute bounded Build 301 GET/HEAD health recovery; Production Learning VI renews the roadmap without auto-numbering future builds."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
