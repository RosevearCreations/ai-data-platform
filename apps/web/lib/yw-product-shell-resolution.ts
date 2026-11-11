import {
  summarizeReceiptAge,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import type { CustodyIntakeEvent } from "./manifest-custody-receipt-decision";

export const BUILD_371 = 371 as const;
export const BUILD_371_SCHEMA =
  "rosevear.ai-data-platform.yw-product-shell-signer-health-master-resolution.v1" as const;
export const BUILD_371_CONTROLLER_BASE_REVISION =
  "6b3e68672894a4f90ef68fe26ec00bd8adc02aa1" as const;

export const BUILD_371_YW_OBSERVATION = Object.freeze({
  sourceId: "yw" as const,
  sourceAppId: "yard-workers",
  repository: "RosevearCreations/yw",
  label: "Yard Workers",
  productionMain: "fee921c01a1bcbcb4679ef9a0f6b36d0f29aeaea",
  deploymentId: "dpl_Hkpr2tgGBEBHRCz5YZiaRuChY9jH",
  deploymentUrl:
    "https://yw-ja7t3zeja-johns-projects-8f256ece.vercel.app/.well-known/rosevear-integration-manifest.json",
  deploymentGitRevision: "fee921c01a1bcbcb4679ef9a0f6b36d0f29aeaea",
  deployedManifestRevision: "fee921c01a1bcbcb4679ef9a0f6b36d0f29aeaea",
  sourceRole: "platform_shell" as const,
  tenantBoundary: "platform_shell" as const,
  signatureState: "AWAITING_INDEPENDENT_SOURCE_SIGNER" as const,
  connectionState: "DISCONNECTED / HOLD" as const,
  responseEtag: 'W/"1b6759146bafc610890f4d84d5818f98"',
  requestTrace: "iad1:iad1::nlssw-1794423423440-9025ce603490",
  observedAt: "2026-11-11T18:57:03.000Z",
  evidenceURI:
    "urn:rosevear:evidence:build371:vercel:yw:dpl_Hkpr2tgGBEBHRCz5YZiaRuChY9jH"
});

export const BUILD_371_MASTER_SNAPSHOT = Object.freeze({
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

function masterGate() {
  const checks = [
    ["aihub-installed-build308", BUILD_371_MASTER_SNAPSHOT.aiHub.installedBuild308, "VERIFIED"],
    ["aihub-source-one-test", BUILD_371_MASTER_SNAPSHOT.aiHub.originalHostSourceOneTest, "VERIFIED"],
    ["aihub-receiver-ack", BUILD_371_MASTER_SNAPSHOT.aiHub.independentReceiverSignedAck, "VERIFIED"],
    ["aihub-sampled-uptime", BUILD_371_MASTER_SNAPSHOT.aiHub.sampledUptime, "VERIFIED"],
    ["aihub-owner-decision", BUILD_371_MASTER_SNAPSHOT.aiHub.aiDataOwnerDecision, "ACCEPTED"],
    ["aihub-receiver", BUILD_371_MASTER_SNAPSHOT.aiHub.receiver, "ON"],
    ["aihub-connection", BUILD_371_MASTER_SNAPSHOT.aiHub.connection, "CONNECTED"],
    ["aihub-masters-synced", BUILD_371_MASTER_SNAPSHOT.aiHub.mastersSynced, "SYNCED"],
    ["aihub-slave-gate", BUILD_371_MASTER_SNAPSHOT.aiHub.slaveGate, "OPEN"],
    ["comms-original-host-telemetry", BUILD_371_MASTER_SNAPSHOT.comms.originalHostTelemetry, "VERIFIED"],
    ["comms-durable-replay", BUILD_371_MASTER_SNAPSHOT.comms.durableReplayAdmission, "VERIFIED"],
    ["comms-signed-ack", BUILD_371_MASTER_SNAPSHOT.comms.signedCommsAck, "VERIFIED"],
    ["comms-owner-continuity", BUILD_371_MASTER_SNAPSHOT.comms.ownerDecisionContinuity, "ACCEPTED"],
    ["comms-uptime", BUILD_371_MASTER_SNAPSHOT.comms.uptime, "VERIFIED"],
    ["comms-receiver", BUILD_371_MASTER_SNAPSHOT.comms.receiver, "ON"],
    ["comms-connection", BUILD_371_MASTER_SNAPSHOT.comms.connection, "CONNECTED"],
    ["comms-slave-gate", BUILD_371_MASTER_SNAPSHOT.comms.slaveGate, "OPEN"]
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
      blockers: ["Yard Workers independent Ed25519 source signer is not enrolled."]
    };
  }
  if (signers.length > 1) {
    return {
      signerState: "HOLD_AMBIGUOUS" as const,
      signer: null,
      intake: null,
      blockers: ["Yard Workers has multiple active source signers; custody is ambiguous."]
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
      signerState: "HOLD_CUSTODY" as const,
      signer,
      intake: null,
      blockers: ["Trusted YW signer exists but committed independent custody intake is missing."]
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

  if (!complete || !distinct || !pinMatch) {
    return {
      signerState: "HOLD_CUSTODY" as const,
      signer,
      intake,
      blockers: [
        "YW signer custody evidence must include distinct pin/custody/witness references and an exact controller SPKI match."
      ]
    };
  }

  return {
    signerState: "VERIFIED_CORRELATED" as const,
    signer,
    intake,
    blockers: [] as string[]
  };
}

export function composeBuild371YwResolution(input: {
  signerEvents?: readonly SignerRegistryEvent[];
  custodyEvents?: readonly CustodyIntakeEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  now?: Date;
} = {}) {
  const now = input.now ?? new Date();
  const signerEvents = input.signerEvents ?? [];
  const custodyEvents = input.custodyEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const observation = BUILD_371_YW_OBSERVATION;

  const identityState =
    observation.productionMain === observation.deploymentGitRevision &&
    observation.productionMain === observation.deployedManifestRevision &&
    observation.sourceRole === "platform_shell" &&
    observation.tenantBoundary === "platform_shell"
      ? ("VERIFIED_EXACT" as const)
      : ("HOLD" as const);

  const custody = correlateSignerCustody(signerEvents, custodyEvents);
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

  const exactReceipt =
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
    : custody.signerState !== "VERIFIED_CORRELATED"
      ? ("HOLD_SIGNER_CUSTODY" as const)
      : !exactReceipt
        ? ("HOLD_REVISION_MISMATCH" as const)
        : receiptAge !== "CURRENT"
          ? ("HOLD_STALE" as const)
          : !signerMatch || !admissionMatch
            ? ("HOLD_NOT_ADMITTED" as const)
            : ("VERIFIED_CURRENT" as const);

  const master = masterGate();
  const sourceClosureState =
    identityState === "VERIFIED_EXACT" &&
    custody.signerState === "VERIFIED_CORRELATED" &&
    receiptState === "VERIFIED_CURRENT"
      ? ("READY" as const)
      : ("HOLD" as const);

  const latestOwnerDecision =
    ownerDecisions
      .filter((decision) => decision.sourceId === "yw")
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

  const blockers = [
    ...(identityState !== "VERIFIED_EXACT"
      ? ["YW product-shell identity is not exact."]
      : []),
    ...custody.blockers,
    ...(receiptState !== "VERIFIED_CURRENT"
      ? [`YW fresh current admitted signed HEALTHY receipt remains ${receiptState}.`]
      : []),
    ...(master.gateState !== "OPEN"
      ? ["AI Hub 309 / Comms QL-417 three-Master runtime discrepancy remains HOLD."]
      : [])
  ];

  const resolutionState =
    sourceClosureState === "READY" && master.gateState === "OPEN"
      ? ("READY_FOR_OWNER_DECISION" as const)
      : identityState === "VERIFIED_EXACT"
        ? ("SOURCE_IDENTITY_RESOLVED_RUNTIME_HOLD" as const)
        : ("HOLD" as const);

  return {
    schema: BUILD_371_SCHEMA,
    build: BUILD_371,
    controllerBaseRevision: BUILD_371_CONTROLLER_BASE_REVISION,
    observation,
    identityState,
    signerState: custody.signerState,
    signer: custody.signer,
    custodyIntake: custody.intake,
    latestReceipt,
    latestAdmission,
    receiptAge,
    receiptState,
    sourceClosureState,
    master: {
      snapshot: BUILD_371_MASTER_SNAPSHOT,
      ...master
    },
    resolutionState,
    latestOwnerDecision: latestOwnerDecision?.decision ?? "PENDING",
    blockers,
    policy: {
      productShellIdentityMustBeExact: true,
      controllerTrustedSignerRequired: true,
      independentCustodyCorrelationRequired: true,
      sourcePrivateKeyMayBeStored: false,
      currentReceiptMustMatchExactYw371Revision: true,
      receiptAdmissionMustBeControllerVerified: true,
      threeMasterRuntimeGateMustOpen: true,
      sourceIdentityResolutionDoesNotImplyConnection: true,
      codeGreenIsRuntimeAcceptance: false,
      ownerDecisionRemainsExplicit: true
    }
  };
}

export type Build371YwResolutionModel = ReturnType<
  typeof composeBuild371YwResolution
>;
