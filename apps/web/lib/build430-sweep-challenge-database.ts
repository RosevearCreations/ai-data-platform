import {randomBytes,randomUUID} from "node:crypto";
import {performance} from "node:perf_hooks";
import type {PoolClient,QueryResultRow} from "pg";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {admitSysopTelemetryEnvelope} from "./sysop-telemetry-v1";
import {BUILD_426_TELEMETRY_PATH,build426Origin,build426Token} from "./master-seven-source-live-enrollment";
import {
 BUILD_430_HOSTED_CADENCE,
 BUILD_430_REQUIRED_SOURCES,
 build430ChallengeSha256,
 build430OverlapCertified,
 build430ReliabilityKind,
 type Build430RequiredSource
} from "./master-build430-sweep-challenge";

type Mode="OPERATOR"|"CRON"|"PRODUCTION_BUILD";
type ChallengeProbe={
 appId:Build430RequiredSource;
 challenge:string;
 challengeSha256:string;
 origin:string|null;
 originReachable:boolean;
 telemetryStatus:number|null;
 telemetryLatencyMs:number|null;
 telemetryVerified:boolean;
 challengeVerified:boolean;
 protocolVersion:string|null;
 receiptId:string|null;
 sourceCommit:string|null;
 detail:string;
};

interface ReliabilityRow extends QueryResultRow{
 app_id:Build430RequiredSource;event_kind:string;previous_verified:boolean|null;current_verified:boolean;
 previous_source_commit:string|null;current_source_commit:string|null;source_receipt_id:string|null;gap_seconds:string|null;observed_at:Date;
}
interface SweepRow extends QueryResultRow{
 sweep_id:string;mode:string;observed_sources:number;verified_sources:number;challenge_verified_sources:number;overlap_isolation_verified:boolean;state:string;observed_at:Date;
}
interface LegacyHealthRow extends QueryResultRow{
 app_id:Build430RequiredSource;telemetry_verified:boolean;source_receipt_id:string|null;source_commit:string|null;detail:string;observed_at:Date;
}

async function sysopRole(userId:string){
 return withUserDatabase(userId,async client=>{
  const r=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  const role=r.rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build430_operator_required");
  return role;
 });
}

async function timedFetch(url:string,init:RequestInit){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4500);const started=performance.now();
 try{const res=await fetch(url,{...init,signal:controller.signal,redirect:"manual",cache:"no-store"});return {res,latencyMs:Math.round((performance.now()-started)*10)/10};}
 finally{clearTimeout(timer);}
}

export async function probeBuild430ChallengeSource(appId:Build430RequiredSource):Promise<ChallengeProbe>{
 const challenge=randomBytes(32).toString("hex");
 const challengeSha256=build430ChallengeSha256(challenge);
 let origin:string|null=null;
 try{origin=build426Origin(appId);}catch(e){return {appId,challenge,challengeSha256,origin:null,originReachable:false,telemetryStatus:null,telemetryLatencyMs:null,telemetryVerified:false,challengeVerified:false,protocolVersion:null,receiptId:null,sourceCommit:null,detail:e instanceof Error?e.message:"origin_invalid"};}
 const token=build426Token(appId);
 if(!origin)return {appId,challenge,challengeSha256,origin:null,originReachable:false,telemetryStatus:null,telemetryLatencyMs:null,telemetryVerified:false,challengeVerified:false,protocolVersion:null,receiptId:null,sourceCommit:null,detail:"origin_not_configured"};
 let originReachable=false;
 try{const head=await timedFetch(origin,{method:"HEAD",headers:{Accept:"text/html,application/json"}});originReachable=head.res.status>=200&&head.res.status<500;}catch(e){return {appId,challenge,challengeSha256,origin,originReachable:false,telemetryStatus:null,telemetryLatencyMs:null,telemetryVerified:false,challengeVerified:false,protocolVersion:null,receiptId:null,sourceCommit:null,detail:e instanceof Error?e.name:"origin_probe_failed"};}
 let telemetryStatus:number|null=null,telemetryLatencyMs:number|null=null,receiptId:string|null=null,sourceCommit:string|null=null,protocolVersion:string|null=null,challengeVerified=false,telemetryVerified=false,detail=originReachable?"origin_reachable":"origin_failed";
 try{
  const headers:Record<string,string>={Accept:"application/json","x-rosevear-telemetry-challenge":challenge};
  if(token)headers["x-rosevear-telemetry-token"]=token;
  const x=await timedFetch(origin+BUILD_426_TELEMETRY_PATH,{method:"GET",headers});telemetryStatus=x.res.status;telemetryLatencyMs=x.latencyMs;
  const raw=await x.res.text();if(Buffer.byteLength(raw,"utf8")>20000)throw new Error("build430_telemetry_response_too_large");
  let body:unknown=null;try{body=JSON.parse(raw);}catch{}
  if(x.res.status===200&&token&&body&&typeof body==="object"){
   const payload=(body as {payload?:Record<string,unknown>}).payload;
   protocolVersion=typeof payload?.protocolVersion==="string"?payload.protocolVersion:null;
   sourceCommit=typeof payload?.sourceCommit==="string"?payload.sourceCommit:null;
   const accepted=await admitSysopTelemetryEnvelope(body as {payload:Record<string,unknown>;signature:string},{expectedChallenge:challenge});
   receiptId=String(accepted.receiptId);challengeVerified=accepted.challengeVerified===true;telemetryVerified=true;
   detail=challengeVerified?"signed_challenge_verified":"signed_telemetry_without_challenge";
  }else if(x.res.status===401)detail=token?"token_rejected":"telemetry_token_not_configured";
  else if(x.res.status===503)detail="source_not_enrolled";
  else if(x.res.status===404)detail="telemetry_route_not_exposed";
  else detail="telemetry_http_"+x.res.status;
 }catch(e){detail=e instanceof Error?e.message:"build430_challenge_probe_failed";}
 return {appId,challenge,challengeSha256,origin,originReachable,telemetryStatus,telemetryLatencyMs,telemetryVerified,challengeVerified,protocolVersion,receiptId,sourceCommit,detail};
}

