import {
  summarizeReceiptAge,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent,
  type Source365Id
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";

export const SOURCE_OWNER_REVIEW_BUILD = 367 as const;
export const SOURCE_OWNER_REVIEW_SCHEMA =
  "rosevear.ai-data-platform.source-owner-review-acceptance.v1" as const;

export const BUILD_367_SOURCE_SNAPSHOT = Object.freeze([
  {
    sourceId: "yw" as const,
    sourceAppId: "yard-workers",
    label: "Yard Workers",
    repository: "RosevearCreations/yw",
    productionMain: "0010bbd5ae71cb025d77e613cce9bc6e3f064d34",
    manifestRevision: null as string | null,
    manifestMode: "DEPLOYMENT_BOUND" as const,
    sourceRole: "platform_shell",
    signerState: "AWAITING_INDEPENDENT_SOURCE_SIGNER",
    connectionState: "DISCONNECTED / HOLD"
  },
  {
    sourceId: "icamp" as const,
    sourceAppId: "icamp",
    label: "iCamp",
    repository: "RosevearCreations/iCamp",
    productionMain: "7408a66dfa2c70e1de6b358356b7f9e9dc6cb13b",
    manifestRevision: "e2d343595363ca9106e7f1dbc60006e3a6c616aa",
    manifestMode: "STATIC" as const,
    sourceRole: "platform_shell",
    signerState: "AWAITING_INDEPENDENT_SOURCE_SIGNER",
    connectionState: "DISCONNECTED / HOLD"
  }
] as const);

export const BUILD_367_MASTER_SNAPSHOT = Object.freeze({
  controllerMain: "a5ba69a3e09fb4dd41f2b7586db027ba3e819301",
  aiHub: {
    receipt: "MASTER360-AIHUB-307-ACK",
    build: 307,
    main: "34e017dcf0586a7281d8726d5e8fb4a4a7054526",
    dev: "bf784820d454be4f59f7b731450101353045d347",
    code: "GREEN",
    installedRelease: "HOLD",
    durableMonitoring: "CODE_READY_RUNTIME_HOLD",
    sourceCommsChain: "CODE_READY_QL414_NOT_INSTALLED",
    aiDataReceipt: "CODE_READY_RUNTIME_HOLD",
    commsAck: "HOLD",
    automationHost: "DESKTOP-AE894KC_ONLY",
    receiver: "OFF",
    connection: "HOLD",
    masterSync: "HOLD"
  },
  comms: {
    receipt: "MASTER360-COMMS-QL415-ACK",
    main: "8c2d488582801e8abc5ca718b4719c615863274c",
    code: "GREEN",
    runtimeTelemetry: "HOLD_NO_ORIGINAL_HOST_OBSERVATION",
    installedRelease: "HOLD",
    signerCustody: "HOLD_NOT_INDEPENDENTLY_WITNESSED",
    receiverSignedAck: "HOLD",
    durableReplay: "CODE_READY_RUNTIME_HOLD",
    uptime: "UNKNOWN",
    ownerDecision: "HOLD",
    receiver: "OFF",
    connection: "HOLD"
  }
});

export type Build367MasterSnapshot = {
  controllerMain: string;
  aiHub: {
    receipt: string;
    build: number;
    main: string;
    dev: string;
    code: string;
    installedRelease: string;
    durableMonitoring: string;
    sourceCommsChain: string;
    aiDataReceipt: string;
    commsAck: string;
    automationHost: string;
    receiver: string;
    connection: string;
    masterSync: string;
  };
  comms: {
    receipt: string;
    main: string;
    code: string;
    runtimeTelemetry: string;
    installedRelease: string;
    signerCustody: string;
    receiverSignedAck: string;
    durableReplay: string;
    uptime: string;
    ownerDecision: string;
    receiver: string;
    connection: string;
  };
};

export type Build367SourceSnapshot = {
  sourceId: Source365Id;
  sourceAppId: string;
  label: string;
  repository: string;
  productionMain: string;
  manifestRevision: string | null;
  manifestMode: "DEPLOYMENT_BOUND" | "STATIC";
  sourceRole: "platform_shell";
  signerState: string;
  connectionState: string;
};

function activeSignerFor(
  sourceId: Source365Id,
  signerEvents: readonly SignerRegistryEvent[]
) {
  const latest = new Map<string, SignerRegistryEvent>();
  for (const event of [...signerEvents].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  )) {
    if (event.sourceId === sourceId) latest.set(event.keyId, event);
  }
  return [...latest.values()].filter((event) => event.eventType === "ENROLLED");
}

