import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
  verify
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_378,
  BUILD_378_CONTROLLER_BASE_REVISION,
  BUILD_378_REQUIRED_YW_TABLES,
  BUILD_378_RUNTIME,
  build378EvidenceDigest,
  canonicalBuild378RuntimePrerequisitePayload,
  composeBuild378RuntimeQl422Readiness,
  type Build378FreshReceiptAdmissionEvent,
  type Build378Ql422CorrelationEvent,
  type Build378RuntimePrerequisiteEvidence
} from "../lib/yw562-runtime-ql422-protected-readiness";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const now = new Date("2026-11-12T05:40:00.000Z");

assert.equal(BUILD_378, 378);
assert.equal(
  BUILD_378_CONTROLLER_BASE_REVISION,
  "6b09a552bf7e17331ea311bf6c983afadeaa134a"
);
assert.equal(
  BUILD_378_RUNTIME.yw.main,
  "6e0b77eebcfc77aa7fc48dcc398da958af8df696"
);
assert.equal(BUILD_378_RUNTIME.aiHub.build, 312);
assert.equal(
  BUILD_378_RUNTIME.aiHub.main,
  "e64e4b2e79e7c07bbd077284c298207414b149ad"
);
assert.equal(BUILD_378_RUNTIME.comms.build, "QL-422");
assert.equal(
  BUILD_378_RUNTIME.comms.main,
  "5f360821b361b43dd28aa5b2ca4c147565a84f0a"
);
assert.equal(BUILD_378_RUNTIME.aiHub.originalHost, "DESKTOP-AE894KC");

const current = composeBuild378RuntimeQl422Readiness({ now });
assert.equal(
  current.runtimePrerequisiteState,
  "HOLD_NO_RUNTIME_PREREQUISITE_EVIDENCE"
);
assert.equal(current.sourceReceiptState, "HOLD_NO_CURRENT_RECEIPT");
assert.equal(
  current.freshSourceBoundReceiptAdmissionState,
  "HOLD_RUNTIME_PREREQUISITES"
);
assert.equal(
  current.exactOwnerAcceptanceState,
  "HOLD_EXPLICIT_ACCEPT_REQUIRED"
);
assert.equal(current.ql422CorrelationState, "HOLD_NO_QL422_CORRELATION");
assert.equal(
  current.protectedActivationReadinessState,
  "HOLD_RUNTIME_PREREQUISITES"
);
assert.equal(current.protectedActivationReady, false);
assert.equal(current.connectionState, "DISCONNECTED_HOLD");
assert.equal(current.mastersSynced, false);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const canonical = canonicalBuild378RuntimePrerequisitePayload({
  keyId: "yw562-runtime-378",
  sourceProductionRevision: BUILD_378_RUNTIME.yw.main,
  requiredTables: BUILD_378_REQUIRED_YW_TABLES,
  schemaChainVerified: true,
  rlsVerified: true,
  ownerHelperVerified: true,
  protectedSummaryVerified: true,
  evidenceURI: "urn:rosevear:evidence:yw562:runtime-prerequisites:378",
  nonce: "yw562-runtime-378-nonce",
  checkedAt: "2026-11-12T05:37:00.000Z"
});
const signature = sign(null, Buffer.from(canonical, "utf8"), privateKey);
assert.equal(
  verify(null, Buffer.from(canonical, "utf8"), publicKey, signature),
  true
);
assert.match(build378EvidenceDigest(canonical), /^[a-f0-9]{64}$/);
assert.match(build378EvidenceDigest(signature), /^[a-f0-9]{64}$/);
assert.ok(canonical.includes('"environment":"production"'));
assert.ok(canonical.includes(BUILD_378_RUNTIME.yw.main));
for (const table of BUILD_378_REQUIRED_YW_TABLES) {
  assert.ok(canonical.includes(table));
}

const signerEvents = [{
  eventId: "11111111-1111-4111-8111-111111111111",
  sourceId: "yw" as const,
  eventType: "ENROLLED" as const,
  keyId: "yw562-runtime-378",
  publicKeySpkiSha256: "sha256:" + "a".repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:yw562:signer-custody-378",
  independentlyVerifiedAt: "2026-11-12T05:30:00.000Z",
  recordedAt: "2026-11-12T05:30:01.000Z"
}];

const receiptId = "22222222-2222-4222-8222-222222222222";
const receipt = {
  receiptId,
  sourceId: "yw" as const,
  keyId: "yw562-runtime-378",
  sourceRevision: BUILD_378_RUNTIME.yw.main,
  manifestRevision: BUILD_378_RUNTIME.yw.main,
  receiptSha256: "b".repeat(64),
  nonce: "yw562-health-378-nonce",
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
  keyId: "yw562-runtime-378",
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
  replayEvidenceURI: "urn:rosevear:evidence:yw562:replay-378",
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
  evidenceURI: "urn:rosevear:evidence:yw562:owner-accept-378",
  detail: "Explicit Master owner acceptance for exact current YW562 receipt.",
  decidedAt: "2026-11-12T05:36:00.000Z",
  recordedAt: "2026-11-12T05:36:01.000Z"
};

