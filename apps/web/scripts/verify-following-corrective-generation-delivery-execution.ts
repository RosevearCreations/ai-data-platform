import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  buildFollowingCorrectiveGenerationExecutionPackage,
  followingCorrectiveGenerationActivationConfirmation,
  followingCorrectiveGenerationActivationFingerprint,
  followingCorrectiveGenerationExecutionConfirmation
} from "../lib/following-corrective-generation-delivery-execution";
import {
  followingCorrectiveGenerationPlanFingerprint,
  type FollowingCorrectiveGenerationPlan
} from "../lib/next-corrective-generation-recurrence-planning";
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
const predecessorBatchId = "next-corrective-generation-plan:predecessor";
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
  nextCorrectiveGenerationRetriageId: "00000000-0000-4000-8000-000000000061",
  nextCorrectiveGenerationRecurrenceId: "00000000-0000-4000-8000-000000000060",
  nextCorrectiveGenerationReclosureId: "00000000-0000-4000-8000-000000000059",
  nextCorrectiveGenerationReclosureRegressionCheckId: "00000000-0000-4000-8000-000000000600",
  predecessorNextCorrectiveGenerationPlanId: "00000000-0000-4000-8000-000000000057",
  predecessorNextCorrectiveGenerationDeliveryId: "00000000-0000-4000-8000-000000000058",
  sourceNextCorrectiveGenerationRecurrenceFingerprint: "recurrence-fp",
  sourceRegressionFingerprint: "recurrent-readback-fp",
  sourceNextCorrectiveGenerationReclosureFingerprint: "reclosure-fp",
  sourceNextCorrectiveGenerationPackageId: predecessorPackage.packageId,
  sourceNextCorrectiveGenerationReplayKey: predecessorPackage.replayKey,
  sourceNextCorrectiveGenerationPackageFingerprint: predecessorPackage.fingerprint,
  correctionScope,
  rationale: "Correct the verified recurrent drift."
};
const planFingerprint = followingCorrectiveGenerationPlanFingerprint(planBase);

const plan: FollowingCorrectiveGenerationPlan = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  workspaceName: "Fixture",
  role: "owner",
  followingCorrectiveGenerationPlanId: "00000000-0000-4000-8000-000000000062",
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

const next = buildFollowingCorrectiveGenerationExecutionPackage(
  plan,
  predecessorPackage
);
const nextAgain = buildFollowingCorrectiveGenerationExecutionPackage(
  plan,
  predecessorPackage
);

assert(
  next.packageId !== predecessorPackage.packageId,
  "Build 106 must create a distinct package ID."
);
assert(
  next.replayKey !== predecessorPackage.replayKey,
  "Build 106 must create a distinct replay/idempotency key."
);
assert(
  next.packageId === nextAgain.packageId &&
    next.replayKey === nextAgain.replayKey &&
    next.fingerprint === nextAgain.fingerprint,
  "Build 106 package identity must be deterministic for frozen plan evidence."
);
assert(
  next.batchId === "following-corrective-generation-plan:" + plan.followingCorrectiveGenerationPlanId,
  "Build 106 batch identity must be following-corrective-generation specific."
);
assert(next.operations.length === 2, "Build 106 must preserve exact scoped records.");
assert(
  Object.keys(next.operations[0].values).length === 1 &&
    next.operations[0].values.priceMinimumCad === 249,
  "Build 106 must not widen a mismatched record beyond governed fields."
);
assert(
  next.operations[1].action === "create",
  "Build 106 restore-missing scope must become a create operation."
);

const activationInput = {
  followingCorrectiveGenerationPlanFingerprint: plan.planFingerprint,
  sourceNextCorrectiveGenerationRecurrenceFingerprint: plan.sourceNextCorrectiveGenerationRecurrenceFingerprint,
  sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
  sourceNextCorrectiveGenerationReclosureFingerprint: plan.sourceNextCorrectiveGenerationReclosureFingerprint,
  consumerId: "https://consumer.example.test",
  followingCorrectiveGenerationPackageId: next.packageId,
  followingCorrectiveGenerationReplayKey: next.replayKey,
  followingCorrectiveGenerationPackageFingerprint: next.fingerprint,
  dryRunValidationCode: "accepted",
  dryRunConsumerReceivedAt: "2026-10-13T20:01:00.000Z"
};
assert(
  followingCorrectiveGenerationActivationFingerprint(activationInput) ===
    followingCorrectiveGenerationActivationFingerprint(activationInput),
  "Build 106 activation fingerprint must be deterministic."
);
assert(
  followingCorrectiveGenerationActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS FOLLOWING-CORRECTIVE-GENERATION CORRECTIVE",
  "Build 106 activation confirmation changed unexpectedly."
);
assert(
  followingCorrectiveGenerationExecutionConfirmation(target) ===
    "EXECUTE ROSIE-DAZZLERS FOLLOWING-CORRECTIVE-GENERATION CORRECTIVE",
  "Build 106 execution confirmation changed unexpectedly."
);

let rejected = false;
try {
  buildFollowingCorrectiveGenerationExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }],
      planFingerprint: followingCorrectiveGenerationPlanFingerprint({
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
  "Build 106 must reject desired values not frozen in predecessor next-corrective-generation evidence."
);

console.log("Build 106 following-corrective-generation corrective delivery verification passed.");
