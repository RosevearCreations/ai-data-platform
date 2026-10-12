import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  type IntegrationPackageV1,
  validateConsumerStateVerification,
  validateStateVerificationConsumerHandshake
} from "../lib/integration-delivery";
import { compareConsumerState } from "../lib/post-delivery-reconciliation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const pkg: IntegrationPackageV1 = {
  version: 1,
  schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
  target: "rosie-dazzlers",
  adapterContract: INTEGRATION_CONTRACTS["rosie-dazzlers"].adapterContract,
  contractVersion: 1,
  packageId: "integration-package-build-052",
  replayKey: "rosie-dazzlers::integration-package-build-052::abc12345",
  batchId: "build-052",
  approvedAt: "2026-10-12T12:00:00.000Z",
  sourceDatasetUpdatedAt: "2026-10-12T12:00:00.000Z",
  generatedAt: "2026-10-12T12:05:00.000Z",
  expiresAt: "2026-10-13T12:05:00.000Z",
  fingerprint: "abc12345",
  operations: [
    {
      action: "create",
      integrationKey: "rosie-competitor::alpha",
      values: {
        competitorBusinessName: "Alpha Detail",
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
      integrationKey: "rosie-competitor::beta",
      values: {
        competitorBusinessName: "Beta Detail",
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

const handshake = validateStateVerificationConsumerHandshake(
  {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    target: "rosie-dazzlers",
    contractVersion: 1,
    schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
    authentication: "bearer",
    dryRunSupported: true,
    liveMutationEnabled: true,
    stateVerificationSupported: true
  },
  "rosie-dazzlers"
);
assert(
  handshake.stateVerificationSupported === true,
  "Build 052 state-verification capability was not accepted."
);

let blocked = false;
try {
  validateStateVerificationConsumerHandshake(
    {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      target: "rosie-dazzlers",
      contractVersion: 1,
      schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
      authentication: "bearer",
      dryRunSupported: true,
      liveMutationEnabled: true
    },
    "rosie-dazzlers"
  );
} catch {
  blocked = true;
}
assert(blocked, "Build 052 accepted a consumer without state verification capability.");

const matchedResponse = validateConsumerStateVerification(
  {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "state-verification",
    status: "accepted",
    code: "verified",
    target: "rosie-dazzlers",
    packageId: pkg.packageId,
    replayKey: pkg.replayKey,
    fingerprint: pkg.fingerprint,
    verifiedAt: "2026-10-12T12:10:00.000Z",
    records: [
      {
        integrationKey: "rosie-competitor::alpha",
        status: "found",
        values: {
          competitorBusinessName: "Alpha Detail",
          offeringName: "Complete",
          priceMinimumCad: 199,
          consumerManagedField: "ignored"
        }
      },
      {
        integrationKey: "rosie-competitor::beta",
        status: "found",
        values: {
          competitorBusinessName: "Beta Detail",
          offeringName: "Interior",
          priceMinimumCad: 175
        }
      }
    ]
  },
  pkg
);
const matched = compareConsumerState(pkg, matchedResponse);
assert(
  matched.status === "matched" &&
    matched.matchedCount === 2 &&
    matched.mismatchedCount === 0 &&
    matched.missingCount === 0,
  "Build 052 exact consumer state did not reconcile as matched."
);

const driftResponse = validateConsumerStateVerification(
  {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "state-verification",
    status: "accepted",
    code: "verified",
    target: "rosie-dazzlers",
    packageId: pkg.packageId,
    replayKey: pkg.replayKey,
    fingerprint: pkg.fingerprint,
    verifiedAt: "2026-10-12T12:15:00.000Z",
    records: [
      {
        integrationKey: "rosie-competitor::alpha",
        status: "found",
        values: {
          competitorBusinessName: "Alpha Detail",
          offeringName: "Complete",
          priceMinimumCad: 229
        }
      },
      {
        integrationKey: "rosie-competitor::beta",
        status: "missing",
        values: {}
      }
    ]
  },
  pkg
);
const drift = compareConsumerState(pkg, driftResponse);
assert(
  drift.status === "drift" &&
    drift.matchedCount === 0 &&
    drift.mismatchedCount === 1 &&
    drift.missingCount === 1,
  "Build 052 mismatch/missing state did not reconcile as drift."
);
const alpha = drift.recordResults.find(
  (record) => record.integrationKey === "rosie-competitor::alpha"
);
assert(
  alpha?.status === "mismatched" &&
    alpha.differingFields.length === 1 &&
    alpha.differingFields[0] === "priceMinimumCad",
  "Build 052 did not isolate the mismatched governed field."
);

blocked = false;
try {
  validateConsumerStateVerification(
    {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "state-verification",
      status: "accepted",
      code: "verified",
      target: "rosie-dazzlers",
      packageId: pkg.packageId,
      replayKey: pkg.replayKey,
      fingerprint: pkg.fingerprint,
      verifiedAt: "2026-10-12T12:20:00.000Z",
      records: [
        {
          integrationKey: "rosie-competitor::alpha",
          status: "found",
          values: {
            competitorBusinessName: "Alpha Detail",
            offeringName: "Complete",
            priceMinimumCad: 199
          }
        }
      ]
    },
    pkg
  );
} catch {
  blocked = true;
}
assert(blocked, "Build 052 accepted an incomplete consumer verification response.");

blocked = false;
try {
  validateConsumerStateVerification(
    {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "state-verification",
      status: "accepted",
      code: "verified",
      target: "rosie-dazzlers",
      packageId: pkg.packageId,
      replayKey: pkg.replayKey,
      fingerprint: pkg.fingerprint,
      verifiedAt: "2026-10-12T12:20:00.000Z",
      records: [
        {
          integrationKey: "rosie-competitor::alpha",
          status: "found",
          values: {}
        },
        {
          integrationKey: "rosie-competitor::alpha",
          status: "found",
          values: {}
        }
      ]
    },
    pkg
  );
} catch {
  blocked = true;
}
assert(blocked, "Build 052 accepted duplicate verification keys.");

console.log(
  "Build 052 state-verification capability, response completeness, matched/drift comparison and field-level discrepancy verification passed."
);
