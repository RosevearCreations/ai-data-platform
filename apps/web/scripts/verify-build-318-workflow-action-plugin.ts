import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  WORKFLOW_ACTION_PLUGIN_VERSION,
  WorkflowActionPluginError,
  createHeldWorkflowActionPluginIntent,
  createWorkflowActionCallbackReceipt,
  createWorkflowActionCapabilityDescriptors,
  createWorkflowActionExecutionHandoff,
  recordWorkflowActionDecision,
  validateWorkflowActionInput,
  workflowActionPluginDescriptor
} from "../lib/workflow-action-plugin";

const root = path.resolve(process.cwd());
const fixedNow = Date.parse("2026-11-08T04:00:00.000Z");

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function sourceIntent() {
  return {
    intentId: "intent-build318-001",
    workspaceId: "workspace-operations",
    ruleId: "rule-build318-001",
    ruleReviewId: "rule-review-build318-001",
    publicationId: "publication-build318-001",
    sourceApplicationId: "icamp" as const,
    destinationApplicationId: "yard-workers" as const,
    eventId: "booking-build318-001",
    eventType: "booking.created",
    actionKind: "prepare-shared-task" as const,
    actionConfig: {
      title: "Prepare campsite arrival task",
      priority: "high"
    },
    targetHref: "/shared-task-exchange",
    state: "held" as const,
    holdReason: "workflow-action-not-authorized" as const,
    createdBy: "owner-build318",
    createdAt: "2026-11-08T03:45:00.000Z"
  };
}

function authorization() {
  return {
    capability: "workflow-actions.handoff" as const,
    granted: true,
    grantId: "grant-workflow-handoff-build318",
    subjectId: "owner-build318",
    hostApplicationId: "rosevear.yard-workers",
    hostEnvironment: "production" as const,
    platformTenantId: "tenant-rosevear",
    workspaceId: "workspace-operations",
    expiresAt: "2026-11-09T04:00:00.000Z",
    reviewAt: "2026-11-09T03:00:00.000Z"
  };
}

