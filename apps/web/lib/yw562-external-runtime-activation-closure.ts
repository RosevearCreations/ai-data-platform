import { createHash } from "node:crypto";

import type { MasterShellSourceEvidence } from "./master-shell-source-registry-core";

export type Build380RegistryEvidence = MasterShellSourceEvidence & {
  evidenceId: string;
};
import type { Build379ProtectedActivationModel } from "./yw562-protected-runtime-activation-decision";

export const BUILD_380 = 380 as const;
export const BUILD_380_SCHEMA =
  "rosevear.ai-data-platform.yw562-external-runtime-activation-closure.v1" as const;
export const BUILD_380_CONTROLLER_BASE_REVISION =
  "ce4216c667b514f40e2fb6e506e5b62c222b1736" as const;
export const BUILD_380_EXTERNAL_ACTIVATION_ENVELOPE_SCHEMA =
  "rosevear.ai-data-platform.build380.external-runtime-activation.v1" as const;

export const BUILD_380_RUNTIME = Object.freeze({
  yw: {
    build: 562,
    main: "6e0b77eebcfc77aa7fc48dcc398da958af8df696"
  },
  aiHub: {
    build: 313,
    main: "b790adf2e19343d1132fad0eef8107c21e3e560d",
    originalHost: "DESKTOP-AE894KC"
  },
  comms: {
    build: "QL-423",
    main: "2adc527a88adb790f0edc5192df62f03be8c397c"
  }
} as const);

export const BUILD_380_MASTER_RECEIPT_SCHEMA =
  "rosevear.ai-data-platform.build380.master-runtime-receipt.v1" as const;

export type Build380MasterRuntimeReceipt = {
  masterId: "rosevear-ai-hub" | "rosevear-comms-hub" | "ai-data-platform";
  receiptId: string;
  digest: string;
  runtimeState: "CONNECTED_SYNCED";
  signerKeyId: string;
  signatureSha256: string;
};

export type Build380MasterReceiptBinding = {
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  exactReceiptId: string;
  build379DecisionEventId: string;
  observedAt: string;
};

export function canonicalBuild380MasterRuntimeReceipt(
  receipt: Pick<
    Build380MasterRuntimeReceipt,
    "masterId" | "receiptId" | "digest" | "runtimeState" | "signerKeyId"
  >,
  binding: Build380MasterReceiptBinding
) {
  return JSON.stringify({
    schema: BUILD_380_MASTER_RECEIPT_SCHEMA,
    masterId: receipt.masterId,
    receiptId: receipt.receiptId,
    digest: receipt.digest,
    runtimeState: receipt.runtimeState,
    signerKeyId: receipt.signerKeyId,
    controllerRevision: binding.controllerRevision,
    sourceRevision: binding.sourceRevision,
    aiHubMain: binding.aiHubMain,
    commsMain: binding.commsMain,
    exactReceiptId: binding.exactReceiptId,
    build379DecisionEventId: binding.build379DecisionEventId,
    observedAt: binding.observedAt
  });
}

export type Build380ExternalActivationEnvelope = {
  authorityKeyId: string;
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  originalHostId: string;
  build379ProtectedAdmissionEventId: string;
  build379DecisionEventId: string;
  build379ExecutionEventId: string;
  exactReceiptId: string;
  exactReceiptSha256: string;
  ownerDecisionId: string;
  priorRegistryEvidenceId: string;
  receiverInstanceId: string;
  receiverBootId: string;
  receiverStartedAt: string;
  receiverProbeObservedAt: string;
  receiverProofURI: string;
  receiverProofDigest: string;
  sourceHandshakeReceiptId: string;
  sourceHandshakeDigest: string;
  aiHubConnection: "CONNECTED";
  aiHubMasterSync: "SYNCED";
  commsReceiver: "ON";
  commsConnection: "CONNECTED";
  commsOwnerAcceptance: "ACCEPTED";
  commsSlaveGate: "OPEN";
  controllerGate: "OPEN";
  masterReceipts: Build380MasterRuntimeReceipt[];
  terminalSyncDigest: string;
  evidenceURI: string;
  nonce: string;
  observedAt: string;
};

