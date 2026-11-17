import {
  BUILD_405_APPLICATION_IDS,
  BUILD_405_COMMUNICATION_RELATIONSHIPS,
  BUILD_405_SECURITY_TIERS,
  type Build405SecurityTier
} from "./master-assurance-renewal-security-comms-recertification";
import {
  MASTER_COMPLETION_AXES,
  type MasterCompletionAxis
} from "./master-completion-core";
import {
  MASTER_SECURITY_CERTIFICATION_DIMENSIONS,
  type MasterSecurityCertificationDimension
} from "./master-security-certification-core";
import type { Build413ApplicationId } from "./master-acceptance-advancement";

export const BUILD_414 = 414 as const;
export const BUILD_414_SCHEMA =
  "rosevear.ai-data-platform.build414-acceleration-closure.v1" as const;
export const BUILD_414_ROADMAP_ID = "builds-415-424" as const;
export const BUILD_414_COMMS_AUTHORITY = "rosevear-comms-hub" as const;
export const BUILD_414_WINDOWS_SERVICES = [
  "rosevear-ai-hub-automation-host",
  "rosevear-ai-data-platform-worker",
  "rosevear-comms-hub-worker"
] as const;

export type Build414WindowsService = (typeof BUILD_414_WINDOWS_SERVICES)[number];

export type Build414CompletionClosureEvidence = {
  evidenceId: string;
  appId: Build413ApplicationId;
  axis: MasterCompletionAxis;
  baselinePercent: number;
  targetPercent: number;
  observedPercent: number;
  denominatorHash: string;
  baselineDenominatorHash: string;
  build413EvidenceDigest: string;
  observedAt: string;
  expiresAt: string;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "CLOSED" | "HOLD" | "FAILED";
};

export type Build414SecurityRecertificationEvidence = {
  evidenceId: string;
  appId: Build413ApplicationId;
  tier: Build405SecurityTier;
  passedDimensions: MasterSecurityCertificationDimension[];
  evidenceDigest: string;
  sourceIdentityVerified: boolean;
  tenantIsolationVerified: boolean;
  secretsExcluded: boolean;
  authorityPreserved: boolean;
  observedAt: string;
  expiresAt: string;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "RECERTIFIED" | "HOLD" | "FAILED";
};

export type Build414CommsPilotReceipt = {
  receiptId: string;
  leftAppId: Build413ApplicationId;
  rightAppId: Build413ApplicationId;
  correlationId: string;
  messageAuthorityHolder: typeof BUILD_414_COMMS_AUTHORITY;
  transportAuthenticated: boolean;
  sourceIdentityVerified: boolean;
  targetAudienceVerified: boolean;
  tenantBoundaryVerified: boolean;
  replayProtectionVerified: boolean;
  payloadClassified: boolean;
  secretsExcluded: boolean;
  authorityPreserved: boolean;
  ownerGateForConsequentialWrites: boolean;
  directPeerDatabaseWrite: boolean;
  deliveryAcknowledged: boolean;
  evidenceDigest: string;
  observedAt: string;
  expiresAt: string;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "PASSED" | "HOLD" | "FAILED";
};

export type Build414HostActivationReceipt = {
  receiptId: string;
  serviceId: Build414WindowsService;
  hostId: string;
  signedReceiptDigest: string;
  startupModeVerified: boolean;
  serviceRunningVerified: boolean;
  localAuthorityPreserved: boolean;
  internetLossContinuityObserved: boolean | null;
  observedAt: string;
  expiresAt: string;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ACTIVE" | "HOLD" | "FAILED";
};

export type Build414RoadmapApproval = {
  approvalId: string;
  roadmapId: typeof BUILD_414_ROADMAP_ID;
  roadmapDigest: string;
  ownerUserId: string;
  ownerApproved: boolean;
  approvedAt: string;
};

function validPercent(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}
function validDigest(value: string) {
  return /^sha256:[a-f0-9]{64}$/.test(value);
}
function validHex(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}
function fresh(expiresAt: string, now: number) {
  return Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > now;
}
function relationshipKey(left: string, right: string) {
  return [left, right].sort().join("::");
}

