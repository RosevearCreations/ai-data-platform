import {readBuild446OwnerClosure} from "./build446-mailbox-closure-database";
import {readBuild441Dashboard} from "./build441-independent-field-witness-database";
import {build448EnrollmentInventory} from "./build448-genuine-witness-enrollment";
import {build448FromBuild447State,build448RecoveryDecision} from "./build448-provider-acceptance";
import {BUILD_447_APPS} from "./build447-recovery-witness-reconciliation";

export async function readBuild448OwnerEnrollment(userId:string,sessionCreatedAt:Date|string){
 // Owner authorization is enforced by the existing Build446 readback before examining key custody.
 const recovery=await readBuild446OwnerClosure(userId,sessionCreatedAt);
 const ownerRecovered=recovery.originalOwner==="VERIFIED_ACTIVE_OWNER_ACCOUNT"
  &&recovery.resetLink==="VALID_RESET_TOKEN_REDEEMED"&&recovery.newOwnerSession==="VERIFIED_POST_RESET";
 const decision=build448RecoveryDecision({
  ownerRecovered,originalEmailVerified:recovery.mailbox==="VERIFIED_BY_BETTER_AUTH_LINK",
  resetEmailAccepted:!!recovery.recoveryAcceptedAt,
  resetEvent:build448FromBuild447State(recovery.recoveryDelivery),
  verificationEmailAccepted:recovery.verificationMailRequested,
  verificationEvent:build448FromBuild447State(recovery.verificationDelivery)
 });
 const enrollment=build448EnrollmentInventory(
  process.env.BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON,
  process.env.BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON
 );
 let witnessReadback:"AVAILABLE"|"UNAVAILABLE_HOLD"="AVAILABLE";
 let certified=new Set<string>();
 let reasons=new Map<string,string>();
 try{
  const report=await readBuild441Dashboard(userId);
  for(const r of report.rows){
   if(r.state==="CERTIFIED")certified.add(r.appId);
   else reasons.set(r.appId,r.reason);
  }
 }catch{witnessReadback="UNAVAILABLE_HOLD";}
 const apps=BUILD_447_APPS.map(appId=>{
  const key=enrollment.applications.find(a=>a.appId===appId);
  const accepted=certified.has(appId)&&key?.status==="READY_FOR_SIGNED_ORIGINAL_DEVICE_SUBMISSION";
  return {appId,keyStatus:key?.status??"HOLD_NOT_ENROLLED",
   fieldStatus:accepted?"CERTIFIED_WITH_FRESH_ORIGINAL_EVIDENCE":"HOLD_ORIGINAL_DEVICE_WITNESS_REQUIRED",
   reason:accepted?"FRESH_INDEPENDENT_ORIGINAL_DEVICE_ACCEPTED":reasons.get(appId)??(key?.status??"NO_VERIFIED_ORIGINAL_DEVICE_RECEIPT")};
 });
 const acceptedCount=apps.filter(x=>x.fieldStatus==="CERTIFIED_WITH_FRESH_ORIGINAL_EVIDENCE").length;
 return {
  schema:"rosevear.ai-data-platform.build448-live-owner-field-review.v1",
  accountName:recovery.accountName,maskedOriginalLogin:recovery.maskedLoginEmail,
  mailboxAndProvider:decision,
  originalEmailVerified:recovery.mailbox==="VERIFIED_BY_BETTER_AUTH_LINK",
  originalOwnerRecovered:ownerRecovered,
  originalWitnessKeys:enrollment,
  witnessReadback,
  sevenApplicationAccepted:acceptedCount,sevenApplicationExpected:7,
  sevenApplicationState:acceptedCount===7?"CERTIFIED_FROM_GENUINE_FRESH_ORIGINAL_DEVICE_RECEIPTS":"HOLD_AWAITING_REAL_WITNESS_ENROLLMENT_AND_ACCEPTANCE",
  apps,
  safeguards:"No passwords, raw account email, Resend API keys, witness private signing keys or unsigned device claims are accepted as certification."
 };
}
