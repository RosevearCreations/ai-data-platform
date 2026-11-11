import {
  type Build374Input,
  composeBuild374Yw561Activation
} from "./yw561-trusted-source-health-activation-owner-gate";

export const BUILD_375 = 375 as const;
export const BUILD_375_SCHEMA =
  "rosevear.ai-data-platform.yw561-owner-decision-runtime-connection-reconciliation.v1" as const;
export const BUILD_375_CONTROLLER_BASE_REVISION =
  "08b1aaf52aab23f9e2fa89e1f3f79ebfb86f6e5b" as const;

export const BUILD_375_MASTER_RUNTIME = Object.freeze({
  aiHub: {
    build: 309,
    main: "0a94c72ee4a1ded1babeac68deeb981ad33835ef",
    productionBuild: "GREEN",
    installedRelease: "HOLD",
    sourceOneTest: "HOLD",
    signedReceiverAck: "HOLD",
    sampledUptime: "UNKNOWN",
    ownerDecision: "HOLD",
    receiver: "OFF",
    connection: "HOLD"
  },
  comms: {
    build: "QL-418",
    main: "0cd042d044226848ab50da25a5cc0efc14577e39",
    auditState: "PROTECTED_OWNER_SLA_WORKLIST",
    originalHostSample: "HOLD",
    durableReplayAdmission: "HOLD",
    signedReceiverAck: "HOLD",
    ownerAcceptance: "HOLD",
    runtimeUptime: "UNKNOWN",
    receiver: "OFF",
    connection: "HOLD"
  }
} as const);

export type Build375Input = Build374Input & {
  previousRuntimeGateState?: "OPEN" | "HOLD" | null;
  connectionObservationOverride?: string;
  independentConnectionEvidenceVerified?: boolean;
};

function runtimeTransition(
  previous: "OPEN" | "HOLD" | null,
  current: "OPEN" | "HOLD"
) {
  if (previous === null) return current === "OPEN" ? "INITIAL_OPEN" : "INITIAL_HOLD";
  if (previous === "HOLD" && current === "OPEN") return "HOLD_TO_OPEN";
  if (previous === "OPEN" && current === "HOLD") return "OPEN_TO_HOLD";
  return current === "OPEN" ? "UNCHANGED_OPEN" : "UNCHANGED_HOLD";
}

