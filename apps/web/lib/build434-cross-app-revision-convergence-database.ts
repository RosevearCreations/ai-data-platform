import {withUserDatabase} from "./database";
import {BUILD_434_PEER_BASELINE,BUILD_434_SCHEMA,build434Summary,classifyBuild434Revision,type Build434SourceState} from "./build434-cross-app-revision-convergence";

type ClosureRow={closure_id:string;source_receipt_ids:Record<string,Build434SourceState>;observed_at:Date};

export async function readBuild434Dashboard(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build434_operator_required");
  const r=await client.query<ClosureRow>("select closure_id,source_receipt_ids,observed_at from app.master_build432_closure_runs order by observed_at desc limit 2");
  const current=r.rows[0],previous=r.rows[1];
  const ids=["ai-data-platform","rosevear-ai-hub","rosevear-comms-hub","icamp","yw","devilndove","rosiedazzlers"];
  const rows=ids.map(appId=>{
   const now=current?.source_receipt_ids?.[appId],before=previous?.source_receipt_ids?.[appId];
   const classification=classifyBuild434Revision({appId,current:now,previous:before});
   const baseline=(BUILD_434_PEER_BASELINE as Record<string,{repository:string;build:string;commit:string}>)[appId]??null;
   return {appId,classification,verified:now?.verified===true,currentCommit:now?.sourceCommit??null,previousCommit:before?.sourceCommit??null,receiptId:now?.receiptId??null,detail:now?.detail??null,baseline};
  });
  return {
   schema:BUILD_434_SCHEMA,
   build:434,
   capturedAt:new Date().toISOString(),
   latestObservationAt:current?.observed_at?.toISOString()??null,
   previousObservationAt:previous?.observed_at?.toISOString()??null,
   summary:build434Summary(rows),
   rows
  };
 });
}
