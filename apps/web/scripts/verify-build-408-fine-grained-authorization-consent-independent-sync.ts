import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";

import {
  BUILD_405_APPLICATION_IDS
} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_406_ACCESS_TIERS
} from "../lib/master-unified-security-trust-completion-baseline";
import {
  BUILD_407_DIRECTIONAL_RELATIONSHIPS,
  type Build407GovernanceAssessment
} from "../lib/master-zero-trust-service-transport";
import {
  BUILD_408,
  BUILD_408_MAX_DELEGATION_HOURS,
  BUILD_408_PROTOCOL_MAJOR,
  BUILD_408_PROTOCOL_MINOR,
  BUILD_408_TIER_SUBJECT_SCOPE,
  assessBuild408Governance,
  type Build408AuthorizationPolicy,
  type Build408ConsentPolicyReceipt,
  type Build408DelegatedCapabilityRecertification,
  type Build408SyncCompatibilityContract,
  type Build408TenantIsolationEvidence
} from "../lib/master-fine-grained-authorization-consent-independent-sync";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  readFileSync(path.resolve(root, relative), "utf8");

assert.equal(BUILD_408, 408);
assert.equal(BUILD_405_APPLICATION_IDS.length, 7);
assert.equal(BUILD_406_ACCESS_TIERS.length, 6);
assert.equal(BUILD_407_DIRECTIONAL_RELATIONSHIPS.length, 28);
assert.equal(BUILD_408_PROTOCOL_MAJOR, 1);
assert.equal(BUILD_408_PROTOCOL_MINOR, 1);
assert.equal(BUILD_408_MAX_DELEGATION_HOURS, 24);

const observedAt = "2026-11-15T20:00:00.000Z";
const build407Verified = {
  governanceState: "ZERO_TRUST_SERVICE_TRANSPORT_ENFORCED"
} as unknown as Build407GovernanceAssessment;

const authorizationPolicies: Build408AuthorizationPolicy[] =
  BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_406_ACCESS_TIERS.map((accessTier) => ({
      policyId: "auth-" + appId + "-" + accessTier,
      appId,
      accessTier,
      policyVersion: 1,
      subjectScope: BUILD_408_TIER_SUBJECT_SCOPE[accessTier],
      capabilityNamespace:
        appId + "." + accessTier.toLowerCase().replaceAll("_", "-"),
      allowedActions:
        accessTier === "T0_PUBLIC_READ"
          ? ["READ"]
          : accessTier === "T5_ORIGINAL_HOST_OWNER_CEREMONY"
            ? ["APPROVE"]
            : ["READ", "WRITE"],
      resourceScopeDefined: true,
      tenantBindingRequired:
        accessTier !== "T0_PUBLIC_READ" && accessTier !== "T1_USER_SCOPED",
      workspaceBindingRequired:
        accessTier === "T2_TENANT_SCOPED" ||
        accessTier === "T3_OPERATOR_SCOPED" ||
        accessTier === "T4_MASTER_GOVERNANCE",
      consentRequiredForPersonalData: accessTier !== "T0_PUBLIC_READ",
      denyByDefault: true,
      crossTenantAccessAllowed: false,
      delegatedGrantAllowed:
        accessTier !== "T0_PUBLIC_READ" &&
        accessTier !== "T5_ORIGINAL_HOST_OWNER_CEREMONY",
      t5NonDelegable: true,
      ownerReviewed: true,
      independentlyVerified: true,
      state: "CERTIFIED",
      observedAt
    }))
  );

const consentPolicies: Build408ConsentPolicyReceipt[] =
  BUILD_405_APPLICATION_IDS.map((appId) => ({
    receiptId: "consent-" + appId,
    appId,
    policyVersion: 1,
    personalDataRequiresExplicitConsent: true,
    consentPurposeBound: true,
    revocable: true,
    withdrawalPropagates: true,
    expirationEnforced: true,
    consentMayGrantNewCapability: false,
    rawPersonalDataIncludedInEvidence: false,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "CERTIFIED",
    observedAt
  }));

const tenantIsolation: Build408TenantIsolationEvidence[] =
  BUILD_405_APPLICATION_IDS.map((appId) => ({
    evidenceId: "tenant-" + appId,
    appId,
    apiBoundaryVerified: true,
    databaseRlsVerified: true,
    storageBoundaryVerified: true,
    sameTenantForeignAccessDenied: true,
    crossTenantAccessDenied: true,
    crossWorkspaceAccessDenied: true,
    evidenceCurrent: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "VERIFIED",
    observedAt
  }));

