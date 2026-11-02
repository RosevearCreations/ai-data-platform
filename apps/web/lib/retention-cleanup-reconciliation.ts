import type {
  RetentionGovernanceModel,
  RetentionGovernanceWorkspace
} from "./retention-governance-contract";

export type RetentionCleanupQueueState =
  | "action-required"
  | "approval-required"
  | "authorized-bounded"
  | "review-only"
  | "protected"
  | "monitor";

export type RetentionCleanupQueueItem = {
  workspaceId: string;
  workspaceName: string;
  classKey: string | null;
  title: string;
  detail: string;
  state: RetentionCleanupQueueState;
  rows: number;
  bytes: number;
};

export type RetentionCleanupWorkspaceReconciliation = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  cleanupApproved: boolean;
  budgetBreaches: number;
  unresolvedFailedCleanup: boolean;
  latestCleanupRunStatus: "completed" | "failed" | null;
  latestCleanupErrorCode: string | null;
  archiveEligibleRows: number;
  deleteEligibleRows: number;
  deleteEligibleBytes: number;
  boundedDeleteRowsThisRun: number;
  protectedRows: number;
  protectedBytes: number;
  projectedRowsAfterFullEligibleDelete: number;
  projectedBytesAfterFullEligibleDelete: number;
  queue: RetentionCleanupQueueItem[];
};

export type RetentionCleanupReconciliationModel = {
  schema: "ai-data-platform.retention-cleanup-reconciliation.v1";
  generatedAt: string;
  build: 277;
  exitCriterion: {
    met: boolean;
    label: string;
    evidence: string;
  };
  totals: {
    workspaces: number;
    budgetBreaches: number;
    unresolvedFailedCleanups: number;
    archiveEligibleRows: number;
    deleteEligibleRows: number;
    deleteEligibleBytes: number;
    protectedRows: number;
    queueItems: number;
  };
  boundaries: {
    reconciliationExecutesCleanup: false;
    protectedEvidenceExcluded: true;
    archiveCandidatesPreviewOnly: true;
    deleteRequiresCleanupApproval: true;
    deleteRequiresSeparateRunConfirmation: true;
  };
  workspaces: RetentionCleanupWorkspaceReconciliation[];
  queue: RetentionCleanupQueueItem[];
};

function workspaceQueue(
  workspace: RetentionGovernanceWorkspace
): RetentionCleanupQueueItem[] {
  const queue: RetentionCleanupQueueItem[] = [];

  for (const retentionClass of workspace.classes) {
    if (retentionClass.overBudget) {
      queue.push({
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        classKey: retentionClass.key,
        title: retentionClass.label + " exceeds storage budget",
        detail:
          String(retentionClass.measuredBytes) +
          " measured bytes against " +
          String(retentionClass.budgetBytes) +
          " budget bytes; overage " +
          String(retentionClass.budgetOverageBytes) +
          " bytes.",
        state: "action-required",
        rows: retentionClass.rows,
        bytes: retentionClass.budgetOverageBytes
      });
    }

    if (retentionClass.archiveEligibleRows > 0) {
      queue.push({
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        classKey: retentionClass.key,
        title: retentionClass.label + " has manual archive candidates",
        detail:
          String(retentionClass.archiveEligibleRows) +
          " row(s) require an operator archive decision; Build 277 never archives automatically.",
        state: "review-only",
        rows: retentionClass.archiveEligibleRows,
        bytes: 0
      });
    }

    if (retentionClass.deleteEligibleRows > 0) {
      queue.push({
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        classKey: retentionClass.key,
        title: retentionClass.label + " has bounded-delete candidates",
        detail: workspace.cleanupApproved
          ? String(retentionClass.deleteEligibleRows) +
            " row(s) are eligible under the existing policy; a separate RUN CLEANUP confirmation is still required and the run remains bounded."
          : String(retentionClass.deleteEligibleRows) +
            " row(s) are eligible but cleanup approval is not active.",
        state: workspace.cleanupApproved
          ? "authorized-bounded"
          : "approval-required",
        rows: retentionClass.deleteEligibleRows,
        bytes: retentionClass.deleteEligibleBytes
      });
    }

    if (retentionClass.protectedEvidence && retentionClass.rows > 0) {
      queue.push({
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        classKey: retentionClass.key,
        title: retentionClass.label + " remains protected evidence",
        detail:
          String(retentionClass.rows) +
          " row(s) remain excluded from Build 277 destructive cleanup.",
        state: "protected",
        rows: retentionClass.rows,
        bytes: retentionClass.measuredBytes
      });
    }
  }

  const latestRun = workspace.recentRuns[0] ?? null;
  if (latestRun?.status === "failed") {
    queue.unshift({
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.workspaceName,
      classKey: null,
      title: "Latest bounded cleanup run failed",
      detail:
        (latestRun.errorCode ?? "unknown cleanup failure") +
        "; no later successful cleanup run is present in current evidence.",
      state: "action-required",
      rows: 0,
      bytes: 0
    });
  }

  if (queue.length === 0) {
    queue.push({
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.workspaceName,
      classKey: null,
      title: "Retention controls within current readiness thresholds",
      detail:
        "No storage-budget breach, unresolved cleanup failure, archive candidate or delete candidate requires action.",
      state: "monitor",
      rows: 0,
      bytes: 0
    });
  }

  return queue;
}

