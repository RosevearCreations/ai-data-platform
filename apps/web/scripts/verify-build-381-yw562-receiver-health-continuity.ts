import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
  verify
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { Build380ExternalRuntimeActivationModel } from "../lib/yw562-external-runtime-activation-closure";
import {
  BUILD_381,
  BUILD_381_CONTROLLER_BASE_REVISION,
  BUILD_381_RUNTIME,
  build381Digest,
  canonicalBuild381MasterRenewalReceipt,
  canonicalBuild381ReceiverOffProof,
  canonicalBuild381RenewalEnvelope,
  canonicalBuild381RollbackEnvelope,
  composeBuild381ReceiverHealthContinuity,
  type Build381RenewalEnvelope,
  type Build381RenewalEvent,
  type Build381RollbackEnvelope,
  type Build381RollbackEvent
} from "../lib/yw562-receiver-health-continuity";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");
const now = new Date("2026-11-12T17:30:00.000Z");

assert.equal(BUILD_381, 381);
assert.equal(
  BUILD_381_CONTROLLER_BASE_REVISION,
  "ccd291f22e15750392fa3995dc3d5811c506cd05"
);
assert.equal(
  BUILD_381_RUNTIME.yw.main,
  "6e0b77eebcfc77aa7fc48dcc398da958af8df696"
);
assert.equal(BUILD_381_RUNTIME.aiHub.build, 321);
assert.equal(
  BUILD_381_RUNTIME.aiHub.main,
  "dbc3fd8ae7f8df3bfc85a402a00b0954648ec543"
);
assert.equal(BUILD_381_RUNTIME.comms.build, "QL-432");
assert.equal(
  BUILD_381_RUNTIME.comms.main,
  "f28f14f67d3ecd5fad9972d6f0500c14de0f89b7"
);
assert.equal(BUILD_381_RUNTIME.aiHub.originalHost, "DESKTOP-AE894KC");

const build380 = {
  connectionState: "CONNECTED",
  mastersSynced: true,
  receiverStateProof: "ON_VERIFIED_CURRENT",
  verifiedConnectedTransitionState: "CONNECTED_VERIFIED",
  threeMasterSynchronizationClosureState: "CLOSED_VERIFIED",
  latestCeremony: {
    ceremonyEventId: "11111111-1111-4111-8111-111111111111",
    receiverState: "ON"
  },
  latestConnectedTransition: {
    transitionEventId: "22222222-2222-4222-8222-222222222222",
    transitionState: "CONNECTED_VERIFIED",
    connectionState: "CONNECTED"
  },
  latestThreeMasterClosure: {
    closureEventId: "33333333-3333-4333-8333-333333333333",
    closureState: "CLOSED_VERIFIED",
    mastersSynced: true
  },
  latestRegistryEvidence: {
    evidenceId: "44444444-4444-4444-8444-444444444444",
    sourceId: "yw",
    recordVersion: 9,
    environment: "production",
    declaredStatus: "CONNECTED",
    statusObservedAt: "2026-11-12T17:28:00.000Z",
    statusExpiresAt: "2026-11-12T17:35:00.000Z",
    evidenceURI: "urn:rosevear:evidence:build380:connected",
    manifestURI: "https://example.invalid/.well-known/rosevear-integration-manifest.json",
    immutableRevision: BUILD_381_RUNTIME.yw.main,
    capabilityVersion: "yw562",
    approvedOrigin: "https://example.invalid",
    signerKeyId: "yw562-health",
    signerFingerprint: "sha256:" + "a".repeat(64),
    rolesAllowed: ["platform_shell"],
    holdReason: null,
    testEvidenceURI: "urn:rosevear:evidence:yw562:test",
    connectionEvidenceURI: "urn:rosevear:evidence:build380:receiver-on",
    ownerAuthorized: true,
    independentTestVerified: true,
    independentConnectionVerified: true,
    evidenceAuthority: "independent-source-verification"
  }
} as unknown as Build380ExternalRuntimeActivationModel;

