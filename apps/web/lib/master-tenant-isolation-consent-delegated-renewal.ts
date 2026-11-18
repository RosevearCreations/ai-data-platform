import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {BUILD_407_DIRECTIONAL_RELATIONSHIPS} from "./master-zero-trust-service-transport";

export const BUILD_421=421 as const;
export const BUILD_421_SCHEMA=
  "rosevear.ai-data-platform.build421-tenant-isolation-consent-delegated-capability-renewal.v1" as const;
export const BUILD_421_MAX_DELEGATION_HOURS=24 as const;
export const BUILD_421_LOCAL_DIMENSIONS=[
  "LEAST_PRIVILEGE",
  "TENANT_WORKSPACE_ISOLATION",
  "CONSENT_LIFECYCLE"
] as const;

export type Build421ApplicationId=(typeof BUILD_405_APPLICATION_IDS)[number];
export type Build421LocalDimension=(typeof BUILD_421_LOCAL_DIMENSIONS)[number];

export type Build421LocalRenewalEvidence={
  evidenceId:string;
  appId:Build421ApplicationId;
  dimension:Build421LocalDimension;
  state:"PASS"|"PARTIAL"|"FAILED";
  denyByDefault:boolean;
  exactCapabilityNamespace:boolean;
  wildcardCapabilityGrant:boolean;
  staleGrantReviewComplete:boolean;
  leastPrivilegePolicyCurrent:boolean;
  t5NonDelegable:boolean;
  crossTenantOverrideGranted:boolean;
  apiBoundaryVerified:boolean;
  databaseRlsVerified:boolean;
  storageBoundaryVerified:boolean;
  tenantContextValidated:boolean;
  sameTenantForeignAccessDenied:boolean;
  crossTenantAccessDenied:boolean;
  crossWorkspaceAccessDenied:boolean;
  personalDataRequiresExplicitConsent:boolean;
  consentPurposeBound:boolean;
  consentExpiryEnforced:boolean;
  consentWithdrawalRevokesCapability:boolean;
  revocationPropagationVerified:boolean;
  revokedGrantRejected:boolean;
  renewalRequiresFreshConsent:boolean;
  consentMayGrantNewCapability:boolean;
  rawPersonalDataIncludedInEvidence:boolean;
  evidenceDigest:string;
  sourceOwned:boolean;
  syntheticEvidence:boolean;
  ownerReviewed:boolean;
  independentlyVerified:boolean;
  observedAt:string;
  expiresAt:string;
};

export type Build421DelegatedCapabilityRenewal={
  receiptId:string;
  sourceAppId:Build421ApplicationId;
  targetAppId:Build421ApplicationId;
  capabilityNamespace:string;
  state:"RENEWED"|"HOLD"|"REVOKED";
  maxLifetimeHours:number;
  exactCapabilityRequired:boolean;
  exactAudienceRequired:boolean;
  tenantScopePreserved:boolean;
  workspaceScopePreserved:boolean;
  consentScopePreserved:boolean;
  explicitRenewalRequired:boolean;
  previousGrantMaySelfRenew:boolean;
  consentValidAtRenewal:boolean;
  subdelegationAllowed:boolean;
  authorityTransfer:boolean;
  t5DelegationAllowed:boolean;
  revocationPropagationRequired:boolean;
  consequentialWritesRequireOwnerGate:boolean;
  evidenceDigest:string;
  sourceOwned:boolean;
  syntheticEvidence:boolean;
  ownerReviewed:boolean;
  independentlyVerified:boolean;
  grantIssuedAt:string;
  grantExpiresAt:string;
  revokedAt:string|null;
  observedAt:string;
  evidenceExpiresAt:string;
};

const validDigest=(value:string)=>/^sha256:[a-f0-9]{64}$/.test(value);
const parse=(value:string)=>Date.parse(value);
function validWindow(observedAt:string,expiresAt:string,now:number){
  const observed=parse(observedAt),expires=parse(expiresAt);
  return Number.isFinite(observed)&&Number.isFinite(expires)&&observed<=now&&expires>now&&expires>observed;
}
function latestByKey<T extends {observedAt:string}>(values:readonly T[],getKey:(value:T)=>string){
  const result=new Map<string,T>();
  for(const value of [...values].sort((a,b)=>b.observedAt.localeCompare(a.observedAt))){
    const key=getKey(value);
    if(!result.has(key))result.set(key,value);
  }
  return result;
}
function pairKey(source:string,target:string){return source+"::"+target;}