function stateFor(probes:readonly ChallengeProbe[]){
 const verified=probes.filter(x=>x.telemetryVerified).length;
 const challenged=probes.filter(x=>x.challengeVerified&&x.protocolVersion==="1.2").length;
 return {verified,challenged,state:challenged===2?"V12_BOTH_VERIFIED":challenged>0?"V12_PARTIAL":"V12_NONE_VERIFIED"};
}

async function priorReliability(client:PoolClient,appId:Build430RequiredSource){
 const current=await client.query<{current_verified:boolean;current_source_commit:string|null;observed_at:Date}>(
  "select current_verified,current_source_commit,observed_at from app.master_build430_reliability_events where app_id=$1 order by observed_at desc limit 1",[appId]
 );
 if(current.rows[0])return {verified:current.rows[0].current_verified,commit:current.rows[0].current_source_commit,observedAt:current.rows[0].observed_at};
 const legacy=await client.query<{telemetry_verified:boolean;source_commit:string|null;observed_at:Date}>(
  "select telemetry_verified,source_commit,observed_at from app.master_build429_source_health_observations where app_id=$1 order by observed_at desc limit 1",[appId]
 );
 return legacy.rows[0]?{verified:legacy.rows[0].telemetry_verified,commit:legacy.rows[0].source_commit,observedAt:legacy.rows[0].observed_at}:{verified:null,commit:null,observedAt:null};
}

async function persistRegular(client:PoolClient,mode:Mode,probes:readonly ChallengeProbe[]){
 const sweepId=randomUUID(),summary=stateFor(probes),now=new Date();
 await client.query("insert into app.master_build430_sweep_runs(sweep_id,mode,observed_sources,verified_sources,challenge_verified_sources,overlap_isolation_verified,state,observed_at) values($1,$2,2,$3,$4,false,$5,$6)",[sweepId,mode,summary.verified,summary.challenged,summary.state,now]);
 for(const probe of probes){
  await client.query(`insert into app.master_build430_source_challenge_observations(observation_id,sweep_id,app_id,challenge_sha256,protocol_version,challenge_verified,source_receipt_id,source_commit,origin_reachable,telemetry_status,telemetry_latency_ms,detail,observed_at)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[randomUUID(),sweepId,probe.appId,probe.challengeSha256,probe.protocolVersion,probe.challengeVerified,probe.receiptId,probe.sourceCommit,probe.originReachable,probe.telemetryStatus,probe.telemetryLatencyMs,probe.detail.slice(0,600),now]);
  const prior=await priorReliability(client,probe.appId);
  const currentVerified=probe.challengeVerified&&probe.protocolVersion==="1.2"&&Boolean(probe.receiptId);
  const eventKind=build430ReliabilityKind({previousVerified:prior.verified,previousCommit:prior.commit,currentVerified,currentCommit:probe.sourceCommit});
  const gapSeconds=prior.observedAt?Math.max(0,(now.getTime()-prior.observedAt.getTime())/1000):null;
  await client.query(`insert into app.master_build430_reliability_events(event_id,sweep_id,app_id,event_kind,previous_verified,current_verified,previous_source_commit,current_source_commit,source_receipt_id,gap_seconds,observed_at)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[randomUUID(),sweepId,probe.appId,eventKind,prior.verified,currentVerified,prior.commit,probe.sourceCommit,probe.receiptId,gapSeconds,now]);
 }
 return {sweepId,mode,...summary,probes};
}

async function runRegular(mode:Mode,protectedMode:boolean,userId?:string){
 const probes=await Promise.all(BUILD_430_REQUIRED_SOURCES.map(appId=>probeBuild430ChallengeSource(appId)));
 return protectedMode?withProtectedDatabase(client=>persistRegular(client,mode,probes)):withUserDatabase(userId!,client=>persistRegular(client,mode,probes));
}

export async function runBuild430ProtectedSweep(mode:"CRON"|"PRODUCTION_BUILD"="CRON"){return runRegular(mode,true);}
export async function refreshBuild430(userId:string){await sysopRole(userId);await runRegular("OPERATOR",false,userId);return readBuild430Dashboard(userId);}