const noRenewal = composeBuild381ReceiverHealthContinuity({
  build380,
  now
});
assert.equal(noRenewal.build380ConnectedPrerequisite, "CONNECTED_CURRENT");
assert.equal(
  noRenewal.receiverHealthContinuityState,
  "HOLD_NO_RUNTIME_RENEWAL"
);
assert.equal(noRenewal.rollbackState, "ROLLBACK_REQUIRED_FAIL_CLOSED");
assert.equal(noRenewal.connectionState, "DISCONNECTED_HOLD");
assert.equal(noRenewal.mastersSynced, false);

const renewalEnvelope: Build381RenewalEnvelope = {
  authorityKeyId: "sha256:" + "b".repeat(64),
  controllerRevision: BUILD_381_CONTROLLER_BASE_REVISION,
  sourceRevision: BUILD_381_RUNTIME.yw.main,
  aiHubMain: BUILD_381_RUNTIME.aiHub.main,
  commsMain: BUILD_381_RUNTIME.comms.main,
  originalHostId: BUILD_381_RUNTIME.aiHub.originalHost,
  build380CeremonyEventId:
    build380.latestCeremony!.ceremonyEventId,
  build380TransitionEventId:
    build380.latestConnectedTransition!.transitionEventId,
  build380ClosureEventId:
    build380.latestThreeMasterClosure!.closureEventId,
  registryEvidenceId:
    build380.latestRegistryEvidence!.evidenceId,
  receiverInstanceId: "receiver-381",
  receiverBootId: "boot-381",
  receiverHealthSequence: 17,
  receiverState: "ON",
  receiverObservedAt: "2026-11-12T17:29:10.000Z",
  receiverHealthURI: "urn:rosevear:evidence:build381:receiver-health",
  receiverHealthDigest: "1".repeat(64),
  masterReceipts: [
    {
      masterId: "rosevear-ai-hub",
      receiptId: "aih-381",
      digest: "2".repeat(64),
      runtimeState: "CONNECTED_HEALTHY",
      signerKeyId: "sha256:" + "c".repeat(64),
      signatureSha256: "3".repeat(64)
    },
    {
      masterId: "rosevear-comms-hub",
      receiptId: "comms-381",
      digest: "4".repeat(64),
      runtimeState: "CONNECTED_HEALTHY",
      signerKeyId: "sha256:" + "d".repeat(64),
      signatureSha256: "5".repeat(64)
    },
    {
      masterId: "ai-data-platform",
      receiptId: "aidp-381",
      digest: "6".repeat(64),
      runtimeState: "CONNECTED_HEALTHY",
      signerKeyId: "sha256:" + "e".repeat(64),
      signatureSha256: "7".repeat(64)
    }
  ],
  renewalDigest: "8".repeat(64),
  evidenceURI: "urn:rosevear:evidence:build381:renewal",
  nonce: "build381-renewal-nonce-0001",
  observedAt: "2026-11-12T17:29:20.000Z"
};

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const binding = {
  controllerRevision: renewalEnvelope.controllerRevision,
  sourceRevision: renewalEnvelope.sourceRevision,
  aiHubMain: renewalEnvelope.aiHubMain,
  commsMain: renewalEnvelope.commsMain,
  build380CeremonyEventId: renewalEnvelope.build380CeremonyEventId,
  build380TransitionEventId: renewalEnvelope.build380TransitionEventId,
  build380ClosureEventId: renewalEnvelope.build380ClosureEventId,
  registryEvidenceId: renewalEnvelope.registryEvidenceId,
  receiverHealthSequence: renewalEnvelope.receiverHealthSequence,
  observedAt: renewalEnvelope.observedAt
};
const masterCanonical = canonicalBuild381MasterRenewalReceipt(
  {
    masterId: "ai-data-platform",
    receiptId: "aidp-381",
    digest: "6".repeat(64),
    runtimeState: "CONNECTED_HEALTHY",
    signerKeyId: "sha256:" + "e".repeat(64)
  },
  binding
);
const masterSignature = sign(
  null,
  Buffer.from(masterCanonical, "utf8"),
  privateKey
);
assert.equal(
  verify(null, Buffer.from(masterCanonical, "utf8"), publicKey, masterSignature),
  true
);

