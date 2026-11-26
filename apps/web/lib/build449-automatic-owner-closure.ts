export const BUILD_449=449 as const;
export const BUILD_449_SCHEMA="rosevear.ai-data-platform.build449-automatic-recovery-and-witness-continuity.v1" as const;
export const BUILD_449_APPS=["ai-data-platform","rosevear-comms-hub","rosevear-ai-hub","icamp","yw","devilndove","rosiedazzlers"] as const;
export type Build449Input={
 originalOwnerRecovered:boolean;
 resetMessageDelivery:"DELIVERED"|"FAILED"|"DELAYED"|"UNKNOWN"|"NOT_REQUESTED";
 betterAuthEmailVerified:boolean;
 independentlyEnrolledKeys:number;
 genuineFreshWitnesses:number;
 apps:readonly {appId:string;keyStatus:string;fieldStatus:string;reason:string}[];
 witnessReadback:"AVAILABLE"|"UNAVAILABLE_HOLD";
};
export function reconcileBuild449(input:Build449Input){
 const resetLinkAndLoginVerified=input.originalOwnerRecovered;
 const gmailControlEvidence=resetLinkAndLoginVerified&&input.resetMessageDelivery==="DELIVERED";
 // The recovered owner necessarily redeemed a time-limited token mailed to the ORIGINAL registered address.
 // This is recovery-link evidence of mailbox access, not the separate Better Auth emailVerified flag.
 const recoveryProof=gmailControlEvidence?"ORIGINAL_MAILBOX_RECOVERY_LINK_REDEEMED":
   resetLinkAndLoginVerified?"ORIGINAL_OWNER_LOGIN_RESTORED_DELIVERY_REVIEW_PENDING":"HOLD_ORIGINAL_OWNER_RECOVERY";
 const applications=BUILD_449_APPS.map(appId=>{
  const matches=input.apps.filter(a=>a.appId===appId);
  if(matches.length!==1)return {appId,state:"HOLD",reason:"UNIQUE_SOURCE_REPORT_REQUIRED",automaticOriginalDeviceEnrollment:false};
  const a=matches[0];
  return {appId,state:a.fieldStatus==="CERTIFIED_WITH_FRESH_ORIGINAL_EVIDENCE"?"CERTIFIED":"HOLD",
   reason:a.fieldStatus==="CERTIFIED_WITH_FRESH_ORIGINAL_EVIDENCE"?"FRESH_VERIFIED_ORIGINAL_DEVICE_WITNESS":a.keyStatus==="HOLD_NOT_ENROLLED"?"INDEPENDENT_DEVICE_SIGNING_KEY_NOT_CONNECTED":a.reason,
   automaticOriginalDeviceEnrollment:false};
 });
 const certified=applications.filter(a=>a.state==="CERTIFIED").length;
 return {
  schema:BUILD_449_SCHEMA,build:449,
  originalOwnerSession:resetLinkAndLoginVerified?"RECOVERED_AND_AUTHENTICATED":"HOLD",
  originalGmailRecoveryEvidence:recoveryProof,
  additionalEmailVerificationFlag:input.betterAuthEmailVerified?"VERIFIED_BY_BETTER_AUTH_EMAIL_LINK":"NOT_SET_DISTINCT_FROM_SUCCESSFUL_PASSWORD_RECOVERY",
  providerDelivery:input.resetMessageDelivery,
  ownerRecoveryNextStep:resetLinkAndLoginVerified?"NO_PASSWORD_RESET_OR_JSON_ACTION_REQUIRED":"OWNER_AUTHENTICATION_NOT_YET_COMPLETE",
  originalOwnerRecoveryClosure:gmailControlEvidence?"RECOVERY_EVIDENCE_COMPLETE":"HOLD_ORIGINAL_RECOVERY_DELIVERY",
  sevenAppKeyReadiness:input.independentlyEnrolledKeys,
  sevenAppGenuineWitnessCount:certified,
  appsExpected:BUILD_449_APPS.length,
  applications,
  sevenAppFieldCertification:certified===7&&input.witnessReadback==="AVAILABLE"?"CERTIFIED_WITH_SEVEN_INDEPENDENT_ORIGINAL_WITNESSES":"HOLD_PENDING_SOURCE_SIDE_INDEPENDENT_SIGNERS",
  witnessReadback:input.witnessReadback,
  unattendedSourceDeviceSigning:false,
  manualJSONInputRequired:false,
  automaticResends:0,automaticPasswordChanges:0,syntheticWitnessCount:0,
  note:"The original password-reset token and owner login demonstrate recovery-link mailbox access. The Better Auth emailVerified flag remains separate. Independent original-device witnesses cannot be created from GitHub, Vercel or database access."
 };
}
