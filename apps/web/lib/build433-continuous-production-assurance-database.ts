import {withUserDatabase} from "./database";
import {runBuild432Closure} from "./build432-seven-source-closure-database";

type ClosureRow={closure_id:string;mode:string;verified_sources:number;state:string;source_receipt_ids:Record<string,unknown>;observed_at:Date};

function summarize(rows:ClosureRow[]){
 const now=Date.now();
 const latest=rows[0]??null;
 const green=rows.filter(r=>r.verified_sources===7&&r.state==="SEVEN_OF_SEVEN_GENUINE_SIGNED_LIVE");
 let consecutiveGreen=0;
 for(const row of rows){if(row.verified_sources===7&&row.state==="SEVEN_OF_SEVEN_GENUINE_SIGNED_LIVE")consecutiveGreen++;else break;}
 let recoveries=0;
 for(let i=0;i<rows.length-1;i++){
  const newer=rows[i],older=rows[i+1];
  if(newer.verified_sources===7&&older.verified_sources<7)recoveries++;
 }
 const ageSeconds=latest?Math.max(0,Math.floor((now-latest.observed_at.getTime())/1000)):null;
 const freshness=ageSeconds===null?"NO_EVIDENCE":ageSeconds<=900?"CURRENT":ageSeconds<=3600?"AGING":"STALE";
 const operationalState=!latest?"NO_EVIDENCE":freshness==="STALE"?"STALE":latest.verified_sources===7?"GREEN":"HOLD";
 return {
  operationalState,
  freshness,
  ageSeconds,
  samples:rows.length,
  greenSamples:green.length,
  greenRatePct:rows.length?Math.round((green.length/rows.length)*1000)/10:0,
  consecutiveGreen,
  recoveries,
  latestGreenAt:green[0]?.observed_at.toISOString()??null,
  latestHoldAt:rows.find(r=>r.verified_sources<7)?.observed_at.toISOString()??null
 };
}

export async function readBuild433Dashboard(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build433_operator_required");
  const r=await client.query<ClosureRow>("select closure_id,mode,verified_sources,state,source_receipt_ids,observed_at from app.master_build432_closure_runs order by observed_at desc limit 96");
  const metrics=summarize(r.rows);
  return {
   schema:"rosevear.ai-data-platform.build433-continuous-production-assurance.v1",
   build:433,
   capturedAt:new Date().toISOString(),
   metrics,
   history:r.rows.map(row=>({...row,observed_at:row.observed_at.toISOString()}))
  };
 });
}

export async function refreshBuild433Dashboard(userId:string){
 await readBuild433Dashboard(userId);
 await runBuild432Closure("CRON");
 return readBuild433Dashboard(userId);
}