const renewalCanonical = canonicalBuild381RenewalEnvelope(renewalEnvelope);
const renewalSignature = sign(
  null,
  Buffer.from(renewalCanonical, "utf8"),
  privateKey
);
assert.equal(
  verify(
    null,
    Buffer.from(renewalCanonical, "utf8"),
    publicKey,
    renewalSignature
  ),
  true
);
assert.match(build381Digest(renewalCanonical), /^[a-f0-9]{64}$/);
assert.ok(renewalCanonical.includes(BUILD_381_RUNTIME.aiHub.main));
assert.ok(renewalCanonical.includes(BUILD_381_RUNTIME.comms.main));

const renewal: Build381RenewalEvent = {
  renewalEventId: "55555555-5555-4555-8555-555555555555",
  authorityKeyId: renewalEnvelope.authorityKeyId,
  authorityKeySpkiSha256: renewalEnvelope.authorityKeyId,
  envelopeSha256: build381Digest(renewalCanonical),
  signatureSha256: build381Digest(renewalSignature),
  nonce: renewalEnvelope.nonce,
  controllerRevision: renewalEnvelope.controllerRevision,
  sourceRevision: renewalEnvelope.sourceRevision,
  aiHubMain: renewalEnvelope.aiHubMain,
  commsMain: renewalEnvelope.commsMain,
  originalHostId: renewalEnvelope.originalHostId,
  build380CeremonyEventId: renewalEnvelope.build380CeremonyEventId,
  build380TransitionEventId: renewalEnvelope.build380TransitionEventId,
  build380ClosureEventId: renewalEnvelope.build380ClosureEventId,
  registryEvidenceId: renewalEnvelope.registryEvidenceId,
  renewedRegistryEvidenceId: "66666666-6666-4666-8666-666666666666",
  receiverInstanceId: renewalEnvelope.receiverInstanceId,
  receiverBootId: renewalEnvelope.receiverBootId,
  receiverHealthSequence: renewalEnvelope.receiverHealthSequence,
  receiverState: "ON",
  receiverObservedAt: renewalEnvelope.receiverObservedAt,
  receiverHealthURI: renewalEnvelope.receiverHealthURI,
  receiverHealthDigest: renewalEnvelope.receiverHealthDigest,
  aiHubRuntimeReceiptId: "aih-381",
  aiHubRuntimeDigest: "2".repeat(64),
  aiHubSignerKeyId: "sha256:" + "c".repeat(64),
  aiHubSignatureSha256: "3".repeat(64),
  commsRuntimeReceiptId: "comms-381",
  commsRuntimeDigest: "4".repeat(64),
  commsSignerKeyId: "sha256:" + "d".repeat(64),
  commsSignatureSha256: "5".repeat(64),
  controllerRuntimeReceiptId: "aidp-381",
  controllerRuntimeDigest: "6".repeat(64),
  controllerSignerKeyId: "sha256:" + "e".repeat(64),
  controllerSignatureSha256: "7".repeat(64),
  renewalDigest: renewalEnvelope.renewalDigest,
  evidenceURI: renewalEnvelope.evidenceURI,
  renewalState: "RENEWED_VERIFIED",
  observedAt: renewalEnvelope.observedAt,
  validUntil: "2026-11-12T17:34:20.000Z",
  recordedAt: "2026-11-12T17:29:21.000Z"
};

const renewedRegistry = {
  ...build380.latestRegistryEvidence!,
  evidenceId: renewal.renewedRegistryEvidenceId,
  recordVersion: 10,
  statusObservedAt: renewal.observedAt,
  statusExpiresAt: renewal.validUntil,
  evidenceURI: renewal.evidenceURI,
  connectionEvidenceURI: renewal.receiverHealthURI
};
const build380AfterRenewal = {
  ...build380,
  connectionState: "DISCONNECTED_HOLD",
  latestRegistryEvidence: renewedRegistry
} as unknown as Build380ExternalRuntimeActivationModel;

