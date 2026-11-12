import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
  verify
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_378_CONTROLLER_BASE_REVISION,
  BUILD_378_REQUIRED_YW_TABLES,
  BUILD_378_RUNTIME,
  composeBuild378RuntimeQl422Readiness,
  type Build378FreshReceiptAdmissionEvent,
  type Build378Ql422CorrelationEvent,
  type Build378RuntimePrerequisiteEvidence
} from "../lib/yw562-runtime-ql422-protected-readiness";
import {
  BUILD_379,
  BUILD_379_CONTROLLER_BASE_REVISION,
  BUILD_379_RUNTIME,
  build379Digest,
  canonicalBuild379ProtectedEnvelope,
  composeBuild379ProtectedActivation,
  type Build379ActivationDecisionEvent,
  type Build379ActivationExecutionEvent,
  type Build379ProtectedAdmissionEvent,
  type Build379ProtectedEnvelope
} from "../lib/yw562-protected-runtime-activation-decision";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");
const now = new Date("2026-11-12T05:40:00.000Z");

assert.equal(BUILD_379, 379);
assert.equal(
  BUILD_379_CONTROLLER_BASE_REVISION,
  "a0eea834c7e8d62232a70b13b06688c6b9b4babc"
);
assert.equal(
  BUILD_379_RUNTIME.yw.main,
  "6e0b77eebcfc77aa7fc48dcc398da958af8df696"
);
assert.equal(BUILD_379_RUNTIME.aiHub.build, 313);
assert.equal(
  BUILD_379_RUNTIME.aiHub.main,
  "e64e4b2e79e7c07bbd077284c298207414b149ad"
);
assert.equal(BUILD_379_RUNTIME.comms.build, "QL-423");
assert.equal(
  BUILD_379_RUNTIME.comms.main,
  "2adc527a88adb790f0edc5192df62f03be8c397c"
);
assert.equal(BUILD_379_RUNTIME.aiHub.originalHost, "DESKTOP-AE894KC");

const signerEvents = [{
  eventId: "11111111-1111-4111-8111-111111111111",
  sourceId: "yw" as const,
  eventType: "ENROLLED" as const,
  keyId: "yw562-runtime-379",
  publicKeySpkiSha256: "sha256:" + "a".repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:yw562:signer-custody-379",
  independentlyVerifiedAt: "2026-11-12T05:30:00.000Z",
  recordedAt: "2026-11-12T05:30:01.000Z"
}];

