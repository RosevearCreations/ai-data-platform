import {
  BUILD_405_APPLICATION_IDS
} from "./master-assurance-renewal-security-comms-recertification";
import {
  BUILD_406_ACCESS_TIERS,
  type Build406AccessTier
} from "./master-unified-security-trust-completion-baseline";
import {
  BUILD_407_DIRECTIONAL_RELATIONSHIPS,
  type Build407GovernanceAssessment
} from "./master-zero-trust-service-transport";
import type { Build402ApplicationId } from "./master-forecast-recalibration-renewal-timing-linkage-continuity";

export const BUILD_408 = 408 as const;
export const BUILD_408_SCHEMA =
  "rosevear.ai-data-platform.fine-grained-authorization-consent-independent-sync.v1" as const;
export const BUILD_408_PROTOCOL_MAJOR = 1 as const;
export const BUILD_408_PROTOCOL_MINOR = 1 as const;
export const BUILD_408_MAX_DELEGATION_HOURS = 24 as const;

export const BUILD_408_ALLOWED_ACTIONS = [
  "READ",
  "WRITE",
  "EXECUTE",
  "APPROVE"
] as const;

export type Build408Action = (typeof BUILD_408_ALLOWED_ACTIONS)[number];

export const BUILD_408_TIER_SUBJECT_SCOPE: Record<
  Build406AccessTier,
  "public" | "self" | "tenant" | "operator" | "master" | "original-host-owner"
> = {
  T0_PUBLIC_READ: "public",
  T1_USER_SCOPED: "self",
  T2_TENANT_SCOPED: "tenant",
  T3_OPERATOR_SCOPED: "operator",
  T4_MASTER_GOVERNANCE: "master",
  T5_ORIGINAL_HOST_OWNER_CEREMONY: "original-host-owner"
};

export type Build408AuthorizationPolicy = {
  policyId: string;
  appId: Build402ApplicationId;
  accessTier: Build406AccessTier;
  policyVersion: number;
  subjectScope: (typeof BUILD_408_TIER_SUBJECT_SCOPE)[Build406AccessTier];
  capabilityNamespace: string;
  allowedActions: Build408Action[];
  resourceScopeDefined: boolean;
  tenantBindingRequired: boolean;
  workspaceBindingRequired: boolean;
  consentRequiredForPersonalData: boolean;
  denyByDefault: boolean;
  crossTenantAccessAllowed: boolean;
  delegatedGrantAllowed: boolean;
  t5NonDelegable: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "CERTIFIED" | "HOLD" | "REVOKED";
  observedAt: string;
};

export type Build408ConsentPolicyReceipt = {
  receiptId: string;
  appId: Build402ApplicationId;
  policyVersion: number;
  personalDataRequiresExplicitConsent: boolean;
  consentPurposeBound: boolean;
  revocable: boolean;
  withdrawalPropagates: boolean;
  expirationEnforced: boolean;
  consentMayGrantNewCapability: boolean;
  rawPersonalDataIncludedInEvidence: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "CERTIFIED" | "HOLD" | "REVOKED";
  observedAt: string;
};

export type Build408TenantIsolationEvidence = {
  evidenceId: string;
  appId: Build402ApplicationId;
  apiBoundaryVerified: boolean;
  databaseRlsVerified: boolean;
  storageBoundaryVerified: boolean;
  sameTenantForeignAccessDenied: boolean;
  crossTenantAccessDenied: boolean;
  crossWorkspaceAccessDenied: boolean;
  evidenceCurrent: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "VERIFIED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build408DelegatedCapabilityRecertification = {
  receiptId: string;
  sourceAppId: Build402ApplicationId;
  targetAppId: Build402ApplicationId;
  capabilityNamespace: string;
  maxLifetimeHours: number;
  exactCapabilityRequired: boolean;
  exactAudienceRequired: boolean;
  tenantScopePreserved: boolean;
  workspaceScopePreserved: boolean;
  consentScopePreserved: boolean;
  subdelegationAllowed: boolean;
  authorityTransfer: boolean;
  t5DelegationAllowed: boolean;
  revocationPropagationRequired: boolean;
  consequentialWritesRequireOwnerGate: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "RECERTIFIED" | "HOLD" | "REVOKED";
  observedAt: string;
};

export type Build408SyncCompatibilityContract = {
  contractId: string;
  appId: Build402ApplicationId;
  protocolMajor: number;
  protocolMinor: number;
  minimumPeerMajor: number;
  supportedPeerMajors: number[];
  independentDeployAllowed: boolean;
  lockstepReleaseRequired: boolean;
  additiveChangesBackwardCompatible: boolean;
  breakingChangesRequireMajorBump: boolean;
  breakingChangesRequireExplicitPeerHandoff: boolean;
  unknownCapabilitiesFailClosed: boolean;
  peerUnavailableLocalOperationsContinue: boolean;
  peerUnavailableCrossAppCapabilityBlocks: boolean;
  schemaNegotiationRequired: boolean;
  rawSecretSynchronizationAllowed: boolean;
  directPeerDatabaseSynchronizationAllowed: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "COMPATIBLE" | "HOLD" | "INCOMPATIBLE";
  observedAt: string;
};