export function build367MasterGate(
  snapshot: Build367MasterSnapshot = BUILD_367_MASTER_SNAPSHOT
) {
  const checks = [
    {
      id: "aihub-installed-release",
      owner: "rosevear-ai-hub",
      observed: snapshot.aiHub.installedRelease,
      verified: snapshot.aiHub.installedRelease === "VERIFIED"
    },
    {
      id: "aihub-durable-monitoring",
      owner: "rosevear-ai-hub",
      observed: snapshot.aiHub.durableMonitoring,
      verified: snapshot.aiHub.durableMonitoring === "VERIFIED"
    },
    {
      id: "aihub-source-comms-chain",
      owner: "rosevear-ai-hub",
      observed: snapshot.aiHub.sourceCommsChain,
      verified: snapshot.aiHub.sourceCommsChain === "VERIFIED"
    },
    {
      id: "aihub-ai-data-receipt",
      owner: "rosevear-ai-hub",
      observed: snapshot.aiHub.aiDataReceipt,
      verified: snapshot.aiHub.aiDataReceipt === "VERIFIED"
    },
    {
      id: "aihub-comms-ack",
      owner: "rosevear-ai-hub",
      observed: snapshot.aiHub.commsAck,
      verified: snapshot.aiHub.commsAck === "VERIFIED"
    },
    {
      id: "aihub-automation-host",
      owner: "rosevear-ai-hub",
      observed: snapshot.aiHub.automationHost,
      verified: snapshot.aiHub.automationHost === "DESKTOP-AE894KC_ONLY"
    },
    {
      id: "comms-runtime-telemetry",
      owner: "rosevear-comms-hub",
      observed: snapshot.comms.runtimeTelemetry,
      verified: snapshot.comms.runtimeTelemetry === "VERIFIED"
    },
    {
      id: "comms-installed-release",
      owner: "rosevear-comms-hub",
      observed: snapshot.comms.installedRelease,
      verified: snapshot.comms.installedRelease === "VERIFIED"
    },
    {
      id: "comms-signer-custody",
      owner: "rosevear-comms-hub",
      observed: snapshot.comms.signerCustody,
      verified: snapshot.comms.signerCustody === "VERIFIED"
    },
    {
      id: "comms-receiver-signed-ack",
      owner: "rosevear-comms-hub",
      observed: snapshot.comms.receiverSignedAck,
      verified: snapshot.comms.receiverSignedAck === "VERIFIED"
    },
    {
      id: "comms-durable-replay",
      owner: "rosevear-comms-hub",
      observed: snapshot.comms.durableReplay,
      verified: snapshot.comms.durableReplay === "VERIFIED"
    },
    {
      id: "comms-uptime",
      owner: "rosevear-comms-hub",
      observed: snapshot.comms.uptime,
      verified: snapshot.comms.uptime === "VERIFIED"
    },
    {
      id: "comms-owner-decision",
      owner: "rosevear-comms-hub",
      observed: snapshot.comms.ownerDecision,
      verified: snapshot.comms.ownerDecision === "ACCEPTED"
    }
  ];
  const blockers = checks.filter((check) => !check.verified);
  return {
    snapshot,
    checks,
    blockers,
    gateOpen:
      snapshot.aiHub.code === "GREEN" &&
      snapshot.comms.code === "GREEN" &&
      blockers.length === 0
  };
}