const receiptId = "22222222-2222-4222-8222-222222222222";
const receipt = {
  receiptId,
  sourceId: "yw" as const,
  keyId: "yw562-runtime-379",
  sourceRevision: BUILD_378_RUNTIME.yw.main,
  manifestRevision: BUILD_378_RUNTIME.yw.main,
  receiptSha256: "b".repeat(64),
  nonce: "yw562-health-379-nonce",
  issuedAt: "2026-11-12T05:35:00.000Z",
  healthObservedAt: "2026-11-12T05:35:10.000Z",
  healthState: "HEALTHY" as const,
  sourceRuntime: "yw-production",
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt: "2026-11-12T05:35:20.000Z"
};
const healthAdmission = {
  admissionEventId: "33333333-3333-4333-8333-333333333333",
  sourceId: "yw" as const,
  keyId: "yw562-runtime-379",
  receiptSha256: receipt.receiptSha256,
  sourceRevision: BUILD_378_RUNTIME.yw.main,
  outcome: "ADMITTED" as const,
  receiptId,
  blockers: [],
  recordedAt: "2026-11-12T05:35:21.000Z"
};
const replay = {
  replayEventId: "44444444-4444-4444-8444-444444444444",
  sourceProductionRevision: BUILD_378_RUNTIME.yw.main,
  manifestRevision: BUILD_378_RUNTIME.yw.main,
  receiptId,
  receiptSha256: receipt.receiptSha256,
  nonceSha256: "sha256:" + "c".repeat(64),
  replayEvidenceURI: "urn:rosevear:evidence:yw562:replay-379",
  replayEvidenceDigest: "sha256:" + "d".repeat(64),
  correlationState: "VERIFIED_CORRELATED" as const,
  blockers: [],
  checkedAt: "2026-11-12T05:35:22.000Z",
  recordedAt: "2026-11-12T05:35:22.000Z"
};
const ownerDecision = {
  decisionId: "55555555-5555-4555-8555-555555555555",
  sourceId: "yw" as const,
  receiptId,
  decision: "ACCEPT" as const,
  evidenceURI: "urn:rosevear:evidence:yw562:owner-accept-379",
  detail: "Explicit Master owner acceptance for exact current YW562 receipt.",
  decidedAt: "2026-11-12T05:36:00.000Z",
  recordedAt: "2026-11-12T05:36:01.000Z"
};
const prerequisite: Build378RuntimePrerequisiteEvidence = {
  evidenceId: "66666666-6666-4666-8666-666666666666",
  sourceId: "yw",
  keyId: "yw562-runtime-379",
  sourceProductionRevision: BUILD_378_RUNTIME.yw.main,
  requiredTables: [...BUILD_378_REQUIRED_YW_TABLES],
  schemaChainVerified: true,
  rlsVerified: true,
  ownerHelperVerified: true,
  protectedSummaryVerified: true,
  evidenceURI: "urn:rosevear:evidence:yw562:runtime-prerequisites:379",
  reportDigest: "e".repeat(64),
  signatureDigest: "f".repeat(64),
  nonce: "yw562-runtime-379-nonce",
  checkedAt: "2026-11-12T05:37:00.000Z",
  recordedAt: "2026-11-12T05:37:01.000Z",
  verificationState: "VERIFIED_CURRENT"
};
const receiptAdmission: Build378FreshReceiptAdmissionEvent = {
  admissionEventId: "77777777-7777-4777-8777-777777777777",
  prerequisiteEvidenceId: prerequisite.evidenceId,
  receiptId,
  receiptSha256: receipt.receiptSha256,
  sourceRevision: BUILD_378_RUNTIME.yw.main,
  admissionState: "ADMITTED_CURRENT",
  admittedAt: "2026-11-12T05:37:30.000Z",
  recordedAt: "2026-11-12T05:37:31.000Z"
};
const protectedQl422: Build378Ql422CorrelationEvent = {
  correlationEventId: "88888888-8888-4888-8888-888888888888",
  evidenceAuthority: "protected-runtime",
  controllerRevision: BUILD_378_CONTROLLER_BASE_REVISION,
  ywSourceRevision: BUILD_378_RUNTIME.yw.main,
  aiHubMain: BUILD_378_RUNTIME.aiHub.main,
  commsMain: BUILD_378_RUNTIME.comms.main,
  originalHostId: BUILD_378_RUNTIME.aiHub.originalHost,
  sourceEpisodeId: "original_episode_379",
  sourceReceiptDigest: "1".repeat(64),
  receiverAckDigest: "2".repeat(64),
  closureDigest: "3".repeat(64),
  handoffReceiptId: "handoff_receipt_379",
  witnessDigest: "4".repeat(64),
  masterReceipts: [
    { masterId: "rosevear-ai-hub", receiptId: "aih_receipt_379", digest: "5".repeat(64) },
    { masterId: "rosevear-comms-hub", receiptId: "comms_receipt_379", digest: "6".repeat(64) },
    { masterId: "ai-data-platform", receiptId: "aidp_receipt_379", digest: "7".repeat(64) }
  ],
  terminalLedgerDigest: "8".repeat(64),
  evidenceURI: "urn:rosevear:evidence:ql422:protected-runtime:379",
  observedAt: "2026-11-12T05:38:00.000Z",
  recordedAt: "2026-11-12T05:38:01.000Z",
  correlationState: "VERIFIED_CORRELATED"
};
const build378Ready = composeBuild378RuntimeQl422Readiness({
  signerEvents,
  receipts: [receipt],
  admissionEvents: [healthAdmission],
  replayEvents: [replay],
  ownerDecisions: [ownerDecision],
  runtimePrerequisiteEvents: [prerequisite],
  freshReceiptAdmissionEvents: [receiptAdmission],
  ql422CorrelationEvents: [protectedQl422],
  now
});
assert.equal(
  build378Ready.protectedActivationReadinessState,
  "READY_FOR_PROTECTED_ACTIVATION"
);

