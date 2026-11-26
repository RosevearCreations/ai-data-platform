export const BUILD_445=445 as const;
export const BUILD_445_SCHEMA="rosevear.ai-data-platform.build445-owner-recovery.v1" as const;
export type Build445Stage="PROVIDER_ACCEPTED"|"PROVIDER_REJECTED"|"RESET_COMPLETED";
export function build445MaskedEmail(email:string){
 const [local,domain]=email.trim().toLowerCase().split("@");
 if(!local||!domain||domain.includes("@"))return "not available";
 return local.slice(0,Math.min(2,local.length))+"***@"+domain;
}
export function build445ProviderState(event:string|null|undefined){
 if(!event)return "NOT_CHECKED" as const;
 const normalized=event.trim().toLowerCase().replace(/^email[.]/,"");
 if(["delivered","opened","clicked"].includes(normalized))return "PROVIDER_DELIVERED_NOT_MAILBOX_PROVEN" as const;
 if(["bounced","bounced_transient","bounced_permanent","bounced_undetermined","complained","failed","suppressed","canceled"].includes(normalized))return "PROVIDER_FAILED" as const;
 if(["sent","queued","scheduled","delivery_delayed"].includes(normalized))return "PENDING_OR_DELAYED" as const;
 return "PROVIDER_STATE_UNRECOGNIZED" as const;
}
export function build445OwnerCeremony(input:{
 credential:boolean;ownerRole:boolean;emailVerified:boolean;providerAccepted:boolean;passwordResetCompleted:boolean;providerLastEvent:string|null;ownerSessionVerified:boolean;
}){
 const provider=build445ProviderState(input.providerLastEvent);
 return {
  schema:BUILD_445_SCHEMA,build:445,
  inventoryState:input.credential&&input.ownerRole?"EXISTING_OWNER_CREDENTIAL_ACCOUNT":"OWNER_ACCOUNT_NEEDS_REVIEW",
  providerAcceptance:input.providerAccepted?"ACCEPTED_BY_PROVIDER_NOT_DELIVERY":"NOT_ACCEPTED_OR_NOT_REQUESTED",
  deliveryState:provider,
  recoveryTransaction:input.passwordResetCompleted?"PASSWORD_RESET_COMPLETED":"AWAITING_VERIFIED_RESET",
  ownerSessionState:input.ownerSessionVerified?"AUTHENTICATED_OWNER":"OWNER_SIGN_IN_REQUIRED",
  addressVerified:input.emailVerified,
  completed:input.passwordResetCompleted&&input.ownerSessionVerified&&input.ownerRole,
  independentFieldAcceptance:"HOLD_PENDING_GENUINE_ORIGINAL_DEVICE_PROOFS" as const,
  explanation:"Provider acceptance is not delivery; provider delivery is not mailbox control; password reset is not proof of a new signed-in owner session."
 };
}
