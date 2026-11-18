import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {BUILD_405_APPLICATION_IDS} from "../lib/master-assurance-renewal-security-comms-recertification";
import {BUILD_407_DIRECTIONAL_RELATIONSHIPS} from "../lib/master-zero-trust-service-transport";
import {
  BUILD_421_LOCAL_DIMENSIONS,
  evaluateBuild421Renewal,
  validateBuild421DelegatedRenewal,
  validateBuild421LocalEvidence,
  type Build421DelegatedCapabilityRenewal,
  type Build421LocalRenewalEvidence
} from "../lib/master-tenant-isolation-consent-delegated-renewal";

const now="2026-11-18T20:00:00.000Z";
const digest=(n:number)=>"sha256:"+((n%15)+1).toString(16).repeat(64);

const localEvidence:Build421LocalRenewalEvidence[]=[];
let localIndex=0;
for(const appId of BUILD_405_APPLICATION_IDS){
  for(const dimension of BUILD_421_LOCAL_DIMENSIONS){
    const item:Build421LocalRenewalEvidence={
      evidenceId:"b421-local-"+localIndex,
      appId,dimension,state:"PASS",
      denyByDefault:false,exactCapabilityNamespace:false,wildcardCapabilityGrant:false,
      staleGrantReviewComplete:false,leastPrivilegePolicyCurrent:false,t5NonDelegable:false,
      crossTenantOverrideGranted:false,
      apiBoundaryVerified:false,databaseRlsVerified:false,storageBoundaryVerified:false,
      tenantContextValidated:false,sameTenantForeignAccessDenied:false,crossTenantAccessDenied:false,
      crossWorkspaceAccessDenied:false,
      personalDataRequiresExplicitConsent:false,consentPurposeBound:false,consentExpiryEnforced:false,
      consentWithdrawalRevokesCapability:false,revocationPropagationVerified:false,revokedGrantRejected:false,
      renewalRequiresFreshConsent:false,consentMayGrantNewCapability:false,rawPersonalDataIncludedInEvidence:false,
      evidenceDigest:digest(localIndex),sourceOwned:true,syntheticEvidence:false,
      ownerReviewed:true,independentlyVerified:true,
      observedAt:"2026-11-18T19:00:00.000Z",expiresAt:"2026-11-25T19:00:00.000Z"
    };
    if(dimension==="LEAST_PRIVILEGE"){
      item.denyByDefault=true;item.exactCapabilityNamespace=true;item.staleGrantReviewComplete=true;
      item.leastPrivilegePolicyCurrent=true;item.t5NonDelegable=true;
    }
    if(dimension==="TENANT_WORKSPACE_ISOLATION"){
      item.apiBoundaryVerified=true;item.databaseRlsVerified=true;item.storageBoundaryVerified=true;
      item.tenantContextValidated=true;item.sameTenantForeignAccessDenied=true;
      item.crossTenantAccessDenied=true;item.crossWorkspaceAccessDenied=true;
    }
    if(dimension==="CONSENT_LIFECYCLE"){
      item.personalDataRequiresExplicitConsent=true;item.consentPurposeBound=true;item.consentExpiryEnforced=true;
      item.consentWithdrawalRevokesCapability=true;item.revocationPropagationVerified=true;
      item.revokedGrantRejected=true;item.renewalRequiresFreshConsent=true;
    }
    assert.equal(validateBuild421LocalEvidence(item,now),true);
    localEvidence.push(item);
    localIndex++;
  }
}

const delegatedRenewals:Build421DelegatedCapabilityRenewal[]=BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(
  ([sourceAppId,targetAppId],index)=>{
    const item:Build421DelegatedCapabilityRenewal={
      receiptId:"b421-delegated-"+index,
      sourceAppId,targetAppId,
      capabilityNamespace:"rosevear."+sourceAppId+"."+targetAppId+".renewed-capability",
      state:"RENEWED",maxLifetimeHours:24,
      exactCapabilityRequired:true,exactAudienceRequired:true,tenantScopePreserved:true,
      workspaceScopePreserved:true,consentScopePreserved:true,explicitRenewalRequired:true,
      previousGrantMaySelfRenew:false,consentValidAtRenewal:true,subdelegationAllowed:false,
      authorityTransfer:false,t5DelegationAllowed:false,revocationPropagationRequired:true,
      consequentialWritesRequireOwnerGate:true,evidenceDigest:digest(index+30),
      sourceOwned:true,syntheticEvidence:false,ownerReviewed:true,independentlyVerified:true,
      grantIssuedAt:"2026-11-18T19:00:00.000Z",grantExpiresAt:"2026-11-19T19:00:00.000Z",
      revokedAt:null,observedAt:"2026-11-18T19:05:00.000Z",
      evidenceExpiresAt:"2026-11-19T18:00:00.000Z"
    };
    assert.equal(validateBuild421DelegatedRenewal(item,now),true);
    return item;
  }
);

