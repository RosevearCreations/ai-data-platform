import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {BUILD_405_APPLICATION_IDS} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_420_DIMENSIONS,
  evaluateBuild420Recertification,
  validateBuild420Evidence,
  type Build420RecertificationEvidence
} from "../lib/master-accessibility-device-degraded-network-recertification";

const now="2026-11-18T15:00:00.000Z";
const digest=(c:string)=>"sha256:"+c.repeat(64);
const evidence:Build420RecertificationEvidence[]=[];
let index=0;
for(const appId of BUILD_405_APPLICATION_IDS){
  for(const dimension of BUILD_420_DIMENSIONS){
    const i=index++;
    const base={
      evidenceId:"b420-"+i,appId,dimension,state:"PASS" as const,
      acceptancePercent:95,criticalFailureCount:0,testRunCount:3,
      viewportObservedWidthPx:0,touchTargetMinPx:0,criticalHorizontalOverflow:false,
      keyboardOnlyWorkflowComplete:false,visibleFocusVerified:false,screenReaderSemanticsVerified:false,
      forcedColorsVerified:false,contrastAaVerified:false,reducedMotionVerified:false,
      loadingStateVerified:false,emptyStateVerified:false,errorStateVerified:false,retrySafe:false,
      offlineBehaviorVerified:false,degradedNetworkVerified:false,recoveryPreservesData:false,
      noDuplicateEffects:false,evidenceDigest:digest(((i%6)+1).toString(16)),
      sourceOwned:true,syntheticEvidence:false,ownerReviewed:true,independentlyVerified:true,
      observedAt:"2026-11-18T14:00:00.000Z",expiresAt:"2026-11-25T14:00:00.000Z"
    };
    if(dimension==="DESKTOP")base.viewportObservedWidthPx=1440;
    if(dimension==="TABLET")base.viewportObservedWidthPx=820;
    if(dimension==="MOBILE"){base.viewportObservedWidthPx=390;base.touchTargetMinPx=44;}
    if(dimension==="KEYBOARD_FOCUS"){
      base.keyboardOnlyWorkflowComplete=true;base.visibleFocusVerified=true;base.screenReaderSemanticsVerified=true;
    }
    if(dimension==="CONTRAST_FORCED_COLORS"){
      base.forcedColorsVerified=true;base.contrastAaVerified=true;
    }
    if(dimension==="REDUCED_MOTION")base.reducedMotionVerified=true;
    if(dimension==="LOADING_ERROR_STATES"){
      base.loadingStateVerified=true;base.emptyStateVerified=true;base.errorStateVerified=true;base.retrySafe=true;
    }
    if(dimension==="OFFLINE_DEGRADED_NETWORK"){
      base.offlineBehaviorVerified=true;base.degradedNetworkVerified=true;base.retrySafe=true;base.noDuplicateEffects=true;
    }
    if(dimension==="RECOVERY_BEHAVIOR"){
      base.recoveryPreservesData=true;base.retrySafe=true;base.noDuplicateEffects=true;
    }
    evidence.push(base);
  }
}
for(const item of evidence)assert.equal(validateBuild420Evidence(item,now),true);

const good=evaluateBuild420Recertification({
  build419SoftwareReleasePresent:true,evidence,nowIso:now
});
assert.equal(good.governanceState,"ACCESSIBILITY_DEVICE_DEGRADED_NETWORK_RECERTIFIED");
assert.equal(good.counts.applications,7);
assert.equal(good.counts.dimensions,9);
assert.equal(good.counts.requiredEvidenceSlots,63);
assert.equal(good.counts.passedSlots,63);

const missing=evaluateBuild420Recertification({
  build419SoftwareReleasePresent:true,evidence:evidence.slice(0,62),nowIso:now
});
assert.equal(missing.governanceState,"HOLD_RECERTIFICATION_EVIDENCE_REQUIRED");

const staleItem={...evidence[0],expiresAt:"2026-11-18T14:30:00.000Z"};
const stale=evaluateBuild420Recertification({
  build419SoftwareReleasePresent:true,evidence:[staleItem,...evidence.slice(1)],nowIso:now
});
assert.equal(stale.governanceState,"HOLD_RECERTIFICATION_EVIDENCE_STALE");

const invalidMobile={...evidence.find(x=>x.dimension==="MOBILE")!,touchTargetMinPx:40};
assert.equal(validateBuild420Evidence(invalidMobile,now),false);

const root=path.resolve(process.cwd(),"../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");

const migration=read("db/migrations/0183_master_accessibility_device_degraded_network_recertification.sql");
for(const token of [
  "master_build420_accessibility_device_network_evidence",
  "force row level security","revoke update,delete",
  "keyboard_only_workflow_complete","forced_colors_verified","reduced_motion_verified",
  "offline_behavior_verified","degraded_network_verified","recovery_preserves_data"
])assert.ok(migration.includes(token),"migration token missing: "+token);

const manifest=JSON.parse(read(".github/rosevear-build420-accessibility-device-degraded-network-recertification.v1.json"));
assert.equal(manifest.build,420);
assert.equal(manifest.policy.requiredEvidenceSlots,63);
assert.equal(manifest.policy.minimumAcceptancePercent,90);
assert.equal(manifest.policy.minimumTouchTargetPx,44);
assert.equal(manifest.policy.syntheticEvidenceMayRecertify,false);
assert.equal(manifest.policy.deploymentGreenMayRecertify,false);

const page=read("apps/web/app/accessibility-device-network-recertification/page.tsx");
for(const token of [
  "Build 420 · Accessibility, Device & Degraded-Network Re-Certification",
  "Seven-application matrix","No synthetic or deployment-only certification."
])assert.ok(page.includes(token),"page token missing: "+token);

const pkg=JSON.parse(read("apps/web/package.json"));
assert.ok(pkg.scripts.build.includes("verify-build-420-accessibility-device-degraded-network-recertification.ts"));
assert.equal(pkg.scripts["verify:build420"],"tsx scripts/verify-build-420-accessibility-device-degraded-network-recertification.ts");

const nav=read("apps/web/lib/application-navigation.ts");
assert.ok(nav.includes('href: "/accessibility-device-network-recertification"'));
const masterNav=read("apps/web/lib/master-instrument-navigation.ts");
assert.ok(masterNav.includes('"/accessibility-device-network-recertification"'));
const suite=read("apps/web/app/master-suite/page.tsx");
assert.ok(suite.includes('href="/accessibility-device-network-recertification"'));

const spine=read("apps/web/scripts/verify-ci-integration-spine-database.ts");
for(const token of [
  "master_build420_accessibility_device_network_evidence",
  "0183_master_accessibility_device_degraded_network_recertification.sql"
])assert.ok(spine.includes(token),"CI spine missing "+token);

const roadmap=read("docs/NEXT_BUILDS_415_424.md");
assert.ok(roadmap.includes("Implemented in Build 420"));
console.log("Build 420 Accessibility, Device & Degraded-Network Re-Certification verification passed.");
