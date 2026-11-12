import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
  verify
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { Build379ProtectedActivationModel } from "../lib/yw562-protected-runtime-activation-decision";
import {
  BUILD_380,
  BUILD_380_CONTROLLER_BASE_REVISION,
  BUILD_380_RUNTIME,
  build380Digest,
  canonicalBuild380ExternalActivationEnvelope,
  canonicalBuild380MasterRuntimeReceipt,
  composeBuild380ExternalRuntimeActivation,
  type Build380CeremonyEvent,
  type Build380ConnectedTransitionEvent,
  type Build380ExternalActivationEnvelope,
  type Build380RegistryEvidence,
  type Build380SyncClosureEvent
} from "../lib/yw562-external-runtime-activation-closure";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");
const now = new Date("2026-11-12T07:20:00.000Z");

assert.equal(BUILD_380, 380);
assert.equal(
  BUILD_380_CONTROLLER_BASE_REVISION,
  "ce4216c667b514f40e2fb6e506e5b62c222b1736"
);
assert.equal(
  BUILD_380_RUNTIME.yw.main,
  "6e0b77eebcfc77aa7fc48dcc398da958af8df696"
);
assert.equal(BUILD_380_RUNTIME.aiHub.build, 313);
assert.equal(
  BUILD_380_RUNTIME.aiHub.main,
  "b790adf2e19343d1132fad0eef8107c21e3e560d"
);
assert.equal(BUILD_380_RUNTIME.comms.build, "QL-423");
assert.equal(
  BUILD_380_RUNTIME.comms.main,
  "2adc527a88adb790f0edc5192df62f03be8c397c"
);
assert.equal(BUILD_380_RUNTIME.aiHub.originalHost, "DESKTOP-AE894KC");

const receiptId = "11111111-1111-4111-8111-111111111111";
const ownerDecisionId = "22222222-2222-4222-8222-222222222222";
const protectedAdmissionEventId =
  "33333333-3333-4333-8333-333333333333";
const build379DecisionEventId =
  "44444444-4444-4444-8444-444444444444";
const build379ExecutionEventId =
  "55555555-5555-4555-8555-555555555555";

const build379Authorized = {
  build378: {
    sourceReceiptState: "ACTIVE_CURRENT",
    exactOwnerAcceptanceState: "ACCEPTED_CURRENT",
    exactCurrentReceiptId: receiptId,
    exactOwnerDecisionId: ownerDecisionId,
    exactCurrentReceipt: {
      receiptId,
      receiptSha256: "a".repeat(64)
    }
  },
  latestProtectedAdmission: {
    admissionEventId: protectedAdmissionEventId
  },
  latestActivationDecision: {
    decisionEventId: build379DecisionEventId,
    protectedAdmissionEventId,
    exactReceiptId: receiptId,
    ownerDecisionId,
    decision: "APPROVE_ACTIVATION",
    decisionState: "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME"
  },
  latestActivationExecution: {
    executionEventId: build379ExecutionEventId,
    decisionEventId: build379DecisionEventId,
    protectedAdmissionEventId,
    exactReceiptId: receiptId,
    executionState: "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED"
  },
  supervisedActivationDecisionState:
    "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME"
} as unknown as Build379ProtectedActivationModel;

const registryTest: Build380RegistryEvidence = {
  evidenceId: "66666666-6666-4666-8666-666666666666",
  sourceId: "yw",
  recordVersion: 7,
  environment: "production",
  declaredStatus: "TEST_VERIFIED",
  statusObservedAt: "2026-11-12T07:15:00.000Z",
  statusExpiresAt: "2026-11-12T07:30:00.000Z",
  evidenceURI: "urn:rosevear:evidence:yw562:test:380",
  manifestURI: "https://example.invalid/.well-known/rosevear-integration-manifest.json",
  immutableRevision: BUILD_380_RUNTIME.yw.main,
  capabilityVersion: "yw562",
  approvedOrigin: "https://example.invalid",
  signerKeyId: "yw562-connection-key",
  signerFingerprint: "sha256:" + "b".repeat(64),
  rolesAllowed: ["platform_shell"],
  holdReason: null,
  testEvidenceURI: "urn:rosevear:evidence:yw562:test-proof:380",
  connectionEvidenceURI: null,
  ownerAuthorized: true,
  independentTestVerified: true,
  independentConnectionVerified: false,
  evidenceAuthority: "independent-source-verification"
};

