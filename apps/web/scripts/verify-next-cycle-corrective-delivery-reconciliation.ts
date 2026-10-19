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
  compareNextCycleCorrectiveConsumerState,
  nextCycleReclosureConfirmation,
  nextCycleReclosureFingerprint,
  nextCycleReconciliationErrorFingerprint
} from "../lib/next-cycle-corrective-delivery-reconciliation";

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
const batchId = "next-cycle-plan:build-079-fixture";
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
  code: "next-cycle-match",
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

const matched = compareNextCycleCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 083 exact next-cycle read-back must match.");
assert(matched.matchedCount === 1, "Build 083 matched count must preserve package scope.");

const drift = compareNextCycleCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "next-cycle-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 083 changed next-cycle state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 083 drift evidence must identify the mismatch.");

const errorInput = {
  nextCyclePackageId: packageId,
  nextCycleReplayKey: replayKey,
  nextCyclePackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  nextCycleReconciliationErrorFingerprint(errorInput) ===
    nextCycleReconciliationErrorFingerprint(errorInput),
  "Build 083 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorContinuationGenerationReclosureId: "reclosure-071",
  continuationGenerationRecurrenceId: "recurrence-072",
  continuationGenerationRetriageId: "retriage-073",
  nextCyclePlanId: "plan-073",
  nextCycleDeliveryId: "delivery-074",
  nextCycleReconciliationId: "reconciliation-075",
  predecessorContinuationGenerationReclosureFingerprint: "continuation-generation-reclosure-fingerprint",
  continuationGenerationRecurrenceFingerprint: "continuation-generation-recurrence-fingerprint",
  nextCyclePlanFingerprint: "next-cycle-plan-fingerprint",
  nextCyclePackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent next-cycle read-back matches."
};
const one = nextCycleReclosureFingerprint(reclosureInput);
const two = nextCycleReclosureFingerprint(reclosureInput);
const changed = nextCycleReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different next-cycle closure rationale."
});
assert(one === two, "Build 083 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 083 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("next-cycle-reclosure1-"), "Build 083 re-closure fingerprint must be versioned.");
assert(
  nextCycleReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE NEXT-CYCLE DEVIL-N-DOVE EXCEPTION",
  "Build 083 typed confirmation phrase changed unexpectedly."
);

console.log("Build 083 next-cycle reconciliation and re-closure verification passed.");
