import {
  summarizeReceiptAge,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import type { CustodyIntakeEvent } from "./manifest-custody-receipt-decision";

export const BUILD_372 = 372 as const;
export const BUILD_372_SCHEMA =
  "rosevear.ai-data-platform.yw561-signer-receipt-replay-master-closure.v1" as const;
export const BUILD_372_CONTROLLER_BASE_REVISION =
  "cb54e6a983a7a9902dea6fdb8ef5d2c23b1207fc" as const;

export const BUILD_372_YW561_OBSERVATION = Object.freeze({
  sourceId: "yw" as const,
  sourceAppId: "yard-workers",
  repository: "RosevearCreations/yw",
  label: "Yard Workers",
  productionMain: "3ac1bbce127a011af7830ad88da020112d132122",
  deploymentId: "dpl_5775v27Ginzas21xz8dP8PT1MUbv",
  deploymentUrl:
    "https://yw-9eoj55tlm-johns-projects-8f256ece.vercel.app/.well-known/rosevear-integration-manifest.json",
  deploymentGitRevision: "3ac1bbce127a011af7830ad88da020112d132122",
  deployedManifestRevision: "3ac1bbce127a011af7830ad88da020112d132122",
  sourceRole: "platform_shell" as const,
  tenantBoundary: "platform_shell" as const,
  signatureState: "AWAITING_INDEPENDENT_SOURCE_SIGNER" as const,
  connectionState: "DISCONNECTED / HOLD" as const,
  responseEtag: 'W/"8b0cf2ba82acd127725cead598b46a36"',
  requestTrace: "iad1:iad1::ht2sf-1794426460598-16e8e67aafa5",
  observedAt: "2026-11-11T19:47:40.000Z",
  evidenceURI:
    "urn:rosevear:evidence:build372:vercel:yw:dpl_5775v27Ginzas21xz8dP8PT1MUbv"
});

export const BUILD_372_YW561_PROVIDER_SNAPSHOT = Object.freeze({
  providerReceiptSchema: "rosevear.yw.provider-delivery-receipt.v1",
  providerReceiver: "CODE_READY_RUNTIME_HOLD",
  providerSignerPin: "HOLD_UNTIL_INDEPENDENTLY_ENROLLED",
  signedProviderReceipt: "HOLD_UNTIL_PROTECTED_RUNTIME_PROOF",
  providerReplay: "HOLD_UNTIL_DATABASE_COMMIT_PROOF",
  sourceHealthSigner: "SEPARATE_MASTER_TRUST_DOMAIN",
  recipientDelivery: "HOLD",
  masterDeliveryAcceptance: "HOLD"
});

export const BUILD_372_MASTER_SNAPSHOT = Object.freeze({
  aiHub: {
    ack: "MASTER360-AIHUB-309-ACK",
    main: "0a94c72ee4a1ded1babeac68deeb981ad33835ef",
    installedBuild308: "HOLD_NO_ORIGINAL_REE_PROCESS_WITNESS",
    originalHostSourceOneTest: "HOLD_NOT_EXECUTED",
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

export type Build372CustodyEvidenceEvent = {
  evidenceEventId: string;
  sourceProductionRevision: string;
  keyId: string;
  publicKeySpkiSha256: string;
  pinEvidenceURI: string;
  custodyEvidenceURI: string;
  witnessEvidenceURI: string;
  registryEventId: string | null;
  enrollmentEventId: string | null;
  custodyState:
    | "VERIFIED_CORRELATED"
    | "HOLD_UNENROLLED"
    | "HOLD_CUSTODY_EVIDENCE"
    | "HOLD_CUSTODY_MISMATCH"
    | "HOLD_AMBIGUOUS";
  blockers: string[];
  checkedAt: string;
  recordedAt: string;
};

export type Build372ReplayCorrelationEvent = {
  replayEventId: string;
  sourceProductionRevision: string;
  manifestRevision: string;
  receiptId: string;
  receiptSha256: string;
  nonceSha256: string;
  replayEvidenceURI: string;
  replayEvidenceDigest: string;
  correlationState:
    | "VERIFIED_CORRELATED"
    | "HOLD_RECEIPT_NOT_CURRENT"
    | "HOLD_RECEIPT_NOT_ADMITTED"
    | "HOLD_SIGNER_CUSTODY"
    | "HOLD_MISMATCH";
  blockers: string[];
  checkedAt: string;
  recordedAt: string;
};

function masterGate() {
  const checks = [
    ["aihub-installed-build308", BUILD_372_MASTER_SNAPSHOT.aiHub.installedBuild308, "VERIFIED"],
    ["aihub-source-one-test", BUILD_372_MASTER_SNAPSHOT.aiHub.originalHostSourceOneTest, "VERIFIED"],
    ["aihub-receiver-ack", BUILD_372_MASTER_SNAPSHOT.aiHub.independentReceiverSignedAck, "VERIFIED"],
    ["aihub-sampled-uptime", BUILD_372_MASTER_SNAPSHOT.aiHub.sampledUptime, "VERIFIED"],
    ["aihub-owner-decision", BUILD_372_MASTER_SNAPSHOT.aiHub.aiDataOwnerDecision, "ACCEPTED"],
    ["aihub-receiver", BUILD_372_MASTER_SNAPSHOT.aiHub.receiver, "ON"],
    ["aihub-connection", BUILD_372_MASTER_SNAPSHOT.aiHub.connection, "CONNECTED"],
    ["aihub-masters-synced", BUILD_372_MASTER_SNAPSHOT.aiHub.mastersSynced, "SYNCED"],
    ["aihub-slave-gate", BUILD_372_MASTER_SNAPSHOT.aiHub.slaveGate, "OPEN"],
    ["comms-original-host-telemetry", BUILD_372_MASTER_SNAPSHOT.comms.originalHostTelemetry, "VERIFIED"],
    ["comms-durable-replay", BUILD_372_MASTER_SNAPSHOT.comms.durableReplayAdmission, "VERIFIED"],
    ["comms-signed-ack", BUILD_372_MASTER_SNAPSHOT.comms.signedCommsAck, "VERIFIED"],
    ["comms-owner-continuity", BUILD_372_MASTER_SNAPSHOT.comms.ownerDecisionContinuity, "ACCEPTED"],
    ["comms-uptime", BUILD_372_MASTER_SNAPSHOT.comms.uptime, "VERIFIED"],
    ["comms-receiver", BUILD_372_MASTER_SNAPSHOT.comms.receiver, "ON"],
    ["comms-connection", BUILD_372_MASTER_SNAPSHOT.comms.connection, "CONNECTED"],
    ["comms-slave-gate", BUILD_372_MASTER_SNAPSHOT.comms.slaveGate, "OPEN"]
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

function activeSigners(events: readonly SignerRegistryEvent[]) {
  const latest = new Map<string, SignerRegistryEvent>();
  for (const event of [...events].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  )) {
    if (event.sourceId === "yw") latest.set(event.keyId, event);
  }
  return [...latest.values()].filter((event) => event.eventType === "ENROLLED");
}

function correlateSignerCustody(
  signerEvents: readonly SignerRegistryEvent[],
  custodyEvents: readonly CustodyIntakeEvent[]
) {
  const signers = activeSigners(signerEvents);
  if (signers.length === 0) {
    return {
      signerState: "HOLD_UNENROLLED" as const,
      signer: null,
      intake: null,
      blockers: ["YW source-health Ed25519 signer is not independently enrolled."]
    };
  }
  if (signers.length > 1) {
    return {
      signerState: "HOLD_AMBIGUOUS" as const,
      signer: null,
      intake: null,
      blockers: ["YW source-health signer enrollment is ambiguous."]
    };
  }
  const signer = signers[0];
  const intake =
    custodyEvents
      .filter(
        (event) =>
          event.sourceId === "yw" &&
          event.keyId === signer.keyId &&
          event.eventType === "ENROLLMENT_COMMITTED"
      )
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

  if (!intake) {
    return {
      signerState: "HOLD_CUSTODY_EVIDENCE" as const,
      signer,
      intake: null,
      blockers: ["Trusted YW signer exists but committed custody enrollment evidence is missing."]
    };
  }

  const evidence = [
    intake.pinEvidenceURI,
    intake.custodyEvidenceURI,
    intake.witnessEvidenceURI
  ];
  const complete = evidence.every((uri): uri is string => Boolean(uri));
  const distinct = complete && new Set(evidence as string[]).size === 3;
  const pinMatch =
    intake.computedSpkiSha256 !== null &&
    intake.independentPinSpkiSha256 !== null &&
    intake.computedSpkiSha256 === intake.independentPinSpkiSha256 &&
    intake.computedSpkiSha256 === signer.publicKeySpkiSha256;

  if (!complete || !distinct) {
    return {
      signerState: "HOLD_CUSTODY_EVIDENCE" as const,
      signer,
      intake,
      blockers: ["YW source-health signer pin, custody and witness evidence are incomplete."]
    };
  }
  if (!pinMatch) {
    return {
      signerState: "HOLD_CUSTODY_MISMATCH" as const,
      signer,
      intake,
      blockers: ["YW source-health signer SPKI custody correlation does not match."]
    };
  }
  return {
    signerState: "VERIFIED_CORRELATED" as const,
    signer,
    intake,
    blockers: [] as string[]
  };
}

export function composeBuild372Yw561Closure(input: {
  signerEvents?: readonly SignerRegistryEvent[];
  custodyEvents?: readonly CustodyIntakeEvent[];
  custodyEvidenceEvents?: readonly Build372CustodyEvidenceEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  replayEvents?: readonly Build372ReplayCorrelationEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  now?: Date;
} = {}) {
  const now = input.now ?? new Date();
  const signerEvents = input.signerEvents ?? [];
  const custodyEvents = input.custodyEvents ?? [];
  const custodyEvidenceEvents = input.custodyEvidenceEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const replayEvents = input.replayEvents ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const observation = BUILD_372_YW561_OBSERVATION;

  const identityState =
    observation.productionMain === observation.deploymentGitRevision &&
    observation.productionMain === observation.deployedManifestRevision &&
    observation.sourceRole === "platform_shell" &&
    observation.tenantBoundary === "platform_shell"
      ? ("VERIFIED_EXACT" as const)
      : ("HOLD" as const);

  const custody = correlateSignerCustody(signerEvents, custodyEvents);
  const latestCustodyEvidence =
    custodyEvidenceEvents
      .filter(
        (event) =>
          event.sourceProductionRevision === observation.productionMain &&
          event.keyId === custody.signer?.keyId
      )
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

  const custodyIntakeState = !latestCustodyEvidence
    ? ("HOLD_NOT_RECEIVED" as const)
    : latestCustodyEvidence.custodyState;

  const latestReceipt =
    receipts
      .filter((receipt) => receipt.sourceId === "yw")
      .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt))[0] ?? null;
  const latestAdmission =
    admissionEvents
      .filter((event) => event.sourceId === "yw")
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
  const receiptAge = latestReceipt
    ? summarizeReceiptAge(latestReceipt, now)
    : ("NOT_RECEIVED" as const);

  const receiptExact =
    latestReceipt?.sourceRevision === observation.productionMain &&
    latestReceipt?.manifestRevision === observation.productionMain;
  const signerMatch =
    latestReceipt !== null &&
    custody.signer !== null &&
    latestReceipt.keyId === custody.signer.keyId;
  const admissionMatch =
    latestReceipt !== null &&
    latestAdmission?.outcome === "ADMITTED" &&
    latestAdmission.receiptId === latestReceipt.receiptId;

  const receiptState = !latestReceipt
    ? ("HOLD_NOT_RECEIVED" as const)
    : custody.signerState !== "VERIFIED_CORRELATED" ||
        custodyIntakeState !== "VERIFIED_CORRELATED"
      ? ("HOLD_SIGNER_CUSTODY" as const)
      : !receiptExact
        ? ("HOLD_REVISION_MISMATCH" as const)
        : receiptAge !== "CURRENT"
          ? ("HOLD_STALE" as const)
          : !signerMatch || !admissionMatch
            ? ("HOLD_NOT_ADMITTED" as const)
            : ("VERIFIED_CURRENT" as const);

  const latestReplay =
    latestReceipt === null
      ? null
      : replayEvents
          .filter(
            (event) =>
              event.receiptId === latestReceipt.receiptId &&
              event.sourceProductionRevision === observation.productionMain &&
              event.manifestRevision === observation.productionMain
          )
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

  const replayState = !latestReplay
    ? ("HOLD_NOT_RECEIVED" as const)
    : latestReplay.correlationState;

  const master = masterGate();
  const sourceEvidenceReady =
    identityState === "VERIFIED_EXACT" &&
    custody.signerState === "VERIFIED_CORRELATED" &&
    custodyIntakeState === "VERIFIED_CORRELATED" &&
    receiptState === "VERIFIED_CURRENT" &&
    replayState === "VERIFIED_CORRELATED";

  const closureState =
    sourceEvidenceReady && master.gateState === "OPEN"
      ? ("READY_FOR_OWNER_DECISION" as const)
      : sourceEvidenceReady
        ? ("SOURCE_EVIDENCE_READY_MASTER_HOLD" as const)
        : identityState === "VERIFIED_EXACT"
          ? ("YW561_CURRENT_EVIDENCE_HOLD" as const)
          : ("HOLD" as const);

  const latestOwnerDecision =
    ownerDecisions
      .filter((decision) => decision.sourceId === "yw")
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

  const blockers = [
    ...(identityState !== "VERIFIED_EXACT"
      ? ["YW561 production manifest identity is not exact."]
      : []),
    ...custody.blockers,
    ...(custodyIntakeState !== "VERIFIED_CORRELATED"
      ? [`YW561 independent source-health custody evidence intake remains ${custodyIntakeState}.`]
      : []),
    ...(receiptState !== "VERIFIED_CURRENT"
      ? [`Exact YW561 signed HEALTHY receipt admission remains ${receiptState}.`]
      : []),
    ...(replayState !== "VERIFIED_CORRELATED"
      ? [`YW561 source-health durable replay correlation remains ${replayState}.`]
      : []),
    ...(master.gateState !== "OPEN"
      ? ["AI Hub 309 / Comms QL-417 three-Master runtime closure remains HOLD."]
      : [])
  ];

  return {
    schema: BUILD_372_SCHEMA,
    build: BUILD_372,
    controllerBaseRevision: BUILD_372_CONTROLLER_BASE_REVISION,
    observation,
    providerEvidence: BUILD_372_YW561_PROVIDER_SNAPSHOT,
    identityState,
    signerState: custody.signerState,
    signer: custody.signer,
    custodyIntake: custody.intake,
    custodyEvidenceEvent: latestCustodyEvidence,
    custodyIntakeState,
    latestReceipt,
    latestAdmission,
    receiptAge,
    receiptState,
    replayEvent: latestReplay,
    replayState,
    sourceEvidenceReady,
    master: {
      snapshot: BUILD_372_MASTER_SNAPSHOT,
      ...master
    },
    closureState,
    latestOwnerDecision: latestOwnerDecision?.decision ?? "PENDING",
    blockers,
    policy: {
      providerSignerMaySatisfySourceHealthSigner: false,
      providerReplayMaySatisfySourceHealthReplay: false,
      sourcePrivateKeyMayBeStored: false,
      exactYw561RevisionRequired: true,
      controllerTrustedSourceSignerRequired: true,
      independentCustodyEvidenceRequired: true,
      controllerReceiptAdmissionRequired: true,
      durableReplayCorrelationRequired: true,
      threeMasterRuntimeGateRequired: true,
      codeGreenIsRuntimeAcceptance: false,
      ownerDecisionRemainsExplicit: true
    }
  };
}

export type Build372Yw561ClosureModel = ReturnType<
  typeof composeBuild372Yw561Closure
>;
