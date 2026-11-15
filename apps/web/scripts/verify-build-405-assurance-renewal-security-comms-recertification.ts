import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build404GovernanceAssessment } from "../lib/master-long-horizon-recalibration-recovery-linkage-assurance";
import {
  BUILD_405,
  BUILD_405_APPLICATION_IDS,
  BUILD_405_COMMUNICATION_CHANNELS,
  BUILD_405_COMMUNICATION_RELATIONSHIPS,
  BUILD_405_MIN_COMPLETION_ADVANCE_POINTS,
  BUILD_405_SECURITY_TIERS,
  assessBuild405Governance
} from "../lib/master-assurance-renewal-security-comms-recertification";
import { MASTER_COMPLETION_AXES } from "../lib/master-completion-core";
import { MASTER_SECURITY_CERTIFICATION_DIMENSIONS } from "../lib/master-security-certification-core";
import {
  BUILD_402_APPLICATION_REPOSITORIES,
  BUILD_402_TOPOLOGY_ID
} from "../lib/master-forecast-recalibration-renewal-timing-linkage-continuity";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const build404Verified = {
  governanceState: "LONG_HORIZON_PREVENTION_ASSURANCE_GOVERNANCE_VERIFIED"
} as unknown as Build404GovernanceAssessment;

assert.equal(BUILD_405, 405);
assert.equal(BUILD_405_APPLICATION_IDS.length, 7);
assert.equal(BUILD_405_SECURITY_TIERS.length, 5);
assert.equal(BUILD_405_COMMUNICATION_RELATIONSHIPS.length, 14);
assert.equal(MASTER_COMPLETION_AXES.length, 7);
assert.equal(BUILD_405_MIN_COMPLETION_ADVANCE_POINTS, 10);

const renewals = BUILD_405_APPLICATION_IDS.map((appId) => ({
  renewalId: "renewal-" + appId,
  appId,
  repository: BUILD_402_APPLICATION_REPOSITORIES[appId],
  topologyId: BUILD_402_TOPOLOGY_ID,
  productionMainSha: "a".repeat(40),
  manifestSha256: "b".repeat(64),
  evidenceAgeHours: 1,
  renewalWindowHours: 192,
  sampleCount: 8,
  continuityBreakCount: 0,
  staleEvidenceRecurrenceCount: 0,
  authorityTransferCount: 0,
  ownerReviewed: true,
  independentlyVerified: true,
  renewalState: "RENEWED" as const,
  observedAt: "2026-11-15T01:05:00.000Z"
}));

const recovery = BUILD_405_APPLICATION_IDS.map((appId) => ({
  effectivenessId: "effectiveness-" + appId,
  appId,
  observationWindowHours: 96,
  sampleCount: 6,
  recoveryEventCount: 4,
  degradedRecoveryEventCount: 0,
  unresolvedDegradationCount: 0,
  effectivenessPercent: 100,
  recurrenceCount: 0,
  ownerReviewed: true,
  independentlyVerified: true,
  effectivenessState: "EFFECTIVE" as const,
  observedAt: "2026-11-15T01:06:00.000Z"
}));

const security = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
  BUILD_405_SECURITY_TIERS.map((tier) => ({
    recertificationId: "security-" + appId + "-" + tier,
    appId,
    tier,
    passedDimensions: [...MASTER_SECURITY_CERTIFICATION_DIMENSIONS],
    evidenceAgeHours: 1,
    sourceIdentityVerified: true,
    tenantIsolationVerified: true,
    secretsExcluded: true,
    authorityPreserved: true,
    ownerReviewed: true,
    independentlyVerified: true,
    recertificationState: "RECERTIFIED" as const,
    observedAt: "2026-11-15T01:07:00.000Z"
  }))
);

