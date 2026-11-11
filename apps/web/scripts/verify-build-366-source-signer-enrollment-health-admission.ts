import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_365_SOURCE_HANDOFFS,
  trustedSignerFingerprint
} from "../lib/source-trust-ledger";
import {
  SOURCE_SIGNER_CUSTODY_CHALLENGE_SCHEMA,
  composeSignerEnrollmentAndOwnerReview,
  custodyChallengePayload,
  pinMatchesPublicKey,
  verifyCustodyChallengeSignature
} from "../lib/source-signer-enrollment";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const now = new Date("2026-11-11T04:15:00.000Z");
const current = composeSignerEnrollmentAndOwnerReview({ now });
assert.equal(current.build, 366);
assert.equal(current.sources.length, 2);
assert.equal(
  current.sources[0].productionMain,
  "0010bbd5ae71cb025d77e613cce9bc6e3f064d34"
);
assert.equal(
  current.sources[1].productionMain,
  "00112c6714ecdf4d49dc114d4b29a0a8b9a8bced"
);
assert.equal(current.summary.pinVerifiedSources, 0);
assert.equal(current.summary.custodyVerifiedSources, 0);
assert.equal(current.summary.admittedHealthSources, 0);
assert.equal(current.summary.ownerReviewReadySources, 0);
assert.equal(current.sources[0].nextAction, "SUBMIT_INDEPENDENT_PUBLIC_KEY_PIN");
assert.equal(current.sources[1].nextAction, "SUBMIT_INDEPENDENT_PUBLIC_KEY_PIN");
assert.equal(current.policy.sourcePrivateKeysAccepted, false);
assert.equal(current.policy.sourcePrivateKeysStored, false);
assert.equal(current.policy.sourceSuppliedPinMaySelfVerify, false);
assert.equal(current.policy.possessionChallengeRequired, true);
assert.equal(current.policy.challengeLifetimeMinutes, 5);
assert.equal(current.policy.onlyEd25519Accepted, true);
assert.equal(current.policy.ownerReviewIsNotOwnerAcceptance, true);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const pin = trustedSignerFingerprint(publicKeyPem);
assert.equal(pinMatchesPublicKey(publicKeyPem, pin), true);
assert.equal(pinMatchesPublicKey(publicKeyPem, "sha256:" + "0".repeat(64)), false);

const challenge = {
  intakeId: "11111111-1111-4111-8111-111111111111",
  sourceId: "yw" as const,
  keyId: "yw-source-key-366",
  challengeText: "a".repeat(64),
  challengeExpiresAt: "2026-11-11T04:20:00.000Z"
};
const payload = custodyChallengePayload(challenge);
assert.ok(payload.includes(SOURCE_SIGNER_CUSTODY_CHALLENGE_SCHEMA));
const signatureBase64 = sign(null, Buffer.from(payload, "utf8"), privateKey).toString("base64");
assert.equal(
  verifyCustodyChallengeSignature({
    publicKeyPem,
    payload,
    signatureBase64
  }),
  true
);

const intakeEvents = [
  {
    eventId: "evt-submit",
    intakeId: challenge.intakeId,
    sourceId: "yw" as const,
    eventType: "SUBMITTED" as const,
    keyId: challenge.keyId,
    publicKeyPem,
    computedSpkiSha256: pin,
    independentPinSpkiSha256: pin,
    pinEvidenceURI: "urn:rosevear:evidence:yw-independent-pin",
    custodyEvidenceURI: "urn:rosevear:evidence:yw-custody",
    witnessEvidenceURI: "urn:rosevear:evidence:yw-witness",
    challengeText: null,
    challengeExpiresAt: null,
    challengeSignatureBase64: null,
    detail: "submitted",
    recordedAt: "2026-11-11T04:10:00.000Z"
  },
  {
    eventId: "evt-challenge",
    intakeId: challenge.intakeId,
    sourceId: "yw" as const,
    eventType: "CHALLENGE_ISSUED" as const,
    keyId: challenge.keyId,
    publicKeyPem: null,
    computedSpkiSha256: pin,
    independentPinSpkiSha256: pin,
    pinEvidenceURI: "urn:rosevear:evidence:yw-independent-pin",
    custodyEvidenceURI: "urn:rosevear:evidence:yw-custody",
    witnessEvidenceURI: "urn:rosevear:evidence:yw-witness",
    challengeText: challenge.challengeText,
    challengeExpiresAt: challenge.challengeExpiresAt,
    challengeSignatureBase64: null,
    detail: "challenge",
    recordedAt: "2026-11-11T04:11:00.000Z"
  },
  {
    eventId: "evt-custody",
    intakeId: challenge.intakeId,
    sourceId: "yw" as const,
    eventType: "CUSTODY_VERIFIED" as const,
    keyId: challenge.keyId,
    publicKeyPem: null,
    computedSpkiSha256: pin,
    independentPinSpkiSha256: pin,
    pinEvidenceURI: "urn:rosevear:evidence:yw-independent-pin",
    custodyEvidenceURI: "urn:rosevear:evidence:yw-custody",
    witnessEvidenceURI: "urn:rosevear:evidence:yw-witness",
    challengeText: challenge.challengeText,
    challengeExpiresAt: challenge.challengeExpiresAt,
    challengeSignatureBase64: signatureBase64,
    detail: "custody verified",
    recordedAt: "2026-11-11T04:12:00.000Z"
  },
  {
    eventId: "evt-committed",
    intakeId: challenge.intakeId,
    sourceId: "yw" as const,
    eventType: "ENROLLMENT_COMMITTED" as const,
    keyId: challenge.keyId,
    publicKeyPem: null,
    computedSpkiSha256: pin,
    independentPinSpkiSha256: pin,
    pinEvidenceURI: "urn:rosevear:evidence:yw-independent-pin",
    custodyEvidenceURI: "urn:rosevear:evidence:yw-custody",
    witnessEvidenceURI: "urn:rosevear:evidence:yw-witness",
    challengeText: null,
    challengeExpiresAt: null,
    challengeSignatureBase64: null,
    detail: "enrolled",
    recordedAt: "2026-11-11T04:13:00.000Z"
  }
];

