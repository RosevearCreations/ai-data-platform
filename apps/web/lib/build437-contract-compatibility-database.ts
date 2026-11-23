import {withUserDatabase} from "./database";
import {BUILD_437_RELEASE_SNAPSHOT,BUILD_437_SCHEMA,forecastBuild437,summarizeBuild437} from "./build437-contract-compatibility";

type LedgerRow={app_id:string;source_commit:string;source_build_label:string|null;continuity_state:string;last_verified_at:Date;latest_receipt_id:string|null};

export async function readBuild437Dashboard(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build437_operator_required");
  const r=await client.query<LedgerRow>("select distinct on(app_id) app_id,source_commit,source_build_label,continuity_state,last_verified_at,latest_receipt_id from app.master_build435_peer_release_ledger order by app_id,last_verified_at desc");
  const latest=new Map(r.rows.map(x=>[x.app_id,x]));
  const rows=BUILD_437_RELEASE_SNAPSHOT.map(release=>{
   const observed=latest.get(release.appId);
   const forecast=forecastBuild437({release,observedCommit:observed?.source_commit??null,observedContinuity:observed?.continuity_state??null,verified:Boolean(observed?.latest_receipt_id)});
   return {...release,observedCommit:observed?.source_commit??null,observedBuildLabel:observed?.source_build_label??null,lastVerifiedAt:observed?.last_verified_at?.toISOString()??null,...forecast};
  });
  return {schema:BUILD_437_SCHEMA,build:437,capturedAt:new Date().toISOString(),summary:summarizeBuild437(rows),rows};
 });
}
