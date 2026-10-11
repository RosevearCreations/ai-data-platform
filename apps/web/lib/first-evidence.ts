import type { AdoptionWorkspaceReview } from "./adoption-database";

export type FirstEvidenceStepStatus =
  | "complete"
  | "ready"
  | "gated"
  | "not-applicable";

export interface FirstEvidenceStep {
  key:
    | "sync"
    | "source-policy"
    | "barcode"
    | "scheduled"
    | "remote"
    | "integration"
    | "connector";
  title: string;
  status: FirstEvidenceStepStatus;
  evidence: string;
  instruction: string;
  href: string;
  operatorGate: boolean;
}

export interface WorkspaceFirstEvidencePlan {
  workspaceId: string;
  workspaceName: string;
  profileKey: string;
  profileName: string;
  role: "owner" | "admin" | "member";
  hasDurableEvidence: boolean;
  activityEvents: number;
  completeSteps: number;
  applicableSteps: number;
  recommendedStepKey: FirstEvidenceStep["key"] | null;
  steps: FirstEvidenceStep[];
}

function enabled(
  workspace: AdoptionWorkspaceReview,
  capability:
    | "history"
    | "sourcePolicy"
    | "scheduledJobs"
    | "remoteExecution"
    | "barcodeIntake"
    | "businessIntegrations"
) {
  return workspace.capabilities.enabled.includes(capability);
}

