import {
  BUILD_402_APPLICATION_REPOSITORIES,
  BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS,
  BUILD_402_TOPOLOGY_ID,
  type Build402ApplicationId
} from "./master-forecast-recalibration-renewal-timing-linkage-continuity";
import type { Build404GovernanceAssessment } from "./master-long-horizon-recalibration-recovery-linkage-assurance";
import {
  MASTER_COMPLETION_AXES,
  type MasterCompletionAxis
} from "./master-completion-core";
import {
  MASTER_SECURITY_CERTIFICATION_DIMENSIONS,
  type MasterSecurityCertificationDimension
} from "./master-security-certification-core";

export const BUILD_405 = 405 as const;
export const BUILD_405_SCHEMA =
  "rosevear.ai-data-platform.assurance-renewal-security-comms-recertification.v1" as const;
export const BUILD_405_MIN_RENEWAL_WINDOW_HOURS = 168 as const;
export const BUILD_405_MIN_RENEWAL_SAMPLES = 7 as const;
export const BUILD_405_MIN_DEGRADATION_WINDOW_HOURS = 72 as const;
export const BUILD_405_MIN_DEGRADATION_SAMPLES = 5 as const;
export const BUILD_405_MIN_RECOVERY_EFFECTIVENESS_PERCENT = 95 as const;
export const BUILD_405_MIN_COMPLETION_ADVANCE_POINTS = 10 as const;

export const BUILD_405_APPLICATION_IDS = [
  "ai-data-platform",
  "rosevear-ai-hub",
  "rosevear-comms-hub",
  "icamp",
  "yw",
  "devilndove",
  "rosiedazzlers"
] as const satisfies readonly Build402ApplicationId[];

export const BUILD_405_SECURITY_TIERS = [
  "T1_IDENTITY_PROVENANCE",
  "T2_TRANSPORT_AUTHENTICATION",
  "T3_AUTHORIZATION_TENANT_CONSENT",
  "T4_DATA_AUDIT_REPLAY_FAIL_CLOSED",
  "T5_PRIVILEGED_OPERATION_RECOVERY"
] as const;

export type Build405SecurityTier =
  (typeof BUILD_405_SECURITY_TIERS)[number];

export const BUILD_405_COMMUNICATION_RELATIONSHIPS = [
  ["ai-data-platform", "rosevear-ai-hub"],
  ["ai-data-platform", "rosevear-comms-hub"],
  ["ai-data-platform", "icamp"],
  ["ai-data-platform", "yw"],
  ["ai-data-platform", "devilndove"],
  ["ai-data-platform", "rosiedazzlers"],
  ["rosevear-ai-hub", "icamp"],
  ["rosevear-ai-hub", "yw"],
  ["rosevear-ai-hub", "devilndove"],
  ["rosevear-ai-hub", "rosiedazzlers"],
  ["rosevear-comms-hub", "icamp"],
  ["rosevear-comms-hub", "yw"],
  ["rosevear-comms-hub", "devilndove"],
  ["rosevear-comms-hub", "rosiedazzlers"]
] as const satisfies readonly (readonly [
  Build402ApplicationId,
  Build402ApplicationId
])[];

export const BUILD_405_COMMUNICATION_CHANNELS = [
  "SECURITY_EVIDENCE",
  "HEALTH_EVIDENCE",
  "CORRELATION_EVENT",
  "WORKFLOW_HANDOFF",
  "OWNER_GATED_COMMAND"
] as const;

export type Build405AssuranceRenewal = {
  renewalId: string;
  appId: Build402ApplicationId;
  repository: string;
  topologyId: string;
  productionMainSha: string;
  manifestSha256: string;
  evidenceAgeHours: number;
  renewalWindowHours: number;
  sampleCount: number;
  continuityBreakCount: number;
  staleEvidenceRecurrenceCount: number;
  authorityTransferCount: number;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  renewalState: "RENEWED" | "DEGRADED" | "HOLD";
  observedAt: string;
};

