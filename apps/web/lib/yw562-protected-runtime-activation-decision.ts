import { createHash } from "node:crypto";

import {
  BUILD_378_RUNTIME,
  type Build378RuntimeQl422ReadinessModel,
  type Build378Ql422MasterReceipt
} from "./yw562-runtime-ql422-protected-readiness";

export const BUILD_379 = 379 as const;
export const BUILD_379_SCHEMA =
  "rosevear.ai-data-platform.yw562-protected-runtime-activation-decision.v1" as const;
export const BUILD_379_CONTROLLER_BASE_REVISION =
  "a0eea834c7e8d62232a70b13b06688c6b9b4babc" as const;
export const BUILD_379_PROTECTED_ENVELOPE_SCHEMA =
  "rosevear.ai-data-platform.build379.protected-runtime-evidence.v1" as const;

export const BUILD_379_RUNTIME = Object.freeze({
  yw: {
    build: 562,
    main: "6e0b77eebcfc77aa7fc48dcc398da958af8df696"
  },
  aiHub: {
    build: 312,
    main: "e64e4b2e79e7c07bbd077284c298207414b149ad",
    originalHost: "DESKTOP-AE894KC"
  },
  comms: {
    build: "QL-422",
    main: "5f360821b361b43dd28aa5b2ca4c147565a84f0a"
  }
} as const);

export type Build379ProtectedEnvelope = {
  authorityKeyId: string;
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  originalHostId: string;
  prerequisiteEvidenceId: string;
  freshReceiptAdmissionEventId: string;
  exactReceiptId: string;
  exactReceiptSha256: string;
  ownerDecisionId: string;
  sourceEpisodeId: string;
  sourceReceiptDigest: string;
  receiverAckDigest: string;
  closureDigest: string;
  handoffReceiptId: string;
  witnessDigest: string;
  masterReceipts: Build378Ql422MasterReceipt[];
  terminalLedgerDigest: string;
  evidenceURI: string;
  nonce: string;
  observedAt: string;
};

export function canonicalBuild379ProtectedEnvelope(
  input: Build379ProtectedEnvelope
) {
  return JSON.stringify({
    schema: BUILD_379_PROTECTED_ENVELOPE_SCHEMA,
    authorityKeyId: input.authorityKeyId,
    controllerRevision: input.controllerRevision,
    sourceRevision: input.sourceRevision,
    aiHubMain: input.aiHubMain,
    commsMain: input.commsMain,
    originalHostId: input.originalHostId,
    prerequisiteEvidenceId: input.prerequisiteEvidenceId,
    freshReceiptAdmissionEventId: input.freshReceiptAdmissionEventId,
    exactReceiptId: input.exactReceiptId,
    exactReceiptSha256: input.exactReceiptSha256,
    ownerDecisionId: input.ownerDecisionId,
    sourceEpisodeId: input.sourceEpisodeId,
    sourceReceiptDigest: input.sourceReceiptDigest,
    receiverAckDigest: input.receiverAckDigest,
    closureDigest: input.closureDigest,
    handoffReceiptId: input.handoffReceiptId,
    witnessDigest: input.witnessDigest,
    masterReceipts: [...input.masterReceipts]
      .map((receipt) => ({
        masterId: receipt.masterId,
        receiptId: receipt.receiptId,
        digest: receipt.digest
      }))
      .sort((a, b) => a.masterId.localeCompare(b.masterId)),
    terminalLedgerDigest: input.terminalLedgerDigest,
    evidenceURI: input.evidenceURI,
    nonce: input.nonce,
    observedAt: input.observedAt
  });
}

