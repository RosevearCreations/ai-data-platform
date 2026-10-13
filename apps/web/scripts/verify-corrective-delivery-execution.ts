import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  correctivePlanFingerprint,
  type CorrectiveDeliveryPlan
} from "../lib/reconciliation-exception-triage";
import {
  buildCorrectiveExecutionPackage,
  correctiveActivationConfirmation,
  correctiveExecutionConfirmation
} from "../lib/corrective-delivery-execution";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const target = "rosie-dazzlers" as const;
const contract = INTEGRATION_CONTRACTS[target];
const approvedAt = "2026-10-12T20:00:00.000Z";
const sourceUpdatedAt = "2026-10-12T19:55:00.000Z";
const sourceOperations = [
  {
    action: "create" as const,
    integrationKey: "rosie-competitor::build-054-alpha",
    values: {
      competitorBusinessName: "Alpha Detail",
      offeringName: "Complete",
      priceMinimumCad: 239
    },
    sourceEvidence: {
      sourceUrl: "https://example.test/build-054/alpha",
      retrievedAt: sourceUpdatedAt
    }
  }
];
const sourceFingerprint = integrationFingerprint({
  target,
  adapterContract: contract.adapterContract,
  contractVersion: 1,
  batchId: "source-build-054",
  approvedAt,
  sourceDatasetUpdatedAt: sourceUpdatedAt,
  operations: sourceOperations
});
const sourcePackageId = integrationPackageId({
  target,
  batchId: "source-build-054",
  approvedAt,
  fingerprint: sourceFingerprint
});
const sourceReplayKey = integrationReplayKey({
  target,
  packageId: sourcePackageId,
  fingerprint: sourceFingerprint
});
const sourcePackage: IntegrationPackageV1 = {
  version: 1,
  schemaId: contract.schemaId,
  target,
  adapterContract: contract.adapterContract,
  contractVersion: 1,
  packageId: sourcePackageId,
  replayKey: sourceReplayKey,
  batchId: "source-build-054",
  approvedAt,
  sourceDatasetUpdatedAt: sourceUpdatedAt,
  generatedAt: approvedAt,
  expiresAt: "2026-10-13T20:00:00.000Z",
  fingerprint: sourceFingerprint,
  operations: sourceOperations
};

const basePlan = {
  workspaceId: "workspace-build-054",
  workspaceName: "Build 054",
  role: "owner" as const,
  planId: "11111111-1111-4111-8111-111111111111",
  caseId: "22222222-2222-4222-8222-222222222222",
  reconciliationId: "33333333-3333-4333-8333-333333333333",
  deliveryId: "44444444-4444-4444-8444-444444444444",
  target,
  status: "approved" as const,
  reconciliationFingerprint: "verify1-build-054",
  packageId: sourcePackage.packageId,
  replayKey: sourcePackage.replayKey,
  packageFingerprint: sourcePackage.fingerprint,
  correctionScope: [
    {
      integrationKey: sourceOperations[0].integrationKey,
      issueStatus: "mismatched" as const,
      proposedAction: "update-existing" as const,
      desiredValues: { priceMinimumCad: 239 },
      governedFields: ["priceMinimumCad"],
      expectedFingerprint: "expected-build-054",
      observedFingerprint: "observed-build-054"
    }
  ],
  rationale: "Restore only the governed field proven to have drifted.",
  createdBy: "owner-build-054",
  createdAt: approvedAt,
  reviewedBy: "owner-build-054",
  reviewedAt: approvedAt,
  reviewNote: "Approved for Build 054 controlled correction.",
  canManage: true
};
const planFingerprint = correctivePlanFingerprint({
  reconciliationFingerprint: basePlan.reconciliationFingerprint,
  packageId: basePlan.packageId,
  replayKey: basePlan.replayKey,
  packageFingerprint: basePlan.packageFingerprint,
  correctionScope: basePlan.correctionScope,
  rationale: basePlan.rationale
});
const plan: CorrectiveDeliveryPlan = {
  ...basePlan,
  planFingerprint
};

const corrective = buildCorrectiveExecutionPackage(plan, sourcePackage);
assert(
  corrective.packageId !== sourcePackage.packageId &&
    corrective.replayKey !== sourcePackage.replayKey,
  "Build 054 must create a new package/replay identity for corrective execution."
);
assert(
  corrective.operations.length === 1 &&
    corrective.operations[0]?.action === "update" &&
    Object.keys(corrective.operations[0]?.values ?? {}).join(",") ===
      "priceMinimumCad" &&
    corrective.operations[0]?.values.priceMinimumCad === 239,
  "Build 054 corrective package widened the frozen mismatched-field scope."
);
assert(
  corrective.batchId === "corrective-plan:" + plan.planId,
  "Build 054 corrective package is not bound to the approved plan ID."
);
assert(
  correctiveActivationConfirmation(target) ===
    "ACTIVATE ROSIE-DAZZLERS CORRECTIVE" &&
    correctiveExecutionConfirmation(target) ===
      "EXECUTE ROSIE-DAZZLERS CORRECTIVE",
  "Build 054 target-specific confirmation phrases changed unexpectedly."
);

const manualScope = [
  {
    ...plan.correctionScope[0],
    issueStatus: "missing" as const,
    proposedAction: "manual-review" as const
  }
];
const manualPlan: CorrectiveDeliveryPlan = {
  ...plan,
  correctionScope: manualScope,
  planFingerprint: correctivePlanFingerprint({
    reconciliationFingerprint: plan.reconciliationFingerprint,
    packageId: plan.packageId,
    replayKey: plan.replayKey,
    packageFingerprint: plan.packageFingerprint,
    correctionScope: manualScope,
    rationale: plan.rationale
  })
};
let blocked = false;
try {
  buildCorrectiveExecutionPackage(manualPlan, sourcePackage);
} catch (error) {
  blocked =
    error instanceof Error &&
    error.message === "corrective_delivery_manual_review_unresolved";
}
assert(blocked, "Build 054 accepted an unresolved manual-review plan item.");

blocked = false;
try {
  buildCorrectiveExecutionPackage(
    { ...plan, planFingerprint: "tampered" },
    sourcePackage
  );
} catch (error) {
  blocked =
    error instanceof Error &&
    error.message === "corrective_delivery_plan_fingerprint_mismatch";
}
assert(blocked, "Build 054 accepted a tampered plan fingerprint.");

console.log(
  "Build 054 deterministic corrective package identity, frozen-field scope, confirmation phrases and manual-review fail-closed verification passed."
);
