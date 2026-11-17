import {
  BUILD_411_WINDOWS_SERVICE_IDS,
  type Build411WindowsServiceId
} from "./master-privileged-operations-server-custody";

export const BUILD_416 = 416 as const;
export const BUILD_416_SCHEMA =
  "rosevear.ai-data-platform.build416-original-host-continuity.v1" as const;
export const BUILD_416_ORIGINAL_HOST = "DESKTOP-AE894KC" as const;
export const BUILD_416_READ_ONLY_SINK =
  "/internal/rosevear/master/events/read-only/v1" as const;

export const BUILD_416_SOURCE_REVIEW = Object.freeze({
  hubMainSha: "793faaed8498bc649ae9b48788474ae715675697",
  hubPr804Merged: true,
  hubOutboundClientContract: "IMPLEMENTED" as const,
  hubWorkerScmInstaller: "NOT_IMPLEMENTED" as const,
  hubUnattendedTaskInstaller: "IMPLEMENTED_TASKS_ONLY" as const,
  aiDataMainSha: "319b718950ff48e5a8ca28fd82d03d2e56bf74ad",
  aiDataSinkRoute: "NOT_IMPLEMENTED" as const,
  aiDataWorkerScmInstaller: "NOT_IMPLEMENTED" as const,
  commsMainSha: "904f1480d349b6ee508fd11221063d28cc35342e",
  commsSinkRoute: "NOT_IMPLEMENTED" as const,
  commsWorkerScmInstaller: "NOT_IMPLEMENTED" as const
});

export const BUILD_416_SERVICE_POLICIES = Object.freeze({
  "rosevear-ai-hub-automation-host": {
    scmServiceName: "Rosevear-AIHub",
    requiredStartupMode: "AUTOMATIC"
  },
  "rosevear-ai-data-platform-worker": {
    scmServiceName: "Rosevear-AIDataPlatform",
    requiredStartupMode: "AUTOMATIC"
  },
  "rosevear-comms-hub-worker": {
    scmServiceName: "Rosevear-CommsHub",
    requiredStartupMode: "AUTOMATIC"
  }
} satisfies Record<
  Build411WindowsServiceId,
  { scmServiceName: string; requiredStartupMode: "AUTOMATIC" }
>);

export type Build416PeerId = "ai-data-platform" | "rosevear-comms-hub";

export type Build416HostBootWitnessReceipt = {
  receiptId: string;
  serviceId: Build411WindowsServiceId;
  hostId: typeof BUILD_416_ORIGINAL_HOST;
  scmServiceName: string;
  observedSourceRevision: string;
  installerArtifactDigest: string;
  executableDigest: string;
  serviceAccountIdentityDigest: string;
  preBootEvidenceDigest: string;
  postBootEvidenceDigest: string;
  bootSessionId: string;
  serviceInstalled: boolean;
  startupMode: "AUTOMATIC" | "MANUAL" | "DISABLED" | "UNKNOWN";
  recoveryPolicyVerified: boolean;
  unattendedStartBeforeLoginVerified: boolean;
  postBootRunningVerified: boolean;
  noManualInterventionObserved: boolean;
  tenMinuteContinuityVerified: boolean;
  continuous24HoursVerified: boolean;
  rollbackToPriorConfigurationVerified: boolean;
  ownerStartupModeApproved: boolean;
  ownerApprovalReceiptDigest: string;
  independentCustodianReceiptDigest: string;
  independentWitnessReceiptDigest: string;
  observedAt: string;
  expiresAt: string;
  state: "VERIFIED" | "HOLD" | "FAILED";
};