async function main() {
  assert.equal(WORKFLOW_ACTION_PLUGIN_VERSION, "1.0.0");

  const descriptors = createWorkflowActionCapabilityDescriptors();
  assert.equal(descriptors.length, 5);
  assert.deepEqual(
    descriptors.map((item) => item.actionKind).sort(),
    [
      "prepare-notification",
      "prepare-schedule",
      "prepare-shared-task",
      "review-event-recovery",
      "review-integration-recovery"
    ].sort()
  );
  assert.ok(descriptors.every((item) => item.executesOnRuleMatch === false));
  assert.ok(descriptors.every((item) => item.executesOnApproval === false));

  const taskDescriptor = descriptors.find(
    (item) => item.actionKind === "prepare-shared-task"
  );
  assert.ok(taskDescriptor);

  const typed = validateWorkflowActionInput(taskDescriptor, {
    title: "Prepare campsite arrival task",
    priority: "high"
  });
  assert.equal(typed.priority, "high");

  assert.throws(
    () =>
      validateWorkflowActionInput(taskDescriptor, {
        title: "Prepare campsite arrival task",
        priority: "high",
        secret: "not-allowed"
      }),
    (error: unknown) =>
      error instanceof WorkflowActionPluginError &&
      error.code === "input_invalid"
  );

  const intent = createHeldWorkflowActionPluginIntent(
    sourceIntent(),
    taskDescriptor
  );
  assert.equal(intent.state, "held");
  assert.equal(intent.sourceBoundary, "build-302-held-intent");
  assert.equal(intent.security.ruleMatchExecutesAction, false);
  assert.match(intent.inputFingerprintSha256, /^[a-f0-9]{64}$/);

  assert.throws(
    () =>
      createHeldWorkflowActionPluginIntent(
        {
          ...sourceIntent(),
          holdReason: "other-hold" as "workflow-action-not-authorized"
        },
        taskDescriptor
      ),
    WorkflowActionPluginError
  );

  const approved = recordWorkflowActionDecision(intent, {
    decisionId: "decision-build318-approve",
    decision: "approve",
    reviewerRole: "owner",
    reviewedBy: "owner-build318",
    reason: "Reviewed task scope and approved host handoff.",
    decidedAt: "2026-11-08T03:50:00.000Z"
  });
  assert.equal(approved.state, "approved-for-handoff");
  assert.equal(approved.actionExecuted, false);

  const rejected = recordWorkflowActionDecision(intent, {
    decisionId: "decision-build318-reject",
    decision: "reject",
    reviewerRole: "reviewer",
    reviewedBy: "reviewer-build318",
    reason: "Destination scope needs correction before handoff.",
    decidedAt: "2026-11-08T03:51:00.000Z"
  });
  assert.equal(rejected.state, "rejected");
  assert.match(
    rejected.immutableEvidenceFingerprintSha256,
    /^[a-f0-9]{64}$/
  );

  const handoffInput = {
    handoffId: "handoff-build318-001",
    hostApplicationId: "rosevear.yard-workers",
    hostEnvironment: "production" as const,
    platformTenantId: "tenant-rosevear",
    auditCorrelationId: "audit-build318-handoff",
    authorization: authorization(),
    createdAt: "2026-11-08T03:55:00.000Z"
  };

  const handoff = createWorkflowActionExecutionHandoff(
    intent,
    approved,
    handoffInput,
    fixedNow
  );
  const repeatedHandoff = createWorkflowActionExecutionHandoff(
    intent,
    approved,
    { ...handoffInput, handoffId: "handoff-build318-002" },
    fixedNow
  );
  assert.equal(handoff.state, "ready-for-host-callback");
  assert.equal(handoff.security.executionPerformedByPlugin, false);
  assert.equal(
    handoff.idempotencyKeySha256,
    repeatedHandoff.idempotencyKeySha256
  );
  assert.match(handoff.idempotencyKeySha256, /^[a-f0-9]{64}$/);

  assert.throws(
    () =>
      createWorkflowActionExecutionHandoff(
        intent,
        rejected,
        handoffInput,
        fixedNow
      ),
    (error: unknown) =>
      error instanceof WorkflowActionPluginError &&
      error.code === "decision_rejected"
  );

  assert.throws(
    () =>
      createWorkflowActionExecutionHandoff(
        intent,
        approved,
        {
          ...handoffInput,
          authorization: {
            ...authorization(),
            workspaceId: "workspace-other"
          }
        },
        fixedNow
      ),
    (error: unknown) =>
      error instanceof WorkflowActionPluginError &&
      error.code === "authorization_scope_mismatch"
  );

  const accepted = createWorkflowActionCallbackReceipt(handoff, {
    callbackId: "callback-build318-accepted",
    idempotencyKeySha256: handoff.idempotencyKeySha256,
    outcome: "accepted",
    hostReceiptId: "yard-workers-receipt-318",
    receivedAt: "2026-11-08T03:57:00.000Z"
  });
  assert.equal(accepted.outcome, "accepted");
  assert.equal(
    accepted.security.callbackReceiptProvesExternalSideEffect,
    false
  );

  const errorReceipt = createWorkflowActionCallbackReceipt(handoff, {
    callbackId: "callback-build318-error",
    idempotencyKeySha256: handoff.idempotencyKeySha256,
    outcome: "error",
    errorCode: "HOST_TEMPORARY_FAILURE",
    errorMessage: "Host could not accept the handoff at this time.",
    receivedAt: "2026-11-08T03:58:00.000Z"
  });
  assert.equal(errorReceipt.outcome, "error");
  assert.equal(errorReceipt.errorCode, "HOST_TEMPORARY_FAILURE");

  const rejectedReceipt = createWorkflowActionCallbackReceipt(handoff, {
    callbackId: "callback-build318-rejected",
    idempotencyKeySha256: handoff.idempotencyKeySha256,
    outcome: "rejected",
    rejectionReason: "Destination policy rejected this action handoff.",
    receivedAt: "2026-11-08T03:59:00.000Z"
  });
  assert.equal(rejectedReceipt.outcome, "rejected");
  assert.ok(rejectedReceipt.rejectionReason);

  assert.throws(
    () =>
      createWorkflowActionCallbackReceipt(handoff, {
        callbackId: "callback-build318-bad-key",
        idempotencyKeySha256: "f".repeat(64),
        outcome: "accepted",
        hostReceiptId: "bad-receipt",
        receivedAt: "2026-11-08T03:59:00.000Z"
      }),
    (error: unknown) =>
      error instanceof WorkflowActionPluginError &&
      error.code === "idempotency_mismatch"
  );

  const descriptor = workflowActionPluginDescriptor();
  assert.equal(descriptor.ruleMatchExecutesAction, false);
  assert.equal(descriptor.approvalExecutesAction, false);
  assert.equal(
    descriptor.callbackReceiptProvesExternalSideEffect,
    false
  );

  const [
    pluginSource,
    api,
    page,
    navigation,
    operatorTools,
    manifest,
    docs,
    review,
    roadmap,
    packageRaw
  ] = await Promise.all([
    source("lib/workflow-action-plugin.ts"),
    source("app/api/module-workflow-actions/route.ts"),
    source("app/workflow-automation/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_318_WORKFLOW_ACTION_PLUGIN_INTERFACE.md"),
    source("../../docs/integration/ai-data-platform-build318-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "normalizeWorkflowAutomationConfig",
    "workflow-action-not-authorized",
    "approved-for-handoff",
    "workflow-actions.handoff",
    "duplicateHandoffUsesSameIdempotencyKey: true",
    "callbackReceiptProvesExternalSideEffect: false",
    "idempotency_mismatch"
  ]) {
    assert.ok(
      pluginSource.includes(token),
      "Build 318 plug-in source missing " + token
    );
  }

  for (const token of [
    "sourceHeldIntentRequired: true",
    "explicitOwnerOrReviewerDecisionRequired: true",
    "handoffRequiresIndependentHostGrant: true",
    "directExecutionAvailableFromDiscoveryRoute: false"
  ]) {
    assert.ok(api.includes(token), "Build 318 API missing " + token);
  }

  assert.ok(page.includes("Build 318 workflow action plug-in"));
  assert.ok(page.includes("/api/module-workflow-actions"));
  assert.ok(
    navigation.includes("workflow action plug-in") &&
      operatorTools.includes("workflow action plug-in")
  );

  for (const token of [
    '"workflow-action-plugin-v1"',
    '"typed-action-input-schema-v1"',
    '"idempotent-action-handoff-v1"',
    '"host-action-callback-receipts-v1"',
    "workflowRuleMatchExecutesHostAction: false",
    "workflowApprovalExecutesHostAction: false",
    "workflowActionCallbackProvesExternalSideEffect: false",
    "workflowActionHandoffRequiresIndependentGrant: true"
  ]) {
    assert.ok(manifest.includes(token), "Build 318 manifest missing " + token);
  }

  for (const token of [
    "Build 318",
    "Action capability descriptors",
    "Typed input schemas",
    "Owner/reviewer decisions",
    "Host callback receipts",
    "Build 319"
  ]) {
    assert.ok(docs.includes(token), "Build 318 docs missing " + token);
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 318);
  assert.equal(reviewJson.security.ruleMatchExecutesAction, false);
  assert.equal(
    reviewJson.security.callbackReceiptProvesExternalSideEffect,
    false
  );
  assert.equal(reviewJson.nextQueuedBuild, 319);

  assert.ok(
    roadmap.includes("Build 318 — Workflow Action Plug-In Interface") &&
      roadmap.includes(
        "Build 319 — Shared Notification, Task, Follow-Up & Scheduling Module APIs"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-318-workflow-action-plugin.ts"
      ),
      "Build 318 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 318 Workflow Action Plug-In Interface verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
