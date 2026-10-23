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
  comparePostUnifiedCorrectiveGenerationReclosureConsumerState,
  postUnifiedCorrectiveGenerationReclosureErrorFingerprint,
  unifiedCorrectiveGenerationRecurrenceConfirmation,
  unifiedCorrectiveGenerationRecurrenceFingerprint
} from "../lib/post-unified-corrective-generation-reclosure-regression";
import {
  correctiveGenerationLineageFingerprint,
  correctiveGenerationSuccessorFingerprint
} from "../lib/corrective-generation-lineage";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const approvedAt = "2026-10-22T22:00:00.000Z";
const sourceDatasetUpdatedAt = "2026-10-22T21:30:00.000Z";
const operations = [{
  action: "update" as const,
  integrationKey: "rosie-competitor::build-113-fixture",
  values: { priceMinimumCad: 249, packageName: "Complete" },
  sourceEvidence: {
    sourceUrl: "https://example.test/build-113",
    retrievedAt: sourceDatasetUpdatedAt
  }
}];
const batchId = "unified-corrective-generation-g3-plan:build-113-fixture";
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
  expiresAt: "2026-10-23T22:00:00.000Z",
  fingerprint: packageFingerprint,
  operations
};

const matched: ConsumerStateVerificationResponse = {
  protocol: INTEGRATION_CONSUMER_PROTOCOL,
  kind: "state-verification",
  status: "accepted",
  code: "post-unified-corrective-generation-stable",
  target: "rosie-dazzlers",
  packageId,
  replayKey,
  fingerprint: packageFingerprint,
  verifiedAt: "2026-10-22T22:30:00.000Z",
  records: [{
    integrationKey: operations[0].integrationKey,
    status: "found",
    values: { priceMinimumCad: 249, packageName: "Complete" }
  }]
};

const stable = comparePostUnifiedCorrectiveGenerationReclosureConsumerState(
  integrationPackage,
  matched
);
assert(stable.status === "stable", "Build 113 exact post-reclosure read-back must be stable.");
assert(stable.matchedCount === 1, "Build 113 stable read-back must preserve package scope.");

const recurred = comparePostUnifiedCorrectiveGenerationReclosureConsumerState(
  integrationPackage,
  {
    ...matched,
    code: "post-unified-corrective-generation-recurred",
    records: [{
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 299, packageName: "Complete" }
    }]
  }
);
assert(recurred.status === "recurred", "Build 113 drift must become recurrence evidence.");
assert(recurred.mismatchedCount === 1, "Build 113 recurrence must preserve mismatched count.");
assert(
  recurred.recordResults[0].differingFields.includes("priceMinimumCad"),
  "Build 113 recurrence must preserve the changed governed field."
);

const recurrenceInput = {
  reclosureId: "reclosure-g3",
  regressionCheckId: "check-g3",
  caseId: "case-053",
  successorSourceId: "successor-g3",
  generationNumber: 3,
  reclosureFingerprint: "reclosure-fingerprint-g3",
  regressionFingerprint: recurred.verificationFingerprint,
  recurrenceReason: "Verified drift returned after Build 112 re-closure."
};
const recurrenceOne = unifiedCorrectiveGenerationRecurrenceFingerprint(recurrenceInput);
const recurrenceTwo = unifiedCorrectiveGenerationRecurrenceFingerprint(recurrenceInput);
const changed = unifiedCorrectiveGenerationRecurrenceFingerprint({
  ...recurrenceInput,
  recurrenceReason: "Different governed rationale."
});
assert(recurrenceOne === recurrenceTwo, "Build 113 recurrence fingerprint must be deterministic.");
assert(recurrenceOne !== changed, "Build 113 recurrence fingerprint must bind the rationale.");
assert(
  recurrenceOne.startsWith("unified-corrective-generation-recurrence1-"),
  "Build 113 recurrence fingerprint must be versioned."
);

const registryFingerprint = correctiveGenerationLineageFingerprint({
  generationNumber: 3,
  predecessorRegistryFingerprint: "registry-g2",
  sourceRecurrenceFingerprint: "source-recurrence-g3",
  planFingerprint: "plan-g3",
  packageFingerprint,
  reclosureFingerprint: "reclosure-fingerprint-g3",
  terminalRecurrenceFingerprint: recurrenceOne
});
const successorFingerprint = correctiveGenerationSuccessorFingerprint({
  generationNumber: 4,
  predecessorRegistryFingerprint: registryFingerprint,
  sourceRecurrenceFingerprint: recurrenceOne,
  sourceRegressionFingerprint: recurred.verificationFingerprint
});
assert(
  registryFingerprint.startsWith("corrective-generation-lineage1-"),
  "Build 113 must use the Build 109 lineage fingerprint contract."
);
assert(
  successorFingerprint.startsWith("corrective-generation-successor1-"),
  "Build 113 must use the Build 109 successor fingerprint contract."
);

const errorInput = {
  reclosureId: "reclosure-g3",
  unifiedPackageId: packageId,
  unifiedReplayKey: replayKey,
  unifiedPackageFingerprint: packageFingerprint,
  status: "transport-error" as const,
  validationCode: "fixture-error",
  occurredAt: "2026-10-22T22:31:00.000Z"
};
assert(
  postUnifiedCorrectiveGenerationReclosureErrorFingerprint(errorInput) ===
    postUnifiedCorrectiveGenerationReclosureErrorFingerprint(errorInput),
  "Build 113 transport-error fingerprints must be deterministic."
);
assert(
  unifiedCorrectiveGenerationRecurrenceConfirmation("devil-n-dove") ===
    "REOPEN UNIFIED-CORRECTIVE-GENERATION RECURRENT DEVIL-N-DOVE EXCEPTION",
  "Build 113 typed recurrence confirmation changed unexpectedly."
);

console.log("Build 113 post-unified corrective-generation recurrence verification passed.");
