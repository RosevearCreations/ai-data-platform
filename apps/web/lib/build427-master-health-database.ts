import {randomUUID} from "node:crypto";
import type {QueryResultRow} from "pg";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {aggregateBuild426Metrics} from "./master-seven-source-live-enrollment";
import {probeBuild426Source,refreshBuild426,type Build426Probe} from "./build426-live-runtime-database";
import {BUILD_427_CREDENTIAL_ENV_KEYS,build427CredentialSnapshot,build427MasterState,build427SourceState} from "./master-seven-source-credential-activation";

interface ActivationRow extends QueryResultRow{
 app_id:string;credential_env_key:string;credential_present:boolean;origin:string|null;origin_reachable:boolean;telemetry_status:number|null;
 telemetry_latency_ms:number|null;telemetry_verified:boolean;source_commit:string|null;detail:string;metrics:Record<string,unknown>;observed_at:Date;
}
interface RollupRow extends QueryResultRow{
 bucket_start:Date;observations:number;observed_sources:number;reachable_observations:number;verified_observations:number;verified_sources:number;
 average_telemetry_latency_ms:string|null;telemetry_latency_p95_ms:number|null;
}
interface SweepRow extends QueryResultRow{
 sweep_id:string;mode:"OPERATOR"|"CRON";observed_sources:number;credentialed_sources:number;reachable_sources:number;verified_sources:number;metrics:Record<string,unknown>;observed_at:Date;
}
async function sysopRole(userId:string){
 return withUserDatabase(userId,async client=>{
  const r=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  const role=r.rows[0]?.role??null;if(!["owner","operator"].includes(role??""))throw new Error("build427_operator_required");return role;
 });
}
function countsFromProbes(probes:readonly {credentialPresent:boolean;originReachable:boolean;telemetryVerified:boolean}[]){
 return {observedSources:probes.length,credentialedSources:probes.filter(x=>x.credentialPresent).length,reachableSources:probes.filter(x=>x.originReachable).length,verifiedSources:probes.filter(x=>x.telemetryVerified).length};
}
async function insertProtectedSweep(probes:readonly Build426Probe[],mode:"CRON"){
 const metrics=aggregateBuild426Metrics(probes.filter(x=>x.telemetryVerified&&x.metrics).map(x=>x.metrics as Record<string,unknown>));
 const rows=probes.map(x=>({appId:x.appId,credentialEnvKey:BUILD_427_CREDENTIAL_ENV_KEYS[x.appId],credentialPresent:x.tokenConfigured,origin:x.origin,originReachable:x.originReachable,telemetryStatus:x.telemetryStatus,telemetryLatencyMs:x.telemetryLatencyMs,telemetryVerified:x.telemetryVerified,sourceCommit:x.sourceCommit,detail:x.detail,metrics:x.metrics??{}}));
 const c=countsFromProbes(rows);
 await withProtectedDatabase(async client=>{
  for(const x of rows)await client.query(`insert into app.master_build427_source_activation_events(event_id,app_id,credential_env_key,credential_present,origin,origin_reachable,telemetry_status,telemetry_latency_ms,telemetry_verified,source_commit,detail,metrics,observed_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,now())`,[randomUUID(),x.appId,x.credentialEnvKey,x.credentialPresent,x.origin,x.originReachable,x.telemetryStatus,x.telemetryLatencyMs,x.telemetryVerified,x.sourceCommit,x.detail.slice(0,500),JSON.stringify(x.metrics)]);
  await client.query("insert into app.master_build427_sweep_receipts(sweep_id,mode,observed_sources,credentialed_sources,reachable_sources,verified_sources,metrics,observed_at) values($1,$2,$3,$4,$5,$6,$7::jsonb,now())",[randomUUID(),mode,c.observedSources,c.credentialedSources,c.reachableSources,c.verifiedSources,JSON.stringify(metrics)]);
 });
 return {...c,metrics};
}
export async function sweepBuild427Protected(){
 const probes=await Promise.all(BUILD_405_APPLICATION_IDS.map(appId=>probeBuild426Source(appId)));
 return insertProtectedSweep(probes,"CRON");
}
export async function refreshBuild427(userId:string){
 await sysopRole(userId);
 const b426=await refreshBuild426(userId);
 const rows=b426.probes as ActivationRow[];
 const normalized=rows.map(x=>({appId:x.app_id,credentialEnvKey:BUILD_427_CREDENTIAL_ENV_KEYS[x.app_id as keyof typeof BUILD_427_CREDENTIAL_ENV_KEYS],credentialPresent:Boolean(x.credential_present??x.token_configured),origin:x.origin,originReachable:Boolean(x.origin_reachable),telemetryStatus:x.telemetry_status,telemetryLatencyMs:x.telemetry_latency_ms,telemetryVerified:Boolean(x.telemetry_verified),sourceCommit:x.source_commit,detail:x.detail??"unknown"}));
 const c=countsFromProbes(normalized);
 await withUserDatabase(userId,async client=>{
  for(const x of normalized)await client.query(`insert into app.master_build427_source_activation_events(event_id,app_id,credential_env_key,credential_present,origin,origin_reachable,telemetry_status,telemetry_latency_ms,telemetry_verified,source_commit,detail,metrics,observed_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'{}'::jsonb,now())`,[randomUUID(),x.appId,x.credentialEnvKey,x.credentialPresent,x.origin,x.originReachable,x.telemetryStatus,x.telemetryLatencyMs,x.telemetryVerified,x.sourceCommit,x.detail.slice(0,500)]);
  await client.query("insert into app.master_build427_sweep_receipts(sweep_id,mode,observed_sources,credentialed_sources,reachable_sources,verified_sources,metrics,observed_at) values($1,'OPERATOR',$2,$3,$4,$5,'{}'::jsonb,now())",[randomUUID(),c.observedSources,c.credentialedSources,c.reachableSources,c.verifiedSources]);
 });
 return readBuild427Dashboard(userId);
}
export async function readBuild427Dashboard(userId:string){
 await sysopRole(userId);
 return withUserDatabase(userId,async client=>{
  const [latest,rollups,sweeps]=await Promise.all([
   client.query<ActivationRow>("select distinct on(app_id) app_id,credential_env_key,credential_present,origin,origin_reachable,telemetry_status,telemetry_latency_ms,telemetry_verified,source_commit,detail,metrics,observed_at from app.master_build427_source_activation_events order by app_id,observed_at desc"),
   client.query<RollupRow>("select bucket_start,observations,observed_sources,reachable_observations,verified_observations,verified_sources,average_telemetry_latency_ms,telemetry_latency_p95_ms from app.master_build427_continuous_rollups order by bucket_start desc limit 96"),
   client.query<SweepRow>("select sweep_id,mode,observed_sources,credentialed_sources,reachable_sources,verified_sources,metrics,observed_at from app.master_build427_sweep_receipts order by observed_at desc limit 10")
  ]);
  const byApp=new Map(latest.rows.map(x=>[x.app_id,x]));
  const now=Date.now();
  const sources=BUILD_405_APPLICATION_IDS.map(appId=>{
   const row=byApp.get(appId);const credential=build427CredentialSnapshot(appId);const observedAt=row?.observed_at??null;
   const credentialPresent=row?.credential_present??credential.present;const telemetryVerified=row?.telemetry_verified??false;
   const state=build427SourceState({credentialPresent,telemetryVerified,observedAtMs:observedAt?observedAt.getTime():null,nowMs:now});
   return {appId,credentialEnvKey:row?.credential_env_key??credential.envKey,credentialPresent,origin:row?.origin??null,originReachable:row?.origin_reachable??false,telemetryStatus:row?.telemetry_status??null,telemetryLatencyMs:row?.telemetry_latency_ms??null,telemetryVerified,sourceCommit:row?.source_commit??null,detail:row?.detail??"no_activation_observation",observedAt:observedAt?.toISOString()??null,state};
  });
  const activeFresh=sources.filter(x=>x.state==="ACTIVE_SIGNED_FRESH").length,credentialed=sources.filter(x=>x.credentialPresent).length,observed=sources.filter(x=>x.observedAt).length;
  return {schema:"rosevear.ai-data-platform.build427-master-health.v1",build:427,capturedAt:new Date().toISOString(),sources,rollups:rollups.rows.map(x=>({...x,bucket_start:x.bucket_start.toISOString()})),sweeps:sweeps.rows.map(x=>({...x,observed_at:x.observed_at.toISOString()})),summary:{activeFreshSources:activeFresh,credentialedSources:credentialed,observedSources:observed,state:build427MasterState({activeFresh,credentialed,observed}),sevenSourceConnected:activeFresh===7}};
 });
}
