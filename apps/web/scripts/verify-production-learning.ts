import {
  buildProductionLearningAssessment,
  type ProductionLearningEvidence
} from "../lib/production-learning";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const evidence: ProductionLearningEvidence = {
  generatedAt: "2026-10-09T12:00:00.000Z",
  browserless: {
    tokenConfigured: true,
    executionEnabled: false,
    globalKillSwitchActive: true,
    readyForLivePilot: false
  },
  profiles: { visible: 5, customActive: 0, customArchived: 0 },
  workspaces: [
    {
      workspaceId: "11111111-1111-4111-8111-111111111111",
      workspaceName: "Fixture",
      profileKey: "generic-business",
      profileName: "Generic Business",
      role: "owner",
      sync: {
        activeScrapers: 2,
        deletedScrapers: 0,
        reviewedDatasets: 1,
        deletedDatasets: 0,
        reviewedRows: 20,
        versionChanges: 3,
        storageBytes: 12000
      },
      outcomes: {
        storageBytes: 800,
        sync: {
          events: 20,
          applied: 15,
          deleted: 1,
          conflicts: 2,
          noops: 2,
          errors: 0
        },
        repair: {
          proposed: 4,
          approved: 3,
          rejected: 1,
          rolledBack: 0,
          compatibilityChecks: 3,
          healthy: 3,
          degraded: 0,
          broken: 0
        }
      },
      continuity: {
        previousSnapshotAt: "2026-10-08T12:00:00.000Z",
        previousSyncEvents: 10,
        previousSyncConflicts: 2,
        previousRepairCompatibilityChecks: 2,
        previousRepairHealthyChecks: 1
      },
      intelligence: {
        modules: 2,
        storageBytes: 5000,
        sourcePolicy: {
          present: true,
          sources: 2,
          approved: 1,
          blocked: 0,
          reviewRequired: 0,
          expired: 1
        },
        scheduled: {
          present: true,
          jobs: 1,
          enabled: 1,
          due: 0,
          unread: 0,
          attempts: 2
        }
      },
      integrations: {
        dryRuns: 1,
        approved: 1,
        exported: 0,
        cancelled: 0,
        deliveryAttempts: 0,
        conformanceAccepted: 0,
        liveAccepted: 0,
        deliveryRejected: 0,
        transportErrors: 0,
        handshakeAccepted: 0,
        handshakeRejected: 0,
        storageBytes: 0
      },
      retention: {
        policyPresent: true,
        cleanupApproved: false,
        archiveEligibleRows: 0,
        deleteEligibleRows: 0,
        deleteEligibleBytes: 0,
        cleanupRuns: 0,
        deletedRows: 0,
        failedRuns: 0,
        budgetBreaches: 0
      },
      barcode: {
        captures: 4,
        pending: 2,
        approved: 2,
        rejected: 0,
        duplicates: 0,
        camera: 3,
        manual: 1,
        storageBytes: 1000
      },
      remote: {
        jobs: 1,
        succeededJobs: 0,
        failedJobs: 0,
        cancelledJobs: 0,
        timedOutJobs: 0,
        providerRuns: 0,
        providerSuccesses: 0,
        providerFailures: 0,
        providerUnits: 0,
        averageDurationMs: null,
        approvedPublicSources: 1,
        lastRun: null,
        allowlistedSources: 1,
        workspaceEnabled: false,
        workspaceKilled: true,
        storageBytes: 2000
      },
      connectors: {
        installations: 1,
        enabled: 0,
        succeeded: 1,
        failed: 0,
        blocked: 1,
        storageBytes: 1000
      },
      security: { owners: 1, admins: 0, members: 0 }
    }
  ]
};

const review = buildProductionLearningAssessment(evidence);
assert(review.totals.workspaces === 1, "Workspace total is incorrect.");
assert(review.totals.barcodeCaptures === 4, "Barcode total is incorrect.");
assert(review.totals.providerRuns === 0, "Provider run total is incorrect.");
assert(
  review.findings.some(
    (finding) =>
      finding.key === "sync-outcome-telemetry" &&
      finding.status === "healthy"
  ),
  "Sync telemetry must be measured from durable outcomes."
);
assert(
  review.findings.some(
    (finding) =>
      finding.key === "repair-outcome-telemetry" &&
      finding.status === "healthy"
  ),
  "Repair telemetry must be measured from durable outcomes."
);
assert(
  review.findings.some(
    (finding) => finding.key === "source-policy-health" && finding.status === "action"
  ),
  "Expired source policies must require action."
);
assert(
  review.findings.some(
    (finding) => finding.key === "remote-cost-reliability"
  ),
  "Remote cost/reliability finding is missing."
);
assert(
  review.roadmap[0]?.build === 32 &&
    review.roadmap.some((item) => item.build === 32 && item.priority === "P0"),
  "Build 032 must remain P0 until a real provider baseline exists."
);