const ready = composeBuild380ExternalRuntimeActivation({
  build379: build379Authorized,
  latestRegistryEvidence: registryTest,
  now
});
assert.equal(ready.build379AuthorizationState, "AUTHORIZED_CURRENT");
assert.equal(ready.registryState, "READY_FOR_PROTECTED_ACTIVATION");
assert.equal(
  ready.externalRuntimeActivationCeremonyState,
  "READY_FOR_EXTERNAL_ACTIVATION_CEREMONY"
);
assert.equal(ready.receiverStateProof, "HOLD_NO_EXTERNAL_ACTIVATION_CEREMONY");
assert.equal(ready.connectionState, "DISCONNECTED_HOLD");
assert.equal(ready.mastersSynced, false);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const authorityKeyId = "sha256:" + "c".repeat(64);
const envelope: Build380ExternalActivationEnvelope = {
  authorityKeyId,
  controllerRevision: BUILD_380_CONTROLLER_BASE_REVISION,
  sourceRevision: BUILD_380_RUNTIME.yw.main,
  aiHubMain: BUILD_380_RUNTIME.aiHub.main,
  commsMain: BUILD_380_RUNTIME.comms.main,
  originalHostId: BUILD_380_RUNTIME.aiHub.originalHost,
  build379ProtectedAdmissionEventId: protectedAdmissionEventId,
  build379DecisionEventId,
  build379ExecutionEventId,
  exactReceiptId: receiptId,
  exactReceiptSha256: "a".repeat(64),
  ownerDecisionId,
  priorRegistryEvidenceId: registryTest.evidenceId,
  receiverInstanceId: "comms-receiver-instance-380",
  receiverBootId: "boot-380-0001",
  receiverStartedAt: "2026-11-12T07:16:00.000Z",
  receiverProbeObservedAt: "2026-11-12T07:18:30.000Z",
  receiverProofURI: "urn:rosevear:evidence:build380:receiver-on",
  receiverProofDigest: "d".repeat(64),
  sourceHandshakeReceiptId: "yw562-handshake-380",
  sourceHandshakeDigest: "e".repeat(64),
  aiHubConnection: "CONNECTED",
  aiHubMasterSync: "SYNCED",
  commsReceiver: "ON",
  commsConnection: "CONNECTED",
  commsOwnerAcceptance: "ACCEPTED",
  commsSlaveGate: "OPEN",
  controllerGate: "OPEN",
  masterReceipts: [
    {
      masterId: "rosevear-ai-hub",
      receiptId: "aih-runtime-380",
      digest: "1".repeat(64),
      runtimeState: "CONNECTED_SYNCED",
      signerKeyId: "sha256:" + "1".repeat(64),
      signatureSha256: "5".repeat(64)
    },
    {
      masterId: "rosevear-comms-hub",
      receiptId: "comms-runtime-380",
      digest: "2".repeat(64),
      runtimeState: "CONNECTED_SYNCED",
      signerKeyId: "sha256:" + "2".repeat(64),
      signatureSha256: "6".repeat(64)
    },
    {
      masterId: "ai-data-platform",
      receiptId: "aidp-runtime-380",
      digest: "3".repeat(64),
      runtimeState: "CONNECTED_SYNCED",
      signerKeyId: "sha256:" + "3".repeat(64),
      signatureSha256: "7".repeat(64)
    }
  ],
  terminalSyncDigest: "4".repeat(64),
  evidenceURI: "urn:rosevear:evidence:build380:activation-ceremony",
  nonce: "build380-runtime-nonce-0001",
  observedAt: "2026-11-12T07:19:00.000Z"
};

const canonical = canonicalBuild380ExternalActivationEnvelope(envelope);
const signature = sign(null, Buffer.from(canonical, "utf8"), privateKey);
assert.equal(
  verify(null, Buffer.from(canonical, "utf8"), publicKey, signature),
  true
);
assert.match(build380Digest(canonical), /^[a-f0-9]{64}$/);
assert.match(build380Digest(signature), /^[a-f0-9]{64}$/);
assert.ok(canonical.includes(BUILD_380_RUNTIME.aiHub.main));
assert.ok(canonical.includes(BUILD_380_RUNTIME.comms.main));
assert.ok(canonical.includes(build379DecisionEventId));
assert.ok(canonical.includes(receiptId));

