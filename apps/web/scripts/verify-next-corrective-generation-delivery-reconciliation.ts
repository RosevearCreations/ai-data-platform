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
  compareNextCorrectiveGenerationConsumerState,
  nextCorrectiveGenerationReclosureConfirmation,
  nextCorrectiveGenerationReclosureFingerprint,
  nextCorrectiveGenerationReconciliationErrorFingerprint
} from "../lib/next-corrective-generation-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T21:30:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T21:00:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-098-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-079",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "next-corrective-generation-plan:build-098-fixture";
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
  code: "next-corrective-generation-match",
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

const matched = compareNextCorrectiveGenerationConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 103 exact next-corrective-generation read-back must match.");
assert(matched.matchedCount === 1, "Build 103 matched count must preserve package scope.");

const drift = compareNextCorrectiveGenerationConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "next-corrective-generation-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999 }
  }]
});
assert(drift.status === "drift", "Build 103 changed next-corrective-generation state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 103 drift evidence must identify the mismatch.");

const errorInput = {
  nextCorrectiveGenerationPackageId: packageId,
  nextCorrectiveGenerationReplayKey: replayKey,
  nextCorrectiveGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T21:32:00.000Z"
};
assert(
  nextCorrectiveGenerationReconciliationErrorFingerprint(errorInput) ===
    nextCorrectiveGenerationReconciliationErrorFingerprint(errorInput),
  "Build 103 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorContinuationCycleReclosureId: "reclosure-071",
  continuationCycleRecurrenceId: "recurrence-072",
  continuationCycleRetriageId: "retriage-073",
  nextCorrectiveGenerationPlanId: "plan-073",
  nextCorrectiveGenerationDeliveryId: "delivery-074",
  nextCorrectiveGenerationReconciliationId: "reconciliation-075",
  predecessorContinuationCycleReclosureFingerprint: "continuation-cycle-reclosure-fingerprint",
  continuationCycleRecurrenceFingerprint: "continuation-cycle-recurrence-fingerprint",
  nextCorrectiveGenerationPlanFingerprint: "next-corrective-generation-plan-fingerprint",
  nextCorrectiveGenerationPackageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent next-corrective-generation read-back matches."
};
const one = nextCorrectiveGenerationReclosureFingerprint(reclosureInput);
const two = nextCorrectiveGenerationReclosureFingerprint(reclosureInput);
const changed = nextCorrectiveGenerationReclosureFingerprint({
  ...reclosureInput,
  reclosureNote: "Different next-corrective-generation closure rationale."
});
assert(one === two, "Build 103 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 103 re-closure fingerprint must bind the closure note.");
assert(one.startsWith("next-corrective-generation-reclosure1-"), "Build 103 re-closure fingerprint must be versioned.");
assert(
  nextCorrectiveGenerationReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE NEXT-CORRECTIVE-GENERATION DEVIL-N-DOVE EXCEPTION",
  "Build 103 typed confirmation phrase changed unexpectedly."
);

console.log("Build 103 next-corrective-generation reconciliation and re-closure verification passed.");
