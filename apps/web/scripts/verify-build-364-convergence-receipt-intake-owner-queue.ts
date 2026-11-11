import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  CONVERGENCE_RECEIPT_SCHEMA,
  canonicalConvergenceReceiptPayload,
  composeConvergenceReceiptIntake,
  type ConvergenceReceipt
} from "../lib/convergence-receipt-intake";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const current = composeConvergenceReceiptIntake({
  now: "2026-11-11T02:10:00.000Z"
});
assert.equal(current.build, 364);
assert.equal(current.summary.receiptsReceived, 0);
assert.equal(current.summary.verifiedSourceCount, 0);
assert.equal(current.summary.closureState, "SOURCE_EVIDENCE_HOLD");
assert.equal(current.sources[0].decisionQueueState, "WAIT_FOR_SOURCE_RECEIPT");
assert.equal(current.sources[1].decisionQueueState, "WAIT_FOR_SOURCE_RECEIPT");
assert.equal(current.policy.ed25519VerificationRequired, true);
assert.equal(current.policy.controllerMayAutoAcceptOwnerDecision, false);
assert.equal(current.policy.controllerMayStorePrivateSigningKeys, false);
assert.equal(current.policy.receiptSuppliedPublicKeyMayEstablishTrust, false);

function signedReceipt(args: {
  sourceId: "yw" | "icamp";
  sourceAppId: string;
  repository: string;
  revision: string;
  handoffToken: string;
  nonce: string;
}) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({
    format: "pem",
    type: "spki"
  }).toString();
  const keyId = `${args.sourceId}-build364-test-key`;

  const unsigned = {
    schema: CONVERGENCE_RECEIPT_SCHEMA,
    receiptVersion: 1 as const,
    handoffToken: args.handoffToken,
    sourceId: args.sourceId,
    sourceAppId: args.sourceAppId,
    repository: args.repository,
    sourceRevision: args.revision,
    manifestRevision: args.revision,
    keyId,
    issuedAt: "2026-11-11T02:05:00.000Z",
    nonce: args.nonce,
    health: {
      state: "HEALTHY" as const,
      revision: args.revision,
      observedAt: "2026-11-11T02:06:00.000Z",
      sourceRuntime: `${args.sourceId}-production-runtime`
    }
  };

  const receipt: ConvergenceReceipt = {
    ...unsigned,
    signatureBase64: sign(
      null,
      Buffer.from(canonicalConvergenceReceiptPayload(unsigned), "utf8"),
      privateKey
    ).toString("base64")
  };

  return {
    receipt,
    trustedSigner: {
      keyId,
      publicKeyPem
    }
  };
}

const ywFixture = signedReceipt({
  sourceId: "yw",
  sourceAppId: "yard-workers",
  repository: "RosevearCreations/yw",
  revision: "0010bbd5ae71cb025d77e613cce9bc6e3f064d34",
  handoffToken: "MASTER363-YW-SOURCE-CONVERGE",
  nonce: "yw-build364-valid"
});
const icampFixture = signedReceipt({
  sourceId: "icamp",
  sourceAppId: "icamp",
  repository: "RosevearCreations/iCamp",
  revision: "00112c6714ecdf4d49dc114d4b29a0a8b9a8bced",
  handoffToken: "MASTER363-ICAMP-SOURCE-CONVERGE",
  nonce: "icamp-build364-valid"
});

const validSources = composeConvergenceReceiptIntake({
  now: "2026-11-11T02:10:00.000Z",
  receipts: {
    yw: { receipt: ywFixture.receipt },
    icamp: { receipt: icampFixture.receipt }
  },
  trustedSigners: {
    yw: ywFixture.trustedSigner,
    icamp: icampFixture.trustedSigner
  }
});
assert.equal(validSources.summary.receiptsReceived, 2);
assert.equal(validSources.summary.verifiedSourceCount, 2);
assert.equal(validSources.summary.allSourceEvidenceVerified, true);
assert.equal(validSources.summary.masterGateOpen, false);
assert.equal(validSources.summary.closureState, "MASTER_RUNTIME_HOLD");
assert.equal(validSources.sources[0].signatureVerified, true);
assert.equal(validSources.sources[1].signatureVerified, true);
assert.equal(
  validSources.sources[0].decisionQueueState,
  "WAIT_FOR_MASTER_RUNTIME_CLOSURE"
);

const tampered = {
  ...ywFixture.receipt,
  manifestRevision: "tampered-revision"
};
const tamperedModel = composeConvergenceReceiptIntake({
  now: "2026-11-11T02:10:00.000Z",
  receipts: { yw: { receipt: tampered } },
  trustedSigners: { yw: ywFixture.trustedSigner }
});
assert.equal(tamperedModel.sources[0].signatureVerified, false);
assert.equal(tamperedModel.sources[0].sourceEvidenceVerified, false);
assert.equal(tamperedModel.sources[0].decisionQueueState, "EVIDENCE_HOLD");

const replayModel = composeConvergenceReceiptIntake({
  now: "2026-11-11T02:10:00.000Z",
  seenNonces: ["yw-build364-valid"],
  receipts: { yw: { receipt: ywFixture.receipt } },
  trustedSigners: { yw: ywFixture.trustedSigner }
});
assert.equal(replayModel.sources[0].replaySafe, false);
assert.equal(replayModel.sources[0].sourceEvidenceVerified, false);

const page = source("app/convergence-receipt-intake/page.tsx");
for (const token of [
  "Build 364 · Convergence receipt intake",
  "Receipts are evidence, not automatic acceptance.",
  "Private signing keys never enter AI Data."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/convergence-receipt-intake"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/convergence-receipt-intake"'));

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-364-convergence-receipt-intake-owner-queue.ts";
assert.equal(String(pkg.scripts["verify:build364"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 364 Yard Workers & iCamp Convergence Receipt Intake, Source-Bound Signature Verification, Health Evidence Correlation & Owner Acceptance Decision Queue verification passed."
);