export function build379Digest(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export type Build379ProtectedAdmissionEvent = {
  admissionEventId: string;
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
  prerequisiteEvidenceId: string;
  freshReceiptAdmissionEventId: string;
  exactReceiptId: string;
  ownerDecisionId: string;
  ql422CorrelationEventId: string;
  evidenceURI: string;
  observedAt: string;
  admissionState: "VERIFIED_ADMITTED";
  recordedAt: string;
};

export type Build379ActivationDecisionEvent = {
  decisionEventId: string;
  protectedAdmissionEventId: string;
  exactReceiptId: string;
  ownerDecisionId: string;
  decision: "APPROVE_ACTIVATION" | "REJECT_ACTIVATION";
  decisionState:
    | "ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME"
    | "REJECTED_HOLD";
  decidedAt: string;
  recordedAt: string;
};

export type Build379ActivationExecutionEvent = {
  executionEventId: string;
  decisionEventId: string;
  protectedAdmissionEventId: string;
  exactReceiptId: string;
  executionState:
    | "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED"
    | "SUPERVISED_ACTIVATION_REJECTED_HOLD";
  receiverState: "OFF";
  connectionState: "DISCONNECTED_HOLD";
  mastersSynced: false;
  executedAt: string;
  recordedAt: string;
};

export type Build379Input = {
  build378: Build378RuntimeQl422ReadinessModel;
  protectedAdmissions?: readonly Build379ProtectedAdmissionEvent[];
  activationDecisions?: readonly Build379ActivationDecisionEvent[];
  activationExecutions?: readonly Build379ActivationExecutionEvent[];
  now?: Date;
};

function protectedAdmissionState(
  build378: Build378RuntimeQl422ReadinessModel,
  admission: Build379ProtectedAdmissionEvent | null,
  now: Date
) {
  if (!admission) return "HOLD_NO_PROTECTED_RUNTIME_ADMISSION" as const;
  if (
    admission.admissionState !== "VERIFIED_ADMITTED" ||
    admission.controllerRevision !== BUILD_379_CONTROLLER_BASE_REVISION ||
    admission.sourceRevision !== BUILD_379_RUNTIME.yw.main ||
    admission.aiHubMain !== BUILD_379_RUNTIME.aiHub.main ||
    admission.commsMain !== BUILD_379_RUNTIME.comms.main ||
    admission.originalHostId !== BUILD_379_RUNTIME.aiHub.originalHost
  ) {
    return "HOLD_PROTECTED_REVISION_BINDING" as const;
  }
  if (
    build378.runtimePrerequisiteState !== "VERIFIED_CURRENT" ||
    build378.sourceReceiptState !== "ACTIVE_CURRENT" ||
    build378.freshSourceBoundReceiptAdmissionState !== "ADMITTED_CURRENT" ||
    build378.exactOwnerAcceptanceState !== "ACCEPTED_CURRENT" ||
    build378.ql422CorrelationState !== "VERIFIED_CORRELATED" ||
    build378.protectedActivationReadinessState !==
      "READY_FOR_PROTECTED_ACTIVATION"
  ) {
    return "HOLD_BUILD378_NOT_READY" as const;
  }
  if (
    admission.prerequisiteEvidenceId !==
      build378.latestRuntimePrerequisiteEvidence?.evidenceId ||
    admission.freshReceiptAdmissionEventId !==
      build378.currentFreshReceiptAdmission?.admissionEventId ||
    admission.exactReceiptId !== build378.exactCurrentReceiptId ||
    admission.ownerDecisionId !== build378.exactOwnerDecisionId ||
    admission.ql422CorrelationEventId !==
      build378.latestProtectedQl422Correlation?.correlationEventId
  ) {
    return "HOLD_EXACT_EVIDENCE_BINDING" as const;
  }
  const observed = Date.parse(admission.observedAt);
  if (
    !Number.isFinite(observed) ||
    observed > now.getTime() + 2 * 60_000 ||
    now.getTime() - observed > 5 * 60_000
  ) {
    return "HOLD_PROTECTED_EVIDENCE_STALE" as const;
  }
  return "VERIFIED_CURRENT" as const;
}

export function composeBuild379ProtectedActivation(
  input: Build379Input
) {
  const now = input.now ?? new Date();
  const protectedAdmissions = input.protectedAdmissions ?? [];
  const activationDecisions = input.activationDecisions ?? [];
  const activationExecutions = input.activationExecutions ?? [];
  const latestProtectedAdmission =
    [...protectedAdmissions].sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt)
    )[0] ?? null;

  const protectedRuntimeEvidenceState = protectedAdmissionState(
    input.build378,
    latestProtectedAdmission,
    now
  );

  const exactReceiptOwnerContinuityState =
    protectedRuntimeEvidenceState !== "VERIFIED_CURRENT"
      ? ("HOLD_PROTECTED_RUNTIME_EVIDENCE" as const)
      : latestProtectedAdmission?.exactReceiptId !==
          input.build378.exactCurrentReceiptId ||
        latestProtectedAdmission?.ownerDecisionId !==
          input.build378.exactOwnerDecisionId
        ? ("HOLD_EXACT_RECEIPT_OWNER_CHANGED" as const)
        : ("VERIFIED_CONTINUOUS" as const);

  const ql422ProtectedCorrelationClosureState =
    protectedRuntimeEvidenceState !== "VERIFIED_CURRENT"
      ? ("HOLD_PROTECTED_RUNTIME_EVIDENCE" as const)
      : latestProtectedAdmission?.ql422CorrelationEventId !==
          input.build378.latestProtectedQl422Correlation?.correlationEventId
        ? ("HOLD_QL422_CORRELATION_CHANGED" as const)
        : ("CLOSED_VERIFIED" as const);

  const latestDecision =
    latestProtectedAdmission
      ? [...activationDecisions]
          .filter(
            (event) =>
              event.protectedAdmissionEventId ===
              latestProtectedAdmission.admissionEventId
          )
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
      : null;

  const latestExecution =
    latestDecision
      ? [...activationExecutions]
          .filter((event) => event.decisionEventId === latestDecision.decisionEventId)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
      : null;

  const supervisedActivationDecisionState =
    protectedRuntimeEvidenceState !== "VERIFIED_CURRENT" ||
    exactReceiptOwnerContinuityState !== "VERIFIED_CONTINUOUS" ||
    ql422ProtectedCorrelationClosureState !== "CLOSED_VERIFIED"
      ? ("HOLD_NOT_READY_FOR_OWNER_DECISION" as const)
      : !latestDecision
        ? ("READY_FOR_OWNER_DECISION" as const)
        : latestDecision.decision === "REJECT_ACTIVATION"
          ? ("REJECTED_HOLD" as const)
          : latestExecution?.executionState ===
              "SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED"
            ? ("ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME" as const)
            : ("HOLD_DECISION_NOT_EXECUTED" as const);

  const blockers = [
    ...(protectedRuntimeEvidenceState !== "VERIFIED_CURRENT"
      ? [
          "A fresh Ed25519-authenticated protected runtime envelope has not yet been admitted for the exact Build 378/YW562/AI Hub/Comms evidence set."
        ]
      : []),
    ...(exactReceiptOwnerContinuityState !== "VERIFIED_CONTINUOUS"
      ? [
          "The protected admission is not continuously bound to the exact current YW562 receipt and exact current Master owner ACCEPT."
        ]
      : []),
    ...(ql422ProtectedCorrelationClosureState !== "CLOSED_VERIFIED"
      ? [
          "The protected admission is not continuously bound to the exact verified QL-422 original-host/three-Master correlation."
        ]
      : []),
    ...(supervisedActivationDecisionState === "READY_FOR_OWNER_DECISION"
      ? [
          "Protected evidence is ready, but a fresh explicit owner activation decision has not been executed."
        ]
      : [])
  ];

  return {
    schema: BUILD_379_SCHEMA,
    build: BUILD_379,
    controllerBaseRevision: BUILD_379_CONTROLLER_BASE_REVISION,
    runtime: BUILD_379_RUNTIME,
    build378: input.build378,
    latestProtectedAdmission,
    protectedRuntimeEvidenceState,
    exactReceiptOwnerContinuityState,
    ql422ProtectedCorrelationClosureState,
    latestActivationDecision: latestDecision,
    latestActivationExecution: latestExecution,
    supervisedActivationDecisionState,
    supervisedActivationDecisionExecuted: Boolean(latestExecution),
    receiverState: "OFF" as const,
    connectionState: "DISCONNECTED_HOLD" as const,
    mastersSynced: false,
    blockers,
    policy: {
      protectedEndpointRequiresEd25519Signature: true,
      protectedDatabaseRoleSeparatedFromBrowserRuntime: true,
      protectedEvidenceFreshnessMinutes: 5,
      exactBuild378BindingRequired: true,
      exactReceiptOwnerContinuityRequired: true,
      ql422ProtectedCorrelationClosureRequired: true,
      explicitOwnerActivationDecisionRequired: true,
      ownerAndProtectedAuthorityAreSeparate: true,
      activationDecisionMayTurnReceiverOn: false,
      activationDecisionMaySetConnected: false,
      buildGreenMaySetConnected: false
    }
  };
}

export type Build379ProtectedActivationModel = ReturnType<
  typeof composeBuild379ProtectedActivation
>;
