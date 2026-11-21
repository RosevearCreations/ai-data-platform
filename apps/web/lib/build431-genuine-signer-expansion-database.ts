import {createHash,randomBytes,randomUUID} from "node:crypto";
import {performance} from "node:perf_hooks";
import type {QueryResultRow} from "pg";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {admitSysopTelemetryEnvelope} from "./sysop-telemetry-v1";
import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {BUILD_426_TELEMETRY_PATH,build426Origin,build426Token,type Build426AppId} from "./master-seven-source-live-enrollment";
import {BUILD_431_PROVIDER_MATRIX,BUILD_431_REQUIRED_SIGNED_SOURCES,build431Coverage,build431SourceState} from "./master-build431-genuine-signer-expansion";

type Mode="OPERATOR"|"CRON"|"PRODUCTION_BUILD";
export type Build431Probe={
 appId:Build426AppId;challengeSha256:string;origin:string|null;originReachable:boolean;credentialPresent:boolean;
 telemetryStatus:number|null;telemetryLatencyMs:number|null;protocolVersion:string|null;challengeVerified:boolean;
 receiptId:string|null;sourceCommit:string|null;detail:string;
};
interface SweepRow extends QueryResultRow{sweep_id:string;mode:string;observed_sources:number;verified_sources:number;classified_sources:number;held_sources:number;state:string;observed_at:Date;}
interface ObservationRow extends QueryResultRow{observation_id:string;sweep_id:string;app_id:Build426AppId;provider:string;challenge_sha256:string;protocol_version:string|null;challenge_verified:boolean;source_receipt_id:string|null;source_commit:string|null;origin:string|null;origin_reachable:boolean;credential_present:boolean;telemetry_status:number|null;telemetry_latency_ms:string|null;state:string;hold_reason:string|null;detail:string;observed_at:Date;}

