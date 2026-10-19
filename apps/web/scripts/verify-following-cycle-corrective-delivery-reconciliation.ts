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
  compareFollowingCycleCorrectiveConsumerState,
  followingCycleReclosureConfirmation,
  followingCycleReclosureFingerprint,
  followingCycleReconciliationErrorFingerprint
} from "../lib/following-cycle-corrective-delivery-reconciliation";

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
const batchId = "following-cycle-plan:build-079-fixture";
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
  code: "following-cycle-match",
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

const matched = compareFollowingCycleCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 087 exact following-cycle read-back must match.");
assert(matched.matchedCount === 1, "Build 087 matched count must preserve package scope.");

const drift = compareFollowingCycleCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "following-cycle-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 087 changed following-cycle state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 087 drift evidence must identify the mismatch.");

const errorInput = {
  followingCyclePackageId: packageId,
  followingCycleReplayKey: replayKey,
  followingCyclePackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  followingCycleReconciliationErrorFingerprint(errorInput) ===
    followingCycleReconciliationErrorFingerprint(errorInput),
  "Build 087 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorNextCycleReclosureId: "reclosure-071",
  nextCycleRecurrenceId: "recurrence-072",
  nextCycleRetriageId: "retriage-073",
  followingCyclePlanId: "plan-073",
  followingCycleDeliveryId: "delivery-074",
  followingCycleReconciliationId: "reconciliation-075",
  predecessorNextCycleReclosureFingerprint: "next-cycle-reclosure-fingerprint",
  nextCycleRecurrenceFingerprint: "next-cycle-recurrence-fingerprint",
  followingCyclePlanFingerprint: "following-cycle-plan-fingerprint",
  followingCyclePackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent following-cycle read-back matches."
};
const one = followingCycleReclosureFingerprint(reclosureInput);
const two = followingCycleReclosureFingerprint(reclosureInput);
const changed = followingCycleReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different following-cycle closure rationale."
});
assert(one === two, "Build 087 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 087 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("following-cycle-reclosure1-"), "Build 087 re-closure fingerprint must be versioned.");
assert(
  followingCycleReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE FOLLOWING-CYCLE DEVIL-N-DOVE EXCEPTION",
  "Build 087 typed confirmation phrase changed unexpectedly."
);

console.log("Build 087 following-cycle reconciliation and re-closure verification passed.");
