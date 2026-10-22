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
  compareFollowingCorrectiveGenerationConsumerState,
  followingCorrectiveGenerationReclosureConfirmation,
  followingCorrectiveGenerationReclosureFingerprint,
  followingCorrectiveGenerationReconciliationErrorFingerprint
} from "../lib/following-corrective-generation-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T21:30:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T21:00:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-102-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-102",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "following-corrective-generation-plan:build-102-fixture";
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
  code: "following-corrective-generation-match",
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

const matched = compareFollowingCorrectiveGenerationConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 107 exact following-corrective-generation read-back must match.");
assert(matched.matchedCount === 1, "Build 107 matched count must preserve package scope.");

const drift = compareFollowingCorrectiveGenerationConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "following-corrective-generation-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 107 changed following-corrective-generation state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 107 drift evidence must identify the mismatch.");

const errorInput = {
  followingCorrectiveGenerationPackageId: packageId,
  followingCorrectiveGenerationReplayKey: replayKey,
  followingCorrectiveGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  followingCorrectiveGenerationReconciliationErrorFingerprint(errorInput) ===
    followingCorrectiveGenerationReconciliationErrorFingerprint(errorInput),
  "Build 107 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorNextCorrectiveGenerationReclosureId: "reclosure-071",
  nextCorrectiveGenerationRecurrenceId: "recurrence-072",
  nextCorrectiveGenerationRetriageId: "retriage-073",
  followingCorrectiveGenerationPlanId: "plan-073",
  followingCorrectiveGenerationDeliveryId: "delivery-074",
  followingCorrectiveGenerationReconciliationId: "reconciliation-075",
  predecessorNextCorrectiveGenerationReclosureFingerprint: "next-corrective-generation-reclosure-fingerprint",
  nextCorrectiveGenerationRecurrenceFingerprint: "next-corrective-generation-recurrence-fingerprint",
  followingCorrectiveGenerationPlanFingerprint: "following-corrective-generation-plan-fingerprint",
  followingCorrectiveGenerationPackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent following-corrective-generation read-back matches."
};
const one = followingCorrectiveGenerationReclosureFingerprint(reclosureInput);
const two = followingCorrectiveGenerationReclosureFingerprint(reclosureInput);
const changed = followingCorrectiveGenerationReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different following-corrective-generation closure rationale."
});
assert(one === two, "Build 107 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 107 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("following-corrective-generation-reclosure1-"), "Build 107 re-closure fingerprint must be versioned.");
assert(
  followingCorrectiveGenerationReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE FOLLOWING-CORRECTIVE-GENERATION DEVIL-N-DOVE EXCEPTION",
  "Build 107 typed confirmation phrase changed unexpectedly."
);

console.log("Build 107 following-corrective-generation reconciliation and re-closure verification passed.");
