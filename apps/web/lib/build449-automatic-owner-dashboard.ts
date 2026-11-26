import {readBuild448OwnerEnrollment} from "./build448-live-owner-enrollment";
import {reconcileBuild449} from "./build449-automatic-owner-closure";
export async function readBuild449Dashboard(userId:string,sessionCreatedAt:Date|string){
 // Delegates to the owner-authorized Build 448 readback; no unsigned source submission is made.
 const s=await readBuild448OwnerEnrollment(userId,sessionCreatedAt);
 const certified=reconcileBuild449({
  originalOwnerRecovered:s.originalOwnerRecovered,
  resetMessageDelivery:s.mailboxAndProvider.resetTransport.state,
  betterAuthEmailVerified:s.originalEmailVerified,
  independentlyEnrolledKeys:s.originalWitnessKeys.appsReady,
  genuineFreshWitnesses:s.sevenApplicationAccepted,
  apps:s.apps,
  witnessReadback:s.witnessReadback
 });
 return {...certified,
  accountName:s.accountName,maskedOriginalLogin:s.maskedOriginalLogin,
  sourceEnrollmentConfigured:s.originalWitnessKeys.configured===true,
  invalidSourceKeyRecords:s.originalWitnessKeys.invalidEntries,
  actionsPerformed:0,
  readbackAt:new Date().toISOString()};
}
