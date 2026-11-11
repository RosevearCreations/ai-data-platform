import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_365_SOURCE_HANDOFFS,
  composeSourceTrustLedger,
  summarizeReceiptAge,
  trustedSignerFingerprint
} from "../lib/source-trust-ledger";
import { composeSourceConvergence } from "../lib/source-convergence";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const current = composeSourceTrustLedger({
  now: new Date("2026-11-11T03:00:00.000Z")
});
assert.equal(current.build, 365);
assert.equal(current.sources.length, 2);
assert.equal(current.sources[0].productionMain, "0010bbd5ae71cb025d77e613cce9bc6e3f064d34");
assert.equal(current.sources[1].productionMain, "00112c6714ecdf4d49dc114d4b29a0a8b9a8bced");
assert.equal(current.sources[0].revisionState, "VERIFIED");
assert.equal(current.sources[1].revisionState, "VERIFIED");
assert.equal(current.sources[0].signerRegistryState, "HOLD_UNENROLLED");
assert.equal(current.sources[1].signerRegistryState, "HOLD_UNENROLLED");
assert.equal(current.sources[0].receiptState, "NOT_RECEIVED");
assert.equal(current.sources[1].receiptState, "NOT_RECEIVED");
assert.equal(current.summary.closureState, "HOLD");
assert.equal(current.policy.sourcePrivateKeysStored, false);
assert.equal(current.policy.receiptPublicKeyMaySelfEstablishTrust, false);
assert.equal(current.policy.duplicateNonceRejected, true);
assert.equal(current.policy.agedReceiptMayAuthorizeAcceptance, false);
assert.equal(current.policy.controllerMayAutoAcceptOwnerDecision, false);

const convergence = composeSourceConvergence();
assert.equal(convergence.summary.allRevisionsConverged, true);
assert.equal(convergence.summary.allSignersReady, false);
assert.equal(convergence.summary.allHealthReceiptsVerified, false);
assert.equal(convergence.summary.supervisedClosureEligible, false);

const { publicKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
assert.match(trustedSignerFingerprint(publicKeyPem), /^sha256:[a-f0-9]{64}$/);

const signerEvents = [
  {
    eventId: "signer-yw-1",
    sourceId: "yw" as const,
    eventType: "ENROLLED" as const,
    keyId: "yw-source-key-1",
    publicKeySpkiSha256: trustedSignerFingerprint(publicKeyPem),
    custodyEvidenceURI: "urn:rosevear:evidence:yw-signer-enrollment",
    independentlyVerifiedAt: "2026-11-11T02:40:00.000Z",
    recordedAt: "2026-11-11T02:41:00.000Z"
  }
];

const receipts = [
  {
    receiptId: "receipt-yw-1",
    sourceId: "yw" as const,
    keyId: "yw-source-key-1",
    sourceRevision: BUILD_365_SOURCE_HANDOFFS[0].productionMain,
    manifestRevision: BUILD_365_SOURCE_HANDOFFS[0].productionMain,
    receiptSha256: "a".repeat(64),
    nonce: "yw-nonce-1",
    issuedAt: "2026-11-11T02:55:00.000Z",
    healthObservedAt: "2026-11-11T02:56:00.000Z",
    healthState: "HEALTHY" as const,
    sourceRuntime: "yw-production",
    verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
    verifiedAt: "2026-11-11T02:57:00.000Z"
  }
];

const withEvidence = composeSourceTrustLedger({
  signerEvents,
  receipts,
  now: new Date("2026-11-11T03:00:00.000Z")
});
assert.equal(withEvidence.sources[0].signerRegistryState, "TRUSTED_SIGNER_ENROLLED");
assert.equal(withEvidence.sources[0].receiptState, "VERIFIED_CURRENT");
assert.equal(withEvidence.sources[0].receiptAge, "CURRENT");
assert.equal(withEvidence.sources[0].sourceReadyForOwnerReview, false);
assert.equal(withEvidence.summary.masterGateOpen, false);

assert.equal(
  summarizeReceiptAge(receipts[0], new Date("2026-11-11T04:00:00.000Z")),
  "AGED"
);
assert.equal(
  summarizeReceiptAge(receipts[0], new Date("2026-11-12T04:00:00.000Z")),
  "EXPIRED"
);

const revoked = composeSourceTrustLedger({
  signerEvents: [
    ...signerEvents,
    {
      ...signerEvents[0],
      eventId: "signer-yw-2",
      eventType: "REVOKED" as const,
      recordedAt: "2026-11-11T02:50:00.000Z"
    }
  ],
  receipts,
  now: new Date("2026-11-11T03:00:00.000Z")
});
assert.equal(revoked.sources[0].signerRegistryState, "HOLD_UNENROLLED");

const migration = source("../../db/migrations/0129_master_source_signer_receipt_owner_audit.sql");
for (const token of [
  "master_source_signer_registry_events",
  "master_convergence_receipt_ledger",
  "master_owner_decision_audit",
  "unique (source_id,nonce)",
  "verification_state='VERIFIED_SOURCE_BOUND_HEALTH'",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.toLowerCase().includes("private_key"));

const database = source("lib/source-trust-ledger-database.ts");
for (const token of [
  "recordTrustedSourceSignerEvent",
  "recordVerifiedConvergenceReceipt",
  "recordOwnerDecisionAudit",
  "trustedSignerFingerprint",
  "composeConvergenceReceiptIntake",
  "build365_receipt_replay_or_duplicate",
  "build365_owner_accept_master_gate_hold"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
for (const forbidden of [
  "update app.master_source_signer_registry_events",
  "delete from app.master_source_signer_registry_events",
  "update app.master_convergence_receipt_ledger",
  "delete from app.master_convergence_receipt_ledger",
  "update app.master_owner_decision_audit",
  "delete from app.master_owner_decision_audit"
]) {
  assert.ok(!database.toLowerCase().includes(forbidden), "forbidden database token " + forbidden);
}

const api = source("app/api/source-trust-ledger/route.ts");
assert.ok(api.includes('action === "signer-event"'));
assert.ok(api.includes('action === "receipt"'));
assert.ok(api.includes('action === "owner-decision"'));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/source-trust-ledger/page.tsx");
for (const token of [
  "Build 365 · Trusted source evidence custody",
  "Revision convergence is now recorded; signer and health proof are not.",
  "Build 365 authority boundary"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/source-trust-ledger"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/source-trust-ledger"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_source_signer_registry_events"',
  '"master_convergence_receipt_ledger"',
  '"master_owner_decision_audit"',
  '"0129_master_source_signer_receipt_owner_audit.sql"'
]) {
  assert.ok(dbSpine.includes(token), "db spine token " + token);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-365-trusted-source-signer-receipt-ledger-owner-audit.ts";
assert.equal(String(pkg.scripts["verify:build365"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 365 Trusted Source Signer Registry, Durable Convergence Receipt Ledger, Replay/Aging Evidence & Owner Decision Audit Trail verification passed."
);
