import {BUILD_438_PROFILES} from "./build438-interface-drift-observatory";
import {BUILD_439_EDGES,planBuild439Releases,type ReleaseNode} from "./build439-release-dependency-graph";
import type {Build440Certification} from "./build440-release-certification";

export const BUILD_441=441 as const;
export const BUILD_441_SCHEMA="rosevear.ai-data-platform.build441-independent-field-witness.v1" as const;
export const BUILD_441_MAX_AGE_MS=15*60*1000;
const SHA=/^[a-f0-9]{40}$/;
export type Build441Witness={
 appId:string;sourceCommit:string;witnessId:string;witnessRole:string;
 originalDeviceId:string;observedAt:string;signatureVerified:boolean;
 independentOfSource:boolean;interfaceCertified:boolean;receiverAckVerified:boolean;
 ownerAcceptanceVerified:boolean;revoked:boolean;
};
export function reconcileBuild441(
 source:readonly Build440Certification[],
 witnesses:readonly Build441Witness[],
 now=new Date()
){
 const sourceById=new Map(source.map(s=>[s.appId,s]));
 const rows=BUILD_438_PROFILES.map(profile=>{
  const s=sourceById.get(profile.appId);
  const matching=witnesses.filter(w=>w.appId===profile.appId);
  const w=matching.length===1?matching[0]:null;
  let state:"CERTIFIED"|"HOLD"|"REVIEW_REQUIRED"="REVIEW_REQUIRED";
  let reason="INDEPENDENT_FIELD_WITNESS_REQUIRED";
  if(!s||s.state==="HOLD"){state="HOLD";reason="SOURCE_SIGNED_EVIDENCE_HOLD";}
  else if(!s.receiptId||!s.sourceCommit||!SHA.test(s.sourceCommit)){reason="SOURCE_PROVENANCE_UNVERIFIED";}
  else if(matching.length>1){state="HOLD";reason="AMBIGUOUS_INDEPENDENT_WITNESS";}
  else if(w){
   const age=now.getTime()-Date.parse(w.observedAt);
   if(w.revoked){state="HOLD";reason="WITNESS_REVOKED";}
   else if(!w.signatureVerified||!w.independentOfSource||!w.witnessId||!w.witnessRole||!w.originalDeviceId){state="HOLD";reason="WITNESS_AUTHORITY_OR_SIGNATURE_INVALID";}
   else if(!Number.isFinite(age)||age<0||age>BUILD_441_MAX_AGE_MS){reason="FIELD_WITNESS_STALE";}
   else if(w.sourceCommit!==s.sourceCommit){state="HOLD";reason="WITNESS_SOURCE_COMMIT_MISMATCH";}
   else if(!w.interfaceCertified||!w.receiverAckVerified||!w.ownerAcceptanceVerified){reason="FIELD_INTERFACE_RECEIVER_OR_OWNER_ACCEPTANCE_PENDING";}
   else if(s.reason==="SIGNED_SOURCE_VERIFIED_INTERFACE_AND_OWNER_ACCEPTANCE_PENDING"){
    state="CERTIFIED";reason="INDEPENDENT_SOURCE_BOUND_WITNESS_VERIFIED";
   }else{reason="SOURCE_REVISION_REVIEW_STILL_REQUIRED";}
  }
  return {appId:profile.appId,release:profile.buildLabel,state,reason,sourceCommit:s?.sourceCommit??null,receiptId:s?.receiptId??null,witnessId:w?.witnessId??null,observedAt:w?.observedAt??null};
 });
 const nodes:ReleaseNode[]=rows.map(row=>({appId:row.appId,release:row.release,state:row.state==="CERTIFIED"?"READY":row.state==="HOLD"?"HOLD":"REVIEW_REQUIRED",reason:row.reason}));
 const graph=planBuild439Releases(nodes,BUILD_439_EDGES);
 const certified=rows.filter(row=>row.state==="CERTIFIED").length;
 return {schema:BUILD_441_SCHEMA,build:441,capturedAt:now.toISOString(),rows,graph,certified,
  rolloutState:graph.safeToPromote&&certified===rows.length?"READY_FOR_SOURCE_AUTHORIZED_ROLLOUT":"HOLD_PENDING_INDEPENDENT_CERTIFICATION",
  automaticActionsPerformed:0,
  limitations:"Witness rows require independently verified original-host signatures and source-separated authority before admission. Graph READY is advisory and never deploys or grants source/owner authority."};
}