const masterBinding = {
  controllerRevision: envelope.controllerRevision,
  sourceRevision: envelope.sourceRevision,
  aiHubMain: envelope.aiHubMain,
  commsMain: envelope.commsMain,
  exactReceiptId: envelope.exactReceiptId,
  build379DecisionEventId: envelope.build379DecisionEventId,
  observedAt: envelope.observedAt
};
const masterCanonical = canonicalBuild380MasterRuntimeReceipt(
  {
    masterId: "ai-data-platform",
    receiptId: "aidp-runtime-380",
    digest: "3".repeat(64),
    runtimeState: "CONNECTED_SYNCED",
    signerKeyId: "sha256:" + "3".repeat(64)
  },
  masterBinding
);
const masterSignature = sign(
  null,
  Buffer.from(masterCanonical, "utf8"),
  privateKey
);
assert.equal(
  verify(
    null,
    Buffer.from(masterCanonical, "utf8"),
    publicKey,
    masterSignature
  ),
  true
);
assert.ok(masterCanonical.includes(BUILD_380_CONTROLLER_BASE_REVISION));
assert.ok(masterCanonical.includes(build379DecisionEventId));

const ceremony: Build380CeremonyEvent = {
  ceremonyEventId: "77777777-7777-4777-8777-777777777777",
  authorityKeyId,
  authorityKeySpkiSha256: authorityKeyId,
  envelopeSha256: build380Digest(canonical),
  signatureSha256: build380Digest(signature),
  nonce: envelope.nonce,
  controllerRevision: envelope.controllerRevision,
  sourceRevision: envelope.sourceRevision,
  aiHubMain: envelope.aiHubMain,
  commsMain: envelope.commsMain,
  originalHostId: envelope.originalHostId,
  build379ProtectedAdmissionEventId: protectedAdmissionEventId,
  build379DecisionEventId,
  build379ExecutionEventId,
  exactReceiptId: receiptId,
  ownerDecisionId,
  priorRegistryEvidenceId: registryTest.evidenceId,
  receiverInstanceId: envelope.receiverInstanceId,
  receiverBootId: envelope.receiverBootId,
  receiverStartedAt: envelope.receiverStartedAt,
  receiverProbeObservedAt: envelope.receiverProbeObservedAt,
  receiverProofURI: envelope.receiverProofURI,
  receiverProofDigest: envelope.receiverProofDigest,
  sourceHandshakeReceiptId: envelope.sourceHandshakeReceiptId,
  sourceHandshakeDigest: envelope.sourceHandshakeDigest,
  terminalSyncDigest: envelope.terminalSyncDigest,
  evidenceURI: envelope.evidenceURI,
  ceremonyState: "VERIFIED_EXECUTED",
  receiverState: "ON",
  observedAt: envelope.observedAt,
  recordedAt: "2026-11-12T07:19:01.000Z"
};

const ceremonyOnly = composeBuild380ExternalRuntimeActivation({
  build379: build379Authorized,
  latestRegistryEvidence: registryTest,
  ceremonyEvents: [ceremony],
  now
});
assert.equal(ceremonyOnly.build379AuthorizationState, "AUTHORIZED_CONTINUOUS");
assert.equal(ceremonyOnly.receiverStateProof, "ON_VERIFIED_CURRENT");
assert.equal(
  ceremonyOnly.verifiedConnectedTransitionState,
  "HOLD_NO_VERIFIED_CONNECTED_TRANSITION"
);
assert.equal(ceremonyOnly.connectionState, "DISCONNECTED_HOLD");

const registryConnected: Build380RegistryEvidence = {
  ...registryTest,
  evidenceId: "88888888-8888-4888-8888-888888888888",
  recordVersion: 8,
  declaredStatus: "CONNECTED",
  statusObservedAt: envelope.observedAt,
  statusExpiresAt: "2026-11-12T07:29:00.000Z",
  evidenceURI: envelope.evidenceURI,
  connectionEvidenceURI: envelope.receiverProofURI,
  independentConnectionVerified: true
};

const connectedTransition: Build380ConnectedTransitionEvent = {
  transitionEventId: "99999999-9999-4999-8999-999999999999",
  ceremonyEventId: ceremony.ceremonyEventId,
  registryEvidenceId: registryConnected.evidenceId,
  exactReceiptId: receiptId,
  ownerDecisionId,
  build379DecisionEventId,
  transitionState: "CONNECTED_VERIFIED",
  connectionState: "CONNECTED",
  receiverState: "ON",
  verifiedAt: envelope.observedAt,
  recordedAt: "2026-11-12T07:19:02.000Z"
};

