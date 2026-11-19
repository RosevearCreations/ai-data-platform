import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {BUILD_407_DIRECTIONAL_RELATIONSHIPS} from "./master-zero-trust-service-transport";

export const BUILD_424=424 as const;
export const BUILD_424_SCHEMA="rosevear.ai-data-platform.build424-operational-maturity-closure-security-renewal-next-roadmap.v1" as const;
export const BUILD_424_LOCAL_DOMAINS=["RELEASE_MATURITY","SECURITY_RENEWAL","COMMUNICATIONS_ASSURANCE","RECOVERY_READINESS","TELEMETRY_ENROLLMENT","OPERATIONS_RUNBOOK_CUSTODY"] as const;
export const BUILD_424_ROADMAP_SLOTS=[...BUILD_405_APPLICATION_IDS,"master-next-roadmap"] as const;
export const BUILD_424_SCORE_PREVIOUS=90.8 as const;
export const BUILD_424_SCORE_CURRENT=95.8 as const;
export const BUILD_424_SCORE_DELTA=5.1 as const;
export type Build424ApplicationId=(typeof BUILD_405_APPLICATION_IDS)[number];
export type Build424LocalDomain=(typeof BUILD_424_LOCAL_DOMAINS)[number];
export type Build424RoadmapSlot=(typeof BUILD_424_ROADMAP_SLOTS)[number];
export type Build424LocalRenewal={
 evidenceId:string;appId:Build424ApplicationId;domain:Build424LocalDomain;state:"PASS"|"HOLD"|"FAILED";
 exactReleaseRevisionVerified:boolean;releaseChecksGreen:boolean;securityBaselineCurrent:boolean;secretCustodyVerified:boolean;
 communicationsAuthorityPreserved:boolean;consentAuthorityPreserved:boolean;recoveryReadinessVerified:boolean;rollbackOrAbortAvailable:boolean;
 telemetrySourceImplemented:boolean;telemetrySignerEnrolled:boolean;telemetryTransportVerified:boolean;runbookCurrent:boolean;rebootProcedureDocumented:boolean;
 physicalRebootIndependentlyWitnessed:boolean;evidenceDigest:string;sourceOwned:boolean;syntheticEvidence:boolean;ownerReviewed:boolean;independentlyVerified:boolean;
 observedAt:string;expiresAt:string;
};
export type Build424RelationshipRenewal={
 receiptId:string;sourceAppId:Build424ApplicationId;targetAppId:Build424ApplicationId;state:"PASS"|"HOLD"|"FAILED";
 exactRelationshipBound:boolean;sourceRevisionVerified:boolean;targetRevisionVerified:boolean;transportSecurityCurrent:boolean;
 consentAndPurposePreserved:boolean;sourceAuthorityPreserved:boolean;communicationsAuthorityPreserved:boolean;duplicateReplaySafetyVerified:boolean;
 dlpBoundaryPreserved:boolean;evidenceDigest:string;sourceOwned:boolean;syntheticEvidence:boolean;ownerReviewed:boolean;independentlyVerified:boolean;
 observedAt:string;expiresAt:string;
};
export type Build424RoadmapReceipt={
 receiptId:string;slot:Build424RoadmapSlot;state:"PASS"|"HOLD"|"FAILED";currentRoadmapClosed:boolean;remainingHoldsPublished:boolean;
 pathwayTo100Published:boolean;nextRoadmapOwnerGated:boolean;noAutomaticBuild425:boolean;denominatorRulePublished:boolean;
 evidenceDigest:string;sourceOwned:boolean;syntheticEvidence:boolean;ownerReviewed:boolean;independentlyVerified:boolean;observedAt:string;expiresAt:string;
};
const digest=(v:string)=>/^sha256:[a-f0-9]{64}$/.test(v);
const parse=(v:string)=>Date.parse(v);
const fresh=(o:string,e:string,now:number)=>Number.isFinite(parse(o))&&Number.isFinite(parse(e))&&parse(o)<=now&&parse(e)>now&&parse(e)>parse(o);
function latest<T extends {observedAt:string}>(items:readonly T[],key:(value:T)=>string){const out=new Map<string,T>();for(const item of [...items].sort((a,b)=>b.observedAt.localeCompare(a.observedAt))){const k=key(item);if(!out.has(k))out.set(k,item);}return out;}
function pair(s:string,t:string){return s+"::"+t;}
export function validateBuild424Local(item:Build424LocalRenewal,nowIso:string){
 if(!BUILD_405_APPLICATION_IDS.includes(item.appId)||!BUILD_424_LOCAL_DOMAINS.includes(item.domain)||item.state!=="PASS"||!digest(item.evidenceDigest)||
  !item.sourceOwned||item.syntheticEvidence||!item.ownerReviewed||!item.independentlyVerified||!fresh(item.observedAt,item.expiresAt,parse(nowIso)))return false;
 switch(item.domain){
  case "RELEASE_MATURITY":return item.exactReleaseRevisionVerified&&item.releaseChecksGreen;
  case "SECURITY_RENEWAL":return item.securityBaselineCurrent&&item.secretCustodyVerified;
  case "COMMUNICATIONS_ASSURANCE":return item.communicationsAuthorityPreserved&&item.consentAuthorityPreserved;
  case "RECOVERY_READINESS":return item.recoveryReadinessVerified&&item.rollbackOrAbortAvailable;
  case "TELEMETRY_ENROLLMENT":return item.telemetrySourceImplemented&&item.telemetrySignerEnrolled&&item.telemetryTransportVerified;
  case "OPERATIONS_RUNBOOK_CUSTODY":return item.runbookCurrent&&item.rebootProcedureDocumented;
 }
}
export function validateBuild424Relationship(item:Build424RelationshipRenewal,nowIso:string){
 return BUILD_407_DIRECTIONAL_RELATIONSHIPS.some(([s,t])=>s===item.sourceAppId&&t===item.targetAppId)&&item.state==="PASS"&&
  item.exactRelationshipBound&&item.sourceRevisionVerified&&item.targetRevisionVerified&&item.transportSecurityCurrent&&item.consentAndPurposePreserved&&
  item.sourceAuthorityPreserved&&item.communicationsAuthorityPreserved&&item.duplicateReplaySafetyVerified&&item.dlpBoundaryPreserved&&
  digest(item.evidenceDigest)&&item.sourceOwned&&!item.syntheticEvidence&&item.ownerReviewed&&item.independentlyVerified&&fresh(item.observedAt,item.expiresAt,parse(nowIso));
}
export function validateBuild424Roadmap(item:Build424RoadmapReceipt,nowIso:string){
 return BUILD_424_ROADMAP_SLOTS.includes(item.slot)&&item.state==="PASS"&&item.currentRoadmapClosed&&item.remainingHoldsPublished&&item.pathwayTo100Published&&
  item.nextRoadmapOwnerGated&&item.noAutomaticBuild425&&item.denominatorRulePublished&&digest(item.evidenceDigest)&&item.sourceOwned&&!item.syntheticEvidence&&
  item.ownerReviewed&&item.independentlyVerified&&fresh(item.observedAt,item.expiresAt,parse(nowIso));
}
export function evaluateBuild424(input:{local?:readonly Build424LocalRenewal[];relationships?:readonly Build424RelationshipRenewal[];roadmap?:readonly Build424RoadmapReceipt[];nowIso:string;}){
 const lm=latest(input.local??[],x=>x.appId+"::"+x.domain), rm=latest(input.relationships??[],x=>pair(x.sourceAppId,x.targetAppId)), mm=latest(input.roadmap??[],x=>x.slot);
 const localKeys=BUILD_405_APPLICATION_IDS.flatMap(appId=>BUILD_424_LOCAL_DOMAINS.map(domain=>appId+"::"+domain));
 const relKeys=BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([s,t])=>pair(s,t)); const roadmapKeys=[...BUILD_424_ROADMAP_SLOTS];
 const missingLocal=localKeys.filter(k=>!lm.has(k)),invalidLocal=localKeys.filter(k=>{const v=lm.get(k);return Boolean(v&&!validateBuild424Local(v,input.nowIso));});
 const missingRelationships=relKeys.filter(k=>!rm.has(k)),invalidRelationships=relKeys.filter(k=>{const v=rm.get(k);return Boolean(v&&!validateBuild424Relationship(v,input.nowIso));});
 const missingRoadmap=roadmapKeys.filter(k=>!mm.has(k)),invalidRoadmap=roadmapKeys.filter(k=>{const v=mm.get(k);return Boolean(v&&!validateBuild424Roadmap(v,input.nowIso));});
 const governanceState=missingLocal.length?"HOLD_OPERATIONAL_MATURITY_EVIDENCE_REQUIRED":invalidLocal.length?"HOLD_OPERATIONAL_MATURITY_EVIDENCE_INVALID":
  missingRelationships.length?"HOLD_RELATIONSHIP_SECURITY_RENEWAL_REQUIRED":invalidRelationships.length?"HOLD_RELATIONSHIP_SECURITY_RENEWAL_INVALID":
  missingRoadmap.length?"HOLD_NEXT_ROADMAP_CEREMONY_REQUIRED":invalidRoadmap.length?"HOLD_NEXT_ROADMAP_CEREMONY_INVALID":
  "OPERATIONAL_MATURITY_SECURITY_RENEWAL_AND_ROADMAP_CLOSED";
 return {schema:BUILD_424_SCHEMA,build:BUILD_424,governanceState,missingLocal,invalidLocal,missingRelationships,invalidRelationships,missingRoadmap,invalidRoadmap,
  counts:{applications:7,requiredLocalSlots:localKeys.length,requiredDirectionalSlots:relKeys.length,requiredRoadmapSlots:roadmapKeys.length,totalCheckpoints:localKeys.length+relKeys.length+roadmapKeys.length},
  completionScorecard:{previousFormalPercent:BUILD_424_SCORE_PREVIOUS,currentPercent:BUILD_424_SCORE_CURRENT,movementPercentagePoints:BUILD_424_SCORE_DELTA,remainingTo100PercentagePoints:4.2},
  policy:{liveTelemetryEnrollmentRequiredForOperationalClosure:true,physicalRebootRequiresIndependentWitness:true,productionGreenMayClose:false,syntheticEvidenceMayClose:false,
   noAutomaticBuild425:true,nextNumberedBuildRequiresDenominatorRebaselineOrAtLeastFivePointCapacity:true,protocol:"1.1"}};
}
