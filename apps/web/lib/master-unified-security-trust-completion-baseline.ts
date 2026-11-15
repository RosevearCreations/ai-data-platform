import {
  BUILD_405_APPLICATION_IDS,
  BUILD_405_COMMUNICATION_CHANNELS,
  BUILD_405_COMMUNICATION_RELATIONSHIPS,
  BUILD_405_MIN_COMPLETION_ADVANCE_POINTS,
  BUILD_405_SECURITY_TIERS,
  type Build405GovernanceAssessment,
  type Build405SecurityTier
} from "./master-assurance-renewal-security-comms-recertification";
import type { Build402ApplicationId } from "./master-forecast-recalibration-renewal-timing-linkage-continuity";

export const BUILD_406 = 406 as const;
export const BUILD_406_SCHEMA =
  "rosevear.ai-data-platform.unified-security-trust-completion-baseline.v1" as const;

export const BUILD_406_ACCESS_TIERS = [
  "T0_PUBLIC_READ",
  "T1_USER_SCOPED",
  "T2_TENANT_SCOPED",
  "T3_OPERATOR_SCOPED",
  "T4_MASTER_GOVERNANCE",
  "T5_ORIGINAL_HOST_OWNER_CEREMONY"
] as const;

export type Build406AccessTier = (typeof BUILD_406_ACCESS_TIERS)[number];

export const BUILD_406_CONTROL_DOMAINS =
  BUILD_405_SECURITY_TIERS;

export type Build406ControlDomain = Build405SecurityTier;

export const BUILD_406_COMPLETION_ASPECTS = [
  "customer-guest",
  "worker-admin",
  "product-storefront",
  "finance-tax",
  "stock-inventory",
  "scheduling-jobs",
  "hr-payroll",
  "media-social",
  "security-privacy",
  "cross-app-integration",
  "accessibility-mobile",
  "deployment-recovery",
  "observability-support"
] as const;

export type Build406CompletionAspect =
  (typeof BUILD_406_COMPLETION_ASPECTS)[number];

export type Build406SecurityTierBaseline = {
  baselineId: string;
  appId: Build402ApplicationId;
  accessTier: Build406AccessTier;
  controlDomains: Build406ControlDomain[];
  policyVersion: number;
  sourceIdentityBound: boolean;
  resourceScopeDefined: boolean;
  tenantBoundaryDefined: boolean;
  denyByDefault: boolean;
  t5NonRoutable: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  baselineState: "BASELINED" | "FAILED" | "HOLD";
  observedAt: string;
};

export type Build406TrustMatrixBaseline = {
  baselineId: string;
  leftAppId: Build402ApplicationId;
  rightAppId: Build402ApplicationId;
  allowedChannels: (typeof BUILD_405_COMMUNICATION_CHANNELS)[number][];
  maxRoutableAccessTier: Exclude<
    Build406AccessTier,
    "T5_ORIGINAL_HOST_OWNER_CEREMONY"
  >;
  sourceIdentityVerified: boolean;
  targetIdentityVerified: boolean;
  tenantScopeVerified: boolean;
  transitiveTrustAllowed: boolean;
  directPeerDatabaseWrite: boolean;
  rawSecretsAllowed: boolean;
  delegatedAuthority: boolean;
  ownerGateForConsequentialWrites: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  trustState: "VERIFIED" | "FAILED" | "HOLD";
  observedAt: string;
};

export type Build406CompletionDenominatorBaseline = {
  baselineId: string;
  appId: Build402ApplicationId;
  aspect: Build406CompletionAspect;
  applicableRequirementCount: number;
  verifiedRequirementCount: number;
  baselinePercent: number;
  targetPercent: number;
  denominatorHashSha256: string;
  denominatorLocked: boolean;
  ownerApproved: boolean;
  independentlyVerified: boolean;
  baselineState: "LOCKED" | "UNMEASURED" | "HOLD";
  observedAt: string;
};