export function validateBuild421LocalEvidence(item:Build421LocalRenewalEvidence,nowIso:string){
  const now=parse(nowIso);
  if(!BUILD_405_APPLICATION_IDS.includes(item.appId)||
    !BUILD_421_LOCAL_DIMENSIONS.includes(item.dimension)||
    item.state!=="PASS"||
    !validDigest(item.evidenceDigest)||
    !item.sourceOwned||item.syntheticEvidence||
    !item.ownerReviewed||!item.independentlyVerified||
    !validWindow(item.observedAt,item.expiresAt,now))return false;

  switch(item.dimension){
    case "LEAST_PRIVILEGE":
      return item.denyByDefault&&item.exactCapabilityNamespace&&!item.wildcardCapabilityGrant&&
        item.staleGrantReviewComplete&&item.leastPrivilegePolicyCurrent&&item.t5NonDelegable&&
        !item.crossTenantOverrideGranted;
    case "TENANT_WORKSPACE_ISOLATION":
      return item.apiBoundaryVerified&&item.databaseRlsVerified&&item.storageBoundaryVerified&&
        item.tenantContextValidated&&item.sameTenantForeignAccessDenied&&item.crossTenantAccessDenied&&
        item.crossWorkspaceAccessDenied;
    case "CONSENT_LIFECYCLE":
      return item.personalDataRequiresExplicitConsent&&item.consentPurposeBound&&item.consentExpiryEnforced&&
        item.consentWithdrawalRevokesCapability&&item.revocationPropagationVerified&&item.revokedGrantRejected&&
        item.renewalRequiresFreshConsent&&!item.consentMayGrantNewCapability&&
        !item.rawPersonalDataIncludedInEvidence;
  }
}

export function validateBuild421DelegatedRenewal(item:Build421DelegatedCapabilityRenewal,nowIso:string){
  const now=parse(nowIso);
  const issued=parse(item.grantIssuedAt),grantExpires=parse(item.grantExpiresAt),evidenceExpires=parse(item.evidenceExpiresAt);
  const relationshipAllowed=BUILD_407_DIRECTIONAL_RELATIONSHIPS.some(
    ([source,target])=>source===item.sourceAppId&&target===item.targetAppId
  );
  const lifetimeHours=(grantExpires-issued)/(60*60*1000);
  return relationshipAllowed&&item.sourceAppId!==item.targetAppId&&
    item.capabilityNamespace.length>=3&&!item.capabilityNamespace.includes("*")&&
    item.state==="RENEWED"&&Number.isInteger(item.maxLifetimeHours)&&
    item.maxLifetimeHours>=1&&item.maxLifetimeHours<=BUILD_421_MAX_DELEGATION_HOURS&&
    Number.isFinite(lifetimeHours)&&lifetimeHours>0&&lifetimeHours<=item.maxLifetimeHours&&
    issued<=now&&grantExpires>now&&Number.isFinite(evidenceExpires)&&evidenceExpires<=grantExpires&&
    item.revokedAt===null&&item.exactCapabilityRequired&&item.exactAudienceRequired&&
    item.tenantScopePreserved&&item.workspaceScopePreserved&&item.consentScopePreserved&&
    item.explicitRenewalRequired&&!item.previousGrantMaySelfRenew&&item.consentValidAtRenewal&&
    !item.subdelegationAllowed&&!item.authorityTransfer&&!item.t5DelegationAllowed&&
    item.revocationPropagationRequired&&item.consequentialWritesRequireOwnerGate&&
    validDigest(item.evidenceDigest)&&item.sourceOwned&&!item.syntheticEvidence&&
    item.ownerReviewed&&item.independentlyVerified&&
    validWindow(item.observedAt,item.evidenceExpiresAt,now);
}

