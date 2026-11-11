import { createHash, verify as verifySignature } from "node:crypto";

import {
  BUILD_363_SOURCE_SNAPSHOT,
  composeSourceConvergence
} from "./source-convergence";

export const CONVERGENCE_RECEIPT_BUILD = 364 as const;
export const CONVERGENCE_RECEIPT_SCHEMA =
  "rosevear.ai-data-platform.source-convergence-receipt.v1" as const;

export type ConvergenceReceiptHealth = {
  state: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  revision: string;
  observedAt: string;
  sourceRuntime: string;
};

export type ConvergenceReceipt = {
  schema: typeof CONVERGENCE_RECEIPT_SCHEMA;
  receiptVersion: 1;
  handoffToken: string;
  sourceId: "yw" | "icamp";
  sourceAppId: string;
  repository: string;
  sourceRevision: string;
  manifestRevision: string;
  keyId: string;
  publicKeyPem: string;
  issuedAt: string;
  nonce: string;
  health: ConvergenceReceiptHealth;
  signatureBase64: string;
};

export type OwnerDecision =
  | "PENDING"
  | "ACCEPT"
  | "REJECT";

export type ReceiptInput = {
  receipt?: ConvergenceReceipt | null;
  ownerDecision?: OwnerDecision;
};

export type Build364Options = {
  receipts?: Partial<Record<"yw" | "icamp", ReceiptInput>>;
  seenNonces?: string[];
  now?: string;
  maxReceiptAgeMs?: number;
};

export function canonicalConvergenceReceiptPayload(
  receipt: Omit<ConvergenceReceipt, "signatureBase64">
) {
  return JSON.stringify({
    schema: receipt.schema,
    receiptVersion: receipt.receiptVersion,
    handoffToken: receipt.handoffToken,
    sourceId: receipt.sourceId,
    sourceAppId: receipt.sourceAppId,
    repository: receipt.repository,
    sourceRevision: receipt.sourceRevision,
    manifestRevision: receipt.manifestRevision,
    keyId: receipt.keyId,
    issuedAt: receipt.issuedAt,
    nonce: receipt.nonce,
    health: {
      state: receipt.health.state,
      revision: receipt.health.revision,
      observedAt: receipt.health.observedAt,
      sourceRuntime: receipt.health.sourceRuntime
    }
  });
}

export function verifyConvergenceReceiptSignature(
  receipt: ConvergenceReceipt
) {
  try {
    const payload = canonicalConvergenceReceiptPayload({
      schema: receipt.schema,
      receiptVersion: receipt.receiptVersion,
      handoffToken: receipt.handoffToken,
      sourceId: receipt.sourceId,
      sourceAppId: receipt.sourceAppId,
      repository: receipt.repository,
      sourceRevision: receipt.sourceRevision,
      manifestRevision: receipt.manifestRevision,
      keyId: receipt.keyId,
      publicKeyPem: receipt.publicKeyPem,
      issuedAt: receipt.issuedAt,
      nonce: receipt.nonce,
      health: receipt.health
    });
    return verifySignature(
      null,
      Buffer.from(payload, "utf8"),
      receipt.publicKeyPem,
      Buffer.from(receipt.signatureBase64, "base64")
    );
  } catch {
    return false;
  }
}

function receiptHash(receipt: ConvergenceReceipt) {
  return createHash("sha256")
    .update(canonicalConvergenceReceiptPayload({
      schema: receipt.schema,
      receiptVersion: receipt.receiptVersion,
      handoffToken: receipt.handoffToken,
      sourceId: receipt.sourceId,
      sourceAppId: receipt.sourceAppId,
      repository: receipt.repository,
      sourceRevision: receipt.sourceRevision,
      manifestRevision: receipt.manifestRevision,
      keyId: receipt.keyId,
      publicKeyPem: receipt.publicKeyPem,
      issuedAt: receipt.issuedAt,
      nonce: receipt.nonce,
      health: receipt.health
    }))
    .digest("hex");
}

