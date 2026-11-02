import type { RetentionClassKey } from "./retention";

export type RetentionGovernanceClass = {
  key: RetentionClassKey;
  label: string;
  oldestAt: string | null;
  newestAt: string | null;
  oldestAgeDays: number | null;
  retentionDays: number | null;
  disposition: "manual-archive" | "bounded-delete" | "retain-protected" | "bounded-in-place";
  protectedEvidence: boolean;
  rows: number;
  measuredBytes: number;
  archiveEligibleRows: number;
  deleteEligibleRows: number;
  deleteEligibleBytes: number;
  overBudget: boolean;
  ruleSummary: string;
};

export type RetentionGovernanceWorkspace = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  cleanupApproved: boolean;
  maxRowsPerRun: number;
  managedRows: number;
  measuredBytes: number;
  archiveEligibleRows: number;
  deleteEligibleRows: number;
  deleteEligibleBytes: number;
  protectedRows: number;
  protectedBytes: number;
  projectedRowsAfterFullEligibleDelete: number;
  projectedBytesAfterFullEligibleDelete: number;
  boundedDeleteRowsThisRun: number;
  classes: RetentionGovernanceClass[];
};

export type RetentionGovernanceModel = {
  generatedAt: string;
  workspaces: RetentionGovernanceWorkspace[];
  totals: {
    workspaces: number;
    managedRows: number;
    archiveEligibleRows: number;
    deleteEligibleRows: number;
    protectedRows: number;
  };
};
