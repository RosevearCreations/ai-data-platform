import {
  BUILD_373_YW561_LIVE_OBSERVATION,
  composeBuild373Yw561OwnerRecheck
} from "./yw561-live-signer-receipt-replay-owner-recheck";

export const BUILD_374 = 374 as const;
export const BUILD_374_SCHEMA =
  "rosevear.ai-data-platform.yw561-trusted-source-health-activation-owner-gate.v1" as const;
export const BUILD_374_CONTROLLER_BASE_REVISION =
  "2e5405519b5c96a7bbd803688a099eae300dde31" as const;

export const BUILD_374_MASTER_RUNTIME = Object.freeze({
  aiHub: {
    build: 309,
    main: "0a94c72ee4a1ded1babeac68deeb981ad33835ef",
    originalHostEvidence: "HOLD",
    receiverAck: "HOLD",
    sampledUptime: "UNKNOWN",
    ownerDecision: "HOLD"
  },
  comms: {
    build: "QL-417",
    main: "6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6",
    originalHostTelemetry: "HOLD",
    durableReplay: "HOLD",
    signedAck: "HOLD",
    ownerDecisionContinuity: "HOLD"
  }
} as const);

export type Build374Input = Parameters<typeof composeBuild373Yw561OwnerRecheck>[0];

export function composeBuild374Yw561Activation(input: Build374Input = {}) {
  const prior = composeBuild373Yw561OwnerRecheck(input);
  const observation = BUILD_373_YW561_LIVE_OBSERVATION;

  const trustedSignerAdmissionState =
    prior.identityState === "VERIFIED_EXACT" &&
    prior.signerCorrelationState === "VERIFIED_CORRELATED" &&
    prior.signer !== null &&
    prior.custodyIntake !== null &&
    prior.custodyEvidenceEvent !== null
      ? ("ADMITTED" as const)
      : ("HOLD" as const);

  const currentReceiptActivationState =
    trustedSignerAdmissionState === "ADMITTED" &&
    prior.receiptClosureState === "VERIFIED_CURRENT" &&
    prior.receipt !== null &&
    prior.admission?.outcome === "ADMITTED" &&
    prior.admission.receiptId === prior.receipt.receiptId &&
    prior.receipt.keyId === prior.signer?.keyId
      ? ("ACTIVE_CURRENT" as const)
      : ("HOLD" as const);

  const currentReplayActivationState =
    currentReceiptActivationState === "ACTIVE_CURRENT" &&
    prior.replayAcceptanceState === "ACCEPTED" &&
    prior.replayEvent !== null &&
    prior.receipt !== null &&
    prior.replayEvent.receiptId === prior.receipt.receiptId
      ? ("ACTIVE_CURRENT" as const)
      : ("HOLD" as const);

  const sourceHealthActivationState =
    trustedSignerAdmissionState === "ADMITTED" &&
    currentReceiptActivationState === "ACTIVE_CURRENT" &&
    currentReplayActivationState === "ACTIVE_CURRENT"
      ? ("ACTIVE" as const)
      : ("HOLD" as const);

  const threeMasterRuntimeCorrelationState =
    prior.master.gateState === "OPEN"
      ? ("CORRELATED_OPEN" as const)
      : ("HOLD" as const);

  const ownerAcceptanceGateState =
    sourceHealthActivationState !== "ACTIVE" ||
    threeMasterRuntimeCorrelationState !== "CORRELATED_OPEN"
      ? ("HOLD" as const)
      : prior.latestExactReceiptOwnerDecision === "ACCEPT"
        ? ("ACCEPTED" as const)
        : prior.latestExactReceiptOwnerDecision === "REJECT"
          ? ("REJECTED" as const)
          : ("READY_FOR_EXPLICIT_OWNER_ACCEPTANCE" as const);

  const blockers = [
    ...(trustedSignerAdmissionState !== "ADMITTED"
      ? ["Trusted YW561 source-health signer admission remains HOLD."]
      : []),
    ...(currentReceiptActivationState !== "ACTIVE_CURRENT"
      ? ["Current exact YW561 signed HEALTHY receipt activation remains HOLD."]
      : []),
    ...(currentReplayActivationState !== "ACTIVE_CURRENT"
      ? ["Current YW561 durable replay evidence activation remains HOLD."]
      : []),
    ...(threeMasterRuntimeCorrelationState !== "CORRELATED_OPEN"
      ? ["AI Hub 309 / Comms QL-417 three-Master runtime evidence correlation remains HOLD."]
      : []),
    ...(sourceHealthActivationState === "ACTIVE" &&
    threeMasterRuntimeCorrelationState === "CORRELATED_OPEN" &&
    ownerAcceptanceGateState === "READY_FOR_EXPLICIT_OWNER_ACCEPTANCE"
      ? ["All technical activation gates are open; explicit owner ACCEPT or REJECT is still required for the exact current receipt."]
      : [])
  ];

  return {
    schema: BUILD_374_SCHEMA,
    build: BUILD_374,
    controllerBaseRevision: BUILD_374_CONTROLLER_BASE_REVISION,
    observation,
    trustedSignerAdmissionState,
    trustedSigner: prior.signer,
    custodyIntake: prior.custodyIntake,
    custodyEvidenceEvent: prior.custodyEvidenceEvent,
    currentReceiptActivationState,
    currentReceipt: prior.receipt,
    currentReceiptAdmission: prior.admission,
    currentReplayActivationState,
    currentReplayEvidence: prior.replayEvent,
    sourceHealthActivationState,
    masterRuntime: BUILD_374_MASTER_RUNTIME,
    threeMasterRuntimeGate: prior.master.gateState,
    threeMasterRuntimeCorrelationState,
    latestExactReceiptOwnerDecision: prior.latestExactReceiptOwnerDecision,
    latestExactReceiptOwnerDecisionId: prior.latestExactReceiptOwnerDecisionId,
    ownerAcceptanceGateState,
    connectionState: "NOT_INFERRED" as const,
    blockers,
    policy: {
      exactYw561ProductionIdentityRequired: true,
      trustedSignerMustBeControllerCorrelated: true,
      trustedSignerPrivateKeyAccepted: false,
      exactCurrentReceiptRequired: true,
      controllerHealthAdmissionRequired: true,
      durableReplayForExactReceiptRequired: true,
      providerDeliveryEvidenceCannotActivateSourceHealth: true,
      threeMasterRuntimeEvidenceMustCorrelate: true,
      explicitOwnerDecisionRequired: true,
      ownerDecisionMustReferenceExactCurrentReceipt: true,
      codeGreenCannotOpenRuntimeGate: true,
      connectedStateMayBeInferred: false
    },
    prior
  };
}

export type Build374Yw561ActivationModel = ReturnType<typeof composeBuild374Yw561Activation>;
