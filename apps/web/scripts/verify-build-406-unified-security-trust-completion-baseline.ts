import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build405GovernanceAssessment } from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_405_APPLICATION_IDS,
  BUILD_405_COMMUNICATION_CHANNELS,
  BUILD_405_COMMUNICATION_RELATIONSHIPS
} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_406,
  BUILD_406_ACCESS_TIERS,
  BUILD_406_COMPLETION_ASPECTS,
  BUILD_406_CONTROL_DOMAINS,
  assessBuild406Governance
} from "../lib/master-unified-security-trust-completion-baseline";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const build405Verified = {
  governanceState: "ASSURANCE_RENEWAL_RECERTIFIED_AND_ACCELERATION_TARGETED"
} as unknown as Build405GovernanceAssessment;

assert.equal(BUILD_406, 406);
assert.equal(BUILD_405_APPLICATION_IDS.length, 7);
assert.equal(BUILD_406_ACCESS_TIERS.length, 6);
assert.equal(BUILD_406_CONTROL_DOMAINS.length, 5);
assert.equal(BUILD_405_COMMUNICATION_RELATIONSHIPS.length, 14);
assert.equal(BUILD_406_COMPLETION_ASPECTS.length, 13);

const securityTierBaselines = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
  BUILD_406_ACCESS_TIERS.map((accessTier) => ({
    baselineId: "security-" + appId + "-" + accessTier,
    appId,
    accessTier,
    controlDomains: [...BUILD_406_CONTROL_DOMAINS],
    policyVersion: 1,
    sourceIdentityBound: true,
    resourceScopeDefined: true,
    tenantBoundaryDefined: true,
    denyByDefault: true,
    t5NonRoutable: true,
    ownerReviewed: true,
    independentlyVerified: true,
    baselineState: "BASELINED" as const,
    observedAt: "2026-11-15T13:00:00.000Z"
  }))
);

const trustMatrixBaselines = BUILD_405_COMMUNICATION_RELATIONSHIPS.map(
  ([leftAppId, rightAppId]) => ({
    baselineId: "trust-" + leftAppId + "-" + rightAppId,
    leftAppId,
    rightAppId,
    allowedChannels: [...BUILD_405_COMMUNICATION_CHANNELS],
    maxRoutableAccessTier: "T4_MASTER_GOVERNANCE" as const,
    sourceIdentityVerified: true,
    targetIdentityVerified: true,
    tenantScopeVerified: true,
    transitiveTrustAllowed: false,
    directPeerDatabaseWrite: false,
    rawSecretsAllowed: false,
    delegatedAuthority: false,
    ownerGateForConsequentialWrites: true,
    ownerReviewed: true,
    independentlyVerified: true,
    trustState: "VERIFIED" as const,
    observedAt: "2026-11-15T13:01:00.000Z"
  })
);

const completionDenominators = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
  BUILD_406_COMPLETION_ASPECTS.map((aspect) => ({
    baselineId: "denominator-" + appId + "-" + aspect,
    appId,
    aspect,
    applicableRequirementCount: 20,
    verifiedRequirementCount: 12,
    baselinePercent: 60,
    targetPercent: 70,
    denominatorHashSha256: "c".repeat(64),
    denominatorLocked: true,
    ownerApproved: true,
    independentlyVerified: true,
    baselineState: "LOCKED" as const,
    observedAt: "2026-11-15T13:02:00.000Z"
  }))
);

assert.equal(securityTierBaselines.length, 42);
assert.equal(trustMatrixBaselines.length, 14);
assert.equal(completionDenominators.length, 91);

assert.equal(
  assessBuild406Governance({
    build405: { governanceState: "HOLD" } as unknown as Build405GovernanceAssessment,
    securityTierBaselines,
    trustMatrixBaselines,
    completionDenominators
  }).governanceState,
  "HOLD_BUILD405_NOT_VERIFIED"
);

assert.equal(
  assessBuild406Governance({ build405: build405Verified }).governanceState,
  "SECURITY_TIER_BASELINE_REQUIRED"
);

const invalidSecurity = securityTierBaselines.map((item) =>
  item.appId === "rosevear-ai-hub" &&
  item.accessTier === "T5_ORIGINAL_HOST_OWNER_CEREMONY"
    ? { ...item, t5NonRoutable: false, baselineState: "FAILED" as const }
    : item
);
assert.equal(
  assessBuild406Governance({
    build405: build405Verified,
    securityTierBaselines: invalidSecurity
  }).governanceState,
  "SECURITY_TIER_BASELINE_INVALID"
);

