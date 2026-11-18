import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";

export const BUILD_418=418 as const;
export const BUILD_418_SCHEMA=
  "rosevear.ai-data-platform.build418-cross-application-recovery-rollback.v1" as const;
export const BUILD_418_EXERCISE_DOMAINS=[
  "APPLICATION_ROLLBACK","DATABASE_RECOVERY","COMMUNICATION_REPLAY","DEPENDENCY_RECOVERY"
] as const;
export const BUILD_418_MINIMUM_CROSS_APP_PARTICIPANTS=2 as const;
export type Build418ApplicationId=(typeof BUILD_405_APPLICATION_IDS)[number];
export type Build418ExerciseDomain=(typeof BUILD_418_EXERCISE_DOMAINS)[number];

export type Build418RecoveryExerciseReceipt={
  receiptId:string;
  exerciseId:string;
  appId:Build418ApplicationId;
  domain:Build418ExerciseDomain;
  scenarioDigest:string;
  baselineEvidenceDigest:string;
  ownerApprovalDigest:string;
  independentWitnessDigest:string;
  sourceExecutionReceiptDigest:string;
  postRecoveryTelemetryDigest:string;
  recoveryPointDigest:string;
  startedAt:string;
  completedAt:string;
  recoveryTimeMinutes:number;
  recoverySuccessful:boolean;
  postRecoveryHealthVerified:boolean;
  rollbackToPriorStateVerified:boolean;
  dataIntegrityVerified:boolean;
  duplicateOrReplayProtectionVerified:boolean;
  noCrossTenantImpact:boolean;
  noSecretExposure:boolean;
  localAuthorityPreserved:boolean;
  communicationsAuthorityPreserved:boolean;
  aiDataValidationOnly:boolean;
  sourceExecutionVerified:boolean;
  independentlyVerified:boolean;
  observedAt:string;
  expiresAt:string;
  state:"VERIFIED"|"HOLD"|"FAILED";
};

export type Build418RollbackReadinessReceipt={
  receiptId:string;
  appId:Build418ApplicationId;
  currentRevision:string;
  previousKnownGoodRevision:string;
  currentArtifactDigest:string;
  previousArtifactDigest:string;
  restorePointDigest:string;
  rollbackProcedureDigest:string;
  migrationCompatibilityDigest:string;
  ownerGateDigest:string;
  sourceCustodyDigest:string;
  rollbackWindowMinutes:number;
  previousArtifactAvailable:boolean;
  restorePointVerified:boolean;
  rollbackProcedureVerified:boolean;
  migrationCompatibilityVerified:boolean;
  ownerGateVerified:boolean;
  sourceOwnedRollback:boolean;
  postRollbackValidationDefined:boolean;
  forwardRecoveryPathDefined:boolean;
  noAutomaticRollback:boolean;
  independentlyVerified:boolean;
  observedAt:string;
  expiresAt:string;
  state:"VERIFIED"|"HOLD"|"FAILED";
};

export type Build418CrossApplicationExerciseReceipt={
  receiptId:string;
  exerciseId:string;
  participantAppIds:readonly Build418ApplicationId[];
  correlationId:string;
  scenarioDigest:string;
  ownerApprovalDigest:string;
  independentWitnessDigest:string;
  dependencyOrderDigest:string;
  rollbackSequenceDigest:string;
  reconciliationDigest:string;
  partialFailureIsolated:boolean;
  dependencyOrderVerified:boolean;
  rollbackSequenceVerified:boolean;
  postExerciseReconciliationVerified:boolean;
  authorityBoundariesPreserved:boolean;
  communicationsAuthorityPreserved:boolean;
  noCrossTenantImpact:boolean;
  noSecretExposure:boolean;
  noLockstepReleaseRequired:boolean;
  independentlyVerified:boolean;
  observedAt:string;
  expiresAt:string;
  state:"VERIFIED"|"HOLD"|"FAILED";
};

function digest(value:string){return /^sha256:[a-f0-9]{64}$/.test(value);}
function revision(value:string){return /^[a-f0-9]{40}$/.test(value);}
function finiteDate(value:string){return Number.isFinite(Date.parse(value));}
function fresh(expiresAt:string,now:number){return finiteDate(expiresAt)&&Date.parse(expiresAt)>now;}
function latestByKey<T>(items:readonly T[],key:(item:T)=>string,observed:(item:T)=>string){
  const map=new Map<string,T>();
  for(const item of [...items].sort((a,b)=>observed(b).localeCompare(observed(a)))){
    const k=key(item); if(!map.has(k))map.set(k,item);
  }
  return map;
}

