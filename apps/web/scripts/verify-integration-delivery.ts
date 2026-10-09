import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  buildIntegrationPackageFromPersistedBatch,
  validateConsumerAcknowledgement,
  validateConsumerHandshake,
  validateIntegrationPackage
} from "../lib/integration-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date("2026-10-09T13:00:00.000Z");
const payload = {
  batches: [
    {
      id: "integration-batch-build033",
      target: "rosie-dazzlers",
      status: "approved",
      approvedAt: "2026-10-09T12:00:00.000Z",
      sourceDatasetUpdatedAt: "2026-10-09T11:00:00.000Z",
      diffs: [
        {
          action: "create",
          integrationKey: "rosie-competitor::build033",
          payload: {
            competitorBusinessName: "Build 033 Fixture",
            offeringName: "Test package",
            priceMinimumCad: 199,
            sourceUrl: "https://example.com/service",
            retrievedAt: "2026-10-09T11:00:00.000Z"
          },
          sourceEvidence: {
            sourceUrl: "https://example.com/service",
            retrievedAt: "2026-10-09T11:00:00.000Z"
          }
        }
      ]
    }
  ]
};

const integrationPackage = buildIntegrationPackageFromPersistedBatch(payload, {
  target: "rosie-dazzlers",
  batchId: "integration-batch-build033",
  now
});

const valid = validateIntegrationPackage(integrationPackage, {
  now,
  expectedTarget: "rosie-dazzlers"
});
assert(valid.valid && valid.code === "valid", "Valid Build 033 package was rejected.");

const replay = validateIntegrationPackage(integrationPackage, {
  now,
  expectedTarget: "rosie-dazzlers",
  seenPackageIds: new Set([integrationPackage.packageId])
});
assert(!replay.valid && replay.code === "duplicate", "Replay package was not rejected.");

const wrongContract = validateIntegrationPackage(
  { ...integrationPackage, adapterContract: "wrong.contract.v1" },
  { now, expectedTarget: "rosie-dazzlers" }
);
assert(
  !wrongContract.valid && wrongContract.code === "wrong-contract",
  "Wrong-contract package was not rejected."
);

const wrongTarget = validateIntegrationPackage(integrationPackage, {
  now,
  expectedTarget: "devil-n-dove"
});
assert(
  !wrongTarget.valid && wrongTarget.code === "wrong-target",
  "Wrong-target package was not rejected."
);

const stalePayload = {
  batches: [
    {
      ...payload.batches[0],
      sourceDatasetUpdatedAt: "2026-08-01T00:00:00.000Z"
    }
  ]
};
const stalePackage = buildIntegrationPackageFromPersistedBatch(stalePayload, {
  target: "rosie-dazzlers",
  batchId: "integration-batch-build033",
  now: new Date("2026-08-02T00:00:00.000Z")
});
const stale = validateIntegrationPackage(stalePackage, {
  now,
  expectedTarget: "rosie-dazzlers"
});
assert(!stale.valid && stale.code === "stale", "Stale package was not rejected.");

const handshake = validateConsumerHandshake(
  {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    target: "rosie-dazzlers",
    contractVersion: 1,
    schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
    authentication: "bearer",
    dryRunSupported: true,
    liveMutationEnabled: false
  },
  "rosie-dazzlers"
);
assert(handshake.dryRunSupported, "Consumer handshake did not preserve dry-run support.");

const acknowledgement = validateConsumerAcknowledgement(
  {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    status: "accepted",
    code: "valid",
    target: integrationPackage.target,
    packageId: integrationPackage.packageId,
    replayKey: integrationPackage.replayKey,
    fingerprint: integrationPackage.fingerprint,
    receivedAt: now.toISOString(),
    dryRun: true
  },
  integrationPackage
);
assert(
  acknowledgement.status === "accepted" && acknowledgement.dryRun,
  "Consumer acknowledgement validation failed."
);

console.log(
  "Build 033 consumer handshake, valid acceptance, replay/stale/wrong-contract/wrong-target rejection and dry-run acknowledgement verification passed."
);