const communications = BUILD_405_COMMUNICATION_RELATIONSHIPS.map(
  ([leftAppId, rightAppId]) => ({
    relationshipId: leftAppId + "--" + rightAppId,
    leftAppId,
    rightAppId,
    channels: [...BUILD_405_COMMUNICATION_CHANNELS],
    evidenceAgeHours: 1,
    transportAuthenticated: true,
    sourceIdentityVerified: true,
    targetAudienceVerified: true,
    tenantBoundaryVerified: true,
    replayProtectionVerified: true,
    payloadClassified: true,
    secretsExcluded: true,
    authorityPreserved: true,
    ownerGateForConsequentialWrites: true,
    directPeerDatabaseWrite: false,
    recertificationState: "RECERTIFIED" as const,
    observedAt: "2026-11-15T01:08:00.000Z"
  })
);

const completionTargets = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
  MASTER_COMPLETION_AXES.map((axis) => ({
    targetId: "target-" + appId + "-" + axis,
    appId,
    axis,
    baselinePercent: 60,
    targetPercent: 70,
    denominatorLocked: true,
    ownerApproved: true,
    independentEvidenceRequired: true,
    targetState: "TARGET_SET" as const,
    observedAt: "2026-11-15T01:09:00.000Z"
  }))
);

assert.equal(security.length, 35);
assert.equal(completionTargets.length, 49);

assert.equal(
  assessBuild405Governance({
    build404: { governanceState: "HOLD" } as unknown as Build404GovernanceAssessment,
    assuranceRenewals: renewals,
    recoveryEffectiveness: recovery,
    securityTierRecertifications: security,
    communicationRecertifications: communications,
    completionTargets
  }).governanceState,
  "HOLD_BUILD404_NOT_VERIFIED"
);

assert.equal(
  assessBuild405Governance({ build404: build404Verified }).governanceState,
  "ASSURANCE_RENEWAL_EVIDENCE_REQUIRED"
);

const degradedRenewal = renewals.map((item) =>
  item.appId === "icamp"
    ? { ...item, continuityBreakCount: 1, renewalState: "DEGRADED" as const }
    : item
);
assert.equal(
  assessBuild405Governance({
    build404: build404Verified,
    assuranceRenewals: degradedRenewal
  }).governanceState,
  "LONG_HORIZON_ASSURANCE_RENEWAL_DEGRADED"
);

const degradedRecovery = recovery.map((item) =>
  item.appId === "yw"
    ? {
        ...item,
        degradedRecoveryEventCount: 2,
        unresolvedDegradationCount: 1,
        effectivenessPercent: 90,
        effectivenessState: "DEGRADED" as const
      }
    : item
);
assert.equal(
  assessBuild405Governance({
    build404: build404Verified,
    assuranceRenewals: renewals,
    recoveryEffectiveness: degradedRecovery
  }).governanceState,
  "RECOVERY_EFFECTIVENESS_DEGRADATION_DETECTED"
);

const failedSecurity = security.map((item) =>
  item.appId === "rosiedazzlers" &&
  item.tier === "T3_AUTHORIZATION_TENANT_CONSENT"
    ? {
        ...item,
        passedDimensions: item.passedDimensions.filter(
          (dimension) => dimension !== "consent"
        ),
        recertificationState: "FAILED" as const
      }
    : item
);
assert.equal(
  assessBuild405Governance({
    build404: build404Verified,
    assuranceRenewals: renewals,
    recoveryEffectiveness: recovery,
    securityTierRecertifications: failedSecurity
  }).governanceState,
  "SECURITY_TIER_RECERTIFICATION_FAILED"
);

const failedCommunication = communications.map((item) =>
  item.leftAppId === "rosevear-comms-hub" && item.rightAppId === "devilndove"
    ? {
        ...item,
        replayProtectionVerified: false,
        recertificationState: "FAILED" as const
      }
    : item
);
assert.equal(
  assessBuild405Governance({
    build404: build404Verified,
    assuranceRenewals: renewals,
    recoveryEffectiveness: recovery,
    securityTierRecertifications: security,
    communicationRecertifications: failedCommunication
  }).governanceState,
  "COMMUNICATION_RECERTIFICATION_FAILED"
);

