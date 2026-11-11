import { createHash, createPublicKey, verify } from "node:crypto";

import { composeMasterActivationEvidenceReconciliation } from "./master-activation-evidence-reconciliation";
import {
  BUILD_365_SOURCE_HANDOFFS,
  trustedSignerFingerprint,
  type ConvergenceLedgerReceipt,
  type SignerRegistryEvent,
  type Source365Id
} from "./source-trust-ledger";

export const SOURCE_SIGNER_ENROLLMENT_BUILD = 366 as const;
export const SOURCE_SIGNER_ENROLLMENT_SCHEMA =
  "rosevear.ai-data-platform.source-signer-enrollment-health-admission.v1" as const;
export const SOURCE_SIGNER_CUSTODY_CHALLENGE_SCHEMA =
  "rosevear.ai-data-platform.source-signer-custody-challenge.v1" as const;

export type SignerEnrollmentEvent = {
  eventId: string;
  intakeId: string;
  sourceId: Source365Id;
  eventType:
    | "SUBMITTED"
    | "CHALLENGE_ISSUED"
    | "CUSTODY_VERIFIED"
    | "ENROLLMENT_COMMITTED"
    | "REJECTED";
  keyId: string;
  publicKeyPem: string | null;
  computedSpkiSha256: string | null;
  independentPinSpkiSha256: string | null;
  pinEvidenceURI: string | null;
  custodyEvidenceURI: string | null;
  witnessEvidenceURI: string | null;
  challengeText: string | null;
  challengeExpiresAt: string | null;
  challengeSignatureBase64: string | null;
  detail: string;
  recordedAt: string;
};

export type HealthAdmissionEvent = {
  admissionEventId: string;
  sourceId: Source365Id;
  keyId: string;
  receiptSha256: string;
  sourceRevision: string;
  outcome: "ADMITTED" | "REJECTED";
  receiptId: string | null;
  blockers: string[];
  recordedAt: string;
};

export function normalizePin(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("sha256:") ? trimmed : "sha256:" + trimmed;
}

export function pinMatchesPublicKey(
  publicKeyPem: string,
  independentPinSpkiSha256: string
) {
  return trustedSignerFingerprint(publicKeyPem) === normalizePin(independentPinSpkiSha256);
}

export function custodyChallengePayload(input: {
  intakeId: string;
  sourceId: Source365Id;
  keyId: string;
  challengeText: string;
  challengeExpiresAt: string;
}) {
  return JSON.stringify({
    schema: SOURCE_SIGNER_CUSTODY_CHALLENGE_SCHEMA,
    intakeId: input.intakeId,
    sourceId: input.sourceId,
    keyId: input.keyId,
    challengeText: input.challengeText,
    challengeExpiresAt: input.challengeExpiresAt
  });
}

export function verifyCustodyChallengeSignature(input: {
  publicKeyPem: string;
  payload: string;
  signatureBase64: string;
}) {
  const key = createPublicKey(input.publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") return false;
  return verify(
    null,
    Buffer.from(input.payload, "utf8"),
    key,
    Buffer.from(input.signatureBase64, "base64")
  );
}

export function healthReceiptDigest(canonicalPayload: string) {
  return createHash("sha256").update(canonicalPayload).digest("hex");
}

function latestEventsByIntake(events: readonly SignerEnrollmentEvent[]) {
  const grouped = new Map<string, SignerEnrollmentEvent[]>();
  for (const event of [...events].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  )) {
    const current = grouped.get(event.intakeId) ?? [];
    current.push(event);
    grouped.set(event.intakeId, current);
  }
  return grouped;
}

function activeSignerEvents(events: readonly SignerRegistryEvent[]) {
  const latest = new Map<string, SignerRegistryEvent>();
  for (const event of [...events].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  )) {
    latest.set(event.sourceId + ":" + event.keyId, event);
  }
  return [...latest.values()].filter((event) => event.eventType === "ENROLLED");
}

