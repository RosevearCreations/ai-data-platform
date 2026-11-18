import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";

export const BUILD_420=420 as const;
export const BUILD_420_SCHEMA=
  "rosevear.ai-data-platform.build420-accessibility-device-degraded-network-recertification.v1" as const;
export const BUILD_420_DIMENSIONS=[
  "DESKTOP","TABLET","MOBILE","KEYBOARD_FOCUS","CONTRAST_FORCED_COLORS",
  "REDUCED_MOTION","LOADING_ERROR_STATES","OFFLINE_DEGRADED_NETWORK","RECOVERY_BEHAVIOR"
] as const;
export type Build420ApplicationId=(typeof BUILD_405_APPLICATION_IDS)[number];
export type Build420Dimension=(typeof BUILD_420_DIMENSIONS)[number];

export type Build420RecertificationEvidence={
  evidenceId:string;
  appId:Build420ApplicationId;
  dimension:Build420Dimension;
  state:"PASS"|"PARTIAL"|"FAILED";
  acceptancePercent:number;
  criticalFailureCount:number;
  testRunCount:number;
  viewportObservedWidthPx:number;
  touchTargetMinPx:number;
  criticalHorizontalOverflow:boolean;
  keyboardOnlyWorkflowComplete:boolean;
  visibleFocusVerified:boolean;
  screenReaderSemanticsVerified:boolean;
  forcedColorsVerified:boolean;
  contrastAaVerified:boolean;
  reducedMotionVerified:boolean;
  loadingStateVerified:boolean;
  emptyStateVerified:boolean;
  errorStateVerified:boolean;
  retrySafe:boolean;
  offlineBehaviorVerified:boolean;
  degradedNetworkVerified:boolean;
  recoveryPreservesData:boolean;
  noDuplicateEffects:boolean;
  evidenceDigest:string;
  sourceOwned:boolean;
  syntheticEvidence:boolean;
  ownerReviewed:boolean;
  independentlyVerified:boolean;
  observedAt:string;
  expiresAt:string;
};

