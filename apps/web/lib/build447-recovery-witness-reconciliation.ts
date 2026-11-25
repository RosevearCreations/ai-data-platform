export const BUILD_447=447 as const;
export const BUILD_447_SCHEMA="rosevear.ai-data-platform.build447-owner-recovery-resend-witness.v1" as const;
export const BUILD_447_APPS=["ai-data-platform","rosevear-comms-hub","rosevear-ai-hub","icamp","yw","devilndove","rosiedazzlers"] as const;
export type Build447AppId=typeof BUILD_447_APPS[number];
export type DeliveryState="NOT_CHECKED"|"PROVIDER_DELIVERED_NOT_MAILBOX_PROVEN"|"PROVIDER_FAILED"|"PENDING_OR_DELAYED"|"PROVIDER_STATE_UNRECOGNIZED";
export type WitnessState="CERTIFIED"|"HOLD"|"REVIEW_REQUIRED";
export type Build447WitnessRow={appId:string;state:WitnessState;reason:string;sourceCommit:string|null;observedAt:string|null};
export type Build447RecoveryInput={
 ownerCredential:boolean;ownerRole:boolean;postResetSession:boolean;resetTokenRedeemed:boolean;emailVerified:boolean;
 recoveryDelivery:DeliveryState;verificationDelivery:DeliveryState;recoveryAcceptedAt:string|null;
};
function timestamp(value:string|null){const n=value?Date.parse(value):NaN;return Number.isFinite(n)?n:null;}
export function classifyBuild447Delivery(input:Build447RecoveryInput,now=new Date()){
 const time=timestamp(input.recoveryAcceptedAt);
 if(!time)return {state:"NO_PROVIDER_ACCEPTANCE_RECEIPT" as const,action:"Request one password reset for the original registered account address."};
 const elapsed=now.getTime()-time;
 if(elapsed<0)return {state:"INVALID_RECEIPT_TIME_HOLD" as const,action:"Review timestamp and source custody; do not auto-resend."};
 switch(input.recoveryDelivery){
  case "PROVIDER_DELIVERED_NOT_MAILBOX_PROVEN":return {state:"PROVIDER_DELIVERED" as const,action:"Check original mailbox and complete verified-email link if needed."};
  case "PROVIDER_FAILED":return {state:"PROVIDER_DELIVERY_EXCEPTION" as const,action:"Inspect Resend message failure/bounce and verified sending domain. Do not automatically resend or change the owner account."};
  case "PENDING_OR_DELAYED":return {state:elapsed>15*60_000?"PROVIDER_DELIVERY_DELAYED_REVIEW" as const:"PROVIDER_DELIVERY_PENDING" as const,action:"Inspect Resend Emails for delivery status; allow the existing request to complete before manual retry."};
  case "NOT_CHECKED":return {state:"PROVIDER_LOOKUP_UNAVAILABLE" as const,action:"Verify Resend API key read permissions and the provider message ID before making any recovery decision."};
  default:return {state:"PROVIDER_EVENT_UNKNOWN_HOLD" as const,action:"Review unexpected Resend delivery event without claiming successful delivery."};
 }
}
export function reconcileBuild447(input:Build447RecoveryInput,rows:readonly Build447WitnessRow[],now=new Date()){
 const exception=classifyBuild447Delivery(input,now);
 const authenticatedRecovery=input.ownerCredential&&input.ownerRole&&input.resetTokenRedeemed&&input.postResetSession;
 const fullMailboxAndDelivery=authenticatedRecovery&&input.emailVerified&&exception.state==="PROVIDER_DELIVERED";
 const byId=new Map<string,Build447WitnessRow[]>();
 for(const row of rows){const matches=byId.get(row.appId)??[];matches.push(row);byId.set(row.appId,matches);}
 const applications=BUILD_447_APPS.map(appId=>{
  const matches=byId.get(appId)??[];
  if(matches.length!==1)return {appId,state:"HOLD" as const,reason:matches.length===0?"NO_INDEPENDENT_WITNESS_READBACK":"AMBIGUOUS_SOURCE_WITNESS_READBACK"};
  const r=matches[0];
  const stamp=timestamp(r.observedAt);
  const fresh=stamp!==null&&stamp<=now.getTime()&&now.getTime()-stamp<=15*60_000;
  if(r.state!=="CERTIFIED")return {appId,state:"HOLD" as const,reason:r.reason};
  if(!fresh)return {appId,state:"HOLD" as const,reason:"ORIGINAL_WITNESS_MISSING_OR_EXPIRED"};
  if(!r.sourceCommit||!/^[a-f0-9]{40}$/.test(r.sourceCommit))return {appId,state:"HOLD" as const,reason:"SOURCE_REVISION_UNVERIFIED"};
  return {appId,state:"CERTIFIED" as const,reason:"FRESH_INDEPENDENT_SOURCE_BOUND_WITNESS_VERIFIED"};
 });
 const certified=applications.filter(x=>x.state==="CERTIFIED").length;
 return {
  schema:BUILD_447_SCHEMA,build:447,
  ownerRecovery:authenticatedRecovery?"ORIGINAL_OWNER_POST_RESET_LOGIN_VERIFIED":"HOLD_PENDING_OWNER_RESET_AND_NEW_LOGIN",
  mailboxDeliveryClosure:fullMailboxAndDelivery?"VERIFIED_ORIGINAL_MAILBOX_AND_TRANSPORT":"HOLD_MAILBOX_VERIFICATION_OR_DELIVERY",
  emailVerification:input.emailVerified?"VERIFIED":"PENDING",
  deliveryException:exception,
  witnessCount:certified,witnessExpected:BUILD_447_APPS.length,
  applications,
  sevenApplicationClosure:certified===BUILD_447_APPS.length?"INDEPENDENT_WITNESSES_CERTIFIED":"HOLD_INDEPENDENT_WITNESSES_INCOMPLETE",
  automaticResends:0,automaticPasswordChanges:0,automaticSourceDeployments:0,
  limitations:"A signed witness remains subject to independent original-device, source revision and approval review. No missing evidence is synthesized."
 };
}
