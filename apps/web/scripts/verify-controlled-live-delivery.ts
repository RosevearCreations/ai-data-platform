import {
  consumerLiveActivationFingerprint,
  liveActivationConfirmation,
  liveDeliveryConfirmation
} from "../lib/controlled-live-delivery";
import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  validateLiveConsumerHandshake
} from "../lib/integration-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const handshake = validateLiveConsumerHandshake(
  {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    target: "rosie-dazzlers",
    contractVersion: 1,
    schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
    authentication: "bearer",
    dryRunSupported: true,
    liveMutationEnabled: true,
    idempotency: {
      keySource: "replayKey",
      duplicateBehavior: "return-original-ack"
    }
  },
  "rosie-dazzlers"
);

assert(handshake.liveMutationEnabled === true, "Build 051 live capability was not accepted.");
assert(
  handshake.idempotency.keySource === "replayKey" &&
    handshake.idempotency.duplicateBehavior === "return-original-ack",
  "Build 051 idempotency capability was not preserved."
);

let blocked = false;
try {
  validateLiveConsumerHandshake(
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
assert(blocked, "Build 051 accepted live mutation without consumer idempotency.");

blocked = false;
try {
  validateLiveConsumerHandshake(
    {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      target: "rosie-dazzlers",
      contractVersion: 1,
      schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
      authentication: "bearer",
      dryRunSupported: true,
      liveMutationEnabled: false,
      idempotency: {
        keySource: "replayKey",
        duplicateBehavior: "return-original-ack"
      }
    },
    "rosie-dazzlers"
  );
} catch {
  blocked = true;
}
assert(blocked, "Build 051 accepted a consumer with live mutation disabled.");

assert(
  liveActivationConfirmation("rosie-dazzlers") ===
    "ACTIVATE ROSIE-DAZZLERS LIVE",
  "Build 051 activation phrase changed."
);
assert(
  liveDeliveryConfirmation("devil-n-dove") ===
    "DELIVER DEVIL-N-DOVE LIVE",
  "Build 051 delivery phrase changed."
);

const fingerprintA = consumerLiveActivationFingerprint({
  publicationFingerprint: "pub1-test",
  mappingFingerprint: "map1-test",
  target: "rosie-dazzlers",
  consumerId: "https://consumer.example.test",
  packageId: "package-1",
  replayKey: "rosie::package-1::fingerprint",
  packageFingerprint: "fingerprint",
  dryRunReceiptId: "receipt-1"
});
const fingerprintB = consumerLiveActivationFingerprint({
  dryRunReceiptId: "receipt-1",
  packageFingerprint: "fingerprint",
  replayKey: "rosie::package-1::fingerprint",
  packageId: "package-1",
  consumerId: "https://consumer.example.test",
  target: "rosie-dazzlers",
  mappingFingerprint: "map1-test",
  publicationFingerprint: "pub1-test"
});
assert(
  fingerprintA === fingerprintB && fingerprintA.startsWith("live1-"),
  "Build 051 activation fingerprint must be canonical."
);

console.log(
  "Build 051 live capability, idempotency requirement, confirmation and activation fingerprint verification passed."
);
