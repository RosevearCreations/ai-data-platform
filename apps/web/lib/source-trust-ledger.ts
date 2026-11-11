import { createHash, createPublicKey } from "node:crypto";

import { composeMasterActivationEvidenceReconciliation } from "./master-activation-evidence-reconciliation";

export const SOURCE_TRUST_LEDGER_BUILD = 365 as const;
export const SOURCE_TRUST_LEDGER_SCHEMA =
  "rosevear.ai-data-platform.source-trust-receipt-owner-audit.v1" as const;

export const BUILD_365_SOURCE_HANDOFFS = Object.freeze([
  {
    sourceId: "yw",
    sourceAppId: "yard-workers",
    label: "Yard Workers",
    repository: "RosevearCreations/yw",
    productionMain: "0010bbd5ae71cb025d77e613cce9bc6e3f064d34",
    revisionState: "VERIFIED",
    manifestState: "DEPLOYMENT_BOUND_UNSIGNED",
    signerState: "HOLD_UNENROLLED",
    signedHealthState: "HOLD",
    sourceDurableReplayState: "HOLD",
    tenantBoundary: "PRESERVED",
    connectionState: "HOLD",
    ownerAcceptanceState: "HOLD",
    credentialsExposed: "NONE"
  },
  {
    sourceId: "icamp",
    sourceAppId: "icamp",
    label: "iCamp",
    repository: "RosevearCreations/iCamp",
    productionMain: "00112c6714ecdf4d49dc114d4b29a0a8b9a8bced",
    revisionState: "VERIFIED",
    manifestState: "MATCHED",
    signerState: "HOLD_UNENROLLED",
    signedHealthState: "HOLD",
    sourceDurableReplayState: "HOLD",
    tenantBoundary: "PRESERVED",
    connectionState: "HOLD",
    ownerAcceptanceState: "HOLD",
    credentialsExposed: "NONE"
  }
] as const);

export type Source365Id = "yw" | "icamp";
export type SignerRegistryEvent = {
  eventId: string;
  sourceId: Source365Id;
  eventType: "ENROLLED" | "REVOKED";
  keyId: string;
  publicKeySpkiSha256: string;
  custodyEvidenceURI: string;
  independentlyVerifiedAt: string;
  recordedAt: string;
};

export type ConvergenceLedgerReceipt = {
  receiptId: string;
  sourceId: Source365Id;
  keyId: string;
  sourceRevision: string;
  manifestRevision: string;
  receiptSha256: string;
  nonce: string;
  issuedAt: string;
  healthObservedAt: string;
  healthState: "HEALTHY";
  sourceRuntime: string;
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH";
  verifiedAt: string;
};

export type OwnerDecisionAuditEvent = {
  decisionId: string;
  sourceId: Source365Id;
  receiptId: string | null;
  decision: "HOLD" | "ACCEPT" | "REJECT";
  evidenceURI: string;
  detail: string;
  decidedAt: string;
  recordedAt: string;
};

export function trustedSignerFingerprint(publicKeyPem: string) {
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("build365_signer_not_ed25519");
  }
  return (
    "sha256:" +
    createHash("sha256")
      .update(key.export({ format: "der", type: "spki" }))
      .digest("hex")
  );
}

export function summarizeReceiptAge(
  receipt: Pick<ConvergenceLedgerReceipt, "issuedAt" | "healthObservedAt">,
  now = new Date()
) {
  const issued = Date.parse(receipt.issuedAt);
  const observed = Date.parse(receipt.healthObservedAt);
  const nowMs = now.getTime();
  const ageMs = Math.max(nowMs - issued, nowMs - observed);
  if (!Number.isFinite(ageMs) || ageMs < 0) return "INVALID" as const;
  if (ageMs <= 15 * 60 * 1000) return "CURRENT" as const;
  if (ageMs <= 24 * 60 * 60 * 1000) return "AGED" as const;
  return "EXPIRED" as const;
}