const connected = composeBuild381ReceiverHealthContinuity({
  build380: build380AfterRenewal,
  renewalEvents: [renewal],
  now
});
assert.equal(connected.build380ConnectedPrerequisite, "CONNECTED_CURRENT");
assert.equal(
  connected.receiverHealthContinuityState,
  "HEALTHY_RENEWED_CURRENT"
);
assert.equal(
  connected.threeMasterConnectedRevalidationState,
  "CONNECTED_REVALIDATED"
);
assert.equal(connected.rollbackState, "NO_ROLLBACK_REQUIRED");
assert.equal(connected.connectionState, "CONNECTED");
assert.equal(connected.mastersSynced, true);

const stale = composeBuild381ReceiverHealthContinuity({
  build380: build380AfterRenewal,
  renewalEvents: [renewal],
  now: new Date("2026-11-12T17:35:00.000Z")
});
assert.equal(
  stale.receiverHealthContinuityState,
  "ROLLBACK_REQUIRED_HEALTH_EXPIRED"
);
assert.equal(stale.rollbackState, "ROLLBACK_REQUIRED_FAIL_CLOSED");
assert.equal(stale.connectionState, "DISCONNECTED_HOLD");
assert.equal(stale.mastersSynced, false);

const rollbackBase = {
  controllerRevision: BUILD_381_CONTROLLER_BASE_REVISION,
  sourceRevision: BUILD_381_RUNTIME.yw.main,
  aiHubMain: BUILD_381_RUNTIME.aiHub.main,
  commsMain: BUILD_381_RUNTIME.comms.main,
  originalHostId: BUILD_381_RUNTIME.aiHub.originalHost,
  renewalEventId: renewal.renewalEventId,
  registryEvidenceId: renewal.renewedRegistryEvidenceId,
  receiverInstanceId: renewal.receiverInstanceId,
  receiverBootId: renewal.receiverBootId,
  receiverState: "OFF" as const,
  reason: "HEALTH_RENEWAL_EXPIRED" as const,
  receiverOffObservedAt: "2026-11-12T17:35:05.000Z",
  receiverOffProofURI: "urn:rosevear:evidence:build381:receiver-off",
  receiverOffDigest: "9".repeat(64),
  receiverOffSignerKeyId: "sha256:" + "f".repeat(64),
  observedAt: "2026-11-12T17:35:10.000Z"
};
const offCanonical = canonicalBuild381ReceiverOffProof(rollbackBase);
const offSignature = sign(null, Buffer.from(offCanonical, "utf8"), privateKey);
assert.equal(
  verify(null, Buffer.from(offCanonical, "utf8"), publicKey, offSignature),
  true
);

const rollbackEnvelope: Build381RollbackEnvelope = {
  authorityKeyId: "sha256:" + "0".repeat(64),
  ...rollbackBase,
  receiverOffSignatureSha256: build381Digest(offSignature),
  evidenceURI: "urn:rosevear:evidence:build381:rollback",
  nonce: "build381-rollback-nonce-0001"
};
const rollbackCanonical =
  canonicalBuild381RollbackEnvelope(rollbackEnvelope);
const rollbackSignature = sign(
  null,
  Buffer.from(rollbackCanonical, "utf8"),
  privateKey
);
assert.equal(
  verify(
    null,
    Buffer.from(rollbackCanonical, "utf8"),
    publicKey,
    rollbackSignature
  ),
  true
);

