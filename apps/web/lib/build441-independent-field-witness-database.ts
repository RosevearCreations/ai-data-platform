import {withUserDatabase} from "./database";
import {readBuild440Dashboard} from "./build440-release-certification-database";
import {reconcileBuild441,type Build441Witness} from "./build441-independent-field-witness";

type WitnessRow={app_id:string;source_commit:string;witness_id:string;witness_role:string;original_device_id:string;observed_at:Date;signature_verified:boolean;independent_of_source:boolean;interface_certified:boolean;receiver_ack_verified:boolean;owner_acceptance_verified:boolean;revoked:boolean};

export async function readBuild441Dashboard(userId:string){
 const source=await readBuild440Dashboard(userId);
 return withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build441_operator_required");
  // Always read all records in the freshness window. More than one matching original witness is ambiguous.
  const result=await client.query<WitnessRow>(`select app_id,source_commit,witness_id::text,witness_role,original_device_id,observed_at,
   signature_verified,independent_of_source,interface_certified,receiver_ack_verified,owner_acceptance_verified,revoked
   from app.master_build441_field_witness
   where observed_at >= now()-interval '15 minutes' and observed_at <= now()
   order by app_id,observed_at desc limit 250`);
  const witnesses:Build441Witness[]=result.rows.map(row=>({
   appId:row.app_id,sourceCommit:row.source_commit,witnessId:row.witness_id,witnessRole:row.witness_role,
   originalDeviceId:row.original_device_id,observedAt:row.observed_at.toISOString(),
   signatureVerified:row.signature_verified,independentOfSource:row.independent_of_source,
   interfaceCertified:row.interface_certified,receiverAckVerified:row.receiver_ack_verified,
   ownerAcceptanceVerified:row.owner_acceptance_verified,revoked:row.revoked
  }));
  return reconcileBuild441(source.certifications,witnesses);
 });
}
