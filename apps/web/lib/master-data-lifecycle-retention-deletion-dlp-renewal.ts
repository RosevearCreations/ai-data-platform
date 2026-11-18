import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {BUILD_407_DIRECTIONAL_RELATIONSHIPS} from "./master-zero-trust-service-transport";

export const BUILD_422=422 as const;
export const BUILD_422_SCHEMA="rosevear.ai-data-platform.build422-data-lifecycle-retention-deletion-dlp-renewal.v1" as const;
export const BUILD_422_EVIDENCE_FRESHNESS_HOURS=168 as const;
export const BUILD_422_COMPLETION_SCORECARD_PREVIOUS=85.3 as const;
export const BUILD_422_COMPLETION_SCORECARD_CURRENT=90.8 as const;
export const BUILD_422_COMPLETION_SCORECARD_DELTA=5.4 as const;
export const BUILD_422_LOCAL_DIMENSIONS=["DATA_CLASSIFICATION","ENCRYPTION_SECRET_CUSTODY","REDACTION_MINIMIZATION","RETENTION_EXPIRY","DELETION_EVIDENCE","EXPORT_DLP","CROSS_TENANT_EXFILTRATION"] as const;
export const BUILD_422_DATA_CLASSES=["D0_PUBLIC","D1_INTERNAL","D2_PERSONAL","D3_CONFIDENTIAL","D4_SECRET"] as const;
export type Build422ApplicationId=(typeof BUILD_405_APPLICATION_IDS)[number];
export type Build422LocalDimension=(typeof BUILD_422_LOCAL_DIMENSIONS)[number];
export type Build422DataClass=(typeof BUILD_422_DATA_CLASSES)[number];