export function evaluateBuild414Closure(input: {
  build413GovernanceState: string;
  completionClosure?: readonly Build414CompletionClosureEvidence[];
  securityRecertification?: readonly Build414SecurityRecertificationEvidence[];
  commsPilotReceipts?: readonly Build414CommsPilotReceipt[];
  hostActivationReceipts?: readonly Build414HostActivationReceipt[];
  roadmapApprovals?: readonly Build414RoadmapApproval[];
  nowIso: string;
}) {
  const now = Date.parse(input.nowIso);
  const build413Eligible =
    input.build413GovernanceState ===
    "SEVEN_APPLICATION_ACCEPTANCE_AND_ADVANCEMENT_ASSURED";

  const completionByKey = new Map<string, Build414CompletionClosureEvidence>();
  for (const item of input.completionClosure ?? []) {
    completionByKey.set(item.appId + "::" + item.axis, item);
  }
  const requiredCompletionKeys = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    MASTER_COMPLETION_AXES.map((axis) => appId + "::" + axis)
  );
  const missingCompletion = requiredCompletionKeys.filter((key) => !completionByKey.has(key));
  const invalidCompletion = requiredCompletionKeys.filter((key) => {
    const item = completionByKey.get(key);
    if (!item) return false;
    return !(
      validPercent(item.baselinePercent) &&
      validPercent(item.targetPercent) &&
      validPercent(item.observedPercent) &&
      item.targetPercent >= Math.min(100, item.baselinePercent + 10) &&
      item.observedPercent >= item.targetPercent &&
      item.denominatorHash === item.baselineDenominatorHash &&
      validHex(item.denominatorHash) &&
      validDigest(item.build413EvidenceDigest) &&
      fresh(item.expiresAt, now) &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "CLOSED"
    );
  });

  const securityByKey = new Map<string, Build414SecurityRecertificationEvidence>();
  for (const item of input.securityRecertification ?? []) {
    securityByKey.set(item.appId + "::" + item.tier, item);
  }
  const requiredSecurityKeys = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_405_SECURITY_TIERS.map((tier) => appId + "::" + tier)
  );
  const missingSecurity = requiredSecurityKeys.filter((key) => !securityByKey.has(key));
  const invalidSecurity = requiredSecurityKeys.filter((key) => {
    const item = securityByKey.get(key);
    if (!item) return false;
    const dimensions = new Set(item.passedDimensions);
    return !(
      MASTER_SECURITY_CERTIFICATION_DIMENSIONS.every((dimension) =>
        dimensions.has(dimension)
      ) &&
      validDigest(item.evidenceDigest) &&
      item.sourceIdentityVerified &&
      item.tenantIsolationVerified &&
      item.secretsExcluded &&
      item.authorityPreserved &&
      fresh(item.expiresAt, now) &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "RECERTIFIED"
    );
  });

  const pilotByRelationship = new Map<string, Build414CommsPilotReceipt>();
  for (const item of input.commsPilotReceipts ?? []) {
    pilotByRelationship.set(relationshipKey(item.leftAppId, item.rightAppId), item);
  }
  const requiredRelationships = BUILD_405_COMMUNICATION_RELATIONSHIPS.map(([left, right]) =>
    relationshipKey(left, right)
  );
  const missingPilotReceipts = requiredRelationships.filter(
    (key) => !pilotByRelationship.has(key)
  );
  const invalidPilotReceipts = requiredRelationships.filter((key) => {
    const item = pilotByRelationship.get(key);
    if (!item) return false;
    return !(
      item.messageAuthorityHolder === BUILD_414_COMMS_AUTHORITY &&
      item.transportAuthenticated &&
      item.sourceIdentityVerified &&
      item.targetAudienceVerified &&
      item.tenantBoundaryVerified &&
      item.replayProtectionVerified &&
      item.payloadClassified &&
      item.secretsExcluded &&
      item.authorityPreserved &&
      item.ownerGateForConsequentialWrites &&
      item.directPeerDatabaseWrite === false &&
      item.deliveryAcknowledged &&
      validDigest(item.evidenceDigest) &&
      fresh(item.expiresAt, now) &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "PASSED"
    );
  });

  const hostByService = new Map<Build414WindowsService, Build414HostActivationReceipt>();
  for (const item of input.hostActivationReceipts ?? []) hostByService.set(item.serviceId, item);
  const missingHostReceipts = BUILD_414_WINDOWS_SERVICES.filter(
    (serviceId) => !hostByService.has(serviceId)
  );
  const invalidHostReceipts = BUILD_414_WINDOWS_SERVICES.filter((serviceId) => {
    const item = hostByService.get(serviceId);
    if (!item) return false;
    return !(
      item.hostId.length > 0 &&
      validDigest(item.signedReceiptDigest) &&
      item.startupModeVerified &&
      item.serviceRunningVerified &&
      item.localAuthorityPreserved &&
      fresh(item.expiresAt, now) &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "ACTIVE"
    );
  });

  const roadmapApproval = [...(input.roadmapApprovals ?? [])]
    .filter((item) => item.roadmapId === BUILD_414_ROADMAP_ID)
    .sort((a,b) => b.approvedAt.localeCompare(a.approvedAt))[0] ?? null;
  const roadmapApproved = Boolean(
    roadmapApproval &&
    roadmapApproval.ownerApproved &&
    validDigest(roadmapApproval.roadmapDigest)
  );

  const governanceState =
    !build413Eligible
      ? ("HOLD_BUILD413_NOT_ASSURED" as const)
      : missingCompletion.length
        ? ("COMPLETION_CLOSURE_EVIDENCE_REQUIRED" as const)
        : invalidCompletion.length
          ? ("COMPLETION_ACCELERATION_NOT_CLOSED" as const)
          : missingSecurity.length
            ? ("SECURITY_RECERTIFICATION_EVIDENCE_REQUIRED" as const)
            : invalidSecurity.length
              ? ("SECURITY_RECERTIFICATION_FAILED" as const)
              : missingPilotReceipts.length
                ? ("COMMS_PRODUCTION_PILOT_EVIDENCE_REQUIRED" as const)
                : invalidPilotReceipts.length
                  ? ("COMMS_PRODUCTION_PILOT_FAILED" as const)
                  : missingHostReceipts.length
                    ? ("PHYSICAL_HOST_ACTIVATION_EVIDENCE_REQUIRED" as const)
                    : invalidHostReceipts.length
                      ? ("PHYSICAL_HOST_ACTIVATION_NOT_VERIFIED" as const)
                      : !roadmapApproved
                        ? ("ROADMAP_OWNER_APPROVAL_REQUIRED" as const)
                        : ("ACCELERATION_CYCLE_CLOSED_SECURITY_RECERTIFIED_COMMS_PILOT_VERIFIED_ROADMAP_RENEWED" as const);

  return {
    schema: BUILD_414_SCHEMA,
    build: BUILD_414,
    governanceState,
    build413Eligible,
    missingCompletion,
    invalidCompletion,
    missingSecurity,
    invalidSecurity,
    missingPilotReceipts,
    invalidPilotReceipts,
    missingHostReceipts,
    invalidHostReceipts,
    roadmapApproved,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      completionAxes: MASTER_COMPLETION_AXES.length,
      requiredCompletionClosures: requiredCompletionKeys.length,
      securityTiers: BUILD_405_SECURITY_TIERS.length,
      requiredSecurityRecertifications: requiredSecurityKeys.length,
      communicationRelationships: requiredRelationships.length,
      windowsServices: BUILD_414_WINDOWS_SERVICES.length
    },
    policy: {
      completionClosureRequiresTargetEvidence: true,
      changedDenominatorMayClose: false,
      allSixSecurityDimensionsRequiredPerTier: true,
      commsAuthorityHolder: BUILD_414_COMMS_AUTHORITY,
      directPeerDatabaseWritesAllowed: false,
      productionGreenImpliesPilotPassed: false,
      productionGreenImpliesPhysicalHostActivated: false,
      physicalHostReceiptsRequiredFor24x7Closure: true,
      roadmapRenewalRequiresOwnerApproval: true
    }
  };
}

export function build414ClosureSummary() {
  return {
    applications: [...BUILD_405_APPLICATION_IDS],
    completionAxes: [...MASTER_COMPLETION_AXES],
    securityTiers: [...BUILD_405_SECURITY_TIERS],
    securityDimensions: [...MASTER_SECURITY_CERTIFICATION_DIMENSIONS],
    communicationRelationships: BUILD_405_COMMUNICATION_RELATIONSHIPS.map(
      ([left,right]) => ({left,right})
    ),
    windowsServices: [...BUILD_414_WINDOWS_SERVICES],
    roadmapId: BUILD_414_ROADMAP_ID,
    requiredCompletionClosures:
      BUILD_405_APPLICATION_IDS.length * MASTER_COMPLETION_AXES.length,
    requiredSecurityRecertifications:
      BUILD_405_APPLICATION_IDS.length * BUILD_405_SECURITY_TIERS.length
  };
}
