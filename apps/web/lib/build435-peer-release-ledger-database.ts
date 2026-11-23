import {randomUUID} from "node:crypto";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {BUILD_434_PEER_BASELINE,type Build434SourceState} from "./build434-cross-app-revision-convergence";
import {BUILD_435_SCHEMA,build435KnownLabel,classifyBuild435Continuity,summarizeBuild435,type Build435Continuity} from "./build435-peer-release-ledger";

type ClosureRow={closure_id:string;source_receipt_ids:Record<string,Build434SourceState>;observed_at:Date};
type LedgerRow={ledger_id:string;app_id:string;repository:string|null;source_commit:string;source_build_label:string|null;predecessor_commit:string|null;continuity_state:Build435Continuity;first_verified_at:Date;last_verified_at:Date;verified_observation_count:number;latest_receipt_id:string|null;latest_detail:string|null};

export async function ingestBuild435VerifiedReleases(){
 return withProtectedDatabase(async client=>{
  const runs=await client.query<ClosureRow>("select closure_id,source_receipt_ids,observed_at from app.master_build432_closure_runs order by observed_at asc limit 512");
  let touched=0;
  for(const run of runs.rows){
   for(const [appId,state] of Object.entries(run.source_receipt_ids??{})){
    const commit=state?.sourceCommit?.trim();if(state?.verified!==true||!commit||!/^[a-f0-9]{40}$/.test(commit))continue;
    const inserted=await client.query("insert into app.master_build435_peer_release_observations(observation_id,closure_id,app_id,source_commit,receipt_id,detail,verified_at) values($1,$2,$3,$4,$5,$6,$7) on conflict(closure_id,app_id) do nothing returning observation_id",[randomUUID(),run.closure_id,appId,commit,state.receiptId??null,state.detail??null,run.observed_at]);
    if(!inserted.rowCount)continue;
    const existing=await client.query<LedgerRow>("select * from app.master_build435_peer_release_ledger where app_id=$1 and source_commit=$2",[appId,commit]);
    if(existing.rows[0]){
     await client.query("update app.master_build435_peer_release_ledger set last_verified_at=greatest(last_verified_at,$3), verified_observation_count=verified_observation_count+1, latest_receipt_id=coalesce($4,latest_receipt_id), latest_detail=coalesce($5,latest_detail) where app_id=$1 and source_commit=$2",[appId,commit,run.observed_at,state.receiptId??null,state.detail??null]);touched++;continue;
    }
    const previous=(await client.query<LedgerRow>("select * from app.master_build435_peer_release_ledger where app_id=$1 order by last_verified_at desc limit 1",[appId])).rows[0];
    const label=build435KnownLabel(appId,commit);
    const continuity=classifyBuild435Continuity({currentCommit:commit,currentBuildLabel:label,previousCommit:previous?.source_commit,previousBuildLabel:previous?.source_build_label});
    const repository=(BUILD_434_PEER_BASELINE as Record<string,{repository:string}>)[appId]?.repository??(appId==="ai-data-platform"?"RosevearCreations/ai-data-platform":null);
    await client.query("insert into app.master_build435_peer_release_ledger(ledger_id,app_id,repository,source_commit,source_build_label,predecessor_commit,continuity_state,first_verified_at,last_verified_at,verified_observation_count,latest_receipt_id,latest_detail) values($1,$2,$3,$4,$5,$6,$7,$8,$8,1,$9,$10)",[randomUUID(),appId,repository,commit,label,previous?.source_commit??null,continuity,run.observed_at,state.receiptId??null,state.detail??null]);touched++;
   }
  }
  return {touched};
 });
}
export async function readBuild435Dashboard(userId:string){
 await withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build435_operator_required");
 });
 await ingestBuild435VerifiedReleases();
 return withUserDatabase(userId,async client=>{
  const r=await client.query<LedgerRow>("select * from app.master_build435_peer_release_ledger order by last_verified_at desc limit 200");
  const rows=r.rows.map(x=>({...x,first_verified_at:x.first_verified_at.toISOString(),last_verified_at:x.last_verified_at.toISOString()}));
  return {schema:BUILD_435_SCHEMA,build:435,capturedAt:new Date().toISOString(),summary:summarizeBuild435(r.rows),rows};
 });
}
