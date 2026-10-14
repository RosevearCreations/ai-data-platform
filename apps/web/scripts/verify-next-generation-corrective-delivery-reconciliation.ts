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
  compareNextGenerationCorrectiveConsumerState,
  nextGenerationReclosureConfirmation,
  nextGenerationReclosureFingerprint,
  nextGenerationReconciliationErrorFingerprint
} from "../lib/next-generation-corrective-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T21:30:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T21:00:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-063-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-063",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "next-generation-plan:build-063-fixture";
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
  code: "next-generation-match",
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

const matched = compareNextGenerationCorrectiveConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 063 exact next-generation read-back must match.");
assert(matched.matchedCount === 1, "Build 063 matched count must preserve package scope.");

const drift = compareNextGenerationCorrectiveConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "next-generation-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 063 changed next-generation state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 063 drift evidence must identify the mismatch.");

const errorInput = {
  nextGenerationPackageId: packageId,
  nextGenerationReplayKey: replayKey,
  nextGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  nextGenerationReconciliationErrorFingerprint(errorInput) ===
    nextGenerationReconciliationErrorFingerprint(errorInput),
  "Build 063 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorReclosureId: "reclosure-059",
  recurrenceId: "recurrence-060",
  recurrenceRetriageId: "retriage-061",
  nextGenerationPlanId: "plan-061",
  nextGenerationDeliveryId: "delivery-062",
  nextGenerationReconciliationId: "reconciliation-063",
  predecessorReclosureFingerprint: "reclosure-fingerprint",
  recurrenceFingerprint: "recurrence-fingerprint",
  nextGenerationPlanFingerprint: "next-generation-plan-fingerprint",
  nextGenerationPackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent next-generation read-back matches."
};
const one = nextGenerationReclosureFingerprint(reclosureInput);
const two = nextGenerationReclosureFingerprint(reclosureInput);
const changed = nextGenerationReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different next-generation closure rationale."
});
assert(one === two, "Build 063 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 063 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("next-generation-reclosure1-"), "Build 063 re-closure fingerprint must be versioned.");
assert(
  nextGenerationReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE NEXT-GENERATION DEVIL-N-DOVE EXCEPTION",
  "Build 063 typed confirmation phrase changed unexpectedly."
);

console.log("Build 063 next-generation reconciliation and re-closure verification passed.");
