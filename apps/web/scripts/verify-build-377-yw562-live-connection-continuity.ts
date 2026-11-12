import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_377,
  BUILD_377_CONTROLLER_BASE_REVISION,
  BUILD_377_MASTER_RUNTIME,
  BUILD_377_SOURCE_RUNTIME,
  composeBuild377YwLiveConnectionContinuity,
  type Build377LiveConnectionExecutionEvent,
  type Build377MasterRuntimeEvidence,
  type Build377SyncActivationEvent
} from "../lib/yw562-live-trusted-connection-continuity";
import type { Build376ConnectionRegistryEvidence } from "../lib/yw561-independent-connection-three-master-sync";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");
const now = new Date("2026-11-12T05:20:00.000Z");

const current = composeBuild377YwLiveConnectionContinuity({ now });
assert.equal(BUILD_377, 377);
assert.equal(
  BUILD_377_CONTROLLER_BASE_REVISION,
  "b1273edf4b2b38b5ca68371d9b171a1391d6f2f6"
);
assert.equal(
  BUILD_377_SOURCE_RUNTIME.previousMain,
  "3ac1bbce127a011af7830ad88da020112d132122"
);
assert.equal(
  BUILD_377_SOURCE_RUNTIME.currentMain,
  "6e0b77eebcfc77aa7fc48dcc398da958af8df696"
);
assert.equal(BUILD_377_MASTER_RUNTIME.aiHub.build, 311);
assert.equal(BUILD_377_MASTER_RUNTIME.comms.build, "QL-421");
assert.equal(
  current.sourceRevisionTransitionState,
  "ADVANCED_TO_YW562_REVALIDATION_REQUIRED"
);
assert.equal(current.exactReceiptState, "HOLD_NO_CURRENT_RECEIPT");
assert.equal(
  current.acceptanceRevalidationState,
  "HOLD_RECEIPT_NOT_ACTIVE"
);
assert.equal(
  current.connectionCandidateState,
  "HOLD_NO_CONNECTION_EVIDENCE"
);
assert.equal(
  current.liveConnectionIntakeState,
  "HOLD_NO_CONNECTION_EVIDENCE"
);
assert.equal(
  current.currentMasterRuntimeState,
  "HOLD_NO_CURRENT_MASTER_EVIDENCE"
);
assert.equal(
  current.threeMasterSyncActivationState,
  "HOLD_CONNECTION_INTAKE"
);
assert.equal(current.postConnectionContinuityState, "HOLD_NOT_ACTIVATED");
assert.equal(current.connectionState, "DISCONNECTED_HOLD");
assert.equal(current.mastersSynced, false);

const signerEvents = [{
  eventId: "11111111-1111-4111-8111-111111111111",
  sourceId: "yw" as const,
  eventType: "ENROLLED" as const,
  keyId: "yw562-health-377",
  publicKeySpkiSha256: "sha256:" + "a".repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:yw562:signer-custody-377",
  independentlyVerifiedAt: "2026-11-12T05:10:00.000Z",
  recordedAt: "2026-11-12T05:10:01.000Z"
}];

const receiptId = "22222222-2222-4222-8222-222222222222";
const receipts = [{
  receiptId,
  sourceId: "yw" as const,
  keyId: "yw562-health-377",
  sourceRevision: BUILD_377_SOURCE_RUNTIME.currentMain,
  manifestRevision: BUILD_377_SOURCE_RUNTIME.currentMain,
  receiptSha256: "b".repeat(64),
  nonce: "yw562-health-nonce-377",
  issuedAt: "2026-11-12T05:15:00.000Z",
  healthObservedAt: "2026-11-12T05:15:15.000Z",
  healthState: "HEALTHY" as const,
  sourceRuntime: "yw-production",
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt: "2026-11-12T05:15:20.000Z"
}];

