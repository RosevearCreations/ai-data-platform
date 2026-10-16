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
  compareSuccessiveGenerationCorrectiveConsumerState,
  successiveGenerationReclosureConfirmation,
  successiveGenerationReclosureFingerprint,
  successiveGenerationReconciliationErrorFingerprint
} from "../lib/successive-generation-corrective-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T21:30:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T21:00:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-071-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-071",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "successive-generation-plan:build-071-fixture";
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
  code: "successive-generation-match",
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

const matched = compareSuccessiveGenerationCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 075 exact successive-generation read-back must match.");
assert(matched.matchedCount === 1, "Build 075 matched count must preserve package scope.");

const drift = compareSuccessiveGenerationCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "successive-generation-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 075 changed successive-generation state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 075 drift evidence must identify the mismatch.");

const errorInput = {
  successiveGenerationPackageId: packageId,
  successiveGenerationReplayKey: replayKey,
  successiveGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  successiveGenerationReconciliationErrorFingerprint(errorInput) ===
    successiveGenerationReconciliationErrorFingerprint(errorInput),
  "Build 075 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorSubsequentGenerationReclosureId: "reclosure-067",
  subsequentGenerationRecurrenceId: "recurrence-068",
  subsequentGenerationRetriageId: "retriage-069",
  successiveGenerationPlanId: "plan-069",
  successiveGenerationDeliveryId: "delivery-070",
  successiveGenerationReconciliationId: "reconciliation-071",
  predecessorSubsequentGenerationReclosureFingerprint: "subsequent-generation-reclosure-fingerprint",
  subsequentGenerationRecurrenceFingerprint: "subsequent-generation-recurrence-fingerprint",
  successiveGenerationPlanFingerprint: "successive-generation-plan-fingerprint",
  successiveGenerationPackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent successive-generation read-back matches."
};
const one = successiveGenerationReclosureFingerprint(reclosureInput);
const two = successiveGenerationReclosureFingerprint(reclosureInput);
const changed = successiveGenerationReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different successive-generation closure rationale."
});
assert(one === two, "Build 075 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 075 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("successive-generation-reclosure1-"), "Build 075 re-closure fingerprint must be versioned.");
assert(
  successiveGenerationReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE SUBSEQUENT-GENERATION DEVIL-N-DOVE EXCEPTION",
  "Build 075 typed confirmation phrase changed unexpectedly."
);

console.log("Build 075 successive-generation reconciliation and re-closure verification passed.");
