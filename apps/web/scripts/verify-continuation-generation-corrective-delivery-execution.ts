import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildContinuationGenerationCorrectiveExecutionPackage,
  continuationGenerationActivationConfirmation,
  continuationGenerationActivationFingerprint,
  continuationGenerationExecutionConfirmation
} from "../lib/continuation-generation-corrective-delivery-execution";
import {
  continuationGenerationCorrectivePlanFingerprint,
  type ContinuationGenerationCorrectiveDeliveryPlan
} from "../lib/successive-generation-recurrence-planning";
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
const predecessorBatchId = "successive-generation-plan:predecessor";
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
  successiveGenerationRetriageId: "00000000-0000-4000-8000-000000000061",
  successiveGenerationRecurrenceId: "00000000-0000-4000-8000-000000000060",
  successiveGenerationReclosureId: "00000000-0000-4000-8000-000000000059",
  successiveGenerationReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorSuccessiveGenerationPlanId: "00000000-0000-4000-8000-000000000057",
  predecessorSuccessiveGenerationDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceSuccessiveGenerationRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceSuccessiveGenerationReclosureFingerprint: "reclosure-fp",
  sourceSuccessiveGenerationPackageId: predecessorPackage.packageId,
  sourceSuccessiveGenerationReplayKey: predecessorPackage.replayKey,
  sourceSuccessiveGenerationPackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = continuationGenerationCorrectivePlanFingerprint(planBase);

const plan: ContinuationGenerationCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  continuationGenerationPlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildContinuationGenerationCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildContinuationGenerationCorrectiveExecutionPackage(
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
  next.batchId === "continuation-generation-plan:" + plan.continuationGenerationPlanId,
  "Build 078 batch identity must be continuation-generation specific."
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
  continuationGenerationPlanFingerprint: plan.planFingerprint,
  sourceSuccessiveGenerationRecurrenceFingerprint: plan.sourceSuccessiveGenerationRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceSuccessiveGenerationReclosureFingerprint: plan.sourceSuccessiveGenerationReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  continuationGenerationPackageId: next.packageId,
  continuationGenerationReplayKey: next.replayKey,
  continuationGenerationPackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  continuationGenerationActivationFingerprint(activationInput) ===
    continuationGenerationActivationFingerprint(activationInput),
  "Build 078 activation fingerprint must be deterministic."
);
assert(
  continuationGenerationActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS CONTINUATION-GENERATION CORRECTIVE",
  "Build 078 activation confirmation changed unexpectedly."
);
assert(
  continuationGenerationExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS CONTINUATION-GENERATION CORRECTIVE",
  "Build 078 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildContinuationGenerationCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: continuationGenerationCorrectivePlanFingerprint({
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
  "Build 078 must reject desired values not frozen in predecessor successive-generation evidence."
);

console.log("Build 078 continuation-generation corrective delivery verification passed.");
