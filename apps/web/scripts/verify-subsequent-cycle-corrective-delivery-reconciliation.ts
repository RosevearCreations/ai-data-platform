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
  compareSubsequentCycleCorrectiveConsumerState,
  subsequentCycleReclosureConfirmation,
  subsequentCycleReclosureFingerprint,
  subsequentCycleReconciliationErrorFingerprint
} from "../lib/subsequent-cycle-corrective-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T21:30:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T21:00:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-079-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-079",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "subsequent-cycle-plan:build-079-fixture";
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
  expiresAt: "2026-10-14T21:30:00.000Z",
  fingerprint,
  operations
};

const matchedResponse: ConsumerStateVerificationResponse = {
  protocol: INTEGRATION_CONSUMER_PROTOCOL,
  kind: "state-verification",
  status: "accepted",
  code: "subsequent-cycle-match",
  target: "rosie-dazzlers",
  packageId,
  replayKey,
  fingerprint,
  verifiedAt: "2026-10-13T21:31:00.000Z",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 249 }
  }]
};

const matched = compareSubsequentCycleCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 091 exact subsequent-cycle read-back must match.");
assert(matched.matchedCount === 1, "Build 091 matched count must preserve package scope.");

const drift = compareSubsequentCycleCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "subsequent-cycle-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 091 changed subsequent-cycle state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 091 drift evidence must identify the mismatch.");

const errorInput = {
  subsequentCyclePackageId: packageId,
  subsequentCycleReplayKey: replayKey,
  subsequentCyclePackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  subsequentCycleReconciliationErrorFingerprint(errorInput) ===
    subsequentCycleReconciliationErrorFingerprint(errorInput),
  "Build 091 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorFollowingCycleReclosureId: "reclosure-071",
  followingCycleRecurrenceId: "recurrence-072",
  followingCycleRetriageId: "retriage-073",
  subsequentCyclePlanId: "plan-073",
  subsequentCycleDeliveryId: "delivery-074",
  subsequentCycleReconciliationId: "reconciliation-075",
  predecessorFollowingCycleReclosureFingerprint: "following-cycle-reclosure-fingerprint",
  followingCycleRecurrenceFingerprint: "following-cycle-recurrence-fingerprint",
  subsequentCyclePlanFingerprint: "subsequent-cycle-plan-fingerprint",
  subsequentCyclePackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent subsequent-cycle read-back matches."
};
const one = subsequentCycleReclosureFingerprint(reclosureInput);
const two = subsequentCycleReclosureFingerprint(reclosureInput);
const changed = subsequentCycleReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different subsequent-cycle closure rationale."
});
assert(one === two, "Build 091 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 091 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("subsequent-cycle-reclosure1-"), "Build 091 re-closure fingerprint must be versioned.");
assert(
  subsequentCycleReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE SUBSEQUENT-CYCLE DEVIL-N-DOVE EXCEPTION",
  "Build 091 typed confirmation phrase changed unexpectedly."
);

console.log("Build 091 subsequent-cycle reconciliation and re-closure verification passed.");
