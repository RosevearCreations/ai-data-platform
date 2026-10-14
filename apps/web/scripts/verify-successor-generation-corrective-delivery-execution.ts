import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildSuccessorGenerationCorrectiveExecutionPackage,
  successorGenerationActivationConfirmation,
  successorGenerationActivationFingerprint,
  successorGenerationExecutionConfirmation
} from "../lib/successor-generation-corrective-delivery-execution";
import {
  successorGenerationCorrectivePlanFingerprint,
  type SuccessorGenerationCorrectiveDeliveryPlan
} from "../lib/second-recurrence-planning";
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
  secondRecurrenceRetriageId: "00000000-0000-4000-8000-000000000061",
  nextGenerationRecurrenceId: "00000000-0000-4000-8000-000000000060",
  nextGenerationReclosureId: "00000000-0000-4000-8000-000000000059",
  nextGenerationReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorNextGenerationPlanId: "00000000-0000-4000-8000-000000000057",
  predecessorNextGenerationDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceNextGenerationRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceNextGenerationReclosureFingerprint: "reclosure-fp",
  sourceNextGenerationPackageId: predecessorPackage.packageId,
  sourceNextGenerationReplayKey: predecessorPackage.replayKey,
  sourceNextGenerationPackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = successorGenerationCorrectivePlanFingerprint(planBase);

const plan: SuccessorGenerationCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  successorGenerationPlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildSuccessorGenerationCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildSuccessorGenerationCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 066 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 066 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 066 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "successor-generation-plan:" + plan.successorGenerationPlanId,
  "Build 066 batch identity must be successor-generation specific."
);
assert(next.operations.length === 2, "Build 066 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 066 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 066 restore-missing scope must become a create operation."
);

const activationInput = {
  successorGenerationPlanFingerprint: plan.planFingerprint,
  sourceNextGenerationRecurrenceFingerprint: plan.sourceNextGenerationRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceNextGenerationReclosureFingerprint: plan.sourceNextGenerationReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  successorGenerationPackageId: next.packageId,
  successorGenerationReplayKey: next.replayKey,
  successorGenerationPackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  successorGenerationActivationFingerprint(activationInput) ===
    successorGenerationActivationFingerprint(activationInput),
  "Build 066 activation fingerprint must be deterministic."
);
assert(
  successorGenerationActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS SUCCESSOR-GENERATION CORRECTIVE",
  "Build 066 activation confirmation changed unexpectedly."
);
assert(
  successorGenerationExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS SUCCESSOR-GENERATION CORRECTIVE",
  "Build 066 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildSuccessorGenerationCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: successorGenerationCorrectivePlanFingerprint({
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
  "Build 066 must reject desired values not frozen in predecessor successor evidence."
);

console.log("Build 066 successor-generation corrective delivery verification passed.");
