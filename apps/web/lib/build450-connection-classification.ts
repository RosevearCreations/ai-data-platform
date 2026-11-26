import {BUILD_432_ALL_SOURCES} from "./master-build432-seven-source-closure";
export const BUILD_450=450 as const;
export const BUILD_450_SCHEMA="rosevear.ai-data-platform.build450-real-source-validation.v1" as const;
type SourceId=typeof BUILD_432_ALL_SOURCES[number];
export type ClosureEvidence={mode:string;observedAt:string;verifiedSources:number;state:string;sources:Record<string,{verified:boolean;receiptId:string|null;sourceCommit:string|null;detail:string}>};
export type LatestSourceStatus={appId:string;state:string;originReachable:boolean;credentialPresent:boolean;challengeVerified:boolean;observedAt:string;detail:string};
export type Build450Input={
 closures:readonly ClosureEvidence[];sourceStatus:readonly LatestSourceStatus[];originalWitnessCertified:ReadonlySet<string>;sourceKeyReady:ReadonlySet<string>;
 ownerAuthorizedValidation:boolean; now?:Date
};
const elapsed=(now:Date,at:string)=>now.getTime()-Date.parse(at);
export function classifyBuild450(input:Build450Input){
 const now=input.now??new Date();
 const sorted=[...input.closures].sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt));
 const last=sorted[0];
 const allSeven=sorted.find(x=>x.verifiedSources===7&&x.state==="SEVEN_OF_SEVEN_GENUINE_SIGNED_LIVE");
 const recent=last&&Number.isFinite(elapsed(now,last.observedAt))&&elapsed(now,last.observedAt)>=0&&elapsed(now,last.observedAt)<=2*60*60_000;
 const rows=BUILD_432_ALL_SOURCES.map(appId=>{
  const same=input.sourceStatus.filter(x=>x.appId===appId);
  const status=same.length===1?same[0]:null;
  const proof=last?.sources?.[appId];
  const historical=!!allSeven?.sources?.[appId]?.verified;
  const signedCurrent=!!recent&&proof?.verified===true&&!!proof.receiptId&&/^[a-f0-9]{40}$/.test(proof.sourceCommit??"");
  const statusAge=status?elapsed(now,status.observedAt):NaN;
  const originReachable=status?.originReachable===true&&Number.isFinite(statusAge)&&statusAge>=0&&statusAge<=2*60*60_000;
  const label=signedCurrent?"SIGNED_CHALLENGE_VERIFIED_RECENT":
   historical?"HISTORIC_SIGNED_SOURCE_CURRENT_REVALIDATION_REQUIRED":
   originReachable?"REACHABLE_SIGNED_SOURCE_HOLD":"SOURCE_CONNECTIVITY_HOLD";
  return {appId,state:label,
   historicallySigned:historical,recentlySigned:signedCurrent,
   originReachable,challengeVerifiedRecently:!!recent&&status?.challengeVerified===true,
   independentFieldWitness:input.originalWitnessCertified.has(appId)?"FRESH_INDEPENDENT_SOURCE_BOUND_PROOF":"NOT_VERIFIED",
   independentSignerKeyReady:input.sourceKeyReady.has(appId),
   sourceHoldReason:signedCurrent?"NONE":status?.state??(proof?.detail??"NO_SOURCE_EVIDENCE"),
   latestSourceObservedAt:status?.observedAt??null};
 });
 const current=rows.filter(x=>x.recentlySigned).length;
 const historically=rows.filter(x=>x.historicallySigned).length;
 const reachable=rows.filter(x=>x.originReachable).length;
 const verifiedField=rows.filter(x=>x.independentFieldWitness==="FRESH_INDEPENDENT_SOURCE_BOUND_PROOF").length;
 const firstPilot=rows.find(x=>x.recentlySigned);
 return {
  schema:BUILD_450_SCHEMA,build:450,
  ownerAuthorizedValidation:input.ownerAuthorizedValidation,
  history:allSeven?{state:"SEVEN_SOURCE_SIGNED_HISTORICALLY_VERIFIED",at:allSeven.observedAt,verified:historically}:{state:"NO_COMPLETE_SEVEN_SOURCE_HISTORICAL_EVIDENCE",at:null,verified:historically},
  latestSweep:last?{at:last.observedAt,state:last.state,verified:last.verifiedSources,fresh:!!recent}:null,
  currentSignedChallengeSources:current,currentlyReachableOrigins:reachable,
  independentOriginalDeviceWitnesses:verifiedField,independentFieldExpected:7,
  firstAuthenticSourceTelemetryPilot:firstPilot?{state:"SIGNED_V12_SOURCE_RECEIPT_VERIFIED",appId:firstPilot.appId}:
    {state:"AWAITING_NEW_SIGNED_SOURCE_CHALLENGE",appId:null},
  currentConnectionState:current===7?"SEVEN_SOURCE_SIGNED_LIVE":current>0?"PARTIAL_SIGNED_LIVE":"REVALIDATION_REQUIRED",
  independentFieldState:verifiedField===7?"SEVEN_INDEPENDENT_FIELD_WITNESSES_CERTIFIED":"INDEPENDENT_FIELD_EVIDENCE_INCOMPLETE",
  rows,
  automaticCredentialRotation:false,automaticDeviceAttestation:false,
  note:"Historic signed cross-application telemetry is genuine evidence of former communication, not a current connection or independent physical-device field witness. Owner authorization permits new signed connection challenges but cannot create another device's signature."
 };
}
