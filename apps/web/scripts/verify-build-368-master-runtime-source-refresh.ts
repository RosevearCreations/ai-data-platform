import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_368_MASTER_SNAPSHOT,
  BUILD_368_SOURCE_SNAPSHOT,
  composeBuild368RuntimeRecheck
} from "../lib/master-runtime-source-refresh";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const now = new Date("2026-11-11T14:15:00.000Z");
const current = composeBuild368RuntimeRecheck({ now });

assert.equal(current.build, 368);
assert.equal(current.master.snapshot.aiHub.ack, "MASTER360-AIHUB-308-ACK");
assert.equal(current.master.snapshot.aiHub.main, "cefc2b8859e51ca29f0255f69f8361161f8a117d");
assert.equal(current.master.snapshot.comms.ack, "MASTER360-COMMS-QL416-ACK");
assert.equal(current.master.snapshot.comms.main, "95d5780f377c7e2fd3c357789cbc2566fcf03b6c");
assert.equal(current.master.gateState, "HOLD");
assert.ok(current.master.blockers.length >= 10);

const yw = current.sources.find((item) => item.sourceId === "yw");
const icamp = current.sources.find((item) => item.sourceId === "icamp");
assert.ok(yw);
assert.ok(icamp);
assert.equal(yw.productionMain, "443a4380fe3875cf632702474e94ce74309d3f14");
assert.equal(yw.revisionState, "VERIFIED_CURRENT");
assert.equal(yw.signerState, "HOLD_UNENROLLED");
assert.equal(yw.receiptState, "HOLD_NOT_RECEIVED");
assert.equal(yw.requestedAction, "REFRESH_SIGNER_AND_RECEIPT");
assert.equal(yw.handoffToken, "MASTER368-YW-SOURCE-REFRESH");

assert.equal(icamp.productionMain, "1f29c23f5fba7c2326e09873ebff42223622044b");
assert.equal(icamp.observedManifestRevision, "e2d343595363ca9106e7f1dbc60006e3a6c616aa");
assert.equal(icamp.revisionState, "HOLD_MANIFEST_STALE");
assert.equal(icamp.signerState, "HOLD_UNENROLLED");
assert.equal(icamp.receiptState, "HOLD_NOT_RECEIVED");
assert.equal(icamp.requestedAction, "RECONVERGE_MANIFEST_AND_REFRESH_RECEIPT");
assert.equal(icamp.handoffToken, "MASTER368-ICAMP-RECONVERGE-REFRESH");
assert.equal(current.summary.sourceEvidenceReady, 0);
assert.equal(current.summary.readyForOwnerReview, 0);
assert.equal(current.summary.closureState, "HOLD");

assert.equal(current.policy.controllerMayRewriteSourceManifest, false);
assert.equal(current.policy.controllerMayCreateSourcePrivateKey, false);
assert.equal(current.policy.codeGreenIsRuntimeProof, false);
assert.equal(current.policy.holdMayAutoRelease, false);
assert.equal(current.policy.receiptMustMatchExactCurrentRevision, true);
assert.equal(current.policy.staleReceiptMayAuthorizeAcceptance, false);
assert.equal(current.policy.masterGateRequired, true);

