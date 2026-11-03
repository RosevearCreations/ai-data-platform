import type { AdoptionWorkspaceReview } from "./adoption-database";
import type { SecurityAccessReviewModel } from "./security-access-review-contract";

export type LeastPrivilegeIssueType =
  | "ownerless-workspace"
  | "disabled-used-capability"
  | "high-risk-unused-capability"
  | "stale-connector-grant"
  | "unused-connector-grant"
  | "permission-review"
  | "privileged-member-review";

export type LeastPrivilegeIssue = {
  workspaceId: string;
  workspaceName: string;
  type: LeastPrivilegeIssueType;
  severity: "action" | "review";
  subject: string;
  detail: string;
  recommendation: string;
  ownerDispositionRequired: true;
};

export type LeastPrivilegeWorkspaceReview = {
  workspaceId: string;
  workspaceName: string;
  profileKey: string;
  role: "owner" | "admin" | "member";
  owners: number;
  admins: number;
  members: number;
  enabledCapabilities: string[];
  usedCapabilities: string[];
  unusedEnabledCapabilities: string[];
  highRiskUnusedCapabilities: string[];
  disabledUsedCapabilities: string[];
  connectorGrants: string[];
  connectorUsedGrants: string[];
  connectorUnusedGrants: string[];
  connectorStaleGrants: string[];
  privilegedMembersUnderReview: number;
  permissionStatus: "healthy" | "watch" | "action";
  issues: LeastPrivilegeIssue[];
};

export type LeastPrivilegeAdoptionReviewModel = {
  schema: "ai-data-platform.least-privilege-adoption-review.v1";
  generatedAt: string;
  build: 278;
  exitCriterion: {
    met: boolean;
    label: string;
    evidence: string;
  };
  totals: {
    workspaces: number;
    ownerlessWorkspaces: number;
    disabledUsedCapabilities: number;
    highRiskUnusedCapabilities: number;
    connectorUnusedGrants: number;
    connectorStaleGrants: number;
    permissionReviewWorkspaces: number;
    privilegedMembersUnderReview: number;
    unresolvedOwnerDispositionIssues: number;
  };
  boundaries: {
    recommendationsAdvisoryOnly: true;
    automaticRoleChanges: false;
    automaticCapabilityChanges: false;
    automaticGrantRevocation: false;
    automaticMembershipRemoval: false;
  };
  workspaces: LeastPrivilegeWorkspaceReview[];
  issues: LeastPrivilegeIssue[];
};

type AdoptionModel = {
  generatedAt: string;
  workspaces: AdoptionWorkspaceReview[];
};