const delegatedCapabilities: Build408DelegatedCapabilityRecertification[] =
  BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([sourceAppId, targetAppId]) => ({
    receiptId: "delegate-" + sourceAppId + "-" + targetAppId,
    sourceAppId,
    targetAppId,
    capabilityNamespace: sourceAppId + ".handoff." + targetAppId,
    maxLifetimeHours: BUILD_408_MAX_DELEGATION_HOURS,
    exactCapabilityRequired: true,
    exactAudienceRequired: true,
    tenantScopePreserved: true,
    workspaceScopePreserved: true,
    consentScopePreserved: true,
    subdelegationAllowed: false,
    authorityTransfer: false,
    t5DelegationAllowed: false,
    revocationPropagationRequired: true,
    consequentialWritesRequireOwnerGate: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "RECERTIFIED",
    observedAt
  }));

const syncContracts: Build408SyncCompatibilityContract[] =
  BUILD_405_APPLICATION_IDS.map((appId) => ({
    contractId: "sync-" + appId,
    appId,
    protocolMajor: BUILD_408_PROTOCOL_MAJOR,
    protocolMinor: BUILD_408_PROTOCOL_MINOR,
    minimumPeerMajor: BUILD_408_PROTOCOL_MAJOR,
    supportedPeerMajors: [BUILD_408_PROTOCOL_MAJOR],
    independentDeployAllowed: true,
    lockstepReleaseRequired: false,
    additiveChangesBackwardCompatible: true,
    breakingChangesRequireMajorBump: true,
    breakingChangesRequireExplicitPeerHandoff: true,
    unknownCapabilitiesFailClosed: true,
    peerUnavailableLocalOperationsContinue: true,
    peerUnavailableCrossAppCapabilityBlocks: true,
    schemaNegotiationRequired: true,
    rawSecretSynchronizationAllowed: false,
    directPeerDatabaseSynchronizationAllowed: false,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "COMPATIBLE",
    observedAt
  }));

assert.equal(authorizationPolicies.length, 42);
assert.equal(consentPolicies.length, 7);
assert.equal(tenantIsolation.length, 7);
assert.equal(delegatedCapabilities.length, 28);
assert.equal(syncContracts.length, 7);

assert.equal(
  assessBuild408Governance({
    build407: { governanceState: "HOLD" } as unknown as Build407GovernanceAssessment,
    authorizationPolicies,
    consentPolicies,
    tenantIsolation,
    delegatedCapabilities,
    syncContracts
  }).governanceState,
  "HOLD_BUILD407_NOT_ENFORCED"
);

assert.equal(
  assessBuild408Governance({
    build407: build407Verified,
    authorizationPolicies: authorizationPolicies.slice(1),
    consentPolicies,
    tenantIsolation,
    delegatedCapabilities,
    syncContracts
  }).governanceState,
  "AUTHORIZATION_POLICY_REQUIRED"
);

const invalidAuthorization = authorizationPolicies.map((item) =>
  item.accessTier === "T0_PUBLIC_READ"
    ? { ...item, allowedActions: ["READ", "WRITE"] as const }
    : item
);
assert.equal(
  assessBuild408Governance({
    build407: build407Verified,
    authorizationPolicies: invalidAuthorization as unknown as Build408AuthorizationPolicy[],
    consentPolicies,
    tenantIsolation,
    delegatedCapabilities,
    syncContracts
  }).governanceState,
  "AUTHORIZATION_POLICY_INVALID"
);

const invalidConsent = consentPolicies.map((item, index) =>
  index === 0 ? { ...item, consentMayGrantNewCapability: true } : item
);
assert.equal(
  assessBuild408Governance({
    build407: build407Verified,
    authorizationPolicies,
    consentPolicies: invalidConsent,
    tenantIsolation,
    delegatedCapabilities,
    syncContracts
  }).governanceState,
  "CONSENT_POLICY_INVALID"
);

const invalidTenant = tenantIsolation.map((item, index) =>
  index === 0 ? { ...item, crossTenantAccessDenied: false } : item
);
assert.equal(
  assessBuild408Governance({
    build407: build407Verified,
    authorizationPolicies,
    consentPolicies,
    tenantIsolation: invalidTenant,
    delegatedCapabilities,
    syncContracts
  }).governanceState,
  "TENANT_ISOLATION_INVALID"
);

const invalidDelegation = delegatedCapabilities.map((item, index) =>
  index === 0 ? { ...item, subdelegationAllowed: true } : item
);
assert.equal(
  assessBuild408Governance({
    build407: build407Verified,
    authorizationPolicies,
    consentPolicies,
    tenantIsolation,
    delegatedCapabilities: invalidDelegation,
    syncContracts
  }).governanceState,
  "DELEGATED_CAPABILITY_INVALID"
);

