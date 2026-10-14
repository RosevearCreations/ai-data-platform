import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildNextGenerationCorrectiveExecutionPackage,
  nextGenerationActivationConfirmation,
  nextGenerationActivationFingerprint,
  nextGenerationExecutionConfirmation
} from "../lib/next-generation-corrective-delivery-execution";
import {
  nextGenerationCorrectivePlanFingerprint,
  type NextGenerationCorrectiveDeliveryPlan
} from "../lib/recurrent-exception-planning";
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
    integrationKey: "record-a",
    values: { priceMinimumCad: 249, offeringName: "Complete" },
    sourceEvidence: {
      sourceUrl: "https://example.test/record-a",
      retrievedAt: sourceDatasetUpdatedAt
    }
  },
  {
    action: "create" as const,
    integrationKey: "record-b",
    values: { offeringName: "Interior", priceMinimumCad: 195 },
    sourceEvidence: {
      sourceUrl: "https://example.test/record-b",
      retrievedAt: sourceDatasetUpdatedAt
    }
  }
];
const predecessorBatchId = "successor-plan:predecessor";
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
    integrationKey: "record-a",
    issueStatus: "mismatched" as const,
    proposedAction: "update-existing" as const,
    desiredValues: { priceMinimumCad: 249 },
    governedFields: ["priceMinimumCad"],
    expectedFingerprint: "expected-a",
    observedFingerprint: "observed-a"
  },
  {
    integrationKey: "record-b",
    issueStatus: "missing" as const,
    proposedAction: "restore-missing" as const,
    desiredValues: { offeringName: "Interior", priceMinimumCad: 195 },
    governedFields: ["offeringName","priceMinimumCad"],
    expectedFingerprint: "expected-b",
    observedFingerprint: null
  }
];

const planBase = {
  recurrenceRetriageId: "00000000-0000-4000-8000-000000000061",
  recurrenceId: "00000000-0000-4000-8000-000000000060",
  reclosureId: "00000000-0000-4000-8000-000000000059",
  reclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorSuccessorPlanId: "00000000-0000-4000-8000-000000000057",
  predecessorSuccessorDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceReclosureFingerprint: "reclosure-fp",
  sourceSuccessorPackageId: predecessorPackage.packageId,
  sourceSuccessorReplayKey: predecessorPackage.replayKey,
  sourceSuccessorPackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = nextGenerationCorrectivePlanFingerprint(planBase);

const plan: NextGenerationCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  nextGenerationPlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildNextGenerationCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildNextGenerationCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 062 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 062 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 062 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "next-generation-plan:" + plan.nextGenerationPlanId,
  "Build 062 batch identity must be next-generation specific."
);
assert(next.operations.length === 2, "Build 062 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 062 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 062 restore-missing scope must become a create operation."
);

const activationInput = {
  nextGenerationPlanFingerprint: plan.planFingerprint,
  sourceRecurrenceFingerprint: plan.sourceRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceReclosureFingerprint: plan.sourceReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  nextGenerationPackageId: next.packageId,
  nextGenerationReplayKey: next.replayKey,
  nextGenerationPackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  nextGenerationActivationFingerprint(activationInput) ===
    nextGenerationActivationFingerprint(activationInput),
  "Build 062 activation fingerprint must be deterministic."
);
assert(
  nextGenerationActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS NEXT-GENERATION CORRECTIVE",
  "Build 062 activation confirmation changed unexpectedly."
);
assert(
  nextGenerationExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS NEXT-GENERATION CORRECTIVE",
  "Build 062 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildNextGenerationCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: nextGenerationCorrectivePlanFingerprint({
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
  "Build 062 must reject desired values not frozen in predecessor successor evidence."
);

console.log("Build 062 next-generation corrective delivery verification passed.");
