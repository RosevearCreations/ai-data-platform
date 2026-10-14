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
  compareSuccessorGenerationCorrectiveConsumerState,
  successorGenerationReclosureConfirmation,
  successorGenerationReclosureFingerprint,
  successorGenerationReconciliationErrorFingerprint
} from "../lib/successor-generation-corrective-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T21:30:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T21:00:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-067-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-067",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "successor-generation-plan:build-067-fixture";
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
  code: "successor-generation-match",
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

const matched = compareSuccessorGenerationCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 067 exact successor-generation read-back must match.");
assert(matched.matchedCount === 1, "Build 067 matched count must preserve package scope.");

const drift = compareSuccessorGenerationCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "successor-generation-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 067 changed successor-generation state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 067 drift evidence must identify the mismatch.");

const errorInput = {
  successorGenerationPackageId: packageId,
  successorGenerationReplayKey: replayKey,
  successorGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  successorGenerationReconciliationErrorFingerprint(errorInput) ===
    successorGenerationReconciliationErrorFingerprint(errorInput),
  "Build 067 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorNextGenerationReclosureId: "reclosure-063",
  nextGenerationRecurrenceId: "recurrence-064",
  secondRecurrenceRetriageId: "retriage-065",
  successorGenerationPlanId: "plan-065",
  successorGenerationDeliveryId: "delivery-066",
  successorGenerationReconciliationId: "reconciliation-067",
  predecessorNextGenerationReclosureFingerprint: "next-generation-reclosure-fingerprint",
  nextGenerationRecurrenceFingerprint: "second-recurrence-fingerprint",
  successorGenerationPlanFingerprint: "successor-generation-plan-fingerprint",
  successorGenerationPackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent successor-generation read-back matches."
};
const one = successorGenerationReclosureFingerprint(reclosureInput);
const two = successorGenerationReclosureFingerprint(reclosureInput);
const changed = successorGenerationReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different successor-generation closure rationale."
});
assert(one === two, "Build 067 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 067 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("successor-generation-reclosure1-"), "Build 067 re-closure fingerprint must be versioned.");
assert(
  successorGenerationReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE SUCCESSOR-GENERATION DEVIL-N-DOVE EXCEPTION",
  "Build 067 typed confirmation phrase changed unexpectedly."
);

console.log("Build 067 successor-generation reconciliation and re-closure verification passed.");