export function composeBuild375Yw561DecisionRuntimeConnection(
  input: Build375Input = {}
) {
  const activation = composeBuild374Yw561Activation(input);
  const exactReceipt = activation.currentReceipt;
  const decisions = input.ownerDecisions ?? [];
  const latestExactDecision = activation.latestExactReceiptOwnerDecision;
  const otherReceiptAcceptExists =
    exactReceipt !== null &&
    decisions.some(
      (decision) =>
        decision.sourceId === "yw" &&
        decision.decision === "ACCEPT" &&
        decision.receiptId !== null &&
        decision.receiptId !== exactReceipt.receiptId
    );

  const decisionExecutionState =
    exactReceipt === null
      ? ("HOLD_NO_CURRENT_RECEIPT" as const)
      : activation.sourceHealthActivationState !== "ACTIVE"
        ? ("HOLD_SOURCE_HEALTH" as const)
        : activation.threeMasterRuntimeCorrelationState !== "CORRELATED_OPEN"
          ? ("HOLD_MASTER_GATE" as const)
          : latestExactDecision === "ACCEPT"
            ? ("ALREADY_ACCEPTED" as const)
            : latestExactDecision === "REJECT"
              ? ("REJECTED" as const)
              : ("READY_FOR_EXPLICIT_OWNER_ACCEPTANCE" as const);

  const acceptanceContinuityState =
    exactReceipt === null
      ? ("HOLD_NO_CURRENT_RECEIPT" as const)
      : latestExactDecision === "REJECT"
        ? ("REJECTED" as const)
        : activation.sourceHealthActivationState !== "ACTIVE"
          ? ("HOLD_SOURCE_HEALTH" as const)
          : activation.threeMasterRuntimeCorrelationState !== "CORRELATED_OPEN"
            ? ("HOLD_MASTER_GATE" as const)
            : latestExactDecision === "ACCEPT"
              ? ("ACTIVE" as const)
              : otherReceiptAcceptExists
                ? ("HOLD_RECEIPT_CHANGED" as const)
                : ("HOLD_NO_ACCEPT" as const);

  const currentRuntimeGateState: "OPEN" | "HOLD" =
    activation.threeMasterRuntimeCorrelationState === "CORRELATED_OPEN"
      ? "OPEN"
      : "HOLD";
  const previousRuntimeGateState = input.previousRuntimeGateState ?? null;
  const runtimeGateTransitionState = runtimeTransition(
    previousRuntimeGateState,
    currentRuntimeGateState
  );

  const observedSourceConnectionState =
    input.connectionObservationOverride ?? activation.observation.connectionState;
  const sourceReportsConnected =
    !observedSourceConnectionState.toUpperCase().includes("HOLD") &&
    !observedSourceConnectionState.toUpperCase().includes("DISCONNECTED");
  const independentConnectionEvidenceVerified =
    input.independentConnectionEvidenceVerified === true;

  const connectionReconciliationState =
    acceptanceContinuityState === "ACTIVE" && currentRuntimeGateState === "OPEN"
      ? sourceReportsConnected && independentConnectionEvidenceVerified
        ? ("CONNECTED_VERIFIED" as const)
        : ("READY_FOR_VERIFIED_CONNECTION" as const)
      : ("DISCONNECTED_HOLD" as const);

  const blockers = [
    ...activation.blockers.filter((blocker) => !blocker.includes("Comms QL-417")),
    ...(currentRuntimeGateState !== "OPEN"
      ? ["AI Hub 309 / Comms QL-418 three-Master runtime evidence correlation remains HOLD."]
      : []),
    ...(decisionExecutionState === "HOLD_NO_CURRENT_RECEIPT"
      ? ["No exact current YW561 receipt exists for an owner decision."]
      : []),
    ...(acceptanceContinuityState === "HOLD_RECEIPT_CHANGED"
      ? ["A prior YW owner ACCEPT references a different receipt and cannot continue onto the current receipt."]
      : []),
    ...(acceptanceContinuityState === "HOLD_NO_ACCEPT"
      ? ["The exact current YW561 receipt has no explicit owner ACCEPT."]
      : []),
    ...(connectionReconciliationState === "READY_FOR_VERIFIED_CONNECTION"
      ? [
          "Owner acceptance and runtime gates are ready, but independently verified current connection evidence is still required before CONNECTED."
        ]
      : [])
  ];

  return {
    schema: BUILD_375_SCHEMA,
    build: BUILD_375,
    controllerBaseRevision: BUILD_375_CONTROLLER_BASE_REVISION,
    activation,
    masterRuntime: BUILD_375_MASTER_RUNTIME,
    exactCurrentReceiptId: exactReceipt?.receiptId ?? null,
    exactCurrentReceiptRevision: exactReceipt?.sourceRevision ?? null,
    latestExactReceiptOwnerDecision: latestExactDecision,
    latestExactReceiptOwnerDecisionId:
      activation.latestExactReceiptOwnerDecisionId,
    decisionExecutionState,
    acceptanceContinuityState,
    previousRuntimeGateState,
    currentRuntimeGateState,
    runtimeGateTransitionState,
    observedSourceConnectionState,
    sourceReportsConnected,
    independentConnectionEvidenceVerified,
    connectionReconciliationState,
    connected: connectionReconciliationState === "CONNECTED_VERIFIED",
    blockers,
    policy: {
      ownerDecisionIsExplicit: true,
      acceptRequiresExactCurrentReceipt: true,
      acceptRequiresActiveSourceHealth: true,
      acceptRequiresOpenThreeMasterRuntimeGate: true,
      staleReceiptAcceptMayContinue: false,
      rejectMayBeRecordedForExactCurrentReceipt: true,
      runtimeGateTransitionsAreRecorded: true,
      codeGreenMayOpenRuntimeGate: false,
      sourceReportedConnectedAloneIsSufficient: false,
      independentConnectionEvidenceRequired: true,
      connectionMayBeAutoInferred: false
    }
  };
}

export type Build375Yw561DecisionRuntimeConnectionModel = ReturnType<
  typeof composeBuild375Yw561DecisionRuntimeConnection
>;