export type Build405RecoveryEffectiveness = {
  effectivenessId: string;
  appId: Build402ApplicationId;
  observationWindowHours: number;
  sampleCount: number;
  recoveryEventCount: number;
  degradedRecoveryEventCount: number;
  unresolvedDegradationCount: number;
  effectivenessPercent: number;
  recurrenceCount: number;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  effectivenessState: "EFFECTIVE" | "DEGRADED" | "HOLD";
  observedAt: string;
};

export type Build405SecurityTierRecertification = {
  recertificationId: string;
  appId: Build402ApplicationId;
  tier: Build405SecurityTier;
  passedDimensions: MasterSecurityCertificationDimension[];
  evidenceAgeHours: number;
  sourceIdentityVerified: boolean;
  tenantIsolationVerified: boolean;
  secretsExcluded: boolean;
  authorityPreserved: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  recertificationState: "RECERTIFIED" | "FAILED" | "HOLD";
  observedAt: string;
};

export type Build405CommunicationRecertification = {
  relationshipId: string;
  leftAppId: Build402ApplicationId;
  rightAppId: Build402ApplicationId;
  channels: (typeof BUILD_405_COMMUNICATION_CHANNELS)[number][];
  evidenceAgeHours: number;
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
  recertificationState: "RECERTIFIED" | "FAILED" | "HOLD";
  observedAt: string;
};

export type Build405CompletionAccelerationTarget = {
  targetId: string;
  appId: Build402ApplicationId;
  axis: MasterCompletionAxis;
  baselinePercent: number;
  targetPercent: number;
  denominatorLocked: boolean;
  ownerApproved: boolean;
  independentEvidenceRequired: boolean;
  targetState: "TARGET_SET" | "HOLD";
  observedAt: string;
};

