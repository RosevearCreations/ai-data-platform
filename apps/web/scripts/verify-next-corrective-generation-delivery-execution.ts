import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildNextCorrectiveGenerationExecutionPackage,
  nextCorrectiveGenerationActivationConfirmation,
  nextCorrectiveGenerationActivationFingerprint,
  nextCorrectiveGenerationExecutionConfirmation
} from "../lib/next-corrective-generation-delivery-execution";
import {
  nextCorrectiveGenerationPlanFingerprint,
  type NextCorrectiveGenerationPlan
} from "../lib/continuation-cycle-recurrence-planning";
import type { CorrectivePlanScopeItem } from "../lib/reconciliation-exception-triage";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const target = "rosie-dazzlers" as const;
const contract = INTEGRATION_CONTRACTS[target];
const approvedAt = "2026-10-13T20:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T19:00:00.000Z";
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
const predecessorBatchId = "continuation-cycle-plan:predecessor";
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
  expiresAt: "2026-10-14T20:00:00.000Z",
  fingerprint: predecessorFingerprint,
  operations: predecessorOperations
};

const correctionScope: CorrectivePlanScopeItem[] = [
  {
    integrationKey: "rosie-competitor::record-a",
    issueStatus: "mismatched" as const,
    proposedAction: "update-existing" as const,
    desiredValues: { priceMinimumCad: 249 },
    governedFields: ["priceMinimumCad"],
    expectedFingerprint: "expected-a",
    observedFingerprint: "observed-a"
  },
  {
    integrationKey: "rosie-competitor::record-b",
    issueStatus: "missing" as const,
    proposedAction: "restore-missing" as const,
    desiredValues: { offeringName: "Interior", priceMinimumCad: 195 },
    governedFields: ["offeringName","priceMinimumCad"],
    expectedFingerprint: "expected-b",
    observedFingerprint: null
  }
];

const planBase = {
  continuationCycleRetriageId: "00000000-0000-4000-8000-000000000061",
  continuationCycleRecurrenceId: "00000000-0000-4000-8000-000000000060",
  continuationCycleReclosureId: "00000000-0000-4000-8000-000000000059",
  continuationCycleReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorContinuationCyclePlanId: "00000000-0000-4000-8000-000000000057",
  predecessorContinuationCycleDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceContinuationCycleRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceContinuationCycleReclosureFingerprint: "reclosure-fp",
  sourceContinuationCyclePackageId: predecessorPackage.packageId,
  sourceContinuationCycleReplayKey: predecessorPackage.replayKey,
  sourceContinuationCyclePackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = nextCorrectiveGenerationPlanFingerprint(planBase);

const plan: NextCorrectiveGenerationPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  nextCorrectiveGenerationPlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildNextCorrectiveGenerationExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildNextCorrectiveGenerationExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 102 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 102 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 102 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "next-corrective-generation-plan:" + plan.nextCorrectiveGenerationPlanId,
  "Build 102 batch identity must be next-corrective-generation specific."
);
assert(next.operations.length === 2, "Build 102 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 102 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 102 restore-missing scope must become a create operation."
);

const activationInput = {
  nextCorrectiveGenerationPlanFingerprint: plan.planFingerprint,
  sourceContinuationCycleRecurrenceFingerprint: plan.sourceContinuationCycleRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceContinuationCycleReclosureFingerprint: plan.sourceContinuationCycleReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  nextCorrectiveGenerationPackageId: next.packageId,
  nextCorrectiveGenerationReplayKey: next.replayKey,
  nextCorrectiveGenerationPackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  nextCorrectiveGenerationActivationFingerprint(activationInput) ===
    nextCorrectiveGenerationActivationFingerprint(activationInput),
  "Build 102 activation fingerprint must be deterministic."
);
assert(
  nextCorrectiveGenerationActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS NEXT-CORRECTIVE-GENERATION CORRECTIVE",
  "Build 102 activation confirmation changed unexpectedly."
);
assert(
  nextCorrectiveGenerationExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS NEXT-CORRECTIVE-GENERATION CORRECTIVE",
  "Build 102 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildNextCorrectiveGenerationExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: nextCorrectiveGenerationPlanFingerprint({
        ...planBase,
        correctionScope: [{
          ...correctionScope[0],
          desiredValues: { priceMinimumCad: 999 }
        }]
      })
    },
    predecessorPackage
  );
} catch {
  rejected = true;
}
assert(
  rejected,
  "Build 102 must reject desired values not frozen in predecessor continuation-cycle evidence."
);

console.log("Build 102 next-corrective-generation corrective delivery verification passed.");
