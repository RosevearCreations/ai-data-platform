import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildContinuationCycleCorrectiveExecutionPackage,
  continuationCycleActivationConfirmation,
  continuationCycleActivationFingerprint,
  continuationCycleExecutionConfirmation
} from "../lib/continuation-cycle-corrective-delivery-execution";
import {
  continuationCycleCorrectivePlanFingerprint,
  type ContinuationCycleCorrectiveDeliveryPlan
} from "../lib/successive-cycle-recurrence-planning";
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
const predecessorBatchId = "successive-cycle-plan:predecessor";
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
  successiveCycleRetriageId: "00000000-0000-4000-8000-000000000061",
  successiveCycleRecurrenceId: "00000000-0000-4000-8000-000000000060",
  successiveCycleReclosureId: "00000000-0000-4000-8000-000000000059",
  successiveCycleReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorSuccessiveCyclePlanId: "00000000-0000-4000-8000-000000000057",
  predecessorSuccessiveCycleDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceSuccessiveCycleRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceSuccessiveCycleReclosureFingerprint: "reclosure-fp",
  sourceSuccessiveCyclePackageId: predecessorPackage.packageId,
  sourceSuccessiveCycleReplayKey: predecessorPackage.replayKey,
  sourceSuccessiveCyclePackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = continuationCycleCorrectivePlanFingerprint(planBase);

const plan: ContinuationCycleCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  continuationCyclePlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildContinuationCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildContinuationCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 098 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 098 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 098 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "continuation-cycle-plan:" + plan.continuationCyclePlanId,
  "Build 098 batch identity must be continuation-cycle specific."
);
assert(next.operations.length === 2, "Build 098 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 098 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 098 restore-missing scope must become a create operation."
);

const activationInput = {
  continuationCyclePlanFingerprint: plan.planFingerprint,
  sourceSuccessiveCycleRecurrenceFingerprint: plan.sourceSuccessiveCycleRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceSuccessiveCycleReclosureFingerprint: plan.sourceSuccessiveCycleReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  continuationCyclePackageId: next.packageId,
  continuationCycleReplayKey: next.replayKey,
  continuationCyclePackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  continuationCycleActivationFingerprint(activationInput) ===
    continuationCycleActivationFingerprint(activationInput),
  "Build 098 activation fingerprint must be deterministic."
);
assert(
  continuationCycleActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS CONTINUATION-CYCLE CORRECTIVE",
  "Build 098 activation confirmation changed unexpectedly."
);
assert(
  continuationCycleExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS CONTINUATION-CYCLE CORRECTIVE",
  "Build 098 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildContinuationCycleCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: continuationCycleCorrectivePlanFingerprint({
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
  "Build 098 must reject desired values not frozen in predecessor successive-cycle evidence."
);

console.log("Build 098 continuation-cycle corrective delivery verification passed.");