const admissionEvents = [{
  admissionEventId: "33333333-3333-4333-8333-333333333333",
  sourceId: "yw" as const,
  keyId: "yw562-health-377",
  receiptSha256: "b".repeat(64),
  sourceRevision: BUILD_377_SOURCE_RUNTIME.currentMain,
  outcome: "ADMITTED" as const,
  receiptId,
  blockers: [],
  recordedAt: "2026-11-12T05:15:21.000Z"
}];

const replayEvents = [{
  replayEventId: "44444444-4444-4444-8444-444444444444",
  sourceProductionRevision: BUILD_377_SOURCE_RUNTIME.currentMain,
  manifestRevision: BUILD_377_SOURCE_RUNTIME.currentMain,
  receiptId,
  receiptSha256: "b".repeat(64),
  nonceSha256: "sha256:" + "c".repeat(64),
  replayEvidenceURI: "urn:rosevear:evidence:yw562:health-replay-377",
  replayEvidenceDigest: "sha256:" + "d".repeat(64),
  correlationState: "VERIFIED_CORRELATED" as const,
  blockers: [],
  checkedAt: "2026-11-12T05:15:22.000Z",
  recordedAt: "2026-11-12T05:15:22.000Z"
}];

const ownerDecision = {
  decisionId: "55555555-5555-4555-8555-555555555555",
  sourceId: "yw" as const,
  receiptId,
  decision: "ACCEPT" as const,
  evidenceURI: "urn:rosevear:evidence:yw562:owner-accept-377",
  detail: "Explicit owner acceptance for exact current YW562 receipt.",
  decidedAt: "2026-11-12T05:16:00.000Z",
  recordedAt: "2026-11-12T05:16:01.000Z"
};

const registryEvidence: Build376ConnectionRegistryEvidence = {
  evidenceId: "66666666-6666-4666-8666-666666666666",
  sourceId: "yw",
  recordVersion: 20,
  environment: "production",
  declaredStatus: "CONNECTED",
  statusObservedAt: "2026-11-12T05:16:10.000Z",
  statusExpiresAt: "2026-11-12T06:16:10.000Z",
  evidenceURI: "urn:rosevear:evidence:yw562:registry-connected-377",
  immutableRevision: BUILD_377_SOURCE_RUNTIME.currentMain,
  signerKeyId: "yw562-transport-377",
  signerFingerprint: "e".repeat(64),
  testEvidenceURI: "urn:rosevear:evidence:yw562:test-377",
  connectionEvidenceURI: "urn:rosevear:evidence:yw562:connection-377",
  ownerAuthorized: true,
  independentTestVerified: true,
  independentConnectionVerified: true,
  evidenceAuthority: "independent-source-verification"
};

const sourceReady = composeBuild377YwLiveConnectionContinuity({
  signerEvents,
  receipts,
  admissionEvents,
  ownerDecisions: [ownerDecision],
  replayEvents,
  connectionRegistryEvidence: registryEvidence,
  now
});
assert.equal(sourceReady.exactReceiptState, "ACTIVE_CURRENT");
assert.equal(
  sourceReady.acceptanceRevalidationState,
  "ACCEPTED_CURRENT"
);
assert.equal(
  sourceReady.connectionCandidateState,
  "READY_FOR_LIVE_INTAKE"
);
assert.equal(sourceReady.liveConnectionIntakeState, "READY_FOR_LIVE_INTAKE");
assert.equal(
  sourceReady.currentMasterRuntimeState,
  "HOLD_NO_CURRENT_MASTER_EVIDENCE"
);
assert.equal(
  sourceReady.threeMasterSyncActivationState,
  "HOLD_CONNECTION_INTAKE"
);

