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
  comparePostContinuationCycleReclosureConsumerState,
  continuationCycleRecurrenceConfirmation,
  continuationCycleRecurrenceFingerprint,
  postContinuationCycleReclosureErrorFingerprint
} from "../lib/post-continuation-cycle-reclosure-regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-14T12:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-14T11:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-094-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-094",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "continuation-cycle-plan:build-094-fixture";
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
  code: "post-continuation-cycle-stable",
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

const stable = comparePostContinuationCycleReclosureConsumerState(
  integrationPackage,
  matchedResponse
);
assert(stable.status === "stable", "Build 100 exact read-back must be stable.");
assert(stable.matchedCount === 1, "Build 100 stable count must preserve package scope.");

const recurred = comparePostContinuationCycleReclosureConsumerState(
  integrationPackage,
  {
    ...matchedResponse,
    code: "post-continuation-cycle-recurred",
    records: [{
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }]
  }
);
assert(recurred.status === "recurred", "Build 100 drift must become recurrent evidence.");
assert(recurred.mismatchedCount === 1, "Build 100 recurrence must preserve mismatch evidence.");

const errorInput = {
  continuationCycleReclosureId: "reclosure-095",
  continuationCyclePackageId: packageId,
  continuationCycleReplayKey: replayKey,
  continuationCyclePackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-14T12:31:00.000Z"
};
assert(
  postContinuationCycleReclosureErrorFingerprint(errorInput) ===
    postContinuationCycleReclosureErrorFingerprint(errorInput),
  "Build 100 error fingerprint must be deterministic."
);

const recurrenceInput = {
  continuationCycleReclosureId: "reclosure-095",
  continuationCycleReclosureRegressionCheckId: "check-096",
  caseId: "case-053",
  continuationCycleReclosureFingerprint: "reclosure-fingerprint",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Verified drift returned."
};
const recurrenceOne = continuationCycleRecurrenceFingerprint(recurrenceInput);
const recurrenceTwo = continuationCycleRecurrenceFingerprint(recurrenceInput);
const changed = continuationCycleRecurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different rationale."
});
assert(recurrenceOne === recurrenceTwo, "Build 100 recurrence fingerprint must be deterministic.");
assert(recurrenceOne !== changed, "Build 100 recurrence fingerprint must bind the reason.");
assert(recurrenceOne.startsWith("continuation-cycle-recurrence1-"), "Build 100 recurrence fingerprint must be versioned.");
assert(
  continuationCycleRecurrenceConfirmation("devil-n-dove") ===
    "REOPEN CONTINUATION-CYCLE RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 100 typed confirmation changed unexpectedly."
);

console.log("Build 100 post-continuation-cycle recurrence verification passed.");
