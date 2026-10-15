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
  compareSubsequentGenerationCorrectiveConsumerState,
  subsequentGenerationReclosureConfirmation,
  subsequentGenerationReclosureFingerprint,
  subsequentGenerationReconciliationErrorFingerprint
} from "../lib/subsequent-generation-corrective-delivery-reconciliation";

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
const batchId = "subsequent-generation-plan:build-071-fixture";
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
  code: "subsequent-generation-match",
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

const matched = compareSubsequentGenerationCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 071 exact subsequent-generation read-back must match.");
assert(matched.matchedCount === 1, "Build 071 matched count must preserve package scope.");

const drift = compareSubsequentGenerationCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "subsequent-generation-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 071 changed subsequent-generation state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 071 drift evidence must identify the mismatch.");

const errorInput = {
  subsequentGenerationPackageId: packageId,
  subsequentGenerationReplayKey: replayKey,
  subsequentGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  subsequentGenerationReconciliationErrorFingerprint(errorInput) ===
    subsequentGenerationReconciliationErrorFingerprint(errorInput),
  "Build 071 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorSuccessorGenerationReclosureId: "reclosure-067",
  successorGenerationRecurrenceId: "recurrence-068",
  successorGenerationRetriageId: "retriage-069",
  subsequentGenerationPlanId: "plan-069",
  subsequentGenerationDeliveryId: "delivery-070",
  subsequentGenerationReconciliationId: "reconciliation-071",
  predecessorSuccessorGenerationReclosureFingerprint: "successor-generation-reclosure-fingerprint",
  successorGenerationRecurrenceFingerprint: "successor-generation-recurrence-fingerprint",
  subsequentGenerationPlanFingerprint: "subsequent-generation-plan-fingerprint",
  subsequentGenerationPackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent subsequent-generation read-back matches."
};
const one = subsequentGenerationReclosureFingerprint(reclosureInput);
const two = subsequentGenerationReclosureFingerprint(reclosureInput);
const changed = subsequentGenerationReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different subsequent-generation closure rationale."
});
assert(one === two, "Build 071 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 071 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("subsequent-generation-reclosure1-"), "Build 071 re-closure fingerprint must be versioned.");
assert(
  subsequentGenerationReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE SUBSEQUENT-GENERATION DEVIL-N-DOVE EXCEPTION",
  "Build 071 typed confirmation phrase changed unexpectedly."
);

console.log("Build 071 subsequent-generation reconciliation and re-closure verification passed.");
