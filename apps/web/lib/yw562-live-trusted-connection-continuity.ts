import {
  summarizeReceiptAge,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import type { Build372ReplayCorrelationEvent } from "./yw561-signer-receipt-replay-closure";
import type { Build376ConnectionRegistryEvidence } from "./yw561-independent-connection-three-master-sync";

export const BUILD_377 = 377 as const;
export const BUILD_377_SCHEMA =
  "rosevear.ai-data-platform.yw562-live-trusted-connection-continuity.v1" as const;
export const BUILD_377_CONTROLLER_BASE_REVISION =
  "b1273edf4b2b38b5ca68371d9b171a1391d6f2f6" as const;

export const BUILD_377_SOURCE_RUNTIME = Object.freeze({
  sourceId: "yw",
  previousBuild: 561,
  previousMain: "3ac1bbce127a011af7830ad88da020112d132122",
  currentBuild: 562,
  currentMain: "6e0b77eebcfc77aa7fc48dcc398da958af8df696",
  sourceRole: "platform_shell",
  tenantBoundary: "platform_shell",
  handoff: "MASTER562-YW-PROVIDER-PILOT",
  runtimeDatabasePrerequisite:
    "HOLD_MISSING_YW556_AND_YW561_RUNTIME_TABLES_AT_AUTHORING"
} as const);

export const BUILD_377_MASTER_RUNTIME = Object.freeze({
  controller: {
    build: 376,
    main: BUILD_377_CONTROLLER_BASE_REVISION
  },
  aiHub: {
    build: 311,
    main: "41b3d69962dd22480badf26fc6a65dfb59f88ac9",
    controllerContract: "PROPOSED_PRIVATE_SCHEMA_NOT_DEPLOYED",
    receiver: "OFF",
    connection: "HOLD",
    masterSync: "HOLD"
  },
  comms: {
    build: "QL-421",
    main: "a89a885ce444f266da00d9311eeece1811d482e2",
    receiver: "OFF",
    connection: "HOLD",
    ownerAcceptance: "HOLD",
    slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
  }
} as const);

export type Build377MasterRuntimeEvidence = {
  recheckId: string;
  controllerRevision: string;
  aiHubMain: string;
  aiHubState: Record<string, unknown>;
  commsMain: string;
  commsState: Record<string, unknown>;
  blockers: string[];
  gateState: "OPEN" | "HOLD";
  checkedAt: string;
  recordedAt: string;
};

export type Build377LiveConnectionExecutionEvent = {
  executionEventId: string;
  registryEvidenceId: string;
  sourceProductionRevision: string;
  exactReceiptId: string;
  ownerDecisionId: string;
  connectionEvidenceURI: string;
  executionState: "EXECUTED_CURRENT";
  executedAt: string;
  recordedAt: string;
};

export type Build377SyncActivationEvent = {
  activationEventId: string;
  connectionExecutionEventId: string;
  sourceProductionRevision: string;
  exactReceiptId: string;
  masterRuntimeRecheckId: string;
  controllerRevision: string;
  aiHubMain: string;
  commsMain: string;
  activationState: "ACTIVE_SYNCED";
  activatedAt: string;
  recordedAt: string;
};

export type Build377Input = {
  signerEvents?: readonly SignerRegistryEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  replayEvents?: readonly Build372ReplayCorrelationEvent[];
  connectionRegistryEvidence?: Build376ConnectionRegistryEvidence | null;
  connectionExecutionEvents?: readonly Build377LiveConnectionExecutionEvent[];
  masterRuntimeEvidence?: Build377MasterRuntimeEvidence | null;
  syncActivationEvents?: readonly Build377SyncActivationEvent[];
  now?: Date;
};

function latestActiveSigners(events: readonly SignerRegistryEvent[]) {
  const latest = new Map<string, SignerRegistryEvent>();
  for (const event of [...events].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  )) {
    if (event.sourceId === "yw") latest.set(event.keyId, event);
  }
  return [...latest.values()].filter((event) => event.eventType === "ENROLLED");
}

function objectString(
  value: Record<string, unknown>,
  key: string
) {
  return typeof value[key] === "string" ? String(value[key]) : null;
}

