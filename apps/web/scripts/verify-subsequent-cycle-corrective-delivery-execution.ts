import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildSubsequentCycleCorrectiveExecutionPackage,
  subsequentCycleActivationConfirmation,
  subsequentCycleActivationFingerprint,
  subsequentCycleExecutionConfirmation
} from "../lib/subsequent-cycle-corrective-delivery-execution";
import {
  subsequentCycleCorrectivePlanFingerprint,
  type SubsequentCycleCorrectiveDeliveryPlan
} from "../lib/following-cycle-recurrence-planning";
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
const predecessorBatchId = "following-cycle-plan:predecessor";
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
  followingCycleRetriageId: "00000000-0000-4000-8000-000000000061",
  followingCycleRecurrenceId: "00000000-0000-4000-8000-000000000060",
  followingCycleReclosureId: "00000000-0000-4000-8000-000000000059",
  followingCycleReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorFollowingCyclePlanId: "00000000-0000-4000-8000-000000000057",
  predecessorFollowingCycleDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceFollowingCycleRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceFollowingCycleReclosureFingerprint: "reclosure-fp",
  sourceFollowingCyclePackageId: predecessorPackage.packageId,
  sourceFollowingCycleReplayKey: predecessorPackage.replayKey,
  sourceFollowingCyclePackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = subsequentCycleCorrectivePlanFingerprint(planBase);

const plan: SubsequentCycleCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  subsequentCyclePlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildSubsequentCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildSubsequentCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 090 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 090 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 090 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "subsequent-cycle-plan:" + plan.subsequentCyclePlanId,
  "Build 090 batch identity must be subsequent-cycle specific."
);
assert(next.operations.length === 2, "Build 090 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 090 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 090 restore-missing scope must become a create operation."
);

const activationInput = {
  subsequentCyclePlanFingerprint: plan.planFingerprint,
  sourceFollowingCycleRecurrenceFingerprint: plan.sourceFollowingCycleRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceFollowingCycleReclosureFingerprint: plan.sourceFollowingCycleReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  subsequentCyclePackageId: next.packageId,
  subsequentCycleReplayKey: next.replayKey,
  subsequentCyclePackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  subsequentCycleActivationFingerprint(activationInput) ===
    subsequentCycleActivationFingerprint(activationInput),
  "Build 090 activation fingerprint must be deterministic."
);
assert(
  subsequentCycleActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS SUBSEQUENT-CYCLE CORRECTIVE",
  "Build 090 activation confirmation changed unexpectedly."
);
assert(
  subsequentCycleExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS SUBSEQUENT-CYCLE CORRECTIVE",
  "Build 090 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildSubsequentCycleCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: subsequentCycleCorrectivePlanFingerprint({
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
  "Build 090 must reject desired values not frozen in predecessor following-cycle evidence."
);

console.log("Build 090 subsequent-cycle corrective delivery verification passed.");
