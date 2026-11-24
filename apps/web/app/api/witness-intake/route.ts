import {randomUUID} from "node:crypto";
import {withProtectedDatabase} from "@/lib/database";
import {verifyBuild442Witness,type WitnessEnvelope} from "@/lib/build442-witness-crypto";
import {requireBuild443WitnessBinding,type Build443WitnessBinding} from "@/lib/build443-witness-key-custody";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const pinsText=process.env.BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON;
 const bindingText=process.env.BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON;
 if(!pinsText||!bindingText)return Response.json({error:"trusted_witness_enrollment_not_configured"},{status:503});
 const length=Number(request.headers.get("content-length")??0);
 if(length>12_000)return Response.json({error:"payload_too_large"},{status:413});
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>12_000)return Response.json({error:"payload_too_large"},{status:413});
  const pins=JSON.parse(pinsText) as Record<string,string>;
  const v=JSON.parse(raw) as WitnessEnvelope;
  const witness=verifyBuild442Witness(v,pins);
  const bindings=JSON.parse(bindingText) as Record<string,Build443WitnessBinding>;
  requireBuild443WitnessBinding(v,bindings);
  const id=randomUUID();
  await withProtectedDatabase(async client=>{
   await client.query("begin");
   try{
    await client.query(`insert into app.master_build441_field_witness(witness_id,app_id,source_commit,witness_role,original_device_id,observed_at,signature_verified,independent_of_source,interface_certified,receiver_ack_verified,owner_acceptance_verified,verifier_receipt_id)
     values($1,$2,$3,$4,$5,$6,true,true,true,true,true,$7)`,[id,witness.appId,witness.sourceCommit,witness.witnessRole,witness.originalDeviceId,witness.observedAt,witness.witnessId]);
    await client.query("insert into app.master_build442_witness_replay(key_id,nonce,app_id,witness_id) values($1,$2,$3,$4)",[v.keyId,witness.nonce,witness.appId,id]);
    await client.query("commit");
   }catch(e){await client.query("rollback");throw e;}
  });
  return Response.json({accepted:true,witnessId:id},{status:202,headers:{"Cache-Control":"no-store"}});
 }catch{
  return Response.json({error:"invalid_or_duplicate_witness"},{status:400,headers:{"Cache-Control":"no-store"}});
 }
}