export function canonicalBuild380ExternalActivationEnvelope(
  input: Build380ExternalActivationEnvelope
) {
  return JSON.stringify({
    schema: BUILD_380_EXTERNAL_ACTIVATION_ENVELOPE_SCHEMA,
    authorityKeyId: input.authorityKeyId,
    controllerRevision: input.controllerRevision,
    sourceRevision: input.sourceRevision,
    aiHubMain: input.aiHubMain,
    commsMain: input.commsMain,
    originalHostId: input.originalHostId,
    build379ProtectedAdmissionEventId: input.build379ProtectedAdmissionEventId,
    build379DecisionEventId: input.build379DecisionEventId,
    build379ExecutionEventId: input.build379ExecutionEventId,
    exactReceiptId: input.exactReceiptId,
    exactReceiptSha256: input.exactReceiptSha256,
    ownerDecisionId: input.ownerDecisionId,
    priorRegistryEvidenceId: input.priorRegistryEvidenceId,
    receiverInstanceId: input.receiverInstanceId,
    receiverBootId: input.receiverBootId,
    receiverStartedAt: input.receiverStartedAt,
    receiverProbeObservedAt: input.receiverProbeObservedAt,
    receiverProofURI: input.receiverProofURI,
    receiverProofDigest: input.receiverProofDigest,
    sourceHandshakeReceiptId: input.sourceHandshakeReceiptId,
    sourceHandshakeDigest: input.sourceHandshakeDigest,
    aiHubConnection: input.aiHubConnection,
    aiHubMasterSync: input.aiHubMasterSync,
    commsReceiver: input.commsReceiver,
    commsConnection: input.commsConnection,
    commsOwnerAcceptance: input.commsOwnerAcceptance,
    commsSlaveGate: input.commsSlaveGate,
    controllerGate: input.controllerGate,
    masterReceipts: [...input.masterReceipts]
      .map((receipt) => ({
        masterId: receipt.masterId,
        receiptId: receipt.receiptId,
        digest: receipt.digest,
        runtimeState: receipt.runtimeState,
        signerKeyId: receipt.signerKeyId,
        signatureSha256: receipt.signatureSha256
      }))
      .sort((a, b) => a.masterId.localeCompare(b.masterId)),
    terminalSyncDigest: input.terminalSyncDigest,
    evidenceURI: input.evidenceURI,
    nonce: input.nonce,
    observedAt: input.observedAt
  });
}

export function build380Digest(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}


export type Build380CeremonyEvent = {
  ceremonyEventId: string;
  authorityKeyId: string;
  authorityKeySpkiSha256: string;
  envelopeSha256: string;
  signatureSha256: string;
  nonce: string;
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  originalHostId: string;
  build379ProtectedAdmissionEventId: string;
  build379DecisionEventId: string;
  build379ExecutionEventId: string;
  exactReceiptId: string;
  ownerDecisionId: string;
  priorRegistryEvidenceId: string;
  receiverInstanceId: string;
  receiverBootId: string;
  receiverStartedAt: string;
  receiverProbeObservedAt: string;
  receiverProofURI: string;
  receiverProofDigest: string;
  sourceHandshakeReceiptId: string;
  sourceHandshakeDigest: string;
  terminalSyncDigest: string;
  evidenceURI: string;
  ceremonyState: "VERIFIED_EXECUTED";
  receiverState: "ON";
  observedAt: string;
  recordedAt: string;
};

export type Build380ConnectedTransitionEvent = {
  transitionEventId: string;
  ceremonyEventId: string;
  registryEvidenceId: string;
  exactReceiptId: string;
  ownerDecisionId: string;
  build379DecisionEventId: string;
  transitionState: "CONNECTED_VERIFIED";
  connectionState: "CONNECTED";
  receiverState: "ON";
  verifiedAt: string;
  recordedAt: string;
};

export type Build380SyncClosureEvent = {
  closureEventId: string;
  ceremonyEventId: string;
  transitionEventId: string;
  aiHubRuntimeReceiptId: string;
  aiHubRuntimeDigest: string;
  aiHubSignerKeyId: string;
  aiHubSignatureSha256: string;
  commsRuntimeReceiptId: string;
  commsRuntimeDigest: string;
  commsSignerKeyId: string;
  commsSignatureSha256: string;
  controllerRuntimeReceiptId: string;
  controllerRuntimeDigest: string;
  controllerSignerKeyId: string;
  controllerSignatureSha256: string;
  terminalSyncDigest: string;
  closureState: "CLOSED_VERIFIED";
  mastersSynced: true;
  closedAt: string;
  recordedAt: string;
};

