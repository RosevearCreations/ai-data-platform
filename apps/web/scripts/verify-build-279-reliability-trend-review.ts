import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildReliabilityTrendReview } from "../lib/reliability-trend-review";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 279 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const evidence = {
    generatedAt: "2026-11-03T10:00:00.000Z",
    browserless: {
      tokenConfigured: true,
      executionEnabled: true,
      globalKillSwitchActive: false,
      readyForLivePilot: true
    },
    profiles: { visible: 1, customActive: 1, customArchived: 0 },
    adoption: {
      reviewSnapshots: 1,
      activeWorkspaces: 1,
      noActivityWorkspaces: 0,
      enabledCapabilities: 4,
      usedCapabilities: 3,
      unusedEnabledCapabilities: 1,
      highRiskUnusedCapabilities: 0,
      disabledUsedCapabilities: 0,
      connectorGrants: 2,
      connectorUsedGrants: 2,
      connectorUnusedGrants: 0,
      connectorStaleGrants: 0,
      permissionReviewWorkspaces: 0,
      barcodeWorkspaces: 0,
      scheduledWorkspaces: 0,
      remoteWorkspaces: 1,
      integrationWorkspaces: 1
    },
    renewal: {
      cycleSnapshots: 1,
      baselineSnapshots: 1,
      baselineGeneratedAt: "2026-10-01T00:00:00.000Z",
      baselineSyncEvents: 10,
      baselineSyncConflicts: 2,
      baselineRepairChecks: 4,
      baselineRepairHealthy: 3
    },
    trend: {
      cycleSnapshots: 1,
      baselineSnapshots: 1,
      baselineGeneratedAt: "2026-10-01T00:00:00.000Z",
      baselineSyncEvents: 10,
      baselineSyncConflicts: 2,
      baselineRepairChecks: 4,
      baselineRepairHealthy: 3,
      baselineProviderRuns: 1,
      baselineProviderUnits: 1,
      baselineIntegrationLiveAccepted: 1,
      baselineRetentionBudgetBreaches: 1,
      baselineAdoptionActivityEvents: 2,
      baselineAdoptionUsedCapabilities: 2,
      baselineAdoptionHighRiskUnused: 1,
      baselineConnectorUnusedGrants: 1
    },
    workspaces: [
      {
        workspaceId: "27900000-0000-4000-8000-000000000001",
        workspaceName: "Reliability workspace",
        profileKey: "custom",
        profileName: "Custom",
        role: "owner" as const,
        sync: {
          activeScrapers: 1,
          deletedScrapers: 0,
          reviewedDatasets: 1,
          deletedDatasets: 0,
          reviewedRows: 1,
          versionChanges: 1,
          storageBytes: 10
        },
        outcomes: {
          storageBytes: 10,
          sync: {
            events: 12,
            applied: 11,
            deleted: 0,
            conflicts: 1,
            noops: 0,
            errors: 0
          },
          repair: {
            proposed: 1,
            approved: 1,
            rejected: 0,
            rolledBack: 0,
            compatibilityChecks: 4,
            healthy: 4,
            degraded: 0,
            broken: 0
          }
        },
        continuity: {
          previousSnapshotAt: "2026-10-01T00:00:00.000Z",
          previousSyncEvents: 10,
          previousSyncConflicts: 2,
          previousRepairCompatibilityChecks: 4,
          previousRepairHealthyChecks: 3
        },
        intelligence: {
          modules: 0,
          storageBytes: 0,
          sourcePolicy: {
            present: true,
            sources: 1,
            approved: 1,
            blocked: 0,
            reviewRequired: 0,
            expired: 0
          },
          scheduled: {
            present: false,
            jobs: 0,
            enabled: 0,
            due: 0,
            unread: 0,
            attempts: 0
          }
        },
        integrations: {
          dryRuns: 0,
          approved: 1,
          exported: 1,
          cancelled: 0,
          deliveryAttempts: 2,
          conformanceAccepted: 1,
          liveAccepted: 2,
          deliveryRejected: 0,
          transportErrors: 0,
          handshakeAccepted: 1,
          handshakeRejected: 0,
          storageBytes: 0
        },
        retention: {
          policyPresent: true,
          cleanupApproved: true,
          archiveEligibleRows: 0,
          deleteEligibleRows: 0,
          deleteEligibleBytes: 0,
          cleanupRuns: 1,
          deletedRows: 0,
          failedRuns: 0,
          budgetBreaches: 0
        },
        barcode: {
          captures: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          duplicates: 0,
          camera: 0,
          manual: 0,
          storageBytes: 0
        },
        remote: {
          jobs: 1,
          succeededJobs: 1,
          failedJobs: 0,
          cancelledJobs: 0,
          timedOutJobs: 0,
          providerRuns: 1,
          providerSuccesses: 1,
          providerFailures: 0,
          providerUnits: 1,
          averageDurationMs: 100,
          approvedPublicSources: 1,
          lastRun: {
            status: "succeeded" as const,
            units: 1,
            durationMs: 100,
            responseCode: 200,
            finalUrl: "https://example.test/",
            contentSha256: "abc"
          },
          allowlistedSources: 1,
          workspaceEnabled: true,
          workspaceKilled: false,
          storageBytes: 0
        },
        connectors: {
          installations: 1,
          enabled: 1,
          succeeded: 1,
          failed: 0,
          blocked: 0,
          storageBytes: 0
        },
        security: { owners: 1, admins: 0, members: 1 }
      }
    ]
  };

  const reliability = {
    generatedAt: "2026-11-03T10:00:00.000Z",
    database: { reachable: true, latencyMs: 10, authorizedWorkspaces: 1 },
    runtime: {
      collectionRuntimeReady: true,
      browserlessConfigured: true,
      globalKillSwitchActive: false
    },
    signals: [
      {
        id: "integration",
        label: "Integration delivery",
        state: "attention" as const,
        value: "2 accepted",
        detail: "Current consumer evidence",
        href: "/integration-delivery"
      }
    ],
    exceptions: [
      {
        id: "delivery:1",
        workspaceName: "Reliability workspace",
        area: "Integration delivery",
        state: "attention" as const,
        title: "delivery retry review",
        detail: "First observed exception",
        href: "/integration-delivery",
        observedAt: "2026-11-03T09:00:00.000Z"
      },
      {
        id: "delivery:2",
        workspaceName: "Reliability workspace",
        area: "Integration delivery",
        state: "attention" as const,
        title: "delivery retry review",
        detail: "Second observed exception",
        href: "/integration-delivery",
        observedAt: "2026-11-03T09:30:00.000Z"
      }
    ],
    totals: { healthy: 6, attention: 1, critical: 0, inactive: 1, exceptions: 2 }
  };

  const result = buildReliabilityTrendReview({
    evidence: evidence as never,
    reliability
  });

  ensure(result.schema === "ai-data-platform.reliability-trend-review.v1", "schema");
  ensure(result.build === 279, "build number");
  ensure(result.baseline.comparable === true, "durable baseline");
  ensure(result.metrics.some((item) => item.id === "sync-conflicts" && item.direction === "improved"), "sync trend");
  ensure(result.metrics.some((item) => item.id === "repair-health" && item.direction === "improved"), "repair trend");
  ensure(result.failurePatterns.length === 1, "failure pattern grouping");
  ensure(result.failurePatterns[0]?.recurring === true, "recurring pattern");
  ensure(Boolean(result.failurePatterns[0]?.recoveryAction), "recovery action");
  ensure(result.exitCriterion.met === true, "exit criterion");

  const unclassified = buildReliabilityTrendReview({
    evidence: evidence as never,
    reliability: {
      ...reliability,
      signals: [
        {
          id: "unknown-critical",
          label: "Unknown",
          state: "critical" as const,
          value: "1",
          detail: "Needs classification",
          href: "/attention"
        }
      ],
      totals: { ...reliability.totals, critical: 1 }
    }
  });
  ensure(unclassified.exitCriterion.met === false, "unclassified critical keeps gate open");
  ensure(unclassified.totals.unclassifiedCriticalConditions === 1, "unclassified critical count");

  const [
    model,
    adapter,
    database,
    page,
    api,
    nav,
    pkg,
    doc,
    statusRaw,
    queue
  ] = await Promise.all([
    source("lib/reliability-trend-review.ts"),
    source("lib/reliability-trend-review-database.ts"),
    source("lib/production-learning-database.ts"),
    source("app/system-reliability/page.tsx"),
    source("app/api/system-reliability/trends/route.ts"),
    source("lib/application-navigation.ts"),
    source("package.json"),
    source("../../docs/BUILD_279_RELIABILITY_TREND_VALIDATION_FAILURE_PATTERNS_RECOVERY_READINESS.md"),
    source("../../docs/integration/ql266-ai-data-platform-build279-review.json"),
    source("../../docs/NEXT_BUILDS_273_280.md")
  ]);

  ensure(
    model.includes("baselineSyncConflicts") &&
      model.includes("baselineRepairChecks") &&
      model.includes("baselineIntegrationLiveAccepted") &&
      model.includes("baselineRetentionBudgetBreaches"),
    "durable trend baseline comparison"
  );
  ensure(
    model.includes("syntheticIncidentsCreated: false") &&
      model.includes("retriesAutomaticallyExecuted: false") &&
      model.includes("automaticRemediation: false"),
    "non-synthetic recovery boundary"
  );
  ensure(
    adapter.includes("buildProductionLearningReview") &&
      adapter.includes("buildSystemReliabilityDashboard"),
    "existing evidence composition"
  );
  ensure(
    database.includes("buildTrendValidationEvidence") &&
      database.includes("production_learning_cycle_snapshots"),
    "durable trend storage retained"
  );
  ensure(
    page.includes("Build 279") &&
      page.includes("Reliability Trend Validation, Failure Patterns &amp; Recovery Readiness") &&
      page.includes("Recovery readiness") &&
      page.includes("No automatic retry"),
    "Build 279 page"
  );
  ensure(
    page.includes("/api/system-reliability/trends") &&
      api.includes("buildReliabilityTrendReviewForUser") &&
      api.includes("status: 401"),
    "authenticated trend API"
  );
  ensure(
    nav.includes("trend comparison") &&
      nav.includes("recovery readiness"),
    "navigation guidance"
  );
  ensure(
    pkg.includes("verify-build-279-reliability-trend-review.ts"),
    "verifier registered"
  );
  ensure(
    doc.includes("Build 280 — Production Learning V, Owner Acceptance & Next-Batch Renewal"),
    "next build documentation"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 279, "status build");
  ensure(
    status.reliability_trend_review.synthetic_incidents_created === false &&
      status.reliability_trend_review.automatic_retry_execution === false &&
      status.reliability_trend_review.automatic_remediation === false,
    "status safety boundary"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED",
    "QL-266 boundary"
  );
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 280, "next build");
  ensure(
    queue.includes("Build 279 — Reliability Trend Validation, Failure Patterns & Recovery Readiness") &&
      queue.includes("Build 280 — Production Learning V, Owner Acceptance & Next-Batch Renewal"),
    "queue continuity"
  );

  console.log(
    "Build 279 reliability trend validation, failure patterns and recovery readiness verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
