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
  comparePostReclosureConsumerState,
  postReclosureErrorFingerprint,
  recurrenceConfirmation,
  recurrenceFingerprint
} from "../lib/post-reclosure-regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-13T18:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-13T17:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-060-fixture",
  values: { priceMinimumCad: 249 },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-060",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "successor-plan:build-060-fixture";
const packageFingerprint = integrationFingerprint({
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
  fingerprint: packageFingerprint
});
const replayKey = integrationReplayKey({
  target: "rosie-dazzlers",
  packageId,
  fingerprint: packageFingerprint
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
  expiresAt: "2026-10-14T18:00:00.000Z",
  fingerprint: packageFingerprint,
  operations
};

const stableResponse: ConsumerStateVerificationResponse = {
  protocol: INTEGRATION_CONSUMER_PROTOCOL,
  kind: "state-verification",
  status: "accepted",
  code: "post-reclosure-stable",
  target: "rosie-dazzlers",
  packageId,
  replayKey,
  fingerprint: packageFingerprint,
  verifiedAt: "2026-10-13T18:30:00.000Z",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 249 }
  }]
};
const stable = comparePostReclosureConsumerState(
  integrationPackage,
  stableResponse
);
assert(stable.status === "stable", "Build 060 exact re-closed state must remain stable.");
assert(stable.matchedCount === 1, "Build 060 stable read-back must preserve exact scope.");

const recurred = comparePostReclosureConsumerState(integrationPackage, {
  ...stableResponse,
  code: "post-reclosure-recurred",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 995 }
  }]
});
assert(recurred.status === "recurred", "Build 060 renewed drift must classify as recurred.");
assert(recurred.mismatchedCount === 1, "Build 060 recurrence must preserve mismatch evidence.");

const errorInput = {
  reclosureId: "reclosure-059",
  successorPackageId: packageId,
  successorReplayKey: replayKey,
  successorPackageFingerprint: packageFingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-13T18:31:00.000Z"
};
assert(
  postReclosureErrorFingerprint(errorInput) ===
    postReclosureErrorFingerprint(errorInput),
  "Build 060 error fingerprints must be deterministic."
);

const recurrenceInput = {
  reclosureId: "reclosure-059",
  reclosureRegressionCheckId: "check-060",
  caseId: "case-053",
  reclosureFingerprint: "reclosure-fingerprint",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Newest read-back proves recurring drift."
};
const one = recurrenceFingerprint(recurrenceInput);
const two = recurrenceFingerprint(recurrenceInput);
const changed = recurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different rationale."
});
assert(one === two, "Build 060 recurrence fingerprint must be deterministic.");
assert(one !== changed, "Build 060 recurrence fingerprint must bind the reason.");
assert(one.startsWith("recurrence1-"), "Build 060 recurrence fingerprint must be versioned.");
assert(
  recurrenceConfirmation("devil-n-dove") ===
    "REOPEN RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 060 typed recurrence confirmation changed unexpectedly."
);

console.log("Build 060 post-re-closure monitoring and recurrence verification passed.");
