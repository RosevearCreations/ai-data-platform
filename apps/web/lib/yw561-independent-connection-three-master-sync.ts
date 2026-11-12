import {
  type Build375Input,
  composeBuild375Yw561DecisionRuntimeConnection
} from "./yw561-owner-decision-runtime-connection-reconciliation";
import { BUILD_373_YW561_LIVE_OBSERVATION } from "./yw561-live-signer-receipt-replay-owner-recheck";

export const BUILD_376 = 376 as const;
export const BUILD_376_SCHEMA =
  "rosevear.ai-data-platform.yw561-independent-connection-three-master-sync.v1" as const;
export const BUILD_376_CONTROLLER_BASE_REVISION =
  "83fa0b23af4c6ce59209efa324685eda6b80a546" as const;

export const BUILD_376_MASTER_RUNTIME = Object.freeze({
  controller: {
    build: 375,
    main: BUILD_376_CONTROLLER_BASE_REVISION
  },
  yw: {
    build: 561,
    main: BUILD_373_YW561_LIVE_OBSERVATION.productionMain
  },
  aiHub: {
    build: 309,
    main: "0a94c72ee4a1ded1babeac68deeb981ad33835ef",
    runtime: "HOLD",
    connection: "HOLD"
  },
  comms: {
    build: "QL-418",
    main: "0cd042d044226848ab50da25a5cc0efc14577e39",
    runtime: "HOLD",
    connection: "HOLD"
  }
} as const);

export type Build376ConnectionRegistryEvidence = {
  evidenceId: string;
  sourceId: "yw";
  recordVersion: number;
  environment: "nonproduction" | "production";
  declaredStatus:
    | "DISCOVERED"
    | "CONFIGURED"
    | "AUTHORIZATION_HELD"
    | "TEST_VERIFIED"
    | "CONNECTED"
    | "STALE"
    | "DEGRADED"
    | "DISCONNECTED"
    | "REVOKED"
    | "ERROR";
  statusObservedAt: string;
  statusExpiresAt: string;
  evidenceURI: string;
  immutableRevision: string | null;
  signerKeyId: string | null;
  signerFingerprint: string | null;
  testEvidenceURI: string | null;
  connectionEvidenceURI: string | null;
  ownerAuthorized: boolean;
  independentTestVerified: boolean;
  independentConnectionVerified: boolean;
  evidenceAuthority:
    | "operator-recorded"
    | "independent-source-verification";
};

export type Build376ConnectionIntakeEvent = {
  intakeEventId: string;
  registryEvidenceId: string;
  sourceProductionRevision: string;
  exactReceiptId: string | null;
  verificationState: "VERIFIED_CURRENT";
  checkedAt: string;
  recordedAt: string;
};

export type Build376Input = Build375Input & {
  connectionRegistryEvidence?: Build376ConnectionRegistryEvidence | null;
  connectionIntakeEvents?: Build376ConnectionIntakeEvent[];
};

function validTime(value: string) {
  return Number.isFinite(Date.parse(value));
}

function evaluateCandidate(
  evidence: Build376ConnectionRegistryEvidence | null,
  now: Date
) {
  if (!evidence) return "HOLD_NO_REGISTRY_EVIDENCE" as const;
  if (evidence.sourceId !== "yw") return "HOLD_SOURCE_MISMATCH" as const;
  if (evidence.environment !== "production") {
    return "HOLD_ENVIRONMENT_MISMATCH" as const;
  }
  if (evidence.declaredStatus !== "CONNECTED") {
    return "HOLD_NOT_CONNECTED" as const;
  }
  if (evidence.evidenceAuthority !== "independent-source-verification") {
    return "HOLD_NOT_INDEPENDENT" as const;
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
    return "HOLD_INCOMPLETE_AUTHORITY" as const;
  }
  if (
    evidence.immutableRevision !==
    BUILD_373_YW561_LIVE_OBSERVATION.productionMain
  ) {
    return "HOLD_REVISION_MISMATCH" as const;
  }
  if (
    !validTime(evidence.statusObservedAt) ||
    !validTime(evidence.statusExpiresAt) ||
    Date.parse(evidence.statusObservedAt) > now.getTime() + 5 * 60_000 ||
    Date.parse(evidence.statusExpiresAt) <= now.getTime() ||
    Date.parse(evidence.statusExpiresAt) <= Date.parse(evidence.statusObservedAt)
  ) {
    return "HOLD_STALE_OR_INVALID_TIME" as const;
  }
  return "READY_FOR_TRUSTED_INTAKE" as const;
}

