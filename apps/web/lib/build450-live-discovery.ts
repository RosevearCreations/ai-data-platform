import {readBuild432Dashboard} from "./build432-seven-source-closure-database";
import {readBuild431Dashboard} from "./build431-genuine-signer-expansion-database";
import {readBuild449Dashboard} from "./build449-automatic-owner-dashboard";
import {classifyBuild450,type ClosureEvidence,type LatestSourceStatus} from "./build450-connection-classification";
export async function readBuild450ConnectionValidation(userId:string,sessionCreatedAt:Date|string){
 const [closure,source,witness]=await Promise.all([
  readBuild432Dashboard(userId),readBuild431Dashboard(userId),readBuild449Dashboard(userId,sessionCreatedAt)
 ]);
 const closures:ClosureEvidence[]=closure.runs.map(run=>{
  const typed=run.source_receipt_ids as Record<string,unknown>;
  const sources:ClosureEvidence["sources"]={};
  for(const [key,v] of Object.entries(typed??{})){
   const row=(v??{}) as {verified?:boolean;receiptId?:string|null;sourceCommit?:string|null;detail?:string};
   sources[key]={verified:row.verified===true,receiptId:row.receiptId??null,sourceCommit:row.sourceCommit??null,detail:row.detail??"NO_SOURCE_DETAIL"};
  }
  return {mode:run.mode,observedAt:run.observed_at,verifiedSources:run.verified_sources,state:run.state,sources};
 });
 const sourceStatus:LatestSourceStatus[]=source.sources.map(a=>({
  appId:a.appId,state:a.state,
  originReachable:a.observation?.origin_reachable===true,
  credentialPresent:a.observation?.credential_present===true,
  challengeVerified:a.observation?.challenge_verified===true,
  observedAt:a.observation?.observed_at??"",detail:a.observation?.detail??"NO_RECENT_SOURCE_OBSERVATION"
 }));
 const certified=new Set(witness.applications.filter(a=>a.state==="CERTIFIED").map(a=>a.appId));
 const sourceKeyReady=new Set(witness.applications.filter(a=>a.reason!=="INDEPENDENT_DEVICE_SIGNING_KEY_NOT_CONNECTED").map(a=>a.appId));
 const report=classifyBuild450({closures,sourceStatus,originalWitnessCertified:certified,sourceKeyReady,ownerAuthorizedValidation:true});
 return {...report,maskedOwnerAccount:witness.maskedOriginalLogin,ownerRecovered:witness.originalOwnerSession==="RECOVERED_AND_AUTHENTICATED",
  ownerRecoveryEvidence:witness.originalGmailRecoveryEvidence,
  providerDelivery:witness.providerDelivery,
  lastOperatorValidationAt:closures.find(x=>x.mode==="OPERATOR")?.observedAt??null};
}