export type Build380Input = {
  build379: Build379ProtectedActivationModel;
  latestRegistryEvidence?: Build380RegistryEvidence | null;
  ceremonyEvents?: readonly Build380CeremonyEvent[];
  transitionEvents?: readonly Build380ConnectedTransitionEvent[];
  closureEvents?: readonly Build380SyncClosureEvent[];
  now?: Date;
};

function validFreshTime(
  value: string,
  now: Date,
  freshnessMinutes: number
) {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp <= now.getTime() + 2 * 60_000 &&
    now.getTime() - timestamp <= freshnessMinutes * 60_000
  );
}

function registryCandidateState(
  evidence: Build380RegistryEvidence | null,
  now: Date
) {
  if (!evidence) return "HOLD_NO_YW_REGISTRY_EVIDENCE" as const;
  if (
    evidence.sourceId !== "yw" ||
    evidence.environment !== "production" ||
    evidence.immutableRevision !== BUILD_380_RUNTIME.yw.main
  ) {
    return "HOLD_YW_REGISTRY_REVISION" as const;
  }
  if (
    evidence.evidenceAuthority !== "independent-source-verification" ||
    evidence.ownerAuthorized !== true ||
    evidence.independentTestVerified !== true ||
    !evidence.testEvidenceURI ||
    !evidence.signerKeyId ||
    !evidence.signerFingerprint
  ) {
    return "HOLD_YW_REGISTRY_AUTHORITY" as const;
  }
  if (
    evidence.declaredStatus !== "TEST_VERIFIED" &&
    evidence.declaredStatus !== "CONNECTED"
  ) {
    return "HOLD_YW_REGISTRY_NOT_ACTIVATABLE" as const;
  }
  if (
    !validFreshTime(evidence.statusObservedAt, now, 15) ||
    Date.parse(evidence.statusExpiresAt) <= now.getTime()
  ) {
    return "HOLD_YW_REGISTRY_STALE" as const;
  }
  if (
    evidence.declaredStatus === "CONNECTED" &&
    (!evidence.independentConnectionVerified ||
      !evidence.connectionEvidenceURI)
  ) {
    return "HOLD_YW_CONNECTED_EVIDENCE_INCOMPLETE" as const;
  }
  return evidence.declaredStatus === "CONNECTED"
    ? ("CONNECTED_CURRENT" as const)
    : ("READY_FOR_PROTECTED_ACTIVATION" as const);
}

function build379AuthorizationContinuity(
  build379: Build379ProtectedActivationModel,
  ceremony: Build380CeremonyEvent | null
) {
  const decision = build379.latestActivationDecision;
  const execution = build379.latestActivationExecution;
  const currentReceiptId = build379.build378.exactCurrentReceiptId;
  const currentOwnerDecisionId = build379.build378.exactOwnerDecisionId;

  if (
    build379.build378.sourceReceiptState !== "ACTIVE_CURRENT" ||
    build379.build378.exactOwnerAcceptanceState !== "ACCEPTED_CURRENT" ||
    !decision ||
    decision.decision !== "APPROVE_ACTIVATION" ||
    decision.decisionState !==
      "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME" ||
    !execution ||
    execution.executionState !==
      "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED" ||
    decision.exactReceiptId !== currentReceiptId ||
    decision.ownerDecisionId !== currentOwnerDecisionId ||
    execution.exactReceiptId !== currentReceiptId
  ) {
    return "HOLD_BUILD379_AUTHORIZATION_CONTINUITY" as const;
  }

  if (!ceremony) {
    return build379.supervisedActivationDecisionState ===
      "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME"
      ? ("AUTHORIZED_CURRENT" as const)
      : ("HOLD_BUILD379_AUTHORIZATION_FRESHNESS" as const);
  }

  if (
    ceremony.build379ProtectedAdmissionEventId !==
      decision.protectedAdmissionEventId ||
    ceremony.build379DecisionEventId !== decision.decisionEventId ||
    ceremony.build379ExecutionEventId !== execution.executionEventId ||
    ceremony.exactReceiptId !== currentReceiptId ||
    ceremony.ownerDecisionId !== currentOwnerDecisionId
  ) {
    return "HOLD_BUILD379_AUTHORIZATION_CHANGED" as const;
  }

  return "AUTHORIZED_CONTINUOUS" as const;
}