const prerequisite: Build378RuntimePrerequisiteEvidence = {
  evidenceId: "66666666-6666-4666-8666-666666666666",
  sourceId: "yw",
  keyId: "yw562-runtime-378",
  sourceProductionRevision: BUILD_378_RUNTIME.yw.main,
  requiredTables: [...BUILD_378_REQUIRED_YW_TABLES],
  schemaChainVerified: true,
  rlsVerified: true,
  ownerHelperVerified: true,
  protectedSummaryVerified: true,
  evidenceURI: "urn:rosevear:evidence:yw562:runtime-prerequisites:378",
  reportDigest: "e".repeat(64),
  signatureDigest: "f".repeat(64),
  nonce: "yw562-runtime-378-nonce",
  checkedAt: "2026-11-12T05:37:00.000Z",
  recordedAt: "2026-11-12T05:37:01.000Z",
  verificationState: "VERIFIED_CURRENT"
};

const runtimeReady = composeBuild378RuntimeQl422Readiness({
  signerEvents,
  receipts: [receipt],
  admissionEvents: [healthAdmission],
  replayEvents: [replay],
  ownerDecisions: [ownerDecision],
  runtimePrerequisiteEvents: [prerequisite],
  now
});
assert.equal(runtimeReady.runtimePrerequisiteState, "VERIFIED_CURRENT");
assert.equal(runtimeReady.sourceReceiptState, "ACTIVE_CURRENT");
assert.equal(
  runtimeReady.freshSourceBoundReceiptAdmissionState,
  "READY_FOR_RECEIPT_ADMISSION"
);
assert.equal(runtimeReady.exactOwnerAcceptanceState, "ACCEPTED_CURRENT");
assert.equal(
  runtimeReady.protectedActivationReadinessState,
  "HOLD_FRESH_RECEIPT_ADMISSION"
);

const build378Admission: Build378FreshReceiptAdmissionEvent = {
  admissionEventId: "77777777-7777-4777-8777-777777777777",
  prerequisiteEvidenceId: prerequisite.evidenceId,
  receiptId,
  receiptSha256: receipt.receiptSha256,
  sourceRevision: BUILD_378_RUNTIME.yw.main,
  admissionState: "ADMITTED_CURRENT",
  admittedAt: "2026-11-12T05:37:30.000Z",
  recordedAt: "2026-11-12T05:37:31.000Z"
};

const ownerReference: Build378Ql422CorrelationEvent = {
  correlationEventId: "88888888-8888-4888-8888-888888888888",
  evidenceAuthority: "owner-reference-only",
  controllerRevision: BUILD_378_CONTROLLER_BASE_REVISION,
  ywSourceRevision: BUILD_378_RUNTIME.yw.main,
  aiHubMain: BUILD_378_RUNTIME.aiHub.main,
  commsMain: BUILD_378_RUNTIME.comms.main,
  originalHostId: BUILD_378_RUNTIME.aiHub.originalHost,
  sourceEpisodeId: "original_episode_378",
  sourceReceiptDigest: "1".repeat(64),
  receiverAckDigest: "2".repeat(64),
  closureDigest: "3".repeat(64),
  handoffReceiptId: "handoff_receipt_378",
  witnessDigest: "4".repeat(64),
  masterReceipts: [
    { masterId: "rosevear-ai-hub", receiptId: "aih_receipt_378", digest: "5".repeat(64) },
    { masterId: "rosevear-comms-hub", receiptId: "comms_receipt_378", digest: "6".repeat(64) },
    { masterId: "ai-data-platform", receiptId: "aidp_receipt_378", digest: "7".repeat(64) }
  ],
  terminalLedgerDigest: "8".repeat(64),
  evidenceURI: "urn:rosevear:evidence:ql422:reference:378",
  observedAt: "2026-11-12T05:38:00.000Z",
  recordedAt: "2026-11-12T05:38:01.000Z",
  correlationState: "CANDIDATE_HOLD"
};

const referenceHeld = composeBuild378RuntimeQl422Readiness({
  signerEvents,
  receipts: [receipt],
  admissionEvents: [healthAdmission],
  replayEvents: [replay],
  ownerDecisions: [ownerDecision],
  runtimePrerequisiteEvents: [prerequisite],
  freshReceiptAdmissionEvents: [build378Admission],
  ql422CorrelationEvents: [ownerReference],
  now
});
assert.equal(
  referenceHeld.freshSourceBoundReceiptAdmissionState,
  "ADMITTED_CURRENT"
);
assert.equal(referenceHeld.ql422CorrelationState, "HOLD_REFERENCE_ONLY");
assert.equal(
  referenceHeld.protectedActivationReadinessState,
  "HOLD_QL422_CORRELATION"
);
assert.equal(referenceHeld.connectionState, "DISCONNECTED_HOLD");

