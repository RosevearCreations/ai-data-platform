import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildRetentionCleanupReconciliation } from "../lib/retention-cleanup-reconciliation";
import type { RetentionGovernanceModel } from "../lib/retention-governance-contract";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 277 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

const baseClass = {
  oldestAt: "2026-01-01T00:00:00.000Z",
  newestAt: "2026-10-01T00:00:00.000Z",
  oldestAgeDays: 305,
  retentionDays: 90,
  disposition: "bounded-delete" as const,
  protectedEvidence: false,
  rows: 20,
  measuredBytes: 2000,
  budgetBytes: 5000,
  budgetOverageBytes: 0,
  archiveEligibleRows: 0,
  deleteEligibleRows: 5,
  deleteEligibleBytes: 500,
  overBudget: false,
  ruleSummary: "Bounded delete evidence."
};

async function main() {
  const healthy: RetentionGovernanceModel = {
    generatedAt: "2026-11-02T20:00:00.000Z",
    totals: {
      workspaces: 1,
      managedRows: 30,
      archiveEligibleRows: 3,
      deleteEligibleRows: 5,
      protectedRows: 5
    },
    workspaces: [
      {
        workspaceId: "27700000-0000-4000-8000-000000000001",
        workspaceName: "Healthy retention workspace",
        role: "owner",
        cleanupApproved: false,
        maxRowsPerRun: 100,
        managedRows: 30,
        measuredBytes: 3000,
        archiveEligibleRows: 3,
        deleteEligibleRows: 5,
        deleteEligibleBytes: 500,
        protectedRows: 5,
        protectedBytes: 400,
        projectedRowsAfterFullEligibleDelete: 25,
        projectedBytesAfterFullEligibleDelete: 2500,
        boundedDeleteRowsThisRun: 5,
        recentRuns: [
          {
            runId: "run-success",
            status: "completed",
            beforeRows: 35,
            afterRows: 30,
            beforeStorageBytes: 3500,
            afterStorageBytes: 3000,
            deletedBarcodeRows: 5,
            deletedRemoteJobs: 0,
            errorCode: null,
            createdAt: "2026-11-02T19:00:00.000Z"
          },
          {
            runId: "run-old-failure",
            status: "failed",
            beforeRows: 35,
            afterRows: 35,
            beforeStorageBytes: 3500,
            afterStorageBytes: 3500,
            deletedBarcodeRows: 0,
            deletedRemoteJobs: 0,
            errorCode: "historical_failure",
            createdAt: "2026-11-01T19:00:00.000Z"
          }
        ],
        classes: [
          {
            key: "barcode-terminal",
            label: "Barcode terminal evidence",
            ...baseClass
          },
          {
            key: "sync-payloads",
            label: "Synchronized payloads",
            oldestAt: "2025-01-01T00:00:00.000Z",
            newestAt: "2026-10-01T00:00:00.000Z",
            oldestAgeDays: 670,
            retentionDays: 365,
            disposition: "manual-archive",
            protectedEvidence: false,
            rows: 5,
            measuredBytes: 600,
            budgetBytes: 5000,
            budgetOverageBytes: 0,
            archiveEligibleRows: 3,
            deleteEligibleRows: 0,
            deleteEligibleBytes: 0,
            overBudget: false,
            ruleSummary: "Manual archive only."
          },
          {
            key: "integration-delivery-audit",
            label: "Integration delivery audit",
            oldestAt: "2026-05-01T00:00:00.000Z",
            newestAt: "2026-11-01T00:00:00.000Z",
            oldestAgeDays: 185,
            retentionDays: null,
            disposition: "retain-protected",
            protectedEvidence: true,
            rows: 5,
            measuredBytes: 400,
            budgetBytes: 5000,
            budgetOverageBytes: 0,
            archiveEligibleRows: 0,
            deleteEligibleRows: 0,
            deleteEligibleBytes: 0,
            overBudget: false,
            ruleSummary: "Protected evidence."
          }
        ]
      }
    ]
  };

  const healthyResult = buildRetentionCleanupReconciliation(healthy);
  ensure(
    healthyResult.schema === "ai-data-platform.retention-cleanup-reconciliation.v1",
    "schema"
  );
  ensure(healthyResult.build === 277, "build number");
  ensure(healthyResult.exitCriterion.met === true, "healthy criterion");
  ensure(
    healthyResult.totals.unresolvedFailedCleanups === 0,
    "later success resolves historical failure"
  );
  ensure(
    healthyResult.queue.some((item) => item.state === "approval-required"),
    "delete eligibility remains approval-gated"
  );
  ensure(
    healthyResult.queue.some((item) => item.state === "review-only"),
    "archive remains review-only"
  );
  ensure(
    healthyResult.queue.some((item) => item.state === "protected"),
    "protected evidence retained"
  );
  ensure(
    healthyResult.boundaries.reconciliationExecutesCleanup === false &&
      healthyResult.boundaries.deleteRequiresSeparateRunConfirmation === true,
    "cleanup boundary"
  );

  const blocked: RetentionGovernanceModel = {
    ...healthy,
    generatedAt: "2026-11-02T20:01:00.000Z",
    workspaces: [
      {
        ...healthy.workspaces[0],
        cleanupApproved: true,
        recentRuns: [
          {
            runId: "run-failed",
            status: "failed",
            beforeRows: 30,
            afterRows: 30,
            beforeStorageBytes: 6000,
            afterStorageBytes: 6000,
            deletedBarcodeRows: 0,
            deletedRemoteJobs: 0,
            errorCode: "cleanup_failed",
            createdAt: "2026-11-02T19:30:00.000Z"
          }
        ],
        classes: [
          {
            ...healthy.workspaces[0].classes[0],
            measuredBytes: 6000,
            budgetBytes: 5000,
            budgetOverageBytes: 1000,
            overBudget: true
          }
        ]
      }
    ]
  };
  const blockedResult = buildRetentionCleanupReconciliation(blocked);
  ensure(blockedResult.exitCriterion.met === false, "blocked criterion");
  ensure(blockedResult.totals.budgetBreaches === 1, "budget breach retained");
  ensure(
    blockedResult.totals.unresolvedFailedCleanups === 1,
    "latest failed cleanup unresolved"
  );
  ensure(
    blockedResult.queue.some(
      (item) => item.state === "action-required" && item.bytes === 1000
    ),
    "budget overage queue"
  );
  ensure(
    blockedResult.queue.some((item) => item.state === "authorized-bounded"),
    "existing approval still bounded"
  );

  const [
    model,
    adapter,
    governance,
    contract,
    page,
    api,
    controls,
    nav,
    pkg,
    doc,
    statusRaw,
    queue
  ] = await Promise.all([
    source("lib/retention-cleanup-reconciliation.ts"),
    source("lib/retention-cleanup-reconciliation-database.ts"),
    source("lib/retention-governance.ts"),
    source("lib/retention-governance-contract.ts"),
    source("app/retention/page.tsx"),
    source("app/api/retention/reconciliation/route.ts"),
    source("app/retention/RetentionControls.tsx"),
    source("lib/application-navigation.ts"),
    source("package.json"),
    source("../../docs/BUILD_277_RETENTION_CLEANUP_READINESS_STORAGE_BUDGET_RECONCILIATION.md"),
    source("../../docs/integration/ql266-ai-data-platform-build277-review.json"),
    source("../../docs/NEXT_BUILDS_273_280.md")
  ]);

  for (const token of [
    "budgetBreaches",
    "unresolvedFailedCleanup",
    "archiveEligibleRows",
    "deleteEligibleRows",
    "deleteEligibleBytes",
    "protectedRows",
    "boundedDeleteRowsThisRun",
    "projectedRowsAfterFullEligibleDelete"
  ]) {
    ensure(model.includes(token), "reconciliation evidence " + token);
  }
  ensure(
    contract.includes("budgetBytes") &&
      contract.includes("budgetOverageBytes") &&
      governance.includes("retentionClass.budgetBytes"),
    "budget evidence surfaced through governance"
  );
  ensure(
    !model.includes("executeRetentionCleanup") &&
      !adapter.includes("executeRetentionCleanup") &&
      !api.includes("executeRetentionCleanup") &&
      !model.includes("fetch(") &&
      !adapter.includes("fetch(") &&
      !api.includes("fetch("),
    "reconciliation is read-only"
  );
  ensure(
    page.includes("Build 277") &&
      page.includes("Retention Cleanup Readiness &amp; Storage Budget Reconciliation") &&
      page.includes("Deployment approval is not cleanup approval"),
    "Build 277 page"
  );
  ensure(
    page.includes("/api/retention/reconciliation") &&
      api.includes("buildRetentionCleanupReconciliationForUser") &&
      api.includes('status: 401'),
    "authenticated reconciliation API"
  );
  ensure(
    controls.includes("APPROVE CLEANUP") &&
      controls.includes("RUN CLEANUP"),
    "existing explicit cleanup gates preserved"
  );
  ensure(
    nav.includes('label: "Retention Cleanup Readiness"'),
    "navigation"
  );
  ensure(
    pkg.includes("verify-build-277-retention-cleanup-reconciliation.ts"),
    "verifier registered"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 277, "status build");
  ensure(
    status.retention_cleanup_reconciliation.reconciliation_executes_cleanup === false &&
      status.retention_cleanup_reconciliation.automatic_archive === false &&
      status.retention_cleanup_reconciliation.automatic_delete === false &&
      status.retention_cleanup_reconciliation.automatic_cleanup_approval === false,
    "no automatic cleanup mutation"
  );
  ensure(
    status.authorization.rls_preserved === true &&
      status.authorization.existing_cleanup_confirmation_preserved === true &&
      status.authorization.cleanup_gate_bypass === false,
    "authorization boundary"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED",
    "QL-266 boundary"
  );
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 278, "next build");

  ensure(
    doc.includes("A later successful cleanup run resolves the historical failure") &&
      doc.includes("Deployment approval") &&
      doc.includes("Build 278 — Least-Privilege Adoption, Stale Grants & Capability Cleanup Review"),
    "documentation"
  );
  ensure(
    queue.includes("Build 277 — Retention Cleanup Readiness & Storage Budget Reconciliation") &&
      queue.includes("Build 278 — Least-Privilege Adoption, Stale Grants & Capability Cleanup Review"),
    "queue continuity"
  );

  console.log(
    "Build 277 retention cleanup readiness and storage budget reconciliation verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