const signerEvents = [
  {
    eventId: "registry-yw",
    sourceId: "yw" as const,
    eventType: "ENROLLED" as const,
    keyId: challenge.keyId,
    publicKeySpkiSha256: pin,
    custodyEvidenceURI: "urn:rosevear:evidence:yw-custody",
    independentlyVerifiedAt: "2026-11-11T04:12:00.000Z",
    recordedAt: "2026-11-11T04:13:00.000Z"
  }
];

const enrolled = composeSignerEnrollmentAndOwnerReview({
  enrollmentEvents: intakeEvents,
  signerEvents,
  now
});
assert.equal(enrolled.sources[0].pinMatched, true);
assert.equal(enrolled.sources[0].custodyVerified, true);
assert.equal(enrolled.sources[0].enrollmentCommitted, true);
assert.equal(enrolled.sources[0].trustedSignerKeyId, challenge.keyId);
assert.equal(enrolled.sources[0].nextAction, "ADMIT_GENUINE_SIGNED_HEALTH");
assert.equal(enrolled.sources[0].ownerReviewState, "HOLD");

const receipts = [
  {
    receiptId: "receipt-yw-366",
    sourceId: "yw" as const,
    keyId: challenge.keyId,
    sourceRevision: BUILD_365_SOURCE_HANDOFFS[0].productionMain,
    manifestRevision: BUILD_365_SOURCE_HANDOFFS[0].productionMain,
    receiptSha256: "b".repeat(64),
    nonce: "yw-build366-nonce",
    issuedAt: "2026-11-11T04:12:30.000Z",
    healthObservedAt: "2026-11-11T04:12:45.000Z",
    healthState: "HEALTHY" as const,
    sourceRuntime: "yw-production",
    verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
    verifiedAt: "2026-11-11T04:13:30.000Z"
  }
];
const admissionEvents = [
  {
    admissionEventId: "admission-yw-366",
    sourceId: "yw" as const,
    keyId: challenge.keyId,
    receiptSha256: "b".repeat(64),
    sourceRevision: BUILD_365_SOURCE_HANDOFFS[0].productionMain,
    outcome: "ADMITTED" as const,
    receiptId: "receipt-yw-366",
    blockers: [],
    recordedAt: "2026-11-11T04:13:31.000Z"
  }
];
const admitted = composeSignerEnrollmentAndOwnerReview({
  enrollmentEvents: intakeEvents,
  signerEvents,
  receipts,
  admissionEvents,
  now
});
assert.equal(admitted.sources[0].healthAdmissionState, "ADMITTED");
assert.equal(admitted.sources[0].receiptCurrent, true);
assert.equal(admitted.sources[0].nextAction, "WAIT_FOR_MASTER_RUNTIME_CLOSURE");
assert.equal(admitted.sources[0].ownerReviewState, "HOLD");

const migration = source(
  "../../db/migrations/0130_master_source_signer_enrollment_health_admission.sql"
);
for (const token of [
  "master_source_signer_enrollment_intake_events",
  "master_source_health_admission_events",
  "CHALLENGE_ISSUED",
  "CUSTODY_VERIFIED",
  "ENROLLMENT_COMMITTED",
  "ADMITTED",
  "REJECTED",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.toLowerCase().includes("private_key"));

const database = source("lib/source-signer-enrollment-database.ts");
for (const token of [
  "submitSignerEnrollmentIntake",
  "issueSignerCustodyChallenge",
  "verifySignerCustodyAndEnroll",
  "admitGenuineSignedHealthReceipt",
  "recordVerifiedConvergenceReceiptWithClient",
  "build366_existing_active_signer_requires_revocation",
  "TRUSTED_SIGNER_ENROLLED"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("private_key"));

const trustDatabase = source("lib/source-trust-ledger-database.ts");
assert.ok(trustDatabase.includes("recordVerifiedConvergenceReceiptWithClient"));

const api = source("app/api/source-signer-enrollment/route.ts");
for (const action of [
  "submit-signer-intake",
  "issue-custody-challenge",
  "verify-custody-and-enroll",
  "admit-health-receipt"
]) {
  assert.ok(api.includes(action), "API action " + action);
}
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/source-signer-enrollment/page.tsx");
for (const token of [
  "Build 366 · Independent signer admission",
  "No signer is enrolled merely because code or deployment is GREEN.",
  "Owner review preparation is not owner acceptance."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/source-signer-enrollment"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/source-signer-enrollment"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_source_signer_enrollment_intake_events"',
  '"master_source_health_admission_events"',
  '"0130_master_source_signer_enrollment_health_admission.sql"'
]) {
  assert.ok(dbSpine.includes(token), "db spine token " + token);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-366-source-signer-enrollment-health-admission.ts";
assert.equal(String(pkg.scripts["verify:build366"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 366 Independent Source Signer Enrollment Intake, Public-Key Pin Custody Verification, Genuine Signed Health Receipt Admission & Owner Review Preparation verification passed."
);