export function buildWorkspaceFirstEvidencePlan(
  workspace: AdoptionWorkspaceReview
): WorkspaceFirstEvidencePlan {
  const steps: FirstEvidenceStep[] = [];

  steps.push({
    key: "sync",
    title: "Create one real synchronized workspace asset",
    status: !enabled(workspace, "history")
      ? "not-applicable"
      : workspace.activity.sync > 0
        ? "complete"
        : "ready",
    evidence:
      workspace.activity.sync > 0
        ? String(workspace.activity.sync) + " durable sync activity unit(s) are recorded."
        : "No synchronized saved scraper/reviewed-dataset activity is recorded yet.",
    instruction:
      "In the Chrome extension, connect to this workspace, save or review one real item you actually need, then synchronize it. Do not create a throwaway fixture just to satisfy the metric.",
    href: "/help",
    operatorGate: false
  });

  steps.push({
    key: "source-policy",
    title: "Review one real source policy",
    status: !enabled(workspace, "sourcePolicy")
      ? "not-applicable"
      : workspace.activity.sourcePolicySources > 0
        ? "complete"
        : "ready",
    evidence:
      workspace.activity.sourcePolicySources > 0
        ? String(workspace.activity.sourcePolicySources) +
          " durable source-policy source(s) are recorded."
        : "No synchronized source-policy source is recorded yet.",
    instruction:
      "Use Source Policy Registry in the extension for a real source you intend to use. Review authorization, terms/robots, sensitivity and crawl limits before approving and synchronizing it.",
    href: "/intelligence",
    operatorGate: false
  });

  steps.push({
    key: "barcode",
    title: "Capture and review one real barcode",
    status: !enabled(workspace, "barcodeIntake")
      ? "not-applicable"
      : workspace.activity.barcodeCaptures > 0
        ? "complete"
        : "ready",
    evidence:
      workspace.activity.barcodeCaptures > 0
        ? String(workspace.activity.barcodeCaptures) +
          " real barcode capture(s) are recorded."
        : "No barcode capture is recorded for this workspace.",
    instruction:
      "If barcode intake is genuinely useful for this workspace, scan or enter one real item and complete the normal review. Skip this step when there is no real item to capture.",
    href: "/capture",
    operatorGate: false
  });

  const scheduledReady =
    enabled(workspace, "scheduledJobs") &&
    (!enabled(workspace, "sourcePolicy") ||
      workspace.activity.sourcePolicySources > 0);
  steps.push({
    key: "scheduled",
    title: "Create/run one reviewed scheduled workflow",
    status: !enabled(workspace, "scheduledJobs")
      ? "not-applicable"
      : workspace.activity.scheduledJobs > 0 ||
          workspace.activity.scheduledAttempts > 0
        ? "complete"
        : scheduledReady
          ? "ready"
          : "gated",
    evidence:
      workspace.activity.scheduledJobs > 0 ||
      workspace.activity.scheduledAttempts > 0
        ? String(workspace.activity.scheduledJobs) +
          " job(s) / " +
          String(workspace.activity.scheduledAttempts) +
          " attempt(s) are recorded."
        : scheduledReady
          ? "The profile permits scheduling and its source-policy prerequisite is satisfied."
          : "Scheduling remains gated until a current approved source policy exists.",
    instruction:
      scheduledReady
        ? "Create a local scheduled job only for a real recurring need, pin the exact approved source-policy revision, and run it with the normal review boundary."
        : "Complete the real source-policy step first; do not bypass the Build 025 policy gate.",
    href: "/intelligence",
    operatorGate: false
  });

  steps.push({
    key: "remote",
    title: "Remote browser pilot",
    status: !enabled(workspace, "remoteExecution")
      ? "not-applicable"
      : workspace.activity.remoteRuns > 0
        ? "complete"
        : "gated",
    evidence:
      workspace.activity.remoteRuns > 0
        ? String(workspace.activity.remoteRuns) +
          " terminal provider run(s) are recorded."
        : "No real provider run is recorded. Build 032 remains an explicit operator gate.",
    instruction:
      "Do not use remote execution merely to create adoption evidence. Run the one-page Browserless pilot only when a real approved public-source need exists and the existing Build 032 gates are intentionally authorized.",
    href: "/remote-execution",
    operatorGate: true
  });

  steps.push({
    key: "integration",
    title: "Business integration handoff",
    status: !enabled(workspace, "businessIntegrations")
      ? "not-applicable"
      : workspace.activity.integrationEvents > 0
        ? "complete"
        : "gated",
    evidence:
      workspace.activity.integrationEvents > 0
        ? String(workspace.activity.integrationEvents) +
          " integration evidence event(s) are recorded."
        : "No integration evidence is recorded. Live delivery still depends on the Build 033 receiver gate.",
    instruction:
      "Use conformance/dry-run delivery only for a real reviewed handoff. Do not configure a fake receiver or enable downstream mutation to close the metric.",
    href: "/integration-delivery",
    operatorGate: true
  });

  if (workspace.connectors.installations > 0) {
    steps.push({
      key: "connector",
      title: "Exercise an installed connector within its grant",
      status: workspace.connectors.executions > 0 ? "complete" : "ready",
      evidence:
        workspace.connectors.executions > 0
          ? String(workspace.connectors.executions) +
            " connector execution(s) are recorded."
          : String(workspace.connectors.installations) +
            " connector installation(s) exist with no execution evidence.",
      instruction:
        "Run an installed connector only when its granted capability is needed for real work. Keep the existing least-privilege grant boundary.",
      href: "/connectors",
      operatorGate: false
    });
  }

  const applicable = steps.filter((step) => step.status !== "not-applicable");
  const complete = applicable.filter((step) => step.status === "complete");
  const recommended =
    applicable.find((step) => step.status === "ready") ??
    applicable.find((step) => step.status === "gated") ??
    null;

  return {
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.workspaceName,
    profileKey: workspace.profileKey,
    profileName: workspace.profileName,
    role: workspace.role,
    hasDurableEvidence: workspace.activityEvents > 0,
    activityEvents: workspace.activityEvents,
    completeSteps: complete.length,
    applicableSteps: applicable.length,
    recommendedStepKey: recommended?.key ?? null,
    steps
  };
}

export function buildFirstEvidenceRunbook(
  workspaces: AdoptionWorkspaceReview[]
) {
  const plans = workspaces.map(buildWorkspaceFirstEvidencePlan);
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      workspaces: plans.length,
      evidenceEstablished: plans.filter((plan) => plan.hasDurableEvidence).length,
      needingFirstEvidence: plans.filter((plan) => !plan.hasDurableEvidence).length,
      readySteps: plans.reduce(
        (sum, plan) =>
          sum + plan.steps.filter((step) => step.status === "ready").length,
        0
      ),
      gatedSteps: plans.reduce(
        (sum, plan) =>
          sum + plan.steps.filter((step) => step.status === "gated").length,
        0
      )
    },
    workspaces: plans
  };
}