const rollback: Build381RollbackEvent = {
  rollbackEventId: "77777777-7777-4777-8777-777777777777",
  renewalEventId: renewal.renewalEventId,
  priorRegistryEvidenceId: renewal.renewedRegistryEvidenceId,
  rollbackRegistryEvidenceId: "88888888-8888-4888-8888-888888888888",
  authorityKeyId: rollbackEnvelope.authorityKeyId,
  authorityKeySpkiSha256: rollbackEnvelope.authorityKeyId,
  envelopeSha256: build381Digest(rollbackCanonical),
  signatureSha256: build381Digest(rollbackSignature),
  nonce: rollbackEnvelope.nonce,
  controllerRevision: rollbackEnvelope.controllerRevision,
  sourceRevision: rollbackEnvelope.sourceRevision,
  aiHubMain: rollbackEnvelope.aiHubMain,
  commsMain: rollbackEnvelope.commsMain,
  originalHostId: rollbackEnvelope.originalHostId,
  receiverInstanceId: rollbackEnvelope.receiverInstanceId,
  receiverBootId: rollbackEnvelope.receiverBootId,
  receiverState: "OFF",
  reason: rollbackEnvelope.reason,
  receiverOffObservedAt: rollbackEnvelope.receiverOffObservedAt,
  receiverOffProofURI: rollbackEnvelope.receiverOffProofURI,
  receiverOffDigest: rollbackEnvelope.receiverOffDigest,
  receiverOffSignerKeyId: rollbackEnvelope.receiverOffSignerKeyId,
  receiverOffSignatureSha256: rollbackEnvelope.receiverOffSignatureSha256,
  evidenceURI: rollbackEnvelope.evidenceURI,
  rollbackState: "ROLLED_BACK_VERIFIED",
  observedAt: rollbackEnvelope.observedAt,
  recordedAt: "2026-11-12T17:35:11.000Z"
};

const rolledBack = composeBuild381ReceiverHealthContinuity({
  build380: build380AfterRenewal,
  renewalEvents: [renewal],
  rollbackEvents: [rollback],
  now: new Date("2026-11-12T17:35:12.000Z")
});
assert.equal(rolledBack.rollbackState, "ROLLED_BACK_VERIFIED");
assert.equal(rolledBack.connectionState, "DISCONNECTED_HOLD");
assert.equal(rolledBack.mastersSynced, false);
assert.equal(rolledBack.policy.staleRenewalAutomaticallyFailsClosed, true);
assert.equal(rolledBack.policy.browserMayRenewRuntime, false);
assert.equal(rolledBack.policy.browserMayClearRollback, false);
assert.equal(rolledBack.policy.codeGreenMaySetConnected, false);

