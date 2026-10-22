import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  UNIFIED_CORRECTIVE_GENERATION_ACTIVATION_WINDOW_MS,
  UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RESERVATION_STALE_MS,
  UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RETRY_LIMIT,
  buildUnifiedCorrectiveGenerationExecutionPackage,
  unifiedCorrectiveGenerationActivationConfirmation,
  unifiedCorrectiveGenerationActivationFingerprint,
  unifiedCorrectiveGenerationExecutionConfirmation
} from "../lib/unified-corrective-generation-delivery-execution";
import {
  unifiedCorrectiveGenerationPlanFingerprint,
  type UnifiedCorrectiveGenerationPlan
} from "../lib/unified-corrective-generation-planning";
import type { CorrectivePlanScopeItem } from "../lib/reconciliation-exception-triage";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const target = "rosie-dazzlers" as const;
const contract = INTEGRATION_CONTRACTS[target];
const approvedAt = "2026-10-22T16:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-22T15:00:00.000Z";
const predecessorOperations = [
  {
    action: "update" as const,
    integrationKey: "rosie-competitor::record-a",
    values: { priceMinimumCad: 249, offeringName: "Complete" },
    sourceEvidence: {
      sourceUrl: "https://example.test/record-a",
      retrievedAt: sourceDatasetUpdatedAt
    }
  },
  {
    action: "create" as const,
    integrationKey: "rosie-competitor::record-b",
    values: { offeringName: "Interior", priceMinimumCad: 195 },
    sourceEvidence: {
      sourceUrl: "https://example.test/record-b",
      retrievedAt: sourceDatasetUpdatedAt
    }
  }
];
const predecessorBatchId = "following-corrective-generation-plan:predecessor";
const predecessorFingerprint = integrationFingerprint({
  target,
  adapterContract: contract.adapterContract,
  contractVersion: 1,
  batchId: predecessorBatchId,
  approvedAt,
  sourceDatasetUpdatedAt,
  operations: predecessorOperations
});
const predecessorPackageId = integrationPackageId({
  target,
  batchId: predecessorBatchId,
  approvedAt,
  fingerprint: predecessorFingerprint
});
const predecessorReplayKey = integrationReplayKey({
  target,
  packageId: predecessorPackageId,
  fingerprint: predecessorFingerprint
});
const predecessorPackage: IntegrationPackageV1 = {
  version: 1,
  schemaId: contract.schemaId,
  target,
  adapterContract: contract.adapterContract,
  contractVersion: 1,
  packageId: predecessorPackageId,
  replayKey: predecessorReplayKey,
  batchId: predecessorBatchId,
  approvedAt,
  sourceDatasetUpdatedAt,
  generatedAt: approvedAt,
  expiresAt: "2026-10-23T16:00:00.000Z",
  fingerprint: predecessorFingerprint,
  operations: predecessorOperations
};

const correctionScope: CorrectivePlanScopeItem[] = [
  {
    integrationKey: "rosie-competitor::record-a",
    issueStatus: "mismatched",
    proposedAction: "update-existing",
    desiredValues: { priceMinimumCad: 249 },
    governedFields: ["priceMinimumCad"],
    expectedFingerprint: "expected-a",
    observedFingerprint: "observed-a"
  },
  {
    integrationKey: "rosie-competitor::record-b",
    issueStatus: "missing",
    proposedAction: "restore-missing",
    desiredValues: { offeringName: "Interior", priceMinimumCad: 195 },
    governedFields: ["offeringName", "priceMinimumCad"],
    expectedFingerprint: "expected-b",
    observedFingerprint: null
  }
];