async function sysopRole(userId:string){
 return withUserDatabase(userId,async client=>{
  const r=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  const role=r.rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build431_operator_required");
  return role;
 });
}
async function timedFetch(url:string,init:RequestInit){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4500);const started=performance.now();
 try{const res=await fetch(url,{...init,signal:controller.signal,redirect:"manual",cache:"no-store"});return {res,latencyMs:Math.round((performance.now()-started)*10)/10};}
 finally{clearTimeout(timer);}
}
export async function probeBuild431Source(appId:Build426AppId):Promise<Build431Probe>{
 const challenge=randomBytes(32).toString("hex"),challengeSha256=createHash("sha256").update(challenge).digest("hex");
 const token=build426Token(appId);let origin:string|null=null;
 try{origin=build426Origin(appId);}catch(e){return {appId,challengeSha256,origin:null,originReachable:false,credentialPresent:Boolean(token),telemetryStatus:null,telemetryLatencyMs:null,protocolVersion:null,challengeVerified:false,receiptId:null,sourceCommit:null,detail:e instanceof Error?e.message:"origin_invalid"};}
 if(!origin)return {appId,challengeSha256,origin:null,originReachable:false,credentialPresent:Boolean(token),telemetryStatus:null,telemetryLatencyMs:null,protocolVersion:null,challengeVerified:false,receiptId:null,sourceCommit:null,detail:"origin_not_configured"};
 let originReachable=false;
 try{const head=await timedFetch(origin,{method:"HEAD",headers:{Accept:"text/html,application/json"}});originReachable=head.res.status>=200&&head.res.status<500;}
 catch(e){return {appId,challengeSha256,origin,originReachable:false,credentialPresent:Boolean(token),telemetryStatus:null,telemetryLatencyMs:null,protocolVersion:null,challengeVerified:false,receiptId:null,sourceCommit:null,detail:e instanceof Error?e.name:"origin_probe_failed"};}
 let telemetryStatus:number|null=null,telemetryLatencyMs:number|null=null,protocolVersion:string|null=null,challengeVerified=false,receiptId:string|null=null,sourceCommit:string|null=null,detail=originReachable?"origin_reachable":"origin_failed";
 try{
  const headers:Record<string,string>={Accept:"application/json","x-rosevear-telemetry-challenge":challenge};if(token)headers["x-rosevear-telemetry-token"]=token;
  const x=await timedFetch(origin+BUILD_426_TELEMETRY_PATH,{method:"GET",headers});telemetryStatus=x.res.status;telemetryLatencyMs=x.latencyMs;
  const raw=await x.res.text();if(Buffer.byteLength(raw,"utf8")>20000)throw new Error("build431_telemetry_response_too_large");
  let body:unknown=null;try{body=JSON.parse(raw);}catch{}
  if(x.res.status===200&&token&&body&&typeof body==="object"){
   const payload=(body as {payload?:Record<string,unknown>}).payload;
   protocolVersion=typeof payload?.protocolVersion==="string"?payload.protocolVersion:null;
   sourceCommit=typeof payload?.sourceCommit==="string"?payload.sourceCommit:null;
   const accepted=await admitSysopTelemetryEnvelope(body as {payload:Record<string,unknown>;signature:string},{expectedChallenge:challenge});
   receiptId=String(accepted.receiptId);challengeVerified=accepted.challengeVerified===true;
   detail=challengeVerified?"v12_signed_challenge_verified":"signed_telemetry_without_matching_challenge";
  }else if(x.res.status===401)detail=token?"token_rejected":"telemetry_token_not_configured";
  else if(x.res.status===503)detail="source_not_enrolled";
  else if(x.res.status===404)detail="telemetry_route_not_exposed";
  else detail="telemetry_http_"+x.res.status;
 }catch(e){detail=e instanceof Error?e.message:"build431_probe_failed";}
 return {appId,challengeSha256,origin,originReachable,credentialPresent:Boolean(token),telemetryStatus,telemetryLatencyMs,protocolVersion,challengeVerified,receiptId,sourceCommit,detail};
}
function summarize(probes:readonly Build431Probe[]){
 const states=probes.map(probe=>({probe,state:build431SourceState(probe.appId,{challengeVerified:probe.challengeVerified,protocolVersion:probe.protocolVersion,receiptId:probe.receiptId})}));
 const verifiedSources=states.filter(x=>x.state==="ACTIVE_V12_SIGNED").length;
 const classifiedSources=states.filter(x=>x.state==="ACTIVE_V12_SIGNED"||x.state.startsWith("HOLD_")).length;
 const heldSources=states.filter(x=>x.state!=="ACTIVE_V12_SIGNED").length;
 const state=verifiedSources===7?"SEVEN_SOURCE_V12_SIGNED_LIVE":classifiedSources===7?"SEVEN_SOURCE_CLASSIFIED_SIGNER_EXPANSION":"SEVEN_SOURCE_SIGNER_CLASSIFICATION_INCOMPLETE";
 return {states,verifiedSources,classifiedSources,heldSources,state,...build431Coverage({verifiedSources,classifiedSources})};
}
async function persist(client:Parameters<Parameters<typeof withProtectedDatabase>[0]>[0],mode:Mode,probes:readonly Build431Probe[]){
 const sweepId=randomUUID(),summary=summarize(probes);
 await client.query("insert into app.master_build431_sweep_runs(sweep_id,mode,observed_sources,verified_sources,classified_sources,held_sources,state,observed_at) values($1,$2,$3,$4,$5,$6,$7,now())",[sweepId,mode,probes.length,summary.verifiedSources,summary.classifiedSources,summary.heldSources,summary.state]);
 for(const {probe,state} of summary.states){
  const matrix=BUILD_431_PROVIDER_MATRIX[probe.appId],holdReason=state==="ACTIVE_V12_SIGNED"?null:state;
  await client.query(`insert into app.master_build431_source_observations(observation_id,sweep_id,app_id,provider,challenge_sha256,protocol_version,challenge_verified,source_receipt_id,source_commit,origin,origin_reachable,credential_present,telemetry_status,telemetry_latency_ms,state,hold_reason,detail,observed_at)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now())`,
   [randomUUID(),sweepId,probe.appId,matrix.provider,probe.challengeSha256,probe.protocolVersion,probe.challengeVerified,probe.receiptId,probe.sourceCommit,probe.origin,probe.originReachable,probe.credentialPresent,probe.telemetryStatus,probe.telemetryLatencyMs,state,holdReason,probe.detail.slice(0,600)]);
 }
 return {sweepId,mode,...summary};
}
async function run(mode:Mode,protectedMode:boolean,userId?:string){
 const probes=await Promise.all(BUILD_405_APPLICATION_IDS.map(appId=>probeBuild431Source(appId)));
 return protectedMode?withProtectedDatabase(client=>persist(client,mode,probes)):withUserDatabase(userId!,client=>persist(client,mode,probes));
}
export async function runBuild431ProtectedSweep(mode:"CRON"|"PRODUCTION_BUILD"="CRON"){return run(mode,true);}
export async function refreshBuild431(userId:string){await sysopRole(userId);await run("OPERATOR",false,userId);return readBuild431Dashboard(userId);}
export async function runBuild431ProductionAcceptance(){
 const result=await runBuild431ProtectedSweep("PRODUCTION_BUILD");
 const required=new Set<Build426AppId>(BUILD_431_REQUIRED_SIGNED_SOURCES);
 const activeRequired=result.states.filter(x=>required.has(x.probe.appId)&&x.state==="ACTIVE_V12_SIGNED").map(x=>x.probe.appId);
 if(result.classifiedSources!==7)throw new Error("build431_seven_source_classification_incomplete");
 if(activeRequired.length!==BUILD_431_REQUIRED_SIGNED_SOURCES.length)throw new Error("build431_required_three_signed_sources_not_verified");
 if(result.states.some(x=>x.state!=="ACTIVE_V12_SIGNED"&&!x.state.startsWith("HOLD_")))throw new Error("build431_unexplained_source_state");
 return {sweepId:result.sweepId,verifiedSources:result.verifiedSources,classifiedSources:result.classifiedSources,heldSources:result.heldSources,state:result.state,activeRequired};
}
export async function readBuild431Dashboard(userId:string){
 await sysopRole(userId);
 return withUserDatabase(userId,async client=>{
  const [latest,sweeps]=await Promise.all([
   client.query<ObservationRow>("select * from app.master_build431_latest_source_status order by app_id"),
   client.query<SweepRow>("select sweep_id,mode,observed_sources,verified_sources,classified_sources,held_sources,state,observed_at from app.master_build431_sweep_runs order by observed_at desc limit 24")
  ]);
  const byApp=new Map(latest.rows.map(row=>[row.app_id,row]));
  const sources=BUILD_405_APPLICATION_IDS.map(appId=>{const row=byApp.get(appId),matrix=BUILD_431_PROVIDER_MATRIX[appId];return {appId,matrix,observation:row?{...row,telemetry_latency_ms:row.telemetry_latency_ms===null?null:Number(row.telemetry_latency_ms),observed_at:row.observed_at.toISOString()}:null,state:row?.state??matrix.explicitHold??"HOLD_V12_SIGNER_NOT_VERIFIED"};});
  const verified=sources.filter(x=>x.state==="ACTIVE_V12_SIGNED").length,classified=sources.filter(x=>x.state==="ACTIVE_V12_SIGNED"||String(x.state).startsWith("HOLD_")).length;
  return {schema:"rosevear.ai-data-platform.build431-genuine-signer-expansion-dashboard.v1",build:431,capturedAt:new Date().toISOString(),sources,sweeps:sweeps.rows.map(r=>({...r,observed_at:r.observed_at.toISOString()})),summary:{...build431Coverage({verifiedSources:verified,classifiedSources:classified}),heldSources:7-verified}};
 });
}
