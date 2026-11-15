import {
  BUILD_405_APPLICATION_IDS,
  BUILD_405_COMMUNICATION_CHANNELS,
  BUILD_405_COMMUNICATION_RELATIONSHIPS
} from "./master-assurance-renewal-security-comms-recertification";
export type Build407CommunicationChannel =
  (typeof BUILD_405_COMMUNICATION_CHANNELS)[number];

import type { Build402ApplicationId } from "./master-forecast-recalibration-renewal-timing-linkage-continuity";
import type { Build406GovernanceAssessment } from "./master-unified-security-trust-completion-baseline";

export const BUILD_407 = 407 as const;
export const BUILD_407_SCHEMA =
  "rosevear.ai-data-platform.zero-trust-service-transport.v1" as const;
export const BUILD_407_APPROVED_BRANCHES = ["dev", "main"] as const;
export const BUILD_407_MASTER_THEME_ID =
  "rosevear-master-instrument.v1" as const;
export const BUILD_407_SLAVE_SHELL_LABEL =
  "SLAVE APPLICATION SHELL" as const;
export const BUILD_407_MAX_REQUEST_AGE_SECONDS = 300 as const;
export const BUILD_407_MAX_KEY_AGE_DAYS = 90 as const;
export const BUILD_407_MIN_TLS_VERSION = "TLSv1.2" as const;

export const BUILD_407_MASTER_APPLICATIONS = [
  "ai-data-platform",
  "rosevear-ai-hub",
  "rosevear-comms-hub"
] as const;

export const BUILD_407_SLAVE_SHELLS = ["icamp", "yw"] as const;
export const BUILD_407_DIRECT_MASTER_APPS = [
  "devilndove",
  "rosiedazzlers"
] as const;

export type Build407ServicePrincipal = {
  principalId: string;
  appId: Build402ApplicationId;
  issuer: string;
  subject: string;
  audienceNamespace: string;
  algorithm: "Ed25519";
  keyId: string;
  publicKeyReference: string;
  privateKeyIncluded: false;
  sourceIdentityBound: boolean;
  tenantBoundaryBound: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ENROLLED" | "HOLD" | "REVOKED";
  observedAt: string;
};

export type Build407KeyRotationReceipt = {
  receiptId: string;
  appId: Build402ApplicationId;
  currentKeyId: string;
  previousKeyId: string | null;
  pinDigestSha256: string;
  publicKeyReference: string;
  secretReferenceName: string;
  rawSecretIncluded: false;
  rotationIntervalDays: number;
  overlapWindowHours: number;
  revokedPreviousKey: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ROTATION_VERIFIED" | "HOLD" | "EXPIRED";
  observedAt: string;
};