const migration = source(
  "../../db/migrations/0145_master_yw562_receiver_health_continuity.sql"
);
assert.ok(
  migration.length > 10_000 && migration.length < 13_000,
  "migration 0145 size outside reviewed range"
);
assert.ok(
  migration.includes(
    "receiver_off_digest text not null check (receiver_off_digest ~ '^[a-f0-9]{64}
for (const token of [
  "master_build381_receiver_health_renewal_events",
  "master_build381_fail_closed_rollback_events",
  "receiver_health_sequence bigint",
  "receiver_off_signer_key_id",
  "receiver_off_signature_sha256",
  "for insert to ai_data_protected_runtime",
  "declared_status in ('CONNECTED','DISCONNECTED')",
  "metadata->>'build'='381'",
  "renewal_state='RENEWED_VERIFIED'",
  "rollback_state='ROLLED_BACK_VERIFIED'",
  "force row level security"
]) {
  assert.ok(migration.includes(token), `migration token ${token}`);
}
assert.ok(
  !migration.includes(
    "master_build381_receiver_health_renewal_events\n  for insert to ai_data_runtime"
  )
);

const database = source("lib/yw562-receiver-health-continuity-database.ts");
for (const token of [
  "withProtectedDatabase",
  "loadBuild380ExternalRuntimeActivationFromClient",
  "validateMasterShellSourceTransition",
  'declaredStatus: "CONNECTED"',
  'declaredStatus: "DISCONNECTED"',
  "build381_post_write_renewal_not_connected",
  "build381_post_write_rollback_not_fail_closed",
  "receiver_health_sequence_replay"
]) {
  assert.ok(database.includes(token), `database token ${token}`);
}

const renewalApi = source(
  "app/api/protected/build381-runtime-renewal/route.ts"
);
for (const token of [
  "BUILD381_CONTINUITY_AUTHORITY_PUBLIC_KEY_PEM",
  "BUILD381_AI_HUB_RUNTIME_PUBLIC_KEY_PEM",
  "BUILD381_COMMS_RUNTIME_PUBLIC_KEY_PEM",
  "BUILD381_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM",
  "canonicalBuild381MasterRenewalReceipt",
  "CONNECTED_HEALTHY",
  "verify(",
  "build381_protected_renewal_post_only"
]) {
  assert.ok(renewalApi.includes(token), `renewal api token ${token}`);
}
assert.ok(!renewalApi.includes("auth.api.getSession"));

const rollbackApi = source(
  "app/api/protected/build381-fail-closed-rollback/route.ts"
);
for (const token of [
  "BUILD381_ROLLBACK_AUTHORITY_PUBLIC_KEY_PEM",
  "BUILD381_RECEIVER_OFF_PUBLIC_KEY_PEM",
  "canonicalBuild381ReceiverOffProof",
  "canonicalBuild381RollbackEnvelope",
  "receiverOffSignatureBase64",
  "build381_protected_rollback_post_only"
]) {
  assert.ok(rollbackApi.includes(token), `rollback api token ${token}`);
}
assert.ok(!rollbackApi.includes("auth.api.getSession"));

const readApi = source(
  "app/api/yw562-receiver-health-continuity/route.ts"
);
assert.ok(readApi.includes("auth.api.getSession"));
assert.ok(!readApi.includes("export async function POST"));

const page = source("app/yw562-receiver-health-continuity/page.tsx");
for (const token of [
  "Build 381 · protected receiver health continuity",
  "Five-minute renewal is fail-closed.",
  "Rollback closure requires separate OFF custody.",
  "Current upstream code is not live connectivity."
]) {
  assert.ok(page.includes(token), `page token ${token}`);
}

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw562-receiver-health-continuity"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw562-receiver-health-continuity"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build381_receiver_health_renewal_events"',
  '"master_build381_fail_closed_rollback_events"',
  '"0145_master_yw562_receiver_health_continuity.sql"'
]) {
  assert.ok(spine.includes(token), `db spine token ${token}`);
}