export async function certifyBuild430OverlapIsolation(){
 const probes=(await Promise.all(BUILD_430_REQUIRED_SOURCES.flatMap(appId=>[probeBuild430ChallengeSource(appId),probeBuild430ChallengeSource(appId)]))).flat();
 const rows=probes.map(p=>({appId:p.appId,challengeSha256:p.challengeSha256,receiptId:p.receiptId,challengeVerified:p.challengeVerified}));
 const certified=build430OverlapCertified(rows);const sweepId=randomUUID();const now=new Date();
 await withProtectedDatabase(async client=>{
  await client.query("insert into app.master_build430_sweep_runs(sweep_id,mode,observed_sources,verified_sources,challenge_verified_sources,overlap_isolation_verified,state,observed_at) values($1,'OVERLAP_CERT',2,$2,$3,$4,$5,$6)",[sweepId,new Set(probes.filter(p=>p.telemetryVerified).map(p=>p.appId)).size,new Set(probes.filter(p=>p.challengeVerified).map(p=>p.appId)).size,certified,certified?"OVERLAP_ISOLATION_CERTIFIED":"OVERLAP_ISOLATION_FAILED",now]);
  for(const p of probes)await client.query(`insert into app.master_build430_source_challenge_observations(observation_id,sweep_id,app_id,challenge_sha256,protocol_version,challenge_verified,source_receipt_id,source_commit,origin_reachable,telemetry_status,telemetry_latency_ms,detail,observed_at)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[randomUUID(),sweepId,p.appId,p.challengeSha256,p.protocolVersion,p.challengeVerified,p.receiptId,p.sourceCommit,p.originReachable,p.telemetryStatus,p.telemetryLatencyMs,p.detail.slice(0,600),now]);
 });
 return {sweepId,certified,probes};
}

export async function runBuild430ProductionAcceptance(){
 const first=await runBuild430ProtectedSweep("PRODUCTION_BUILD");
 if(first.challenged!==2)throw new Error("build430_first_v12_sweep_failed");
 const second=await runBuild430ProtectedSweep("PRODUCTION_BUILD");
 if(second.challenged!==2)throw new Error("build430_second_v12_sweep_failed");
 for(const appId of BUILD_430_REQUIRED_SOURCES){
  const a=first.probes.find(p=>p.appId===appId),b=second.probes.find(p=>p.appId===appId);
  if(!a?.receiptId||!b?.receiptId||a.receiptId===b.receiptId)throw new Error("build430_repeated_receipt_isolation_failed_"+appId);
  if(a.challengeSha256===b.challengeSha256)throw new Error("build430_repeated_challenge_isolation_failed_"+appId);
 }
 const overlap=await certifyBuild430OverlapIsolation();
 if(!overlap.certified)throw new Error("build430_overlap_isolation_failed");
 return {firstSweepId:first.sweepId,secondSweepId:second.sweepId,overlapSweepId:overlap.sweepId,verifiedSources:2,overlapIsolationVerified:true};
}

export async function readBuild430Dashboard(userId:string){
 await sysopRole(userId);
 return withUserDatabase(userId,async client=>{
  const [sweeps,reliability,cadence,legacy]=await Promise.all([
   client.query<SweepRow>("select sweep_id,mode,observed_sources,verified_sources,challenge_verified_sources,overlap_isolation_verified,state,observed_at from app.master_build430_sweep_runs order by observed_at desc limit 30"),
   client.query<ReliabilityRow>("select app_id,event_kind,previous_verified,current_verified,previous_source_commit,current_source_commit,source_receipt_id,gap_seconds,observed_at from app.master_build430_reliability_events order by observed_at desc limit 60"),
   client.query("select * from app.master_build430_cadence_baseline"),
   client.query<LegacyHealthRow>("select app_id,telemetry_verified,source_receipt_id,source_commit,detail,observed_at from app.master_build429_source_health_observations where app_id in('yw','icamp') order by observed_at desc limit 20")
  ]);
  return {
   schema:"rosevear.ai-data-platform.build430-source-signed-sweep-challenge-dashboard.v1",build:430,capturedAt:new Date().toISOString(),
   hostedCadence:BUILD_430_HOSTED_CADENCE,
   cadenceBaseline:cadence.rows[0]??null,
   sweeps:sweeps.rows.map(r=>({...r,observed_at:r.observed_at.toISOString()})),
   reliability:reliability.rows.map(r=>({...r,gap_seconds:r.gap_seconds===null?null:Number(r.gap_seconds),observed_at:r.observed_at.toISOString()})),
   legacySignedHistory:legacy.rows.map(r=>({...r,observed_at:r.observed_at.toISOString()})),
   summary:{
    latestState:sweeps.rows[0]?.state??"NO_BUILD430_SWEEP",
    v12Sources:sweeps.rows[0]?.challenge_verified_sources??0,
    overlapIsolationVerified:sweeps.rows.some(r=>r.overlap_isolation_verified),
    reliabilityEvents:reliability.rows.length
   }
  };
 });
}