function masterRuntimeState(
  evidence: Build377MasterRuntimeEvidence | null
) {
  if (!evidence) return "HOLD_NO_CURRENT_MASTER_EVIDENCE" as const;
  if (
    evidence.controllerRevision !== BUILD_377_CONTROLLER_BASE_REVISION ||
    evidence.aiHubMain !== BUILD_377_MASTER_RUNTIME.aiHub.main ||
    evidence.commsMain !== BUILD_377_MASTER_RUNTIME.comms.main
  ) {
    return "HOLD_MASTER_REVISION_MISMATCH" as const;
  }
  if (evidence.gateState !== "OPEN" || evidence.blockers.length > 0) {
    return "HOLD_MASTER_GATE" as const;
  }

  const aiConnection = objectString(evidence.aiHubState, "connection");
  const aiSync =
    objectString(evidence.aiHubState, "masterSync") ??
    objectString(evidence.aiHubState, "mastersSynced");
  const commsReceiver = objectString(evidence.commsState, "receiver");
  const commsConnection = objectString(evidence.commsState, "connection");
  const commsOwner = objectString(evidence.commsState, "ownerAcceptance");
  const commsSlave = objectString(evidence.commsState, "slaveGate");

  if (
    aiConnection !== "CONNECTED" ||
    (aiSync !== "SYNCED" && aiSync !== "CONNECTED") ||
    commsReceiver !== "ON" ||
    commsConnection !== "CONNECTED" ||
    commsOwner !== "ACCEPTED" ||
    commsSlave !== "OPEN"
  ) {
    return "HOLD_MASTER_STATE_NOT_ACTIVATED" as const;
  }
  return "VERIFIED_OPEN" as const;
}

function connectionRegistryState(
  evidence: Build376ConnectionRegistryEvidence | null,
  now: Date
) {
  if (!evidence) return "HOLD_NO_CONNECTION_EVIDENCE" as const;
  if (
    evidence.sourceId !== "yw" ||
    evidence.environment !== "production" ||
    evidence.declaredStatus !== "CONNECTED"
  ) {
    return "HOLD_CONNECTION_STATE_INVALID" as const;
  }
  if (evidence.evidenceAuthority !== "independent-source-verification") {
    return "HOLD_CONNECTION_NOT_INDEPENDENT" as const;
  }
  if (
    evidence.ownerAuthorized !== true ||
    evidence.independentTestVerified !== true ||
    evidence.independentConnectionVerified !== true ||
    !evidence.testEvidenceURI ||
    !evidence.connectionEvidenceURI ||
    !evidence.signerKeyId ||
    !evidence.signerFingerprint
  ) {
    return "HOLD_CONNECTION_AUTHORITY_INCOMPLETE" as const;
  }
  if (evidence.immutableRevision !== BUILD_377_SOURCE_RUNTIME.currentMain) {
    return "HOLD_CONNECTION_REVISION_MISMATCH" as const;
  }

  const observed = Date.parse(evidence.statusObservedAt);
  const expires = Date.parse(evidence.statusExpiresAt);
  if (
    !Number.isFinite(observed) ||
    !Number.isFinite(expires) ||
    observed > now.getTime() + 5 * 60_000 ||
    expires <= now.getTime() ||
    expires <= observed
  ) {
    return "HOLD_CONNECTION_EVIDENCE_STALE" as const;
  }
  return "READY_FOR_LIVE_INTAKE" as const;
}

