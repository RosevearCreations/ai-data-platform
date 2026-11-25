import {readBuild446OwnerClosure} from "./build446-mailbox-closure-database";
import {readBuild441Dashboard} from "./build441-independent-field-witness-database";
import {reconcileBuild447,type Build447WitnessRow} from "./build447-recovery-witness-reconciliation";

export async function readBuild447OwnerOperations(userId:string,sessionCreatedAt:Date|string){
 const recovery=await readBuild446OwnerClosure(userId,sessionCreatedAt);
 let witnessReadback:"AVAILABLE"|"UNAVAILABLE_HOLD"="AVAILABLE";
 let rows:Build447WitnessRow[]=[];
 try{
  const witness=await readBuild441Dashboard(userId);
  rows=witness.rows.map(r=>({appId:r.appId,state:r.state,reason:r.reason,sourceCommit:r.sourceCommit,observedAt:r.observedAt}));
 }catch{witnessReadback="UNAVAILABLE_HOLD";}
 const result=reconcileBuild447({
  ownerCredential:recovery.originalOwner==="VERIFIED_ACTIVE_OWNER_ACCOUNT",
  ownerRole:recovery.originalOwner==="VERIFIED_ACTIVE_OWNER_ACCOUNT",
  resetTokenRedeemed:recovery.resetLink==="VALID_RESET_TOKEN_REDEEMED",
  postResetSession:recovery.newOwnerSession==="VERIFIED_POST_RESET",
  emailVerified:recovery.mailbox==="VERIFIED_BY_BETTER_AUTH_LINK",
  recoveryDelivery:recovery.recoveryDelivery,
  verificationDelivery:recovery.verificationDelivery,
  recoveryAcceptedAt:recovery.recoveryAcceptedAt
 },rows);
 return {...result,witnessReadback,accountLabel:recovery.accountName,maskedLoginEmail:recovery.maskedLoginEmail,
  resetCompletedAt:recovery.resetCompletedAt,verificationStatus:recovery.mailbox,
  providerResetStatus:recovery.recoveryDelivery,providerVerificationStatus:recovery.verificationDelivery,
  emailVerificationRequestPath:"/owner-recovery-closure"};
}
