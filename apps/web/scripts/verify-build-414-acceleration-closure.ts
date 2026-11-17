import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_405_APPLICATION_IDS,
  BUILD_405_COMMUNICATION_RELATIONSHIPS,
  BUILD_405_SECURITY_TIERS
} from "../lib/master-assurance-renewal-security-comms-recertification";
import { MASTER_COMPLETION_AXES } from "../lib/master-completion-core";
import { MASTER_SECURITY_CERTIFICATION_DIMENSIONS } from "../lib/master-security-certification-core";
import {
  BUILD_414,
  BUILD_414_COMMS_AUTHORITY,
  BUILD_414_ROADMAP_ID,
  BUILD_414_WINDOWS_SERVICES,
  evaluateBuild414Closure,
  type Build414CompletionClosureEvidence,
  type Build414SecurityRecertificationEvidence,
  type Build414CommsPilotReceipt,
  type Build414HostActivationReceipt,
  type Build414RoadmapApproval
} from "../lib/master-acceleration-closure";

const observedAt = "2026-11-17T01:00:00.000Z";
const expiresAt = "2026-11-17T03:00:00.000Z";
const denominator = "a".repeat(64);

const completion: Build414CompletionClosureEvidence[] =
  BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    MASTER_COMPLETION_AXES.map((axis,index) => {
      const baselinePercent = index === 0 ? 95 : 70;
      const targetPercent = Math.min(100, baselinePercent + 10);
      return {
        evidenceId:"b414-close-"+appId+"-"+axis,
        appId,
        axis,
        baselinePercent,
        targetPercent,
        observedPercent:targetPercent,
        denominatorHash:denominator,
        baselineDenominatorHash:denominator,
        build413EvidenceDigest:"sha256:"+"b".repeat(64),
        observedAt,
        expiresAt,
        ownerReviewed:true,
        independentlyVerified:true,
        state:"CLOSED" as const
      };
    })
  );

const security: Build414SecurityRecertificationEvidence[] =
  BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_405_SECURITY_TIERS.map((tier) => ({
      evidenceId:"b414-sec-"+appId+"-"+tier,
      appId,
      tier,
      passedDimensions:[...MASTER_SECURITY_CERTIFICATION_DIMENSIONS],
      evidenceDigest:"sha256:"+"c".repeat(64),
      sourceIdentityVerified:true,
      tenantIsolationVerified:true,
      secretsExcluded:true,
      authorityPreserved:true,
      observedAt,
      expiresAt,
      ownerReviewed:true,
      independentlyVerified:true,
      state:"RECERTIFIED" as const
    }))
  );

const pilot: Build414CommsPilotReceipt[] =
  BUILD_405_COMMUNICATION_RELATIONSHIPS.map(([leftAppId,rightAppId],index) => ({
    receiptId:"b414-pilot-"+index,
    leftAppId,
    rightAppId,
    correlationId:"b414-correlation-"+index,
    messageAuthorityHolder:BUILD_414_COMMS_AUTHORITY,
    transportAuthenticated:true,
    sourceIdentityVerified:true,
    targetAudienceVerified:true,
    tenantBoundaryVerified:true,
    replayProtectionVerified:true,
    payloadClassified:true,
    secretsExcluded:true,
    authorityPreserved:true,
    ownerGateForConsequentialWrites:true,
    directPeerDatabaseWrite:false,
    deliveryAcknowledged:true,
    evidenceDigest:"sha256:"+"d".repeat(64),
    observedAt,
    expiresAt,
    ownerReviewed:true,
    independentlyVerified:true,
    state:"PASSED" as const
  }));

const host: Build414HostActivationReceipt[] =
  BUILD_414_WINDOWS_SERVICES.map((serviceId,index) => ({
    receiptId:"b414-host-"+index,
    serviceId,
    hostId:"ORIGINAL-HOST",
    signedReceiptDigest:"sha256:"+"e".repeat(64),
    startupModeVerified:true,
    serviceRunningVerified:true,
    localAuthorityPreserved:true,
    internetLossContinuityObserved:index === 0 ? true : null,
    observedAt,
    expiresAt,
    ownerReviewed:true,
    independentlyVerified:true,
    state:"ACTIVE" as const
  }));

const roadmap: Build414RoadmapApproval[] = [{
  approvalId:"b414-roadmap",
  roadmapId:BUILD_414_ROADMAP_ID,
  roadmapDigest:"sha256:"+"f".repeat(64),
  ownerUserId:"owner",
  ownerApproved:true,
  approvedAt:observedAt
}];

const assessment = evaluateBuild414Closure({
  build413GovernanceState:"SEVEN_APPLICATION_ACCEPTANCE_AND_ADVANCEMENT_ASSURED",
  completionClosure:completion,
  securityRecertification:security,
  commsPilotReceipts:pilot,
  hostActivationReceipts:host,
  roadmapApprovals:roadmap,
  nowIso:"2026-11-17T01:30:00.000Z"
});

