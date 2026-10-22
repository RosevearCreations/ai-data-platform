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
  compareContinuationCycleCorrectiveConsumerState,
  continuationCycleReclosureConfirmation,
  continuationCycleReclosureFingerprint,
  continuationCycleReconciliationErrorFingerprint
} from "../lib/continuation-cycle-corrective-delivery-reconciliation";

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
const batchId = "continuation-cycle-plan:build-094-fixture";
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
  code: "continuation-cycle-match",
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

const matched = compareContinuationCycleCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 099 exact continuation-cycle read-back must match.");
assert(matched.matchedCount === 1, "Build 099 matched count must preserve package scope.");

const drift = compareContinuationCycleCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "continuation-cycle-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 099 changed continuation-cycle state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 099 drift evidence must identify the mismatch.");

const errorInput = {
  continuationCyclePackageId: packageId,
  continuationCycleReplayKey: replayKey,
  continuationCyclePackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  continuationCycleReconciliationErrorFingerprint(errorInput) ===
    continuationCycleReconciliationErrorFingerprint(errorInput),
  "Build 099 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorSuccessiveCycleReclosureId: "reclosure-071",
  successiveCycleRecurrenceId: "recurrence-072",
  successiveCycleRetriageId: "retriage-073",
  continuationCyclePlanId: "plan-073",
  continuationCycleDeliveryId: "delivery-074",
  continuationCycleReconciliationId: "reconciliation-075",
  predecessorSuccessiveCycleReclosureFingerprint: "successive-cycle-reclosure-fingerprint",
  successiveCycleRecurrenceFingerprint: "successive-cycle-recurrence-fingerprint",
  continuationCyclePlanFingerprint: "continuation-cycle-plan-fingerprint",
  continuationCyclePackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent continuation-cycle read-back matches."
};
const one = continuationCycleReclosureFingerprint(reclosureInput);
const two = continuationCycleReclosureFingerprint(reclosureInput);
const changed = continuationCycleReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different continuation-cycle closure rationale."
});
assert(one === two, "Build 099 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 099 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("continuation-cycle-reclosure1-"), "Build 099 re-closure fingerprint must be versioned.");
assert(
  continuationCycleReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE CONTINUATION-CYCLE DEVIL-N-DOVE EXCEPTION",
  "Build 099 typed confirmation phrase changed unexpectedly."
);

console.log("Build 099 continuation-cycle reconciliation and re-closure verification passed.");
