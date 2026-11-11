import {
  summarizeReceiptAge,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent,
  type Source365Id
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";
import { BUILD_368_MASTER_SNAPSHOT } from "./master-runtime-source-refresh";

export const SOURCE_REFRESH_INTAKE_BUILD = 369 as const;
export const SOURCE_REFRESH_INTAKE_SCHEMA =
  "rosevear.ai-data-platform.source-refresh-three-master-recheck.v1" as const;

export const BUILD_369_CONTROLLER_BASE_REVISION =
  "afe35207c74825722e064201ce1ab7e0b9228c01" as const;

export const BUILD_369_SOURCE_BASELINES = Object.freeze([
  {
    sourceId: "yw" as const,
    sourceAppId: "yard-workers",
    label: "Yard Workers",
    repository: "RosevearCreations/yw",
    productionMain: "2c7234c975528a3a3ab76ca22829c8b4a541de97",
    checkedInManifestRevision: null as string | null,
    manifestBinding: "BUILD_TIME_VERCEL_GIT_COMMIT_SHA" as const,
    tenantBoundary: "platform_shell" as const,
    previousHandoffToken: "MASTER368-YW-SOURCE-REFRESH",
    nextHandoffToken: "MASTER369-YW-SOURCE-REFRESH-EVIDENCE",
    repositoryEvidence:
      "docs/YW560_PROTECTED_FOLLOWUP_DELIVERY_AND_REOPEN.txt",
    repositoryManifestState:
      "DEPLOYMENT_BOUND_UNSIGNED_AWAITING_INDEPENDENT_SOURCE_SIGNER"
  },
  {
    sourceId: "icamp" as const,
    sourceAppId: "icamp",
    label: "iCamp",
    repository: "RosevearCreations/iCamp",
    productionMain: "69d46513b45e340a4e295165abbd3d99b3a62274",
    checkedInManifestRevision: "1f29c23f5fba7c2326e09873ebff42223622044b",
    manifestBinding: "BUILD_TIME_VERCEL_GIT_COMMIT_SHA" as const,
    tenantBoundary: "platform_shell" as const,
    previousHandoffToken: "MASTER368-ICAMP-RECONVERGE-REFRESH",
    nextHandoffToken: "MASTER369-ICAMP-RECONVERGENCE-EVIDENCE",
    repositoryEvidence:
      "docs/builds/BUILD244_SUPERVISOR_WORKLOAD_FIELD_CLOSURE_OWNER_REPORTING.md",
    repositoryManifestState:
      "BASELINE_REFRESHED_TO_BUILD243_DEPLOYED_BUILD244_CONFIRMATION_REQUIRED"
  }
] as const);

export type Build369SourceBaseline = {
  sourceId: Source365Id;
  sourceAppId: string;
  label: string;
  repository: string;
  productionMain: string;
  checkedInManifestRevision: string | null;
  manifestBinding: "BUILD_TIME_VERCEL_GIT_COMMIT_SHA";
  tenantBoundary: "platform_shell";
  previousHandoffToken: string;
  nextHandoffToken: string;
  repositoryEvidence: string;
  repositoryManifestState: string;
};

export type SourceRefreshEvidenceEvent = {
  evidenceEventId: string;
  sourceId: Source365Id;
  handoffToken: string;
  sourceProductionRevision: string;
  manifestBaselineRevision: string | null;
  deployedManifestRevision: string | null;
  manifestConfirmationState:
    | "CONFIRMED_EXACT"
    | "HOLD_DEPLOYED_CONFIRMATION_REQUIRED"
    | "HOLD_STALE"
    | "HOLD_UNVERIFIED";
  tenantBoundary: "platform_shell";
  signerState:
    | "TRUSTED_SIGNER_ENROLLED"
    | "HOLD_UNENROLLED"
    | "HOLD_AMBIGUOUS";
  receiptId: string | null;
  receiptState:
    | "VERIFIED_CURRENT"
    | "HOLD_NOT_RECEIVED"
    | "HOLD_STALE"
    | "HOLD_REVISION_MISMATCH"
    | "HOLD_NOT_ADMITTED";
  durableReplayState: "VERIFIED" | "CODE_READY_RUNTIME_HOLD" | "HOLD";
  evidenceURI: string;
  evidenceDigest: string | null;
  sanitizedAck: string;
  blockers: string[];
  receivedAt: string;
  recordedAt: string;
};

function activeSigners(sourceId: Source365Id, events: readonly SignerRegistryEvent[]) {
  const latest = new Map<string, SignerRegistryEvent>();
  for (const event of [...events].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  )) {
    if (event.sourceId === sourceId) latest.set(event.keyId, event);
  }
  return [...latest.values()].filter((event) => event.eventType === "ENROLLED");
}