const invalidTrust = trustMatrixBaselines.map((item) =>
  item.leftAppId === "rosevear-comms-hub" && item.rightAppId === "rosiedazzlers"
    ? {
        ...item,
        transitiveTrustAllowed: true,
        trustState: "FAILED" as const
      }
    : item
);
assert.equal(
  assessBuild406Governance({
    build405: build405Verified,
    securityTierBaselines,
    trustMatrixBaselines: invalidTrust
  }).governanceState,
  "TRUST_MATRIX_BASELINE_INVALID"
);

const invalidDenominator = completionDenominators.map((item) =>
  item.appId === "icamp" && item.aspect === "security-privacy"
    ? {
        ...item,
        targetPercent: 65,
        baselineState: "HOLD" as const
      }
    : item
);
assert.equal(
  assessBuild406Governance({
    build405: build405Verified,
    securityTierBaselines,
    trustMatrixBaselines,
    completionDenominators: invalidDenominator
  }).governanceState,
  "COMPLETION_DENOMINATOR_BASELINE_INVALID"
);

const verified = assessBuild406Governance({
  build405: build405Verified,
  securityTierBaselines,
  trustMatrixBaselines,
  completionDenominators
});
assert.equal(
  verified.governanceState,
  "UNIFIED_SECURITY_TRUST_AND_COMPLETION_BASELINE_VERIFIED"
);
assert.equal(verified.counts.requiredSecurityTierBaselines, 42);
assert.equal(verified.counts.canonicalTrustRelationships, 14);
assert.equal(verified.counts.completionDenominators, 91);
assert.equal(verified.policy.sixAccessTiersAreCanonical, true);
assert.equal(
  verified.policy.build405FiveSecurityTiersRetainedAsControlDomains,
  true
);
assert.equal(verified.policy.t5MayRouteOverOrdinaryTransport, false);
assert.equal(verified.policy.t4MayGrantT5, false);
assert.equal(verified.policy.transitiveTrustAllowed, false);
assert.equal(verified.policy.rawSecretsMayCrossApplications, false);
assert.equal(verified.policy.directPeerDatabaseWritesAllowed, false);
assert.equal(verified.policy.delegatedOperationalAuthorityAllowed, false);
assert.equal(verified.policy.completionTargetIncreasePoints, 10);

const manifest = JSON.parse(
  source("../../.github/rosevear-unified-security-trust-completion-baseline.v1.json")
);
assert.equal(manifest.accessTiers.length, 6);
assert.equal(manifest.controlDomains.length, 5);
assert.equal(manifest.relationships.length, 14);
assert.equal(manifest.completionAspects.length, 13);
assert.equal(manifest.trustPolicy.t5Routable, false);
assert.equal(manifest.trustPolicy.t4MayGrantT5, false);
assert.equal(manifest.trustPolicy.transitiveTrustAllowed, false);

const migration = source(
  "../../db/migrations/0169_master_unified_security_trust_completion_baseline.sql"
);
for (const token of [
  "master_build406_security_tier_baselines",
  "master_build406_trust_matrix_baselines",
  "master_build406_completion_denominator_baselines",
  "T5_ORIGINAL_HOST_OWNER_CEREMONY",
  "transitive_trust_allowed=false",
  "baseline_percent+10",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_406_UNIFIED_SECURITY_TRUST_COMPLETION_BASELINE.md"
);
for (const token of [
  "six canonical access tiers",
  "five **control domains**",
  "42 required access-tier baselines",
  "14 canonical relationships",
  "91 application/aspect denominators",
  "UNIFIED_SECURITY_TRUST_AND_COMPLETION_BASELINE_VERIFIED"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 406 unified security baseline",
  "Six access tiers × five control domains",
  "Explicit 14-relationship trust matrix",
  "91 locked completion denominators",
  "T5 stays off ordinary transport"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build406_security_tier_baselines"',
  '"master_build406_trust_matrix_baselines"',
  '"master_build406_completion_denominator_baselines"',
  '"0169_master_unified_security_trust_completion_baseline.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-406-unified-security-trust-completion-baseline.ts";
assert.equal(String(pkg.scripts["verify:build406"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 406 Unified Security Tier Baseline, Cross-Application Trust Matrix & Completion Acceleration Denominator Governance verification passed."
);
