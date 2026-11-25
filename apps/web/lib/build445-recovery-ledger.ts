import {randomUUID} from "node:crypto";
import {authPool,withProtectedDatabase,withUserDatabase} from "./database";
import {build445MaskedEmail,build445OwnerCeremony,build445ProviderState,type Build445Stage} from "./build445-owner-recovery-contract";

export async function recordBuild445RecoveryStage(userId:string,stage:Build445Stage,providerEmailId:string|null=null){
 await withProtectedDatabase(async client=>{await client.query(
  "insert into app.master_build445_owner_recovery_receipts(receipt_id,user_id,stage,provider_email_id) values($1,$2,$3,$4)",
  [randomUUID(),userId,stage,providerEmailId]);});
}
export async function readBuild445OwnerInventory(userId:string){
 const role=await withUserDatabase(userId,async client=>{
  const r=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  return r.rows[0]?.role??null;
 });
 if(role!=="owner")throw new Error("build445_original_owner_role_required");
 // Auth tables are deliberately unavailable to application RLS roles. Only read this exact session's identity via the existing auth service connection.
 const [account,history]=await Promise.all([
  authPool.query<{name:string;email:string;email_verified:boolean;credential:boolean}>(
   'select u.name,u.email,u."emailVerified" as email_verified,exists(select 1 from auth.account a where a."userId"=u.id and a."providerId"=\'credential\') as credential from auth."user" u where u.id=$1',[userId]),
  withUserDatabase(userId,async client=>client.query<{stage:Build445Stage;provider_email_id:string|null;occurred_at:Date}>(
   "select stage,provider_email_id,occurred_at from app.master_build445_owner_recovery_receipts where user_id=$1 order by occurred_at desc limit 12",[userId]))
 ]);
 const u=account.rows[0];if(!u)throw new Error("build445_original_owner_missing");
 const latestAccepted=history.rows.find(r=>r.stage==="PROVIDER_ACCEPTED"&&r.provider_email_id);
 const providerEvent=latestAccepted?await fetchBuild445ProviderEvent(latestAccepted.provider_email_id!):null;
 const ceremony=build445OwnerCeremony({
  credential:u.credential,ownerRole:true,emailVerified:u.email_verified,providerAccepted:!!latestAccepted,
  passwordResetCompleted:history.rows.some(r=>r.stage==="RESET_COMPLETED"),providerLastEvent:providerEvent,ownerSessionVerified:true
 });
 return {...ceremony,account:{name:u.name,maskedEmail:build445MaskedEmail(u.email),emailVerified:u.email_verified,hasCredential:u.credential},
  receipts:history.rows.map(r=>({stage:r.stage,occurredAt:r.occurred_at.toISOString(),deliveryState:r.provider_email_id===latestAccepted?.provider_email_id?build445ProviderState(providerEvent):"NOT_CHECKED"}))};
}
async function fetchBuild445ProviderEvent(emailId:string){
 if(!/^[a-zA-Z0-9-]{8,100}$/.test(emailId)||!process.env.RESEND_API_KEY)return null;
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
   const r=await fetch("https://api.resend.com/emails/"+encodeURIComponent(emailId),
   {headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,Accept:"application/json"},cache:"no-store",signal:controller.signal});
   if(!r.ok)return null;
   const data=await r.json() as {last_event?:unknown};
   return typeof data.last_event==="string"?data.last_event:null;
  }finally{clearTimeout(timer);}
 }catch{return null;}
}