const execution: Build377LiveConnectionExecutionEvent = {
  executionEventId: "77777777-7777-4777-8777-777777777777",
  registryEvidenceId: registryEvidence.evidenceId,
  sourceProductionRevision: BUILD_377_SOURCE_RUNTIME.currentMain,
  exactReceiptId: receiptId,
  ownerDecisionId: ownerDecision.decisionId,
  connectionEvidenceURI: registryEvidence.connectionEvidenceURI!,
  executionState: "EXECUTED_CURRENT",
  executedAt: "2026-11-12T05:17:00.000Z",
  recordedAt: "2026-11-12T05:17:01.000Z"
};

const afterIntake = composeBuild377YwLiveConnectionContinuity({
  signerEvents,
  receipts,
  admissionEvents,
  ownerDecisions: [ownerDecision],
  replayEvents,
  connectionRegistryEvidence: registryEvidence,
  connectionExecutionEvents: [execution],
  now
});
assert.equal(afterIntake.liveConnectionIntakeState, "EXECUTED_CURRENT");
assert.equal(
  afterIntake.threeMasterSyncActivationState,
  "HOLD_MASTER_RUNTIME"
);
assert.equal(afterIntake.connectionState, "DISCONNECTED_HOLD");

const masterRuntimeEvidence: Build377MasterRuntimeEvidence = {
  recheckId: "88888888-8888-4888-8888-888888888888",
  controllerRevision: BUILD_377_CONTROLLER_BASE_REVISION,
  aiHubMain: BUILD_377_MASTER_RUNTIME.aiHub.main,
  aiHubState: {
    connection: "CONNECTED",
    masterSync: "SYNCED"
  },
  commsMain: BUILD_377_MASTER_RUNTIME.comms.main,
  commsState: {
    receiver: "ON",
    connection: "CONNECTED",
    ownerAcceptance: "ACCEPTED",
    slaveGate: "OPEN"
  },
  blockers: [],
  gateState: "OPEN",
  checkedAt: "2026-11-12T05:17:10.000Z",
  recordedAt: "2026-11-12T05:17:11.000Z"
};

const activationReady = composeBuild377YwLiveConnectionContinuity({
  signerEvents,
  receipts,
  admissionEvents,
  ownerDecisions: [ownerDecision],
  replayEvents,
  connectionRegistryEvidence: registryEvidence,
  connectionExecutionEvents: [execution],
  masterRuntimeEvidence,
  now
});
assert.equal(activationReady.currentMasterRuntimeState, "VERIFIED_OPEN");
assert.equal(
  activationReady.threeMasterSyncActivationState,
  "READY_FOR_EXPLICIT_SYNC_ACTIVATION"
);
assert.equal(activationReady.connectionState, "DISCONNECTED_HOLD");

const activation: Build377SyncActivationEvent = {
  activationEventId: "99999999-9999-4999-8999-999999999999",
  connectionExecutionEventId: execution.executionEventId,
  sourceProductionRevision: BUILD_377_SOURCE_RUNTIME.currentMain,
  exactReceiptId: receiptId,
  masterRuntimeRecheckId: masterRuntimeEvidence.recheckId,
  controllerRevision: BUILD_377_CONTROLLER_BASE_REVISION,
  aiHubMain: BUILD_377_MASTER_RUNTIME.aiHub.main,
  commsMain: BUILD_377_MASTER_RUNTIME.comms.main,
  activationState: "ACTIVE_SYNCED",
  activatedAt: "2026-11-12T05:18:00.000Z",
  recordedAt: "2026-11-12T05:18:01.000Z"
};

const connected = composeBuild377YwLiveConnectionContinuity({
  signerEvents,
  receipts,
  admissionEvents,
  ownerDecisions: [ownerDecision],
  replayEvents,
  connectionRegistryEvidence: registryEvidence,
  connectionExecutionEvents: [execution],
  masterRuntimeEvidence,
  syncActivationEvents: [activation],
  now
});
assert.equal(connected.threeMasterSyncActivationState, "ACTIVE_SYNCED");
assert.equal(connected.postConnectionContinuityState, "STABLE_CONNECTED");
assert.equal(connected.connectionState, "CONNECTED");
assert.equal(connected.mastersSynced, true);

