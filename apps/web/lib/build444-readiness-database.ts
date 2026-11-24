import {withUserDatabase} from "./database";
import {build444Readiness} from "./build444-owner-recovery-ceremony";
import type {Build443WitnessBinding} from "./build443-witness-key-custody";
export function publicBuild444Readiness(){
 let bindings:Record<string,Build443WitnessBinding>|null=null;
 try{if(process.env.BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON)bindings=JSON.parse(process.env.BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON) as Record<string,Build443WitnessBinding>;}catch{/* malformed enrollment stays held */}
 return build444Readiness({
  mailKeyPresent:Boolean(process.env.RESEND_API_KEY),
  senderPresent:Boolean(process.env.AUTH_RECOVERY_FROM_EMAIL),
  senderAddress:process.env.AUTH_RECOVERY_FROM_EMAIL??null,
  trustedWitnessPinsPresent:Boolean(process.env.BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON),
  witnessBindings:bindings
 });
}
export async function readBuild444OwnerCeremony(userId:string){
 const role=await withUserDatabase(userId,async client=>{
  const r=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  return r.rows[0]?.role??null;
 });
 if(role!=="owner")throw new Error("build444_original_owner_role_required");
 return { ...publicBuild444Readiness(),ownerSessionVerified:true,ownerRoleVerified:true,
  explanation:"An authenticated owner session confirms current owner-role access only. Account mailbox possession, delivered recovery email and independent original-device acceptance require separate evidence."};
}
