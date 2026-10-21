import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildSuccessiveCycleCorrectiveExecutionPackage,
  successiveCycleActivationConfirmation,
  successiveCycleActivationFingerprint,
  successiveCycleExecutionConfirmation
} from "../lib/successive-cycle-corrective-delivery-execution";
import {
  successiveCycleCorrectivePlanFingerprint,
  type SuccessiveCycleCorrectiveDeliveryPlan
} from "../lib/subsequent-cycle-recurrence-planning";
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
const predecessorBatchId = "subsequent-cycle-plan:predecessor";
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
  subsequentCycleRetriageId: "00000000-0000-4000-8000-000000000061",
  subsequentCycleRecurrenceId: "00000000-0000-4000-8000-000000000060",
  subsequentCycleReclosureId: "00000000-0000-4000-8000-000000000059",
  subsequentCycleReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorSubsequentCyclePlanId: "00000000-0000-4000-8000-000000000057",
  predecessorSubsequentCycleDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceSubsequentCycleRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceSubsequentCycleReclosureFingerprint: "reclosure-fp",
  sourceSubsequentCyclePackageId: predecessorPackage.packageId,
  sourceSubsequentCycleReplayKey: predecessorPackage.replayKey,
  sourceSubsequentCyclePackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = successiveCycleCorrectivePlanFingerprint(planBase);

const plan: SuccessiveCycleCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  successiveCyclePlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildSuccessiveCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildSuccessiveCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 094 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 094 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 094 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "successive-cycle-plan:" + plan.successiveCyclePlanId,
  "Build 094 batch identity must be successive-cycle specific."
);
assert(next.operations.length === 2, "Build 094 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 094 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 094 restore-missing scope must become a create operation."
);

const activationInput = {
  successiveCyclePlanFingerprint: plan.planFingerprint,
  sourceSubsequentCycleRecurrenceFingerprint: plan.sourceSubsequentCycleRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceSubsequentCycleReclosureFingerprint: plan.sourceSubsequentCycleReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  successiveCyclePackageId: next.packageId,
  successiveCycleReplayKey: next.replayKey,
  successiveCyclePackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  successiveCycleActivationFingerprint(activationInput) ===
    successiveCycleActivationFingerprint(activationInput),
  "Build 094 activation fingerprint must be deterministic."
);
assert(
  successiveCycleActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS SUCCESSIVE-CYCLE CORRECTIVE",
  "Build 094 activation confirmation changed unexpectedly."
);
assert(
  successiveCycleExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS SUCCESSIVE-CYCLE CORRECTIVE",
  "Build 094 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildSuccessiveCycleCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: successiveCycleCorrectivePlanFingerprint({
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
  "Build 094 must reject desired values not frozen in predecessor subsequent-cycle evidence."
);

console.log("Build 094 successive-cycle corrective delivery verification passed.");
