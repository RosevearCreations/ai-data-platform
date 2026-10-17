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
  compareContinuationGenerationCorrectiveConsumerState,
  continuationGenerationReclosureConfirmation,
  continuationGenerationReclosureFingerprint,
  continuationGenerationReconciliationErrorFingerprint
} from "../lib/continuation-generation-corrective-delivery-reconciliation";

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
const batchId = "continuation-generation-plan:build-079-fixture";
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
  code: "continuation-generation-match",
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

const matched = compareContinuationGenerationCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 079 exact continuation-generation read-back must match.");
assert(matched.matchedCount === 1, "Build 079 matched count must preserve package scope.");

const drift = compareContinuationGenerationCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "continuation-generation-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 079 changed continuation-generation state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 079 drift evidence must identify the mismatch.");

const errorInput = {
  continuationGenerationPackageId: packageId,
  continuationGenerationReplayKey: replayKey,
  continuationGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  continuationGenerationReconciliationErrorFingerprint(errorInput) ===
    continuationGenerationReconciliationErrorFingerprint(errorInput),
  "Build 079 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorSuccessiveGenerationReclosureId: "reclosure-071",
  successiveGenerationRecurrenceId: "recurrence-072",
  successiveGenerationRetriageId: "retriage-073",
  continuationGenerationPlanId: "plan-073",
  continuationGenerationDeliveryId: "delivery-074",
  continuationGenerationReconciliationId: "reconciliation-075",
  predecessorSuccessiveGenerationReclosureFingerprint: "successive-generation-reclosure-fingerprint",
  successiveGenerationRecurrenceFingerprint: "successive-generation-recurrence-fingerprint",
  continuationGenerationPlanFingerprint: "continuation-generation-plan-fingerprint",
  continuationGenerationPackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent continuation-generation read-back matches."
};
const one = continuationGenerationReclosureFingerprint(reclosureInput);
const two = continuationGenerationReclosureFingerprint(reclosureInput);
const changed = continuationGenerationReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different continuation-generation closure rationale."
});
assert(one === two, "Build 079 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 079 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("continuation-generation-reclosure1-"), "Build 079 re-closure fingerprint must be versioned.");
assert(
  continuationGenerationReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE CONTINUATION-GENERATION DEVIL-N-DOVE EXCEPTION",
  "Build 079 typed confirmation phrase changed unexpectedly."
);

console.log("Build 079 continuation-generation reconciliation and re-closure verification passed.");
