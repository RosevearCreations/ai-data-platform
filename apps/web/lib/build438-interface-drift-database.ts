import {withUserDatabase} from "./database";
import {BUILD_438_PROFILES,BUILD_438_SCHEMA,classifyBuild438Drift,summarizeBuild438} from "./build438-interface-drift-observatory";

type LedgerRow={app_id:string;source_commit:string;last_verified_at:Date};
export async function readBuild438Dashboard(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build438_operator_required");
  const r=await client.query<LedgerRow>("select distinct on(app_id) app_id,source_commit,last_verified_at from app.master_build435_peer_release_ledger order by app_id,last_verified_at desc");
  const latest=new Map(r.rows.map(x=>[x.app_id,x]));
  const rows=BUILD_438_PROFILES.map(profile=>{
   const observed=latest.get(profile.appId);
   const drift=classifyBuild438Drift({baseline:profile,observedCommit:observed?.source_commit??null});
   return {...profile,observedCommit:observed?.source_commit??null,lastVerifiedAt:observed?.last_verified_at?.toISOString()??null,...drift};
  });
  return {schema:BUILD_438_SCHEMA,build:438,capturedAt:new Date().toISOString(),summary:summarizeBuild438(rows),rows};
 });
}