const documentation = source(
  "../../docs/BUILD_381_YW562_RECEIVER_HEALTH_CONTINUITY.md"
);
assert.ok(documentation.includes("AI Hub production: Build 321"));
assert.ok(documentation.includes("Comms Hub production: QL-432"));
assert.ok(documentation.includes("Build 381 never upgrades isolated pilot evidence"));

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-381-yw562-receiver-health-continuity.ts";
assert.equal(String(pkg.scripts["verify:build381"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 381 Protected Receiver Health Continuity, Signed Runtime Renewal, Automatic Fail-Closed Rollback & Three-Master CONNECTED Revalidation verification passed."
);
)"
  ),
  "migration 0145 receiver OFF digest constraint is malformed"
);
assert.ok(
  migration.includes(
    "receiver_off_signature_sha256 text not null check (receiver_off_signature_sha256 ~ '^[a-f0-9]{64}
for (const token of [
  "master_build381_receiver_health_renewal_events",
  "master_build381_fail_closed_rollback_events",
  "receiver_health_sequence bigint",
  "receiver_off_signer_key_id",
  "receiver_off_signature_sha256",
  "for insert to ai_data_protected_runtime",
  "declared_status in ('CONNECTED','DISCONNECTED')",
  "metadata->>'build'='381'",
  "renewal_state='RENEWED_VERIFIED'",
  "rollback_state='ROLLED_BACK_VERIFIED'",
  "force row level security"
]) {
  assert.ok(migration.includes(token), `migration token ${token}`);
}
assert.ok(
  !migration.includes(
    "master_build381_receiver_health_renewal_events\n  for insert to ai_data_runtime"
  )
);

const database = source("lib/yw562-receiver-health-continuity-database.ts");
for (const token of [
  "withProtectedDatabase",
  "loadBuild380ExternalRuntimeActivationFromClient",
  "validateMasterShellSourceTransition",
  'declaredStatus: "CONNECTED"',
  'declaredStatus: "DISCONNECTED"',
  "build381_post_write_renewal_not_connected",
  "build381_post_write_rollback_not_fail_closed",
  "receiver_health_sequence_replay"
]) {
  assert.ok(database.includes(token), `database token ${token}`);
}

const renewalApi = source(
  "app/api/protected/build381-runtime-renewal/route.ts"
);
for (const token of [
  "BUILD381_CONTINUITY_AUTHORITY_PUBLIC_KEY_PEM",
  "BUILD381_AI_HUB_RUNTIME_PUBLIC_KEY_PEM",
  "BUILD381_COMMS_RUNTIME_PUBLIC_KEY_PEM",
  "BUILD381_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM",
  "canonicalBuild381MasterRenewalReceipt",
  "CONNECTED_HEALTHY",
  "verify(",
  "build381_protected_renewal_post_only"
]) {
  assert.ok(renewalApi.includes(token), `renewal api token ${token}`);
}
assert.ok(!renewalApi.includes("auth.api.getSession"));

const rollbackApi = source(
  "app/api/protected/build381-fail-closed-rollback/route.ts"
);
for (const token of [
  "BUILD381_ROLLBACK_AUTHORITY_PUBLIC_KEY_PEM",
  "BUILD381_RECEIVER_OFF_PUBLIC_KEY_PEM",
  "canonicalBuild381ReceiverOffProof",
  "canonicalBuild381RollbackEnvelope",
  "receiverOffSignatureBase64",
  "build381_protected_rollback_post_only"
]) {
  assert.ok(rollbackApi.includes(token), `rollback api token ${token}`);
}
assert.ok(!rollbackApi.includes("auth.api.getSession"));

const readApi = source(
  "app/api/yw562-receiver-health-continuity/route.ts"
);
assert.ok(readApi.includes("auth.api.getSession"));
assert.ok(!readApi.includes("export async function POST"));

const page = source("app/yw562-receiver-health-continuity/page.tsx");
for (const token of [
  "Build 381 · protected receiver health continuity",
  "Five-minute renewal is fail-closed.",
  "Rollback closure requires separate OFF custody.",
  "Current upstream code is not live connectivity."
]) {
  assert.ok(page.includes(token), `page token ${token}`);
}

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw562-receiver-health-continuity"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw562-receiver-health-continuity"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build381_receiver_health_renewal_events"',
  '"master_build381_fail_closed_rollback_events"',
  '"0145_master_yw562_receiver_health_continuity.sql"'
]) {
  assert.ok(spine.includes(token), `db spine token ${token}`);
}

const documentation = source(
  "../../docs/BUILD_381_YW562_RECEIVER_HEALTH_CONTINUITY.md"
);
assert.ok(documentation.includes("AI Hub production: Build 321"));
assert.ok(documentation.includes("Comms Hub production: QL-432"));
assert.ok(documentation.includes("Build 381 never upgrades isolated pilot evidence"));

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-381-yw562-receiver-health-continuity.ts";
assert.equal(String(pkg.scripts["verify:build381"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 381 Protected Receiver Health Continuity, Signed Runtime Renewal, Automatic Fail-Closed Rollback & Three-Master CONNECTED Revalidation verification passed."
);
)"
  ),
  "migration 0145 receiver OFF signature constraint is malformed"
);
assert.ok(
  !migration.includes("receiver_off_digest ~ '^[a-f0-9]{64} check"),
  "migration 0145 contains the previously corrupted receiver OFF fragment"
);
for (const token of [
  "master_build381_receiver_health_renewal_events",
  "master_build381_fail_closed_rollback_events",
  "receiver_health_sequence bigint",
  "receiver_off_signer_key_id",
  "receiver_off_signature_sha256",
  "for insert to ai_data_protected_runtime",
  "declared_status in ('CONNECTED','DISCONNECTED')",
  "metadata->>'build'='381'",
  "renewal_state='RENEWED_VERIFIED'",
  "rollback_state='ROLLED_BACK_VERIFIED'",
  "force row level security"
]) {
  assert.ok(migration.includes(token), `migration token ${token}`);
}
assert.ok(
  !migration.includes(
    "master_build381_receiver_health_renewal_events\n  for insert to ai_data_runtime"
  )
);

