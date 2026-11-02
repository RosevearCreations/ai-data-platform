import type { WorkspaceFirstEvidencePlan } from "./first-evidence";
import type { GuidedRunbook, RunbookStep } from "./workflow-orchestration-contract";

export type FirstEvidenceCompletionState =
  | "evidence-established"
  | "needs-first-evidence";

export type FirstEvidenceJourneyStage = {
  id: "collect" | "review" | "approve" | "publish" | "deliver";
  label: string;
  status: RunbookStep["status"];
  evidence: string[];
  gate: string;
  href: string;
  actionLabel: string;
};

export type WorkspaceFirstEvidenceCompletion = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  profileName: string;
  state: FirstEvidenceCompletionState;
  activityEvents: number;
  hasDurableEvidence: boolean;
  nextAction: {
    kind: "profile-step" | "journey-stage" | "monitor";
    key: string;
    label: string;
    href: string;
    gated: boolean;
  };
  journey: {
    completeStages: number;
    totalStages: number;
    stages: FirstEvidenceJourneyStage[];
  };
};

export type FirstEvidenceCompletionModel = {
  schema: "ai-data-platform.first-evidence-completion.v1";
  generatedAt: string;
  build: 274;
  exitCriterion: {
    met: boolean;
    label: string;
    evidence: string;
  };
  totals: {
    workspaces: number;
    evidenceEstablished: number;
    needingFirstEvidence: number;
    zeroActivityWithExplicitNextAction: number;
    zeroActivityWithoutExplicitNextAction: number;
    journeysComplete: number;
    journeysInProgress: number;
  };
  workspaces: WorkspaceFirstEvidenceCompletion[];
};

const JOURNEY_IDS = ["collect", "review", "approve", "publish", "deliver"] as const;

function nextActionFor(
  plan: WorkspaceFirstEvidencePlan,
  runbook: GuidedRunbook | undefined
): WorkspaceFirstEvidenceCompletion["nextAction"] {
  const profileStep = plan.steps.find(
    (step) => step.key === plan.recommendedStepKey && step.status !== "not-applicable"
  );

  if (!plan.hasDurableEvidence && profileStep) {
    return {
      kind: "profile-step",
      key: profileStep.key,
      label: profileStep.title,
      href: profileStep.href,
      gated: profileStep.status === "gated" || profileStep.operatorGate
    };
  }

  const journeyStep = runbook?.steps.find(
    (step) =>
      JOURNEY_IDS.includes(step.id as (typeof JOURNEY_IDS)[number]) &&
      step.status !== "complete"
  );

  if (journeyStep) {
    return {
      kind: "journey-stage",
      key: journeyStep.id,
      label: journeyStep.actionLabel,
      href: journeyStep.href,
      gated: journeyStep.status === "blocked"
    };
  }

  return {
    kind: "monitor",
    key: "monitor",
    label: "Continue normal work and monitor durable evidence",
    href: "/production-learning",
    gated: false
  };
}

export function buildFirstEvidenceCompletion(
  plans: WorkspaceFirstEvidencePlan[],
  runbooks: GuidedRunbook[],
  generatedAt = new Date().toISOString()
): FirstEvidenceCompletionModel {
  const runbooksByWorkspace = new Map(
    runbooks.map((runbook) => [runbook.workspaceId, runbook])
  );

  const workspaces = plans.map((plan): WorkspaceFirstEvidenceCompletion => {
    const runbook = runbooksByWorkspace.get(plan.workspaceId);
    const journeyStages: FirstEvidenceJourneyStage[] = JOURNEY_IDS.map((id) => {
      const step = runbook?.steps.find((candidate) => candidate.id === id);
      return step
        ? {
            id,
            label: step.label,
            status: step.status,
            evidence: step.evidence,
            gate: step.gate,
            href: step.href,
            actionLabel: step.actionLabel
          }
        : {
            id,
            label: id.charAt(0).toUpperCase() + id.slice(1),
            status: "blocked",
            evidence: ["No current workflow-orchestration evidence is available for this stage."],
            gate: "The stage stays blocked until current RLS-scoped workflow evidence is available.",
            href: "/runbooks",
            actionLabel: "Review guided runbooks"
          };
    });

    return {
      workspaceId: plan.workspaceId,
      workspaceName: plan.workspaceName,
      role: plan.role,
      profileName: plan.profileName,
      state: plan.hasDurableEvidence
        ? "evidence-established"
        : "needs-first-evidence",
      activityEvents: plan.activityEvents,
      hasDurableEvidence: plan.hasDurableEvidence,
      nextAction: nextActionFor(plan, runbook),
      journey: {
        completeStages: journeyStages.filter((stage) => stage.status === "complete").length,
        totalStages: journeyStages.length,
        stages: journeyStages
      }
    };
  });

  const evidenceEstablished = workspaces.filter(
    (workspace) => workspace.hasDurableEvidence
  ).length;
  const zeroActivity = workspaces.filter(
    (workspace) => !workspace.hasDurableEvidence
  );
  const zeroActivityWithExplicitNextAction = zeroActivity.filter(
    (workspace) => Boolean(workspace.nextAction.label && workspace.nextAction.href)
  ).length;
  const zeroActivityWithoutExplicitNextAction =
    zeroActivity.length - zeroActivityWithExplicitNextAction;
  const journeysComplete = workspaces.filter(
    (workspace) =>
      workspace.journey.completeStages === workspace.journey.totalStages
  ).length;

  const exitMet =
    evidenceEstablished > 0 && zeroActivityWithoutExplicitNextAction === 0;

  return {
    schema: "ai-data-platform.first-evidence-completion.v1",
    generatedAt,
    build: 274,
    exitCriterion: {
      met: exitMet,
      label:
        "At least one authorized workspace has durable real operating activity, and every zero-activity workspace retains an explicit safe next action or gate.",
      evidence:
        String(evidenceEstablished) +
        "/" +
        String(workspaces.length) +
        " workspace(s) have durable activity; " +
        String(zeroActivityWithExplicitNextAction) +
        "/" +
        String(zeroActivity.length) +
        " zero-activity workspace(s) have an explicit next action."
    },
    totals: {
      workspaces: workspaces.length,
      evidenceEstablished,
      needingFirstEvidence: zeroActivity.length,
      zeroActivityWithExplicitNextAction,
      zeroActivityWithoutExplicitNextAction,
      journeysComplete,
      journeysInProgress: workspaces.length - journeysComplete
    },
    workspaces
  };
}