function latestByKey(events: readonly SignerRegistryEvent[]) {
  const latest = new Map<string, SignerRegistryEvent>();
  for (const event of [...events].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  )) {
    latest.set(event.sourceId + ":" + event.keyId, event);
  }
  return latest;
}

export function composeSourceTrustLedger(input: {
  signerEvents?: readonly SignerRegistryEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  now?: Date;
} = {}) {
  const signerEvents = input.signerEvents ?? [];
  const receipts = input.receipts ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const now = input.now ?? new Date();
  const latestSignerEvents = latestByKey(signerEvents);
  const master = composeMasterActivationEvidenceReconciliation();

  const sources = BUILD_365_SOURCE_HANDOFFS.map((source) => {
    const sourceId = source.sourceId as Source365Id;
    const activeSigners = [...latestSignerEvents.values()].filter(
      (event) => event.sourceId === sourceId && event.eventType === "ENROLLED"
    );
    const sourceReceipts = receipts
      .filter((receipt) => receipt.sourceId === sourceId)
      .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
    const latestReceipt = sourceReceipts[0] ?? null;
    const latestDecision =
      ownerDecisions
        .filter((decision) => decision.sourceId === sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
    const receiptAge = latestReceipt
      ? summarizeReceiptAge(latestReceipt, now)
      : ("NOT_RECEIVED" as const);
    const signerRegistryState =
      activeSigners.length === 0
        ? ("HOLD_UNENROLLED" as const)
        : activeSigners.length === 1
          ? ("TRUSTED_SIGNER_ENROLLED" as const)
          : ("HOLD_AMBIGUOUS_MULTIPLE_ACTIVE_SIGNERS" as const);
    const receiptState =
      !latestReceipt
        ? ("NOT_RECEIVED" as const)
        : receiptAge === "CURRENT"
          ? ("VERIFIED_CURRENT" as const)
          : ("VERIFIED_AGED" as const);

    return {
      ...source,
      signerRegistryState,
      activeSignerCount: activeSigners.length,
      activeSignerKeyIds: activeSigners.map((signer) => signer.keyId),
      receiptCount: sourceReceipts.length,
      latestReceipt,
      receiptAge,
      receiptState,
      replayLedgerReady: true,
      latestOwnerDecision: latestDecision,
      ownerDecisionState: latestDecision?.decision ?? "PENDING",
      sourceReadyForOwnerReview:
        signerRegistryState === "TRUSTED_SIGNER_ENROLLED" &&
        receiptState === "VERIFIED_CURRENT" &&
        master.summary.mastersSynced
    };
  });

  return {
    schema: SOURCE_TRUST_LEDGER_SCHEMA,
    build: SOURCE_TRUST_LEDGER_BUILD,
    sources,
    summary: {
      masterState: master.summary.masterState,
      masterGateOpen: master.summary.mastersSynced,
      enrolledSignerSources: sources.filter(
        (source) => source.signerRegistryState === "TRUSTED_SIGNER_ENROLLED"
      ).length,
      currentVerifiedReceiptSources: sources.filter(
        (source) => source.receiptState === "VERIFIED_CURRENT"
      ).length,
      ownerAcceptedSources: sources.filter(
        (source) => source.ownerDecisionState === "ACCEPT"
      ).length,
      closureState: sources.every(
        (source) =>
          source.sourceReadyForOwnerReview &&
          source.ownerDecisionState === "ACCEPT"
      )
        ? ("SUPERVISED_ACCEPTANCE_CLOSED" as const)
        : ("HOLD" as const)
    },
    policy: {
      sourcePrivateKeysStored: false,
      receiptPublicKeyMaySelfEstablishTrust: false,
      signerRegistryAppendOnly: true,
      receiptLedgerAppendOnly: true,
      ownerDecisionAuditAppendOnly: true,
      duplicateNonceRejected: true,
      agedReceiptMayAuthorizeAcceptance: false,
      deploymentGreenIsSignedHealth: false,
      sourceHealthIsConnectionAcceptance: false,
      controllerMayAutoAcceptOwnerDecision: false
    }
  };
}

export type SourceTrustLedgerModel = ReturnType<typeof composeSourceTrustLedger>;
