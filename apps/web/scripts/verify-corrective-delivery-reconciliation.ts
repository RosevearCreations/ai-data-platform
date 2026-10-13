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
  compareCorrectiveConsumerState,
  correctiveClosureConfirmation,
  correctiveClosureFingerprint,
  correctiveReconciliationErrorFingerprint
} from "../lib/corrective-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const target = "rosie-dazzlers" as const;
const contract = INTEGRATION_CONTRACTS[target];
const approvedAt = "2026-10-13T12:00:00.000Z";
const sourceUpdatedAt = "2026-10-13T11:55:00.000Z";
const operations = [
  {
    action: "update" as const,
    integrationKey: "rosie-competitor::build-055-alpha",
    values: { priceMinimumCad: 249 },
    sourceEvidence: {
      sourceUrl: "https://example.test/build-055/alpha",
      retrievedAt: sourceUpdatedAt
    }
  }
];
const fingerprint = integrationFingerprint({
  target,
  adapterContract: contract.adapterContract,
  contractVersion: 1,
  batchId: "corrective-plan:build-055",
  approvedAt,
  sourceDatasetUpdatedAt: sourceUpdatedAt,
  operations
});
const packageId = integrationPackageId({
  target,
  batchId: "corrective-plan:build-055",
  approvedAt,
  fingerprint
});
const replayKey = integrationReplayKey({ target, packageId, fingerprint });
const correctivePackage: IntegrationPackageV1 = {
  version: 1,
  schemaId: contract.schemaId,
  target,
  adapterContract: contract.adapterContract,
  contractVersion: 1,
  packageId,
  replayKey,
  batchId: "corrective-plan:build-055",
  approvedAt,
  sourceDatasetUpdatedAt: sourceUpdatedAt,
  generatedAt: approvedAt,
  expiresAt: "2026-10-14T12:00:00.000Z",
  fingerprint,
  operations
};

const matchedResponse: ConsumerStateVerificationResponse = {
  protocol: INTEGRATION_CONSUMER_PROTOCOL,
  kind: "state-verification",
  status: "accepted",
  code: "matched",
  target,
  packageId,
  replayKey,
  fingerprint,
  verifiedAt: "2026-10-13T12:05:00.000Z",
  records: [
    {
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 249 }
    }
  ]
};
const matched = compareCorrectiveConsumerState(correctivePackage, matchedResponse);
assert(
  matched.status === "matched" &&
    matched.matchedCount === 1 &&
    matched.mismatchedCount === 0 &&
    matched.missingCount === 0,
  "Build 055 exact corrective read-back must match."
);

const driftResponse: ConsumerStateVerificationResponse = {
  ...matchedResponse,
  code: "drift",
  verifiedAt: "2026-10-13T12:06:00.000Z",
  records: [
    {
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }
  ]
};
const drift = compareCorrectiveConsumerState(correctivePackage, driftResponse);
assert(
  drift.status === "drift" &&
    drift.mismatchedCount === 1 &&
    drift.recordResults[0]?.differingFields.join(",") === "priceMinimumCad",
  "Build 055 must identify the exact corrective field that still differs."
);

assert(
  correctiveClosureConfirmation(target) ===
    "CLOSE VERIFIED ROSIE-DAZZLERS EXCEPTION",
  "Build 055 closure confirmation phrase changed unexpectedly."
);

const closureInput = {
  caseId: "22222222-2222-4222-8222-222222222222",
  planId: "11111111-1111-4111-8111-111111111111",
  correctiveDeliveryId: "33333333-3333-4333-8333-333333333333",
  correctiveReconciliationId: "44444444-4444-4444-8444-444444444444",
  planFingerprint: "plan1-build-055",
  correctivePackageFingerprint: correctivePackage.fingerprint,
  verificationFingerprint: matched.verificationFingerprint,
  closureNote: "Latest corrective read-back matches the frozen scope."
};
const closureA = correctiveClosureFingerprint(closureInput);
const closureB = correctiveClosureFingerprint({ ...closureInput });
assert(
  closureA === closureB && closureA.startsWith("corrective-closure1-"),
  "Build 055 closure fingerprint must be deterministic."
);
assert(
  correctiveClosureFingerprint({
    ...closureInput,
    closureNote: "Different closure reason."
  }) !== closureA,
  "Build 055 closure fingerprint must bind the operator closure note."
);

const errorA = correctiveReconciliationErrorFingerprint({
  correctivePackageId: correctivePackage.packageId,
  correctiveReplayKey: correctivePackage.replayKey,
  correctivePackageFingerprint: correctivePackage.fingerprint,
  status: "transport-error",
  validationCode: "timeout",
  occurredAt: "2026-10-13T12:07:00.000Z"
});
const errorB = correctiveReconciliationErrorFingerprint({
  correctivePackageId: correctivePackage.packageId,
  correctiveReplayKey: correctivePackage.replayKey,
  correctivePackageFingerprint: correctivePackage.fingerprint,
  status: "transport-error",
  validationCode: "timeout",
  occurredAt: "2026-10-13T12:07:00.000Z"
});
assert(
  errorA === errorB && errorA.startsWith("corrective-verify1-"),
  "Build 055 verification error fingerprint must be deterministic."
);

console.log(
  "Build 055 corrective read-back comparison, exact drift field evidence, closure confirmation and deterministic evidence fingerprints passed."
);