export function composeBuild377YwLiveConnectionContinuity(
  input: Build377Input = {}
) {
  const now = input.now ?? new Date();
  const signerEvents = input.signerEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const replayEvents = input.replayEvents ?? [];
  const connectionExecutionEvents = input.connectionExecutionEvents ?? [];
  const syncActivationEvents = input.syncActivationEvents ?? [];
  const registryEvidence = input.connectionRegistryEvidence ?? null;
  const runtimeEvidence = input.masterRuntimeEvidence ?? null;

  const sourceRevisionTransitionState =
    BUILD_377_SOURCE_RUNTIME.previousMain !== BUILD_377_SOURCE_RUNTIME.currentMain
      ? ("ADVANCED_TO_YW562_REVALIDATION_REQUIRED" as const)
      : ("UNCHANGED" as const);

  const activeSigners = latestActiveSigners(signerEvents);
  const exactReceipts = receipts
    .filter(
      (receipt) =>
        receipt.sourceId === "yw" &&
        receipt.sourceRevision === BUILD_377_SOURCE_RUNTIME.currentMain &&
        receipt.manifestRevision === BUILD_377_SOURCE_RUNTIME.currentMain
    )
    .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
  const exactReceipt = exactReceipts[0] ?? null;
  const receiptAge = exactReceipt
    ? summarizeReceiptAge(exactReceipt, now)
    : ("NOT_RECEIVED" as const);
  const exactAdmission = exactReceipt
    ? admissionEvents
        .filter(
          (event) =>
            event.sourceId === "yw" &&
            event.sourceRevision === BUILD_377_SOURCE_RUNTIME.currentMain &&
            event.receiptId === exactReceipt.receiptId
        )
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
    : null;
  const exactReplay = exactReceipt
    ? replayEvents
        .filter(
          (event) =>
            event.sourceProductionRevision === BUILD_377_SOURCE_RUNTIME.currentMain &&
            event.receiptId === exactReceipt.receiptId
        )
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
    : null;
  const matchingSigner =
    exactReceipt && activeSigners.length === 1
      ? activeSigners[0].keyId === exactReceipt.keyId
        ? activeSigners[0]
        : null
      : null;

  const exactReceiptState =
    !exactReceipt
      ? ("HOLD_NO_CURRENT_RECEIPT" as const)
      : activeSigners.length !== 1 || matchingSigner === null
        ? ("HOLD_SIGNER_NOT_EXACT" as const)
        : receiptAge !== "CURRENT"
          ? ("HOLD_RECEIPT_STALE" as const)
          : exactAdmission?.outcome !== "ADMITTED" ||
              exactAdmission.receiptId !== exactReceipt.receiptId
            ? ("HOLD_RECEIPT_NOT_ADMITTED" as const)
            : exactReplay?.correlationState !== "VERIFIED_CORRELATED"
              ? ("HOLD_REPLAY_NOT_VERIFIED" as const)
              : ("ACTIVE_CURRENT" as const);

  const exactOwnerDecision = exactReceipt
    ? ownerDecisions
        .filter(
          (decision) =>
            decision.sourceId === "yw" &&
            decision.receiptId === exactReceipt.receiptId
        )
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
    : null;
  const acceptanceRevalidationState =
    exactReceiptState !== "ACTIVE_CURRENT"
      ? ("HOLD_RECEIPT_NOT_ACTIVE" as const)
      : exactOwnerDecision?.decision === "ACCEPT"
        ? ("ACCEPTED_CURRENT" as const)
        : exactOwnerDecision?.decision === "REJECT"
          ? ("REJECTED_CURRENT" as const)
          : ("HOLD_EXPLICIT_ACCEPT_REQUIRED" as const);

  const connectionCandidateState = connectionRegistryState(
    registryEvidence,
    now
  );
  const currentExecution =
    registryEvidence && exactReceipt
      ? [...connectionExecutionEvents]
          .filter(
            (event) =>
              event.registryEvidenceId === registryEvidence.evidenceId &&
              event.sourceProductionRevision ===
                BUILD_377_SOURCE_RUNTIME.currentMain &&
              event.exactReceiptId === exactReceipt.receiptId &&
              event.executionState === "EXECUTED_CURRENT"
          )
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
      : null;

  const liveConnectionIntakeState =
    connectionCandidateState !== "READY_FOR_LIVE_INTAKE"
      ? connectionCandidateState
      : acceptanceRevalidationState !== "ACCEPTED_CURRENT"
        ? ("HOLD_ACCEPTANCE_REVALIDATION" as const)
        : currentExecution
          ? ("EXECUTED_CURRENT" as const)
          : ("READY_FOR_LIVE_INTAKE" as const);

  const currentMasterRuntimeState = masterRuntimeState(runtimeEvidence);

  const currentActivation =
    currentExecution && exactReceipt && runtimeEvidence
      ? [...syncActivationEvents]
          .filter(
            (event) =>
              event.connectionExecutionEventId ===
                currentExecution.executionEventId &&
              event.sourceProductionRevision ===
                BUILD_377_SOURCE_RUNTIME.currentMain &&
              event.exactReceiptId === exactReceipt.receiptId &&
              event.masterRuntimeRecheckId === runtimeEvidence.recheckId &&
              event.controllerRevision ===
                BUILD_377_CONTROLLER_BASE_REVISION &&
              event.aiHubMain === BUILD_377_MASTER_RUNTIME.aiHub.main &&
              event.commsMain === BUILD_377_MASTER_RUNTIME.comms.main &&
              event.activationState === "ACTIVE_SYNCED"
          )
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
      : null;

  const threeMasterSyncActivationState =
    liveConnectionIntakeState !== "EXECUTED_CURRENT"
      ? ("HOLD_CONNECTION_INTAKE" as const)
      : acceptanceRevalidationState !== "ACCEPTED_CURRENT"
        ? ("HOLD_ACCEPTANCE_REVALIDATION" as const)
        : currentMasterRuntimeState !== "VERIFIED_OPEN"
          ? ("HOLD_MASTER_RUNTIME" as const)
          : currentActivation
            ? ("ACTIVE_SYNCED" as const)
            : ("READY_FOR_EXPLICIT_SYNC_ACTIVATION" as const);

  const postConnectionContinuityState =
    !currentActivation
      ? ("HOLD_NOT_ACTIVATED" as const)
      : connectionCandidateState !== "READY_FOR_LIVE_INTAKE"
        ? ("HOLD_CONNECTION_EVIDENCE" as const)
        : exactReceiptState !== "ACTIVE_CURRENT"
          ? ("HOLD_RECEIPT_HEALTH" as const)
          : acceptanceRevalidationState !== "ACCEPTED_CURRENT"
            ? ("HOLD_OWNER_ACCEPTANCE" as const)
            : currentExecution?.exactReceiptId !== exactReceipt?.receiptId
              ? ("HOLD_RECEIPT_CHANGED" as const)
              : currentMasterRuntimeState !== "VERIFIED_OPEN"
                ? ("HOLD_MASTER_SYNC" as const)
                : ("STABLE_CONNECTED" as const);

  const blockers = [
    ...(sourceRevisionTransitionState ===
    "ADVANCED_TO_YW562_REVALIDATION_REQUIRED"
      ? [
          "YW production advanced from YW561 to YW562; no YW561 receipt, owner ACCEPT, connection intake or sync activation may carry forward automatically."
        ]
      : []),
    ...(exactReceiptState !== "ACTIVE_CURRENT"
      ? [
          `A fresh admitted, replay-correlated signed HEALTHY receipt for YW562 revision ${BUILD_377_SOURCE_RUNTIME.currentMain} is required.`
        ]
      : []),
    ...(acceptanceRevalidationState !== "ACCEPTED_CURRENT"
      ? [
          "The exact current YW562 receipt does not yet have a current explicit owner ACCEPT."
        ]
      : []),
    ...(connectionCandidateState !== "READY_FOR_LIVE_INTAKE"
      ? [
          "No fresh independently verified CONNECTED source-registry record is currently bound to exact YW562 production."
        ]
      : []),
    ...(currentMasterRuntimeState !== "VERIFIED_OPEN"
      ? [
          "AI Hub 311 / Comms QL-421 protected three-Master runtime evidence is not independently VERIFIED_OPEN."
        ]
      : []),
    ...(postConnectionContinuityState !== "STABLE_CONNECTED"
      ? [
          "Post-connection continuity remains HOLD until the YW562 exact receipt, explicit owner acceptance, trusted connection evidence and three-Master runtime evidence are simultaneously current."
        ]
      : [])
  ];

  return {
    schema: BUILD_377_SCHEMA,
    build: BUILD_377,
    controllerBaseRevision: BUILD_377_CONTROLLER_BASE_REVISION,
    sourceRuntime: BUILD_377_SOURCE_RUNTIME,
    masterRuntime: BUILD_377_MASTER_RUNTIME,
    sourceRevisionTransitionState,
    activeSignerCount: activeSigners.length,
    exactCurrentReceipt: exactReceipt,
    exactCurrentReceiptId: exactReceipt?.receiptId ?? null,
    exactReceiptAge: receiptAge,
    exactAdmission,
    exactReplay,
    exactReceiptState,
    exactOwnerDecision,
    exactOwnerDecisionId: exactOwnerDecision?.decisionId ?? null,
    acceptanceRevalidationState,
    connectionRegistryEvidence: registryEvidence,
    connectionCandidateState,
    currentConnectionExecution: currentExecution,
    liveConnectionIntakeState,
    masterRuntimeEvidence: runtimeEvidence,
    currentMasterRuntimeState,
    currentSyncActivation: currentActivation,
    threeMasterSyncActivationState,
    postConnectionContinuityState,
    connectionState:
      postConnectionContinuityState === "STABLE_CONNECTED"
        ? ("CONNECTED" as const)
        : ("DISCONNECTED_HOLD" as const),
    mastersSynced:
      postConnectionContinuityState === "STABLE_CONNECTED",
    blockers,
    policy: {
      yw561EvidenceMayCarryForwardToYw562: false,
      exactCurrentRevisionReceiptRequired: true,
      exactReceiptAdmissionRequired: true,
      exactReceiptReplayRequired: true,
      exactReceiptOwnerAcceptRequired: true,
      independentConnectedRegistryRequired: true,
      browserMayAssertIndependentConnection: false,
      exactAiHub311AndCommsQl421RuntimeEvidenceRequired: true,
      explicitSyncActivationRequired: true,
      continuityMonitoringFailsClosed: true,
      codeGreenMaySetConnected: false,
      privateKeysOrReceiverSecretsAccepted: false
    }
  };
}

export type Build377YwLiveConnectionContinuityModel = ReturnType<
  typeof composeBuild377YwLiveConnectionContinuity
>;
