import {
  summarizeReceiptAge,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent,
  type Source365Id
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";

export const BUILD_370 = 370 as const;
export const BUILD_370_SCHEMA =
  "rosevear.ai-data-platform.manifest-custody-receipt-master-decision.v1" as const;
export const BUILD_370_CONTROLLER_BASE_REVISION =
  "206aaf4f5007da10607efe692776256b90a9a28b" as const;

export const BUILD_370_MASTER_SNAPSHOT = Object.freeze({
  aiHub: {
    ack: "MASTER360-AIHUB-309-ACK",
    main: "0a94c72ee4a1ded1babeac68deeb981ad33835ef",
    build: 309,
    installedBuild308: "HOLD_NO_ORIGINAL_REE_PROCESS_WITNESS",
    originalHostSourceOneTest: "HOLD_NOT_EXECUTED",
    commsQl416OperationalReview: "CODE_MATCHED_RUNTIME_HOLD",
    independentReceiverSignedAck: "HOLD_NO_REAL_RECEIVER_PROOF",
    sampledUptime: "UNKNOWN_NO_SIGNED_OPERATIONAL_SAMPLES",
    aiDataOwnerDecision: "HOLD_NO_INDEPENDENT_CONTROLLER_OWNER_ACCEPTANCE",
    automationHost: "DESKTOP-AE894KC_ONLY",
    receiver: "OFF",
    connection: "HOLD",
    mastersSynced: "HOLD",
    slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
  },
  comms: {
    handoff: "MASTER360-COMMS-QL417-HANDOFF",
    main: "6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6",
    originalHostTelemetry: "HOLD",
    durableReplayAdmission: "HOLD",
    signedCommsAck: "HOLD",
    ownerDecisionContinuity: "HOLD",
    uptime: "UNKNOWN",
    receiver: "OFF",
    connection: "HOLD",
    slaveGate: "HOLD"
  }
});

export const BUILD_370_MANIFEST_OBSERVATIONS = Object.freeze([
  {
    sourceId: "yw" as const,
    label: "Yard Workers",
    productionMain: "2c7234c975528a3a3ab76ca22829c8b4a541de97",
    deploymentId: "dpl_5GPLC36MjUc8KUsyNS2zqQu7Nc8d",
    deploymentUrl:
      "https://yw-oksk0vzen-johns-projects-8f256ece.vercel.app/.well-known/rosevear-integration-manifest.json",
    deploymentGitRevision: "2c7234c975528a3a3ab76ca22829c8b4a541de97",
    observedManifestRevision: "2c7234c975528a3a3ab76ca22829c8b4a541de97",
    observedSourceId: "yw",
    observedSourceRole: "business_shell" as const,
    expectedSourceRole: "platform_shell" as const,
    tenantBoundary: "platform_shell" as const,
    signatureState: "AWAITING_INDEPENDENT_SOURCE_SIGNER" as const,
    connectionState: "DISCONNECTED / HOLD" as const,
    responseEtag: 'W/"d8fbbda7453a8b6bedfc7f224662e538"',
    requestTrace: "iad1:iad1::ch9b6-1794421789144-32e8e2bf85f7",
    observedAt: "2026-11-11T18:29:49.000Z",
    evidenceURI:
      "urn:rosevear:evidence:build370:vercel:yw:dpl_5GPLC36MjUc8KUsyNS2zqQu7Nc8d"
  },
  {
    sourceId: "icamp" as const,
    label: "iCamp",
    productionMain: "69d46513b45e340a4e295165abbd3d99b3a62274",
    deploymentId: "dpl_48KWSeSdV6KhujxbUeSs8Ao7VMWM",
    deploymentUrl:
      "https://i-camp-8liwuz78z-johns-projects-8f256ece.vercel.app/.well-known/rosevear-integration-manifest.json",
    deploymentGitRevision: "69d46513b45e340a4e295165abbd3d99b3a62274",
    observedManifestRevision: "69d46513b45e340a4e295165abbd3d99b3a62274",
    observedSourceId: "icamp",
    observedSourceRole: "platform_shell" as const,
    expectedSourceRole: "platform_shell" as const,
    tenantBoundary: "platform_shell" as const,
    signatureState: "AWAITING_INDEPENDENT_SOURCE_SIGNER" as const,
    connectionState: "DISCONNECTED / HOLD" as const,
    responseEtag: 'W/"17890251877c06b1abcae0484977c489"',
    requestTrace: "iad1:iad1::xxr9x-1794421794176-0bc4307f17f1",
    observedAt: "2026-11-11T18:29:54.000Z",
    evidenceURI:
      "urn:rosevear:evidence:build370:vercel:icamp:dpl_48KWSeSdV6KhujxbUeSs8Ao7VMWM"
  }
] as const);

export type Build370ManifestObservation =
  (typeof BUILD_370_MANIFEST_OBSERVATIONS)[number];

export type CustodyIntakeEvent = {
  eventId: string;
  intakeId: string;
  sourceId: Source365Id;
  eventType:
    | "SUBMITTED"
    | "CHALLENGE_ISSUED"
    | "CUSTODY_VERIFIED"
    | "ENROLLMENT_COMMITTED"
    | "REJECTED";
  keyId: string;
  computedSpkiSha256: string | null;
  independentPinSpkiSha256: string | null;
  pinEvidenceURI: string | null;
  custodyEvidenceURI: string | null;
  witnessEvidenceURI: string | null;
  recordedAt: string;
};

function masterGate() {
  const checks = [
    ["aihub-installed-build308", BUILD_370_MASTER_SNAPSHOT.aiHub.installedBuild308, "VERIFIED"],
    ["aihub-source-one-test", BUILD_370_MASTER_SNAPSHOT.aiHub.originalHostSourceOneTest, "VERIFIED"],
    ["aihub-receiver-ack", BUILD_370_MASTER_SNAPSHOT.aiHub.independentReceiverSignedAck, "VERIFIED"],
    ["aihub-sampled-uptime", BUILD_370_MASTER_SNAPSHOT.aiHub.sampledUptime, "VERIFIED"],
    ["aihub-owner-decision", BUILD_370_MASTER_SNAPSHOT.aiHub.aiDataOwnerDecision, "ACCEPTED"],
    ["aihub-receiver", BUILD_370_MASTER_SNAPSHOT.aiHub.receiver, "ON"],
    ["aihub-connection", BUILD_370_MASTER_SNAPSHOT.aiHub.connection, "CONNECTED"],
    ["aihub-masters-synced", BUILD_370_MASTER_SNAPSHOT.aiHub.mastersSynced, "SYNCED"],
    ["aihub-slave-gate", BUILD_370_MASTER_SNAPSHOT.aiHub.slaveGate, "OPEN"],
    ["comms-original-host-telemetry", BUILD_370_MASTER_SNAPSHOT.comms.originalHostTelemetry, "VERIFIED"],
    ["comms-durable-replay", BUILD_370_MASTER_SNAPSHOT.comms.durableReplayAdmission, "VERIFIED"],
    ["comms-signed-ack", BUILD_370_MASTER_SNAPSHOT.comms.signedCommsAck, "VERIFIED"],
    ["comms-owner-continuity", BUILD_370_MASTER_SNAPSHOT.comms.ownerDecisionContinuity, "ACCEPTED"],
    ["comms-uptime", BUILD_370_MASTER_SNAPSHOT.comms.uptime, "VERIFIED"],
    ["comms-receiver", BUILD_370_MASTER_SNAPSHOT.comms.receiver, "ON"],
    ["comms-connection", BUILD_370_MASTER_SNAPSHOT.comms.connection, "CONNECTED"],
    ["comms-slave-gate", BUILD_370_MASTER_SNAPSHOT.comms.slaveGate, "OPEN"]
  ].map(([id, observed, required]) => ({
    id: String(id),
    observed: String(observed),
    required: String(required),
    verified: String(observed) === String(required)
  }));
  const blockers = checks.filter((check) => !check.verified);
  return {
    checks,
    blockers,
    gateState: blockers.length === 0 ? ("OPEN" as const) : ("HOLD" as const)
  };
}

function latestRegistrySigner(
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

function correlateCustody(
  sourceId: Source365Id,
  signerEvents: readonly SignerRegistryEvent[],
  custodyEvents: readonly CustodyIntakeEvent[]
) {
  const signers = latestRegistrySigner(sourceId, signerEvents);
  if (signers.length === 0) {
    return {
      custodyState: "HOLD_UNENROLLED" as const,
      signer: null,
      intake: null,
      blockers: ["Independent Ed25519 source signer is not enrolled."]
    };
  }
  if (signers.length > 1) {
    return {
      custodyState: "HOLD_AMBIGUOUS" as const,
      signer: null,
      intake: null,
      blockers: ["Multiple active source signers are present; custody is ambiguous."]
    };
  }

  const signer = signers[0];
  const candidates = custodyEvents
    .filter(
      (event) =>
        event.sourceId === sourceId &&
        event.keyId === signer.keyId &&
        event.eventType === "ENROLLMENT_COMMITTED"
    )
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const intake = candidates[0] ?? null;
  if (!intake) {
    return {
      custodyState: "HOLD_CUSTODY_EVIDENCE" as const,
      signer,
      intake: null,
      blockers: ["Trusted signer exists but committed independent custody evidence is missing."]
    };
  }

  const uris = [
    intake.pinEvidenceURI,
    intake.custodyEvidenceURI,
    intake.witnessEvidenceURI
  ];
  const complete = uris.every((uri): uri is string => Boolean(uri));
  const distinct = complete && new Set(uris as string[]).size === 3;
  const pinMatch =
    intake.computedSpkiSha256 !== null &&
    intake.independentPinSpkiSha256 !== null &&
    intake.computedSpkiSha256 === intake.independentPinSpkiSha256 &&
    intake.computedSpkiSha256 === signer.publicKeySpkiSha256;

  if (!complete || !distinct) {
    return {
      custodyState: "HOLD_CUSTODY_EVIDENCE" as const,
      signer,
      intake,
      blockers: ["Pin, custody and witness evidence must all exist and be independently distinct."]
    };
  }
  if (!pinMatch) {
    return {
      custodyState: "HOLD_CUSTODY_MISMATCH" as const,
      signer,
      intake,
      blockers: ["Independent SPKI pin does not match the controller trusted signer fingerprint."]
    };
  }

  return {
    custodyState: "VERIFIED_CORRELATED" as const,
    signer,
    intake,
    blockers: [] as string[]
  };
}

export function composeBuild370Decision(input: {
  signerEvents?: readonly SignerRegistryEvent[];
  custodyEvents?: readonly CustodyIntakeEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  observations?: readonly Build370ManifestObservation[];
  now?: Date;
} = {}) {
  const now = input.now ?? new Date();
  const signerEvents = input.signerEvents ?? [];
  const custodyEvents = input.custodyEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const observations =
    input.observations ?? BUILD_370_MANIFEST_OBSERVATIONS;
  const master = masterGate();

  const sources = observations.map((observation) => {
    const revisionExact =
      observation.productionMain === observation.deploymentGitRevision &&
      observation.productionMain === observation.observedManifestRevision &&
      observation.sourceId === observation.observedSourceId &&
      observation.tenantBoundary === "platform_shell";
    const roleExact =
      observation.observedSourceRole === observation.expectedSourceRole;
    const manifestState = !revisionExact
      ? ("HOLD_MISMATCH" as const)
      : !roleExact
        ? ("HOLD_ROLE_MISMATCH" as const)
        : ("VERIFIED_EXACT" as const);

    const custody = correlateCustody(
      observation.sourceId,
      signerEvents,
      custodyEvents
    );

    const latestReceipt =
      receipts
        .filter((receipt) => receipt.sourceId === observation.sourceId)
        .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt))[0] ?? null;
    const latestAdmission =
      admissionEvents
        .filter((event) => event.sourceId === observation.sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
    const receiptAge = latestReceipt
      ? summarizeReceiptAge(latestReceipt, now)
      : ("NOT_RECEIVED" as const);

    const latestOwnerDecision =
      ownerDecisions
        .filter((decision) => decision.sourceId === observation.sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

    const receiptRevisionExact =
      latestReceipt?.sourceRevision === observation.productionMain &&
      latestReceipt?.manifestRevision === observation.productionMain;
    const admissionExact =
      latestReceipt !== null &&
      latestAdmission?.outcome === "ADMITTED" &&
      latestAdmission.receiptId === latestReceipt.receiptId;
    const signerExact =
      latestReceipt !== null &&
      custody.signer !== null &&
      latestReceipt.keyId === custody.signer.keyId;

    const receiptState = !latestReceipt
      ? ("HOLD_NOT_RECEIVED" as const)
      : custody.custodyState !== "VERIFIED_CORRELATED"
        ? ("HOLD_SIGNER_CUSTODY" as const)
        : !receiptRevisionExact
          ? ("HOLD_REVISION_MISMATCH" as const)
          : receiptAge !== "CURRENT"
            ? ("HOLD_STALE" as const)
            : !admissionExact || !signerExact
              ? ("HOLD_NOT_ADMITTED" as const)
              : ("VERIFIED_CURRENT" as const);

    const sourceClosureState =
      manifestState === "VERIFIED_EXACT" &&
      custody.custodyState === "VERIFIED_CORRELATED" &&
      receiptState === "VERIFIED_CURRENT"
        ? ("READY" as const)
        : ("HOLD" as const);

    const blockers = [
      ...(manifestState === "HOLD_MISMATCH"
        ? [`${observation.label}: deployed manifest revision or source identity does not match current production.`]
        : []),
      ...(manifestState === "HOLD_ROLE_MISMATCH"
        ? [`${observation.label}: deployed source role ${observation.observedSourceRole} does not match required ${observation.expectedSourceRole}.`]
        : []),
      ...custody.blockers,
      ...(receiptState !== "VERIFIED_CURRENT"
        ? [`${observation.label}: fresh current admitted signed HEALTHY receipt closure remains ${receiptState}.`]
        : []),
      ...(master.gateState !== "OPEN"
        ? ["Three-Master runtime decision gate remains HOLD."]
        : [])
    ];

    return {
      ...observation,
      manifestState,
      custodyState: custody.custodyState,
      signer: custody.signer,
      custodyIntake: custody.intake,
      latestReceipt,
      latestAdmission,
      receiptAge,
      receiptState,
      sourceClosureState,
      masterGateState: master.gateState,
      decisionState:
        sourceClosureState === "READY" && master.gateState === "OPEN"
          ? ("READY_FOR_OWNER_DECISION" as const)
          : ("HOLD" as const),
      blockers,
      latestOwnerDecision: latestOwnerDecision?.decision ?? "PENDING"
    };
  });

  return {
    schema: BUILD_370_SCHEMA,
    build: BUILD_370,
    controllerBaseRevision: BUILD_370_CONTROLLER_BASE_REVISION,
    master: {
      snapshot: BUILD_370_MASTER_SNAPSHOT,
      ...master
    },
    sources,
    summary: {
      exactManifestRevisionObserved: sources.filter(
        (source) =>
          source.productionMain === source.observedManifestRevision &&
          source.productionMain === source.deploymentGitRevision
      ).length,
      fullyConfirmedManifestIdentity: sources.filter(
        (source) => source.manifestState === "VERIFIED_EXACT"
      ).length,
      custodyCorrelated: sources.filter(
        (source) => source.custodyState === "VERIFIED_CORRELATED"
      ).length,
      freshReceiptClosure: sources.filter(
        (source) => source.receiptState === "VERIFIED_CURRENT"
      ).length,
      readyForOwnerDecision: sources.filter(
        (source) => source.decisionState === "READY_FOR_OWNER_DECISION"
      ).length,
      threeMasterGate: master.gateState
    },
    policy: {
      independentDeploymentObservationRequired: true,
      exactManifestRevisionRequired: true,
      exactProductShellRoleRequired: true,
      controllerTrustedSignerRequired: true,
      custodyEvidenceMustCorrelateToTrustedSigner: true,
      sourcePrivateKeyMayBeStored: false,
      freshReceiptMustMatchExactRevision: true,
      receiptAdmissionMustBeControllerVerified: true,
      threeMasterRuntimeGateRequired: true,
      codeGreenIsRuntimeAcceptance: false,
      ownerDecisionRemainsExplicit: true
    }
  };
}

export type Build370DecisionModel = ReturnType<typeof composeBuild370Decision>;