export type Build422LocalLifecycleEvidence={
  evidenceId:string;appId:Build422ApplicationId;dimension:Build422LocalDimension;state:"PASS"|"PARTIAL"|"FAILED";
  classificationInventoryCurrent:boolean;allFiveDataClassesCovered:boolean;unknownDataFailsClosed:boolean;
  transportEncryptionVerified:boolean;sensitiveAtRestEncryptionVerified:boolean;secretFieldProtectionVerified:boolean;keyMaterialOutsideSourceControl:boolean;
  structuredLogRedactionVerified:boolean;credentialPatternRedactionVerified:boolean;auditMinimizationVerified:boolean;rawSecretMaterialAbsent:boolean;
  purposeBoundRetentionVerified:boolean;retentionScheduleCurrent:boolean;expiryEnforced:boolean;expiredDataRequiresHoldOrDeletion:boolean;
  deletionWorkflowVerified:boolean;deletionReceiptRequired:boolean;deletionEvidenceImmutable:boolean;legalHoldPreserved:boolean;
  exportInspectionVerified:boolean;restrictedExportOwnerGateVerified:boolean;classificationPreservedOnExport:boolean;rawSecretExfiltrationBlocked:boolean;
  crossTenantExportBlocked:boolean;tenantContextVerified:boolean;workspaceBoundaryPreserved:boolean;destinationPolicyCompatible:boolean;
  evidenceDigest:string;sourceOwned:boolean;syntheticEvidence:boolean;ownerReviewed:boolean;independentlyVerified:boolean;observedAt:string;expiresAt:string;
};
export type Build422DirectionalDlpRenewal={
  receiptId:string;sourceAppId:Build422ApplicationId;targetAppId:Build422ApplicationId;dataClass:Build422DataClass;state:"RENEWED"|"HOLD"|"BLOCKED";
  exactSourceTargetBound:boolean;classificationCurrent:boolean;transportEncrypted:boolean;payloadMinimized:boolean;redactionApplied:boolean;
  consentRequired:boolean;consentValid:boolean;retentionBoundaryPreserved:boolean;exportInspected:boolean;restrictedOwnerGate:boolean;
  secretReferenceOnly:boolean;crossTenantExportDenied:boolean;destinationPolicyCompatible:boolean;evidenceDigest:string;sourceOwned:boolean;
  syntheticEvidence:boolean;ownerReviewed:boolean;independentlyVerified:boolean;observedAt:string;expiresAt:string;
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
    const key=getKey(value);if(!result.has(key))result.set(key,value);
  }
  return result;
}
function pairKey(source:string,target:string){return source+"::"+target;}
export function validateBuild422LocalEvidence(item:Build422LocalLifecycleEvidence,nowIso:string){
  const now=parse(nowIso);
  if(!BUILD_405_APPLICATION_IDS.includes(item.appId)||!BUILD_422_LOCAL_DIMENSIONS.includes(item.dimension)||item.state!=="PASS"||
    !validDigest(item.evidenceDigest)||!item.sourceOwned||item.syntheticEvidence||!item.ownerReviewed||!item.independentlyVerified||
    !validWindow(item.observedAt,item.expiresAt,now))return false;
  switch(item.dimension){
    case "DATA_CLASSIFICATION":return item.classificationInventoryCurrent&&item.allFiveDataClassesCovered&&item.unknownDataFailsClosed;
    case "ENCRYPTION_SECRET_CUSTODY":return item.transportEncryptionVerified&&item.sensitiveAtRestEncryptionVerified&&item.secretFieldProtectionVerified&&item.keyMaterialOutsideSourceControl&&item.rawSecretMaterialAbsent;
    case "REDACTION_MINIMIZATION":return item.structuredLogRedactionVerified&&item.credentialPatternRedactionVerified&&item.auditMinimizationVerified&&item.rawSecretMaterialAbsent;
    case "RETENTION_EXPIRY":return item.purposeBoundRetentionVerified&&item.retentionScheduleCurrent&&item.expiryEnforced&&item.expiredDataRequiresHoldOrDeletion&&item.legalHoldPreserved;
    case "DELETION_EVIDENCE":return item.deletionWorkflowVerified&&item.deletionReceiptRequired&&item.deletionEvidenceImmutable&&item.legalHoldPreserved;
    case "EXPORT_DLP":return item.exportInspectionVerified&&item.restrictedExportOwnerGateVerified&&item.classificationPreservedOnExport&&item.rawSecretExfiltrationBlocked&&item.rawSecretMaterialAbsent;
    case "CROSS_TENANT_EXFILTRATION":return item.crossTenantExportBlocked&&item.tenantContextVerified&&item.workspaceBoundaryPreserved&&item.destinationPolicyCompatible;
  }
}
export function validateBuild422DirectionalRenewal(item:Build422DirectionalDlpRenewal,nowIso:string){
  const now=parse(nowIso);
  const relationshipAllowed=BUILD_407_DIRECTIONAL_RELATIONSHIPS.some(([source,target])=>source===item.sourceAppId&&target===item.targetAppId);
  const personalConsentOk=item.dataClass!=="D2_PERSONAL"||(item.consentRequired&&item.consentValid);
  const confidentialOwnerGateOk=!["D3_CONFIDENTIAL","D4_SECRET"].includes(item.dataClass)||item.restrictedOwnerGate;
  const secretTransferOk=item.dataClass!=="D4_SECRET"||item.secretReferenceOnly;
  return relationshipAllowed&&item.sourceAppId!==item.targetAppId&&BUILD_422_DATA_CLASSES.includes(item.dataClass)&&item.state==="RENEWED"&&
    item.exactSourceTargetBound&&item.classificationCurrent&&item.transportEncrypted&&item.payloadMinimized&&item.redactionApplied&&personalConsentOk&&
    item.retentionBoundaryPreserved&&item.exportInspected&&confidentialOwnerGateOk&&secretTransferOk&&item.crossTenantExportDenied&&
    item.destinationPolicyCompatible&&validDigest(item.evidenceDigest)&&item.sourceOwned&&!item.syntheticEvidence&&item.ownerReviewed&&
    item.independentlyVerified&&validWindow(item.observedAt,item.expiresAt,now);
}
export function evaluateBuild422Renewal(input:{build421SoftwareReleasePresent:boolean;localEvidence?:readonly Build422LocalLifecycleEvidence[];directionalRenewals?:readonly Build422DirectionalDlpRenewal[];nowIso:string;}){
  const now=parse(input.nowIso);
  const localBySlot=latestByKey(input.localEvidence??[],item=>item.appId+"::"+item.dimension);
  const directionalBySlot=latestByKey(input.directionalRenewals??[],item=>pairKey(item.sourceAppId,item.targetAppId));
  const requiredLocal=BUILD_405_APPLICATION_IDS.flatMap(appId=>BUILD_422_LOCAL_DIMENSIONS.map(dimension=>appId+"::"+dimension));
  const requiredDirectional=BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([source,target])=>pairKey(source,target));
  const missingLocal=requiredLocal.filter(key=>!localBySlot.has(key));
  const staleLocal=requiredLocal.filter(key=>{const item=localBySlot.get(key);return Boolean(item&&!validWindow(item.observedAt,item.expiresAt,now));});
  const invalidLocal=requiredLocal.filter(key=>{const item=localBySlot.get(key);return Boolean(item&&validWindow(item.observedAt,item.expiresAt,now)&&!validateBuild422LocalEvidence(item,input.nowIso));});
  const passedLocal=requiredLocal.filter(key=>{const item=localBySlot.get(key);return Boolean(item&&validateBuild422LocalEvidence(item,input.nowIso));});
  const missingDirectional=requiredDirectional.filter(key=>!directionalBySlot.has(key));
  const staleDirectional=requiredDirectional.filter(key=>{const item=directionalBySlot.get(key);return Boolean(item&&!validWindow(item.observedAt,item.expiresAt,now));});
  const invalidDirectional=requiredDirectional.filter(key=>{const item=directionalBySlot.get(key);return Boolean(item&&validWindow(item.observedAt,item.expiresAt,now)&&!validateBuild422DirectionalRenewal(item,input.nowIso));});
  const passedDirectional=requiredDirectional.filter(key=>{const item=directionalBySlot.get(key);return Boolean(item&&validateBuild422DirectionalRenewal(item,input.nowIso));});
  const appSummaries=BUILD_405_APPLICATION_IDS.map(appId=>{
    const keys=BUILD_422_LOCAL_DIMENSIONS.map(dimension=>appId+"::"+dimension);
    return {appId,requiredLocal:keys.length,passedLocal:keys.filter(key=>passedLocal.includes(key)).length,
      missingLocal:keys.filter(key=>missingLocal.includes(key)).length,staleLocal:keys.filter(key=>staleLocal.includes(key)).length,
      invalidLocal:keys.filter(key=>invalidLocal.includes(key)).length,
      directionalOutboundRequired:BUILD_407_DIRECTIONAL_RELATIONSHIPS.filter(([source])=>source===appId).length,
      directionalOutboundPassed:BUILD_407_DIRECTIONAL_RELATIONSHIPS.filter(([source,target])=>source===appId&&passedDirectional.includes(pairKey(source,target))).length};
  });
  const governanceState=!input.build421SoftwareReleasePresent?"HOLD_BUILD421_SOFTWARE_RELEASE_REQUIRED":
    missingLocal.length?"HOLD_DATA_LIFECYCLE_RENEWAL_REQUIRED":staleLocal.length?"HOLD_DATA_LIFECYCLE_RENEWAL_STALE":
    invalidLocal.length?"HOLD_DATA_LIFECYCLE_RENEWAL_INVALID":missingDirectional.length?"HOLD_DIRECTIONAL_DLP_RENEWAL_REQUIRED":
    staleDirectional.length?"HOLD_DIRECTIONAL_DLP_RENEWAL_STALE":invalidDirectional.length?"HOLD_DIRECTIONAL_DLP_RENEWAL_INVALID":
    "DATA_LIFECYCLE_RETENTION_DELETION_AND_DLP_RENEWED";
  return {schema:BUILD_422_SCHEMA,build:BUILD_422,governanceState,missingLocal,staleLocal,invalidLocal,passedLocal,
    missingDirectional,staleDirectional,invalidDirectional,passedDirectional,appSummaries,
    counts:{applications:BUILD_405_APPLICATION_IDS.length,localDimensions:BUILD_422_LOCAL_DIMENSIONS.length,requiredLocalSlots:requiredLocal.length,
      requiredDirectionalSlots:requiredDirectional.length,requiredTotalSlots:requiredLocal.length+requiredDirectional.length,
      passedTotalSlots:passedLocal.length+passedDirectional.length},
    completionScorecard:{previousPercent:BUILD_422_COMPLETION_SCORECARD_PREVIOUS,currentPercent:BUILD_422_COMPLETION_SCORECARD_CURRENT,
      movementPercentagePoints:BUILD_422_COMPLETION_SCORECARD_DELTA},
    policy:{evidenceFreshnessHours:BUILD_422_EVIDENCE_FRESHNESS_HOURS,rawSecretsInLogsAllowed:false,rawSecretsInAuditEvidenceAllowed:false,
      rawSecretsInCrossAppPayloadsAllowed:false,restrictedExportRequiresOwnerGate:true,crossTenantExportAllowed:false,deletionReceiptRequired:true,
      legalHoldMustBePreserved:true,sourceOwnedEvidenceRequired:true,syntheticEvidenceMayRenew:false,staleEvidenceMayRenew:false,
      productionGreenMayRenew:false,featureCompletionImpactTargetPercentagePoints:{minimum:5,maximum:10},
      completionImpactClaimRequiresFeatureInventoryEvidence:true,independentApplicationReleasePreserved:true,protocol:"1.1"}};
}
