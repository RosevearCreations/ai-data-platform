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
  comparePostNextGenerationReclosureConsumerState,
  nextGenerationRecurrenceConfirmation,
  nextGenerationRecurrenceFingerprint,
  postNextGenerationReclosureErrorFingerprint
} from "../lib/post-next-generation-reclosure-regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-14T12:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-14T11:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-064-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-064",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "next-generation-plan:build-064-fixture";
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
  expiresAt: "2026-10-15T12:00:00.000Z",
  fingerprint,
  operations
};

const matchedResponse: ConsumerStateVerificationResponse = {
  protocol: INTEGRATION_CONSUMER_PROTOCOL,
  kind: "state-verification",
  status: "accepted",
  code: "post-next-generation-stable",
  target: "rosie-dazzlers",
  packageId,
  replayKey,
  fingerprint,
  verifiedAt: "2026-10-14T12:30:00.000Z",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 249 }
  }]
};

const stable = comparePostNextGenerationReclosureConsumerState(
  integrationPackage,
  matchedResponse
);
assert(stable.status === "stable", "Build 064 exact read-back must be stable.");
assert(stable.matchedCount === 1, "Build 064 stable count must preserve package scope.");

const recurred = comparePostNextGenerationReclosureConsumerState(
  integrationPackage,
  {
    ...matchedResponse,
    code: "post-next-generation-recurred",
    records: [{
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }]
  }
);
assert(recurred.status === "recurred", "Build 064 drift must become recurrent evidence.");
assert(recurred.mismatchedCount === 1, "Build 064 recurrence must preserve mismatch evidence.");

const errorInput = {
  nextGenerationReclosureId: "reclosure-063",
  nextGenerationPackageId: packageId,
  nextGenerationReplayKey: replayKey,
  nextGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-14T12:31:00.000Z"
};
assert(
  postNextGenerationReclosureErrorFingerprint(errorInput) ===
    postNextGenerationReclosureErrorFingerprint(errorInput),
  "Build 064 error fingerprint must be deterministic."
);

const recurrenceInput = {
  nextGenerationReclosureId: "reclosure-063",
  nextGenerationReclosureRegressionCheckId: "check-064",
  caseId: "case-053",
  nextGenerationReclosureFingerprint: "reclosure-fingerprint",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Verified drift returned."
};
const recurrenceOne = nextGenerationRecurrenceFingerprint(recurrenceInput);
const recurrenceTwo = nextGenerationRecurrenceFingerprint(recurrenceInput);
const changed = nextGenerationRecurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different rationale."
});
assert(recurrenceOne === recurrenceTwo, "Build 064 recurrence fingerprint must be deterministic.");
assert(recurrenceOne !== changed, "Build 064 recurrence fingerprint must bind the reason.");
assert(recurrenceOne.startsWith("next-generation-recurrence1-"), "Build 064 recurrence fingerprint must be versioned.");
assert(
  nextGenerationRecurrenceConfirmation("devil-n-dove") ===
    "REOPEN NEXT-GENERATION RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 064 typed confirmation changed unexpectedly."
);

console.log("Build 064 post-next-generation recurrence verification passed.");
