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
  comparePostSubsequentGenerationReclosureConsumerState,
  subsequentGenerationRecurrenceConfirmation,
  subsequentGenerationRecurrenceFingerprint,
  postSubsequentGenerationReclosureErrorFingerprint
} from "../lib/post-subsequent-generation-reclosure-regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-14T12:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-14T11:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-068-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-064",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "subsequent-generation-plan:build-068-fixture";
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
  code: "post-subsequent-generation-stable",
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

const stable = comparePostSubsequentGenerationReclosureConsumerState(
  integrationPackage,
  matchedResponse
);
assert(stable.status === "stable", "Build 072 exact read-back must be stable.");
assert(stable.matchedCount === 1, "Build 072 stable count must preserve package scope.");

const recurred = comparePostSubsequentGenerationReclosureConsumerState(
  integrationPackage,
  {
    ...matchedResponse,
    code: "post-subsequent-generation-recurred",
    records: [{
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }]
  }
);
assert(recurred.status === "recurred", "Build 072 drift must become recurrent evidence.");
assert(recurred.mismatchedCount === 1, "Build 072 recurrence must preserve mismatch evidence.");

const errorInput = {
  subsequentGenerationReclosureId: "reclosure-063",
  subsequentGenerationPackageId: packageId,
  subsequentGenerationReplayKey: replayKey,
  subsequentGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-14T12:31:00.000Z"
};
assert(
  postSubsequentGenerationReclosureErrorFingerprint(errorInput) ===
    postSubsequentGenerationReclosureErrorFingerprint(errorInput),
  "Build 072 error fingerprint must be deterministic."
);

const recurrenceInput = {
  subsequentGenerationReclosureId: "reclosure-063",
  subsequentGenerationReclosureRegressionCheckId: "check-064",
  caseId: "case-053",
  subsequentGenerationReclosureFingerprint: "reclosure-fingerprint",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Verified drift returned."
};
const recurrenceOne = subsequentGenerationRecurrenceFingerprint(recurrenceInput);
const recurrenceTwo = subsequentGenerationRecurrenceFingerprint(recurrenceInput);
const changed = subsequentGenerationRecurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different rationale."
});
assert(recurrenceOne === recurrenceTwo, "Build 072 recurrence fingerprint must be deterministic.");
assert(recurrenceOne !== changed, "Build 072 recurrence fingerprint must bind the reason.");
assert(recurrenceOne.startsWith("subsequent-generation-recurrence1-"), "Build 072 recurrence fingerprint must be versioned.");
assert(
  subsequentGenerationRecurrenceConfirmation("devil-n-dove") ===
    "REOPEN SUBSEQUENT-GENERATION RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 072 typed confirmation changed unexpectedly."
);

console.log("Build 072 post-subsequent-generation recurrence verification passed.");
