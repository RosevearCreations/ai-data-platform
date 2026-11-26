import {randomBytes,randomUUID} from "node:crypto";
import {performance} from "node:perf_hooks";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {admitSysopTelemetryEnvelope} from "./sysop-telemetry-v1";
import {build426Origin,type Build426AppId} from "./master-seven-source-live-enrollment";
import {probeBuild431Source} from "./build431-genuine-signer-expansion-database";
import {latestBuild432HubRelay} from "./build432-original-host-relay-database";
import {BUILD_432_ALL_SOURCES,build432ClosureState} from "./master-build432-seven-source-closure";

type Mode="CRON"|"PRODUCTION_BUILD"|"OPERATOR";
type Probe={appId:Build426AppId;verified:boolean;receiptId:string|null;sourceCommit:string|null;detail:string};

async function timedFetch(url:string,init:RequestInit){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000),started=performance.now();
 try{const res=await fetch(url,{...init,signal:controller.signal,redirect:"manual",cache:"no-store"});return {res,latencyMs:Math.round((performance.now()-started)*10)/10};}finally{clearTimeout(timer);}
}
async function publicCloudflareProbe(appId:"rosevear-comms-hub"|"devilndove"|"rosiedazzlers"):Promise<Probe>{
 const origin=build426Origin(appId);if(!origin)return {appId,verified:false,receiptId:null,sourceCommit:null,detail:"origin_not_configured"};
 const sourceOrigin:string=origin;
 const challenge=randomBytes(32).toString("hex");
 try{
  const x=await timedFetch(sourceOrigin+"/internal/rosevear/sysop/telemetry/v1",{method:"GET",headers:{Accept:"application/json","x-rosevear-telemetry-challenge":challenge}});
  const raw=await x.res.text();if(Buffer.byteLength(raw,"utf8")>20000)throw new Error("telemetry_response_too_large");
  if(x.res.status!==200)return {appId,verified:false,receiptId:null,sourceCommit:null,detail:"telemetry_http_"+x.res.status};
  const envelope=JSON.parse(raw) as {payload:Record<string,unknown>;signature:string};
  const admitted=await admitSysopTelemetryEnvelope(envelope,{expectedChallenge:challenge});
  return {appId,verified:admitted.protocolVersion==="1.2"&&admitted.challengeVerified,receiptId:String(admitted.receiptId),sourceCommit:String(envelope.payload.sourceCommit??""),detail:`v12_signed_challenge_verified_${x.latencyMs}ms`};
 }catch(e){return {appId,verified:false,receiptId:null,sourceCommit:null,detail:e instanceof Error?e.message:"cloudflare_probe_failed"};}
}
async function probeSource(appId:Build426AppId):Promise<Probe>{
 if(appId==="rosevear-ai-hub"){
  const relay=await latestBuild432HubRelay(300);return relay?{appId,verified:true,receiptId:relay.telemetry_receipt_id,sourceCommit:relay.source_commit,detail:"fresh_original_host_outbound_relay"}:{appId,verified:false,receiptId:null,sourceCommit:null,detail:"original_host_relay_receipt_missing_or_stale"};
 }
 if(appId==="rosevear-comms-hub"||appId==="devilndove"||appId==="rosiedazzlers")return publicCloudflareProbe(appId);
 const p=await probeBuild431Source(appId);return {appId,verified:p.challengeVerified&&p.protocolVersion==="1.2"&&Boolean(p.receiptId),receiptId:p.receiptId,sourceCommit:p.sourceCommit,detail:p.detail};
}
export async function runBuild432Closure(mode:Mode="CRON"){
 const probes=await Promise.all(BUILD_432_ALL_SOURCES.map(id=>probeSource(id))),verified=probes.filter(p=>p.verified).map(p=>p.appId);
 const state=build432ClosureState(verified),closureId=randomUUID(),receiptMap=Object.fromEntries(probes.map(p=>[p.appId,{verified:p.verified,receiptId:p.receiptId,sourceCommit:p.sourceCommit,detail:p.detail}]));
 await withProtectedDatabase(client=>client.query("insert into app.master_build432_closure_runs(closure_id,mode,verified_sources,state,source_receipt_ids,observed_at) values($1,$2,$3,$4,$5::jsonb,now())",[closureId,mode,verified.length,state,JSON.stringify(receiptMap)]));
 return {closureId,state,verifiedSources:verified.length,verified,probes};
}
export async function runBuild432ProductionAcceptance(){
 const r=await runBuild432Closure("PRODUCTION_BUILD");
 if(r.verifiedSources!==7||r.state!=="SEVEN_OF_SEVEN_GENUINE_SIGNED_LIVE"){console.error("Build 432 safe source diagnostics:",JSON.stringify(r.probes.map(p=>({appId:p.appId,verified:p.verified,sourceCommit:p.sourceCommit,detail:p.detail}))));throw new Error(`build432_seven_of_seven_required_${r.verifiedSources}_verified`);}
 return r;
}
export async function latestBuild432Closure(){
 return withProtectedDatabase(async client=>{const r=await client.query<{closure_id:string;mode:string;verified_sources:number;state:string;source_receipt_ids:Record<string,unknown>;observed_at:Date}>("select * from app.master_build432_closure_runs order by observed_at desc limit 1");const row=r.rows[0];return row?{...row,observed_at:row.observed_at.toISOString()}:null;});
}

export async function readBuild432Dashboard(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build432_operator_required");
  const r=await client.query<{closure_id:string;mode:string;verified_sources:number;state:string;source_receipt_ids:Record<string,unknown>;observed_at:Date}>("select * from app.master_build432_closure_runs order by observed_at desc limit 24");
  return {schema:"rosevear.ai-data-platform.build432-seven-source-closure-dashboard.v1",build:432,capturedAt:new Date().toISOString(),runs:r.rows.map(row=>({...row,observed_at:row.observed_at.toISOString()})),latest:r.rows[0]?{...r.rows[0],observed_at:r.rows[0].observed_at.toISOString()}:null};
 });
}

export async function refreshBuild432(userId:string){
 await readBuild432Dashboard(userId);
 await runBuild432Closure("OPERATOR");
 return readBuild432Dashboard(userId);
}