export function composeConvergenceReceiptIntake(
  options: Build364Options = {}
) {
  const convergence = composeSourceConvergence();
  const masterGateOpen = convergence.summary.masterState === "MASTERS_SYNCED";
  const seenNonces = new Set(options.seenNonces ?? []);
  const maxReceiptAgeMs = options.maxReceiptAgeMs ?? 15 * 60 * 1000;
  const nowMs = Date.parse(options.now ?? new Date().toISOString());

  const sources = BUILD_363_SOURCE_SNAPSHOT.map((expected) => {
    const sourceId = expected.sourceId as "yw" | "icamp";
    const input = options.receipts?.[sourceId] ?? {};
    const receipt = input.receipt ?? null;
    const ownerDecision = input.ownerDecision ?? "PENDING";

    if (!receipt) {
      return {
        sourceId,
        label: expected.label,
        repository: expected.repository,
        expectedRevision: expected.productionMain,
        handoffToken: expected.sourceHandoff,
        receiptState: "NOT_RECEIVED" as const,
        identityBound: false,
        revisionBound: false,
        signatureVerified: false,
        signerIdentityPresent: false,
        replaySafe: false,
        fresh: false,
        healthCorrelated: false,
        sourceEvidenceVerified: false,
        receiptHash: null,
        ownerDecision,
        decisionQueueState: "WAIT_FOR_SOURCE_RECEIPT" as const,
        blockers: [
          `${expected.label}: convergence receipt has not been received.`
        ]
      };
    }

    const issuedAtMs = Date.parse(receipt.issuedAt);
    const observedAtMs = Date.parse(receipt.health.observedAt);
    const timestampValid =
      Number.isFinite(issuedAtMs) &&
      Number.isFinite(observedAtMs) &&
      Number.isFinite(nowMs);
    const fresh =
      timestampValid &&
      issuedAtMs <= nowMs &&
      observedAtMs <= nowMs &&
      nowMs - issuedAtMs <= maxReceiptAgeMs &&
      nowMs - observedAtMs <= maxReceiptAgeMs;

    const identityBound =
      receipt.schema === CONVERGENCE_RECEIPT_SCHEMA &&
      receipt.receiptVersion === 1 &&
      receipt.handoffToken === expected.sourceHandoff &&
      receipt.sourceId === expected.sourceId &&
      receipt.sourceAppId === expected.sourceAppId &&
      receipt.repository === expected.repository;

    const revisionBound =
      receipt.sourceRevision === expected.productionMain &&
      receipt.manifestRevision === expected.productionMain &&
      receipt.health.revision === expected.productionMain;

    const signerIdentityPresent =
      Boolean(receipt.keyId.trim()) &&
      Boolean(receipt.publicKeyPem.trim());

    const signatureVerified =
      signerIdentityPresent &&
      verifyConvergenceReceiptSignature(receipt);

    const replaySafe =
      Boolean(receipt.nonce.trim()) &&
      !seenNonces.has(receipt.nonce);

    const healthCorrelated =
      receipt.health.state === "HEALTHY" &&
      Boolean(receipt.health.sourceRuntime.trim()) &&
      receipt.health.revision === expected.productionMain;

    const sourceEvidenceVerified =
      identityBound &&
      revisionBound &&
      signerIdentityPresent &&
      signatureVerified &&
      replaySafe &&
      fresh &&
      healthCorrelated;

    const blockers = [
      ...(!identityBound
        ? [`${expected.label}: receipt identity/handoff binding failed.`]
        : []),
      ...(!revisionBound
        ? [`${expected.label}: receipt revision does not converge on current production main.`]
        : []),
      ...(!signerIdentityPresent
        ? [`${expected.label}: independent signer identity/public key is missing.`]
        : []),
      ...(!signatureVerified
        ? [`${expected.label}: Ed25519 source-bound signature verification failed.`]
        : []),
      ...(!replaySafe
        ? [`${expected.label}: receipt nonce is missing or already seen.`]
        : []),
      ...(!fresh
        ? [`${expected.label}: receipt/health evidence is stale or has an invalid timestamp.`]
        : []),
      ...(!healthCorrelated
        ? [`${expected.label}: HEALTHY evidence is not correlated to the exact production revision.`]
        : [])
    ];

    let decisionQueueState:
      | "EVIDENCE_HOLD"
      | "WAIT_FOR_MASTER_RUNTIME_CLOSURE"
      | "READY_FOR_OWNER_DECISION"
      | "OWNER_ACCEPTED"
      | "OWNER_REJECTED";

    if (!sourceEvidenceVerified) {
      decisionQueueState = "EVIDENCE_HOLD";
    } else if (!masterGateOpen) {
      decisionQueueState = "WAIT_FOR_MASTER_RUNTIME_CLOSURE";
    } else if (ownerDecision === "ACCEPT") {
      decisionQueueState = "OWNER_ACCEPTED";
    } else if (ownerDecision === "REJECT") {
      decisionQueueState = "OWNER_REJECTED";
    } else {
      decisionQueueState = "READY_FOR_OWNER_DECISION";
    }

    return {
      sourceId,
      label: expected.label,
      repository: expected.repository,
      expectedRevision: expected.productionMain,
      handoffToken: expected.sourceHandoff,
      receiptState: "RECEIVED" as const,
      identityBound,
      revisionBound,
      signatureVerified,
      signerIdentityPresent,
      replaySafe,
      fresh,
      healthCorrelated,
      sourceEvidenceVerified,
      receiptHash: receiptHash(receipt),
      ownerDecision,
      decisionQueueState,
      blockers
    };
  });

  const verifiedSourceCount = sources.filter(
    (source) => source.sourceEvidenceVerified
  ).length;
  const ownerAcceptedCount = sources.filter(
    (source) => source.decisionQueueState === "OWNER_ACCEPTED"
  ).length;

  return {
    schema: "rosevear.ai-data-platform.build-364.v1" as const,
    build: CONVERGENCE_RECEIPT_BUILD,
    masterState: convergence.summary.masterState,
    sources,
    summary: {
      receiptsReceived: sources.filter(
        (source) => source.receiptState === "RECEIVED"
      ).length,
      verifiedSourceCount,
      allSourceEvidenceVerified:
        verifiedSourceCount === sources.length,
      masterGateOpen,
      ownerAcceptedCount,
      allOwnerAccepted:
        ownerAcceptedCount === sources.length,
      closureState:
        verifiedSourceCount !== sources.length
          ? ("SOURCE_EVIDENCE_HOLD" as const)
          : !masterGateOpen
            ? ("MASTER_RUNTIME_HOLD" as const)
            : ownerAcceptedCount !== sources.length
              ? ("OWNER_DECISION_PENDING" as const)
              : ("SUPERVISED_ACCEPTANCE_CLOSED" as const)
    },
    policy: {
      ed25519VerificationRequired: true,
      exactSourceIdentityRequired: true,
      exactProductionRevisionRequired: true,
      replayProtectionRequired: true,
      freshHealthEvidenceRequired: true,
      deploymentGreenIsHealthProof: false,
      healthProofIsConnectionAcceptance: false,
      controllerMayAutoAcceptOwnerDecision: false,
      controllerMayStorePrivateSigningKeys: false,
      publicKeyOnlyAtControllerBoundary: true
    }
  };
}

export type ConvergenceReceiptIntakeModel = ReturnType<
  typeof composeConvergenceReceiptIntake
>;
