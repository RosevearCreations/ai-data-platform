import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildFollowingCycleCorrectiveExecutionPackage,
  followingCycleActivationConfirmation,
  followingCycleActivationFingerprint,
  followingCycleExecutionConfirmation
} from "../lib/following-cycle-corrective-delivery-execution";
import {
  followingCycleCorrectivePlanFingerprint,
  type FollowingCycleCorrectiveDeliveryPlan
} from "../lib/next-cycle-recurrence-planning";
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
const predecessorBatchId = "next-cycle-plan:predecessor";
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
  nextCycleRetriageId: "00000000-0000-4000-8000-000000000061",
  nextCycleRecurrenceId: "00000000-0000-4000-8000-000000000060",
  nextCycleReclosureId: "00000000-0000-4000-8000-000000000059",
  nextCycleReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorNextCyclePlanId: "00000000-0000-4000-8000-000000000057",
  predecessorNextCycleDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceNextCycleRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceNextCycleReclosureFingerprint: "reclosure-fp",
  sourceNextCyclePackageId: predecessorPackage.packageId,
  sourceNextCycleReplayKey: predecessorPackage.replayKey,
  sourceNextCyclePackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = followingCycleCorrectivePlanFingerprint(planBase);

const plan: FollowingCycleCorrectiveDeliveryPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  followingCyclePlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildFollowingCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildFollowingCycleCorrectiveExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 086 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 086 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 086 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "following-cycle-plan:" + plan.followingCyclePlanId,
  "Build 086 batch identity must be following-cycle specific."
);
assert(next.operations.length === 2, "Build 086 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 086 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 086 restore-missing scope must become a create operation."
);

const activationInput = {
  followingCyclePlanFingerprint: plan.planFingerprint,
  sourceNextCycleRecurrenceFingerprint: plan.sourceNextCycleRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceNextCycleReclosureFingerprint: plan.sourceNextCycleReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  followingCyclePackageId: next.packageId,
  followingCycleReplayKey: next.replayKey,
  followingCyclePackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  followingCycleActivationFingerprint(activationInput) ===
    followingCycleActivationFingerprint(activationInput),
  "Build 086 activation fingerprint must be deterministic."
);
assert(
  followingCycleActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS FOLLOWING-CYCLE CORRECTIVE",
  "Build 086 activation confirmation changed unexpectedly."
);
assert(
  followingCycleExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS FOLLOWING-CYCLE CORRECTIVE",
  "Build 086 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildFollowingCycleCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: followingCycleCorrectivePlanFingerprint({
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
  "Build 086 must reject desired values not frozen in predecessor next-cycle evidence."
);

console.log("Build 086 following-cycle corrective delivery verification passed.");