const planBase = {
  correctiveGenerationRetriageId: "00000000-0000-4000-8000-000000000111",
  successorSourceId: "00000000-0000-4000-8000-000000000108",
  predecessorGenerationLineageId: "00000000-0000-4000-8000-000000000106",
  generationNumber: 3,
  predecessorPlanId: "00000000-0000-4000-8000-000000000105",
  predecessorDeliveryId: "00000000-0000-4000-8000-000000000107",
  predecessorPackageId: predecessorPackage.packageId,
  predecessorReplayKey: predecessorPackage.replayKey,
  predecessorPackageFingerprint: predecessorPackage.fingerprint,
  predecessorReclosureId: "00000000-0000-4000-8000-000000000109",
  predecessorReclosureFingerprint: "reclosure-fp",
  sourceRecurrenceId: "00000000-0000-4000-8000-000000000110",
  sourceRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "regression-fp",
  sourceSuccessorFingerprint: "successor-fp",
  correctionScope,
  rationale: "Correct the governed generation-three recurrence."
};
const planFingerprint = unifiedCorrectiveGenerationPlanFingerprint(planBase);

const plan: UnifiedCorrectiveGenerationPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  correctiveGenerationPlanId: "00000000-0000-4000-8000-000000000112",
  ...planBase,
  caseId: "00000000-0000-4000-8000-000000000053",
  target,
  status: "approved",
  planFingerprint,
  createdBy: "fixture-user",
  createdAt: approvedAt,
  reviewedBy: "fixture-user",
  reviewedAt: approvedAt,
  reviewNote: "Approved",
  canManage: true
};

const next = buildUnifiedCorrectiveGenerationExecutionPackage(plan, predecessorPackage);
const nextAgain = buildUnifiedCorrectiveGenerationExecutionPackage(plan, predecessorPackage);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 111 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 111 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 111 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId ===
    "unified-corrective-generation-g3-plan:" + plan.correctiveGenerationPlanId,
  "Build 111 batch identity must include the governed generation."
);
assert(next.operations.length === 2, "Build 111 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 111 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 111 restore-missing scope must become a create operation."
);

const activationInput = {
  planFingerprint: plan.planFingerprint,
  sourceRecurrenceFingerprint: plan.sourceRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceSuccessorFingerprint: plan.sourceSuccessorFingerprint,
  predecessorRegistryFingerprint: "registry-fp",
  consumerId: "https://consumer.example.test",
  unifiedPackageId: next.packageId,
  unifiedReplayKey: next.replayKey,
  unifiedPackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-22T16:01:00.000Z"
};
assert(
  unifiedCorrectiveGenerationActivationFingerprint(activationInput) ===
    unifiedCorrectiveGenerationActivationFingerprint(activationInput),
  "Build 111 activation fingerprint must be deterministic."
);
assert(
  unifiedCorrectiveGenerationActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS UNIFIED-CORRECTIVE-GENERATION CORRECTIVE",
  "Build 111 activation confirmation changed unexpectedly."
);
assert(
  unifiedCorrectiveGenerationExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS UNIFIED-CORRECTIVE-GENERATION CORRECTIVE",
  "Build 111 execution confirmation changed unexpectedly."
);
assert(
  UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RETRY_LIMIT === 5,
  "Build 111 retry limit must remain bounded at five attempts."
);
assert(
  UNIFIED_CORRECTIVE_GENERATION_ACTIVATION_WINDOW_MS >
    UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RESERVATION_STALE_MS,
  "Build 111 activation window must exceed the stale reservation interval."
);

let rejected = false;
try {
  const widenedScope: CorrectivePlanScopeItem[] = [{
    ...correctionScope[0],
    desiredValues: { priceMinimumCad: 999 }
  }];
  buildUnifiedCorrectiveGenerationExecutionPackage(
    {
      ...plan,
      correctionScope: widenedScope,
      planFingerprint: unifiedCorrectiveGenerationPlanFingerprint({
        ...planBase,
        correctionScope: widenedScope
      })
    },
    predecessorPackage
  );
} catch {
  rejected = true;
}
assert(
  rejected,
  "Build 111 must reject desired values not frozen in predecessor evidence."
);

console.log("Build 111 unified corrective-generation delivery verification passed.");