function masterGate() {
  const checks = [
    ["aihub-installed-release", BUILD_368_MASTER_SNAPSHOT.aiHub.installedRelease, "VERIFIED"],
    ["aihub-signed-one-test", BUILD_368_MASTER_SNAPSHOT.aiHub.signedOneTest, "VERIFIED"],
    ["aihub-comms-receiver-ack", BUILD_368_MASTER_SNAPSHOT.aiHub.commsReceiverAck, "VERIFIED"],
    ["aihub-three-master-receipts", BUILD_368_MASTER_SNAPSHOT.aiHub.threeMasterReceipts, "VERIFIED"],
    ["aihub-connection", BUILD_368_MASTER_SNAPSHOT.aiHub.connection, "CONNECTED"],
    ["aihub-masters-synced", BUILD_368_MASTER_SNAPSHOT.aiHub.mastersSynced, "SYNCED"],
    ["aihub-slave-gate", BUILD_368_MASTER_SNAPSHOT.aiHub.slaveGate, "OPEN"],
    ["comms-original-host-telemetry", BUILD_368_MASTER_SNAPSHOT.comms.originalHostTelemetry, "VERIFIED"],
    ["comms-signed-one-test", BUILD_368_MASTER_SNAPSHOT.comms.signedOneTest, "VERIFIED"],
    ["comms-signer-custody", BUILD_368_MASTER_SNAPSHOT.comms.signerCustody, "VERIFIED"],
    ["comms-durable-replay", BUILD_368_MASTER_SNAPSHOT.comms.durableReplay, "VERIFIED"],
    ["comms-uptime", BUILD_368_MASTER_SNAPSHOT.comms.uptime, "VERIFIED"],
    ["comms-owner-acceptance", BUILD_368_MASTER_SNAPSHOT.comms.ownerAcceptance, "ACCEPTED"],
    ["comms-receiver", BUILD_368_MASTER_SNAPSHOT.comms.receiver, "ON"],
    ["comms-connection", BUILD_368_MASTER_SNAPSHOT.comms.connection, "CONNECTED"],
    ["comms-slave-gate", BUILD_368_MASTER_SNAPSHOT.comms.slaveGate, "OPEN"]
  ].map(([id, observed, required]) => ({
    id: String(id),
    observed: String(observed),
    required: String(required),
    verified: String(observed) === String(required)
  }));
  const blockers = checks.filter((check) => !check.verified);
  return {
    snapshot: BUILD_368_MASTER_SNAPSHOT,
    checks,
    blockers,
    gateState:
      BUILD_368_MASTER_SNAPSHOT.aiHub.code === "GREEN" &&
      BUILD_368_MASTER_SNAPSHOT.comms.code === "GREEN" &&
      BUILD_368_MASTER_SNAPSHOT.aiHub.automationHost === "DESKTOP-AE894KC_ONLY" &&
      blockers.length === 0
        ? ("OPEN" as const)
        : ("HOLD" as const)
  };
}