const transitionOnly = composeBuild380ExternalRuntimeActivation({
  build379: build379Authorized,
  latestRegistryEvidence: registryConnected,
  ceremonyEvents: [ceremony],
  transitionEvents: [connectedTransition],
  now
});
assert.equal(
  transitionOnly.verifiedConnectedTransitionState,
  "CONNECTED_VERIFIED"
);
assert.equal(
  transitionOnly.threeMasterSynchronizationClosureState,
  "HOLD_NO_THREE_MASTER_CLOSURE"
);
assert.equal(transitionOnly.connectionState, "DISCONNECTED_HOLD");

const closure: Build380SyncClosureEvent = {
  closureEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  ceremonyEventId: ceremony.ceremonyEventId,
  transitionEventId: connectedTransition.transitionEventId,
  aiHubRuntimeReceiptId: "aih-runtime-380",
  aiHubRuntimeDigest: "1".repeat(64),
  aiHubSignerKeyId: "sha256:" + "1".repeat(64),
  aiHubSignatureSha256: "5".repeat(64),
  commsRuntimeReceiptId: "comms-runtime-380",
  commsRuntimeDigest: "2".repeat(64),
  commsSignerKeyId: "sha256:" + "2".repeat(64),
  commsSignatureSha256: "6".repeat(64),
  controllerRuntimeReceiptId: "aidp-runtime-380",
  controllerRuntimeDigest: "3".repeat(64),
  controllerSignerKeyId: "sha256:" + "3".repeat(64),
  controllerSignatureSha256: "7".repeat(64),
  terminalSyncDigest: envelope.terminalSyncDigest,
  closureState: "CLOSED_VERIFIED",
  mastersSynced: true,
  closedAt: envelope.observedAt,
  recordedAt: "2026-11-12T07:19:03.000Z"
};

const connected = composeBuild380ExternalRuntimeActivation({
  build379: build379Authorized,
  latestRegistryEvidence: registryConnected,
  ceremonyEvents: [ceremony],
  transitionEvents: [connectedTransition],
  closureEvents: [closure],
  now
});
assert.equal(connected.receiverStateProof, "ON_VERIFIED_CURRENT");
assert.equal(connected.verifiedConnectedTransitionState, "CONNECTED_VERIFIED");
assert.equal(
  connected.threeMasterSynchronizationClosureState,
  "CLOSED_VERIFIED"
);
assert.equal(connected.connectionState, "CONNECTED");
assert.equal(connected.mastersSynced, true);

const staleCeremony: Build380CeremonyEvent = {
  ...ceremony,
  ceremonyEventId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  observedAt: "2026-11-12T07:00:00.000Z",
  receiverProbeObservedAt: "2026-11-12T07:00:00.000Z",
  recordedAt: "2026-11-12T07:19:59.000Z"
};
const stale = composeBuild380ExternalRuntimeActivation({
  build379: build379Authorized,
  latestRegistryEvidence: registryConnected,
  ceremonyEvents: [staleCeremony],
  transitionEvents: [connectedTransition],
  closureEvents: [closure],
  now
});
assert.equal(stale.receiverStateProof, "HOLD_RECEIVER_PROOF_STALE");
assert.equal(stale.connectionState, "DISCONNECTED_HOLD");
assert.equal(stale.mastersSynced, false);

const changedReceipt379 = {
  ...build379Authorized,
  build378: {
    ...build379Authorized.build378,
    exactCurrentReceiptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
  }
} as unknown as Build379ProtectedActivationModel;
const changed = composeBuild380ExternalRuntimeActivation({
  build379: changedReceipt379,
  latestRegistryEvidence: registryConnected,
  ceremonyEvents: [ceremony],
  transitionEvents: [connectedTransition],
  closureEvents: [closure],
  now
});
assert.equal(
  changed.build379AuthorizationState,
  "HOLD_BUILD379_AUTHORIZATION_CONTINUITY"
);
assert.equal(changed.connectionState, "DISCONNECTED_HOLD");

assert.equal(connected.policy.browserMaySetReceiverOn, false);
assert.equal(connected.policy.browserMaySetConnected, false);
assert.equal(connected.policy.codeGreenMaySetConnected, false);
assert.equal(connected.policy.threeDistinctMasterRuntimeReceiptsRequired, true);

