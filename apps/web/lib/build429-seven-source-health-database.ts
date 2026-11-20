import {randomUUID} from "node:crypto";
import type {PoolClient,QueryResultRow} from "pg";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {probeBuild426Source,type Build426Probe} from "./build426-live-runtime-database";
import {
 BUILD_429_METRIC_DICTIONARY,
 BUILD_429_SOURCE_CATALOG,
 build429Coverage,
 build429HealthState
} from "./master-build429-seven-source-continuous-health";
import type {Build426AppId} from "./master-seven-source-live-enrollment";

type Build429Mode="OPERATOR"|"CRON"|"PRODUCTION_BUILD";
interface HealthRow extends QueryResultRow{
 observation_id:string;sweep_id:string;app_id:Build426AppId;provider:string;origin:string|null;origin_reachable:boolean;
 telemetry_status:number|null;telemetry_latency_ms:number|null;credential_present:boolean;telemetry_verified:boolean;
 source_receipt_id:string|null;source_commit:string|null;reviewed_commit:string|null;source_route_implemented:boolean;
 state:string;hold_reason:string|null;detail:string;observed_at:Date;
}
interface SweepRow extends QueryResultRow{
 sweep_id:string;mode:Build429Mode;observed_sources:number;verified_sources:number;classified_sources:number;held_sources:number;state:string;observed_at:Date;
}

async function sysopRole(userId:string){
 return withUserDatabase(userId,async client=>{
  const r=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  const role=r.rows[0]?.role??null;
  if(!["owner","operator"].includes(role??""))throw new Error("build429_operator_required");
  return role;
 });
}

function summarize(probes:readonly Build426Probe[]){
 const states=probes.map(probe=>({
  probe,
  state:build429HealthState(probe.appId,{telemetryVerified:probe.telemetryVerified,receiptId:probe.receiptId})
 }));
 const verifiedSources=states.filter(x=>x.state==="ACTIVE_SIGNED_FRESH").length;
 const classifiedSources=states.filter(x=>x.state==="ACTIVE_SIGNED_FRESH"||x.state.startsWith("HOLD_")).length;
 const heldSources=states.filter(x=>x.state!=="ACTIVE_SIGNED_FRESH").length;
 const state=verifiedSources===7?"SEVEN_SOURCE_SIGNED_LIVE":classifiedSources===7?"SEVEN_SOURCE_CLASSIFIED_PARTIAL_SIGNED":"SEVEN_SOURCE_CLASSIFICATION_INCOMPLETE";
 return {states,verifiedSources,classifiedSources,heldSources,state,coverage:build429Coverage({verifiedSources,classifiedSources})};
}

async function persist(client:PoolClient,mode:Build429Mode,probes:readonly Build426Probe[]){
 const sweepId=randomUUID();
 const summary=summarize(probes);
 await client.query(
  "insert into app.master_build429_sweep_receipts(sweep_id,mode,observed_sources,verified_sources,classified_sources,held_sources,state,observed_at) values($1,$2,$3,$4,$5,$6,$7,now())",
  [sweepId,mode,probes.length,summary.verifiedSources,summary.classifiedSources,summary.heldSources,summary.state]
 );
 for(const {probe,state} of summary.states){
  const catalog=BUILD_429_SOURCE_CATALOG[probe.appId];
  const holdReason=state==="ACTIVE_SIGNED_FRESH"?null:state;
  await client.query(
   `insert into app.master_build429_source_health_observations(
    observation_id,sweep_id,app_id,provider,origin,origin_reachable,telemetry_status,telemetry_latency_ms,
    credential_present,telemetry_verified,source_receipt_id,source_commit,reviewed_commit,source_route_implemented,
    state,hold_reason,detail,observed_at
   ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now())`,
   [randomUUID(),sweepId,probe.appId,catalog.provider,probe.origin,probe.originReachable,probe.telemetryStatus,probe.telemetryLatencyMs,
    probe.tokenConfigured,probe.telemetryVerified,probe.receiptId,probe.sourceCommit,catalog.reviewedCommit,catalog.sourceRouteImplemented,
    state,holdReason,probe.detail.slice(0,600)]
  );
 }
 return {sweepId,mode,observedSources:probes.length,...summary};
}

async function probeAll(){
 return Promise.all(BUILD_405_APPLICATION_IDS.map(appId=>probeBuild426Source(appId)));
}

export async function runBuild429ProtectedSweep(mode:"CRON"|"PRODUCTION_BUILD"="CRON"){
 const probes=await probeAll();
 return withProtectedDatabase(client=>persist(client,mode,probes));
}

export async function refreshBuild429(userId:string){
 await sysopRole(userId);
 const probes=await probeAll();
 await withUserDatabase(userId,client=>persist(client,"OPERATOR",probes));
 return readBuild429Dashboard(userId);
}

export async function runBuild429ProductionAcceptance(){
 const result=await runBuild429ProtectedSweep("PRODUCTION_BUILD");
 const required=new Set<Build426AppId>(["yw","icamp"]);
 const activeRequired=result.states.filter(x=>required.has(x.probe.appId)&&x.state==="ACTIVE_SIGNED_FRESH").map(x=>x.probe.appId);
 if(result.classifiedSources!==7)throw new Error("build429_seven_source_classification_incomplete");
 if(activeRequired.length!==2)throw new Error("build429_required_existing_signed_sources_regressed");
 if(result.states.some(x=>x.state!=="ACTIVE_SIGNED_FRESH"&&!x.state.startsWith("HOLD_")))throw new Error("build429_unexplained_source_state");
 return {
  sweepId:result.sweepId,
  verifiedSources:result.verifiedSources,
  classifiedSources:result.classifiedSources,
  heldSources:result.heldSources,
  state:result.state,
  activeRequired
 };
}

export async function readBuild429Dashboard(userId:string){
 await sysopRole(userId);
 return withUserDatabase(userId,async client=>{
  const [latest,sweeps]=await Promise.all([
   client.query<HealthRow>("select * from app.master_build429_latest_source_health order by app_id"),
   client.query<SweepRow>("select sweep_id,mode,observed_sources,verified_sources,classified_sources,held_sources,state,observed_at from app.master_build429_sweep_receipts order by observed_at desc limit 24")
  ]);
  const byApp=new Map(latest.rows.map(row=>[row.app_id,row]));
  const sources=BUILD_405_APPLICATION_IDS.map(appId=>{
   const row=byApp.get(appId);const catalog=BUILD_429_SOURCE_CATALOG[appId];
   return {
    appId,
    catalog,
    observation:row?{...row,observed_at:row.observed_at.toISOString()}:null,
    state:row?.state??catalog.explicitHold??"HOLD_UNVERIFIED",
    lastVerifiedAt:row?.telemetry_verified?row.observed_at.toISOString():null,
    holdReason:row?.hold_reason??catalog.explicitHold,
    sourceReceiptId:row?.source_receipt_id??null
   };
  });
  const active=sources.filter(x=>x.state==="ACTIVE_SIGNED_FRESH").length;
  const classified=sources.filter(x=>x.state==="ACTIVE_SIGNED_FRESH"||String(x.state).startsWith("HOLD_")).length;
  return {
   schema:"rosevear.ai-data-platform.build429-seven-source-continuous-health-dashboard.v1",
   build:429,
   capturedAt:new Date().toISOString(),
   sources,
   sweeps:sweeps.rows.map(row=>({...row,observed_at:row.observed_at.toISOString()})),
   metricDictionary:BUILD_429_METRIC_DICTIONARY,
   summary:{...build429Coverage({verifiedSources:active,classifiedSources:classified}),heldSources:7-active}
  };
 });
}