export function composeBuild367OwnerReview(input: {
  signerEvents?: readonly SignerRegistryEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  now?: Date;
  sourceSnapshot?: readonly Build367SourceSnapshot[];
  masterSnapshot?: Build367MasterSnapshot;
} = {}) {
  const signerEvents = input.signerEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const now = input.now ?? new Date();
  const sourcesSnapshot =
    input.sourceSnapshot ?? (BUILD_367_SOURCE_SNAPSHOT as readonly Build367SourceSnapshot[]);
  const master = build367MasterGate(input.masterSnapshot);

  const sources = sourcesSnapshot.map((source) => {
    const activeSigners = activeSignerFor(source.sourceId, signerEvents);
    const signerState =
      activeSigners.length === 0
        ? ("HOLD_UNENROLLED" as const)
        : activeSigners.length === 1
          ? ("TRUSTED_SIGNER_ENROLLED" as const)
          : ("HOLD_AMBIGUOUS" as const);
    const activeSigner = activeSigners.length === 1 ? activeSigners[0] : null;

    const revisionCurrent =
      source.manifestMode === "DEPLOYMENT_BOUND"
        ? true
        : source.manifestRevision === source.productionMain;
    const sourceRevisionState = revisionCurrent
      ? ("VERIFIED_CURRENT" as const)
      : source.manifestRevision
        ? ("HOLD_MANIFEST_STALE" as const)
        : ("HOLD_MANIFEST_UNVERIFIED" as const);

    const sourceReceipts = receipts
      .filter((receipt) => receipt.sourceId === source.sourceId)
      .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
    const latestReceipt = sourceReceipts[0] ?? null;
    const receiptAge = latestReceipt
      ? summarizeReceiptAge(latestReceipt, now)
      : ("NOT_RECEIVED" as const);
    const revisionMatchesReceipt =
      latestReceipt?.sourceRevision === source.productionMain &&
      latestReceipt?.manifestRevision === source.productionMain;
    const latestAdmission =
      admissionEvents
        .filter((event) => event.sourceId === source.sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
    const admissionMatches =
      latestReceipt !== null &&
      latestAdmission?.outcome === "ADMITTED" &&
      latestAdmission.receiptId === latestReceipt.receiptId;
    const receiptState = !latestReceipt
      ? ("HOLD_NOT_RECEIVED" as const)
      : !revisionMatchesReceipt
        ? ("HOLD_REVISION_MISMATCH" as const)
        : receiptAge !== "CURRENT"
          ? ("HOLD_STALE" as const)
          : !admissionMatches
            ? ("HOLD_NOT_ADMITTED" as const)
            : ("VERIFIED_CURRENT" as const);

    const latestOwnerDecision =
      ownerDecisions
        .filter((decision) => decision.sourceId === source.sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

    const blockers = [
      ...(!revisionCurrent
        ? [
            `${source.label}: manifest revision ${source.manifestRevision ?? "UNVERIFIED"} does not match production main ${source.productionMain}.`
          ]
        : []),
      ...(signerState !== "TRUSTED_SIGNER_ENROLLED"
        ? [`${source.label}: one independently verified source signer is required.`]
        : []),
      ...(receiptState !== "VERIFIED_CURRENT"
        ? [`${source.label}: current admitted signed HEALTHY receipt is not verified.`]
        : []),
      ...(!master.gateOpen
        ? ["Three-Master runtime gate remains HOLD."]
        : [])
    ];

    const packetState =
      blockers.length === 0
        ? ("READY_FOR_OWNER_DECISION" as const)
        : ("HOLD" as const);

    return {
      ...source,
      sourceRevisionState,
      signerState,
      activeSignerKeyId: activeSigner?.keyId ?? null,
      latestReceipt,
      receiptAge,
      receiptState,
      latestAdmission,
      masterGateState: master.gateOpen ? ("OPEN" as const) : ("HOLD" as const),
      packetState,
      blockers,
      latestOwnerDecision: latestOwnerDecision?.decision ?? "PENDING",
      explicitAcceptanceEligible: packetState === "READY_FOR_OWNER_DECISION"
    };
  });

  return {
    schema: SOURCE_OWNER_REVIEW_SCHEMA,
    build: SOURCE_OWNER_REVIEW_BUILD,
    master,
    sources,
    summary: {
      masterGateOpen: master.gateOpen,
      readyForOwnerDecision: sources.filter(
        (source) => source.packetState === "READY_FOR_OWNER_DECISION"
      ).length,
      acceptedSources: sources.filter(
        (source) => source.latestOwnerDecision === "ACCEPT"
      ).length,
      closureState: sources.every(
        (source) =>
          source.packetState === "READY_FOR_OWNER_DECISION" &&
          source.latestOwnerDecision === "ACCEPT"
      )
        ? ("SUPERVISED_ACCEPTANCE_CLOSED" as const)
        : ("HOLD" as const)
    },
    policy: {
      repositoryGreenIsRuntimeProof: false,
      masterAckHoldMayBeAutoReleased: false,
      sourcePrivateKeysAccepted: false,
      signerMustBeIndependentlyEnrolled: true,
      currentSignedHealthyReceiptRequired: true,
      currentSourceRevisionRequired: true,
      masterGateMustBeOpenForAccept: true,
      ownerMustExplicitlyDecide: true,
      controllerMayAutoAccept: false,
      childTenantMayBecomeSourceIdentity: false
    }
  };
}

export type Build367OwnerReviewModel = ReturnType<typeof composeBuild367OwnerReview>;