function receiverProofState(
  ceremony: Build380CeremonyEvent | null,
  now: Date
) {
  if (!ceremony) return "HOLD_NO_EXTERNAL_ACTIVATION_CEREMONY" as const;
  if (
    ceremony.ceremonyState !== "VERIFIED_EXECUTED" ||
    ceremony.receiverState !== "ON" ||
    ceremony.controllerRevision !== BUILD_380_CONTROLLER_BASE_REVISION ||
    ceremony.sourceRevision !== BUILD_380_RUNTIME.yw.main ||
    ceremony.aiHubMain !== BUILD_380_RUNTIME.aiHub.main ||
    ceremony.commsMain !== BUILD_380_RUNTIME.comms.main ||
    ceremony.originalHostId !== BUILD_380_RUNTIME.aiHub.originalHost
  ) {
    return "HOLD_EXTERNAL_ACTIVATION_BINDING" as const;
  }
  if (
    !validFreshTime(ceremony.observedAt, now, 10) ||
    !validFreshTime(ceremony.receiverProbeObservedAt, now, 10)
  ) {
    return "HOLD_RECEIVER_PROOF_STALE" as const;
  }
  return "ON_VERIFIED_CURRENT" as const;
}

export function composeBuild380ExternalRuntimeActivation(
  input: Build380Input
) {
  const now = input.now ?? new Date();
  const ceremonyEvents = input.ceremonyEvents ?? [];
  const transitionEvents = input.transitionEvents ?? [];
  const closureEvents = input.closureEvents ?? [];
  const registry = input.latestRegistryEvidence ?? null;

  const latestCeremony =
    [...ceremonyEvents].sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt)
    )[0] ?? null;
  const latestTransition =
    [...transitionEvents].sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt)
    )[0] ?? null;
  const latestClosure =
    [...closureEvents].sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt)
    )[0] ?? null;

  const build379AuthorizationState = build379AuthorizationContinuity(
    input.build379,
    latestCeremony
  );
  const registryState = registryCandidateState(registry, now);
  const externalRuntimeActivationCeremonyState =
    latestCeremony
      ? receiverProofState(latestCeremony, now)
      : build379AuthorizationState !== "AUTHORIZED_CURRENT"
        ? ("HOLD_BUILD379_AUTHORIZATION" as const)
        : registryState !== "READY_FOR_PROTECTED_ACTIVATION" &&
            registryState !== "CONNECTED_CURRENT"
          ? registryState
          : ("READY_FOR_EXTERNAL_ACTIVATION_CEREMONY" as const);

  const receiverStateProof =
    receiverProofState(latestCeremony, now);

  const verifiedConnectedTransitionState =
    receiverStateProof !== "ON_VERIFIED_CURRENT" ||
    build379AuthorizationState !== "AUTHORIZED_CONTINUOUS"
      ? ("HOLD_RUNTIME_ACTIVATION" as const)
      : !latestTransition ||
          latestTransition.ceremonyEventId !== latestCeremony?.ceremonyEventId ||
          latestTransition.transitionState !== "CONNECTED_VERIFIED" ||
          latestTransition.connectionState !== "CONNECTED" ||
          latestTransition.receiverState !== "ON" ||
          latestTransition.exactReceiptId !== latestCeremony?.exactReceiptId ||
          latestTransition.ownerDecisionId !== latestCeremony?.ownerDecisionId ||
          latestTransition.build379DecisionEventId !==
            latestCeremony?.build379DecisionEventId
        ? ("HOLD_NO_VERIFIED_CONNECTED_TRANSITION" as const)
        : !registry ||
            registry.declaredStatus !== "CONNECTED" ||
            registry.independentConnectionVerified !== true ||
            registry.connectionEvidenceURI !== latestCeremony?.receiverProofURI ||
            registry.immutableRevision !== BUILD_380_RUNTIME.yw.main
          ? ("HOLD_CONNECTED_REGISTRY_NOT_CURRENT" as const)
          : latestTransition.registryEvidenceId !== registry.evidenceId
          ? ("HOLD_CONNECTED_REGISTRY_CHANGED" as const)
          : ("CONNECTED_VERIFIED" as const);

  const threeMasterSynchronizationClosureState =
    verifiedConnectedTransitionState !== "CONNECTED_VERIFIED"
      ? ("HOLD_CONNECTED_TRANSITION" as const)
      : !latestClosure ||
          latestClosure.ceremonyEventId !== latestCeremony?.ceremonyEventId ||
          latestClosure.transitionEventId !== latestTransition?.transitionEventId ||
          latestClosure.closureState !== "CLOSED_VERIFIED" ||
          latestClosure.mastersSynced !== true ||
          latestClosure.terminalSyncDigest !== latestCeremony?.terminalSyncDigest
        ? ("HOLD_NO_THREE_MASTER_CLOSURE" as const)
        : ("CLOSED_VERIFIED" as const);

  const connectionState =
    receiverStateProof === "ON_VERIFIED_CURRENT" &&
    build379AuthorizationState === "AUTHORIZED_CONTINUOUS" &&
    verifiedConnectedTransitionState === "CONNECTED_VERIFIED" &&
    threeMasterSynchronizationClosureState === "CLOSED_VERIFIED"
      ? ("CONNECTED" as const)
      : ("DISCONNECTED_HOLD" as const);

  const blockers = [
    ...(build379AuthorizationState !== "AUTHORIZED_CURRENT" &&
    build379AuthorizationState !== "AUTHORIZED_CONTINUOUS"
      ? [
          "Build 379 exact receipt/owner authorization is not current enough for an external runtime activation ceremony."
        ]
      : []),
    ...(registryState !== "READY_FOR_PROTECTED_ACTIVATION" &&
    registryState !== "CONNECTED_CURRENT"
      ? [
          "YW562 does not have fresh independently verified TEST/CONNECTED registry evidence suitable for protected activation."
        ]
      : []),
    ...(receiverStateProof !== "ON_VERIFIED_CURRENT"
      ? [
          "No fresh protected receiver-ON proof is admitted for the exact current YW562 / AI Hub 313 / Comms QL-423 runtime set."
        ]
      : []),
    ...(verifiedConnectedTransitionState !== "CONNECTED_VERIFIED"
      ? [
          "The protected receiver proof has not produced a current independently verified YW562 CONNECTED registry transition."
        ]
      : []),
    ...(threeMasterSynchronizationClosureState !== "CLOSED_VERIFIED"
      ? [
          "Three-Master synchronization closure remains HOLD until all three signed runtime receipts correlate to the exact activation ceremony."
        ]
      : [])
  ];

  return {
    schema: BUILD_380_SCHEMA,
    build: BUILD_380,
    controllerBaseRevision: BUILD_380_CONTROLLER_BASE_REVISION,
    runtime: BUILD_380_RUNTIME,
    build379: input.build379,
    latestRegistryEvidence: registry,
    build379AuthorizationState,
    registryState,
    latestCeremony,
    externalRuntimeActivationCeremonyState,
    receiverStateProof,
    latestConnectedTransition: latestTransition,
    verifiedConnectedTransitionState,
    latestThreeMasterClosure: latestClosure,
    threeMasterSynchronizationClosureState,
    connectionState,
    mastersSynced:
      connectionState === "CONNECTED" &&
      threeMasterSynchronizationClosureState === "CLOSED_VERIFIED",
    blockers,
    policy: {
      build379OwnerAuthorizationRequired: true,
      protectedEd25519ActivationAuthorityRequired: true,
      freshReceiverOnProofRequired: true,
      currentYw562RegistryTestEvidenceRequired: true,
      protectedRegistryConnectedTransitionRequired: true,
      exactCurrentReceiptOwnerContinuityRequired: true,
      exactAiHub313AndCommsQl423RevisionsRequired: true,
      threeDistinctMasterRuntimeReceiptsRequired: true,
      threeMasterClosureRequired: true,
      browserMaySetReceiverOn: false,
      browserMaySetConnected: false,
      codeGreenMaySetConnected: false,
      connectedEvidenceFreshnessMinutes: 10
    }
  };
}

export type Build380ExternalRuntimeActivationModel = ReturnType<
  typeof composeBuild380ExternalRuntimeActivation
>;
