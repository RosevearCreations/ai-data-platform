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
  comparePostNextCorrectiveGenerationReclosureConsumerState,
  nextCorrectiveGenerationRecurrenceConfirmation,
  nextCorrectiveGenerationRecurrenceFingerprint,
  postNextCorrectiveGenerationReclosureErrorFingerprint
} from "../lib/post-next-corrective-generation-reclosure-regression";

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
const batchId = "next-corrective-generation-plan:build-102-fixture";
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
  code: "post-next-corrective-generation-stable",
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

const stable = comparePostNextCorrectiveGenerationReclosureConsumerState(
  integrationPackage,
  matchedResponse
);
assert(stable.status === "stable", "Build 104 exact read-back must be stable.");
assert(stable.matchedCount === 1, "Build 104 stable count must preserve package scope.");

const recurred = comparePostNextCorrectiveGenerationReclosureConsumerState(
  integrationPackage,
  {
    ...matchedResponse,
    code: "post-next-corrective-generation-recurred",
    records: [{
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }]
  }
);
assert(recurred.status === "recurred", "Build 104 drift must become recurrent evidence.");
assert(recurred.mismatchedCount === 1, "Build 104 recurrence must preserve mismatch evidence.");

const errorInput = {
  nextCorrectiveGenerationReclosureId: "reclosure-103",
  nextCorrectiveGenerationPackageId: packageId,
  nextCorrectiveGenerationReplayKey: replayKey,
  nextCorrectiveGenerationPackageFingerprint: fingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-14T12:31:00.000Z"
};
assert(
  postNextCorrectiveGenerationReclosureErrorFingerprint(errorInput) ===
    postNextCorrectiveGenerationReclosureErrorFingerprint(errorInput),
  "Build 104 error fingerprint must be deterministic."
);

const recurrenceInput = {
  nextCorrectiveGenerationReclosureId: "reclosure-103",
  nextCorrectiveGenerationReclosureRegressionCheckId: "check-104",
  caseId: "case-053",
  nextCorrectiveGenerationReclosureFingerprint: "reclosure-fingerprint",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Verified drift returned."
};
const recurrenceOne = nextCorrectiveGenerationRecurrenceFingerprint(recurrenceInput);
const recurrenceTwo = nextCorrectiveGenerationRecurrenceFingerprint(recurrenceInput);
const changed = nextCorrectiveGenerationRecurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different rationale."
});
assert(recurrenceOne === recurrenceTwo, "Build 104 recurrence fingerprint must be deterministic.");
assert(recurrenceOne !== changed, "Build 104 recurrence fingerprint must bind the reason.");
assert(recurrenceOne.startsWith("next-corrective-generation-recurrence1-"), "Build 104 recurrence fingerprint must be versioned.");
assert(
  nextCorrectiveGenerationRecurrenceConfirmation("devil-n-dove") ===
    "REOPEN NEXT-CORRECTIVE-GENERATION RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 104 typed confirmation changed unexpectedly."
);

console.log("Build 104 post-next-corrective-generation recurrence verification passed.");