const good=evaluateBuild421Renewal({
  build420SoftwareReleasePresent:true,localEvidence,delegatedRenewals,nowIso:now
});
assert.equal(good.governanceState,"TENANT_ISOLATION_CONSENT_AND_DELEGATED_CAPABILITY_RENEWED");
assert.equal(good.counts.requiredLocalSlots,21);
assert.equal(good.counts.requiredDelegatedSlots,28);
assert.equal(good.counts.requiredTotalSlots,49);
assert.equal(good.counts.passedTotalSlots,49);
assert.deepEqual(good.policy.featureCompletionImpactTargetPercentagePoints,{minimum:5,maximum:10});

const missing=evaluateBuild421Renewal({
  build420SoftwareReleasePresent:true,localEvidence:localEvidence.slice(0,20),delegatedRenewals,nowIso:now
});
assert.equal(missing.governanceState,"HOLD_LOCAL_RENEWAL_EVIDENCE_REQUIRED");

const staleLocal={...localEvidence[0],expiresAt:"2026-11-18T19:30:00.000Z"};
assert.equal(evaluateBuild421Renewal({
  build420SoftwareReleasePresent:true,
  localEvidence:[staleLocal,...localEvidence.slice(1)],delegatedRenewals,nowIso:now
}).governanceState,"HOLD_LOCAL_RENEWAL_EVIDENCE_STALE");

const invalidConsent={
  ...localEvidence.find(item=>item.dimension==="CONSENT_LIFECYCLE")!,
  consentExpiryEnforced:false
};
assert.equal(validateBuild421LocalEvidence(invalidConsent,now),false);

const revokedDelegation={...delegatedRenewals[0],state:"REVOKED" as const,revokedAt:"2026-11-18T19:30:00.000Z"};
assert.equal(validateBuild421DelegatedRenewal(revokedDelegation,now),false);

const root=path.resolve(process.cwd(),"../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");

const migration=read("db/migrations/0184_master_tenant_isolation_consent_expiry_delegated_capability_renewal.sql");
for(const token of [
  "master_build421_local_security_consent_renewals",
  "master_build421_delegated_capability_renewals",
  "force row level security","revoke update,delete",
  "consent_expiry_enforced","revoked_grant_rejected","previous_grant_may_self_renew"
])assert.ok(migration.includes(token),"migration token missing: "+token);

const manifest=JSON.parse(read(".github/rosevear-build421-tenant-consent-delegated-renewal.v1.json"));
assert.equal(manifest.build,421);
assert.equal(manifest.policy.requiredTotalSlots,49);
assert.equal(manifest.policy.maxDelegationHours,24);
assert.equal(manifest.policy.featureCompletionImpactTargetPercentagePoints.minimum,5);
assert.equal(manifest.policy.featureCompletionImpactTargetPercentagePoints.maximum,10);
assert.equal(manifest.policy.completionImpactClaimRequiresFeatureInventoryEvidence,true);

const page=read("apps/web/app/tenant-consent-capability-renewal/page.tsx");
for(const token of [
  "Build 421 · Tenant Isolation, Consent Expiry & Delegated-Capability Renewal",
  "49 concrete renewal checkpoints",
  "Feature-completion discipline: 5–10 points per build."
])assert.ok(page.includes(token),"page token missing: "+token);

const pkg=JSON.parse(read("apps/web/package.json"));
assert.ok(pkg.scripts.build.includes("verify-build-421-tenant-isolation-consent-delegated-renewal.ts"));
assert.equal(pkg.scripts["verify:build421"],"tsx scripts/verify-build-421-tenant-isolation-consent-delegated-renewal.ts");

const nav=read("apps/web/lib/application-navigation.ts");
assert.ok(nav.includes('href: "/tenant-consent-capability-renewal"'));
const masterNav=read("apps/web/lib/master-instrument-navigation.ts");
assert.ok(masterNav.includes('"/tenant-consent-capability-renewal"'));
const suite=read("apps/web/app/master-suite/page.tsx");
assert.ok(suite.includes('href="/tenant-consent-capability-renewal"'));

const spine=read("apps/web/scripts/verify-ci-integration-spine-database.ts");
for(const token of [
  "master_build421_local_security_consent_renewals",
  "master_build421_delegated_capability_renewals",
  "0184_master_tenant_isolation_consent_expiry_delegated_capability_renewal.sql"
])assert.ok(spine.includes(token),"CI spine missing "+token);

const roadmap=read("docs/NEXT_BUILDS_415_424.md");
assert.ok(roadmap.includes("Implemented in Build 421"));
assert.ok(roadmap.includes("5–10 percentage-point"));
console.log("Build 421 Tenant Isolation, Consent Expiry & Delegated-Capability Renewal verification passed.");