assert.equal(BUILD_414,414);
assert.equal(assessment.counts.applications,7);
assert.equal(assessment.counts.requiredCompletionClosures,49);
assert.equal(assessment.counts.requiredSecurityRecertifications,35);
assert.equal(assessment.counts.communicationRelationships,14);
assert.equal(assessment.counts.windowsServices,3);
assert.equal(
  assessment.governanceState,
  "ACCELERATION_CYCLE_CLOSED_SECURITY_RECERTIFIED_COMMS_PILOT_VERIFIED_ROADMAP_RENEWED"
);
assert.equal(assessment.policy.directPeerDatabaseWritesAllowed,false);
assert.equal(assessment.policy.productionGreenImpliesPilotPassed,false);
assert.equal(assessment.policy.productionGreenImpliesPhysicalHostActivated,false);
assert.equal(assessment.policy.physicalHostReceiptsRequiredFor24x7Closure,true);

const changedDenominator = completion.map((item,index) =>
  index === 0 ? {...item,denominatorHash:"9".repeat(64)} : item
);
const heldCompletion = evaluateBuild414Closure({
  build413GovernanceState:"SEVEN_APPLICATION_ACCEPTANCE_AND_ADVANCEMENT_ASSURED",
  completionClosure:changedDenominator,
  securityRecertification:security,
  commsPilotReceipts:pilot,
  hostActivationReceipts:host,
  roadmapApprovals:roadmap,
  nowIso:"2026-11-17T01:30:00.000Z"
});
assert.equal(heldCompletion.governanceState,"COMPLETION_ACCELERATION_NOT_CLOSED");

const noHost = evaluateBuild414Closure({
  build413GovernanceState:"SEVEN_APPLICATION_ACCEPTANCE_AND_ADVANCEMENT_ASSURED",
  completionClosure:completion,
  securityRecertification:security,
  commsPilotReceipts:pilot,
  hostActivationReceipts:[],
  roadmapApprovals:roadmap,
  nowIso:"2026-11-17T01:30:00.000Z"
});
assert.equal(noHost.governanceState,"PHYSICAL_HOST_ACTIVATION_EVIDENCE_REQUIRED");

const root = path.resolve(process.cwd(),"../..");
const source = (relative:string) => fs.readFileSync(path.join(root,relative),"utf8");

const migration = source("db/migrations/0177_master_acceleration_closure.sql");
for (const token of [
  "master_build414_completion_closure_evidence",
  "master_build414_security_recertification_evidence",
  "master_build414_comms_pilot_requests",
  "master_build414_comms_pilot_receipts",
  "master_build414_host_activation_receipts",
  "master_build414_roadmap_renewal_approvals",
  "force row level security",
  "rosevear-comms-hub",
  "direct_peer_database_write=false",
  "denominator_hash=baseline_denominator_hash",
  "revoke update,delete"
]) assert.ok(migration.includes(token),"migration token missing: "+token);

const page = source("apps/web/app/acceleration-closure/page.tsx");
for (const token of [
  "Build 414 · Acceleration Cycle Closure",
  "Completion Closure, Security Re-Certification & Communications Pilot",
  "49",
  "35",
  "PHYSICAL HOST RECEIPT REQUIRED",
  "AccelerationClosureActions"
]) assert.ok(page.includes(token),"page token missing: "+token);

const actions = source("apps/web/components/acceleration-closure-actions.tsx");
for (const token of [
  "Request supervised pilot",
  "Approve renewed roadmap",
  "Rosevear Comms Hub",
  "/api/acceleration-closure/pilot",
  "/api/acceleration-closure/roadmap"
]) assert.ok(actions.includes(token),"action token missing: "+token);

const roadmapDoc = source("docs/NEXT_BUILDS_415_424.md");
for (const token of [
  "Build 415",
  "Build 424",
  "Rosevear Comms Hub retains communications authority",
  "Ordinary additive changes remain independently releasable under protocol 1.1"
]) assert.ok(roadmapDoc.includes(token),"roadmap token missing: "+token);

const overlay = source("docs/SERVER_SHELL_CONVERGENCE_410_414.md");
assert.ok(overlay.includes("Implemented in Build 414"));

const manifest = JSON.parse(source(".github/rosevear-build414-acceleration-closure.v1.json"));
assert.equal(manifest.build,414);
assert.equal(manifest.applications.length,7);
assert.equal(manifest.securityTiers.length,5);
assert.equal(manifest.canonicalCommunicationRelationships,14);
assert.equal(manifest.windowsServices.length,3);
assert.equal(manifest.policy.productionGreenImpliesPhysicalHostActivated,false);

console.log(
  "Build 414 Seven-Application Completion Acceleration Closure, Security Re-Certification, Communications Production Pilot & Roadmap Renewal verification passed."
);