const noProtected = composeBuild379ProtectedActivation({
  build378: build378Ready,
  now
});
assert.equal(
  noProtected.protectedRuntimeEvidenceState,
  "HOLD_NO_PROTECTED_RUNTIME_ADMISSION"
);
assert.equal(
  noProtected.supervisedActivationDecisionState,
  "HOLD_NOT_READY_FOR_OWNER_DECISION"
);
assert.equal(noProtected.connectionState, "DISCONNECTED_HOLD");
assert.equal(noProtected.receiverState, "OFF");
assert.equal(noProtected.mastersSynced, false);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const authorityKeyId = "sha256:" + "9".repeat(64);
const envelope: Build379ProtectedEnvelope = {
  authorityKeyId,
  controllerRevision: BUILD_379_CONTROLLER_BASE_REVISION,
  ql422ControllerRevision: BUILD_378_CONTROLLER_BASE_REVISION,
  build378AiHubRevision: BUILD_378_RUNTIME.aiHub.main,
  build378CommsRevision: BUILD_378_RUNTIME.comms.main,
  sourceRevision: BUILD_379_RUNTIME.yw.main,
  aiHubMain: BUILD_379_RUNTIME.aiHub.main,
  commsMain: BUILD_379_RUNTIME.comms.main,
  originalHostId: BUILD_379_RUNTIME.aiHub.originalHost,
  prerequisiteEvidenceId: prerequisite.evidenceId,
  freshReceiptAdmissionEventId: receiptAdmission.admissionEventId,
  exactReceiptId: receiptId,
  exactReceiptSha256: receipt.receiptSha256,
  ownerDecisionId: ownerDecision.decisionId,
  sourceEpisodeId: protectedQl422.sourceEpisodeId,
  sourceReceiptDigest: protectedQl422.sourceReceiptDigest,
  receiverAckDigest: protectedQl422.receiverAckDigest,
  closureDigest: protectedQl422.closureDigest,
  handoffReceiptId: protectedQl422.handoffReceiptId,
  witnessDigest: protectedQl422.witnessDigest,
  masterReceipts: protectedQl422.masterReceipts,
  terminalLedgerDigest: protectedQl422.terminalLedgerDigest,
  evidenceURI: "urn:rosevear:evidence:build379:protected-runtime",
  nonce: "build379-protected-nonce-0001",
  observedAt: "2026-11-12T05:39:00.000Z"
};
const canonical = canonicalBuild379ProtectedEnvelope(envelope);
const protectedSignature = sign(null, Buffer.from(canonical, "utf8"), privateKey);
assert.equal(
  verify(null, Buffer.from(canonical, "utf8"), publicKey, protectedSignature),
  true
);
assert.match(build379Digest(canonical), /^[a-f0-9]{64}$/);
assert.match(build379Digest(protectedSignature), /^[a-f0-9]{64}$/);
assert.ok(canonical.includes(BUILD_379_RUNTIME.comms.main));
assert.ok(canonical.includes(BUILD_378_RUNTIME.comms.main));
assert.ok(canonical.includes(BUILD_378_CONTROLLER_BASE_REVISION));

const protectedAdmission: Build379ProtectedAdmissionEvent = {
  admissionEventId: "99999999-9999-4999-8999-999999999999",
  authorityKeyId,
  authorityKeySpkiSha256: authorityKeyId,
  envelopeSha256: build379Digest(canonical),
  signatureSha256: build379Digest(protectedSignature),
  nonce: envelope.nonce,
  controllerRevision: BUILD_379_CONTROLLER_BASE_REVISION,
  sourceRevision: BUILD_379_RUNTIME.yw.main,
  aiHubMain: BUILD_379_RUNTIME.aiHub.main,
  commsMain: BUILD_379_RUNTIME.comms.main,
  originalHostId: BUILD_379_RUNTIME.aiHub.originalHost,
  prerequisiteEvidenceId: prerequisite.evidenceId,
  freshReceiptAdmissionEventId: receiptAdmission.admissionEventId,
  exactReceiptId: receiptId,
  ownerDecisionId: ownerDecision.decisionId,
  ql422CorrelationEventId: protectedQl422.correlationEventId,
  evidenceURI: envelope.evidenceURI,
  observedAt: envelope.observedAt,
  admissionState: "VERIFIED_ADMITTED",
  recordedAt: "2026-11-12T05:39:01.000Z"
};