export function evaluateBuild421Renewal(input:{
  build420SoftwareReleasePresent:boolean;
  localEvidence?:readonly Build421LocalRenewalEvidence[];
  delegatedRenewals?:readonly Build421DelegatedCapabilityRenewal[];
  nowIso:string;
}){
  const now=parse(input.nowIso);
  const localBySlot=latestByKey(input.localEvidence??[],item=>item.appId+"::"+item.dimension);
  const delegatedBySlot=latestByKey(input.delegatedRenewals??[],item=>pairKey(item.sourceAppId,item.targetAppId));

  const requiredLocal=BUILD_405_APPLICATION_IDS.flatMap(appId=>
    BUILD_421_LOCAL_DIMENSIONS.map(dimension=>appId+"::"+dimension)
  );
  const requiredDelegated=BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([source,target])=>pairKey(source,target));

  const missingLocal=requiredLocal.filter(key=>!localBySlot.has(key));
  const staleLocal=requiredLocal.filter(key=>{
    const item=localBySlot.get(key);
    return Boolean(item&&!validWindow(item.observedAt,item.expiresAt,now));
  });
  const invalidLocal=requiredLocal.filter(key=>{
    const item=localBySlot.get(key);
    return Boolean(item&&validWindow(item.observedAt,item.expiresAt,now)&&
      !validateBuild421LocalEvidence(item,input.nowIso));
  });
  const passedLocal=requiredLocal.filter(key=>{
    const item=localBySlot.get(key);
    return Boolean(item&&validateBuild421LocalEvidence(item,input.nowIso));
  });

  const missingDelegated=requiredDelegated.filter(key=>!delegatedBySlot.has(key));
  const staleDelegated=requiredDelegated.filter(key=>{
    const item=delegatedBySlot.get(key);
    if(!item)return false;
    return !validWindow(item.observedAt,item.evidenceExpiresAt,now)||parse(item.grantExpiresAt)<=now;
  });
  const invalidDelegated=requiredDelegated.filter(key=>{
    const item=delegatedBySlot.get(key);
    return Boolean(item&&!staleDelegated.includes(key)&&
      !validateBuild421DelegatedRenewal(item,input.nowIso));
  });
  const passedDelegated=requiredDelegated.filter(key=>{
    const item=delegatedBySlot.get(key);
    return Boolean(item&&validateBuild421DelegatedRenewal(item,input.nowIso));
  });

  const appSummaries=BUILD_405_APPLICATION_IDS.map(appId=>{
    const keys=BUILD_421_LOCAL_DIMENSIONS.map(dimension=>appId+"::"+dimension);
    const passed=keys.filter(key=>passedLocal.includes(key)).length;
    return {
      appId,
      requiredLocal:keys.length,
      passedLocal:passed,
      missingLocal:keys.filter(key=>missingLocal.includes(key)).length,
      staleLocal:keys.filter(key=>staleLocal.includes(key)).length,
      invalidLocal:keys.filter(key=>invalidLocal.includes(key)).length,
      delegatedOutboundRequired:BUILD_407_DIRECTIONAL_RELATIONSHIPS.filter(([source])=>source===appId).length,
      delegatedOutboundPassed:BUILD_407_DIRECTIONAL_RELATIONSHIPS.filter(([source,target])=>
        source===appId&&passedDelegated.includes(pairKey(source,target))).length
    };
  });

  const governanceState=
    !input.build420SoftwareReleasePresent
      ? ("HOLD_BUILD420_SOFTWARE_RELEASE_REQUIRED" as const)
      : missingLocal.length
        ? ("HOLD_LOCAL_RENEWAL_EVIDENCE_REQUIRED" as const)
        : staleLocal.length
          ? ("HOLD_LOCAL_RENEWAL_EVIDENCE_STALE" as const)
          : invalidLocal.length
            ? ("HOLD_LOCAL_RENEWAL_EVIDENCE_INVALID" as const)
            : missingDelegated.length
              ? ("HOLD_DELEGATED_RENEWAL_REQUIRED" as const)
              : staleDelegated.length
                ? ("HOLD_DELEGATED_RENEWAL_STALE" as const)
                : invalidDelegated.length
                  ? ("HOLD_DELEGATED_RENEWAL_INVALID" as const)
                  : ("TENANT_ISOLATION_CONSENT_AND_DELEGATED_CAPABILITY_RENEWED" as const);

  return {
    schema:BUILD_421_SCHEMA,
    build:BUILD_421,
    governanceState,
    missingLocal,staleLocal,invalidLocal,passedLocal,
    missingDelegated,staleDelegated,invalidDelegated,passedDelegated,
    appSummaries,
    counts:{
      applications:BUILD_405_APPLICATION_IDS.length,
      localDimensions:BUILD_421_LOCAL_DIMENSIONS.length,
      requiredLocalSlots:requiredLocal.length,
      requiredDelegatedSlots:requiredDelegated.length,
      requiredTotalSlots:requiredLocal.length+requiredDelegated.length,
      passedTotalSlots:passedLocal.length+passedDelegated.length
    },
    policy:{
      maxDelegationHours:BUILD_421_MAX_DELEGATION_HOURS,
      denyByDefault:true,
      wildcardCapabilityGrantsAllowed:false,
      crossTenantAccessAllowed:false,
      consentExpiryRequired:true,
      revocationPropagationRequired:true,
      revokedGrantMayAuthorize:false,
      freshConsentRequiredForRenewal:true,
      previousGrantMaySelfRenew:false,
      t5DelegationAllowed:false,
      sourceOwnedEvidenceRequired:true,
      syntheticEvidenceMayRenew:false,
      staleEvidenceMayRenew:false,
      productionGreenMayRenew:false,
      independentApplicationReleasePreserved:true,
      featureCompletionImpactTargetPercentagePoints:{minimum:5,maximum:10},
      completionImpactClaimRequiresFeatureInventoryEvidence:true,
      protocol:"1.1"
    }
  };
}