export type Build416PeerAckReceipt = {
  receiptId: string;
  peerId: Build416PeerId;
  route: typeof BUILD_416_READ_ONLY_SINK;
  routeImplemented: boolean;
  protocolVersion: "1.1";
  mtlsClientCertificateEnrolled: boolean;
  mtlsHandshakeVerified: boolean;
  serverLeafPinVerified: boolean;
  peerSignerEnrolled: boolean;
  signedAckVerified: boolean;
  ackDisposition: "RECEIVED" | "HOLD" | "REJECTED";
  eventDigest: string;
  ackDigest: string;
  transportEvidenceDigest: string;
  replayProtectionVerified: boolean;
  noCommandSink: boolean;
  receiptOnlySink: boolean;
  sourceAuthorityPreserved: boolean;
  directPeerDatabaseWrite: boolean;
  observedAt: string;
  expiresAt: string;
  independentlyVerified: boolean;
  state: "VERIFIED" | "HOLD" | "FAILED";
};

export type Build416CertificateRotationReceipt = {
  receiptId: string;
  peerId: Build416PeerId;
  ownerPlanDigest: string;
  previousLeafPinDigest: string;
  candidateLeafPinDigest: string;
  overlapHours: number;
  candidateHandshakeVerified: boolean;
  peerReenrolled: boolean;
  freshSignedAckUnderCandidateVerified: boolean;
  previousCredentialRetainedDuringOverlap: boolean;
  oldCredentialRetiredAfterAcceptance: boolean;
  rollbackReadyDuringOverlap: boolean;
  automaticActivationAuthorized: boolean;
  observedAt: string;
  expiresAt: string;
  independentlyVerified: boolean;
  state: "COMPLETED" | "HOLD" | "FAILED";
};

function digest(value: string) {
  return /^sha256:[a-f0-9]{64}$/.test(value);
}
function revision(value: string) {
  return /^[a-f0-9]{40}$/.test(value);
}
function fresh(expiresAt: string, nowMs: number) {
  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) && expires > nowMs;
}
function latestByKey<T>(items: readonly T[], key: (item:T)=>string, observed: (item:T)=>string) {
  const sorted = [...items].sort((a,b)=>observed(b).localeCompare(observed(a)));
  const map = new Map<string,T>();
  for (const item of sorted) {
    const k=key(item);
    if (!map.has(k)) map.set(k,item);
  }
  return map;
}

export function validateBuild416HostReceipt(
  item: Build416HostBootWitnessReceipt,
  nowIso: string
) {
  const policy = BUILD_416_SERVICE_POLICIES[item.serviceId];
  const now = Date.parse(nowIso);
  return Boolean(
    policy &&
    item.hostId === BUILD_416_ORIGINAL_HOST &&
    item.scmServiceName === policy.scmServiceName &&
    item.startupMode === policy.requiredStartupMode &&
    revision(item.observedSourceRevision) &&
    digest(item.installerArtifactDigest) &&
    digest(item.executableDigest) &&
    digest(item.serviceAccountIdentityDigest) &&
    digest(item.preBootEvidenceDigest) &&
    digest(item.postBootEvidenceDigest) &&
    item.preBootEvidenceDigest !== item.postBootEvidenceDigest &&
    item.bootSessionId.length >= 12 &&
    item.serviceInstalled &&
    item.recoveryPolicyVerified &&
    item.unattendedStartBeforeLoginVerified &&
    item.postBootRunningVerified &&
    item.noManualInterventionObserved &&
    item.tenMinuteContinuityVerified &&
    item.continuous24HoursVerified &&
    item.rollbackToPriorConfigurationVerified &&
    item.ownerStartupModeApproved &&
    digest(item.ownerApprovalReceiptDigest) &&
    digest(item.independentCustodianReceiptDigest) &&
    digest(item.independentWitnessReceiptDigest) &&
    new Set([
      item.ownerApprovalReceiptDigest,
      item.independentCustodianReceiptDigest,
      item.independentWitnessReceiptDigest
    ]).size === 3 &&
    fresh(item.expiresAt,now) &&
    item.state === "VERIFIED"
  );
}

