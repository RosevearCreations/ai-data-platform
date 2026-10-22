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
  comparePostFollowingCorrectiveGenerationReclosureConsumerState,
  followingCorrectiveGenerationRecurrenceConfirmation,
  followingCorrectiveGenerationRecurrenceFingerprint,
  postFollowingCorrectiveGenerationReclosureErrorFingerprint
} from "../lib/post-following-corrective-generation-reclosure-regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-14T12:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-14T11:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-102-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-102",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "following-corrective-generation-plan:build-102-fixture";
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
  code: "post-following-corrective-generation-stable",
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

const stable = comparePostFollowingCorrectiveGenerationReclosureConsumerState(
  integrationPackage,
  matchedResponse
);
assert(stable.status === "stable", "Build 108 exact read-back must be stable.");
assert(stable.matchedCount === 1, "Build 108 stable count must preserve package scope.");

const recurred = comparePostFollowingCorrectiveGenerationReclosureConsumerState(
  integrationPackage,
  {
    ...matchedResponse,
    code: "post-following-corrective-generation-recurred",
    records: [{
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }]
  }
);
assert(recurred.status === "recurred", "Build 108 drift must become recurrent evidence.");
assert(recurred.mismatchedCount === 1, "Build 108 recurrence must preserve mismatch evidence.");

const errorInput = {
  followingCorrectiveGenerationReclosureId: "reclosure-103",
  followingCorrectiveGenerationPackageId: packageId,
  followingCorrectiveGenerationReplayKey: replayKey,
  followingCorrectiveGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-14T12:31:00.000Z"
};
assert(
  postFollowingCorrectiveGenerationReclosureErrorFingerprint(errorInput) ===
    postFollowingCorrectiveGenerationReclosureErrorFingerprint(errorInput),
  "Build 108 error fingerprint must be deterministic."
);

const recurrenceInput = {
  followingCorrectiveGenerationReclosureId: "reclosure-103",
  followingCorrectiveGenerationReclosureRegressionCheckId: "check-104",
  caseId: "case-053",
  followingCorrectiveGenerationReclosureFingerprint: "reclosure-fingerprint",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Verified drift returned."
};
const recurrenceOne = followingCorrectiveGenerationRecurrenceFingerprint(recurrenceInput);
const recurrenceTwo = followingCorrectiveGenerationRecurrenceFingerprint(recurrenceInput);
const changed = followingCorrectiveGenerationRecurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different rationale."
});
assert(recurrenceOne === recurrenceTwo, "Build 108 recurrence fingerprint must be deterministic.");
assert(recurrenceOne !== changed, "Build 108 recurrence fingerprint must bind the reason.");
assert(recurrenceOne.startsWith("following-corrective-generation-recurrence1-"), "Build 108 recurrence fingerprint must be versioned.");
assert(
  followingCorrectiveGenerationRecurrenceConfirmation("devil-n-dove") ===
    "REOPEN FOLLOWING-CORRECTIVE-GENERATION RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 108 typed confirmation changed unexpectedly."
);

console.log("Build 108 post-following-corrective-generation recurrence verification passed.");
