import type { IntegrationPackageV1 } from "../lib/integration-delivery";
import {
  buildCorrectivePlanScope,
  correctivePlanFingerprint
} from "../lib/reconciliation-exception-triage";
import type { ReconciliationRecordResult } from "../lib/post-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const pkg: IntegrationPackageV1 = {
  version: 1,
  schemaId: "rosevear.ai-data.integration.rosie-dazzlers.v1",
  target: "rosie-dazzlers",
  adapterContract: "rosie-dazzlers-v1",
  contractVersion: 1,
  packageId: "pkg-build-053",
  replayKey: "replay-build-053",
  batchId: "batch-build-053",
  approvedAt: "2026-10-12T12:00:00.000Z",
  sourceDatasetUpdatedAt: "2026-10-12T12:00:00.000Z",
  generatedAt: "2026-10-12T12:05:00.000Z",
  expiresAt: "2026-10-13T12:05:00.000Z",
  fingerprint: "fingerprint-build-053",
  operations: [
    {
      action: "create",
      integrationKey: "alpha",
      values: {
        competitorBusinessName: "Alpha",
        offeringName: "Complete",
        priceMinimumCad: 199
      },
      sourceEvidence: {
        sourceUrl: "https://example.test/alpha",
        retrievedAt: "2026-10-12T11:55:00.000Z"
      }
    },
    {
      action: "update",
      integrationKey: "beta",
      values: {
        competitorBusinessName: "Beta",
        offeringName: "Interior",
        priceMinimumCad: 175
      },
      sourceEvidence: {
        sourceUrl: "https://example.test/beta",
        retrievedAt: "2026-10-12T11:56:00.000Z"
      }
    }
  ]
};

const results: ReconciliationRecordResult[] = [
  {
    integrationKey: "alpha",
    status: "mismatched",
    expectedFingerprint: "expected-alpha",
    observedFingerprint: "observed-alpha",
    differingFields: ["priceMinimumCad"]
  },
  {
    integrationKey: "beta",
    status: "missing",
    expectedFingerprint: "expected-beta",
    observedFingerprint: null,
    differingFields: ["competitorBusinessName","offeringName","priceMinimumCad"]
  }
];

const scope = buildCorrectivePlanScope(pkg, results);
assert(scope.length === 2, "Build 053 did not scope every drift record.");
const alpha = scope.find((item) => item.integrationKey === "alpha");
const beta = scope.find((item) => item.integrationKey === "beta");
assert(
  alpha?.proposedAction === "update-existing" &&
    Object.keys(alpha.desiredValues).length === 1 &&
    alpha.desiredValues.priceMinimumCad === 199,
  "Build 053 mismatch plan must include only the governed differing field."
);
assert(
  beta?.proposedAction === "manual-review" &&
    Object.keys(beta.desiredValues).length === 3,
  "Build 053 missing record from an original update must remain manual-review."
);

const fingerprintA = correctivePlanFingerprint({
  reconciliationFingerprint: "verify1-test",
  packageId: pkg.packageId,
  replayKey: pkg.replayKey,
  packageFingerprint: pkg.fingerprint,
  correctionScope: scope,
  rationale: "Restore governed state after reviewed consumer drift."
});
const fingerprintB = correctivePlanFingerprint({
  rationale: "Restore governed state after reviewed consumer drift.",
  correctionScope: [...scope].reverse().reverse(),
  packageFingerprint: pkg.fingerprint,
  replayKey: pkg.replayKey,
  packageId: pkg.packageId,
  reconciliationFingerprint: "verify1-test"
});
assert(
  fingerprintA === fingerprintB && fingerprintA.startsWith("plan1-"),
  "Build 053 corrective plan fingerprint must be canonical."
);

let blocked = false;
try {
  buildCorrectivePlanScope(pkg, [
    {
      integrationKey: "unknown",
      status: "mismatched",
      expectedFingerprint: "x",
      observedFingerprint: "y",
      differingFields: ["priceMinimumCad"]
    }
  ]);
} catch {
  blocked = true;
}
assert(blocked, "Build 053 accepted a corrective scope key outside the delivered package.");

console.log(
  "Build 053 corrective scope, safe missing-record planning and canonical plan fingerprint verification passed."
);