export function composeBuild376Yw561ConnectionSync(
  input: Build376Input = {}
) {
  const now = input.now ?? new Date();
  const connectionRegistryEvidence = input.connectionRegistryEvidence ?? null;
  const candidateConnectionEvidenceState = evaluateCandidate(
    connectionRegistryEvidence,
    now
  );

  const intakeEvents = [...(input.connectionIntakeEvents ?? [])]
    .filter(
      (event) =>
        event.sourceProductionRevision ===
          BUILD_373_YW561_LIVE_OBSERVATION.productionMain &&
        event.verificationState === "VERIFIED_CURRENT"
    )
    .sort(
      (a, b) =>
        Date.parse(b.recordedAt) - Date.parse(a.recordedAt)
    );

  const currentIntake =
    connectionRegistryEvidence &&
    candidateConnectionEvidenceState === "READY_FOR_TRUSTED_INTAKE"
      ? intakeEvents.find(
          (event) =>
            event.registryEvidenceId ===
            connectionRegistryEvidence.evidenceId
        ) ?? null
      : null;

  const independentConnectionEvidenceIntakeState =
    candidateConnectionEvidenceState !== "READY_FOR_TRUSTED_INTAKE"
      ? candidateConnectionEvidenceState
      : currentIntake
        ? ("VERIFIED_CURRENT" as const)
        : ("READY_FOR_TRUSTED_INTAKE" as const);

  const prior = composeBuild375Yw561DecisionRuntimeConnection({
    ...input,
    connectionObservationOverride:
      independentConnectionEvidenceIntakeState === "VERIFIED_CURRENT"
        ? "CONNECTED / VERIFIED"
        : input.connectionObservationOverride,
    independentConnectionEvidenceVerified:
      independentConnectionEvidenceIntakeState === "VERIFIED_CURRENT"
  });

  const exactReceiptAcceptanceContinuityRecheckState =
    prior.acceptanceContinuityState !== "ACTIVE"
      ? ("HOLD_ACCEPTANCE_CONTINUITY" as const)
      : !prior.exactCurrentReceiptId
        ? ("HOLD_NO_CURRENT_RECEIPT" as const)
        : !currentIntake
          ? ("HOLD_NO_VERIFIED_CONNECTION_INTAKE" as const)
          : currentIntake.exactReceiptId !== prior.exactCurrentReceiptId
            ? ("HOLD_RECEIPT_CHANGED" as const)
            : ("ACTIVE_CURRENT" as const);

  const verifiedConnectedTransitionState =
    independentConnectionEvidenceIntakeState !== "VERIFIED_CURRENT"
      ? ("HOLD_CONNECTION_EVIDENCE" as const)
      : exactReceiptAcceptanceContinuityRecheckState !== "ACTIVE_CURRENT"
        ? ("HOLD_ACCEPTANCE_CONTINUITY" as const)
        : prior.currentRuntimeGateState !== "OPEN"
          ? ("HOLD_MASTER_GATE" as const)
          : prior.connectionReconciliationState !== "CONNECTED_VERIFIED"
            ? ("HOLD_CONNECTION_RECONCILIATION" as const)
            : ("CONNECTED_VERIFIED" as const);

  const threeMasterSynchronizationClosureState =
    verifiedConnectedTransitionState === "CONNECTED_VERIFIED" &&
    exactReceiptAcceptanceContinuityRecheckState === "ACTIVE_CURRENT" &&
    prior.currentRuntimeGateState === "OPEN"
      ? ("CLOSED" as const)
      : ("HOLD" as const);

  const blockers = [
    ...prior.blockers.filter(
      (blocker) =>
        !blocker.includes("independently verified current connection evidence")
    ),
    ...(candidateConnectionEvidenceState === "HOLD_NO_REGISTRY_EVIDENCE"
      ? [
          "No trusted YW CONNECTED registry evidence is available for Build 376 intake."
        ]
      : []),
    ...(candidateConnectionEvidenceState === "HOLD_REVISION_MISMATCH"
      ? [
          "The candidate YW connection evidence is not bound to current YW561 production revision."
        ]
      : []),
    ...(candidateConnectionEvidenceState === "HOLD_STALE_OR_INVALID_TIME"
      ? ["The candidate YW connection evidence is stale or has invalid freshness timestamps."]
      : []),
    ...(independentConnectionEvidenceIntakeState === "READY_FOR_TRUSTED_INTAKE"
      ? [
          "A valid independent YW CONNECTED registry record exists but has not yet been correlated into the Build 376 intake ledger."
        ]
      : []),
    ...(exactReceiptAcceptanceContinuityRecheckState === "HOLD_RECEIPT_CHANGED"
      ? [
          "The verified connection intake is bound to a different receipt than the exact current owner-accepted YW561 receipt."
        ]
      : []),
    ...(verifiedConnectedTransitionState === "HOLD_MASTER_GATE"
      ? [
          "The connection evidence is verified, but the three-Master runtime gate is not OPEN."
        ]
      : []),
    ...(threeMasterSynchronizationClosureState !== "CLOSED"
      ? [
          "Three-Master synchronization remains HOLD until exact-receipt owner acceptance, runtime OPEN, and independently verified current connection evidence all correlate."
        ]
      : [])
  ];

  return {
    schema: BUILD_376_SCHEMA,
    build: BUILD_376,
    controllerBaseRevision: BUILD_376_CONTROLLER_BASE_REVISION,
    masterRuntime: BUILD_376_MASTER_RUNTIME,
    connectionRegistryEvidence,
    candidateConnectionEvidenceState,
    currentConnectionIntake: currentIntake,
    independentConnectionEvidenceIntakeState,
    exactCurrentReceiptId: prior.exactCurrentReceiptId,
    exactCurrentReceiptOwnerDecision:
      prior.latestExactReceiptOwnerDecision,
    exactReceiptAcceptanceContinuityRecheckState,
    currentRuntimeGateState: prior.currentRuntimeGateState,
    verifiedConnectedTransitionState,
    threeMasterSynchronizationClosureState,
    connectionState:
      verifiedConnectedTransitionState === "CONNECTED_VERIFIED"
        ? ("CONNECTED" as const)
        : ("DISCONNECTED_HOLD" as const),
    mastersSynced:
      threeMasterSynchronizationClosureState === "CLOSED",
    blockers,
    policy: {
      independentRegistryAuthorityRequired: true,
      operatorRecordedEvidenceCannotConnect: true,
      productionEvidenceRequired: true,
      exactYw561RevisionRequired: true,
      freshnessRequired: true,
      trustedIntakeCorrelationRequired: true,
      exactCurrentReceiptAcceptanceMustRemainActive: true,
      runtimeGateMustRemainOpen: true,
      connectedMayBeInferredFromCodeGreen: false,
      connectedMayBeInferredFromOwnerAccept: false,
      threeMasterSyncMayBeInferred: false,
      rawConnectionSecretsAccepted: false
    },
    prior
  };
}

export type Build376Yw561ConnectionSyncModel = ReturnType<
  typeof composeBuild376Yw561ConnectionSync
>;
