import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildSubsequentGenerationCorrectiveExecutionPackage,
  subsequentGenerationActivationConfirmation,
  subsequentGenerationActivationFingerprint,
  subsequentGenerationExecutionConfirmation
} from "../lib/subsequent-generation-corrective-delivery-execution";
import {
  subsequentGenerationCorrectivePlanFingerprint,
  type SubsequentGenerationCorrectiveDeliveryPlan
} from "../lib/successor-generation-recurrence-planning";
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
  successorGenerationRetriageId: "00000000-0000-4000-8000-000000000061",
  successorGenerationRecurrenceId: "00000000-0000-4000-8000-000000000060",
  successorGenerationReclosureId: "00000000-0000-4000-8000-000000000059",
  successorGenerationReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorSuccessorGenerationPlanId: "00000000-0000-4000-8000-000000000057",
  predecessorSuccessorGenerationDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceSuccessorGenerationRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceSuccessorGenerationReclosureFingerprint: "reclosure-fp",
  sourceSuccessorGenerationPackageId: predecessorPackage.packageId,
  sourceSuccessorGenerationReplayKey: predecessorPackage.replayKey,
  sourceSuccessorGenerationPackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = subsequentGenerationCorrectivePlanFingerprint(planBase);

const plan: SubsequentGenerationCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  subsequentGenerationPlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildSubsequentGenerationCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildSubsequentGenerationCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 070 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 070 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 070 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "subsequent-generation-plan:" + plan.subsequentGenerationPlanId,
  "Build 070 batch identity must be subsequent-generation specific."
);
assert(next.operations.length === 2, "Build 070 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 070 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 070 restore-missing scope must become a create operation."
);

const activationInput = {
  subsequentGenerationPlanFingerprint: plan.planFingerprint,
  sourceSuccessorGenerationRecurrenceFingerprint: plan.sourceSuccessorGenerationRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceSuccessorGenerationReclosureFingerprint: plan.sourceSuccessorGenerationReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  subsequentGenerationPackageId: next.packageId,
  subsequentGenerationReplayKey: next.replayKey,
  subsequentGenerationPackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  subsequentGenerationActivationFingerprint(activationInput) ===
    subsequentGenerationActivationFingerprint(activationInput),
  "Build 070 activation fingerprint must be deterministic."
);
assert(
  subsequentGenerationActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS SUBSEQUENT-GENERATION CORRECTIVE",
  "Build 070 activation confirmation changed unexpectedly."
);
assert(
  subsequentGenerationExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS SUBSEQUENT-GENERATION CORRECTIVE",
  "Build 070 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildSubsequentGenerationCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: subsequentGenerationCorrectivePlanFingerprint({
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
  "Build 070 must reject desired values not frozen in predecessor successor evidence."
);

console.log("Build 070 subsequent-generation corrective delivery verification passed.");