export type Build407TransportPolicy = {
  policyId: string;
  sourceAppId: Build402ApplicationId;
  targetAppId: Build402ApplicationId;
  allowedChannels: Build407CommunicationChannel[];
  transportKind: "direct-https" | "trusted-local-relay" | "approved-cloud-relay";
  minimumTlsVersion: typeof BUILD_407_MIN_TLS_VERSION;
  certificateValidation: "verify-full";
  signedRequestsRequired: true;
  issuerBindingRequired: true;
  audienceBindingRequired: true;
  bodyDigestRequired: true;
  nonceRequired: true;
  replayProtectionRequired: true;
  maxRequestAgeSeconds: number;
  secretlessRouting: true;
  rawSecretsAllowed: false;
  t5Allowed: false;
  directPeerDatabaseWrite: false;
  delegatedAuthority: false;
  consequentialWritesRequireOwnerGate: true;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ENFORCED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build407SignedRequestEvidence = {
  evidenceId: string;
  sourceAppId: Build402ApplicationId;
  targetAppId: Build402ApplicationId;
  channel: Build407CommunicationChannel;
  keyId: string;
  issuer: string;
  audience: string;
  nonceDigestSha256: string;
  bodyDigestSha256: string;
  signatureVerified: boolean;
  issuerVerified: boolean;
  audienceVerified: boolean;
  nonceAcceptedOnce: boolean;
  requestAgeSeconds: number;
  tlsVerified: boolean;
  secretlessRouteVerified: boolean;
  authorityPreserved: boolean;
  state: "VERIFIED" | "HOLD" | "REJECTED";
  observedAt: string;
};

function key(left: string, right: string) {
  return left + "::" + right;
}

function latestByKey<T extends { observedAt: string }>(
  records: readonly T[],
  keyOf: (item: T) => string
) {
  const latest = new Map<string, T>();
  for (const item of [...records].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    const itemKey = keyOf(item);
    if (!latest.has(itemKey)) latest.set(itemKey, item);
  }
  return latest;
}

export const BUILD_407_DIRECTIONAL_RELATIONSHIPS =
  BUILD_405_COMMUNICATION_RELATIONSHIPS.flatMap(([left, right]) => [
    [left, right] as const,
    [right, left] as const
  ]);

export function assessBuild407Governance(input: {
  build406: Build406GovernanceAssessment;
  servicePrincipals?: readonly Build407ServicePrincipal[];
  keyRotations?: readonly Build407KeyRotationReceipt[];
  transportPolicies?: readonly Build407TransportPolicy[];
  signedRequestEvidence?: readonly Build407SignedRequestEvidence[];
}) {
  const build406Eligible =
    input.build406.governanceState ===
    "UNIFIED_SECURITY_TRUST_AND_COMPLETION_BASELINE_VERIFIED";

  const principals = latestByKey(
    input.servicePrincipals ?? [],
    (item) => item.appId
  );
  const missingPrincipals = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !principals.has(appId)
  );
  const invalidPrincipals = BUILD_405_APPLICATION_IDS.filter((appId) => {
    const item = principals.get(appId);
    if (!item) return false;
    return !(
      item.algorithm === "Ed25519" &&
      item.issuer.length >= 8 &&
      item.subject.length >= 8 &&
      item.audienceNamespace.length >= 8 &&
      item.keyId.length >= 6 &&
      item.publicKeyReference.length >= 8 &&
      item.privateKeyIncluded === false &&
      item.sourceIdentityBound &&
      item.tenantBoundaryBound &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "ENROLLED"
    );
  });

  const rotations = latestByKey(
    input.keyRotations ?? [],
    (item) => item.appId
  );
  const missingRotations = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !rotations.has(appId)
  );
  const invalidRotations = BUILD_405_APPLICATION_IDS.filter((appId) => {
    const item = rotations.get(appId);
    if (!item) return false;
    return !(
      item.currentKeyId.length >= 6 &&
      /^[0-9a-f]{64}$/.test(item.pinDigestSha256) &&
      item.publicKeyReference.length >= 8 &&
      item.secretReferenceName.length >= 8 &&
      item.rawSecretIncluded === false &&
      Number.isInteger(item.rotationIntervalDays) &&
      item.rotationIntervalDays >= 1 &&
      item.rotationIntervalDays <= BUILD_407_MAX_KEY_AGE_DAYS &&
      Number.isInteger(item.overlapWindowHours) &&
      item.overlapWindowHours >= 0 &&
      item.overlapWindowHours <= 168 &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "ROTATION_VERIFIED"
    );
  });

  const policies = latestByKey(
    input.transportPolicies ?? [],
    (item) => key(item.sourceAppId, item.targetAppId)
  );
  const requiredPolicyKeys = BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(
    ([source, target]) => key(source, target)
  );
  const missingPolicies = requiredPolicyKeys.filter(
    (policyKey) => !policies.has(policyKey)
  );
  const invalidPolicies = requiredPolicyKeys.filter((policyKey) => {
    const item = policies.get(policyKey);
    if (!item) return false;
    const channels = new Set(item.allowedChannels);
    return !(
      channels.has("SECURITY_EVIDENCE") &&
      channels.has("HEALTH_EVIDENCE") &&
      channels.has("CORRELATION_EVENT") &&
      item.minimumTlsVersion === BUILD_407_MIN_TLS_VERSION &&
      item.certificateValidation === "verify-full" &&
      item.signedRequestsRequired === true &&
      item.issuerBindingRequired === true &&
      item.audienceBindingRequired === true &&
      item.bodyDigestRequired === true &&
      item.nonceRequired === true &&
      item.replayProtectionRequired === true &&
      item.maxRequestAgeSeconds > 0 &&
      item.maxRequestAgeSeconds <= BUILD_407_MAX_REQUEST_AGE_SECONDS &&
      item.secretlessRouting === true &&
      item.rawSecretsAllowed === false &&
      item.t5Allowed === false &&
      item.directPeerDatabaseWrite === false &&
      item.delegatedAuthority === false &&
      item.consequentialWritesRequireOwnerGate === true &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "ENFORCED"
    );
  });

  const evidence = latestByKey(
    input.signedRequestEvidence ?? [],
    (item) => key(item.sourceAppId, item.targetAppId)
  );
  const missingEvidence = requiredPolicyKeys.filter(
    (policyKey) => !evidence.has(policyKey)
  );
  const invalidEvidence = requiredPolicyKeys.filter((policyKey) => {
    const item = evidence.get(policyKey);
    if (!item) return false;
    return !(
      BUILD_405_COMMUNICATION_CHANNELS.includes(item.channel) &&
      item.keyId.length >= 6 &&
      item.issuer.length >= 8 &&
      item.audience.length >= 8 &&
      /^[0-9a-f]{64}$/.test(item.nonceDigestSha256) &&
      /^[0-9a-f]{64}$/.test(item.bodyDigestSha256) &&
      item.signatureVerified &&
      item.issuerVerified &&
      item.audienceVerified &&
      item.nonceAcceptedOnce &&
      item.requestAgeSeconds >= 0 &&
      item.requestAgeSeconds <= BUILD_407_MAX_REQUEST_AGE_SECONDS &&
      item.tlsVerified &&
      item.secretlessRouteVerified &&
      item.authorityPreserved &&
      item.state === "VERIFIED"
    );
  });

  const directAppMasterRoutes = BUILD_407_DIRECT_MASTER_APPS.flatMap(
    (directApp) =>
      BUILD_407_MASTER_APPLICATIONS.map((master) => key(directApp, master))
  );
  const directAppsReachAllMasters = directAppMasterRoutes.every((route) =>
    policies.has(route)
  );

  const governanceState =
    !build406Eligible
      ? ("HOLD_BUILD406_NOT_VERIFIED" as const)
      : missingPrincipals.length
        ? ("SERVICE_PRINCIPAL_ENROLLMENT_REQUIRED" as const)
        : invalidPrincipals.length
          ? ("SERVICE_PRINCIPAL_INVALID" as const)
          : missingRotations.length
            ? ("KEY_ROTATION_EVIDENCE_REQUIRED" as const)
            : invalidRotations.length
              ? ("KEY_ROTATION_INVALID" as const)
              : missingPolicies.length
                ? ("TRANSPORT_POLICY_REQUIRED" as const)
                : invalidPolicies.length
                  ? ("TRANSPORT_POLICY_INVALID" as const)
                  : !directAppsReachAllMasters
                    ? ("DIRECT_APPLICATION_MASTER_ROUTE_REQUIRED" as const)
                    : missingEvidence.length
                      ? ("SIGNED_REQUEST_EVIDENCE_REQUIRED" as const)
                      : invalidEvidence.length
                        ? ("SIGNED_REQUEST_EVIDENCE_INVALID" as const)
                        : ("ZERO_TRUST_SERVICE_TRANSPORT_ENFORCED" as const);

  return {
    schema: BUILD_407_SCHEMA,
    build: BUILD_407,
    build406Eligible,
    missingPrincipals,
    invalidPrincipals,
    missingRotations,
    invalidRotations,
    missingPolicies,
    invalidPolicies,
    missingEvidence,
    invalidEvidence,
    directAppsReachAllMasters,
    governanceState,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      directionalTransportPolicies: requiredPolicyKeys.length,
      servicePrincipals: BUILD_405_APPLICATION_IDS.length,
      keyRotationReceipts: BUILD_405_APPLICATION_IDS.length,
      directApplicationMasterRoutes: directAppMasterRoutes.length
    },
    policy: {
      approvedBranches: [...BUILD_407_APPROVED_BRANCHES],
      otherBranchesAreCleanupOnly: true,
      masterThemeId: BUILD_407_MASTER_THEME_ID,
      slaveShellLabel: BUILD_407_SLAVE_SHELL_LABEL,
      masterApplicationsShareTheme: true,
      slaveApplicationsMayKeepOwnThemes: true,
      t5MayTraverseOrdinaryTransport: false,
      signedRequestsRequired: true,
      ed25519Required: true,
      audienceBindingRequired: true,
      replayProtectionRequired: true,
      rawSecretsMayCrossApplications: false,
      secretReferencesOnly: true,
      directPeerDatabaseWritesAllowed: false,
      delegatedAuthorityAllowed: false,
      consequentialWritesRequireOwnerGate: true,
      postgresSslMode: "verify-full",
      productionGreenImpliesRuntimeConnected: false
    }
  };
}

export type Build407GovernanceAssessment = ReturnType<
  typeof assessBuild407Governance
>;
