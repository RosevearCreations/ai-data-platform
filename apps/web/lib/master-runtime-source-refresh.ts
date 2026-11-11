import {
  summarizeReceiptAge,
  type ConvergenceLedgerReceipt,
  type OwnerDecisionAuditEvent,
  type SignerRegistryEvent,
  type Source365Id
} from "./source-trust-ledger";
import type { HealthAdmissionEvent } from "./source-signer-enrollment";

export const MASTER_RUNTIME_RECHECK_BUILD = 368 as const;
export const MASTER_RUNTIME_RECHECK_SCHEMA =
  "rosevear.ai-data-platform.master-runtime-source-refresh-recheck.v1" as const;

export const BUILD_368_MASTER_SNAPSHOT = Object.freeze({
  controllerRevision: "ff7ac9aea87e6d2e1d9ebc8d29b2fd784f901f01",
  aiHub: {
    ack: "MASTER360-AIHUB-308-ACK",
    build: 308,
    main: "cefc2b8859e51ca29f0255f69f8361161f8a117d",
    dev: "4ab2284da9ad6644136d313d8760f0f8c7282a90",
    code: "GREEN",
    productionChecks: "6/6_SUCCESS",
    automationHost: "DESKTOP-AE894KC_ONLY",
    installedRelease: "HOLD",
    signedOneTest: "HOLD",
    commsReceiverAck: "HOLD",
    threeMasterReceipts: "HOLD",
    connection: "HOLD",
    mastersSynced: "HOLD",
    slaveGate: "HOLD"
  },
  comms: {
    ack: "MASTER360-COMMS-QL416-ACK",
    main: "95d5780f377c7e2fd3c357789cbc2566fcf03b6c",
    code: "GREEN",
    productionChecks: "7/7_SUCCESS",
    originalHostTelemetry: "HOLD",
    signedOneTest: "HOLD_RUNTIME_EVIDENCE",
    signerCustody: "HOLD",
    durableReplay: "CODE_READY_RUNTIME_HOLD",
    uptime: "UNKNOWN",
    ownerAcceptance: "HOLD",
    receiver: "OFF",
    connection: "HOLD",
    slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
  }
});

export const BUILD_368_SOURCE_SNAPSHOT = Object.freeze([
  {
    sourceId: "yw" as const,
    sourceAppId: "yard-workers",
    label: "Yard Workers",
    repository: "RosevearCreations/yw",
    productionMain: "443a4380fe3875cf632702474e94ce74309d3f14",
    observedManifestRevision: null as string | null,
    manifestMode: "DEPLOYMENT_BOUND" as const,
    sourceRole: "platform_shell",
    handoffToken: "MASTER368-YW-SOURCE-REFRESH"
  },
  {
    sourceId: "icamp" as const,
    sourceAppId: "icamp",
    label: "iCamp",
    repository: "RosevearCreations/iCamp",
    productionMain: "1f29c23f5fba7c2326e09873ebff42223622044b",
    observedManifestRevision: "e2d343595363ca9106e7f1dbc60006e3a6c616aa",
    manifestMode: "STATIC" as const,
    sourceRole: "platform_shell",
    handoffToken: "MASTER368-ICAMP-RECONVERGE-REFRESH"
  }
] as const);

type SourceSnapshot = (typeof BUILD_368_SOURCE_SNAPSHOT)[number];

function activeSigners(sourceId: Source365Id, events: readonly SignerRegistryEvent[]) {
  const latest = new Map<string, SignerRegistryEvent>();
  for (const event of [...events].sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt))) {
    if (event.sourceId === sourceId) latest.set(event.keyId,event);
  }
  return [...latest.values()].filter((event)=>event.eventType === "ENROLLED");
}