const baselineEvidence: ProductionLearningEvidence = {
  ...evidence,
  browserless: {
    tokenConfigured: true,
    executionEnabled: true,
    globalKillSwitchActive: true,
    readyForLivePilot: false
  },
  workspaces: evidence.workspaces.map((workspace) => ({
    ...workspace,
    remote: {
      ...workspace.remote,
      jobs: 2,
      succeededJobs: 1,
      providerRuns: 1,
      providerSuccesses: 1,
      providerFailures: 0,
      providerUnits: 1,
      averageDurationMs: 12000,
      approvedPublicSources: 1,
      allowlistedSources: 1,
      workspaceEnabled: false,
      workspaceKilled: true,
      lastRun: {
        status: "succeeded",
        units: 1,
        durationMs: 12000,
        responseCode: 200,
        finalUrl: "https://example.com/",
        contentSha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    }
  }))
};
const baselineReview = buildProductionLearningAssessment(baselineEvidence);
assert(
  baselineReview.totals.browserlessBaselineDecision === "go-bounded",
  "Successful one-page Browserless evidence must produce the bounded go decision."
);
assert(
  !baselineReview.roadmap.some((item) => item.build === 32),
  "Build 032 must leave the active roadmap after a real provider baseline exists."
);
assert(
  baselineReview.roadmap.some((item) => item.build === 33),
  "Build 033 must remain active until a live consumer acknowledgement exists."
);

const conformanceEvidence: ProductionLearningEvidence = {
  ...baselineEvidence,
  workspaces: baselineEvidence.workspaces.map((workspace) => ({
    ...workspace,
    integrations: {
      ...workspace.integrations,
      deliveryAttempts: 1,
      conformanceAccepted: 1
    }
  }))
};
const conformanceReview = buildProductionLearningAssessment(conformanceEvidence);
assert(
  conformanceReview.findings.some(
    (finding) =>
      finding.key === "integration-consumer-readiness" &&
      finding.status === "watch"
  ),
  "Conformance-only consumer evidence must remain WATCH until a live business consumer acknowledges."
);
assert(
  conformanceReview.roadmap.some((item) => item.build === 33),
  "Build 033 must remain active after conformance-only acceptance."
);

const liveConsumerEvidence: ProductionLearningEvidence = {
  ...conformanceEvidence,
  workspaces: conformanceEvidence.workspaces.map((workspace) => ({
    ...workspace,
    integrations: {
      ...workspace.integrations,
      deliveryAttempts: 2,
      liveAccepted: 1,
      handshakeAccepted: 1
    }
  }))
};
const liveConsumerReview = buildProductionLearningAssessment(liveConsumerEvidence);
assert(
  liveConsumerReview.findings.some(
    (finding) =>
      finding.key === "integration-consumer-readiness" &&
      finding.status === "healthy"
  ),
  "Live dry-run consumer acknowledgement must close the Build 033 delivery gap."
);
assert(
  !liveConsumerReview.roadmap.some((item) => item.build === 33),
  "Build 033 must leave the active roadmap only after live consumer acknowledgement evidence exists."
);
assert(
  !liveConsumerReview.roadmap.some((item) => item.build === 34),
  "Build 034 must leave the active roadmap when budgets are healthy and no delete-eligible rows exist."
);

const retentionPressureEvidence: ProductionLearningEvidence = {
  ...liveConsumerEvidence,
  workspaces: liveConsumerEvidence.workspaces.map((workspace) => ({
    ...workspace,
    retention: {
      ...workspace.retention,
      deleteEligibleRows: 3,
      deleteEligibleBytes: 4096
    }
  }))
};
const retentionPressureReview =
  buildProductionLearningAssessment(retentionPressureEvidence);
assert(
  retentionPressureReview.findings.some(
    (finding) =>
      finding.key === "storage-retention" && finding.status === "watch"
  ),
  "Delete-eligible rows must produce a WATCH retention finding."
);
assert(
  retentionPressureReview.roadmap.some((item) => item.build === 34),
  "Build 034 must remain active while bounded-delete candidates await approval/execution."
);

const retentionBreachEvidence: ProductionLearningEvidence = {
  ...liveConsumerEvidence,
  workspaces: liveConsumerEvidence.workspaces.map((workspace) => ({
    ...workspace,
    retention: {
      ...workspace.retention,
      budgetBreaches: 1
    }
  }))
};
const retentionBreachReview =
  buildProductionLearningAssessment(retentionBreachEvidence);
assert(
  retentionBreachReview.findings.some(
    (finding) =>
      finding.key === "storage-retention" && finding.status === "action"
  ),
  "A retention budget breach must produce an ACTION finding."
);

console.log(
  "Build 034 production-learning distinguishes healthy budgets, bounded cleanup candidates and storage-budget breaches."
);