const database = source("lib/yw562-receiver-health-continuity-database.ts");
for (const token of [
  "withProtectedDatabase",
  "loadBuild380ExternalRuntimeActivationFromClient",
  "validateMasterShellSourceTransition",
  'declaredStatus: "CONNECTED"',
  'declaredStatus: "DISCONNECTED"',
  "build381_post_write_renewal_not_connected",
  "build381_post_write_rollback_not_fail_closed",
  "receiver_health_sequence_replay"
]) {
  assert.ok(database.includes(token), `database token ${token}`);
}

const renewalApi = source(
  "app/api/protected/build381-runtime-renewal/route.ts"
);
for (const token of [
  "BUILD381_CONTINUITY_AUTHORITY_PUBLIC_KEY_PEM",
  "BUILD381_AI_HUB_RUNTIME_PUBLIC_KEY_PEM",
  "BUILD381_COMMS_RUNTIME_PUBLIC_KEY_PEM",
  "BUILD381_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM",
  "canonicalBuild381MasterRenewalReceipt",
  "CONNECTED_HEALTHY",
  "verify(",
  "build381_protected_renewal_post_only"
]) {
  assert.ok(renewalApi.includes(token), `renewal api token ${token}`);
}
assert.ok(!renewalApi.includes("auth.api.getSession"));

const rollbackApi = source(
  "app/api/protected/build381-fail-closed-rollback/route.ts"
);
for (const token of [
  "BUILD381_ROLLBACK_AUTHORITY_PUBLIC_KEY_PEM",
  "BUILD381_RECEIVER_OFF_PUBLIC_KEY_PEM",
  "canonicalBuild381ReceiverOffProof",
  "canonicalBuild381RollbackEnvelope",
  "receiverOffSignatureBase64",
  "build381_protected_rollback_post_only"
]) {
  assert.ok(rollbackApi.includes(token), `rollback api token ${token}`);
}
assert.ok(!rollbackApi.includes("auth.api.getSession"));

const readApi = source(
  "app/api/yw562-receiver-health-continuity/route.ts"
);
assert.ok(readApi.includes("auth.api.getSession"));
assert.ok(!readApi.includes("export async function POST"));

const page = source("app/yw562-receiver-health-continuity/page.tsx");
for (const token of [
  "Build 381 · protected receiver health continuity",
  "Five-minute renewal is fail-closed.",
  "Rollback closure requires separate OFF custody.",
  "Current upstream code is not live connectivity."
]) {
  assert.ok(page.includes(token), `page token ${token}`);
}

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw562-receiver-health-continuity"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw562-receiver-health-continuity"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build381_receiver_health_renewal_events"',
  '"master_build381_fail_closed_rollback_events"',
  '"0145_master_yw562_receiver_health_continuity.sql"'
]) {
  assert.ok(spine.includes(token), `db spine token ${token}`);
}

const documentation = source(
  "../../docs/BUILD_381_YW562_RECEIVER_HEALTH_CONTINUITY.md"
);
assert.ok(documentation.includes("AI Hub production: Build 321"));
assert.ok(documentation.includes("Comms Hub production: QL-432"));
assert.ok(documentation.includes("Build 381 never upgrades isolated pilot evidence"));

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-381-yw562-receiver-health-continuity.ts";
assert.equal(String(pkg.scripts["verify:build381"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 381 Protected Receiver Health Continuity, Signed Runtime Renewal, Automatic Fail-Closed Rollback & Three-Master CONNECTED Revalidation verification passed."
);
