import type {DeliveryState} from "./build447-recovery-witness-reconciliation";
export const BUILD_448=448 as const;
export const BUILD_448_SCHEMA="rosevear.ai-data-platform.build448-owner-mailbox-provider-witness.v1" as const;
export type Build448Transport="DELIVERED"|"FAILED"|"DELAYED"|"UNKNOWN"|"NOT_REQUESTED";
export function build448Transport(event:string|null|undefined,accepted:boolean):{state:Build448Transport;reason:string}{
 if(!accepted)return {state:"NOT_REQUESTED",reason:"NO_PROVIDER_ACCEPTANCE_RECEIPT"};
 if(!event)return {state:"UNKNOWN",reason:"PROVIDER_LOOKUP_MISSING_OR_UNAVAILABLE"};
 const v=event.toLowerCase().trim().replace(/^email\./,"");
 if(["delivered","opened","clicked"].includes(v))return {state:"DELIVERED",reason:"RESEND_REPORTS_DELIVERY_NOT_MAILBOX_OWNERSHIP"};
 if(["bounced","complained","failed","suppressed","canceled","bounced_transient","bounced_permanent","bounced_undetermined"].includes(v))
  return {state:"FAILED",reason:"PROVIDER_BOUNCE_SUPPRESSION_FAILURE_OR_COMPLAINT"};
 if(["sent","queued","scheduled","delivery_delayed","received"].includes(v))
  return {state:"DELAYED",reason:"PROVIDER_ACCEPTED_DELIVERY_PENDING"};
 return {state:"UNKNOWN",reason:"UNRECOGNIZED_PROVIDER_EVENT"};
}
export function build448RecoveryDecision(input:{
 ownerRecovered:boolean;originalEmailVerified:boolean;resetEmailAccepted:boolean;
 resetEvent:string|null;verificationEmailAccepted:boolean;verificationEvent:string|null;
}){
 const reset=build448Transport(input.resetEvent,input.resetEmailAccepted);
 const verification=build448Transport(input.verificationEvent,input.verificationEmailAccepted);
 const mailbox=input.originalEmailVerified?"VERIFIED_BY_AUTH_PROVIDER":"ORIGINAL_MAILBOX_VERIFICATION_REQUIRED";
 const closure=input.ownerRecovered&&input.originalEmailVerified&&reset.state==="DELIVERED"?
  "VERIFIED_ORIGINAL_OWNER_MAILBOX_AND_PROVIDER_DELIVERY":"HOLD_PENDING_ORIGINAL_MAILBOX_OR_PROVIDER_EVIDENCE";
 const action= !input.ownerRecovered?"RECOVER_EXISTING_OWNER_LOGIN":
  !input.originalEmailVerified?"COMPLETE_ORIGINAL_GMAIL_VERIFICATION_LINK":
  reset.state!=="DELIVERED"?"INSPECT_RESEND_EMAIL_DETAILS_WITHOUT_AUTOMATIC_RESEND":"NO_OWNER_RECOVERY_ACTION_REQUIRED";
 return {schema:BUILD_448_SCHEMA,build:448,ownerLogin:input.ownerRecovered?"VERIFIED":"HOLD",
  mailbox,resetTransport:reset,verificationTransport:verification,closure,nextAction:action,
  providerDeliveryDoesNotVerifyMailbox:true,automaticPasswordChanges:0,automaticResends:0};
}
export function build448FromBuild447State(state:DeliveryState):string|null{
 switch(state){
  case "PROVIDER_DELIVERED_NOT_MAILBOX_PROVEN":return "delivered";
  case "PROVIDER_FAILED":return "failed";
  case "PENDING_OR_DELAYED":return "delivery_delayed";
  case "PROVIDER_STATE_UNRECOGNIZED":return "unrecognized";
  default:return null;
 }
}
