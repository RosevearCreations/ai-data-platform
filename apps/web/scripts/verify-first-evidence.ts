import type { AdoptionWorkspaceReview } from "../lib/adoption-database";
import {
  buildFirstEvidenceRunbook,
  buildWorkspaceFirstEvidencePlan
} from "../lib/first-evidence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const workspace: AdoptionWorkspaceReview = {
  workspaceId: "11111111-1111-4111-8111-111111111111",
  workspaceName: "Fixture",
  profileKey: "maker-commerce",
  profileName: "Maker Commerce",
  role: "owner",
  activityEvents: 0,
  activity: {
    sync: 0,
    sourcePolicySources: 0,
    scheduledJobs: 0,
    scheduledAttempts: 0,
    remoteJobs: 0,
    remoteRuns: 0,
    barcodeCaptures: 0,
    integrationEvents: 0,
    connectorExecutions: 0
  },
  capabilities: {
    enabled: [
      "history",
      "sourcePolicy",
      "scheduledJobs",
      "remoteExecution",
      "barcodeIntake",
      "businessIntegrations"
    ],
    used: [],
    unusedEnabled: [
      "history",
      "sourcePolicy",
      "scheduledJobs",
      "remoteExecution",
      "barcodeIntake",
      "businessIntegrations"
    ],
    highRiskUnused: [
      "scheduledJobs",
      "remoteExecution",
      "barcodeIntake",
      "businessIntegrations"
    ],
    disabledUsed: []
  },
  connectors: {
    installations: 0,
    enabledInstallations: 0,
    grants: [],
    usedGrants: [],
    unusedGrants: [],
    staleUnusedGrants: [],
    executions: 0,
    blockedAttempts: 0
  },
  permissions: {
    owners: 1,
    admins: 0,
    members: 0,
    status: "watch",
    recommendations: []
  },
  trend: {
    previousSnapshotAt: null,
    activityEventsDelta: null,
    usedCapabilitiesDelta: null,
    connectorUsedGrantsDelta: null
  },
  snapshotCount: 1
};

const plan = buildWorkspaceFirstEvidencePlan(workspace);
assert(!plan.hasDurableEvidence, "Zero real activity must remain first-evidence-needed.");
assert(
  plan.steps.find((step) => step.key === "sync")?.status === "ready",
  "History-enabled workspace must offer a real sync step."
);
assert(
  plan.steps.find((step) => step.key === "source-policy")?.status === "ready",
  "Source-policy-enabled workspace must offer a real policy review step."
);
assert(
  plan.steps.find((step) => step.key === "scheduled")?.status === "gated",
  "Scheduling must remain gated until its source-policy prerequisite exists."
);
assert(
  plan.steps.find((step) => step.key === "remote")?.status === "gated" &&
    plan.steps.find((step) => step.key === "remote")?.operatorGate,
  "Remote execution must retain the explicit Build 032 operator gate."
);
assert(
  plan.steps.find((step) => step.key === "integration")?.status === "gated" &&
    plan.steps.find((step) => step.key === "integration")?.operatorGate,
  "Business delivery must retain the explicit Build 033 operator gate."
);

const adopted: AdoptionWorkspaceReview = {
  ...workspace,
  activityEvents: 3,
  activity: {
    ...workspace.activity,
    sync: 1,
    sourcePolicySources: 1,
    scheduledJobs: 1
  },
  capabilities: {
    ...workspace.capabilities,
    used: ["history", "sourcePolicy", "scheduledJobs"],
    unusedEnabled: ["remoteExecution", "barcodeIntake", "businessIntegrations"]
  }
};
const adoptedPlan = buildWorkspaceFirstEvidencePlan(adopted);
assert(adoptedPlan.hasDurableEvidence, "Real activity must establish durable adoption.");
assert(
  adoptedPlan.steps.find((step) => step.key === "scheduled")?.status === "complete",
  "Real scheduled-job evidence must complete the scheduling step."
);

const review = buildFirstEvidenceRunbook([workspace, adopted]);
assert(
  review.totals.workspaces === 2 &&
    review.totals.evidenceEstablished === 1 &&
    review.totals.needingFirstEvidence === 1,
  "Runbook totals must distinguish real adoption from zero activity."
);
assert(
  review.totals.gatedSteps >= 2,
  "Explicit remote/integration gates must remain visible."
);

console.log(
  "Build 037 first-evidence runbook preserves real-work-only adoption, profile-aware sequencing and existing provider/integration gates."
);
