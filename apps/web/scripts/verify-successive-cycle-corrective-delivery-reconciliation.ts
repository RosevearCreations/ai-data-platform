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
  compareSuccessiveCycleCorrectiveConsumerState,
  successiveCycleReclosureConfirmation,
  successiveCycleReclosureFingerprint,
  successiveCycleReconciliationErrorFingerprint
} from "../lib/successive-cycle-corrective-delivery-reconciliation";

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
const batchId = "successive-cycle-plan:build-079-fixture";
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
  code: "successive-cycle-match",
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

const matched = compareSuccessiveCycleCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 095 exact successive-cycle read-back must match.");
assert(matched.matchedCount === 1, "Build 095 matched count must preserve package scope.");

const drift = compareSuccessiveCycleCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "successive-cycle-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 095 changed successive-cycle state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 095 drift evidence must identify the mismatch.");

const errorInput = {
  successiveCyclePackageId: packageId,
  successiveCycleReplayKey: replayKey,
  successiveCyclePackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  successiveCycleReconciliationErrorFingerprint(errorInput) ===
    successiveCycleReconciliationErrorFingerprint(errorInput),
  "Build 095 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorSubsequentCycleReclosureId: "reclosure-071",
  subsequentCycleRecurrenceId: "recurrence-072",
  subsequentCycleRetriageId: "retriage-073",
  successiveCyclePlanId: "plan-073",
  successiveCycleDeliveryId: "delivery-074",
  successiveCycleReconciliationId: "reconciliation-075",
  predecessorSubsequentCycleReclosureFingerprint: "subsequent-cycle-reclosure-fingerprint",
  subsequentCycleRecurrenceFingerprint: "subsequent-cycle-recurrence-fingerprint",
  successiveCyclePlanFingerprint: "successive-cycle-plan-fingerprint",
  successiveCyclePackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent successive-cycle read-back matches."
};
const one = successiveCycleReclosureFingerprint(reclosureInput);
const two = successiveCycleReclosureFingerprint(reclosureInput);
const changed = successiveCycleReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different successive-cycle closure rationale."
});
assert(one === two, "Build 095 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 095 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("successive-cycle-reclosure1-"), "Build 095 re-closure fingerprint must be versioned.");
assert(
  successiveCycleReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE SUCCESSIVE-CYCLE DEVIL-N-DOVE EXCEPTION",
  "Build 095 typed confirmation phrase changed unexpectedly."
);

console.log("Build 095 successive-cycle reconciliation and re-closure verification passed.");
