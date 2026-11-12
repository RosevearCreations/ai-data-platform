import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_376,
  BUILD_376_CONTROLLER_BASE_REVISION,
  BUILD_376_MASTER_RUNTIME,
  composeBuild376Yw561ConnectionSync,
  type Build376ConnectionIntakeEvent,
  type Build376ConnectionRegistryEvidence
} from "../lib/yw561-independent-connection-three-master-sync";
import { BUILD_373_YW561_LIVE_OBSERVATION } from "../lib/yw561-live-signer-receipt-replay-owner-recheck";

const root = path.resolve(process.cwd());
const source = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const now = new Date("2026-11-11T20:50:00.000Z");

const current = composeBuild376Yw561ConnectionSync({ now });
assert.equal(BUILD_376, 376);
assert.equal(
  BUILD_376_CONTROLLER_BASE_REVISION,
  "83fa0b23af4c6ce59209efa324685eda6b80a546"
);
assert.equal(BUILD_376_MASTER_RUNTIME.yw.main, BUILD_373_YW561_LIVE_OBSERVATION.productionMain);
assert.equal(BUILD_376_MASTER_RUNTIME.aiHub.build, 309);
assert.equal(BUILD_376_MASTER_RUNTIME.comms.build, "QL-418");
assert.equal(current.candidateConnectionEvidenceState, "HOLD_NO_REGISTRY_EVIDENCE");
assert.equal(current.independentConnectionEvidenceIntakeState, "HOLD_NO_REGISTRY_EVIDENCE");
assert.equal(current.exactReceiptAcceptanceContinuityRecheckState, "HOLD_ACCEPTANCE_CONTINUITY");
assert.equal(current.verifiedConnectedTransitionState, "HOLD_CONNECTION_EVIDENCE");
assert.equal(current.threeMasterSynchronizationClosureState, "HOLD");
assert.equal(current.connectionState, "DISCONNECTED_HOLD");
assert.equal(current.mastersSynced, false);

const signerEvents = [{
  eventId: "77777777-7777-4777-8777-777777777777",
  sourceId: "yw" as const,
  eventType: "ENROLLED" as const,
  keyId: "yw-source-health-376",
  publicKeySpkiSha256: "sha256:" + "a".repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:yw561:registry-custody-376",
  independentlyVerifiedAt: "2026-11-11T20:40:00.000Z",
  recordedAt: "2026-11-11T20:40:01.000Z"
}];

const custodyEvents = [{
  eventId: "88888888-8888-4888-8888-888888888888",
  intakeId: "99999999-9999-4999-8999-999999999999",
  sourceId: "yw" as const,
  eventType: "ENROLLMENT_COMMITTED" as const,
  keyId: "yw-source-health-376",
  computedSpkiSha256: "sha256:" + "a".repeat(64),
  independentPinSpkiSha256: "sha256:" + "a".repeat(64),
  pinEvidenceURI: "urn:rosevear:evidence:yw561:pin-376",
  custodyEvidenceURI: "urn:rosevear:evidence:yw561:custody-376",
  witnessEvidenceURI: "urn:rosevear:evidence:yw561:witness-376",
  recordedAt: "2026-11-11T20:40:02.000Z"
}];

const custodyEvidenceEvents = [{
  evidenceEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  sourceProductionRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  keyId: "yw-source-health-376",
  publicKeySpkiSha256: "sha256:" + "a".repeat(64),
  pinEvidenceURI: "urn:rosevear:evidence:yw561:pin-376",
  custodyEvidenceURI: "urn:rosevear:evidence:yw561:custody-376",
  witnessEvidenceURI: "urn:rosevear:evidence:yw561:witness-376",
  registryEventId: "77777777-7777-4777-8777-777777777777",
  enrollmentEventId: "88888888-8888-4888-8888-888888888888",
  custodyState: "VERIFIED_CORRELATED" as const,
  blockers: [],
  checkedAt: "2026-11-11T20:40:03.000Z",
  recordedAt: "2026-11-11T20:40:03.000Z"
}];

const receiptId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const receipts = [{
  receiptId,
  sourceId: "yw" as const,
  keyId: "yw-source-health-376",
  sourceRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  manifestRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  receiptSha256: "b".repeat(64),
  nonce: "yw561-source-health-nonce-376",
  issuedAt: "2026-11-11T20:41:00.000Z",
  healthObservedAt: "2026-11-11T20:41:10.000Z",
  healthState: "HEALTHY" as const,
  sourceRuntime: "yw-production",
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt: "2026-11-11T20:41:20.000Z"
}];

const admissionEvents = [{
  admissionEventId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  sourceId: "yw" as const,
  keyId: "yw-source-health-376",
  receiptSha256: "b".repeat(64),
  sourceRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  outcome: "ADMITTED" as const,
  receiptId,
  blockers: [],
  recordedAt: "2026-11-11T20:41:21.000Z"
}];