function latestByKey<T extends { observedAt: string }>(
  records: readonly T[],
  keyOf: (item: T) => string
) {
  const latest = new Map<string, T>();
  for (const item of [...records].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    const key = keyOf(item);
    if (!latest.has(key)) latest.set(key, item);
  }
  return latest;
}

function relationshipKey(left: string, right: string) {
  return [left, right].sort().join("::");
}

function validPercent(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function validNonNegativeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validPositiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function expectedBaselinePercent(verified: number, applicable: number) {
  return Math.round((10000 * verified) / applicable) / 100;
}

function expectedTargetPercent(baseline: number) {
  return Math.min(
    100,
    Math.round(
      (baseline + BUILD_405_MIN_COMPLETION_ADVANCE_POINTS) * 100
    ) / 100
  );
}

export function assessBuild406Governance(input: {
  build405: Build405GovernanceAssessment;
  securityTierBaselines?: readonly Build406SecurityTierBaseline[];
  trustMatrixBaselines?: readonly Build406TrustMatrixBaseline[];
  completionDenominators?: readonly Build406CompletionDenominatorBaseline[];
}) {
  const build405Eligible =
    input.build405.governanceState ===
    "ASSURANCE_RENEWAL_RECERTIFIED_AND_ACCELERATION_TARGETED";

  const requiredTierKeys = new Set(
    BUILD_405_APPLICATION_IDS.flatMap((appId) =>
      BUILD_406_ACCESS_TIERS.map((tier) => appId + "::" + tier)
    )
  );
  const tierByKey = latestByKey(
    input.securityTierBaselines ?? [],
    (item) => item.appId + "::" + item.accessTier
  );
  const missingTierBaselines = [...requiredTierKeys].filter(
    (key) => !tierByKey.has(key)
  );
  const invalidTierBaselines = [...requiredTierKeys].filter((key) => {
    const item = tierByKey.get(key);
    if (!item) return false;
    const domains = new Set(item.controlDomains);
    return !(
      BUILD_406_CONTROL_DOMAINS.every((domain) => domains.has(domain)) &&
      domains.size === BUILD_406_CONTROL_DOMAINS.length &&
      Number.isSafeInteger(item.policyVersion) &&
      item.policyVersion >= 1 &&
      item.sourceIdentityBound &&
      item.resourceScopeDefined &&
      item.tenantBoundaryDefined &&
      item.denyByDefault &&
      item.t5NonRoutable &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.baselineState === "BASELINED"
    );
  });

  const requiredTrustKeys = new Set(
    BUILD_405_COMMUNICATION_RELATIONSHIPS.map(([left, right]) =>
      relationshipKey(left, right)
    )
  );
  const trustByKey = latestByKey(
    input.trustMatrixBaselines ?? [],
    (item) => relationshipKey(item.leftAppId, item.rightAppId)
  );
  const missingTrustBaselines = [...requiredTrustKeys].filter(
    (key) => !trustByKey.has(key)
  );
  const invalidTrustBaselines = [...requiredTrustKeys].filter((key) => {
    const item = trustByKey.get(key);
    if (!item) return false;
    return !(
      item.allowedChannels.includes("SECURITY_EVIDENCE") &&
      item.allowedChannels.includes("HEALTH_EVIDENCE") &&
      item.allowedChannels.includes("CORRELATION_EVENT") &&
      item.maxRoutableAccessTier !==
        ("T5_ORIGINAL_HOST_OWNER_CEREMONY" as Build406AccessTier) &&
      item.sourceIdentityVerified &&
      item.targetIdentityVerified &&
      item.tenantScopeVerified &&
      !item.transitiveTrustAllowed &&
      !item.directPeerDatabaseWrite &&
      !item.rawSecretsAllowed &&
      !item.delegatedAuthority &&
      item.ownerGateForConsequentialWrites &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.trustState === "VERIFIED"
    );
  });

  const requiredDenominatorKeys = new Set(
    BUILD_405_APPLICATION_IDS.flatMap((appId) =>
      BUILD_406_COMPLETION_ASPECTS.map((aspect) => appId + "::" + aspect)
    )
  );
  const denominatorByKey = latestByKey(
    input.completionDenominators ?? [],
    (item) => item.appId + "::" + item.aspect
  );
  const missingDenominators = [...requiredDenominatorKeys].filter(
    (key) => !denominatorByKey.has(key)
  );
  const invalidDenominators = [...requiredDenominatorKeys].filter((key) => {
    const item = denominatorByKey.get(key);
    if (!item) return false;
    const expectedBaseline =
      validPositiveInteger(item.applicableRequirementCount) &&
      validNonNegativeInteger(item.verifiedRequirementCount) &&
      item.verifiedRequirementCount <= item.applicableRequirementCount
        ? expectedBaselinePercent(
            item.verifiedRequirementCount,
            item.applicableRequirementCount
          )
        : Number.NaN;
    const expectedTarget = expectedTargetPercent(expectedBaseline);
    return !(
      validPositiveInteger(item.applicableRequirementCount) &&
      validNonNegativeInteger(item.verifiedRequirementCount) &&
      item.verifiedRequirementCount <= item.applicableRequirementCount &&
      validPercent(item.baselinePercent) &&
      Math.abs(item.baselinePercent - expectedBaseline) < 0.01 &&
      validPercent(item.targetPercent) &&
      Math.abs(item.targetPercent - expectedTarget) < 0.01 &&
      /^[0-9a-f]{64}$/.test(item.denominatorHashSha256) &&
      item.denominatorLocked &&
      item.ownerApproved &&
      item.independentlyVerified &&
      item.baselineState === "LOCKED"
    );
  });

  const governanceState =
    !build405Eligible
      ? ("HOLD_BUILD405_NOT_VERIFIED" as const)
      : missingTierBaselines.length
        ? ("SECURITY_TIER_BASELINE_REQUIRED" as const)
        : invalidTierBaselines.length
          ? ("SECURITY_TIER_BASELINE_INVALID" as const)
          : missingTrustBaselines.length
            ? ("TRUST_MATRIX_BASELINE_REQUIRED" as const)
            : invalidTrustBaselines.length
              ? ("TRUST_MATRIX_BASELINE_INVALID" as const)
              : missingDenominators.length
                ? ("COMPLETION_DENOMINATOR_BASELINE_REQUIRED" as const)
                : invalidDenominators.length
                  ? ("COMPLETION_DENOMINATOR_BASELINE_INVALID" as const)
                  : ("UNIFIED_SECURITY_TRUST_AND_COMPLETION_BASELINE_VERIFIED" as const);

  return {
    schema: BUILD_406_SCHEMA,
    build: BUILD_406,
    build405Eligible,
    missingTierBaselines,
    invalidTierBaselines,
    missingTrustBaselines,
    invalidTrustBaselines,
    missingDenominators,
    invalidDenominators,
    governanceState,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      accessTiersPerApplication: BUILD_406_ACCESS_TIERS.length,
      controlDomainsPerAccessTier: BUILD_406_CONTROL_DOMAINS.length,
      requiredSecurityTierBaselines: requiredTierKeys.size,
      canonicalTrustRelationships: requiredTrustKeys.size,
      completionAspectsPerApplication: BUILD_406_COMPLETION_ASPECTS.length,
      completionDenominators: requiredDenominatorKeys.size
    },
    policy: {
      sixAccessTiersAreCanonical: true,
      build405FiveSecurityTiersRetainedAsControlDomains: true,
      t5MayRouteOverOrdinaryTransport: false,
      t4MayGrantT5: false,
      transitiveTrustAllowed: false,
      rawSecretsMayCrossApplications: false,
      directPeerDatabaseWritesAllowed: false,
      delegatedOperationalAuthorityAllowed: false,
      consequentialWritesRequireOwnerGate: true,
      completionTargetIncreasePoints:
        BUILD_405_MIN_COMPLETION_ADVANCE_POINTS,
      completionProgressRequiresLockedDenominator: true,
      unmeasuredDoesNotEqualZero: true,
      productionGreenImpliesRuntimeConnected: false
    }
  };
}

export type Build406GovernanceAssessment = ReturnType<
  typeof assessBuild406Governance
>;