export function validateBuild416PeerAck(
  item: Build416PeerAckReceipt,
  nowIso: string
) {
  const now=Date.parse(nowIso);
  return Boolean(
    item.route === BUILD_416_READ_ONLY_SINK &&
    item.routeImplemented &&
    item.protocolVersion === "1.1" &&
    item.mtlsClientCertificateEnrolled &&
    item.mtlsHandshakeVerified &&
    item.serverLeafPinVerified &&
    item.peerSignerEnrolled &&
    item.signedAckVerified &&
    item.ackDisposition === "RECEIVED" &&
    digest(item.eventDigest) &&
    digest(item.ackDigest) &&
    digest(item.transportEvidenceDigest) &&
    item.eventDigest !== item.ackDigest &&
    item.replayProtectionVerified &&
    item.noCommandSink &&
    item.receiptOnlySink &&
    item.sourceAuthorityPreserved &&
    item.directPeerDatabaseWrite === false &&
    fresh(item.expiresAt,now) &&
    item.independentlyVerified &&
    item.state === "VERIFIED"
  );
}

export function validateBuild416Rotation(
  item: Build416CertificateRotationReceipt,
  nowIso: string
) {
  const now=Date.parse(nowIso);
  return Boolean(
    digest(item.ownerPlanDigest) &&
    digest(item.previousLeafPinDigest) &&
    digest(item.candidateLeafPinDigest) &&
    item.previousLeafPinDigest !== item.candidateLeafPinDigest &&
    Number.isFinite(item.overlapHours) &&
    item.overlapHours >= 0 &&
    item.overlapHours <= 24 &&
    item.candidateHandshakeVerified &&
    item.peerReenrolled &&
    item.freshSignedAckUnderCandidateVerified &&
    item.previousCredentialRetainedDuringOverlap &&
    item.oldCredentialRetiredAfterAcceptance &&
    item.rollbackReadyDuringOverlap &&
    item.automaticActivationAuthorized === false &&
    fresh(item.expiresAt,now) &&
    item.independentlyVerified &&
    item.state === "COMPLETED"
  );
}