function validDigest(value:string){return /^sha256:[a-f0-9]{64}$/.test(value);}
function validPercent(value:number){return Number.isFinite(value)&&value>=0&&value<=100;}
function fresh(expiresAt:string,now:number){
  const ms=Date.parse(expiresAt); return Number.isFinite(ms)&&ms>now;
}
function baseValid(item:Build420RecertificationEvidence,now:number){
  return BUILD_405_APPLICATION_IDS.includes(item.appId)&&
    BUILD_420_DIMENSIONS.includes(item.dimension)&&
    item.state==="PASS"&&validPercent(item.acceptancePercent)&&item.acceptancePercent>=90&&
    Number.isInteger(item.criticalFailureCount)&&item.criticalFailureCount===0&&
    Number.isInteger(item.testRunCount)&&item.testRunCount>0&&
    validDigest(item.evidenceDigest)&&item.sourceOwned&&!item.syntheticEvidence&&
    item.ownerReviewed&&item.independentlyVerified&&fresh(item.expiresAt,now);
}
function dimensionValid(item:Build420RecertificationEvidence){
  switch(item.dimension){
    case "DESKTOP":
      return item.viewportObservedWidthPx>=1024&&!item.criticalHorizontalOverflow;
    case "TABLET":
      return item.viewportObservedWidthPx>=768&&item.viewportObservedWidthPx<1024&&!item.criticalHorizontalOverflow;
    case "MOBILE":
      return item.viewportObservedWidthPx>=320&&item.viewportObservedWidthPx<768&&
        item.touchTargetMinPx>=44&&!item.criticalHorizontalOverflow;
    case "KEYBOARD_FOCUS":
      return item.keyboardOnlyWorkflowComplete&&item.visibleFocusVerified&&item.screenReaderSemanticsVerified;
    case "CONTRAST_FORCED_COLORS":
      return item.forcedColorsVerified&&item.contrastAaVerified;
    case "REDUCED_MOTION":
      return item.reducedMotionVerified;
    case "LOADING_ERROR_STATES":
      return item.loadingStateVerified&&item.emptyStateVerified&&item.errorStateVerified&&item.retrySafe;
    case "OFFLINE_DEGRADED_NETWORK":
      return item.offlineBehaviorVerified&&item.degradedNetworkVerified&&item.retrySafe&&item.noDuplicateEffects;
    case "RECOVERY_BEHAVIOR":
      return item.recoveryPreservesData&&item.retrySafe&&item.noDuplicateEffects;
  }
}
export function validateBuild420Evidence(item:Build420RecertificationEvidence,nowIso:string){
  return baseValid(item,Date.parse(nowIso))&&dimensionValid(item);
}
function latestBySlot(items:readonly Build420RecertificationEvidence[]){
  const map=new Map<string,Build420RecertificationEvidence>();
  for(const item of [...items].sort((a,b)=>b.observedAt.localeCompare(a.observedAt))){
    const key=item.appId+"::"+item.dimension;
    if(!map.has(key))map.set(key,item);
  }
  return map;
}
export function evaluateBuild420Recertification(input:{
  build419SoftwareReleasePresent:boolean;
  evidence?:readonly Build420RecertificationEvidence[];
  nowIso:string;
}){
  const now=Date.parse(input.nowIso);
  const bySlot=latestBySlot(input.evidence??[]);
  const required=BUILD_405_APPLICATION_IDS.flatMap(appId=>
    BUILD_420_DIMENSIONS.map(dimension=>appId+"::"+dimension)
  );
  const missing=required.filter(key=>!bySlot.has(key));
  const stale=required.filter(key=>{
    const item=bySlot.get(key); return Boolean(item&&!fresh(item.expiresAt,now));
  });
  const invalid=required.filter(key=>{
    const item=bySlot.get(key); return Boolean(item&&fresh(item.expiresAt,now)&&!validateBuild420Evidence(item,input.nowIso));
  });
  const passed=required.filter(key=>{
    const item=bySlot.get(key); return Boolean(item&&validateBuild420Evidence(item,input.nowIso));
  });
  const appSummaries=BUILD_405_APPLICATION_IDS.map(appId=>{
    const keys=BUILD_420_DIMENSIONS.map(dimension=>appId+"::"+dimension);
    const appPassed=keys.filter(key=>{
      const item=bySlot.get(key); return Boolean(item&&validateBuild420Evidence(item,input.nowIso));
    }).length;
    const appMissing=keys.filter(key=>!bySlot.has(key)).length;
    const appStale=keys.filter(key=>{
      const item=bySlot.get(key); return Boolean(item&&!fresh(item.expiresAt,now));
    }).length;
    const appInvalid=keys.length-appPassed-appMissing-appStale;
    return {appId,required:keys.length,passed:appPassed,missing:appMissing,stale:appStale,invalid:appInvalid};
  });
  const governanceState=
    !input.build419SoftwareReleasePresent
      ? ("HOLD_BUILD419_SOFTWARE_RELEASE_REQUIRED" as const)
      : missing.length
        ? ("HOLD_RECERTIFICATION_EVIDENCE_REQUIRED" as const)
        : stale.length
          ? ("HOLD_RECERTIFICATION_EVIDENCE_STALE" as const)
          : invalid.length
            ? ("HOLD_RECERTIFICATION_EVIDENCE_INVALID" as const)
            : ("ACCESSIBILITY_DEVICE_DEGRADED_NETWORK_RECERTIFIED" as const);
  return {
    schema:BUILD_420_SCHEMA,build:BUILD_420,governanceState,
    missing,stale,invalid,passed,appSummaries,
    counts:{
      applications:BUILD_405_APPLICATION_IDS.length,
      dimensions:BUILD_420_DIMENSIONS.length,
      requiredEvidenceSlots:required.length,
      admittedEvidenceSlots:bySlot.size,
      passedSlots:passed.length
    },
    policy:{
      minimumAcceptancePercent:90,criticalFailuresAllowed:0,
      minimumMobileWidthPx:320,minimumTouchTargetPx:44,
      sourceOwnedEvidenceRequired:true,independentVerificationRequired:true,
      ownerReviewRequired:true,syntheticEvidenceMayRecertify:false,
      staleEvidenceMayRecertify:false,deploymentGreenMayRecertify:false,
      offlineMayInferHealthy:false,automaticRecoveryAuthorized:false,
      independentApplicationReleasePreserved:true,protocol:"1.1"
    }
  };
}