const readyForOwner = composeBuild379ProtectedActivation({
  build378: build378Ready,
  protectedAdmissions: [protectedAdmission],
  now
});
assert.equal(readyForOwner.protectedRuntimeEvidenceState, "VERIFIED_CURRENT");
assert.equal(
  readyForOwner.exactReceiptOwnerContinuityState,
  "VERIFIED_CONTINUOUS"
);
assert.equal(
  readyForOwner.ql422ProtectedCorrelationClosureState,
  "CLOSED_VERIFIED"
);
assert.equal(
  readyForOwner.supervisedActivationDecisionState,
  "READY_FOR_OWNER_DECISION"
);
assert.equal(readyForOwner.connectionState, "DISCONNECTED_HOLD");

const activationDecision: Build379ActivationDecisionEvent = {
  decisionEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  protectedAdmissionEventId: protectedAdmission.admissionEventId,
  exactReceiptId: receiptId,
  ownerDecisionId: ownerDecision.decisionId,
  decision: "APPROVE_ACTIVATION",
  decisionState: "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME",
  decidedAt: "2026-11-12T05:39:20.000Z",
  recordedAt: "2026-11-12T05:39:21.000Z"
};
const activationExecution: Build379ActivationExecutionEvent = {
  executionEventId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  decisionEventId: activationDecision.decisionEventId,
  protectedAdmissionEventId: protectedAdmission.admissionEventId,
  exactReceiptId: receiptId,
  executionState: "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED",
  receiverState: "OFF",
  connectionState: "DISCONNECTED_HOLD",
  mastersSynced: false,
  executedAt: "2026-11-12T05:39:21.000Z",
  recordedAt: "2026-11-12T05:39:22.000Z"
};
const authorized = composeBuild379ProtectedActivation({
  build378: build378Ready,
  protectedAdmissions: [protectedAdmission],
  activationDecisions: [activationDecision],
  activationExecutions: [activationExecution],
  now
});
assert.equal(
  authorized.supervisedActivationDecisionState,
  "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME"
);
assert.equal(authorized.supervisedActivationDecisionExecuted, true);
assert.equal(authorized.receiverState, "OFF");
assert.equal(authorized.connectionState, "DISCONNECTED_HOLD");
assert.equal(authorized.mastersSynced, false);

const rejectedDecision: Build379ActivationDecisionEvent = {
  ...activationDecision,
  decisionEventId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  decision: "REJECT_ACTIVATION",
  decisionState: "REJECTED_HOLD"
};
const rejectedExecution: Build379ActivationExecutionEvent = {
  ...activationExecution,
  executionEventId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  decisionEventId: rejectedDecision.decisionEventId,
  executionState: "SUPERVISED_ACTIVATION_REJECTED_HOLD"
};
const rejected = composeBuild379ProtectedActivation({
  build378: build378Ready,
  protectedAdmissions: [protectedAdmission],
  activationDecisions: [rejectedDecision],
  activationExecutions: [rejectedExecution],
  now
});
assert.equal(rejected.supervisedActivationDecisionState, "REJECTED_HOLD");
assert.equal(rejected.connectionState, "DISCONNECTED_HOLD");

const staleAdmission = {
  ...protectedAdmission,
  admissionEventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  observedAt: "2026-11-12T05:30:00.000Z",
  recordedAt: "2026-11-12T05:39:59.000Z"
};
assert.equal(
  composeBuild379ProtectedActivation({
    build378: build378Ready,
    protectedAdmissions: [staleAdmission],
    now
  }).protectedRuntimeEvidenceState,
  "HOLD_PROTECTED_EVIDENCE_STALE"
);

const wrongReceipt = {
  ...protectedAdmission,
  admissionEventId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  exactReceiptId: "12121212-1212-4212-8212-121212121212",
  recordedAt: "2026-11-12T05:39:58.000Z"
};
assert.equal(
  composeBuild379ProtectedActivation({
    build378: build378Ready,
    protectedAdmissions: [wrongReceipt],
    now
  }).protectedRuntimeEvidenceState,
  "HOLD_EXACT_EVIDENCE_BINDING"
);

assert.equal(authorized.policy.protectedEndpointRequiresEd25519Signature, true);
assert.equal(
  authorized.policy.protectedDatabaseRoleSeparatedFromBrowserRuntime,
  true
);
assert.equal(authorized.policy.activationDecisionMayTurnReceiverOn, false);
assert.equal(authorized.policy.activationDecisionMaySetConnected, false);
assert.equal(authorized.policy.buildGreenMaySetConnected, false);