export function composeSignerEnrollmentAndOwnerReview(input: {
  enrollmentEvents?: readonly SignerEnrollmentEvent[];
  signerEvents?: readonly SignerRegistryEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  now?: Date;
} = {}) {
  const enrollmentEvents = input.enrollmentEvents ?? [];
  const signerEvents = input.signerEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const now = input.now ?? new Date();
  const grouped = latestEventsByIntake(enrollmentEvents);
  const activeSigners = activeSignerEvents(signerEvents);
  const master = composeMasterActivationEvidenceReconciliation();

  const sources = BUILD_365_SOURCE_HANDOFFS.map((source) => {
    const sourceId = source.sourceId as Source365Id;
    const sourceIntakes = [...grouped.values()]
      .filter((events) => events[0]?.sourceId === sourceId)
      .sort((a, b) =>
        String(b.at(-1)?.recordedAt).localeCompare(String(a.at(-1)?.recordedAt))
      );
    const latestIntake = sourceIntakes[0] ?? [];
    const latestEvent = latestIntake.at(-1) ?? null;
    const submitted = latestIntake.find((event) => event.eventType === "SUBMITTED") ?? null;
    const challengeIssued =
      [...latestIntake].reverse().find((event) => event.eventType === "CHALLENGE_ISSUED") ?? null;
    const custodyVerified = latestIntake.some(
      (event) => event.eventType === "CUSTODY_VERIFIED"
    );
    const enrollmentCommitted = latestIntake.some(
      (event) => event.eventType === "ENROLLMENT_COMMITTED"
    );
    const rejected = latestEvent?.eventType === "REJECTED";
    const activeSigner =
      activeSigners.find((event) => event.sourceId === sourceId) ?? null;
    const sourceReceipts = receipts
      .filter((receipt) => receipt.sourceId === sourceId)
      .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
    const latestReceipt = sourceReceipts[0] ?? null;
    const latestAdmission =
      admissionEvents
        .filter((event) => event.sourceId === sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

    const challengeCurrent =
      challengeIssued?.challengeExpiresAt &&
      Date.parse(challengeIssued.challengeExpiresAt) >= now.getTime();
    const pinMatched =
      Boolean(submitted?.computedSpkiSha256) &&
      submitted?.computedSpkiSha256 === submitted?.independentPinSpkiSha256;
    const receiptCurrent =
      latestReceipt !== null &&
      Math.max(
        now.getTime() - Date.parse(latestReceipt.issuedAt),
        now.getTime() - Date.parse(latestReceipt.healthObservedAt)
      ) <= 15 * 60 * 1000;

    let nextAction:
      | "SUBMIT_INDEPENDENT_PUBLIC_KEY_PIN"
      | "ISSUE_CUSTODY_CHALLENGE"
      | "PROVE_PRIVATE_KEY_CUSTODY"
      | "ADMIT_GENUINE_SIGNED_HEALTH"
      | "WAIT_FOR_MASTER_RUNTIME_CLOSURE"
      | "READY_FOR_OWNER_REVIEW"
      | "RESTART_REJECTED_INTAKE";

    if (rejected) nextAction = "RESTART_REJECTED_INTAKE";
    else if (!submitted || !pinMatched) nextAction = "SUBMIT_INDEPENDENT_PUBLIC_KEY_PIN";
    else if (!challengeIssued || !challengeCurrent) nextAction = "ISSUE_CUSTODY_CHALLENGE";
    else if (!custodyVerified || !enrollmentCommitted || !activeSigner)
      nextAction = "PROVE_PRIVATE_KEY_CUSTODY";
    else if (!latestReceipt || latestAdmission?.outcome !== "ADMITTED" || !receiptCurrent)
      nextAction = "ADMIT_GENUINE_SIGNED_HEALTH";
    else if (!master.summary.mastersSynced)
      nextAction = "WAIT_FOR_MASTER_RUNTIME_CLOSURE";
    else nextAction = "READY_FOR_OWNER_REVIEW";

    return {
      ...source,
      latestIntakeId: latestEvent?.intakeId ?? null,
      latestIntakeEvent: latestEvent?.eventType ?? "NOT_SUBMITTED",
      pinMatched,
      challengeState:
        !challengeIssued
          ? ("NOT_ISSUED" as const)
          : challengeCurrent
            ? ("CURRENT" as const)
            : ("EXPIRED" as const),
      custodyVerified,
      enrollmentCommitted,
      trustedSignerKeyId: activeSigner?.keyId ?? null,
      healthAdmissionState: latestAdmission?.outcome ?? "NOT_RECEIVED",
      latestHealthReceiptId: latestReceipt?.receiptId ?? null,
      receiptCurrent,
      masterGateOpen: master.summary.mastersSynced,
      ownerReviewState:
        activeSigner &&
        latestAdmission?.outcome === "ADMITTED" &&
        receiptCurrent &&
        master.summary.mastersSynced
          ? ("READY_FOR_OWNER_REVIEW" as const)
          : ("HOLD" as const),
      nextAction
    };
  });

  return {
    schema: SOURCE_SIGNER_ENROLLMENT_SCHEMA,
    build: SOURCE_SIGNER_ENROLLMENT_BUILD,
    sources,
    summary: {
      masterState: master.summary.masterState,
      masterGateOpen: master.summary.mastersSynced,
      pinVerifiedSources: sources.filter((source) => source.pinMatched).length,
      custodyVerifiedSources: sources.filter((source) => source.custodyVerified).length,
      enrolledSignerSources: sources.filter((source) => source.enrollmentCommitted).length,
      admittedHealthSources: sources.filter(
        (source) => source.healthAdmissionState === "ADMITTED" && source.receiptCurrent
      ).length,
      ownerReviewReadySources: sources.filter(
        (source) => source.ownerReviewState === "READY_FOR_OWNER_REVIEW"
      ).length
    },
    policy: {
      sourcePrivateKeysAccepted: false,
      sourcePrivateKeysStored: false,
      sourceSuppliedPinMaySelfVerify: false,
      independentPinMustMatchComputedSpki: true,
      possessionChallengeRequired: true,
      challengeLifetimeMinutes: 5,
      onlyEd25519Accepted: true,
      receiptMustUseEnrolledSigner: true,
      receiptMustMatchCurrentSourceRevision: true,
      receiptMustBeFreshAndHealthy: true,
      rejectedReceiptMayEnterVerifiedLedger: false,
      ownerReviewIsNotOwnerAcceptance: true,
      controllerMayAutoAcceptOwnerDecision: false,
      childTenantMayBecomeSourceIdentity: false
    }
  };
}

export type SignerEnrollmentOwnerReviewModel = ReturnType<
  typeof composeSignerEnrollmentAndOwnerReview
>;