export function buildRetentionCleanupReconciliation(
  governance: RetentionGovernanceModel
): RetentionCleanupReconciliationModel {
  const workspaces = governance.workspaces.map(
    (workspace): RetentionCleanupWorkspaceReconciliation => {
      const latestRun = workspace.recentRuns[0] ?? null;
      return {
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        role: workspace.role,
        cleanupApproved: workspace.cleanupApproved,
        budgetBreaches: workspace.classes.filter((item) => item.overBudget).length,
        unresolvedFailedCleanup: latestRun?.status === "failed",
        latestCleanupRunStatus: latestRun?.status ?? null,
        latestCleanupErrorCode: latestRun?.errorCode ?? null,
        archiveEligibleRows: workspace.archiveEligibleRows,
        deleteEligibleRows: workspace.deleteEligibleRows,
        deleteEligibleBytes: workspace.deleteEligibleBytes,
        boundedDeleteRowsThisRun: workspace.boundedDeleteRowsThisRun,
        protectedRows: workspace.protectedRows,
        protectedBytes: workspace.protectedBytes,
        projectedRowsAfterFullEligibleDelete:
          workspace.projectedRowsAfterFullEligibleDelete,
        projectedBytesAfterFullEligibleDelete:
          workspace.projectedBytesAfterFullEligibleDelete,
        queue: workspaceQueue(workspace)
      };
    }
  );

  const queue = workspaces.flatMap((workspace) => workspace.queue);
  const totals = {
    workspaces: workspaces.length,
    budgetBreaches: workspaces.reduce(
      (total, workspace) => total + workspace.budgetBreaches,
      0
    ),
    unresolvedFailedCleanups: workspaces.filter(
      (workspace) => workspace.unresolvedFailedCleanup
    ).length,
    archiveEligibleRows: workspaces.reduce(
      (total, workspace) => total + workspace.archiveEligibleRows,
      0
    ),
    deleteEligibleRows: workspaces.reduce(
      (total, workspace) => total + workspace.deleteEligibleRows,
      0
    ),
    deleteEligibleBytes: workspaces.reduce(
      (total, workspace) => total + workspace.deleteEligibleBytes,
      0
    ),
    protectedRows: workspaces.reduce(
      (total, workspace) => total + workspace.protectedRows,
      0
    ),
    queueItems: queue.length
  };
  const met =
    totals.budgetBreaches === 0 && totals.unresolvedFailedCleanups === 0;

  return {
    schema: "ai-data-platform.retention-cleanup-reconciliation.v1",
    generatedAt: governance.generatedAt,
    build: 277,
    exitCriterion: {
      met,
      label:
        "No unresolved retention storage-budget breach or latest failed cleanup run remains; delete-eligible data may remain only behind the existing explicit approval and separate bounded-run confirmation.",
      evidence:
        String(totals.budgetBreaches) +
        " budget breach(es); " +
        String(totals.unresolvedFailedCleanups) +
        " unresolved failed cleanup(s); " +
        String(totals.deleteEligibleRows) +
        " delete-eligible row(s); " +
        String(totals.archiveEligibleRows) +
        " archive candidate row(s)."
    },
    totals,
    boundaries: {
      reconciliationExecutesCleanup: false,
      protectedEvidenceExcluded: true,
      archiveCandidatesPreviewOnly: true,
      deleteRequiresCleanupApproval: true,
      deleteRequiresSeparateRunConfirmation: true
    },
    workspaces,
    queue
  };
}