const oldReceiptOnly = composeBuild377YwLiveConnectionContinuity({
  signerEvents,
  receipts: [{
    ...receipts[0],
    receiptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    sourceRevision: BUILD_377_SOURCE_RUNTIME.previousMain,
    manifestRevision: BUILD_377_SOURCE_RUNTIME.previousMain
  }],
  ownerDecisions: [{
    ...ownerDecision,
    decisionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    receiptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  }],
  now
});
assert.equal(oldReceiptOnly.exactReceiptState, "HOLD_NO_CURRENT_RECEIPT");
assert.equal(
  oldReceiptOnly.acceptanceRevalidationState,
  "HOLD_RECEIPT_NOT_ACTIVE"
);
assert.equal(oldReceiptOnly.connectionState, "DISCONNECTED_HOLD");

const operatorEvidence = {
  ...registryEvidence,
  evidenceId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  evidenceAuthority: "operator-recorded" as const
};
const operatorHeld = composeBuild377YwLiveConnectionContinuity({
  connectionRegistryEvidence: operatorEvidence,
  now
});
assert.equal(
  operatorHeld.connectionCandidateState,
  "HOLD_CONNECTION_NOT_INDEPENDENT"
);

const staleEvidence = {
  ...registryEvidence,
  evidenceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  statusExpiresAt: "2026-11-12T05:19:59.000Z"
};
const staleHeld = composeBuild377YwLiveConnectionContinuity({
  connectionRegistryEvidence: staleEvidence,
  now
});
assert.equal(
  staleHeld.connectionCandidateState,
  "HOLD_CONNECTION_EVIDENCE_STALE"
);

const staleMaster = {
  ...masterRuntimeEvidence,
  recheckId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  aiHubMain: "f".repeat(40)
};
const masterHeld = composeBuild377YwLiveConnectionContinuity({
  signerEvents,
  receipts,
  admissionEvents,
  ownerDecisions: [ownerDecision],
  replayEvents,
  connectionRegistryEvidence: registryEvidence,
  connectionExecutionEvents: [execution],
  masterRuntimeEvidence: staleMaster,
  now
});
assert.equal(
  masterHeld.currentMasterRuntimeState,
  "HOLD_MASTER_REVISION_MISMATCH"
);
assert.equal(
  masterHeld.threeMasterSyncActivationState,
  "HOLD_MASTER_RUNTIME"
);

const newReceiptId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const changedReceipt = {
  ...receipts[0],
  receiptId: newReceiptId,
  receiptSha256: "9".repeat(64),
  nonce: "yw562-health-nonce-377-b",
  issuedAt: "2026-11-12T05:19:00.000Z",
  healthObservedAt: "2026-11-12T05:19:10.000Z",
  verifiedAt: "2026-11-12T05:19:20.000Z"
};
const receiptChanged = composeBuild377YwLiveConnectionContinuity({
  signerEvents,
  receipts: [changedReceipt, ...receipts],
  admissionEvents: [{
    ...admissionEvents[0],
    admissionEventId: "12121212-1212-4212-8212-121212121212",
    receiptSha256: changedReceipt.receiptSha256,
    receiptId: newReceiptId,
    recordedAt: "2026-11-12T05:19:21.000Z"
  }, ...admissionEvents],
  ownerDecisions: [{
    ...ownerDecision,
    decisionId: "13131313-1313-4313-8313-131313131313",
    receiptId: newReceiptId,
    recordedAt: "2026-11-12T05:19:31.000Z"
  }, ownerDecision],
  replayEvents: [{
    ...replayEvents[0],
    replayEventId: "14141414-1414-4414-8414-141414141414",
    receiptId: newReceiptId,
    receiptSha256: changedReceipt.receiptSha256,
    recordedAt: "2026-11-12T05:19:22.000Z"
  }, ...replayEvents],
  connectionRegistryEvidence: registryEvidence,
  connectionExecutionEvents: [execution],
  masterRuntimeEvidence,
  syncActivationEvents: [activation],
  now
});
assert.equal(
  receiptChanged.postConnectionContinuityState,
  "HOLD_RECEIPT_CHANGED"
);
assert.equal(receiptChanged.connectionState, "DISCONNECTED_HOLD");
assert.equal(receiptChanged.mastersSynced, false);