const protectedQl422: Build378Ql422CorrelationEvent = {
  ...ownerReference,
  correlationEventId: "99999999-9999-4999-8999-999999999999",
  evidenceAuthority: "protected-runtime",
  evidenceURI: "urn:rosevear:evidence:ql422:protected-runtime:378",
  recordedAt: "2026-11-12T05:38:02.000Z",
  correlationState: "VERIFIED_CORRELATED"
};

const ready = composeBuild378RuntimeQl422Readiness({
  signerEvents,
  receipts: [receipt],
  admissionEvents: [healthAdmission],
  replayEvents: [replay],
  ownerDecisions: [ownerDecision],
  runtimePrerequisiteEvents: [prerequisite],
  freshReceiptAdmissionEvents: [build378Admission],
  ql422CorrelationEvents: [ownerReference, protectedQl422],
  now
});
assert.equal(ready.ql422CorrelationState, "VERIFIED_CORRELATED");
assert.equal(
  ready.protectedActivationReadinessState,
  "READY_FOR_PROTECTED_ACTIVATION"
);
assert.equal(ready.protectedActivationReady, true);
assert.equal(ready.connectionState, "DISCONNECTED_HOLD");
assert.equal(ready.mastersSynced, false);

const laterReference = {
  ...ownerReference,
  correlationEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  recordedAt: "2026-11-12T05:39:00.000Z"
};
const protectedPreferred = composeBuild378RuntimeQl422Readiness({
  signerEvents,
  receipts: [receipt],
  admissionEvents: [healthAdmission],
  replayEvents: [replay],
  ownerDecisions: [ownerDecision],
  runtimePrerequisiteEvents: [prerequisite],
  freshReceiptAdmissionEvents: [build378Admission],
  ql422CorrelationEvents: [protectedQl422, laterReference],
  now
});
assert.equal(protectedPreferred.ql422CorrelationState, "VERIFIED_CORRELATED");

const stalePrerequisite = {
  ...prerequisite,
  evidenceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  checkedAt: "2026-11-12T05:20:00.000Z",
  recordedAt: "2026-11-12T05:39:30.000Z"
};
const staleRuntime = composeBuild378RuntimeQl422Readiness({
  signerEvents,
  runtimePrerequisiteEvents: [stalePrerequisite],
  now
});
assert.equal(
  staleRuntime.runtimePrerequisiteState,
  "HOLD_RUNTIME_EVIDENCE_STALE"
);

const incompleteTables = {
  ...prerequisite,
  evidenceId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  requiredTables: BUILD_378_REQUIRED_YW_TABLES.slice(0, 2),
  recordedAt: "2026-11-12T05:39:31.000Z"
};
const tableHeld = composeBuild378RuntimeQl422Readiness({
  signerEvents,
  runtimePrerequisiteEvents: [incompleteTables],
  now
});
assert.equal(
  tableHeld.runtimePrerequisiteState,
  "HOLD_RUNTIME_PREREQUISITES_INCOMPLETE"
);

const wrongHost = {
  ...protectedQl422,
  correlationEventId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  originalHostId: "TEMPLAR",
  recordedAt: "2026-11-12T05:39:32.000Z"
};
assert.equal(
  composeBuild378RuntimeQl422Readiness({
    ql422CorrelationEvents: [wrongHost],
    now
  }).ql422CorrelationState,
  "HOLD_ORIGINAL_HOST_MISMATCH"
);

const staleQl422 = {
  ...protectedQl422,
  correlationEventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  observedAt: "2026-11-12T05:30:00.000Z",
  recordedAt: "2026-11-12T05:39:33.000Z"
};
assert.equal(
  composeBuild378RuntimeQl422Readiness({
    ql422CorrelationEvents: [staleQl422],
    now
  }).ql422CorrelationState,
  "HOLD_QL422_EVIDENCE_STALE"
);

const wrongMasterRevision = {
  ...protectedQl422,
  correlationEventId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  aiHubMain: "0".repeat(40),
  recordedAt: "2026-11-12T05:39:34.000Z"
};
assert.equal(
  composeBuild378RuntimeQl422Readiness({
    ql422CorrelationEvents: [wrongMasterRevision],
    now
  }).ql422CorrelationState,
  "HOLD_QL422_REVISION_MISMATCH"
);