export function composeBuild368RuntimeRecheck(input: {
  signerEvents?: readonly SignerRegistryEvent[];
  receipts?: readonly ConvergenceLedgerReceipt[];
  admissionEvents?: readonly HealthAdmissionEvent[];
  ownerDecisions?: readonly OwnerDecisionAuditEvent[];
  now?: Date;
  sources?: readonly SourceSnapshot[];
} = {}) {
  const now = input.now ?? new Date();
  const signerEvents = input.signerEvents ?? [];
  const receipts = input.receipts ?? [];
  const admissionEvents = input.admissionEvents ?? [];
  const ownerDecisions = input.ownerDecisions ?? [];
  const sources = input.sources ?? BUILD_368_SOURCE_SNAPSHOT;

  const masterChecks = [
    ["aihub-installed-release", BUILD_368_MASTER_SNAPSHOT.aiHub.installedRelease, "VERIFIED"],
    ["aihub-signed-one-test", BUILD_368_MASTER_SNAPSHOT.aiHub.signedOneTest, "VERIFIED"],
    ["aihub-comms-receiver-ack", BUILD_368_MASTER_SNAPSHOT.aiHub.commsReceiverAck, "VERIFIED"],
    ["aihub-three-master-receipts", BUILD_368_MASTER_SNAPSHOT.aiHub.threeMasterReceipts, "VERIFIED"],
    ["comms-original-host-telemetry", BUILD_368_MASTER_SNAPSHOT.comms.originalHostTelemetry, "VERIFIED"],
    ["comms-signed-one-test", BUILD_368_MASTER_SNAPSHOT.comms.signedOneTest, "VERIFIED"],
    ["comms-signer-custody", BUILD_368_MASTER_SNAPSHOT.comms.signerCustody, "VERIFIED"],
    ["comms-durable-replay", BUILD_368_MASTER_SNAPSHOT.comms.durableReplay, "VERIFIED"],
    ["comms-uptime", BUILD_368_MASTER_SNAPSHOT.comms.uptime, "VERIFIED"],
    ["comms-owner-acceptance", BUILD_368_MASTER_SNAPSHOT.comms.ownerAcceptance, "ACCEPTED"]
  ].map(([id,observed,required])=>({
    id:String(id), observed:String(observed), required:String(required),
    verified:String(observed)===String(required)
  }));
  const masterBlockers = masterChecks.filter((item)=>!item.verified);
  const masterGateOpen =
    BUILD_368_MASTER_SNAPSHOT.aiHub.code === "GREEN" &&
    BUILD_368_MASTER_SNAPSHOT.comms.code === "GREEN" &&
    BUILD_368_MASTER_SNAPSHOT.aiHub.automationHost === "DESKTOP-AE894KC_ONLY" &&
    masterBlockers.length === 0;

  const sourceModels = sources.map((source)=>{
    const signers = activeSigners(source.sourceId, signerEvents);
    const signerState =
      signers.length === 0 ? "HOLD_UNENROLLED" as const :
      signers.length === 1 ? "TRUSTED_SIGNER_ENROLLED" as const :
      "HOLD_AMBIGUOUS" as const;

    const revisionCurrent =
      source.manifestMode === "DEPLOYMENT_BOUND"
        ? true
        : source.observedManifestRevision === source.productionMain;
    const revisionState = revisionCurrent
      ? "VERIFIED_CURRENT" as const
      : source.observedManifestRevision
        ? "HOLD_MANIFEST_STALE" as const
        : "HOLD_MANIFEST_UNVERIFIED" as const;

    const latestReceipt =
      receipts.filter((r)=>r.sourceId===source.sourceId)
        .sort((a,b)=>b.verifiedAt.localeCompare(a.verifiedAt))[0] ?? null;
    const receiptAge = latestReceipt ? summarizeReceiptAge(latestReceipt, now) : "NOT_RECEIVED" as const;
    const latestAdmission =
      admissionEvents.filter((e)=>e.sourceId===source.sourceId)
        .sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;
    const receiptRevisionCurrent =
      latestReceipt?.sourceRevision === source.productionMain &&
      latestReceipt?.manifestRevision === source.productionMain;
    const admissionCurrent =
      latestReceipt !== null &&
      latestAdmission?.outcome === "ADMITTED" &&
      latestAdmission.receiptId === latestReceipt.receiptId;
    const receiptState = !latestReceipt
      ? "HOLD_NOT_RECEIVED" as const
      : !receiptRevisionCurrent
        ? "HOLD_REVISION_MISMATCH" as const
        : receiptAge !== "CURRENT"
          ? "HOLD_STALE" as const
          : !admissionCurrent
            ? "HOLD_NOT_ADMITTED" as const
            : "VERIFIED_CURRENT" as const;

    const latestDecision =
      ownerDecisions.filter((d)=>d.sourceId===source.sourceId)
        .sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))[0] ?? null;

    const requestedAction =
      !revisionCurrent ? "RECONVERGE_MANIFEST_AND_REFRESH_RECEIPT" as const :
      signerState !== "TRUSTED_SIGNER_ENROLLED" ? "REFRESH_SIGNER_AND_RECEIPT" as const :
      receiptState !== "VERIFIED_CURRENT" ? "REFRESH_RECEIPT" as const :
      "NO_REFRESH_REQUIRED" as const;

    const blockers = [
      ...(!revisionCurrent ? [`${source.label}: manifest must be re-converged to ${source.productionMain}.`] : []),
      ...(signerState !== "TRUSTED_SIGNER_ENROLLED" ? [`${source.label}: independent Ed25519 signer is not enrolled.`] : []),
      ...(receiptState !== "VERIFIED_CURRENT" ? [`${source.label}: a fresh admitted signed HEALTHY receipt for ${source.productionMain} is required.`] : []),
      ...(!masterGateOpen ? ["Three-Master runtime evidence gate remains HOLD."] : [])
    ];
    const sourceEvidenceState =
      revisionCurrent && signerState === "TRUSTED_SIGNER_ENROLLED" && receiptState === "VERIFIED_CURRENT"
        ? "READY" as const : "HOLD" as const;
    const acceptanceState =
      sourceEvidenceState === "READY" && masterGateOpen
        ? "READY_FOR_OWNER_REVIEW" as const : "HOLD" as const;

    return {
      ...source,
      revisionState,
      signerState,
      activeSignerKeyId: signers.length===1 ? signers[0].keyId : null,
      latestReceipt,
      latestAdmission,
      receiptAge,
      receiptState,
      requestedAction,
      sourceEvidenceState,
      acceptanceState,
      blockers,
      latestOwnerDecision: latestDecision?.decision ?? "PENDING"
    };
  });

  return {
    schema: MASTER_RUNTIME_RECHECK_SCHEMA,
    build: MASTER_RUNTIME_RECHECK_BUILD,
    master: {
      snapshot: BUILD_368_MASTER_SNAPSHOT,
      checks: masterChecks,
      blockers: masterBlockers,
      gateState: masterGateOpen ? "OPEN" as const : "HOLD" as const
    },
    sources: sourceModels,
    summary: {
      masterGateOpen,
      sourceEvidenceReady: sourceModels.filter((s)=>s.sourceEvidenceState==="READY").length,
      readyForOwnerReview: sourceModels.filter((s)=>s.acceptanceState==="READY_FOR_OWNER_REVIEW").length,
      closureState: sourceModels.every((s)=>s.acceptanceState==="READY_FOR_OWNER_REVIEW")
        ? "READY_FOR_SUPERVISED_ACCEPTANCE_RECHECK" as const
        : "HOLD" as const
    },
    policy: {
      controllerMayRewriteSourceManifest: false,
      controllerMayCreateSourcePrivateKey: false,
      codeGreenIsRuntimeProof: false,
      holdMayAutoRelease: false,
      receiptMustMatchExactCurrentRevision: true,
      staleReceiptMayAuthorizeAcceptance: false,
      masterGateRequired: true,
      ownerDecisionStillExplicit: true,
      childTenantMayBecomeSourceIdentity: false
    }
  };
}
