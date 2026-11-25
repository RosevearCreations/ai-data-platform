import {randomUUID} from "node:crypto";
import {withProtectedDatabase} from "./database";
export type Build446VerificationStage="REQUESTED"|"PROVIDER_ACCEPTED"|"PROVIDER_REJECTED";
export async function recordBuild446MailboxReceipt(userId:string,stage:Build446VerificationStage,emailId:string|null=null){
 await withProtectedDatabase(async client=>{
  await client.query("insert into app.master_build446_mailbox_verification_receipts(receipt_id,user_id,stage,provider_email_id) values($1,$2,$3,$4)",
  [randomUUID(),userId,stage,emailId]);
 });
}
/** Rate limit original-owner verification mails to one per 30 minutes. The transaction-level lock serializes concurrent requests. */
export async function reserveBuild446Verification(userId:string){
 return withProtectedDatabase(async client=>{
  await client.query("select pg_advisory_xact_lock(hashtext($1))",[userId]);
  const previous=await client.query("select 1 from app.master_build446_mailbox_verification_receipts where user_id=$1 and stage='REQUESTED' and occurred_at>now()-interval '30 minutes' limit 1",[userId]);
  if(previous.rowCount)return false;
  await client.query("insert into app.master_build446_mailbox_verification_receipts(receipt_id,user_id,stage) values($1,$2,'REQUESTED')",[randomUUID(),userId]);
  return true;
 });
}