export function evaluateBuild416OriginalHostContinuity(input: {
  build415SoftwareReleasePresent: boolean;
  hostReceipts?: readonly Build416HostBootWitnessReceipt[];
  peerAckReceipts?: readonly Build416PeerAckReceipt[];
  rotationReceipts?: readonly Build416CertificateRotationReceipt[];
  nowIso: string;
}) {
  const hostByService=latestByKey(
    input.hostReceipts ?? [],
    item=>item.serviceId,
    item=>item.observedAt
  );
  const ackByPeer=latestByKey(
    input.peerAckReceipts ?? [],
    item=>item.peerId,
    item=>item.observedAt
  );
  const rotationByPeer=latestByKey(
    input.rotationReceipts ?? [],
    item=>item.peerId,
    item=>item.observedAt
  );

  const missingHostReceipts=BUILD_411_WINDOWS_SERVICE_IDS.filter(
    serviceId=>!hostByService.has(serviceId)
  );
  const invalidHostReceipts=BUILD_411_WINDOWS_SERVICE_IDS.filter(serviceId=>{
    const item=hostByService.get(serviceId);
    return Boolean(item && !validateBuild416HostReceipt(item,input.nowIso));
  });

  const peers: Build416PeerId[]=["ai-data-platform","rosevear-comms-hub"];
  const missingPeerAcks=peers.filter(peerId=>!ackByPeer.has(peerId));
  const invalidPeerAcks=peers.filter(peerId=>{
    const item=ackByPeer.get(peerId);
    return Boolean(item && !validateBuild416PeerAck(item,input.nowIso));
  });
  const invalidRotations=peers.filter(peerId=>{
    const item=rotationByPeer.get(peerId);
    return Boolean(item && !validateBuild416Rotation(item,input.nowIso));
  });

  const currentSourceGaps=[
    ...(BUILD_416_SOURCE_REVIEW.aiDataSinkRoute === "NOT_IMPLEMENTED"
      ? ["AI_DATA_READ_ONLY_SINK_NOT_IMPLEMENTED"] : []),
    ...(BUILD_416_SOURCE_REVIEW.commsSinkRoute === "NOT_IMPLEMENTED"
      ? ["COMMS_READ_ONLY_SINK_NOT_IMPLEMENTED"] : []),
    ...(BUILD_416_SOURCE_REVIEW.aiDataWorkerScmInstaller === "NOT_IMPLEMENTED"
      ? ["AI_DATA_WINDOWS_WORKER_INSTALLER_NOT_IMPLEMENTED"] : []),
    ...(BUILD_416_SOURCE_REVIEW.commsWorkerScmInstaller === "NOT_IMPLEMENTED"
      ? ["COMMS_WINDOWS_WORKER_INSTALLER_NOT_IMPLEMENTED"] : []),
    ...(BUILD_416_SOURCE_REVIEW.hubWorkerScmInstaller === "NOT_IMPLEMENTED"
      ? ["HUB_WINDOWS_SCM_SERVICE_INSTALLER_NOT_IMPLEMENTED"] : [])
  ];

  const governanceState =
    !input.build415SoftwareReleasePresent
      ? ("HOLD_BUILD415_SOFTWARE_RELEASE_REQUIRED" as const)
      : currentSourceGaps.length
        ? ("HOLD_CURRENT_SOURCE_GAPS_NOT_IMPLEMENTED" as const)
        : missingHostReceipts.length
          ? ("HOLD_ORIGINAL_HOST_BOOT_WITNESS_REQUIRED" as const)
          : invalidHostReceipts.length
            ? ("HOLD_ORIGINAL_HOST_BOOT_WITNESS_INVALID" as const)
            : missingPeerAcks.length
              ? ("HOLD_INDEPENDENT_SIGNED_PEER_ACK_REQUIRED" as const)
              : invalidPeerAcks.length
                ? ("HOLD_INDEPENDENT_SIGNED_PEER_ACK_INVALID" as const)
                : invalidRotations.length
                  ? ("HOLD_CERTIFICATE_ROTATION_REENROLLMENT_INVALID" as const)
                  : ("ORIGINAL_HOST_CONTINUITY_AND_PEER_ACK_VERIFIED" as const);

  return {
    schema:BUILD_416_SCHEMA,
    build:BUILD_416,
    governanceState,
    sourceReview:BUILD_416_SOURCE_REVIEW,
    currentSourceGaps,
    missingHostReceipts,
    invalidHostReceipts,
    missingPeerAcks,
    invalidPeerAcks,
    invalidRotations,
    counts:{
      services:BUILD_411_WINDOWS_SERVICE_IDS.length,
      requiredPeerAcks:peers.length,
      hostReceiptsPresent:hostByService.size,
      peerAcksPresent:ackByPeer.size,
      rotationReceiptsPresent:rotationByPeer.size
    },
    policy:{
      originalHost:BUILD_416_ORIGINAL_HOST,
      readOnlySinkPath:BUILD_416_READ_ONLY_SINK,
      requiredStartupMode:"AUTOMATIC" as const,
      startupModeMustBeOwnerApprovedAndObserved:true,
      physicalAcceptanceRequiresBootWitness:true,
      physicalAcceptanceRequiresIndependentPeerAck:true,
      continuityHoursRequired:24,
      certificateRotationOverlapHoursMax:24,
      previousCredentialRetainedDuringOverlap:true,
      reEnrollmentAndFreshAckRequiredBeforeOldCredentialRetirement:true,
      rollbackRequired:true,
      cloudGreenImpliesWindowsAcceptance:false,
      sourceDocumentImpliesLiveState:false,
      installOrStartWorkersInScope:false,
      enableCloudModuleIntentInScope:false,
      rotateSecretsInScope:false,
      receiverOrActuatorControlInScope:false,
      lockstepReleaseRequired:false
    }
  };
}

export function build416SourceContractSummary() {
  return {
    sourceReview:BUILD_416_SOURCE_REVIEW,
    services:BUILD_411_WINDOWS_SERVICE_IDS.map(serviceId=>({
      serviceId,
      ...BUILD_416_SERVICE_POLICIES[serviceId]
    })),
    readOnlySinkPath:BUILD_416_READ_ONLY_SINK,
    originalHost:BUILD_416_ORIGINAL_HOST,
    operationalAcceptance:"HOLD / NOT VERIFIED"
  };
}