const replayEvents = [{
  replayEventId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  sourceProductionRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  manifestRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  receiptId,
  receiptSha256: "b".repeat(64),
  nonceSha256: "sha256:" + "c".repeat(64),
  replayEvidenceURI: "urn:rosevear:evidence:yw561:source-health-replay-376",
  replayEvidenceDigest: "sha256:" + "d".repeat(64),
  correlationState: "VERIFIED_CORRELATED" as const,
  blockers: [],
  checkedAt: "2026-11-11T20:41:22.000Z",
  recordedAt: "2026-11-11T20:41:22.000Z"
}];

const acceptedDecision = {
  decisionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  sourceId: "yw" as const,
  receiptId,
  decision: "ACCEPT" as const,
  evidenceURI: "urn:rosevear:evidence:yw561:owner-accept-376",
  detail: "Explicit owner acceptance for the exact current receipt.",
  decidedAt: "2026-11-11T20:42:00.000Z",
  recordedAt: "2026-11-11T20:42:01.000Z"
};

const connectionEvidence: Build376ConnectionRegistryEvidence = {
  evidenceId: "f1111111-1111-4111-8111-111111111111",
  sourceId: "yw",
  recordVersion: 12,
  environment: "production",
  declaredStatus: "CONNECTED",
  statusObservedAt: "2026-11-11T20:43:00.000Z",
  statusExpiresAt: "2026-11-11T21:43:00.000Z",
  evidenceURI: "urn:rosevear:evidence:yw561:connected-registry-376",
  immutableRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  signerKeyId: "yw-transport-source-376",
  signerFingerprint: "a".repeat(64),
  testEvidenceURI: "urn:rosevear:evidence:yw561:test-376",
  connectionEvidenceURI: "urn:rosevear:evidence:yw561:connection-376",
  ownerAuthorized: true,
  independentTestVerified: true,
  independentConnectionVerified: true,
  evidenceAuthority: "independent-source-verification"
};

const readyForIntake = composeBuild376Yw561ConnectionSync({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [acceptedDecision],
  masterOverride: { gateState: "OPEN" },
  previousRuntimeGateState: "OPEN",
  connectionRegistryEvidence: connectionEvidence,
  now
});
assert.equal(readyForIntake.candidateConnectionEvidenceState, "READY_FOR_TRUSTED_INTAKE");
assert.equal(readyForIntake.independentConnectionEvidenceIntakeState, "READY_FOR_TRUSTED_INTAKE");
assert.equal(
  readyForIntake.exactReceiptAcceptanceContinuityRecheckState,
  "HOLD_NO_VERIFIED_CONNECTION_INTAKE"
);
assert.equal(readyForIntake.verifiedConnectedTransitionState, "HOLD_CONNECTION_EVIDENCE");
assert.equal(readyForIntake.connectionState, "DISCONNECTED_HOLD");
assert.equal(readyForIntake.mastersSynced, false);

const intake: Build376ConnectionIntakeEvent = {
  intakeEventId: "f2222222-2222-4222-8222-222222222222",
  registryEvidenceId: connectionEvidence.evidenceId,
  sourceProductionRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  exactReceiptId: receiptId,
  verificationState: "VERIFIED_CURRENT",
  checkedAt: "2026-11-11T20:44:00.000Z",
  recordedAt: "2026-11-11T20:44:01.000Z"
};

const closed = composeBuild376Yw561ConnectionSync({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [acceptedDecision],
  masterOverride: { gateState: "OPEN" },
  previousRuntimeGateState: "OPEN",
  connectionRegistryEvidence: connectionEvidence,
  connectionIntakeEvents: [intake],
  now
});
assert.equal(closed.independentConnectionEvidenceIntakeState, "VERIFIED_CURRENT");
assert.equal(closed.exactReceiptAcceptanceContinuityRecheckState, "ACTIVE_CURRENT");
assert.equal(closed.verifiedConnectedTransitionState, "CONNECTED_VERIFIED");
assert.equal(closed.threeMasterSynchronizationClosureState, "CLOSED");
assert.equal(closed.connectionState, "CONNECTED");
assert.equal(closed.mastersSynced, true);

const operatorEvidence = {
  ...connectionEvidence,
  evidenceId: "f3333333-3333-4333-8333-333333333333",
  evidenceAuthority: "operator-recorded" as const
};
const operatorHeld = composeBuild376Yw561ConnectionSync({
  connectionRegistryEvidence: operatorEvidence,
  now
});
assert.equal(operatorHeld.candidateConnectionEvidenceState, "HOLD_NOT_INDEPENDENT");
assert.equal(operatorHeld.connectionState, "DISCONNECTED_HOLD");

const staleEvidence = {
  ...connectionEvidence,
  evidenceId: "f4444444-4444-4444-8444-444444444444",
  statusExpiresAt: "2026-11-11T20:49:59.000Z"
};
const staleHeld = composeBuild376Yw561ConnectionSync({
  connectionRegistryEvidence: staleEvidence,
  now
});
assert.equal(staleHeld.candidateConnectionEvidenceState, "HOLD_STALE_OR_INVALID_TIME");