const invalidSync = syncContracts.map((item, index) =>
  index === 0 ? { ...item, lockstepReleaseRequired: true } : item
);
assert.equal(
  assessBuild408Governance({
    build407: build407Verified,
    authorizationPolicies,
    consentPolicies,
    tenantIsolation,
    delegatedCapabilities,
    syncContracts: invalidSync
  }).governanceState,
  "SYNC_COMPATIBILITY_INVALID"
);

const verified = assessBuild408Governance({
  build407: build407Verified,
  authorizationPolicies,
  consentPolicies,
  tenantIsolation,
  delegatedCapabilities,
  syncContracts
});
assert.equal(
  verified.governanceState,
  "FINE_GRAINED_AUTHORIZATION_CONSENT_AND_INDEPENDENT_SYNC_RECERTIFIED"
);
assert.equal(verified.counts.requiredAuthorizationPolicies, 42);
assert.equal(verified.counts.consentPolicies, 7);
assert.equal(verified.counts.tenantIsolationProfiles, 7);
assert.equal(verified.counts.delegatedDirectionalRelationships, 28);
assert.equal(verified.counts.syncCompatibilityContracts, 7);
assert.equal(verified.policy.protocolVersion, "1.1");
assert.equal(verified.policy.compatibleWithExistingProtocol, "1.0");
assert.equal(verified.policy.lockstepReleaseRequired, false);
assert.equal(verified.policy.applicationLocalChangesMayReleaseIndependently, true);
assert.equal(
  verified.policy.vercelQuotaOnOneApplicationDoesNotBlockUnrelatedPeerRelease,
  true
);
assert.equal(verified.policy.rawSecretSynchronizationAllowed, false);
assert.equal(verified.policy.directPeerDatabaseSynchronizationAllowed, false);
assert.equal(verified.policy.productionGreenImpliesPeerRuntimeConnected, false);

const manifest = JSON.parse(
  source("../../.github/rosevear-fine-grained-authorization-consent-independent-sync.v1.json")
);
assert.equal(manifest.protocol.major, 1);
assert.equal(manifest.protocol.minor, 1);
assert.equal(manifest.releaseCoordination.compatibleWithExistingProtocol, "1.0");
assert.equal(manifest.releaseCoordination.lockstepReleaseRequired, false);
assert.equal(
  manifest.releaseCoordination.applicationLocalChangesMayReleaseIndependently,
  true
);
assert.equal(
  manifest.releaseCoordination.unavailablePeerBlocksOnlyDependentCrossAppCapability,
  true
);
assert.equal(manifest.releaseCoordination.unrelatedLocalOperationsContinue, true);
assert.equal(
  manifest.releaseCoordination.vercelQuotaOnOneApplicationDoesNotBlockUnrelatedPeerRelease,
  true
);

const migration = source(
  "../../db/migrations/0171_master_fine_grained_authorization_consent_independent_sync.sql"
);
for (const token of [
  "master_build408_authorization_policies",
  "master_build408_consent_policy_receipts",
  "master_build408_tenant_isolation_evidence",
  "master_build408_delegated_capability_recertifications",
  "master_build408_sync_compatibility_contracts",
  "max_lifetime_hours between 1 and 24",
  "lockstep_release_required=false",
  "raw_secret_synchronization_allowed=false",
  "direct_peer_database_synchronization_allowed=false",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_408_FINE_GRAINED_AUTHORIZATION_CONSENT_INDEPENDENT_SYNC.md"
);
for (const token of [
  "42 required fine-grained authorization policies",
  "All 28 directional Build 407 relationships",
  "protocol **1.1**",
  "Lockstep release is **not required**",
  "Vercel daily-limit hold",
  "synchronized by contract rather than by simultaneous deployment",
  "FINE_GRAINED_AUTHORIZATION_CONSENT_AND_INDEPENDENT_SYNC_RECERTIFIED"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 408 fine-grained authorization",
  "42 capability-tier policies",
  "Consent + tenant isolation",
  "28 bounded delegations",
  "Independent releases · protocol 1.1"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build408_authorization_policies"',
  '"master_build408_consent_policy_receipts"',
  '"master_build408_tenant_isolation_evidence"',
  '"master_build408_delegated_capability_recertifications"',
  '"master_build408_sync_compatibility_contracts"',
  '"0171_master_fine_grained_authorization_consent_independent_sync.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-408-fine-grained-authorization-consent-independent-sync.ts";
assert.equal(String(pkg.scripts["verify:build408"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 408 Fine-Grained Authorization, Consent, Tenant Isolation & Delegated Capability Re-Certification verification passed."
);