export function validateBuild418RecoveryExercise(item:Build418RecoveryExerciseReceipt,nowIso:string){
  const now=Date.parse(nowIso);
  const distinctApprovals=new Set([
    item.ownerApprovalDigest,item.independentWitnessDigest,item.sourceExecutionReceiptDigest
  ]).size===3;
  return Boolean(
    BUILD_405_APPLICATION_IDS.includes(item.appId)&&
    BUILD_418_EXERCISE_DOMAINS.includes(item.domain)&&
    item.exerciseId.length>=12&&
    digest(item.scenarioDigest)&&digest(item.baselineEvidenceDigest)&&
    digest(item.ownerApprovalDigest)&&digest(item.independentWitnessDigest)&&
    digest(item.sourceExecutionReceiptDigest)&&digest(item.postRecoveryTelemetryDigest)&&
    digest(item.recoveryPointDigest)&&distinctApprovals&&
    finiteDate(item.startedAt)&&finiteDate(item.completedAt)&&
    Date.parse(item.completedAt)>=Date.parse(item.startedAt)&&
    Number.isFinite(item.recoveryTimeMinutes)&&item.recoveryTimeMinutes>=0&&
    item.recoverySuccessful&&item.postRecoveryHealthVerified&&
    item.rollbackToPriorStateVerified&&item.dataIntegrityVerified&&
    item.duplicateOrReplayProtectionVerified&&item.noCrossTenantImpact&&
    item.noSecretExposure&&item.localAuthorityPreserved&&
    item.communicationsAuthorityPreserved&&item.aiDataValidationOnly&&
    item.sourceExecutionVerified&&item.independentlyVerified&&
    fresh(item.expiresAt,now)&&item.state==="VERIFIED"
  );
}

export function validateBuild418RollbackReadiness(item:Build418RollbackReadinessReceipt,nowIso:string){
  const now=Date.parse(nowIso);
  return Boolean(
    BUILD_405_APPLICATION_IDS.includes(item.appId)&&
    revision(item.currentRevision)&&revision(item.previousKnownGoodRevision)&&
    item.currentRevision!==item.previousKnownGoodRevision&&
    digest(item.currentArtifactDigest)&&digest(item.previousArtifactDigest)&&
    item.currentArtifactDigest!==item.previousArtifactDigest&&
    digest(item.restorePointDigest)&&digest(item.rollbackProcedureDigest)&&
    digest(item.migrationCompatibilityDigest)&&digest(item.ownerGateDigest)&&
    digest(item.sourceCustodyDigest)&&Number.isFinite(item.rollbackWindowMinutes)&&
    item.rollbackWindowMinutes>0&&item.rollbackWindowMinutes<=240&&
    item.previousArtifactAvailable&&item.restorePointVerified&&
    item.rollbackProcedureVerified&&item.migrationCompatibilityVerified&&
    item.ownerGateVerified&&item.sourceOwnedRollback&&
    item.postRollbackValidationDefined&&item.forwardRecoveryPathDefined&&
    item.noAutomaticRollback&&item.independentlyVerified&&
    fresh(item.expiresAt,now)&&item.state==="VERIFIED"
  );
}

export function validateBuild418CrossApplicationExercise(
  item:Build418CrossApplicationExerciseReceipt,nowIso:string
){
  const now=Date.parse(nowIso);
  const unique=[...new Set(item.participantAppIds)];
  return Boolean(
    item.exerciseId.length>=12&&item.correlationId.length>=12&&
    unique.length===item.participantAppIds.length&&
    unique.length>=BUILD_418_MINIMUM_CROSS_APP_PARTICIPANTS&&
    unique.every(app=>BUILD_405_APPLICATION_IDS.includes(app))&&
    digest(item.scenarioDigest)&&digest(item.ownerApprovalDigest)&&
    digest(item.independentWitnessDigest)&&digest(item.dependencyOrderDigest)&&
    digest(item.rollbackSequenceDigest)&&digest(item.reconciliationDigest)&&
    item.ownerApprovalDigest!==item.independentWitnessDigest&&
    item.partialFailureIsolated&&item.dependencyOrderVerified&&
    item.rollbackSequenceVerified&&item.postExerciseReconciliationVerified&&
    item.authorityBoundariesPreserved&&item.communicationsAuthorityPreserved&&
    item.noCrossTenantImpact&&item.noSecretExposure&&item.noLockstepReleaseRequired&&
    item.independentlyVerified&&fresh(item.expiresAt,now)&&item.state==="VERIFIED"
  );
}

