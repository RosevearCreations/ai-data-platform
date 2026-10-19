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
  comparePostNextCycleReclosureConsumerState,
  nextCycleRecurrenceConfirmation,
  nextCycleRecurrenceFingerprint,
  postNextCycleReclosureErrorFingerprint
} from "../lib/post-next-cycle-reclosure-regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-14T12:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-14T11:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-080-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-080",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "next-cycle-plan:build-080-fixture";
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
  code: "post-next-cycle-stable",
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

const stable = comparePostNextCycleReclosureConsumerState(
  integrationPackage,
  matchedResponse
);
assert(stable.status === "stable", "Build 084 exact read-back must be stable.");
assert(stable.matchedCount === 1, "Build 084 stable count must preserve package scope.");

const recurred = comparePostNextCycleReclosureConsumerState(
  integrationPackage,
  {
    ...matchedResponse,
    code: "post-next-cycle-recurred",
    records: [{
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }]
  }
);
assert(recurred.status === "recurred", "Build 084 drift must become recurrent evidence.");
assert(recurred.mismatchedCount === 1, "Build 084 recurrence must preserve mismatch evidence.");

const errorInput = {
  nextCycleReclosureId: "reclosure-075",
  nextCyclePackageId: packageId,
  nextCycleReplayKey: replayKey,
  nextCyclePackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-14T12:31:00.000Z"
};
assert(
  postNextCycleReclosureErrorFingerprint(errorInput) ===
    postNextCycleReclosureErrorFingerprint(errorInput),
  "Build 084 error fingerprint must be deterministic."
);

const recurrenceInput = {
  nextCycleReclosureId: "reclosure-075",
  nextCycleReclosureRegressionCheckId: "check-076",
  caseId: "case-053",
  nextCycleReclosureFingerprint: "reclosure-fingerprint",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Verified drift returned."
};
const recurrenceOne = nextCycleRecurrenceFingerprint(recurrenceInput);
const recurrenceTwo = nextCycleRecurrenceFingerprint(recurrenceInput);
const changed = nextCycleRecurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different rationale."
});
assert(recurrenceOne === recurrenceTwo, "Build 084 recurrence fingerprint must be deterministic.");
assert(recurrenceOne !== changed, "Build 084 recurrence fingerprint must bind the reason.");
assert(recurrenceOne.startsWith("next-cycle-recurrence1-"), "Build 084 recurrence fingerprint must be versioned.");
assert(
  nextCycleRecurrenceConfirmation("devil-n-dove") ===
    "REOPEN NEXT-CYCLE RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 084 typed confirmation changed unexpectedly."
);

console.log("Build 084 post-next-cycle recurrence verification passed.");
