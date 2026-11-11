import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_369_CONTROLLER_BASE_REVISION,
  BUILD_369_SOURCE_BASELINES,
  composeBuild369SourceRefreshIntake
} from "../lib/source-refresh-evidence";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const now = new Date("2026-11-11T15:15:00.000Z");
const current = composeBuild369SourceRefreshIntake({ now });

assert.equal(current.build, 369);
assert.equal(
  BUILD_369_CONTROLLER_BASE_REVISION,
  "afe35207c74825722e064201ce1ab7e0b9228c01"
);
assert.equal(current.master.snapshot.aiHub.ack, "MASTER360-AIHUB-308-ACK");
assert.equal(current.master.snapshot.comms.ack, "MASTER360-COMMS-QL416-ACK");
assert.equal(current.summary.threeMasterGate, "HOLD");

const yw = current.sources.find((item) => item.sourceId === "yw");
const icamp = current.sources.find((item) => item.sourceId === "icamp");
assert.ok(yw);
assert.ok(icamp);

assert.equal(yw.productionMain, "2c7234c975528a3a3ab76ca22829c8b4a541de97");
assert.equal(yw.checkedInManifestRevision, null);
assert.equal(yw.manifestBinding, "BUILD_TIME_VERCEL_GIT_COMMIT_SHA");
assert.equal(yw.previousHandoffToken, "MASTER368-YW-SOURCE-REFRESH");
assert.equal(yw.sourceRefreshCurrent, false);
assert.equal(yw.manifestConfirmationState, "HOLD_DEPLOYED_CONFIRMATION_REQUIRED");
assert.equal(yw.signerState, "HOLD_UNENROLLED");
assert.equal(yw.receiptState, "HOLD_NOT_RECEIVED");
assert.equal(yw.acceptanceState, "HOLD");

assert.equal(icamp.productionMain, "69d46513b45e340a4e295165abbd3d99b3a62274");
assert.equal(
  icamp.checkedInManifestRevision,
  "1f29c23f5fba7c2326e09873ebff42223622044b"
);
assert.equal(icamp.manifestBinding, "BUILD_TIME_VERCEL_GIT_COMMIT_SHA");
assert.equal(
  icamp.previousHandoffToken,
  "MASTER368-ICAMP-RECONVERGE-REFRESH"
);
assert.equal(icamp.sourceRefreshCurrent, false);
assert.equal(
  icamp.manifestConfirmationState,
  "HOLD_DEPLOYED_CONFIRMATION_REQUIRED"
);
assert.equal(icamp.signerState, "HOLD_UNENROLLED");
assert.equal(icamp.receiptState, "HOLD_NOT_RECEIVED");
assert.equal(icamp.acceptanceState, "HOLD");

assert.equal(current.summary.manifestConfirmations, 0);
assert.equal(current.summary.freshSignedHealth, 0);
assert.equal(current.summary.durableReplayVerified, 0);
assert.equal(current.summary.sourceEvidenceReady, 0);
assert.equal(current.summary.readyForOwnerReview, 0);

assert.equal(current.policy.controllerMayRewriteSourceManifest, false);
assert.equal(current.policy.controllerMayGenerateSourcePrivateKey, false);
assert.equal(current.policy.repositoryDocumentationIsNotRuntimeReceipt, true);
assert.equal(current.policy.deployedManifestRequiresIndependentConfirmation, true);
assert.equal(current.policy.signedHealthMustUseTrustedSigner, true);
assert.equal(
  current.policy.signedHealthMustMatchExactCurrentProductionRevision,
  true
);
assert.equal(current.policy.durableReplayRequired, true);
assert.equal(current.policy.codeGreenIsRuntimeEvidence, false);
assert.equal(current.policy.threeMasterGateMustOpen, true);

const refreshEvidenceEvents = BUILD_369_SOURCE_BASELINES.map((item, index) => ({
  evidenceEventId: "refresh-" + item.sourceId,
  sourceId: item.sourceId,
  handoffToken: item.previousHandoffToken,
  sourceProductionRevision: item.productionMain,
  manifestBaselineRevision: item.checkedInManifestRevision,
  deployedManifestRevision: item.productionMain,
  manifestConfirmationState: "CONFIRMED_EXACT" as const,
  tenantBoundary: "platform_shell" as const,
  signerState: "TRUSTED_SIGNER_ENROLLED" as const,
  receiptId: "receipt-" + item.sourceId + "-369",
  receiptState: "VERIFIED_CURRENT" as const,
  durableReplayState: "VERIFIED" as const,
  evidenceURI: "urn:rosevear:evidence:" + item.sourceId + "-refresh-369",
  evidenceDigest: "sha256:" + String(index + 2).repeat(64),
  sanitizedAck: item.sourceId + " sanitized current-production refresh ACK",
  blockers: [],
  receivedAt: "2026-11-11T15:10:00.000Z",
  recordedAt: "2026-11-11T15:10:01.000Z"
}));

