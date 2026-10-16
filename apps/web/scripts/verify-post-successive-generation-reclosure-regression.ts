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
  comparePostSuccessiveGenerationReclosureConsumerState,
  successiveGenerationRecurrenceConfirmation,
  successiveGenerationRecurrenceFingerprint,
  postSuccessiveGenerationReclosureErrorFingerprint
} from "../lib/post-successive-generation-reclosure-regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-14T12:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-14T11:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-072-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-072",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "successive-generation-plan:build-072-fixture";
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
  code: "post-successive-generation-stable",
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

const stable = comparePostSuccessiveGenerationReclosureConsumerState(
  integrationPackage,
  matchedResponse
);
assert(stable.status === "stable", "Build 076 exact read-back must be stable.");
assert(stable.matchedCount === 1, "Build 076 stable count must preserve package scope.");

const recurred = comparePostSuccessiveGenerationReclosureConsumerState(
  integrationPackage,
  {
    ...matchedResponse,
    code: "post-successive-generation-recurred",
    records: [{
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }]
  }
);
assert(recurred.status === "recurred", "Build 076 drift must become recurrent evidence.");
assert(recurred.mismatchedCount === 1, "Build 076 recurrence must preserve mismatch evidence.");

const errorInput = {
  successiveGenerationReclosureId: "reclosure-075",
  successiveGenerationPackageId: packageId,
  successiveGenerationReplayKey: replayKey,
  successiveGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-14T12:31:00.000Z"
};
assert(
  postSuccessiveGenerationReclosureErrorFingerprint(errorInput) ===
    postSuccessiveGenerationReclosureErrorFingerprint(errorInput),
  "Build 076 error fingerprint must be deterministic."
);

const recurrenceInput = {
  successiveGenerationReclosureId: "reclosure-075",
  successiveGenerationReclosureRegressionCheckId: "check-072",
  caseId: "case-053",
  successiveGenerationReclosureFingerprint: "reclosure-fingerprint",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Verified drift returned."
};
const recurrenceOne = successiveGenerationRecurrenceFingerprint(recurrenceInput);
const recurrenceTwo = successiveGenerationRecurrenceFingerprint(recurrenceInput);
const changed = successiveGenerationRecurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different rationale."
});
assert(recurrenceOne === recurrenceTwo, "Build 076 recurrence fingerprint must be deterministic.");
assert(recurrenceOne !== changed, "Build 076 recurrence fingerprint must bind the reason.");
assert(recurrenceOne.startsWith("successive-generation-recurrence1-"), "Build 076 recurrence fingerprint must be versioned.");
assert(
  successiveGenerationRecurrenceConfirmation("devil-n-dove") ===
    "REOPEN SUCCESSIVE-GENERATION RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 076 typed confirmation changed unexpectedly."
);

console.log("Build 076 post-successive-generation recurrence verification passed.");
