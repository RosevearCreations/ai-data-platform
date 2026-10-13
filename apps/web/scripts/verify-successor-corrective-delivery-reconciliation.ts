import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type ConsumerStateVerificationResponse,
  type IntegrationPackageV1
} from "../lib/integration-delivery";
import {
  compareSuccessorCorrectiveConsumerState,
  successorReclosureConfirmation,
  successorReclosureFingerprint,
  successorReconciliationErrorFingerprint
} from "../lib/successor-corrective-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T16:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T15:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-059-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-059",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "successor-plan:build-059-fixture";
const fingerprint = integrationFingerprint({
  target: "rosie-dazzlers",
  adapterContract: INTEGRATION_CONTRACTS["rosie-dazzlers"].adapterContract,
  contractVersion: 1,
  batchId,
  approvedAt,
  sourceDatasetUpdatedAt,
  operations
});
const packageId = integrationPackageId({
  target: "rosie-dazzlers",
  batchId,
  approvedAt,
  fingerprint
});
const replayKey = integrationReplayKey({
  target: "rosie-dazzlers",
  packageId,
  fingerprint
});
const integrationPackage: IntegrationPackageV1 = {
  version: 1,
  schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
  target: "rosie-dazzlers",
  adapterContract: INTEGRATION_CONTRACTS["rosie-dazzlers"].adapterContract,
  contractVersion: 1,
  packageId,
  replayKey,
  batchId,
  approvedAt,
  sourceDatasetUpdatedAt,
  generatedAt: approvedAt,
  expiresAt: "2026-10-14T16:00:00.000Z",
  fingerprint,
  operations
};

const matchedResponse: ConsumerStateVerificationResponse = {
  protocol: INTEGRATION_CONSUMER_PROTOCOL,
  kind: "state-verification",
  status: "accepted",
  code: "successor-match",
  target: "rosie-dazzlers",
  packageId,
  replayKey,
  fingerprint,
  verifiedAt: "2026-10-13T16:30:00.000Z",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 249 }
  }]
};
const matched = compareSuccessorCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 059 exact successor read-back must match.");
assert(matched.matchedCount === 1, "Build 059 matched count must preserve package scope.");

const drift = compareSuccessorCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "successor-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 059 changed successor state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 059 drift evidence must identify the mismatch.");

const errorInput = {
  successorPackageId: packageId,
  successorReplayKey: replayKey,
  successorPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T16:31:00.000Z"
};
assert(
  successorReconciliationErrorFingerprint(errorInput) ===
    successorReconciliationErrorFingerprint(errorInput),
  "Build 059 error fingerprints must be deterministic."
);

const reclosureInput = {
  originalClosureId: "closure-055",
  reopenId: "reopen-056",
  successorPlanId: "plan-057",
  successorDeliveryId: "delivery-058",
  successorReconciliationId: "reconciliation-059",
  originalClosureFingerprint: "closure-fingerprint",
  reopenFingerprint: "reopen-fingerprint",
  successorPlanFingerprint: "successor-plan-fingerprint",
  successorPackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent successor read-back matches."
};
const reclosureOne = successorReclosureFingerprint(reclosureInput);
const reclosureTwo = successorReclosureFingerprint(reclosureInput);
const changed = successorReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different closure rationale."
});
assert(reclosureOne === reclosureTwo, "Build 059 re-closure fingerprint must be deterministic.");
assert(reclosureOne !== changed, "Build 059 re-closure fingerprint must bind the closure note.");
assert(reclosureOne.startsWith("successor-reclosure1-"), "Build 059 re-closure fingerprint must be versioned.");
assert(
  successorReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE VERIFIED DEVIL-N-DOVE EXCEPTION",
  "Build 059 typed confirmation phrase changed unexpectedly."
);

console.log("Build 059 successor reconciliation and re-closure verification passed.");
