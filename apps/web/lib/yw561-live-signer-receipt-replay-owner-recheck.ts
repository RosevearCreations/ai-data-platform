import type {
  ConvergenceLedgerReceipt,
  OwnerDecisionAuditEvent,
  SignerRegistryEvent
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import type { CustodyIntakeEvent } from "./manifest-custody-receipt-decision";
import {
  BUILD_372_MASTER_SNAPSHOT,
  BUILD_372_YW561_OBSERVATION,
  composeBuild372Yw561Closure,
  type Build372CustodyEvidenceEvent,
  type Build372ReplayCorrelationEvent
} from "./yw561-signer-receipt-replay-closure";

export const BUILD_373 = 373 as const;
export const BUILD_373_SCHEMA =
  "rosevear.ai-data-platform.yw561-live-signer-receipt-replay-owner-recheck.v1" as const;
export const BUILD_373_CONTROLLER_BASE_REVISION =
  "f1cc5109d31099adbe875dfab0bb2b74eddeeddd" as const;

export const BUILD_373_YW561_LIVE_OBSERVATION = Object.freeze({
  ...BUILD_372_YW561_OBSERVATION,
  responseEtag: 'W/"8b0cf2ba82acd127725cead598b46a36"',
  requestTrace: "iad1:iad1::d6r5j-1794427197324-e2340b032d80",
  observedAt: "2026-11-11T19:59:57.000Z",
  evidenceURI:
    "urn:rosevear:evidence:build373:vercel:yw:dpl_5775v27Ginzas21xz8dP8PT1MUbv"
});

export type Build373MasterOverride = {
  gateState?: "OPEN" | "HOLD";
};

export function composeBuild373Yw561OwnerRecheck(input: {
  signerEvents?: readonly SignerRegistryEvent[];
  custodyEvents?: readonly CustodyIntakeEvent[];
  custodyEvidenceEvents?: readonly Build372CustodyEvidenceEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  replayEvents?: readonly Build372ReplayCorrelationEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  now?: Date;
  masterOverride?: Build373MasterOverride;
} = {}) {
  const build372 = composeBuild372Yw561Closure({
    signerEvents: input.signerEvents,
    custodyEvents: input.custodyEvents,
    custodyEvidenceEvents: input.custodyEvidenceEvents,
    receipts: input.receipts,
    admissionEvents: input.admissionEvents,
    replayEvents: input.replayEvents,
    ownerDecisions: input.ownerDecisions,
    now: input.now
  });

  const observation = BUILD_373_YW561_LIVE_OBSERVATION;
  const identityState =
    observation.productionMain === observation.deploymentGitRevision &&
    observation.productionMain === observation.deployedManifestRevision &&
    observation.sourceRole === "platform_shell" &&
    observation.tenantBoundary === "platform_shell"
      ? ("VERIFIED_EXACT" as const)
      : ("HOLD" as const);

  const signerCorrelationState =
    identityState === "VERIFIED_EXACT" &&
    build372.signerState === "VERIFIED_CORRELATED" &&
    build372.custodyIntakeState === "VERIFIED_CORRELATED"
      ? ("VERIFIED_CORRELATED" as const)
      : build372.signerState;

  const receiptClosureState =
    signerCorrelationState === "VERIFIED_CORRELATED" &&
    build372.receiptState === "VERIFIED_CURRENT"
      ? ("VERIFIED_CURRENT" as const)
      : build372.receiptState;

  const replayAcceptanceState =
    receiptClosureState === "VERIFIED_CURRENT" &&
    build372.replayState === "VERIFIED_CORRELATED"
      ? ("ACCEPTED" as const)
      : build372.replayState === "VERIFIED_CORRELATED"
        ? ("HOLD_RECEIPT_NOT_CURRENT" as const)
        : build372.replayState;

  const sourceEvidenceState =
    identityState === "VERIFIED_EXACT" &&
    signerCorrelationState === "VERIFIED_CORRELATED" &&
    receiptClosureState === "VERIFIED_CURRENT" &&
    replayAcceptanceState === "ACCEPTED"
      ? ("READY" as const)
      : ("HOLD" as const);

  const currentMasterGate = build372.master.gateState;
  const masterGateState = input.masterOverride?.gateState ?? currentMasterGate;
  const exactReceipt = build372.latestReceipt;
  const decisions = input.ownerDecisions ?? [];
  const latestDecision =
    decisions
      .filter(
        (decision) =>
          decision.sourceId === "yw" &&
          exactReceipt !== null &&
          decision.receiptId === exactReceipt.receiptId
      )
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

  const ownerDecisionState =
    sourceEvidenceState !== "READY" || masterGateState !== "OPEN"
      ? ("HOLD" as const)
      : latestDecision?.decision === "ACCEPT"
        ? ("ACCEPTED" as const)
        : latestDecision?.decision === "REJECT"
          ? ("REJECTED" as const)
          : ("READY_FOR_OWNER_DECISION" as const);

  const blockers = [
    ...(identityState !== "VERIFIED_EXACT"
      ? ["YW561 live production identity is not exact."]
      : []),
    ...(signerCorrelationState !== "VERIFIED_CORRELATED"
      ? [`YW561 live source-health signer enrollment correlation remains ${signerCorrelationState}.`]
      : []),
    ...(receiptClosureState !== "VERIFIED_CURRENT"
      ? [`Exact YW561 signed HEALTHY receipt closure remains ${receiptClosureState}.`]
      : []),
    ...(replayAcceptanceState !== "ACCEPTED"
      ? [`YW561 durable source-health replay acceptance remains ${replayAcceptanceState}.`]
      : []),
    ...(masterGateState !== "OPEN"
      ? ["AI Hub 309 / Comms QL-417 three-Master runtime gate remains HOLD."]
      : []),
    ...(sourceEvidenceState === "READY" &&
    masterGateState === "OPEN" &&
    ownerDecisionState === "READY_FOR_OWNER_DECISION"
      ? ["All technical gates are ready; an explicit owner ACCEPT or REJECT decision is still required."]
      : [])
  ];

  return {
    schema: BUILD_373_SCHEMA,
    build: BUILD_373,
    controllerBaseRevision: BUILD_373_CONTROLLER_BASE_REVISION,
    observation,
    liveManifestSignatureState: observation.signatureState,
    identityState,
    signerCorrelationState,
    signer: build372.signer,
    custodyIntake: build372.custodyIntake,
    custodyEvidenceEvent: build372.custodyEvidenceEvent,
    receipt: exactReceipt,
    admission: build372.latestAdmission,
    receiptClosureState,
    replayEvent: build372.replayEvent,
    replayAcceptanceState,
    sourceEvidenceState,
    master: {
      snapshot: BUILD_372_MASTER_SNAPSHOT,
      currentGateState: currentMasterGate,
      gateState: masterGateState
    },
    latestExactReceiptOwnerDecision: latestDecision?.decision ?? "PENDING",
    latestExactReceiptOwnerDecisionId: latestDecision?.decisionId ?? null,
    ownerDecisionState,
    blockers,
    policy: {
      liveProductionIdentityRequired: true,
      independentSourceHealthSignerRequired: true,
      build372CustodyCorrelationRequired: true,
      exactYw561ReceiptRequired: true,
      controllerReceiptAdmissionRequired: true,
      durableReplayMustBeAccepted: true,
      providerEvidenceMaySatisfySourceHealth: false,
      threeMasterGateMustBeOpen: true,
      ownerDecisionMustReferenceExactReceipt: true,
      ownerDecisionRemainsExplicit: true,
      sourcePrivateKeyMayBeStored: false,
      codeGreenIsRuntimeAcceptance: false
    }
  };
}

export type Build373Yw561OwnerRecheckModel = ReturnType<
  typeof composeBuild373Yw561OwnerRecheck
>;
