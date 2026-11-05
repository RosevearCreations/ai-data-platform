import assert from "node:assert/strict";
import {
  QL337_COMMS_SCHEMA, prepareQl337CommsEvent, canonicalQl337CommsEvent,
  type Ql337PreparedInput
} from "../lib/ql337-comms-broker-contract";

const NOW = Date.parse("2026-11-05T13:00:00.000Z");
const good: Ql337PreparedInput = {
  routeState: "held", sourceShell: "yw", originApplicationId: "yard-workers",
  eventType: "case.handoff.requested", eventId: "evt_ql337CaseMessage001",
  traceId: "00000000-0000-4000-8000-000000000001",
  tenantId: "rosevear-landscaping", childId: "child-original",
  sourceReceiptSha256: "a".repeat(64), consentSha256: "b".repeat(64),
  payloadRef: "ref_case_review_001", nonce: "aaaaaaaaaaaaaaaaaaaaaa",
  issuedAt: "2026-11-05T12:59:00.000Z", expiresAt: "2026-11-05T13:03:00.000Z",
  proof: {
    originalSourceReceiptVerified: true, workspaceOwnerTestAuthorized: true,
    sourceOwnerTestAuthorized: true, childIsolationVerified: true,
    consentEvidenceVerified: true, independentBrokerWorkloadVerified: true
  }
};

const valid = prepareQl337CommsEvent(good, NOW);
assert.equal(valid.status, "UNSIGNED_TEST_ENVELOPE_ONLY");
assert.equal(valid.outboundDeliveryEnabled, false);
if (valid.status !== "UNSIGNED_TEST_ENVELOPE_ONLY") throw new Error("missing_broker_contract");
assert.equal(valid.envelope.schemaVersion, QL337_COMMS_SCHEMA);
assert.equal(valid.envelope.destinationApplicationId, "rosevear-comms-hub");
assert.equal(valid.envelope.audience, "rosevear-comms-hub:nonproduction");
assert.equal(valid.envelope.environment, "TEST");
assert.equal(valid.envelopeSha256.length, 64);
assert.ok(!canonicalQl337CommsEvent(valid.envelope).includes("customer"));
assert.ok(!("data" in valid.envelope));
assert.ok(!("body" in valid.envelope));

const denied = (patch: Partial<Ql337PreparedInput>, status: string) => {
  const r = prepareQl337CommsEvent({ ...good, ...patch }, NOW);
  assert.equal(r.status, status);
  assert.equal(r.outboundDeliveryEnabled, false);
};
denied({ routeState: "pending" }, "HOLD_SOURCE_OR_OWNER_PROOF");
denied({ proof: { ...good.proof, sourceOwnerTestAuthorized: false } }, "HOLD_SOURCE_OR_OWNER_PROOF");
denied({ proof: { ...good.proof, consentEvidenceVerified: false } }, "HOLD_SOURCE_OR_OWNER_PROOF");
denied({ sourceShell: "devilndove", originApplicationId: "yard-workers" }, "DENY_SCHEMA_OR_SCOPE");
denied({ childId: "../other-child" }, "DENY_SCHEMA_OR_SCOPE");
denied({ tenantId: "other tenant" }, "DENY_SCHEMA_OR_SCOPE");
denied({ eventType: "phone.send" as Ql337PreparedInput["eventType"] }, "DENY_SCHEMA_OR_SCOPE");
denied({ sourceReceiptSha256: "0".repeat(63) }, "DENY_SCHEMA_OR_SCOPE");
denied({ expiresAt: "2026-11-05T12:59:59.000Z" }, "HOLD_EXPIRED_OR_FUTURE");
denied({ issuedAt: "2026-11-05T13:05:00.000Z" }, "HOLD_EXPIRED_OR_FUTURE");
denied({ expiresAt: "2026-11-05T13:15:00.000Z" }, "HOLD_EXPIRED_OR_FUTURE");

console.log("QL337_BROKER_COMMS_CONTRACT=PASS");
console.log("ENVELOPE_SHA256=" + valid.envelopeSha256);
console.log("DELIVERIES=0 LIVE_COMMUNICATIONS=0 SOURCE_WRITES=0");