const migration = source(
  "../../db/migrations/0143_master_yw562_protected_runtime_activation_decision.sql"
);
for (const token of [
  "ai_data_protected_runtime",
  "master_build379_protected_runtime_admission_events",
  "master_build379_supervised_activation_decision_events",
  "master_build379_activation_decision_execution_events",
  "evidence_authority='protected-runtime'",
  "correlation_state='VERIFIED_CORRELATED'",
  "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME",
  "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED",
  "receiver_state text not null check (receiver_state='OFF')",
  "connection_state text not null check (connection_state='DISCONNECTED_HOLD')",
  "masters_synced boolean not null check (masters_synced=false)",
  "force row level security",
  "revoke insert,update,delete on app.master_build379_protected_runtime_admission_events"
]) {
  assert.ok(migration.includes(token), `migration token ${token}`);
}
assert.ok(
  migration.includes(
    "for insert to ai_data_protected_runtime"
  )
);
assert.ok(
  !migration.includes(
    "master_build379_protected_runtime_admission_events\n  for insert to ai_data_runtime"
  )
);

const migrate = source("scripts/migrate.ts");
assert.ok(migrate.includes("create role ai_data_protected_runtime nologin"));
assert.ok(migrate.includes("grant ai_data_protected_runtime to current_user"));

const databaseBase = source("lib/database.ts");
assert.ok(databaseBase.includes("withProtectedDatabase"));
assert.ok(
  databaseBase.includes('set local role ai_data_protected_runtime')
);

const database = source(
  "lib/yw562-protected-runtime-activation-decision-database.ts"
);
for (const token of [
  "withProtectedDatabase",
  "loadBuild378RuntimeQl422ReadinessFromClient",
  "'protected-runtime'",
  "'VERIFIED_CORRELATED'",
  "build379_build378_evidence_not_ready",
  "build379_ql422_protected_correlation_not_closed",
  "executeBuild379SupervisedActivationDecision",
  "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED"
]) {
  assert.ok(database.includes(token), `database token ${token}`);
}

const protectedApi = source(
  "app/api/protected/build379-runtime-evidence/route.ts"
);
for (const token of [
  "BUILD379_PROTECTED_INGEST_PUBLIC_KEY_PEM",
  "createPublicKey",
  "asymmetricKeyType",
  '"ed25519"',
  "verify(",
  "trustedSignerFingerprint",
  "authorityKeyId",
  "build378AiHubRevision",
  "build378CommsRevision",
  "signatureBase64",
  "POST(request: Request)",
  "build379_protected_intake_post_only"
]) {
  assert.ok(protectedApi.includes(token), `protected api token ${token}`);
}
assert.ok(!protectedApi.includes("auth.api.getSession"));
assert.ok(!protectedApi.includes("ownerAttested"));

const ownerApi = source("app/api/yw562-protected-activation/route.ts");
assert.ok(ownerApi.includes("auth.api.getSession"));
assert.ok(ownerApi.includes('action === "execute-supervised-activation-decision"'));
assert.ok(ownerApi.includes("ownerAttested"));

const page = source("app/yw562-protected-activation/page.tsx");
for (const token of [
  "Build 379 · protected runtime evidence &amp; activation decision",
  "Protected evidence is machine-authenticated.",
  "Exact receipt and owner continuity cannot drift.",
  "Decision execution is not runtime activation."
]) {
  assert.ok(page.includes(token), `page token ${token}`);
}

const controls = source("components/Build379ActivationDecisionControls.tsx");
assert.ok(controls.includes("Execute supervised decision"));
assert.ok(controls.includes("APPROVE_ACTIVATION"));
assert.ok(controls.includes("REJECT_ACTIVATION"));
assert.ok(controls.includes("ownerAttested"));

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw562-protected-activation"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw562-protected-activation"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build379_protected_runtime_admission_events"',
  '"master_build379_supervised_activation_decision_events"',
  '"master_build379_activation_decision_execution_events"',
  '"0143_master_yw562_protected_runtime_activation_decision.sql"'
]) {
  assert.ok(spine.includes(token), `db spine token ${token}`);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-379-yw562-protected-runtime-activation-decision.ts";
assert.equal(String(pkg.scripts["verify:build379"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 379 YW562 Protected Runtime Evidence Admission, Exact Receipt/Owner Continuity, QL-422 Protected Correlation Closure & Supervised Activation Decision Execution verification passed."
);