assert.equal(current.policy.yw561EvidenceMayCarryForwardToYw562, false);
assert.equal(current.policy.browserMayAssertIndependentConnection, false);
assert.equal(current.policy.explicitSyncActivationRequired, true);
assert.equal(current.policy.continuityMonitoringFailsClosed, true);
assert.equal(current.policy.codeGreenMaySetConnected, false);
assert.equal(current.policy.privateKeysOrReceiverSecretsAccepted, false);

const migration = source(
  "../../db/migrations/0141_master_yw562_live_connection_continuity.sql"
);
for (const token of [
  "master_yw562_live_connection_intake_execution_events",
  "master_yw562_exact_receipt_acceptance_revalidation_events",
  "master_yw562_three_master_sync_activation_events",
  "master_yw562_post_connection_continuity_events",
  "EXECUTED_CURRENT",
  "ACTIVE_SYNCED",
  "STABLE_CONNECTED",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), `migration token ${token}`);
}
assert.ok(!migration.toLowerCase().includes("private_key"));
assert.ok(!migration.toLowerCase().includes("transport_secret"));

const database = source(
  "lib/yw562-live-trusted-connection-continuity-database.ts"
);
for (const token of [
  "executeBuild377LiveTrustedConnectionIntake",
  "recordBuild377AcceptanceRevalidation",
  "activateBuild377ThreeMasterSync",
  "recordBuild377PostConnectionContinuity",
  "master_shell_source_registry_evidence",
  "master_runtime_evidence_rechecks",
  "master_yw562_live_connection_intake_execution_events",
  "master_yw562_three_master_sync_activation_events",
  "master_yw562_post_connection_continuity_events"
]) {
  assert.ok(database.includes(token), `database token ${token}`);
}
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("service_role"));
assert.ok(!database.includes("receiverToken"));

const api = source("app/api/yw562-live-connection-continuity/route.ts");
for (const token of [
  'action === "execute-live-intake"',
  'action === "revalidate-acceptance"',
  'action === "activate-three-master-sync"',
  'action === "monitor-continuity"'
]) {
  assert.ok(api.includes(token), `api token ${token}`);
}
assert.ok(!api.includes("independentConnectionVerified: true"));
assert.ok(!api.includes("gateState: \"OPEN\""));

const page = source("app/yw562-live-connection-continuity/page.tsx");
for (const token of [
  "Build 377 · YW561→YW562 live connection continuity",
  "YW561 evidence does not survive the YW562 revision.",
  "Independent connection authority remains source-owned.",
  "Three-Master synchronization is an explicit final activation.",
  "Continuity monitoring fails closed after activation."
]) {
  assert.ok(page.includes(token), `page token ${token}`);
}

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw562-live-connection-continuity"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw562-live-connection-continuity"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_yw562_live_connection_intake_execution_events"',
  '"master_yw562_exact_receipt_acceptance_revalidation_events"',
  '"master_yw562_three_master_sync_activation_events"',
  '"master_yw562_post_connection_continuity_events"',
  '"0141_master_yw562_live_connection_continuity.sql"'
]) {
  assert.ok(spine.includes(token), `db spine token ${token}`);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-377-yw562-live-connection-continuity.ts";
assert.equal(String(pkg.scripts["verify:build377"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 377 YW561→YW562 Live Trusted Connection Intake Execution, Exact-Receipt Acceptance Revalidation, Three-Master Sync Activation & Post-Connection Continuity Monitoring verification passed."
);