const wrongRevision = {
  ...connectionEvidence,
  evidenceId: "f5555555-5555-4555-8555-555555555555",
  immutableRevision: "1".repeat(40)
};
const revisionHeld = composeBuild376Yw561ConnectionSync({
  connectionRegistryEvidence: wrongRevision,
  now
});
assert.equal(revisionHeld.candidateConnectionEvidenceState, "HOLD_REVISION_MISMATCH");

const receiptChangedIntake = {
  ...intake,
  intakeEventId: "f6666666-6666-4666-8666-666666666666",
  exactReceiptId: "12121212-1212-4212-8212-121212121212"
};
const receiptChanged = composeBuild376Yw561ConnectionSync({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [acceptedDecision],
  masterOverride: { gateState: "OPEN" },
  connectionRegistryEvidence: connectionEvidence,
  connectionIntakeEvents: [receiptChangedIntake],
  now
});
assert.equal(receiptChanged.exactReceiptAcceptanceContinuityRecheckState, "HOLD_RECEIPT_CHANGED");
assert.equal(receiptChanged.verifiedConnectedTransitionState, "HOLD_ACCEPTANCE_CONTINUITY");
assert.equal(receiptChanged.mastersSynced, false);

const runtimeClosed = composeBuild376Yw561ConnectionSync({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [acceptedDecision],
  masterOverride: { gateState: "HOLD" },
  previousRuntimeGateState: "OPEN",
  connectionRegistryEvidence: connectionEvidence,
  connectionIntakeEvents: [intake],
  now
});
assert.equal(runtimeClosed.currentRuntimeGateState, "HOLD");
assert.equal(runtimeClosed.verifiedConnectedTransitionState, "HOLD_ACCEPTANCE_CONTINUITY");
assert.equal(runtimeClosed.threeMasterSynchronizationClosureState, "HOLD");

assert.equal(current.policy.independentRegistryAuthorityRequired, true);
assert.equal(current.policy.operatorRecordedEvidenceCannotConnect, true);
assert.equal(current.policy.trustedIntakeCorrelationRequired, true);
assert.equal(current.policy.connectedMayBeInferredFromCodeGreen, false);
assert.equal(current.policy.threeMasterSyncMayBeInferred, false);
assert.equal(current.policy.rawConnectionSecretsAccepted, false);

const migration = source(
  "../../db/migrations/0140_master_yw561_independent_connection_three_master_sync.sql"
);
for (const token of [
  "master_yw561_independent_connection_evidence_intake_events",
  "master_yw561_acceptance_continuity_connection_recheck_events",
  "master_yw561_verified_connection_transition_events",
  "master_yw561_three_master_sync_closure_events",
  "VERIFIED_CURRENT",
  "CONNECTED_VERIFIED",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) assert.ok(migration.includes(token), `migration token ${token}`);
assert.ok(!migration.toLowerCase().includes("private_key"));
assert.ok(!migration.toLowerCase().includes("transport_secret"));

const database = source(
  "lib/yw561-independent-connection-three-master-sync-database.ts"
);
for (const token of [
  "intakeBuild376IndependentConnectionEvidence",
  "recordBuild376ConnectionSyncRecheck",
  "master_shell_source_registry_evidence",
  "evidence_authority",
  "independent_connection_verified",
  "master_yw561_independent_connection_evidence_intake_events",
  "master_yw561_verified_connection_transition_events",
  "master_yw561_three_master_sync_closure_events"
]) assert.ok(database.includes(token), `database token ${token}`);
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("service_role"));
assert.ok(!database.includes("YW561_RECEIVER_TOKEN"));

const api = source("app/api/yw561-independent-connection-sync/route.ts");
assert.ok(api.includes('action === "intake-connection-evidence"'));
assert.ok(api.includes('action === "recheck"'));
assert.ok(!api.includes("independentConnectionVerified: true"));

const page = source("app/yw561-independent-connection-sync/page.tsx");
for (const token of [
  "Build 376 · YW561 independent connection and three-Master sync",
  "Independent connection evidence cannot be manufactured here.",
  "CONNECTED remains a multi-gate transition.",
  "Three-Master synchronization closes last."
]) assert.ok(page.includes(token), `page token ${token}`);

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw561-independent-connection-sync"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw561-independent-connection-sync"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_yw561_independent_connection_evidence_intake_events"',
  '"master_yw561_acceptance_continuity_connection_recheck_events"',
  '"master_yw561_verified_connection_transition_events"',
  '"master_yw561_three_master_sync_closure_events"',
  '"0140_master_yw561_independent_connection_three_master_sync.sql"'
]) assert.ok(spine.includes(token), `db spine token ${token}`);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-376-yw561-independent-connection-three-master-sync.ts";
assert.equal(String(pkg.scripts["verify:build376"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 376 YW561 Independent Connection Evidence Intake, Verified CONNECTED Transition, Exact-Receipt Owner Acceptance Continuity Recheck & Three-Master Synchronization Closure verification passed."
);
