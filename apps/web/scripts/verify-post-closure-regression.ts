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
  comparePostClosureConsumerState,
  postClosureRegressionErrorFingerprint,
  postClosureReopenConfirmation,
  postClosureReopenFingerprint
} from "../lib/post-closure-regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const target = "rosie-dazzlers" as const;
const contract = INTEGRATION_CONTRACTS[target];
const approvedAt = "2026-10-13T13:00:00.000Z";
const sourceUpdatedAt = "2026-10-13T12:55:00.000Z";
const operations = [
  {
    action: "update" as const,
    integrationKey: "rosie-competitor::build-056-alpha",
    values: { priceMinimumCad: 249 },
    sourceEvidence: {
      sourceUrl: "https://example.test/build-056/alpha",
      retrievedAt: sourceUpdatedAt
    }
  }
];
const packageFingerprint = integrationFingerprint({
  target,
  adapterContract: contract.adapterContract,
  contractVersion: 1,
  batchId: "corrective-plan:build-056",
  approvedAt,
  sourceDatasetUpdatedAt: sourceUpdatedAt,
  operations
});
const packageId = integrationPackageId({
  target,
  batchId: "corrective-plan:build-056",
  approvedAt,
  fingerprint: packageFingerprint
});
const replayKey = integrationReplayKey({
  target,
  packageId,
  fingerprint: packageFingerprint
});
const correctivePackage: IntegrationPackageV1 = {
  version: 1,
  schemaId: contract.schemaId,
  target,
  adapterContract: contract.adapterContract,
  contractVersion: 1,
  packageId,
  replayKey,
  batchId: "corrective-plan:build-056",
  approvedAt,
  sourceDatasetUpdatedAt: sourceUpdatedAt,
  generatedAt: approvedAt,
  expiresAt: "2026-10-14T13:00:00.000Z",
  fingerprint: packageFingerprint,
  operations
};

const stableResponse: ConsumerStateVerificationResponse = {
  protocol: INTEGRATION_CONSUMER_PROTOCOL,
  kind: "state-verification",
  status: "accepted",
  code: "stable",
  target,
  packageId,
  replayKey,
  fingerprint: packageFingerprint,
  verifiedAt: "2026-10-13T13:05:00.000Z",
  records: [
    {
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 249 }
    }
  ]
};
const stable = comparePostClosureConsumerState(correctivePackage, stableResponse);
assert(
  stable.status === "stable" &&
    stable.matchedCount === 1 &&
    stable.mismatchedCount === 0,
  "Build 056 exact post-closure read-back must remain stable."
);

const regressedResponse: ConsumerStateVerificationResponse = {
  ...stableResponse,
  code: "regressed",
  verifiedAt: "2026-10-13T13:06:00.000Z",
  records: [
    {
      integrationKey: operations[0].integrationKey,
      status: "found",
      values: { priceMinimumCad: 999 }
    }
  ]
};
const regressed = comparePostClosureConsumerState(
  correctivePackage,
  regressedResponse
);
assert(
  regressed.status === "regressed" &&
    regressed.mismatchedCount === 1 &&
    regressed.recordResults[0]?.differingFields.join(",") === "priceMinimumCad",
  "Build 056 must identify exact governed regression fields."
);

assert(
  postClosureReopenConfirmation(target) ===
    "REOPEN REGRESSED ROSIE-DAZZLERS EXCEPTION",
  "Build 056 reopen confirmation phrase changed unexpectedly."
);

const reopenInput = {
  closureId: "11111111-1111-4111-8111-111111111111",
  regressionCheckId: "22222222-2222-4222-8222-222222222222",
  caseId: "33333333-3333-4333-8333-333333333333",
  closureFingerprint: "corrective-closure1-build-056",
  regressionFingerprint: regressed.verificationFingerprint,
  reopenReason: "Latest independent read-back proves governed state regressed."
};
const reopenA = postClosureReopenFingerprint(reopenInput);
const reopenB = postClosureReopenFingerprint({ ...reopenInput });
assert(
  reopenA === reopenB && reopenA.startsWith("exception-reopen1-"),
  "Build 056 reopen fingerprint must be deterministic."
);
assert(
  postClosureReopenFingerprint({
    ...reopenInput,
    reopenReason: "Different governed reopen reason."
  }) !== reopenA,
  "Build 056 reopen fingerprint must bind the operator reason."
);

const errorA = postClosureRegressionErrorFingerprint({
  closureId: reopenInput.closureId,
  correctivePackageId: correctivePackage.packageId,
  correctiveReplayKey: correctivePackage.replayKey,
  correctivePackageFingerprint: correctivePackage.fingerprint,
  status: "transport-error",
  validationCode: "timeout",
  occurredAt: "2026-10-13T13:07:00.000Z"
});
const errorB = postClosureRegressionErrorFingerprint({
  closureId: reopenInput.closureId,
  correctivePackageId: correctivePackage.packageId,
  correctiveReplayKey: correctivePackage.replayKey,
  correctivePackageFingerprint: correctivePackage.fingerprint,
  status: "transport-error",
  validationCode: "timeout",
  occurredAt: "2026-10-13T13:07:00.000Z"
});
assert(
  errorA === errorB && errorA.startsWith("post-closure-verify1-"),
  "Build 056 regression error fingerprint must be deterministic."
);

console.log(
  "Build 056 stable/regressed comparison, exact differing fields, confirmation and deterministic reopen evidence passed."
);
