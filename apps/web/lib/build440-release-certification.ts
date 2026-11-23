import {BUILD_438_PROFILES} from "./build438-interface-drift-observatory";
import {BUILD_439_EDGES,planBuild439Releases,type ReleaseNode} from "./build439-release-dependency-graph";

export const BUILD_440=440 as const;
export const BUILD_440_SCHEMA="rosevear.ai-data-platform.build440-signed-release-certification.v1" as const;
export const BUILD_440_MAX_AGE_MS=24*60*60*1000;

export type Build440Evidence={
 appId:string;sourceCommit:string;receiptId:string|null;verifiedAt:string;
 observationCount:number;continuity:string;verifiedByClosure:boolean;
};
export type Build440Certification={
 appId:string;release:string;state:"CERTIFIED"|"HOLD"|"REVIEW_REQUIRED";
 reason:string;receiptId:string|null;sourceCommit:string|null;verifiedAt:string|null;
};
const sha40=/^[a-f0-9]{40}$/;
export function certifyBuild440Evidence(
 evidence:readonly Build440Evidence[],now=new Date(),maxAgeMs=BUILD_440_MAX_AGE_MS
){
 const byId=new Map(evidence.map(e=>[e.appId,e]));
 const unique=new Set<string>();
 const certifications:Build440Certification[]=BUILD_438_PROFILES.map(profile=>{
  const e=byId.get(profile.appId);
  const base={appId:profile.appId,release:profile.buildLabel,receiptId:e?.receiptId??null,sourceCommit:e?.sourceCommit??null,verifiedAt:e?.verifiedAt??null};
  if(!e)return {...base,state:"REVIEW_REQUIRED" as const,reason:"NO_SIGNED_SOURCE_OBSERVATION"};
  if(unique.has(e.appId)||evidence.filter(x=>x.appId===e.appId).length!==1)return {...base,state:"HOLD" as const,reason:"AMBIGUOUS_EVIDENCE"};
  unique.add(e.appId);
  if(!e.verifiedByClosure||!e.receiptId||!sha40.test(e.sourceCommit)||!Number.isSafeInteger(e.observationCount)||e.observationCount<1)
   return {...base,state:"HOLD" as const,reason:"SIGNATURE_OR_RECEIPT_PROVENANCE_UNVERIFIED"};
  const age=now.getTime()-Date.parse(e.verifiedAt);
  if(!Number.isFinite(age)||age<0||age>maxAgeMs)return {...base,state:"REVIEW_REQUIRED" as const,reason:"EVIDENCE_EXPIRED_OR_INVALID_TIME"};
  if(e.continuity.startsWith("REGRESSION")||e.continuity.startsWith("HOLD"))return {...base,state:"HOLD" as const,reason:"RELEASE_CONTINUITY_HOLD"};
  if(profile.mainCommit!=="SELF_AT_RUNTIME"&&profile.mainCommit!==e.sourceCommit)
   return {...base,state:"REVIEW_REQUIRED" as const,reason:"NEW_RELEASE_REQUIRES_INTERFACE_RECERTIFICATION"};
  // Signed transport evidence proves source provenance, not verified schemas/endpoints or field acceptance.
  return {...base,state:"REVIEW_REQUIRED" as const,reason:"SIGNED_SOURCE_VERIFIED_INTERFACE_AND_OWNER_ACCEPTANCE_PENDING"};
 });
 const nodes:ReleaseNode[]=certifications.map(c=>({
  appId:c.appId,release:c.release,state:c.state==="HOLD"?"HOLD":"REVIEW_REQUIRED",reason:c.reason
 }));
 const graph=planBuild439Releases(nodes,BUILD_439_EDGES);
 return {schema:BUILD_440_SCHEMA,build:440,capturedAt:now.toISOString(),certifications,graph,
  signedEvidenceCount:certifications.filter(x=>x.receiptId&&x.reason!=="SIGNATURE_OR_RECEIPT_PROVENANCE_UNVERIFIED").length,
  rolloutAcceptance:"HOLD_PENDING_INDEPENDENT_FIELD_CERTIFICATION" as const,
  explanation:"A source ledger closure is prior signed-intake evidence; this view does not independently reverify the original signature or grant promotion authority."};
}