const invalidTarget = completionTargets.map((item) =>
  item.appId === "ai-data-platform" && item.axis === "security"
    ? { ...item, targetPercent: 65 }
    : item
);
assert.equal(
  assessBuild405Governance({
    build404: build404Verified,
    assuranceRenewals: renewals,
    recoveryEffectiveness: recovery,
    securityTierRecertifications: security,
    communicationRecertifications: communications,
    completionTargets: invalidTarget
  }).governanceState,
  "COMPLETION_ACCELERATION_TARGETS_INVALID"
);

const verified = assessBuild405Governance({
  build404: build404Verified,
  assuranceRenewals: renewals,
  recoveryEffectiveness: recovery,
  securityTierRecertifications: security,
  communicationRecertifications: communications,
  completionTargets
});
assert.equal(
  verified.governanceState,
  "ASSURANCE_RENEWAL_RECERTIFIED_AND_ACCELERATION_TARGETED"
);
assert.equal(verified.counts.requiredSecurityTierRecertifications, 35);
assert.equal(verified.counts.communicationRelationships, 14);
assert.equal(verified.counts.completionAccelerationTargets, 49);
assert.equal(verified.policy.directPeerDatabaseWritesAllowed, false);
assert.equal(verified.policy.rawSecretsMayCrossApplications, false);
assert.equal(verified.policy.productionGreenImpliesRuntimeConnected, false);

const governance = JSON.parse(
  source("../../.github/rosevear-security-communications-governance.v1.json")
);
assert.equal(governance.topologyId, BUILD_402_TOPOLOGY_ID);
assert.equal(governance.validationAuthority, "ai-data-platform");
assert.equal(governance.authorityTransfer, false);
assert.equal(governance.securityTiers.length, 5);
assert.equal(governance.relationships.length, 14);
assert.equal(governance.communicationPolicy.directPeerDatabaseWrites, false);
assert.equal(governance.communicationPolicy.rawSecretSharing, false);

const migration = source(
  "../../db/migrations/0168_master_assurance_renewal_security_comms_recertification.sql"
);
for (const token of [
  "master_build405_assurance_renewals",
  "master_build405_recovery_effectiveness_degradation",
  "master_build405_security_tier_recertifications",
  "master_build405_communication_recertifications",
  "master_build405_completion_acceleration_targets",
  "baseline_percent+10",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_405_ASSURANCE_RENEWAL_SECURITY_COMMS_RECERTIFICATION.md"
);
for (const token of [
  "35 required security-tier recertifications",
  "14 canonical relationships",
  "49 targets",
  "+10 percentage points",
  "Direct peer database writes remain forbidden"
]) assert.ok(docs.includes(token), "documentation token " + token);

const roadmap = source("../../docs/NEXT_BUILDS_405_414.md");
for (const token of [
  "Build 406 — Unified Security Tier Baseline",
  "Build 407 — Zero-Trust Service-to-Service Authentication",
  "Build 408 — Fine-Grained Authorization",
  "Build 409 — Cross-Application Event/Message Contract V2",
  "Build 410 — Sensitive Data Classification",
  "Build 411 — Privileged Operations",
  "Build 412 — Cross-Application Security Incident Fusion",
  "Build 413 — Seven-Application Role/Device/Accessibility/Performance/UX Acceptance",
  "Build 414 — Seven-Application Completion Acceleration Closure"
]) assert.ok(roadmap.includes(token), "roadmap token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 405 suite acceleration governance",
  "Five-tier security re-certification",
  "14 cross-application relationships",
  "49 completion acceleration targets",
  "Authority-preserving communications"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build405_assurance_renewals"',
  '"master_build405_recovery_effectiveness_degradation"',
  '"master_build405_security_tier_recertifications"',
  '"master_build405_communication_recertifications"',
  '"master_build405_completion_acceleration_targets"',
  '"0168_master_assurance_renewal_security_comms_recertification.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-405-assurance-renewal-security-comms-recertification.ts";
assert.equal(String(pkg.scripts["verify:build405"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 405 Long-Horizon Prevention Assurance Renewal, Recovery-Effectiveness Degradation Detection & Seven-Application Linkage Assurance Re-Certification Governance verification passed."
);