export function evaluateBuild418RecoveryRollback(input:{
  build417SoftwareReleasePresent:boolean;
  recoveryExercises?:readonly Build418RecoveryExerciseReceipt[];
  rollbackReadiness?:readonly Build418RollbackReadinessReceipt[];
  crossApplicationExercises?:readonly Build418CrossApplicationExerciseReceipt[];
  nowIso:string;
}){
  const exerciseBySlot=latestByKey(
    input.recoveryExercises??[],
    item=>item.appId+"::"+item.domain,
    item=>item.observedAt
  );
  const rollbackByApp=latestByKey(input.rollbackReadiness??[],item=>item.appId,item=>item.observedAt);
  const crossById=latestByKey(input.crossApplicationExercises??[],item=>item.exerciseId,item=>item.observedAt);

  const requiredSlots=BUILD_405_APPLICATION_IDS.flatMap(app=>
    BUILD_418_EXERCISE_DOMAINS.map(domain=>app+"::"+domain)
  );
  const missingExerciseSlots=requiredSlots.filter(key=>!exerciseBySlot.has(key));
  const invalidExerciseSlots=[...exerciseBySlot.entries()]
    .filter(([,item])=>!validateBuild418RecoveryExercise(item,input.nowIso))
    .map(([key])=>key);
  const missingRollbackApps=BUILD_405_APPLICATION_IDS.filter(app=>!rollbackByApp.has(app));
  const invalidRollbackApps=BUILD_405_APPLICATION_IDS.filter(app=>{
    const item=rollbackByApp.get(app);
    return Boolean(item&&!validateBuild418RollbackReadiness(item,input.nowIso));
  });
  const verifiedCross=[...crossById.values()].filter(item=>
    validateBuild418CrossApplicationExercise(item,input.nowIso)
  );
  const invalidCross=[...crossById.values()]
    .filter(item=>!validateBuild418CrossApplicationExercise(item,input.nowIso))
    .map(item=>item.exerciseId);

  const completedExercises=[...exerciseBySlot.values()].filter(item=>
    validateBuild418RecoveryExercise(item,input.nowIso)
  );
  const averageRecoveryTimeMinutes=completedExercises.length
    ? Math.round(completedExercises.reduce((sum,item)=>sum+item.recoveryTimeMinutes,0)/completedExercises.length)
    : null;

  const governanceState=
    !input.build417SoftwareReleasePresent
      ? ("HOLD_BUILD417_SOFTWARE_RELEASE_REQUIRED" as const)
      : missingExerciseSlots.length
        ? ("HOLD_RECOVERY_EXERCISE_EVIDENCE_REQUIRED" as const)
        : invalidExerciseSlots.length
          ? ("HOLD_RECOVERY_EXERCISE_EVIDENCE_INVALID" as const)
          : missingRollbackApps.length
            ? ("HOLD_ROLLBACK_READINESS_EVIDENCE_REQUIRED" as const)
            : invalidRollbackApps.length
              ? ("HOLD_ROLLBACK_READINESS_EVIDENCE_INVALID" as const)
              : !crossById.size
                ? ("HOLD_CROSS_APPLICATION_EXERCISE_REQUIRED" as const)
                : invalidCross.length||!verifiedCross.length
                  ? ("HOLD_CROSS_APPLICATION_EXERCISE_INVALID" as const)
                  : ("CROSS_APPLICATION_RECOVERY_AND_ROLLBACK_CERTIFIED" as const);

  return {
    schema:BUILD_418_SCHEMA,build:BUILD_418,governanceState,
    missingExerciseSlots,invalidExerciseSlots,missingRollbackApps,invalidRollbackApps,invalidCross,
    counts:{
      applications:BUILD_405_APPLICATION_IDS.length,
      exerciseDomains:BUILD_418_EXERCISE_DOMAINS.length,
      requiredExerciseSlots:requiredSlots.length,
      admittedExerciseSlots:exerciseBySlot.size,
      verifiedExerciseSlots:completedExercises.length,
      rollbackReadinessReceipts:rollbackByApp.size,
      crossApplicationExercises:crossById.size,
      verifiedCrossApplicationExercises:verifiedCross.length
    },
    metrics:{averageRecoveryTimeMinutes},
    policy:{
      ownerApprovalRequired:true,independentWitnessRequired:true,
      sourceExecutionRequired:true,postRecoveryTelemetryRequired:true,
      rollbackExecutionProofRequired:true,localAuthorityPreserved:true,
      communicationsAuthorityPreserved:true,aiDataPlatformValidationOnly:true,
      automaticRecoveryAuthorized:false,automaticRollbackAuthorized:false,
      productionGreenImpliesRecoveryExercisePassed:false,
      protocol:"1.1",lockstepReleaseRequired:false
    }
  };
}
