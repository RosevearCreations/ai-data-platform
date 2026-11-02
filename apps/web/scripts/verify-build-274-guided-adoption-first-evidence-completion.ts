import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildFirstEvidenceCompletion } from "../lib/first-evidence-completion";
import type { WorkspaceFirstEvidencePlan } from "../lib/first-evidence";
import type { GuidedRunbook } from "../lib/workflow-orchestration-contract";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 274 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

const plans: WorkspaceFirstEvidencePlan[] = [
  {
    workspaceId: "11111111-1111-4111-8111-111111111111",
    workspaceName: "Active workspace",
    profileKey: "standard",
    profileName: "Standard",
    role: "owner",
    hasDurableEvidence: true,
    activityEvents: 4,
    completeSteps: 1,
    applicableSteps: 2,
    recommendedStepKey: "barcode",
    steps: [
      {
        key: "sync",
        title: "Create one real synchronized workspace asset",
        status: "complete",
        evidence: "One real synchronized item exists.",
        instruction: "Use real work.",
        href: "/help",
        operatorGate: false
      },
      {
        key: "barcode",
        title: "Capture and review one real barcode",
        status: "ready",
        evidence: "No barcode yet.",
        instruction: "Use only when useful.",
        href: "/capture",
        operatorGate: false
      }
    ]
  },
  {
    workspaceId: "22222222-2222-4222-8222-222222222222",
    workspaceName: "Zero workspace",
    profileKey: "standard",
    profileName: "Standard",
    role: "admin",
    hasDurableEvidence: false,
    activityEvents: 0,
    completeSteps: 0,
    applicableSteps: 2,
    recommendedStepKey: "sync",
    steps: [
      {
        key: "sync",
        title: "Create one real synchronized workspace asset",
        status: "ready",
        evidence: "No synchronized evidence yet.",
        instruction: "Use one real item.",
        href: "/help",
        operatorGate: false
      },
      {
        key: "remote",
        title: "Remote browser pilot",
        status: "gated",
        evidence: "No provider run.",
        instruction: "Do not run only for adoption.",
        href: "/remote-execution",
        operatorGate: true
      }
    ]
  }
];

function journey(workspaceId: string, completeCollect: boolean): GuidedRunbook {
  return {
    id: "collect-review-approve-deliver:" + workspaceId,
    name: "Collect → Review → Approve → Publish → Deliver",
    purpose: "Governed data journey.",
    workspaceId,
    workspaceName: workspaceId === plans[0].workspaceId ? "Active workspace" : "Zero workspace",
    role: "owner",
    completeSteps: completeCollect ? 1 : 0,
    blockedSteps: 4,
    steps: [
      {
        id: "collect",
        label: "Collect",
        description: "Collect real data.",
        href: "/collection-runs",
        status: completeCollect ? "complete" : "ready",
        evidence: [completeCollect ? "1 successful collection attempt" : "0 successful collection attempts"],
        gate: "Source and collection controls remain authoritative.",
        actionLabel: "Open collection runs"
      },
      {
        id: "review",
        label: "Review",
        description: "Review rows.",
        href: "/data-review",
        status: "blocked",
        evidence: ["0 in-review batches"],
        gate: "No automatic decision.",
        actionLabel: "Open data review"
      },
      {
        id: "approve",
        label: "Approve",
        description: "Approve explicitly.",
        href: "/approved-data",
        status: "blocked",
        evidence: ["0 approved candidates"],
        gate: "Explicit owner/admin approval.",
        actionLabel: "Open approved data"
      },
      {
        id: "publish",
        label: "Publish",
        description: "Publish explicitly.",
        href: "/approved-data",
        status: "blocked",
        evidence: ["0 publications"],
        gate: "Publication remains explicit.",
        actionLabel: "Open publication controls"
      },
      {
        id: "deliver",
        label: "Deliver",
        description: "Deliver through existing gates.",
        href: "/integration-delivery",
        status: "blocked",
        evidence: ["0 accepted delivery events"],
        gate: "Integration controls remain authoritative.",
        actionLabel: "Open integration delivery"
      }
    ]
  };
}