const signerEvents = BUILD_369_SOURCE_BASELINES.map((item, index) => ({
  eventId: "signer-" + item.sourceId + "-369",
  sourceId: item.sourceId,
  eventType: "ENROLLED" as const,
  keyId: item.sourceId + "-source-key-369",
  publicKeySpkiSha256: "sha256:" + String(index + 4).repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:" + item.sourceId + "-custody-369",
  independentlyVerifiedAt: "2026-11-11T15:08:00.000Z",
  recordedAt: "2026-11-11T15:08:01.000Z"
}));

const receipts = BUILD_369_SOURCE_BASELINES.map((item, index) => ({
  receiptId: "receipt-" + item.sourceId + "-369",
  sourceId: item.sourceId,
  keyId: item.sourceId + "-source-key-369",
  sourceRevision: item.productionMain,
  manifestRevision: item.productionMain,
  receiptSha256: String(index + 6).repeat(64),
  nonce: item.sourceId + "-nonce-369",
  issuedAt: "2026-11-11T15:11:00.000Z",
  healthObservedAt: "2026-11-11T15:11:10.000Z",
  healthState: "HEALTHY" as const,
  sourceRuntime: item.sourceId + "-production",
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt: "2026-11-11T15:11:20.000Z"
}));

const admissions = receipts.map((receipt) => ({
  admissionEventId: "admit-" + receipt.sourceId + "-369",
  sourceId: receipt.sourceId,
  keyId: receipt.keyId,
  receiptSha256: receipt.receiptSha256,
  sourceRevision: receipt.sourceRevision,
  outcome: "ADMITTED" as const,
  receiptId: receipt.receiptId,
  blockers: [],
  recordedAt: "2026-11-11T15:11:21.000Z"
}));

const sourceReady = composeBuild369SourceRefreshIntake({
  signerEvents,
  receipts,
  admissionEvents: admissions,
  refreshEvidenceEvents,
  now
});
assert.equal(sourceReady.summary.manifestConfirmations, 2);
assert.equal(sourceReady.summary.freshSignedHealth, 2);
assert.equal(sourceReady.summary.durableReplayVerified, 2);
assert.equal(sourceReady.summary.sourceEvidenceReady, 2);
assert.equal(sourceReady.summary.readyForOwnerReview, 0);
assert.equal(sourceReady.summary.threeMasterGate, "HOLD");
assert.equal(sourceReady.sources[0].acceptanceState, "HOLD");
assert.equal(sourceReady.sources[1].acceptanceState, "HOLD");

const wrongRevision = [
  {
    ...refreshEvidenceEvents[1],
    deployedManifestRevision: "1f29c23f5fba7c2326e09873ebff42223622044b",
    manifestConfirmationState: "HOLD_STALE" as const
  }
];
const wrong = composeBuild369SourceRefreshIntake({
  refreshEvidenceEvents: wrongRevision,
  now
});
assert.equal(icamp.sourceId, "icamp");
assert.equal(
  wrong.sources.find((item) => item.sourceId === "icamp")?.manifestConfirmationState,
  "HOLD_STALE"
);

const migration = source(
  "../../db/migrations/0133_master_source_refresh_evidence_three_master_recheck.sql"
);
for (const token of [
  "master_source_refresh_evidence_events",
  "master_three_master_acceptance_rechecks",
  "CONFIRMED_EXACT",
  "HOLD_DEPLOYED_CONFIRMATION_REQUIRED",
  "VERIFIED_CURRENT",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.toLowerCase().includes("private_key"));

const database = source("lib/source-refresh-evidence-database.ts");
for (const token of [
  "recordBuild369SourceRefreshEvidence",
  "recordBuild369ThreeMasterAcceptanceRecheck",
  "build369_handoff_token_mismatch",
  "build369_source_revision_mismatch",
  "build369_verified_replay_digest_required",
  "master_source_refresh_evidence_events",
  "master_three_master_acceptance_rechecks"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("private_key"));

const api = source("app/api/source-refresh-evidence/route.ts");
assert.ok(api.includes("record-source-refresh-evidence"));
assert.ok(api.includes("record-three-master-acceptance-recheck"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/source-refresh-evidence/page.tsx");
for (const token of [
  "Build 369 · Source refresh evidence intake",
  "Repository convergence is not the same as runtime acceptance.",
  "Current production revisions",
  "Three-Master gate is still HOLD."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/source-refresh-evidence"'));
const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/source-refresh-evidence"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_source_refresh_evidence_events"',
  '"master_three_master_acceptance_rechecks"',
  '"0133_master_source_refresh_evidence_three_master_recheck.sql"'
]) {
  assert.ok(dbSpine.includes(token), "db spine token " + token);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-369-source-refresh-evidence-three-master-recheck.ts";
assert.equal(String(pkg.scripts["verify:build369"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 369 Source Refresh Evidence Intake, iCamp Manifest Re-Convergence Confirmation, YW/iCamp Fresh Signed Health Admission & Three-Master Acceptance Recheck verification passed."
);
