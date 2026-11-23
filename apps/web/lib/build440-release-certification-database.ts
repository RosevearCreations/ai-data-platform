import {withUserDatabase} from "./database";
import {certifyBuild440Evidence,type Build440Evidence} from "./build440-release-certification";
type LedgerRow={app_id:string;source_commit:string;latest_receipt_id:string|null;last_verified_at:Date;verified_observation_count:number;continuity_state:string;closure_provenance:boolean};
export async function readBuild440Dashboard(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build440_operator_required");
  const rows=await client.query<LedgerRow>(`select distinct on(l.app_id)
    l.app_id,l.source_commit,l.latest_receipt_id,l.last_verified_at,l.verified_observation_count,l.continuity_state,
    exists(
      select 1 from app.master_build435_peer_release_observations o
      join app.master_build432_closure_runs c on c.closure_id=o.closure_id
      where o.app_id=l.app_id and o.source_commit=l.source_commit
      and o.receipt_id=l.latest_receipt_id
      and c.source_receipt_ids->o.app_id->>'verified'='true'
      and c.source_receipt_ids->o.app_id->>'sourceCommit'=l.source_commit
      and c.source_receipt_ids->o.app_id->>'receiptId'=l.latest_receipt_id
    ) as closure_provenance
    from app.master_build435_peer_release_ledger l
    order by l.app_id,l.last_verified_at desc`);
  const evidence:Build440Evidence[]=rows.rows.map(r=>({
   appId:r.app_id,sourceCommit:r.source_commit,receiptId:r.latest_receipt_id,
   verifiedAt:r.last_verified_at.toISOString(),observationCount:r.verified_observation_count,
   continuity:r.continuity_state,verifiedByClosure:r.closure_provenance
  }));
  return certifyBuild440Evidence(evidence);
 });
}