function key(...parts: string[]) {
  return parts.join("::");
}

function latestByKey<T>(values: readonly T[], getKey: (value: T) => string) {
  const result = new Map<string, T>();
  for (const value of values) result.set(getKey(value), value);
  return result;
}

export function assessBuild408Governance(input: {
  build407: Build407GovernanceAssessment;
  authorizationPolicies?: readonly Build408AuthorizationPolicy[];
  consentPolicies?: readonly Build408ConsentPolicyReceipt[];
  tenantIsolation?: readonly Build408TenantIsolationEvidence[];
  delegatedCapabilities?: readonly Build408DelegatedCapabilityRecertification[];
  syncContracts?: readonly Build408SyncCompatibilityContract[];
}) {
  const build407Eligible =
    input.build407.governanceState === "ZERO_TRUST_SERVICE_TRANSPORT_ENFORCED";

  const authorization = latestByKey(
    input.authorizationPolicies ?? [],
    (item) => key(item.appId, item.accessTier)
  );
  const requiredAuthorizationKeys = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_406_ACCESS_TIERS.map((tier) => key(appId, tier))
  );
  const missingAuthorization = requiredAuthorizationKeys.filter(
    (item) => !authorization.has(item)
  );
  const invalidAuthorization = [...authorization.values()].filter((item) => {
    const expectedScope = BUILD_408_TIER_SUBJECT_SCOPE[item.accessTier];
    const allowed = new Set(BUILD_408_ALLOWED_ACTIONS);
    const actionsValid =
      item.allowedActions.length > 0 &&
      item.allowedActions.every((action) => allowed.has(action));
    const t0Valid =
      item.accessTier !== "T0_PUBLIC_READ" ||
      (item.allowedActions.length === 1 &&
        item.allowedActions[0] === "READ" &&
        item.consentRequiredForPersonalData === false &&
        item.delegatedGrantAllowed === false);
    const t5Valid =
      item.accessTier !== "T5_ORIGINAL_HOST_OWNER_CEREMONY" ||
      item.delegatedGrantAllowed === false;
    const consentValid =
      item.accessTier === "T0_PUBLIC_READ" ||
      item.consentRequiredForPersonalData === true;

    return !(
      Number.isInteger(item.policyVersion) &&
      item.policyVersion >= 1 &&
      item.subjectScope === expectedScope &&
      item.capabilityNamespace.length >= 3 &&
      !item.capabilityNamespace.includes("*") &&
      actionsValid &&
      item.resourceScopeDefined &&
      consentValid &&
      item.denyByDefault &&
      item.crossTenantAccessAllowed === false &&
      item.t5NonDelegable &&
      t0Valid &&
      t5Valid &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "CERTIFIED"
    );
  });

  const consent = latestByKey(input.consentPolicies ?? [], (item) => item.appId);
  const missingConsent = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !consent.has(appId)
  );
  const invalidConsent = [...consent.values()].filter(
    (item) =>
      !(
        Number.isInteger(item.policyVersion) &&
        item.policyVersion >= 1 &&
        item.personalDataRequiresExplicitConsent &&
        item.consentPurposeBound &&
        item.revocable &&
        item.withdrawalPropagates &&
        item.expirationEnforced &&
        item.consentMayGrantNewCapability === false &&
        item.rawPersonalDataIncludedInEvidence === false &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "CERTIFIED"
      )
  );

  const isolation = latestByKey(input.tenantIsolation ?? [], (item) => item.appId);
  const missingTenantIsolation = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !isolation.has(appId)
  );
  const invalidTenantIsolation = [...isolation.values()].filter(
    (item) =>
      !(
        item.apiBoundaryVerified &&
        item.databaseRlsVerified &&
        item.storageBoundaryVerified &&
        item.sameTenantForeignAccessDenied &&
        item.crossTenantAccessDenied &&
        item.crossWorkspaceAccessDenied &&
        item.evidenceCurrent &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "VERIFIED"
      )
  );

  const delegation = latestByKey(
    input.delegatedCapabilities ?? [],
    (item) => key(item.sourceAppId, item.targetAppId)
  );
  const requiredDelegationKeys = BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(
    ([source, target]) => key(source, target)
  );
  const missingDelegatedCapabilities = requiredDelegationKeys.filter(
    (item) => !delegation.has(item)
  );
  const invalidDelegatedCapabilities = [...delegation.values()].filter(
    (item) =>
      !(
        item.sourceAppId !== item.targetAppId &&
        item.capabilityNamespace.length >= 3 &&
        !item.capabilityNamespace.includes("*") &&
        Number.isInteger(item.maxLifetimeHours) &&
        item.maxLifetimeHours >= 1 &&
        item.maxLifetimeHours <= BUILD_408_MAX_DELEGATION_HOURS &&
        item.exactCapabilityRequired &&
        item.exactAudienceRequired &&
        item.tenantScopePreserved &&
        item.workspaceScopePreserved &&
        item.consentScopePreserved &&
        item.subdelegationAllowed === false &&
        item.authorityTransfer === false &&
        item.t5DelegationAllowed === false &&
        item.revocationPropagationRequired &&
        item.consequentialWritesRequireOwnerGate &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "RECERTIFIED"
      )
  );

  const sync = latestByKey(input.syncContracts ?? [], (item) => item.appId);
  const missingSyncContracts = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !sync.has(appId)
  );
  const invalidSyncContracts = [...sync.values()].filter(
    (item) =>
      !(
        item.protocolMajor === BUILD_408_PROTOCOL_MAJOR &&
        item.protocolMinor >= BUILD_408_PROTOCOL_MINOR &&
        item.minimumPeerMajor === BUILD_408_PROTOCOL_MAJOR &&
        item.supportedPeerMajors.includes(BUILD_408_PROTOCOL_MAJOR) &&
        item.independentDeployAllowed &&
        item.lockstepReleaseRequired === false &&
        item.additiveChangesBackwardCompatible &&
        item.breakingChangesRequireMajorBump &&
        item.breakingChangesRequireExplicitPeerHandoff &&
        item.unknownCapabilitiesFailClosed &&
        item.peerUnavailableLocalOperationsContinue &&
        item.peerUnavailableCrossAppCapabilityBlocks &&
        item.schemaNegotiationRequired &&
        item.rawSecretSynchronizationAllowed === false &&
        item.directPeerDatabaseSynchronizationAllowed === false &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "COMPATIBLE"
      )
  );

  const governanceState =
    !build407Eligible
      ? ("HOLD_BUILD407_NOT_ENFORCED" as const)
      : missingAuthorization.length
        ? ("AUTHORIZATION_POLICY_REQUIRED" as const)
        : invalidAuthorization.length
          ? ("AUTHORIZATION_POLICY_INVALID" as const)
          : missingConsent.length
            ? ("CONSENT_POLICY_REQUIRED" as const)
            : invalidConsent.length
              ? ("CONSENT_POLICY_INVALID" as const)
              : missingTenantIsolation.length
                ? ("TENANT_ISOLATION_EVIDENCE_REQUIRED" as const)
                : invalidTenantIsolation.length
                  ? ("TENANT_ISOLATION_INVALID" as const)
                  : missingDelegatedCapabilities.length
                    ? ("DELEGATED_CAPABILITY_RECERTIFICATION_REQUIRED" as const)
                    : invalidDelegatedCapabilities.length
                      ? ("DELEGATED_CAPABILITY_INVALID" as const)
                      : missingSyncContracts.length
                        ? ("SYNC_COMPATIBILITY_CONTRACT_REQUIRED" as const)
                        : invalidSyncContracts.length
                          ? ("SYNC_COMPATIBILITY_INVALID" as const)
                          : ("FINE_GRAINED_AUTHORIZATION_CONSENT_AND_INDEPENDENT_SYNC_RECERTIFIED" as const);

  return {
    schema: BUILD_408_SCHEMA,
    build: BUILD_408,
    build407Eligible,
    governanceState,
    missingAuthorization,
    invalidAuthorization,
    missingConsent,
    invalidConsent,
    missingTenantIsolation,
    invalidTenantIsolation,
    missingDelegatedCapabilities,
    invalidDelegatedCapabilities,
    missingSyncContracts,
    invalidSyncContracts,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      accessTiersPerApplication: BUILD_406_ACCESS_TIERS.length,
      requiredAuthorizationPolicies: requiredAuthorizationKeys.length,
      consentPolicies: BUILD_405_APPLICATION_IDS.length,
      tenantIsolationProfiles: BUILD_405_APPLICATION_IDS.length,
      delegatedDirectionalRelationships: requiredDelegationKeys.length,
      syncCompatibilityContracts: BUILD_405_APPLICATION_IDS.length
    },
    policy: {
      protocolVersion: BUILD_408_PROTOCOL_MAJOR + "." + BUILD_408_PROTOCOL_MINOR,
      compatibleWithExistingProtocol: "1.0",
      lockstepReleaseRequired: false,
      applicationLocalChangesMayReleaseIndependently: true,
      peerContractCompatibilityRequiredForCrossAppCapabilities: true,
      unavailablePeerBlocksOnlyDependentCrossAppCapability: true,
      unrelatedLocalOperationsContinue: true,
      additiveChangesMustRemainBackwardCompatible: true,
      breakingChangesRequireMajorVersionBump: true,
      breakingChangesRequireExplicitPeerHandoff: true,
      unknownCapabilitiesFailClosed: true,
      rawSecretSynchronizationAllowed: false,
      directPeerDatabaseSynchronizationAllowed: false,
      vercelQuotaOnOneApplicationDoesNotBlockUnrelatedPeerRelease: true,
      productionGreenImpliesPeerRuntimeConnected: false
    }
  };
}

export type Build408GovernanceAssessment = ReturnType<
  typeof assessBuild408Governance
>;