export function composeBuild369SourceRefreshIntake(input: {
  signerEvents?: readonly SignerRegistryEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  refreshEvidenceEvents?: readonly SourceRefreshEvidenceEvent[];
  now?: Date;
  sources?: readonly Build369SourceBaseline[];
} = {}) {
  const now = input.now ?? new Date();
  const signerEvents = input.signerEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const refreshEvidenceEvents = input.refreshEvidenceEvents ?? [];
  const sources =
    input.sources ?? (BUILD_369_SOURCE_BASELINES as readonly Build369SourceBaseline[]);
  const master = masterGate();

  const sourceModels = sources.map((source) => {
    const sourceEvidence =
      refreshEvidenceEvents
        .filter((event) => event.sourceId === source.sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

    const signers = activeSigners(source.sourceId, signerEvents);
    const signerState =
      signers.length === 0
        ? ("HOLD_UNENROLLED" as const)
        : signers.length === 1
          ? ("TRUSTED_SIGNER_ENROLLED" as const)
          : ("HOLD_AMBIGUOUS" as const);

    const latestReceipt =
      receipts
        .filter((receipt) => receipt.sourceId === source.sourceId)
        .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt))[0] ?? null;
    const latestAdmission =
      admissionEvents
        .filter((event) => event.sourceId === source.sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
    const receiptAge = latestReceipt
      ? summarizeReceiptAge(latestReceipt, now)
      : ("NOT_RECEIVED" as const);

    const receiptRevisionCurrent =
      latestReceipt?.sourceRevision === source.productionMain &&
      latestReceipt?.manifestRevision === source.productionMain;
    const admissionCurrent =
      latestReceipt !== null &&
      latestAdmission?.outcome === "ADMITTED" &&
      latestAdmission.receiptId === latestReceipt.receiptId;
    const receiptState = !latestReceipt
      ? ("HOLD_NOT_RECEIVED" as const)
      : !receiptRevisionCurrent
        ? ("HOLD_REVISION_MISMATCH" as const)
        : receiptAge !== "CURRENT"
          ? ("HOLD_STALE" as const)
          : !admissionCurrent
            ? ("HOLD_NOT_ADMITTED" as const)
            : ("VERIFIED_CURRENT" as const);

    const manifestConfirmationState =
      sourceEvidence?.sourceProductionRevision === source.productionMain &&
      sourceEvidence.deployedManifestRevision === source.productionMain &&
      sourceEvidence.manifestConfirmationState === "CONFIRMED_EXACT" &&
      sourceEvidence.tenantBoundary === "platform_shell"
        ? ("CONFIRMED_EXACT" as const)
        : sourceEvidence?.deployedManifestRevision &&
            sourceEvidence.deployedManifestRevision !== source.productionMain
          ? ("HOLD_STALE" as const)
          : ("HOLD_DEPLOYED_CONFIRMATION_REQUIRED" as const);

    const durableReplayState =
      sourceEvidence?.sourceProductionRevision === source.productionMain
        ? sourceEvidence.durableReplayState
        : ("HOLD" as const);

    const sourceRefreshCurrent =
      sourceEvidence !== null &&
      sourceEvidence.sourceProductionRevision === source.productionMain &&
      sourceEvidence.handoffToken === source.previousHandoffToken;

    const latestDecision =
      ownerDecisions
        .filter((decision) => decision.sourceId === source.sourceId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

    const blockers = [
      ...(!sourceRefreshCurrent
        ? [`${source.label}: Build 368 source refresh evidence for current production ${source.productionMain} has not been received.`]
        : []),
      ...(manifestConfirmationState !== "CONFIRMED_EXACT"
        ? [`${source.label}: exact deployed manifest revision ${source.productionMain} still requires independent confirmation.`]
        : []),
      ...(signerState !== "TRUSTED_SIGNER_ENROLLED"
        ? [`${source.label}: independent Ed25519 source signer remains unenrolled.`]
        : []),
      ...(receiptState !== "VERIFIED_CURRENT"
        ? [`${source.label}: fresh admitted signed HEALTHY receipt for ${source.productionMain} is not verified.`]
        : []),
      ...(durableReplayState !== "VERIFIED"
        ? [`${source.label}: durable replay evidence remains unverified.`]
        : []),
      ...(master.gateState !== "OPEN"
        ? ["Three-Master acceptance gate remains HOLD."]
        : [])
    ];

    const sourceEvidenceState =
      sourceRefreshCurrent &&
      manifestConfirmationState === "CONFIRMED_EXACT" &&
      signerState === "TRUSTED_SIGNER_ENROLLED" &&
      receiptState === "VERIFIED_CURRENT" &&
      durableReplayState === "VERIFIED"
        ? ("READY" as const)
        : ("HOLD" as const);

    return {
      ...source,
      sourceRefreshCurrent,
      sourceEvidence,
      manifestConfirmationState,
      signerState,
      activeSignerKeyId: signers.length === 1 ? signers[0].keyId : null,
      latestReceipt,
      latestAdmission,
      receiptAge,
      receiptState,
      durableReplayState,
      sourceEvidenceState,
      threeMasterGateState: master.gateState,
      acceptanceState:
        sourceEvidenceState === "READY" && master.gateState === "OPEN"
          ? ("READY_FOR_OWNER_REVIEW" as const)
          : ("HOLD" as const),
      blockers,
      latestOwnerDecision: latestDecision?.decision ?? "PENDING"
    };
  });

  return {
    schema: SOURCE_REFRESH_INTAKE_SCHEMA,
    build: SOURCE_REFRESH_INTAKE_BUILD,
    controllerBaseRevision: BUILD_369_CONTROLLER_BASE_REVISION,
    master,
    sources: sourceModels,
    summary: {
      manifestConfirmations: sourceModels.filter(
        (source) => source.manifestConfirmationState === "CONFIRMED_EXACT"
      ).length,
      freshSignedHealth: sourceModels.filter(
        (source) => source.receiptState === "VERIFIED_CURRENT"
      ).length,
      durableReplayVerified: sourceModels.filter(
        (source) => source.durableReplayState === "VERIFIED"
      ).length,
      sourceEvidenceReady: sourceModels.filter(
        (source) => source.sourceEvidenceState === "READY"
      ).length,
      readyForOwnerReview: sourceModels.filter(
        (source) => source.acceptanceState === "READY_FOR_OWNER_REVIEW"
      ).length,
      threeMasterGate: master.gateState
    },
    policy: {
      controllerMayRewriteSourceManifest: false,
      controllerMayGenerateSourcePrivateKey: false,
      repositoryDocumentationIsNotRuntimeReceipt: true,
      deployedManifestRequiresIndependentConfirmation: true,
      signedHealthMustUseTrustedSigner: true,
      signedHealthMustMatchExactCurrentProductionRevision: true,
      durableReplayRequired: true,
      codeGreenIsRuntimeEvidence: false,
      threeMasterGateMustOpen: true,
      ownerAcceptanceRemainsExplicit: true,
      childTenantMayBecomeSourceIdentity: false
    }
  };
}

export type Build369SourceRefreshModel = ReturnType<
  typeof composeBuild369SourceRefreshIntake
>;
