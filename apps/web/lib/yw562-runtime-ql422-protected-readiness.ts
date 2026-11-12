import { createHash } from "node:crypto";
import {
  summarizeReceiptAge,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import type { Build372ReplayCorrelationEvent } from "./yw561-signer-receipt-replay-closure";

export const BUILD_378 = 378 as const;
export const BUILD_378_SCHEMA =
  "rosevear.ai-data-platform.yw562-runtime-ql422-protected-readiness.v1" as const;
export const BUILD_378_CONTROLLER_BASE_REVISION =
  "6b09a552bf7e17331ea311bf6c983afadeaa134a" as const;

export const BUILD_378_RUNTIME = Object.freeze({
  yw: {
    build: 562,
    main: "6e0b77eebcfc77aa7fc48dcc398da958af8df696",
    sourceRole: "platform_shell",
    tenantBoundary: "platform_shell",
    handoff: "MASTER562-YW-PROVIDER-PILOT"
  },
  aiHub: {
    build: 312,
    main: "e64e4b2e79e7c07bbd077284c298207414b149ad",
    originalHost: "DESKTOP-AE894KC",
    pilotState: "HOLD",
    connection: "HOLD",
    mastersSynced: "HOLD"
  },
  comms: {
    build: "QL-422",
    main: "5f360821b361b43dd28aa5b2ca4c147565a84f0a",
    receiver: "OFF",
    connection: "HOLD",
    ownerAcceptance: "HOLD",
    slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
  }
} as const);

export const BUILD_378_REQUIRED_YW_TABLES = Object.freeze([
  "ywi_landscape_recovery_cases_556",
  "ywi_landscape_provider_verified_561",
  "ywi_landscape_provider_pilot_decisions_562"
] as const);

export const BUILD_378_RUNTIME_PREREQUISITE_REPORT_SCHEMA =
  "rosevear.yw.runtime-prerequisite-evidence.v1" as const;

export function canonicalBuild378RuntimePrerequisitePayload(input: {
  keyId: string;
  sourceProductionRevision: string;
  requiredTables: readonly string[];
  schemaChainVerified: boolean;
  rlsVerified: boolean;
  ownerHelperVerified: boolean;
  protectedSummaryVerified: boolean;
  evidenceURI: string;
  nonce: string;
  checkedAt: string;
}) {
  return JSON.stringify({
    schema: BUILD_378_RUNTIME_PREREQUISITE_REPORT_SCHEMA,
    sourceId: "yw",
    environment: "production",
    keyId: input.keyId,
    sourceProductionRevision: input.sourceProductionRevision,
    requiredTables: [...input.requiredTables].sort(),
    schemaChainVerified: input.schemaChainVerified,
    rlsVerified: input.rlsVerified,
    ownerHelperVerified: input.ownerHelperVerified,
    protectedSummaryVerified: input.protectedSummaryVerified,
    evidenceURI: input.evidenceURI,
    nonce: input.nonce,
    checkedAt: input.checkedAt
  });
}

export function build378EvidenceDigest(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

const MASTER_IDS = [
  "rosevear-ai-hub",
  "rosevear-comms-hub",
  "ai-data-platform"
] as const;

export type Build378RuntimePrerequisiteEvidence = {
  evidenceId: string;
  sourceId: "yw";
  keyId: string;
  sourceProductionRevision: string;
  requiredTables: string[];
  schemaChainVerified: boolean;
  rlsVerified: boolean;
  ownerHelperVerified: boolean;
  protectedSummaryVerified: boolean;
  evidenceURI: string;
  reportDigest: string;
  signatureDigest: string;
  nonce: string;
  checkedAt: string;
  recordedAt: string;
  verificationState: "VERIFIED_CURRENT";
};

export type Build378FreshReceiptAdmissionEvent = {
  admissionEventId: string;
  prerequisiteEvidenceId: string;
  receiptId: string;
  receiptSha256: string;
  sourceRevision: string;
  admissionState: "ADMITTED_CURRENT";
  admittedAt: string;
  recordedAt: string;
};

export type Build378Ql422MasterReceipt = {
  masterId: (typeof MASTER_IDS)[number];
  receiptId: string;
  digest: string;
};

export type Build378Ql422CorrelationEvent = {
  correlationEventId: string;
  evidenceAuthority: "owner-reference-only" | "protected-runtime";
  controllerRevision: string;
  ywSourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  originalHostId: string;
  sourceEpisodeId: string;
  sourceReceiptDigest: string;
  receiverAckDigest: string;
  closureDigest: string;
  handoffReceiptId: string;
  witnessDigest: string;
  masterReceipts: Build378Ql422MasterReceipt[];
  terminalLedgerDigest: string;
  evidenceURI: string;
  observedAt: string;
  recordedAt: string;
  correlationState: "CANDIDATE_HOLD" | "VERIFIED_CORRELATED";
};

export type Build378Input = {
  signerEvents?: readonly SignerRegistryEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  replayEvents?: readonly Build372ReplayCorrelationEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  runtimePrerequisiteEvents?: readonly Build378RuntimePrerequisiteEvidence[];
  freshReceiptAdmissionEvents?: readonly Build378FreshReceiptAdmissionEvent[];
  ql422CorrelationEvents?: readonly Build378Ql422CorrelationEvent[];
  now?: Date;
};

function latestActiveYwSigner(events: readonly SignerRegistryEvent[]) {
  const latest = new Map<string, SignerRegistryEvent>();
  for (const event of [...events].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  )) {
    if (event.sourceId === "yw") latest.set(event.keyId, event);
  }
  const active = [...latest.values()].filter(
    (event) => event.eventType === "ENROLLED"
  );
  return active.length === 1 ? active[0] : null;
}

function exactTables(tables: readonly string[]) {
  const actual = [...new Set(tables)].sort();
  const expected = [...BUILD_378_REQUIRED_YW_TABLES].sort();
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function prerequisiteState(
  event: Build378RuntimePrerequisiteEvidence | null,
  signer: SignerRegistryEvent | null,
  now: Date
) {
  if (!event) return "HOLD_NO_RUNTIME_PREREQUISITE_EVIDENCE" as const;
  if (
    event.sourceId !== "yw" ||
    event.sourceProductionRevision !== BUILD_378_RUNTIME.yw.main
  ) {
    return "HOLD_RUNTIME_REVISION_MISMATCH" as const;
  }
  if (!signer || signer.keyId !== event.keyId) {
    return "HOLD_RUNTIME_SIGNER_MISMATCH" as const;
  }
  if (
    !exactTables(event.requiredTables) ||
    event.schemaChainVerified !== true ||
    event.rlsVerified !== true ||
    event.ownerHelperVerified !== true ||
    event.protectedSummaryVerified !== true
  ) {
    return "HOLD_RUNTIME_PREREQUISITES_INCOMPLETE" as const;
  }
  if (event.verificationState !== "VERIFIED_CURRENT") {
    return "HOLD_RUNTIME_EVIDENCE_UNVERIFIED" as const;
  }
  if (
    !/^[a-f0-9]{64}$/.test(event.reportDigest) ||
    !/^[a-f0-9]{64}$/.test(event.signatureDigest) ||
    !event.evidenceURI
  ) {
    return "HOLD_RUNTIME_EVIDENCE_INVALID" as const;
  }
  const checked = Date.parse(event.checkedAt);
  if (
    !Number.isFinite(checked) ||
    checked > now.getTime() + 2 * 60_000 ||
    now.getTime() - checked > 15 * 60_000
  ) {
    return "HOLD_RUNTIME_EVIDENCE_STALE" as const;
  }
  return "VERIFIED_CURRENT" as const;
}

function ql422State(
  event: Build378Ql422CorrelationEvent | null,
  now: Date
) {
  if (!event) return "HOLD_NO_QL422_CORRELATION" as const;
  if (event.evidenceAuthority !== "protected-runtime") {
    return "HOLD_REFERENCE_ONLY" as const;
  }
  if (event.correlationState !== "VERIFIED_CORRELATED") {
    return "HOLD_QL422_NOT_VERIFIED" as const;
  }
  if (
    event.controllerRevision !== BUILD_378_CONTROLLER_BASE_REVISION ||
    event.ywSourceRevision !== BUILD_378_RUNTIME.yw.main ||
    event.aiHubMain !== BUILD_378_RUNTIME.aiHub.main ||
    event.commsMain !== BUILD_378_RUNTIME.comms.main
  ) {
    return "HOLD_QL422_REVISION_MISMATCH" as const;
  }
  if (event.originalHostId !== BUILD_378_RUNTIME.aiHub.originalHost) {
    return "HOLD_ORIGINAL_HOST_MISMATCH" as const;
  }

  const masterIds = event.masterReceipts.map((item) => item.masterId);
  if (
    event.masterReceipts.length !== MASTER_IDS.length ||
    new Set(masterIds).size !== MASTER_IDS.length ||
    !MASTER_IDS.every((masterId) => masterIds.includes(masterId)) ||
    event.masterReceipts.some(
      (item) =>
        !item.receiptId ||
        !/^[a-f0-9]{64}$/.test(item.digest)
    )
  ) {
    return "HOLD_THREE_MASTER_LEDGER_INCOMPLETE" as const;
  }

  const digests = [
    event.sourceReceiptDigest,
    event.receiverAckDigest,
    event.closureDigest,
    event.witnessDigest,
    event.terminalLedgerDigest
  ];
  if (
    !event.sourceEpisodeId ||
    !event.handoffReceiptId ||
    digests.some((digest) => !/^[a-f0-9]{64}$/.test(digest))
  ) {
    return "HOLD_QL422_DIGEST_BINDING_INVALID" as const;
  }

  const observed = Date.parse(event.observedAt);
  if (
    !Number.isFinite(observed) ||
    observed > now.getTime() + 2 * 60_000 ||
    now.getTime() - observed > 5 * 60_000
  ) {
    return "HOLD_QL422_EVIDENCE_STALE" as const;
  }

  return "VERIFIED_CORRELATED" as const;
}

export function composeBuild378RuntimeQl422Readiness(
  input: Build378Input = {}
) {
  const now = input.now ?? new Date();
  const signerEvents = input.signerEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const replayEvents = input.replayEvents ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const runtimePrerequisiteEvents = input.runtimePrerequisiteEvents ?? [];
  const freshReceiptAdmissionEvents = input.freshReceiptAdmissionEvents ?? [];
  const ql422CorrelationEvents = input.ql422CorrelationEvents ?? [];

  const activeSigner = latestActiveYwSigner(signerEvents);
  const latestPrerequisite =
    [...runtimePrerequisiteEvents]
      .filter((event) => event.sourceId === "yw")
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
  const runtimePrerequisiteState = prerequisiteState(
    latestPrerequisite,
    activeSigner,
    now
  );

  const exactReceipts = receipts
    .filter(
      (receipt) =>
        receipt.sourceId === "yw" &&
        receipt.sourceRevision === BUILD_378_RUNTIME.yw.main &&
        receipt.manifestRevision === BUILD_378_RUNTIME.yw.main
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
            event.sourceRevision === BUILD_378_RUNTIME.yw.main &&
            event.receiptId === exactReceipt.receiptId
        )
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
    : null;
  const exactReplay = exactReceipt
    ? replayEvents
        .filter(
          (event) =>
            event.sourceProductionRevision === BUILD_378_RUNTIME.yw.main &&
            event.receiptId === exactReceipt.receiptId
        )
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
    : null;

  const sourceReceiptState =
    !exactReceipt
      ? ("HOLD_NO_CURRENT_RECEIPT" as const)
      : !activeSigner || activeSigner.keyId !== exactReceipt.keyId
        ? ("HOLD_SIGNER_NOT_EXACT" as const)
        : receiptAge !== "CURRENT"
          ? ("HOLD_RECEIPT_STALE" as const)
          : exactAdmission?.outcome !== "ADMITTED"
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
  const exactOwnerAcceptanceState =
    exactOwnerDecision?.decision === "ACCEPT"
      ? ("ACCEPTED_CURRENT" as const)
      : exactOwnerDecision?.decision === "REJECT"
        ? ("REJECTED_CURRENT" as const)
        : ("HOLD_EXPLICIT_ACCEPT_REQUIRED" as const);

  const currentReceiptAdmission =
    exactReceipt && latestPrerequisite
      ? [...freshReceiptAdmissionEvents]
          .filter(
            (event) =>
              event.prerequisiteEvidenceId === latestPrerequisite.evidenceId &&
              event.receiptId === exactReceipt.receiptId &&
              event.receiptSha256 === exactReceipt.receiptSha256 &&
              event.sourceRevision === BUILD_378_RUNTIME.yw.main &&
              event.admissionState === "ADMITTED_CURRENT"
          )
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null
      : null;

  const freshSourceBoundReceiptAdmissionState =
    runtimePrerequisiteState !== "VERIFIED_CURRENT"
      ? ("HOLD_RUNTIME_PREREQUISITES" as const)
      : sourceReceiptState !== "ACTIVE_CURRENT"
        ? ("HOLD_SOURCE_RECEIPT" as const)
        : currentReceiptAdmission
          ? ("ADMITTED_CURRENT" as const)
          : ("READY_FOR_RECEIPT_ADMISSION" as const);

  const latestQl422Reference =
    [...ql422CorrelationEvents]
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
  const latestProtectedQl422Correlation =
    [...ql422CorrelationEvents]
      .filter((event) => event.evidenceAuthority === "protected-runtime")
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
  const effectiveQl422Correlation =
    latestProtectedQl422Correlation ?? latestQl422Reference;
  const ql422CorrelationState = ql422State(effectiveQl422Correlation, now);

  const protectedActivationReadinessState =
    runtimePrerequisiteState !== "VERIFIED_CURRENT"
      ? ("HOLD_RUNTIME_PREREQUISITES" as const)
      : freshSourceBoundReceiptAdmissionState !== "ADMITTED_CURRENT"
        ? ("HOLD_FRESH_RECEIPT_ADMISSION" as const)
        : exactOwnerAcceptanceState !== "ACCEPTED_CURRENT"
          ? ("HOLD_MASTER_OWNER_ACCEPTANCE" as const)
          : ql422CorrelationState !== "VERIFIED_CORRELATED"
            ? ("HOLD_QL422_CORRELATION" as const)
            : ("READY_FOR_PROTECTED_ACTIVATION" as const);

  const blockers = [
    ...(runtimePrerequisiteState !== "VERIFIED_CURRENT"
      ? [
          "YW562 runtime prerequisites are not yet independently proven current: ordered YW553-562 schema dependencies, required tables, RLS, owner helper and protected summary must be source-signed and verified."
        ]
      : []),
    ...(sourceReceiptState !== "ACTIVE_CURRENT"
      ? [
          "A fresh exact YW562 source-bound HEALTHY receipt must be admitted and replay-correlated under the currently enrolled signer."
        ]
      : []),
    ...(freshSourceBoundReceiptAdmissionState !== "ADMITTED_CURRENT"
      ? [
          "Build 378 has not yet correlated the exact current YW562 receipt to current verified runtime-prerequisite evidence."
        ]
      : []),
    ...(exactOwnerAcceptanceState !== "ACCEPTED_CURRENT"
      ? [
          "The exact current YW562 receipt does not yet carry an explicit current Master owner ACCEPT."
        ]
      : []),
    ...(ql422CorrelationState !== "VERIFIED_CORRELATED"
      ? [
          "QL-422 original-host witness and three-Master ledger evidence is not yet independently admitted by a protected runtime authority for exact AI Hub 312, Comms QL-422, YW562 and Build 377 controller revisions."
        ]
      : [])
  ];

  return {
    schema: BUILD_378_SCHEMA,
    build: BUILD_378,
    controllerBaseRevision: BUILD_378_CONTROLLER_BASE_REVISION,
    runtime: BUILD_378_RUNTIME,
    requiredYwTables: BUILD_378_REQUIRED_YW_TABLES,
    activeSigner,
    latestRuntimePrerequisiteEvidence: latestPrerequisite,
    runtimePrerequisiteState,
    exactCurrentReceipt: exactReceipt,
    exactCurrentReceiptId: exactReceipt?.receiptId ?? null,
    exactReceiptAge: receiptAge,
    exactAdmission,
    exactReplay,
    sourceReceiptState,
    exactOwnerDecision,
    exactOwnerDecisionId: exactOwnerDecision?.decisionId ?? null,
    exactOwnerAcceptanceState,
    currentFreshReceiptAdmission: currentReceiptAdmission,
    freshSourceBoundReceiptAdmissionState,
    latestQl422Reference,
    latestProtectedQl422Correlation,
    latestQl422Correlation: effectiveQl422Correlation,
    ql422CorrelationState,
    protectedActivationReadinessState,
    protectedActivationReady:
      protectedActivationReadinessState === "READY_FOR_PROTECTED_ACTIVATION",
    connectionState: "DISCONNECTED_HOLD" as const,
    mastersSynced: false,
    blockers,
    policy: {
      sourceSignedRuntimePrerequisiteEvidenceRequired: true,
      runtimePrerequisiteFreshnessMinutes: 15,
      exactYw562ReceiptRequired: true,
      exactReceiptReplayRequired: true,
      exactMasterOwnerAcceptRequired: true,
      ql422OriginalHostMustBeReeServer: true,
      ql422ProtectedRuntimeAuthorityRequired: true,
      ql422FreshnessMinutes: 5,
      threeDistinctMasterReceiptsRequired: true,
      ownerReferenceMaySetQl422Verified: false,
      readinessMayActivateConnection: false,
      buildGreenMayActivateConnection: false,
      rawPrivateKeysAccepted: false,
      rawTransportSecretsAccepted: false
    }
  };
}

export type Build378RuntimeQl422ReadinessModel = ReturnType<
  typeof composeBuild378RuntimeQl422Readiness
>;
