import {authPool,withUserDatabase} from "./database";
import {fetchBuild445ProviderEvent} from "./build445-recovery-ledger";
import {reconcileBuild446} from "./build446-mailbox-closure";
import {build445MaskedEmail} from "./build445-owner-recovery-contract";
type Receipt={stage:string;provider_email_id:string|null;occurred_at:Date};
export async function readBuild446OwnerClosure(userId:string,sessionCreatedAt:Date|string){
 const [role,account,resetReceipts,verificationReceipts]=await Promise.all([
  withUserDatabase(userId,async client=>(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null),
  authPool.query<{name:string;email:string;email_verified:boolean;credential:boolean}>(
   `select u.name,u.email,u."emailVerified" as email_verified,
      exists(select 1 from auth.account a where a."userId"=u.id and a."providerId"='credential') as credential
    from auth."user" u where u.id=$1`,[userId]),
  withUserDatabase(userId,async client=>(await client.query<Receipt>(
   "select stage,provider_email_id,occurred_at from app.master_build445_owner_recovery_receipts where user_id=$1 order by occurred_at desc limit 60",[userId])).rows),
  withUserDatabase(userId,async client=>(await client.query<Receipt>(
   "select stage,provider_email_id,occurred_at from app.master_build446_mailbox_verification_receipts where user_id=$1 order by occurred_at desc limit 30",[userId])).rows)
 ]);
 if(role!=="owner")throw Error("build446_owner_required");
 const u=account.rows[0];if(!u)throw Error("build446_original_user_missing");
 const latestReset=resetReceipts.find(r=>r.stage==="RESET_COMPLETED");
 const lastAccepted=resetReceipts.find(r=>r.stage==="PROVIDER_ACCEPTED"&&!!r.provider_email_id&&(!latestReset||r.occurred_at<=latestReset.occurred_at));
 const verifyAccepted=verificationReceipts.find(r=>r.stage==="PROVIDER_ACCEPTED"&&!!r.provider_email_id);
 const [resetDelivery,verifyDelivery]=await Promise.all([
  lastAccepted?.provider_email_id?fetchBuild445ProviderEvent(lastAccepted.provider_email_id):Promise.resolve(null),
  verifyAccepted?.provider_email_id?fetchBuild445ProviderEvent(verifyAccepted.provider_email_id):Promise.resolve(null)
 ]);
 const state=reconcileBuild446({
  hasCredential:u.credential,originalOwnerRole:role==="owner",originalEmailVerified:u.email_verified,
  recoveryProviderReceiptAt:lastAccepted?.occurred_at.toISOString()??null,
  recoveryLastEvent:resetDelivery,
  resetCompletedAt:latestReset?.occurred_at.toISOString()??null,
  authenticatedOwnerSessionCreatedAt:new Date(sessionCreatedAt).toISOString(),
  verificationProviderReceiptAt:verifyAccepted?.occurred_at.toISOString()??null,
  verificationLastEvent:verifyDelivery
 });
 return {...state,accountName:u.name,maskedLoginEmail:build445MaskedEmail(u.email),
  verificationRequestsLast30m:verificationReceipts.filter(x=>x.stage==="REQUESTED"&&Date.now()-x.occurred_at.getTime()<1800000).length,
  recoveryReceipts:resetReceipts.length,mailboxVerificationReceipts:verificationReceipts.length};
}
