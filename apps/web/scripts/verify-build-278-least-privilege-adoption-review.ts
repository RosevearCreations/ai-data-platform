import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildLeastPrivilegeAdoptionReview } from "../lib/least-privilege-adoption-review";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 278 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const workspaceId = "27800000-0000-4000-8000-000000000001";
  const adoption = {
    generatedAt: "2026-11-02T23:50:00.000Z",
    workspaces: [
      {
        workspaceId,
        workspaceName: "Least privilege workspace",
        profileKey: "custom",
        profileName: "Custom",
        role: "owner" as const,
        activityEvents: 5,
        activity: {
          sync: 1,
          sourcePolicySources: 1,
          scheduledJobs: 0,
          scheduledAttempts: 0,
          remoteJobs: 0,
          remoteRuns: 0,
          barcodeCaptures: 0,
          integrationEvents: 1,
          connectorExecutions: 2
        },
        capabilities: {
          enabled: ["history", "remoteExecution", "businessIntegrations"],
          used: ["history", "businessIntegrations"],
          unusedEnabled: ["remoteExecution"],
          highRiskUnused: ["remoteExecution"],
          disabledUsed: ["sourcePolicy"]
        },
        connectors: {
          installations: 1,
          enabledInstallations: 1,
          grants: ["sample:read", "sample:write"],
          usedGrants: ["sample:read"],
          unusedGrants: ["sample:write"],
          staleUnusedGrants: ["sample:write"],
          executions: 2,
          blockedAttempts: 0
        },
        permissions: {
          owners: 0,
          admins: 2,
          members: 1,
          status: "action" as const,
          recommendations: [
            "Assign an accountable owner before expanding automation or connector access."
          ]
        },
        trend: {
          previousSnapshotAt: null,
          activityEventsDelta: null,
          usedCapabilitiesDelta: null,
          connectorUsedGrantsDelta: null
        },
        snapshotCount: 1
      }
    ]
  };

  const security = {
    generatedAt: "2026-11-02T23:50:00.000Z",
    workspaces: [
      {
        workspaceId,
        workspaceName: "Least privilege workspace",
        currentRole: "owner" as const,
        profileKey: "custom",
        effectiveCapabilities: ["history", "remoteExecution", "businessIntegrations"],
        members: [
          {
            userId: "owner-1",
            name: "Owner",
            role: "owner" as const,
            memberSince: "2026-01-01T00:00:00.000Z",
            lastPrivilegedActivityAt: null,
            state: "review" as const,
            reasons: ["No recent privileged-operation evidence."],
            recommendations: ["Confirm role."]
          }
        ],
        connectors: [],
        privilegedOperationCount: 0,
        reviewNotes: ["Advisory only."]
      }
    ],
    totals: {
      workspaces: 1,
      members: 1,
      attentionMembers: 1,
      unusedConnectorGrants: 0,
      privilegedOperations: 0
    }
  };

  const result = buildLeastPrivilegeAdoptionReview({
    adoption: adoption as never,
    security
  });
  ensure(
    result.schema === "ai-data-platform.least-privilege-adoption-review.v1",
    "schema"
  );
  ensure(result.build === 278, "build number");
  ensure(result.exitCriterion.met === false, "open exception criterion");
  ensure(result.totals.ownerlessWorkspaces === 1, "ownerless workspace");
  ensure(result.totals.disabledUsedCapabilities === 1, "disabled-used capability");
  ensure(result.totals.highRiskUnusedCapabilities === 1, "high-risk unused");
  ensure(result.totals.connectorUnusedGrants === 1, "unused grant");
  ensure(result.totals.connectorStaleGrants === 1, "stale grant");
  ensure(result.totals.permissionReviewWorkspaces === 1, "permission review");
  ensure(result.totals.privilegedMembersUnderReview === 1, "privileged member review");
  for (const type of [
    "ownerless-workspace",
    "disabled-used-capability",
    "high-risk-unused-capability",
    "stale-connector-grant",
    "permission-review",
    "privileged-member-review"
  ]) {
    ensure(result.issues.some((issue) => issue.type === type), "issue " + type);
  }
  ensure(
    result.issues.every((issue) => issue.ownerDispositionRequired === true),
    "owner disposition requirement"
  );
  ensure(
    result.boundaries.recommendationsAdvisoryOnly === true &&
      result.boundaries.automaticRoleChanges === false &&
      result.boundaries.automaticCapabilityChanges === false &&
      result.boundaries.automaticGrantRevocation === false &&
      result.boundaries.automaticMembershipRemoval === false,
    "advisory boundaries"
  );

  const healthy = buildLeastPrivilegeAdoptionReview({
    adoption: {
      generatedAt: "2026-11-02T23:51:00.000Z",
      workspaces: [
        {
          ...adoption.workspaces[0],
          capabilities: {
            enabled: ["history"],
            used: ["history"],
            unusedEnabled: [],
            highRiskUnused: [],
            disabledUsed: []
          },
          connectors: {
            installations: 1,
            enabledInstallations: 1,
            grants: ["sample:read"],
            usedGrants: ["sample:read"],
            unusedGrants: [],
            staleUnusedGrants: [],
            executions: 2,
            blockedAttempts: 0
          },
          permissions: {
            owners: 1,
            admins: 1,
            members: 1,
            status: "healthy" as const,
            recommendations: ["Current measured permissions are proportionate."]
          }
        }
      ]
    } as never,
    security: {
      ...security,
      workspaces: [
        {
          ...security.workspaces[0],
          members: [
            {
              ...security.workspaces[0].members[0],
              state: "healthy" as const,
              lastPrivilegedActivityAt: "2026-11-01T00:00:00.000Z",
              reasons: [],
              recommendations: []
            }
          ]
        }
      ],
      totals: {
        ...security.totals,
        attentionMembers: 0
      }
    }
  });
  ensure(healthy.exitCriterion.met === true, "healthy criterion");
  ensure(healthy.issues.length === 0, "healthy issues");

  const [
    model,
    adapter,
    adoptionDatabase,
    adoptionCore,
    securityReview,
    page,
    api,
    nav,
    help,
    pkg,
    doc,
    statusRaw,
    queue
  ] = await Promise.all([
    source("lib/least-privilege-adoption-review.ts"),
    source("lib/least-privilege-adoption-review-database.ts"),
    source("lib/adoption-database.ts"),
    source("lib/adoption.ts"),
    source("lib/security-access-review.ts"),
    source("app/adoption/page.tsx"),
    source("app/api/adoption/least-privilege/route.ts"),
    source("lib/application-navigation.ts"),
    source("app/help/help-content.ts"),
    source("package.json"),
    source("../../docs/BUILD_278_LEAST_PRIVILEGE_ADOPTION_STALE_GRANTS_CAPABILITY_CLEANUP_REVIEW.md"),
    source("../../docs/integration/ql266-ai-data-platform-build278-review.json"),
    source("../../docs/NEXT_BUILDS_273_280.md")
  ]);

  for (const token of [
    "ownerless-workspace",
    "disabled-used-capability",
    "high-risk-unused-capability",
    "stale-connector-grant",
    "permission-review",
    "privileged-member-review",
    "ownerDispositionRequired"
  ]) {
    ensure(model.includes(token), "model token " + token);
  }

  ensure(
    adapter.includes("buildAdoptionReview") &&
      adapter.includes("buildSecurityAccessReview"),
    "Build 035 and Build 266 evidence composition"
  );
  ensure(
    adoptionDatabase.includes("workspace_adoption_review_snapshots") &&
      adoptionDatabase.includes("connectorStaleGrants"),
    "durable adoption evidence"
  );
  ensure(
    adoptionCore.includes("30 * 24 * 60 * 60 * 1000") &&
      adoptionCore.includes("staleUnusedGrants"),
    "30-day stale grant rule retained"
  );
  ensure(
    securityReview.includes("workspace_members") &&
      securityReview.includes("last_privileged_at") &&
      securityReview.includes("inactiveDays>=90"),
    "Build 266 privileged access evidence retained"
  );
  ensure(
    !model.includes("update app.") &&
      !model.includes("delete from") &&
      !adapter.includes("update app.") &&
      !adapter.includes("delete from") &&
      !api.includes("update app.") &&
      !api.includes("delete from"),
    "no permission mutation path"
  );
  ensure(
    page.includes("Build 278") &&
      page.includes("Least-Privilege Adoption, Stale Grants &amp; Capability Cleanup Review") &&
      page.includes("owner disposition required") &&
      page.includes("never removes members"),
    "Build 278 page"
  );
  ensure(
    page.includes("/api/adoption/least-privilege") &&
      api.includes("buildLeastPrivilegeAdoptionReviewForUser") &&
      api.includes('status: 401'),
    "authenticated least-privilege API"
  );
  ensure(
    nav.includes("stale grants") &&
      nav.includes("without automatic access changes"),
    "navigation guidance"
  );
  ensure(
    help.includes("Build 278 combines this adoption evidence with Build 266 access review") &&
      help.includes("owner/admin review only"),
    "help guidance"
  );
  ensure(
    pkg.includes("verify-build-278-least-privilege-adoption-review.ts"),
    "verifier registered"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 278, "status build");
  ensure(
    status.least_privilege_adoption_review.recommendations_advisory_only === true &&
      status.least_privilege_adoption_review.automatic_role_changes === false &&
      status.least_privilege_adoption_review.automatic_membership_removal === false &&
      status.least_privilege_adoption_review.automatic_capability_changes === false &&
      status.least_privilege_adoption_review.automatic_grant_revocation === false,
    "no automatic access changes"
  );
  ensure(
    status.authorization.rls_preserved === true &&
      status.authorization.profile_mutation_gate_bypass === false &&
      status.authorization.connector_grant_gate_bypass === false,
    "authorization boundaries"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED",
    "QL-266 boundary"
  );
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 279, "next build");

  ensure(
    doc.includes("Build 035 adoption evidence and Build 266 security/access review") &&
      doc.includes("does **not**") &&
      doc.includes("Build 279 — Reliability Trend Validation, Failure Patterns & Recovery Readiness"),
    "documentation"
  );
  ensure(
    queue.includes("Build 278 — Least-Privilege Adoption, Stale Grants & Capability Cleanup Review") &&
      queue.includes("Build 279 — Reliability Trend Validation, Failure Patterns & Recovery Readiness"),
    "queue continuity"
  );

  console.log(
    "Build 278 least-privilege adoption, stale grants and capability cleanup review verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