const refreshedSources = BUILD_368_SOURCE_SNAPSHOT.map((item) =>
  item.sourceId === "icamp"
    ? { ...item, observedManifestRevision: item.productionMain }
    : { ...item }
);
const signerEvents = refreshedSources.map((item, index) => ({
  eventId: "signer-" + item.sourceId,
  sourceId: item.sourceId,
  eventType: "ENROLLED" as const,
  keyId: item.sourceId + "-key-368",
  publicKeySpkiSha256: "sha256:" + String(index + 3).repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:" + item.sourceId + "-custody-368",
  independentlyVerifiedAt: "2026-11-11T14:08:00.000Z",
  recordedAt: "2026-11-11T14:08:01.000Z"
}));
const receipts = refreshedSources.map((item, index) => ({
  receiptId: "receipt-" + item.sourceId + "-368",
  sourceId: item.sourceId,
  keyId: item.sourceId + "-key-368",
  sourceRevision: item.productionMain,
  manifestRevision: item.productionMain,
  receiptSha256: String(index + 5).repeat(64),
  nonce: item.sourceId + "-nonce-368",
  issuedAt: "2026-11-11T14:10:00.000Z",
  healthObservedAt: "2026-11-11T14:10:10.000Z",
  healthState: "HEALTHY" as const,
  sourceRuntime: item.sourceId + "-production",
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt: "2026-11-11T14:10:20.000Z"
}));
const admissions = receipts.map((receipt) => ({
  admissionEventId: "admit-" + receipt.sourceId + "-368",
  sourceId: receipt.sourceId,
  keyId: receipt.keyId,
  receiptSha256: receipt.receiptSha256,
  sourceRevision: receipt.sourceRevision,
  outcome: "ADMITTED" as const,
  receiptId: receipt.receiptId,
  blockers: [],
  recordedAt: "2026-11-11T14:10:21.000Z"
}));

const sourceReady = composeBuild368RuntimeRecheck({
  signerEvents,
  receipts,
  admissionEvents: admissions,
  sources: refreshedSources,
  now
});
assert.equal(sourceReady.summary.sourceEvidenceReady, 2);
assert.equal(sourceReady.summary.readyForOwnerReview, 0);
assert.equal(sourceReady.master.gateState, "HOLD");
assert.equal(sourceReady.sources[0].requestedAction, "NO_REFRESH_REQUIRED");
assert.equal(sourceReady.sources[1].requestedAction, "NO_REFRESH_REQUIRED");
assert.equal(sourceReady.sources[0].acceptanceState, "HOLD");
assert.equal(sourceReady.sources[1].acceptanceState, "HOLD");

const migration = source("../../db/migrations/0132_master_runtime_source_refresh_recheck.sql");
for (const token of [
  "master_runtime_evidence_rechecks",
  "master_source_receipt_refresh_requests",
  "master_supervised_acceptance_rechecks",
  "RECONVERGE_MANIFEST_AND_REFRESH_RECEIPT",
  "READY_FOR_OWNER_REVIEW",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.toLowerCase().includes("private_key"));

const database = source("lib/master-runtime-source-refresh-database.ts");
for (const token of [
  "listBuild368RuntimeRecheckForUser",
  "recordBuild368RuntimeAndSourceRecheck",
  "master_runtime_evidence_rechecks",
  "master_source_receipt_refresh_requests",
  "master_supervised_acceptance_rechecks",
  "build368-runtime-source-recheck"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("private_key"));

const api = source("app/api/master-runtime-source-refresh/route.ts");
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("recordBuild368RuntimeAndSourceRecheck"));

const page = source("app/master-runtime-source-refresh/page.tsx");
for (const token of [
  "Build 368 · Runtime closure recheck",
  "AI Hub 308 and Comms QL-416 remain runtime HOLD.",
  "Current source changes invalidate old receipt assumptions.",
  "Controller boundary"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/master-runtime-source-refresh"'));
const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/master-runtime-source-refresh"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_runtime_evidence_rechecks"',
  '"master_source_receipt_refresh_requests"',
  '"master_supervised_acceptance_rechecks"',
  '"0132_master_runtime_source_refresh_recheck.sql"'
]) {
  assert.ok(dbSpine.includes(token), "db spine token " + token);
}

const pkg = JSON.parse(source("package.json"));
const command = "tsx scripts/verify-build-368-master-runtime-source-refresh.ts";
assert.equal(String(pkg.scripts["verify:build368"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 368 Master Runtime Evidence Closure, iCamp Revision Re-Convergence, Source Receipt Refresh & Supervised Acceptance Recheck verification passed."
);
