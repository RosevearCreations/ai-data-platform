import {build445ProviderState} from "./build445-owner-recovery-contract";
export const BUILD_446_SCHEMA="rosevear.ai-data-platform.build446-mailbox-delivery-recovery-closure.v1" as const;
export type Build446Proof={
 hasCredential:boolean;
 originalOwnerRole:boolean;
 originalEmailVerified:boolean;
 recoveryProviderReceiptAt:string|null;
 recoveryLastEvent:string|null;
 resetCompletedAt:string|null;
 authenticatedOwnerSessionCreatedAt:string|null;
 verificationProviderReceiptAt:string|null;
 verificationLastEvent:string|null;
};
function time(value:string|null){const n=value?Date.parse(value):NaN;return Number.isFinite(n)?n:null;}
export function reconcileBuild446(input:Build446Proof){
 const accepted=time(input.recoveryProviderReceiptAt);
 const reset=time(input.resetCompletedAt);
 const session=time(input.authenticatedOwnerSessionCreatedAt);
 const credentialVerified=input.hasCredential&&input.originalOwnerRole;
 const mailboxVerified=input.originalEmailVerified===true;
 const resetTokenRedeemed=accepted!==null&&reset!==null&&reset>=accepted;
 const newOwnerSession=resetTokenRedeemed&&session!==null&&session>=reset!;
 const recoveryDelivery=build445ProviderState(input.recoveryLastEvent);
 const verificationDelivery=build445ProviderState(input.verificationLastEvent);
 const delivered=recoveryDelivery==="PROVIDER_DELIVERED_NOT_MAILBOX_PROVEN";
 const finalClosure=credentialVerified&&mailboxVerified&&resetTokenRedeemed&&newOwnerSession&&delivered;
 return {
  schema:BUILD_446_SCHEMA,
  originalOwner:credentialVerified?"VERIFIED_ACTIVE_OWNER_ACCOUNT":"HOLD_OWNER_IDENTITY",
  mailbox:mailboxVerified?"VERIFIED_BY_BETTER_AUTH_LINK":"HOLD_UNVERIFIED_ORIGINAL_EMAIL",
  resetLink:resetTokenRedeemed?"VALID_RESET_TOKEN_REDEEMED":"HOLD_NO_COMPLETED_RECOVERY_TOKEN",
  recoveryDelivery,
  verificationDelivery,
  verificationMailRequested:time(input.verificationProviderReceiptAt)!==null,
  newOwnerSession:newOwnerSession?"VERIFIED_POST_RESET":"HOLD_NO_POST_RESET_OWNER_SESSION",
  closure:finalClosure?"VERIFIED_AUTHENTICATED_RECOVERY_CLOSURE":"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE",
  automaticPasswordMutation:false,automaticEmailMutation:false,
  note:"Transport delivery does not prove mailbox control. Better Auth verified-email flag requires a real verification link. A completed reset alone does not prove a new owner session."
 };
}
