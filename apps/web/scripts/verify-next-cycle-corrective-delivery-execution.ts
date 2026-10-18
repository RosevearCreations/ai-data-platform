import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildNextCycleCorrectiveExecutionPackage,
  nextCycleActivationConfirmation,
  nextCycleActivationFingerprint,
  nextCycleExecutionConfirmation
} from "../lib/next-cycle-corrective-delivery-execution";
import {
  nextCycleCorrectivePlanFingerprint,
  type NextCycleCorrectiveDeliveryPlan
} from "../lib/continuation-generation-recurrence-planning";
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
const predecessorBatchId = "continuation-generation-plan:predecessor";
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
  continuationGenerationRetriageId: "00000000-0000-4000-8000-000000000061",
  continuationGenerationRecurrenceId: "00000000-0000-4000-8000-000000000060",
  continuationGenerationReclosureId: "00000000-0000-4000-8000-000000000059",
  continuationGenerationReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorContinuationGenerationPlanId: "00000000-0000-4000-8000-000000000057",
  predecessorContinuationGenerationDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceContinuationGenerationRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceContinuationGenerationReclosureFingerprint: "reclosure-fp",
  sourceContinuationGenerationPackageId: predecessorPackage.packageId,
  sourceContinuationGenerationReplayKey: predecessorPackage.replayKey,
  sourceContinuationGenerationPackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = nextCycleCorrectivePlanFingerprint(planBase);

const plan: NextCycleCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  nextCyclePlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildNextCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildNextCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 078 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 078 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 078 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "next-cycle-plan:" + plan.nextCyclePlanId,
  "Build 078 batch identity must be next-cycle specific."
);
assert(next.operations.length === 2, "Build 078 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 078 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 078 restore-missing scope must become a create operation."
);

const activationInput = {
  nextCyclePlanFingerprint: plan.planFingerprint,
  sourceContinuationGenerationRecurrenceFingerprint: plan.sourceContinuationGenerationRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceContinuationGenerationReclosureFingerprint: plan.sourceContinuationGenerationReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  nextCyclePackageId: next.packageId,
  nextCycleReplayKey: next.replayKey,
  nextCyclePackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  nextCycleActivationFingerprint(activationInput) ===
    nextCycleActivationFingerprint(activationInput),
  "Build 078 activation fingerprint must be deterministic."
);
assert(
  nextCycleActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS NEXT-CYCLE CORRECTIVE",
  "Build 078 activation confirmation changed unexpectedly."
);
assert(
  nextCycleExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS NEXT-CYCLE CORRECTIVE",
  "Build 078 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildNextCycleCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: nextCycleCorrectivePlanFingerprint({
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
  "Build 078 must reject desired values not frozen in predecessor continuation-generation evidence."
);

console.log("Build 078 next-cycle corrective delivery verification passed.");