const rejectedOwner = {
  ...ownerDecision,
  decisionId: "12121212-1212-4212-8212-121212121212",
  decision: "REJECT" as const,
  recordedAt: "2026-11-12T05:39:35.000Z"
};
const ownerHeld = composeBuild378RuntimeQl422Readiness({
  signerEvents,
  receipts: [receipt],
  admissionEvents: [healthAdmission],
  replayEvents: [replay],
  ownerDecisions: [rejectedOwner],
  runtimePrerequisiteEvents: [prerequisite],
  freshReceiptAdmissionEvents: [build378Admission],
  ql422CorrelationEvents: [protectedQl422],
  now
});
assert.equal(ownerHeld.exactOwnerAcceptanceState, "REJECTED_CURRENT");
assert.equal(
  ownerHeld.protectedActivationReadinessState,
  "HOLD_MASTER_OWNER_ACCEPTANCE"
);

assert.equal(current.policy.ownerReferenceMaySetQl422Verified, false);
assert.equal(current.policy.readinessMayActivateConnection, false);
assert.equal(current.policy.buildGreenMayActivateConnection, false);
assert.equal(current.policy.rawPrivateKeysAccepted, false);
assert.equal(current.policy.rawTransportSecretsAccepted, false);

const migration = source(
  "../../db/migrations/0142_master_yw562_runtime_ql422_protected_readiness.sql"
);
for (const token of [
  "master_yw562_runtime_prerequisite_evidence_intakes",
  "master_yw562_fresh_source_receipt_admission_events",
  "master_ql422_original_host_three_master_correlation_events",
  "master_build378_protected_activation_readiness_events",
  "owner-reference-only",
  "protected-runtime",
  "CANDIDATE_HOLD",
  "VERIFIED_CORRELATED",
  "READY_FOR_PROTECTED_ACTIVATION",
  "enable row level security",
  "force row level security",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), `migration token ${token}`);
}
assert.ok(
  migration.includes(
    "evidence_authority='owner-reference-only'\n    and correlation_state='CANDIDATE_HOLD'"
  )
);
assert.ok(
  migration.includes(
    "evidence_authority='protected-runtime'\n      and actor_user_id is null"
  )
);
assert.ok(!migration.toLowerCase().includes("private_key"));
assert.ok(!migration.toLowerCase().includes("transport_secret"));

const database = source(
  "lib/yw562-runtime-ql422-protected-readiness-database.ts"
);
for (const token of [
  "createPublicKey",
  "verify(",
  "trustedSignerFingerprint",
  "ENROLLMENT_COMMITTED",
  "build378_runtime_signature_invalid",
  "intakeBuild378RuntimePrerequisiteEvidence",
  "admitBuild378FreshSourceBoundReceipt",
  "recordBuild378Ql422ReferenceCandidate",
  "recordBuild378ProtectedActivationReadiness"
]) {
  assert.ok(database.includes(token), `database token ${token}`);
}
assert.ok(database.includes("'owner-reference-only'"));
assert.ok(database.includes("'CANDIDATE_HOLD'"));
assert.ok(!database.includes("'protected-runtime'"));
assert.ok(!database.includes("'VERIFIED_CORRELATED'"));

const api = source("app/api/yw562-runtime-ql422-readiness/route.ts");
for (const token of [
  'action === "intake-runtime-prerequisites"',
  'action === "admit-fresh-receipt"',
  'action === "record-ql422-reference"',
  'action === "recheck-readiness"'
]) {
  assert.ok(api.includes(token), `api token ${token}`);
}
assert.ok(!api.includes("evidenceAuthority"));
assert.ok(!api.includes("VERIFIED_CORRELATED"));
assert.ok(!api.includes("CONNECTED"));

const page = source("app/yw562-runtime-ql422-readiness/page.tsx");
for (const token of [
  "Build 378 · YW562 runtime prerequisites &amp; QL-422 readiness",
  "YW562 prerequisites must be source-signed.",
  "A fresh receipt is admitted only after runtime proof.",
  "Owner references cannot become QL-422 proof.",
  "READY is not CONNECTED."
]) {
  assert.ok(page.includes(token), `page token ${token}`);
}

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw562-runtime-ql422-readiness"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw562-runtime-ql422-readiness"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_yw562_runtime_prerequisite_evidence_intakes"',
  '"master_yw562_fresh_source_receipt_admission_events"',
  '"master_ql422_original_host_three_master_correlation_events"',
  '"master_build378_protected_activation_readiness_events"',
  '"0142_master_yw562_runtime_ql422_protected_readiness.sql"'
]) {
  assert.ok(spine.includes(token), `db spine token ${token}`);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-378-yw562-runtime-ql422-protected-readiness.ts";
assert.equal(String(pkg.scripts["verify:build378"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 378 YW562 Runtime Prerequisite Evidence Intake, Fresh Source-Bound Receipt Admission, QL-422 Original-Host Witness/Three-Master Ledger Correlation & Protected Activation Readiness verification passed."
);