async function main() {
  const model = buildFirstEvidenceCompletion(
    plans,
    [journey(plans[0].workspaceId, true), journey(plans[1].workspaceId, false)],
    "2026-11-02T15:00:00.000Z"
  );

  ensure(model.schema === "ai-data-platform.first-evidence-completion.v1", "schema");
  ensure(model.build === 274, "build number");
  ensure(model.exitCriterion.met === true, "Build 274 exit criterion");
  ensure(model.totals.evidenceEstablished === 1, "durable evidence count");
  ensure(model.totals.needingFirstEvidence === 1, "zero adoption count");
  ensure(model.totals.zeroActivityWithExplicitNextAction === 1, "zero-activity next action coverage");
  ensure(model.totals.zeroActivityWithoutExplicitNextAction === 0, "no zero-activity workspace without next action");
  ensure(model.workspaces[1]?.nextAction.key === "sync", "profile-aware next action");
  ensure(model.workspaces[1]?.nextAction.gated === false, "safe ready action preferred over gate");
  ensure(model.workspaces[0]?.journey.stages.map((stage) => stage.label).join(" → ") === "Collect → Review → Approve → Publish → Deliver", "governed journey sequence");
  ensure(model.workspaces[0]?.journey.stages.find((stage) => stage.id === "deliver")?.status === "blocked", "delivery gate preserved");

  const [completion, database, page, nav, pkg, doc, statusRaw, queue] = await Promise.all([
    source("lib/first-evidence-completion.ts"),
    source("lib/first-evidence-database.ts"),
    source("app/first-evidence/page.tsx"),
    source("lib/application-navigation.ts"),
    source("package.json"),
    source("../../docs/BUILD_274_GUIDED_ADOPTION_RUNBOOK_FIRST_EVIDENCE_COMPLETION.md"),
    source("../../docs/integration/ql266-ai-data-platform-build274-review.json"),
    source("../../docs/NEXT_BUILDS_273_280.md")
  ]);

  ensure(database.includes("buildAdoptionReview") && database.includes("buildWorkflowOrchestrationModel"), "existing evidence sources");
  ensure(database.includes("buildFirstEvidenceCompletion"), "completion composition");
  ensure(!completion.includes("insert into") && !completion.includes("update app.") && !completion.includes("delete from"), "read-only completion model");
  for (const token of ["collect", "review", "approve", "publish", "deliver"]) {
    ensure(completion.includes('"' + token + '"'), "journey stage " + token);
  }
  ensure(page.includes("Build 274") && page.includes("Guided Adoption Runbook &amp; First-Evidence Completion"), "Build 274 page");
  ensure(page.includes("Build 274 exit criterion") && page.includes("full live delivery is not required"), "exit criterion wording");
  ensure(page.includes("Collect → Review → Approve → Publish → Deliver"), "journey UI");
  ensure(nav.includes('href: "/first-evidence"') && nav.includes('label: "First-Evidence Completion"'), "navigation");
  ensure(pkg.includes("verify-build-274-guided-adoption-first-evidence-completion.ts"), "verifier registered");

  const status = JSON.parse(statusRaw);
  ensure(status.build === 274, "status build");
  ensure(status.first_evidence_completion.synthetic_activity === false, "no synthetic activity");
  ensure(status.first_evidence_completion.automatic_approval === false, "no automatic approval");
  ensure(status.first_evidence_completion.automatic_publication === false, "no automatic publication");
  ensure(status.first_evidence_completion.automatic_delivery === false, "no automatic delivery");
  ensure(status.first_evidence_completion.second_evidence_store === false, "no second evidence store");
  ensure(status.authorization.rls_preserved === true, "RLS preserved");
  ensure(status.authorization.provider_gate_bypass === false && status.authorization.integration_gate_bypass === false, "gates preserved");
  ensure(status.ql266_status === "UNDER_REVIEW" && status.connection_state === "DISCONNECTED", "QL-266 boundary");
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 275, "next build");

  ensure(doc.includes("Collect → Review → Approve → Publish → Deliver"), "documentation sequence");
  ensure(doc.includes("Build 275 — Provider Pilot Baseline, Cost, Latency & Failure Evidence"), "next build documentation");
  ensure(queue.includes("Build 274 — Guided Adoption Runbook & First-Evidence Completion"), "queue Build 274");
  ensure(queue.includes("Build 275 — Provider Pilot Baseline, Cost, Latency & Failure Evidence"), "queue Build 275");

  console.log("Build 274 guided adoption runbook and first-evidence completion verification passed.");
}

void main();