function validPercent(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function validCount(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validHex(value: string, length: number) {
  return new RegExp("^[0-9a-f]{" + length + "}$").test(value);
}

function latestByApp<T extends { appId: Build402ApplicationId; observedAt: string }>(
  records: readonly T[]
) {
  const latest = new Map<Build402ApplicationId, T>();
  for (const item of [...records].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latest.has(item.appId)) latest.set(item.appId, item);
  }
  return latest;
}

function relationshipKey(left: string, right: string) {
  return [left, right].sort().join("::");
}

function requiredCompletionTarget(
  baselinePercent: number
) {
  return Math.min(
    100,
    baselinePercent + BUILD_405_MIN_COMPLETION_ADVANCE_POINTS
  );
}

export function assessBuild405Governance(input: {
  build404: Build404GovernanceAssessment;
  assuranceRenewals?: readonly Build405AssuranceRenewal[];
  recoveryEffectiveness?: readonly Build405RecoveryEffectiveness[];
  securityTierRecertifications?: readonly Build405SecurityTierRecertification[];
  communicationRecertifications?: readonly Build405CommunicationRecertification[];
  completionTargets?: readonly Build405CompletionAccelerationTarget[];
}) {
  const build404Eligible =
    input.build404.governanceState ===
    "LONG_HORIZON_PREVENTION_ASSURANCE_GOVERNANCE_VERIFIED";

  const renewals = latestByApp(input.assuranceRenewals ?? []);
  const missingRenewals = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !renewals.has(appId)
  );
  const degradedRenewals = BUILD_405_APPLICATION_IDS.filter((appId) => {
    const item = renewals.get(appId);
    if (!item) return false;
    return !(
      item.repository === BUILD_402_APPLICATION_REPOSITORIES[appId] &&
      item.topologyId === BUILD_402_TOPOLOGY_ID &&
      validHex(item.productionMainSha, 40) &&
      validHex(item.manifestSha256, 64) &&
      item.evidenceAgeHours >= 0 &&
      item.evidenceAgeHours <= BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS &&
      item.renewalWindowHours >= BUILD_405_MIN_RENEWAL_WINDOW_HOURS &&
      item.sampleCount >= BUILD_405_MIN_RENEWAL_SAMPLES &&
      item.continuityBreakCount === 0 &&
      item.staleEvidenceRecurrenceCount === 0 &&
      item.authorityTransferCount === 0 &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.renewalState === "RENEWED"
    );
  });

  const effectiveness = latestByApp(input.recoveryEffectiveness ?? []);
  const missingEffectiveness = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !effectiveness.has(appId)
  );
  const degradedEffectiveness = BUILD_405_APPLICATION_IDS.filter((appId) => {
    const item = effectiveness.get(appId);
    if (!item) return false;
    return !(
      item.observationWindowHours >= BUILD_405_MIN_DEGRADATION_WINDOW_HOURS &&
      item.sampleCount >= BUILD_405_MIN_DEGRADATION_SAMPLES &&
      validCount(item.recoveryEventCount) &&
      validCount(item.degradedRecoveryEventCount) &&
      item.degradedRecoveryEventCount <= item.recoveryEventCount &&
      item.unresolvedDegradationCount === 0 &&
      validPercent(item.effectivenessPercent) &&
      item.effectivenessPercent >=
        BUILD_405_MIN_RECOVERY_EFFECTIVENESS_PERCENT &&
      item.recurrenceCount === 0 &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.effectivenessState === "EFFECTIVE"
    );
  });

  const requiredSecurityKeys = new Set(
    BUILD_405_APPLICATION_IDS.flatMap((appId) =>
      BUILD_405_SECURITY_TIERS.map((tier) => appId + "::" + tier)
    )
  );
  const securityByKey = new Map<string, Build405SecurityTierRecertification>();
  for (const item of input.securityTierRecertifications ?? []) {
    const key = item.appId + "::" + item.tier;
    const current = securityByKey.get(key);
    if (!current || item.observedAt > current.observedAt) {
      securityByKey.set(key, item);
    }
  }
  const missingSecurityTiers = [...requiredSecurityKeys].filter(
    (key) => !securityByKey.has(key)
  );
  const failedSecurityTiers = [...requiredSecurityKeys].filter((key) => {
    const item = securityByKey.get(key);
    if (!item) return false;
    const dimensions = new Set(item.passedDimensions);
    return !(
      MASTER_SECURITY_CERTIFICATION_DIMENSIONS.every((dimension) =>
        dimensions.has(dimension)
      ) &&
      item.evidenceAgeHours >= 0 &&
      item.evidenceAgeHours <= BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS &&
      item.sourceIdentityVerified &&
      item.tenantIsolationVerified &&
      item.secretsExcluded &&
      item.authorityPreserved &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.recertificationState === "RECERTIFIED"
    );
  });

  const requiredRelationshipKeys = new Set(
    BUILD_405_COMMUNICATION_RELATIONSHIPS.map(([left, right]) =>
      relationshipKey(left, right)
    )
  );
  const communicationByKey = new Map<
    string,
    Build405CommunicationRecertification
  >();
  for (const item of input.communicationRecertifications ?? []) {
    const key = relationshipKey(item.leftAppId, item.rightAppId);
    const current = communicationByKey.get(key);
    if (!current || item.observedAt > current.observedAt) {
      communicationByKey.set(key, item);
    }
  }
  const missingCommunicationRelationships = [...requiredRelationshipKeys].filter(
    (key) => !communicationByKey.has(key)
  );
  const failedCommunicationRelationships = [...requiredRelationshipKeys].filter(
    (key) => {
      const item = communicationByKey.get(key);
      if (!item) return false;
      return !(
        item.channels.includes("SECURITY_EVIDENCE") &&
        item.channels.includes("HEALTH_EVIDENCE") &&
        item.channels.includes("CORRELATION_EVENT") &&
        item.evidenceAgeHours >= 0 &&
        item.evidenceAgeHours <= BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS &&
        item.transportAuthenticated &&
        item.sourceIdentityVerified &&
        item.targetAudienceVerified &&
        item.tenantBoundaryVerified &&
        item.replayProtectionVerified &&
        item.payloadClassified &&
        item.secretsExcluded &&
        item.authorityPreserved &&
        item.ownerGateForConsequentialWrites &&
        !item.directPeerDatabaseWrite &&
        item.recertificationState === "RECERTIFIED"
      );
    }
  );

  const requiredCompletionKeys = new Set(
    BUILD_405_APPLICATION_IDS.flatMap((appId) =>
      MASTER_COMPLETION_AXES.map((axis) => appId + "::" + axis)
    )
  );
  const completionByKey = new Map<string, Build405CompletionAccelerationTarget>();
  for (const item of input.completionTargets ?? []) {
    const key = item.appId + "::" + item.axis;
    const current = completionByKey.get(key);
    if (!current || item.observedAt > current.observedAt) {
      completionByKey.set(key, item);
    }
  }
  const missingCompletionTargets = [...requiredCompletionKeys].filter(
    (key) => !completionByKey.has(key)
  );
  const invalidCompletionTargets = [...requiredCompletionKeys].filter((key) => {
    const item = completionByKey.get(key);
    if (!item) return false;
    return !(
      validPercent(item.baselinePercent) &&
      validPercent(item.targetPercent) &&
      item.targetPercent >= requiredCompletionTarget(item.baselinePercent) &&
      item.denominatorLocked &&
      item.ownerApproved &&
      item.independentEvidenceRequired &&
      item.targetState === "TARGET_SET"
    );
  });

  const governanceState =
    !build404Eligible
      ? ("HOLD_BUILD404_NOT_VERIFIED" as const)
      : missingRenewals.length
        ? ("ASSURANCE_RENEWAL_EVIDENCE_REQUIRED" as const)
        : degradedRenewals.length
          ? ("LONG_HORIZON_ASSURANCE_RENEWAL_DEGRADED" as const)
          : missingEffectiveness.length
            ? ("RECOVERY_EFFECTIVENESS_EVIDENCE_REQUIRED" as const)
            : degradedEffectiveness.length
              ? ("RECOVERY_EFFECTIVENESS_DEGRADATION_DETECTED" as const)
              : missingSecurityTiers.length
                ? ("SECURITY_TIER_RECERTIFICATION_REQUIRED" as const)
                : failedSecurityTiers.length
                  ? ("SECURITY_TIER_RECERTIFICATION_FAILED" as const)
                  : missingCommunicationRelationships.length
                    ? ("COMMUNICATION_RECERTIFICATION_REQUIRED" as const)
                    : failedCommunicationRelationships.length
                      ? ("COMMUNICATION_RECERTIFICATION_FAILED" as const)
                      : missingCompletionTargets.length
                        ? ("COMPLETION_ACCELERATION_TARGETS_REQUIRED" as const)
                        : invalidCompletionTargets.length
                          ? ("COMPLETION_ACCELERATION_TARGETS_INVALID" as const)
                          : ("ASSURANCE_RENEWAL_RECERTIFIED_AND_ACCELERATION_TARGETED" as const);

  return {
    schema: BUILD_405_SCHEMA,
    build: BUILD_405,
    topologyId: BUILD_402_TOPOLOGY_ID,
    build404Eligible,
    missingRenewals,
    degradedRenewals,
    missingEffectiveness,
    degradedEffectiveness,
    missingSecurityTiers,
    failedSecurityTiers,
    missingCommunicationRelationships,
    failedCommunicationRelationships,
    missingCompletionTargets,
    invalidCompletionTargets,
    governanceState,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      securityTiersPerApplication: BUILD_405_SECURITY_TIERS.length,
      requiredSecurityTierRecertifications: requiredSecurityKeys.size,
      communicationRelationships: requiredRelationshipKeys.size,
      completionAxesPerApplication: MASTER_COMPLETION_AXES.length,
      completionAccelerationTargets: requiredCompletionKeys.size
    },
    policy: {
      minimumCompletionAdvancePoints:
        BUILD_405_MIN_COMPLETION_ADVANCE_POINTS,
      completionAdvanceIsTargetUntilEvidenceProvesAchievement: true,
      allFiveSecurityTiersRequiredForEveryApplication: true,
      existingBuild347SecurityDimensionsRemainRequired: true,
      directChildToChildCommunicationIntroduced: false,
      directPeerDatabaseWritesAllowed: false,
      consequentialWritesRequireOwnerGate: true,
      rawSecretsMayCrossApplications: false,
      communicationAuthorityTransferAllowed: false,
      productionGreenImpliesRuntimeConnected: false,
      missingOrStaleEvidenceFailsClosed: true
    }
  };
}

export type Build405GovernanceAssessment = ReturnType<
  typeof assessBuild405Governance
>;
