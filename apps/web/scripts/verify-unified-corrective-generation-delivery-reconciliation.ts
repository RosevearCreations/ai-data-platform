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
  compareUnifiedCorrectiveGenerationConsumerState,
  unifiedCorrectiveGenerationReclosureConfirmation,
  unifiedCorrectiveGenerationReclosureFingerprint,
  unifiedCorrectiveGenerationReconciliationErrorFingerprint
} from "../lib/unified-corrective-generation-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-22T20:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-22T19:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-112-fixture",
  values: { priceMinimumCad: 249, offeringName: "Complete" },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-112",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "unified-corrective-generation-g3-plan:build-112-fixture";
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
  expiresAt: "2026-10-23T20:00:00.000Z",
  fingerprint,
  operations
};

const matchedResponse: ConsumerStateVerificationResponse = {
  protocol: INTEGRATION_CONSUMER_PROTOCOL,
  kind: "state-verification",
  status: "accepted",
  code: "unified-corrective-generation-match",
  target: "rosie-dazzlers",
  packageId,
  replayKey,
  fingerprint,
  verifiedAt: "2026-10-22T20:01:00.000Z",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 249, offeringName: "Complete" }
  }]
};

const matched = compareUnifiedCorrectiveGenerationConsumerState(
  integrationPackage,
  matchedResponse
);
assert(matched.status === "matched", "Build 112 exact consumer read-back must match.");
assert(matched.matchedCount === 1, "Build 112 matched count must preserve exact package scope.");

const drift = compareUnifiedCorrectiveGenerationConsumerState(integrationPackage, {
  ...matchedResponse,
  code: "unified-corrective-generation-drift",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 999, offeringName: "Complete" }
  }]
});
assert(drift.status === "drift", "Build 112 changed consumer state must remain drift.");
assert(drift.mismatchedCount === 1, "Build 112 drift evidence must identify the mismatch.");
assert(
  drift.recordResults[0].differingFields.includes("priceMinimumCad"),
  "Build 112 drift evidence must name the governed differing field."
);

const errorInput = {
  unifiedPackageId: packageId,
  unifiedReplayKey: replayKey,
  unifiedPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-22T20:02:00.000Z"
};
assert(
  unifiedCorrectiveGenerationReconciliationErrorFingerprint(errorInput) ===
    unifiedCorrectiveGenerationReconciliationErrorFingerprint(errorInput),
  "Build 112 error fingerprints must be deterministic."
);

const reclosureInput = {
  predecessorGenerationLineageId: "lineage-2",
  successorSourceId: "successor-3",
  correctiveGenerationRetriageId: "retriage-3",
  correctiveGenerationPlanId: "plan-3",
  deliveryId: "delivery-3",
  reconciliationId: "reconciliation-3",
  generationNumber: 3,
  predecessorRegistryFingerprint: "registry-fingerprint-2",
  sourceRecurrenceId: "recurrence-3",
  sourceRecurrenceFingerprint: "recurrence-fingerprint-3",
  sourceRegressionFingerprint: "regression-fingerprint-3",
  sourceSuccessorFingerprint: "successor-fingerprint-3",
  planFingerprint: "plan-fingerprint-3",
  packageFingerprint: fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  reclosureNote: "Independent generation-three read-back matches."
};
const one = unifiedCorrectiveGenerationReclosureFingerprint(reclosureInput);
const two = unifiedCorrectiveGenerationReclosureFingerprint(reclosureInput);
const changed = unifiedCorrectiveGenerationReclosureFingerprint({
  ...reclosureInput,
  successorSourceId: "successor-4"
});
assert(one === two, "Build 112 re-closure fingerprint must be deterministic.");
assert(one !== changed, "Build 112 re-closure fingerprint must bind the successor source.");
assert(
  one.startsWith("unified-corrective-generation-reclosure1-"),
  "Build 112 re-closure fingerprint must be versioned."
);
assert(
  unifiedCorrectiveGenerationReclosureConfirmation("devil-n-dove") ===
    "RE-CLOSE UNIFIED-CORRECTIVE-GENERATION DEVIL-N-DOVE EXCEPTION",
  "Build 112 typed confirmation phrase changed unexpectedly."
);

console.log("Build 112 unified corrective-generation reconciliation and re-closure verification passed.");
