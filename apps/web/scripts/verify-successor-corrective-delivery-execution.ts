import {
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  successorCorrectivePlanFingerprint,
  type SuccessorCorrectiveDeliveryPlan
} from "../lib/reopened-exception-planning";
import {
  buildSuccessorCorrectiveExecutionPackage,
  successorActivationConfirmation,
  successorExecutionConfirmation
} from "../lib/successor-corrective-delivery-execution";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T16:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T15:30:00.000Z";
const predecessorOperations = [
  {
    action: "update" as const,
    integrationKey: "rosie-competitor::build-058-fixture",
    values: { priceMinimumCad: 249, offeringName: "Complete" },
    sourceEvidence: {
      sourceUrl: "https://example.test/build-058",
      retrievedAt: sourceDatasetUpdatedAt
    }
  }
];
const predecessorFingerprint = integrationFingerprint({
  target: "rosie-dazzlers",
  adapterContract: INTEGRATION_CONTRACTS["rosie-dazzlers"].adapterContract,
  contractVersion: 1,
  batchId: "corrective-plan:build-053-fixture",
  approvedAt,
  sourceDatasetUpdatedAt,
  operations: predecessorOperations
});
const predecessorPackageId = integrationPackageId({
  target: "rosie-dazzlers",
  batchId: "corrective-plan:build-053-fixture",
  approvedAt,
  fingerprint: predecessorFingerprint
});
const predecessorReplayKey = integrationReplayKey({
  target: "rosie-dazzlers",
  packageId: predecessorPackageId,
  fingerprint: predecessorFingerprint
});
const predecessorPackage: IntegrationPackageV1 = {
  version: 1,
  schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
  target: "rosie-dazzlers",
  adapterContract: INTEGRATION_CONTRACTS["rosie-dazzlers"].adapterContract,
  contractVersion: 1,
  packageId: predecessorPackageId,
  replayKey: predecessorReplayKey,
  batchId: "corrective-plan:build-053-fixture",
  approvedAt,
  sourceDatasetUpdatedAt,
  generatedAt: approvedAt,
  expiresAt: "2026-10-14T16:00:00.000Z",
  fingerprint: predecessorFingerprint,
  operations: predecessorOperations
};

const correctionScope = [
  {
    integrationKey: "rosie-competitor::build-058-fixture",
    issueStatus: "mismatched" as const,
    proposedAction: "update-existing" as const,
    desiredValues: { priceMinimumCad: 249 },
    governedFields: ["priceMinimumCad"],
    expectedFingerprint: "expected-successor",
    observedFingerprint: "observed-regression"
  }
];
const baseFingerprintInput = {
  retriageId: "retriage-058",
  reopenId: "reopen-058",
  regressionCheckId: "regression-058",
  predecessorPlanId: "plan-053",
  predecessorCorrectiveDeliveryId: "delivery-054",
  sourceRegressionFingerprint: "regression-fingerprint-056",
  sourceCorrectivePackageId: predecessorPackageId,
  sourceCorrectiveReplayKey: predecessorReplayKey,
  sourceCorrectivePackageFingerprint: predecessorFingerprint,
  correctionScope,
  rationale: "Restore only the field proven regressed after closure."
};
const planFingerprint = successorCorrectivePlanFingerprint(baseFingerprintInput);
const plan: SuccessorCorrectiveDeliveryPlan = {
  workspaceId: "workspace-058",
  workspaceName: "Build 058",
  role: "owner",
  successorPlanId: "successor-plan-058",
  retriageId: baseFingerprintInput.retriageId,
  reopenId: baseFingerprintInput.reopenId,
  regressionCheckId: baseFingerprintInput.regressionCheckId,
  caseId: "case-058",
  target: "rosie-dazzlers",
  status: "approved",
  predecessorPlanId: baseFingerprintInput.predecessorPlanId,
  predecessorCorrectiveDeliveryId: baseFingerprintInput.predecessorCorrectiveDeliveryId,
  sourceRegressionFingerprint: baseFingerprintInput.sourceRegressionFingerprint,
  sourceCorrectivePackageId: predecessorPackageId,
  sourceCorrectiveReplayKey: predecessorReplayKey,
  sourceCorrectivePackageFingerprint: predecessorFingerprint,
  correctionScope,
  planFingerprint,
  rationale: baseFingerprintInput.rationale,
  createdBy: "owner-058",
  createdAt: approvedAt,
  reviewedBy: "owner-058",
  reviewedAt: approvedAt,
  reviewNote: "Approved for Build 058.",
  canManage: true
};

const one = buildSuccessorCorrectiveExecutionPackage(plan, predecessorPackage);
const two = buildSuccessorCorrectiveExecutionPackage(plan, predecessorPackage);
assert(one.packageId === two.packageId, "Build 058 successor package identity must be deterministic.");
assert(one.replayKey === two.replayKey, "Build 058 replay identity must be deterministic.");
assert(one.packageId !== predecessorPackage.packageId, "Build 058 must not reuse the predecessor package ID.");
assert(one.replayKey !== predecessorPackage.replayKey, "Build 058 must not reuse the predecessor replay key.");
assert(one.batchId === "successor-plan:" + plan.successorPlanId, "Build 058 must bind package identity to the successor plan.");
assert(one.operations.length === 1, "Build 058 must preserve only successor-plan scope.");
assert(one.operations[0]?.values.priceMinimumCad === 249, "Build 058 must preserve the frozen desired value.");
assert(
  Object.keys(one.operations[0]?.values ?? {}).join(",") === "priceMinimumCad",
  "Build 058 must not widen the governed field scope."
);
assert(
  successorActivationConfirmation("rosie-dazzlers") ===
    "ACTIVATE ROSIE-DAZZLERS SUCCESSOR CORRECTIVE",
  "Build 058 activation confirmation phrase changed unexpectedly."
);
assert(
  successorExecutionConfirmation("devil-n-dove") ===
    "EXECUTE DEVIL-N-DOVE SUCCESSOR CORRECTIVE",
  "Build 058 execution confirmation phrase changed unexpectedly."
);

let tamperBlocked = false;
try {
  buildSuccessorCorrectiveExecutionPackage(
    {
      ...plan,
      correctionScope: [{
        ...correctionScope[0],
        desiredValues: { priceMinimumCad: 999 }
      }]
    },
    predecessorPackage
  );
} catch {
  tamperBlocked = true;
}
assert(tamperBlocked, "Build 058 must fail closed when successor values diverge from predecessor-governed evidence.");

console.log("Build 058 successor corrective package and confirmation verification passed.");