const migration = source(
  "../../db/migrations/0144_master_yw562_external_runtime_activation_closure.sql"
);
for (const token of [
  "master_build380_external_runtime_activation_ceremony_events",
  "master_build380_verified_connected_transition_events",
  "master_build380_three_master_sync_closure_events",
  "for insert to ai_data_protected_runtime",
  "declared_status='CONNECTED'",
  "evidence_authority='independent-source-verification'",
  "ceremony_state='VERIFIED_EXECUTED'",
  "receiver_state='ON'",
  "transition_state='CONNECTED_VERIFIED'",
  "connection_state='CONNECTED'",
  "closure_state='CLOSED_VERIFIED'",
  "masters_synced=true",
  "ai_hub_signature_sha256",
  "comms_signature_sha256",
  "controller_signature_sha256",
  "force row level security"
]) {
  assert.ok(migration.includes(token), `migration token ${token}`);
}
assert.ok(
  migration.includes(
    "master_shell_source_registry_evidence_build380_protected_insert"
  )
);
assert.ok(
  migration.includes(
    "master_build379_supervised_activation_decision_events_build380_protected_select"
  )
);
assert.ok(
  !migration.includes(
    "master_build380_external_runtime_activation_ceremony_events\n  for insert to ai_data_runtime"
  )
);

const database = source(
  "lib/yw562-external-runtime-activation-closure-database.ts"
);
for (const token of [
  "withProtectedDatabase",
  "loadBuild379ProtectedActivationFromClient",
  "validateMasterShellSourceTransition",
  'declaredStatus: "CONNECTED"',
  "independentConnectionVerified: true",
  "master_build380_external_runtime_activation_ceremony_events",
  "master_build380_verified_connected_transition_events",
  "master_build380_three_master_sync_closure_events",
  "build380_post_write_connected_closure_not_verified"
]) {
  assert.ok(database.includes(token), `database token ${token}`);
}

const build379Database = source(
  "lib/yw562-protected-runtime-activation-decision-database.ts"
);
assert.ok(
  build379Database.includes(
    "export async function loadBuild379ProtectedActivationFromClient"
  )
);

const protectedApi = source(
  "app/api/protected/build380-runtime-activation/route.ts"
);
for (const token of [
  "BUILD380_EXTERNAL_ACTIVATION_PUBLIC_KEY_PEM",
  "BUILD380_AI_HUB_RUNTIME_PUBLIC_KEY_PEM",
  "BUILD380_COMMS_RUNTIME_PUBLIC_KEY_PEM",
  "BUILD380_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM",
  "createPublicKey",
  '"ed25519"',
  "trustedSignerFingerprint",
  "canonicalBuild380ExternalActivationEnvelope",
  "canonicalBuild380MasterRuntimeReceipt",
  "MASTER_KEY_ENV",
  "master_signer_key_id",
  "master_receipt_signature",
  "verify(",
  "signatureBase64",
  "CONNECTED_SYNCED",
  "commsReceiver",
  "controllerGate",
  "build380_protected_activation_post_only"
]) {
  assert.ok(protectedApi.includes(token), `protected api token ${token}`);
}
assert.ok(!protectedApi.includes("auth.api.getSession"));
assert.ok(!protectedApi.includes("ownerAttested"));

const readApi = source(
  "app/api/yw562-runtime-activation-closure/route.ts"
);
assert.ok(readApi.includes("auth.api.getSession"));
assert.ok(!readApi.includes("export async function POST"));

const page = source("app/yw562-runtime-activation-closure/page.tsx");
for (const token of [
  "Build 380 · protected external runtime activation",
  "The browser cannot perform the ceremony.",
  "CONNECTED is a protected transition, not a UI choice.",
  "Freshness remains fail-closed."
]) {
  assert.ok(page.includes(token), `page token ${token}`);
}

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw562-runtime-activation-closure"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw562-runtime-activation-closure"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build380_external_runtime_activation_ceremony_events"',
  '"master_build380_verified_connected_transition_events"',
  '"master_build380_three_master_sync_closure_events"',
  '"0144_master_yw562_external_runtime_activation_closure.sql"'
]) {
  assert.ok(spine.includes(token), `db spine token ${token}`);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-380-yw562-external-runtime-activation-closure.ts";
assert.equal(String(pkg.scripts["verify:build380"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 380 Protected External Runtime Activation Ceremony, Receiver-State Proof, Verified CONNECTED Transition & Three-Master Synchronization Closure verification passed."
);