export function buildLeastPrivilegeAdoptionReview(input: {
  adoption: AdoptionModel;
  security: SecurityAccessReviewModel;
}): LeastPrivilegeAdoptionReviewModel {
  const securityByWorkspace = new Map(
    input.security.workspaces.map((workspace) => [workspace.workspaceId, workspace])
  );

  const workspaces = input.adoption.workspaces.map(
    (workspace): LeastPrivilegeWorkspaceReview => {
      const issues: LeastPrivilegeIssue[] = [];
      const security = securityByWorkspace.get(workspace.workspaceId);
      const privilegedMembersUnderReview = (security?.members ?? []).filter(
        (member) =>
          (member.role === "owner" || member.role === "admin") &&
          member.state !== "healthy"
      ).length;

      if (workspace.permissions.owners === 0) {
        issues.push({
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          type: "ownerless-workspace",
          severity: "action",
          subject: "Workspace has no accountable owner",
          detail:
            "The current membership evidence reports zero owners for this workspace.",
          recommendation:
            "Assign an accountable owner through the existing workspace controls before expanding privileged automation.",
          ownerDispositionRequired: true
        });
      }

      for (const capability of workspace.capabilities.disabledUsed) {
        issues.push({
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          type: "disabled-used-capability",
          severity: "action",
          subject: "Disabled capability has observed use: " + capability,
          detail:
            "Durable activity exists for a profile capability that is currently disabled.",
          recommendation:
            "Investigate the profile mismatch and explicitly decide whether the profile or operational workflow should change.",
          ownerDispositionRequired: true
        });
      }

      for (const capability of workspace.capabilities.highRiskUnused) {
        issues.push({
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          type: "high-risk-unused-capability",
          severity: "review",
          subject: "High-risk capability is enabled but unused: " + capability,
          detail:
            "The capability is enabled in the workspace profile but has no durable usage evidence.",
          recommendation:
            "Review whether this capability should remain enabled; no capability flag is changed automatically.",
          ownerDispositionRequired: true
        });
      }

      const stale = new Set(workspace.connectors.staleUnusedGrants);
      for (const grant of workspace.connectors.unusedGrants) {
        issues.push({
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          type: stale.has(grant)
            ? "stale-connector-grant"
            : "unused-connector-grant",
          severity: stale.has(grant) ? "action" : "review",
          subject: (stale.has(grant) ? "Stale" : "Unused") + " connector grant: " + grant,
          detail: stale.has(grant)
            ? "The connector grant has no successful/failed execution evidence and is 30+ days stale under the existing adoption model."
            : "The connector grant has no successful/failed execution evidence.",
          recommendation:
            "Confirm whether the grant is still required and revoke it only through the existing explicit connector controls if approved.",
          ownerDispositionRequired: true
        });
      }

      if (workspace.permissions.status !== "healthy") {
        issues.push({
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          type: "permission-review",
          severity: workspace.permissions.status === "action" ? "action" : "review",
          subject: "Workspace permission review remains open",
          detail:
            workspace.permissions.recommendations.join(" ") ||
            "Current ownership/admin/capability/grant evidence requires review.",
          recommendation:
            "Record an explicit owner/admin decision using the existing workspace and profile controls; Build 278 does not apply access changes.",
          ownerDispositionRequired: true
        });
      }

      if (privilegedMembersUnderReview > 0) {
        issues.push({
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          type: "privileged-member-review",
          severity: "review",
          subject:
            String(privilegedMembersUnderReview) +
            " privileged member(s) have stale access evidence",
          detail:
            "Build 266 evidence identifies owner/admin membership with no recent reviewed privileged-operation activity.",
          recommendation:
            "Confirm the privileged role is still required before making any membership or role change.",
          ownerDispositionRequired: true
        });
      }

      return {
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        profileKey: workspace.profileKey,
        role: workspace.role,
        owners: workspace.permissions.owners,
        admins: workspace.permissions.admins,
        members: workspace.permissions.members,
        enabledCapabilities: workspace.capabilities.enabled,
        usedCapabilities: workspace.capabilities.used,
        unusedEnabledCapabilities: workspace.capabilities.unusedEnabled,
        highRiskUnusedCapabilities: workspace.capabilities.highRiskUnused,
        disabledUsedCapabilities: workspace.capabilities.disabledUsed,
        connectorGrants: workspace.connectors.grants,
        connectorUsedGrants: workspace.connectors.usedGrants,
        connectorUnusedGrants: workspace.connectors.unusedGrants,
        connectorStaleGrants: workspace.connectors.staleUnusedGrants,
        privilegedMembersUnderReview,
        permissionStatus: workspace.permissions.status,
        issues
      };
    }
  );

  const issues = workspaces.flatMap((workspace) => workspace.issues);
  const totals = {
    workspaces: workspaces.length,
    ownerlessWorkspaces: workspaces.filter((workspace) => workspace.owners === 0)
      .length,
    disabledUsedCapabilities: workspaces.reduce(
      (total, workspace) => total + workspace.disabledUsedCapabilities.length,
      0
    ),
    highRiskUnusedCapabilities: workspaces.reduce(
      (total, workspace) => total + workspace.highRiskUnusedCapabilities.length,
      0
    ),
    connectorUnusedGrants: workspaces.reduce(
      (total, workspace) => total + workspace.connectorUnusedGrants.length,
      0
    ),
    connectorStaleGrants: workspaces.reduce(
      (total, workspace) => total + workspace.connectorStaleGrants.length,
      0
    ),
    permissionReviewWorkspaces: workspaces.filter(
      (workspace) => workspace.permissionStatus !== "healthy"
    ).length,
    privilegedMembersUnderReview: workspaces.reduce(
      (total, workspace) => total + workspace.privilegedMembersUnderReview,
      0
    ),
    unresolvedOwnerDispositionIssues: issues.length
  };

  const met =
    totals.ownerlessWorkspaces === 0 &&
    totals.disabledUsedCapabilities === 0 &&
    totals.connectorStaleGrants === 0 &&
    totals.permissionReviewWorkspaces === 0;

  return {
    schema: "ai-data-platform.least-privilege-adoption-review.v1",
    generatedAt: input.adoption.generatedAt,
    build: 278,
    exitCriterion: {
      met,
      label:
        "No ownerless workspace, disabled-but-used capability, stale connector grant or unresolved permission-review workspace remains without an explicit owner disposition.",
      evidence:
        String(totals.ownerlessWorkspaces) +
        " ownerless workspace(s); " +
        String(totals.disabledUsedCapabilities) +
        " disabled-used capability slot(s); " +
        String(totals.connectorStaleGrants) +
        " stale connector grant(s); " +
        String(totals.permissionReviewWorkspaces) +
        " permission-review workspace(s); " +
        String(totals.highRiskUnusedCapabilities) +
        " high-risk unused capability slot(s)."
    },
    totals,
    boundaries: {
      recommendationsAdvisoryOnly: true,
      automaticRoleChanges: false,
      automaticCapabilityChanges: false,
      automaticGrantRevocation: false,
      automaticMembershipRemoval: false
    },
    workspaces,
    issues
  };
}
