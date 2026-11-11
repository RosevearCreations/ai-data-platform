import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_367_MASTER_SNAPSHOT,
  BUILD_367_SOURCE_SNAPSHOT,
  build367MasterGate,
  composeBuild367OwnerReview
} from "../lib/source-owner-review";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const now = new Date("2026-11-11T13:20:00.000Z");
const current = composeBuild367OwnerReview({ now });

assert.equal(current.build, 367);
assert.equal(current.master.snapshot.aiHub.receipt, "MASTER360-AIHUB-307-ACK");
assert.equal(current.master.snapshot.comms.receipt, "MASTER360-COMMS-QL415-ACK");
assert.equal(current.master.snapshot.aiHub.main, "34e017dcf0586a7281d8726d5e8fb4a4a7054526");
assert.equal(current.master.snapshot.comms.main, "8c2d488582801e8abc5ca718b4719c615863274c");
assert.equal(current.summary.masterGateOpen, false);
assert.ok(current.master.blockers.length > 0);

const yw = current.sources.find((item) => item.sourceId === "yw");
const icamp = current.sources.find((item) => item.sourceId === "icamp");
assert.ok(yw);
assert.ok(icamp);
assert.equal(yw.productionMain, "0010bbd5ae71cb025d77e613cce9bc6e3f064d34");
assert.equal(yw.sourceRevisionState, "VERIFIED_CURRENT");
assert.equal(icamp.productionMain, "7408a66dfa2c70e1de6b358356b7f9e9dc6cb13b");
assert.equal(icamp.manifestRevision, "e2d343595363ca9106e7f1dbc60006e3a6c616aa");
assert.equal(icamp.sourceRevisionState, "HOLD_MANIFEST_STALE");
assert.equal(yw.signerState, "HOLD_UNENROLLED");
assert.equal(icamp.signerState, "HOLD_UNENROLLED");
assert.equal(yw.receiptState, "HOLD_NOT_RECEIVED");
assert.equal(icamp.receiptState, "HOLD_NOT_RECEIVED");
assert.equal(yw.packetState, "HOLD");
assert.equal(icamp.packetState, "HOLD");
assert.equal(current.summary.readyForOwnerDecision, 0);
assert.equal(current.summary.closureState, "HOLD");
assert.equal(current.policy.repositoryGreenIsRuntimeProof, false);
assert.equal(current.policy.masterAckHoldMayBeAutoReleased, false);
assert.equal(current.policy.sourcePrivateKeysAccepted, false);
assert.equal(current.policy.controllerMayAutoAccept, false);

const masterReady = {
  ...BUILD_367_MASTER_SNAPSHOT,
  aiHub: {
    ...BUILD_367_MASTER_SNAPSHOT.aiHub,
    installedRelease: "VERIFIED",
    durableMonitoring: "VERIFIED",
    sourceCommsChain: "VERIFIED",
    aiDataReceipt: "VERIFIED",
    commsAck: "VERIFIED"
  },
  comms: {
    ...BUILD_367_MASTER_SNAPSHOT.comms,
    runtimeTelemetry: "VERIFIED",
    installedRelease: "VERIFIED",
    signerCustody: "VERIFIED",
    receiverSignedAck: "VERIFIED",
    durableReplay: "VERIFIED",
    uptime: "VERIFIED",
    ownerDecision: "ACCEPTED"
  }
};
assert.equal(build367MasterGate(masterReady).gateOpen, true);

const correctedSources = BUILD_367_SOURCE_SNAPSHOT.map((item) =>
  item.sourceId === "icamp"
    ? { ...item, manifestRevision: item.productionMain }
    : { ...item }
);

const signerEvents = correctedSources.map((item, index) => ({
  eventId: "signer-" + item.sourceId,
  sourceId: item.sourceId,
  eventType: "ENROLLED" as const,
  keyId: item.sourceId + "-key-367",
  publicKeySpkiSha256: "sha256:" + String(index + 1).repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:" + item.sourceId + "-custody",
  independentlyVerifiedAt: "2026-11-11T13:10:00.000Z",
  recordedAt: "2026-11-11T13:10:01.000Z"
}));
const receipts = correctedSources.map((item, index) => ({
  receiptId: "receipt-" + item.sourceId,
  sourceId: item.sourceId,
  keyId: item.sourceId + "-key-367",
  sourceRevision: item.productionMain,
  manifestRevision: item.productionMain,
  receiptSha256: String(index + 2).repeat(64),
  nonce: item.sourceId + "-nonce-367",
  issuedAt: "2026-11-11T13:15:00.000Z",
  healthObservedAt: "2026-11-11T13:15:10.000Z",
  healthState: "HEALTHY" as const,
  sourceRuntime: item.sourceId + "-production",
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt: "2026-11-11T13:15:20.000Z"
}));
const admissions = receipts.map((receipt) => ({
  admissionEventId: "admit-" + receipt.sourceId,
  sourceId: receipt.sourceId,
  keyId: receipt.keyId,
  receiptSha256: receipt.receiptSha256,
  sourceRevision: receipt.sourceRevision,
  outcome: "ADMITTED" as const,
  receiptId: receipt.receiptId,
  blockers: [],
  recordedAt: "2026-11-11T13:15:21.000Z"
}));

const ready = composeBuild367OwnerReview({
  signerEvents,
  receipts,
  admissionEvents: admissions,
  sourceSnapshot: correctedSources,
  masterSnapshot: masterReady,
  now
});
assert.equal(ready.summary.masterGateOpen, true);
assert.equal(ready.summary.readyForOwnerDecision, 2);
assert.equal(ready.sources[0].packetState, "READY_FOR_OWNER_DECISION");
assert.equal(ready.sources[1].packetState, "READY_FOR_OWNER_DECISION");
assert.equal(ready.sources[0].explicitAcceptanceEligible, true);
assert.equal(ready.sources[1].explicitAcceptanceEligible, true);

const migration = source("../../db/migrations/0131_master_source_owner_review_acceptance.sql");
for (const token of [
  "master_source_owner_review_packets",
  "master_source_acceptance_decision_events",
  "READY_FOR_OWNER_DECISION",
  "decision in ('HOLD','ACCEPT','REJECT')",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.toLowerCase().includes("private_key"));

const database = source("lib/source-owner-review-database.ts");
for (const token of [
  "prepareBuild367OwnerReviewPacket",
  "recordBuild367ExplicitDecision",
  "build367_acceptance_gate_hold",
  "master_source_owner_review_packets",
  "master_source_acceptance_decision_events",
  "master_owner_decision_audit"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("private_key"));

const api = source("app/api/source-owner-review/route.ts");
assert.ok(api.includes("prepare-review-packet"));
assert.ok(api.includes("record-explicit-decision"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/source-owner-review/page.tsx");
for (const token of [
  "Build 367 · Owner acceptance gate",
  "Latest Master acknowledgements remain HOLD.",
  "iCamp Build 242 changed the current production revision.",
  "Explicit decision boundary"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/source-owner-review"'));
const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/source-owner-review"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_source_owner_review_packets"',
  '"master_source_acceptance_decision_events"',
  '"0131_master_source_owner_review_acceptance.sql"'
]) {
  assert.ok(dbSpine.includes(token), "db spine token " + token);
}

const pkg = JSON.parse(source("package.json"));
const command = "tsx scripts/verify-build-367-source-owner-review-acceptance.ts";
assert.equal(String(pkg.scripts["verify:build367"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 367 Verified Source Signer Evidence Reception, Signed Health Admission Reconciliation, Master-Gate Owner Review Packet & Explicit Acceptance Decision verification passed."
);
