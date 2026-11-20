import {randomUUID} from "node:crypto";
import type {PoolClient,QueryResultRow} from "pg";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {refreshBuild427,readBuild427Dashboard,sweepBuild427Protected} from "./build427-master-health-database";
import {build427CredentialSnapshot} from "./master-seven-source-credential-activation";
import {BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES,BUILD_428_SOURCE_MATRIX,build428AcceptanceState,build428PinSnapshot,build428RunState} from "./master-source-signer-provisioning";
import type {Build426AppId} from "./master-seven-source-live-enrollment";

interface ActivationRow extends QueryResultRow{app_id:Build426AppId;credential_present:boolean;telemetry_verified:boolean;source_commit:string|null;detail:string;observed_at:Date;}
interface ReceiptRow extends QueryResultRow{app_id:Build426AppId;receipt_id:string;source_commit:string;recorded_at:Date;}
interface AcceptanceRow extends QueryResultRow{acceptance_id:string;app_id:Build426AppId;provider:string;credential_ref:string;credential_present:boolean;source_route_present:boolean;signer_pin_present:boolean;signer_pin_exact:boolean;public_key_fingerprint:string|null;expected_commit:string|null;telemetry_verified:boolean;source_receipt_id:string|null;state:string;detail:string;observed_at:Date;}
interface RunRow extends QueryResultRow{run_id:string;mode:"OPERATOR"|"PRODUCTION_BUILD";required_sources:unknown;verified_required_sources:number;active_sources:number;state:string;observed_at:Date;}

async function recordBuild428Acceptance(client:PoolClient,startedAt:Date,mode:"OPERATOR"|"PRODUCTION_BUILD"){
 const [activations,receipts]=await Promise.all([
  client.query<ActivationRow>("select distinct on(app_id) app_id,credential_present,telemetry_verified,source_commit,detail,observed_at from app.master_build427_source_activation_events where observed_at >= $1 order by app_id,observed_at desc",[startedAt]),
  client.query<ReceiptRow>("select distinct on(app_id) app_id,receipt_id,source_commit,recorded_at from app.master_build423_sysop_telemetry_receipts where recorded_at >= $1 order by app_id,recorded_at desc",[startedAt])
 ]);
 const activationByApp=new Map(activations.rows.map(x=>[x.app_id,x])),receiptByApp=new Map(receipts.rows.map(x=>[x.app_id,x]));
 const states:Array<{appId:Build426AppId;state:string;telemetryVerified:boolean;receiptId:string|null}>=[];
 for(const appId of BUILD_405_APPLICATION_IDS){
  const matrix=BUILD_428_SOURCE_MATRIX[appId],activation=activationByApp.get(appId),receipt=receiptByApp.get(appId),pin=build428PinSnapshot(appId);
  const telemetryVerified=Boolean(activation?.telemetry_verified&&receipt&&receipt.source_commit===activation.source_commit);
  const state=build428AcceptanceState({appId,telemetryVerified,receiptPresent:Boolean(receipt)});
  const credentialPresent=activation?.credential_present??build427CredentialSnapshot(appId).present;
  const detail=telemetryVerified?"fresh_signed_heartbeat_verified":matrix.pendingReason??activation?.detail??"source_not_verified";
  const acceptanceId=randomUUID();
  await client.query(`insert into app.master_build428_source_pairing_acceptance(acceptance_id,app_id,provider,credential_ref,credential_present,source_route_present,signer_pin_present,signer_pin_exact,public_key_fingerprint,expected_commit,telemetry_verified,source_receipt_id,state,detail,observed_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())`,[acceptanceId,appId,matrix.provider,matrix.credentialRef,credentialPresent,matrix.sourceRoutePresent,pin.present,pin.exact,matrix.publicKeyFingerprint,matrix.expectedCommit,telemetryVerified,receipt?.receipt_id??null,state,detail.slice(0,600)]);
  states.push({appId,state,telemetryVerified,receiptId:receipt?.receipt_id??null});
 }
 const activeSources=states.filter(x=>x.telemetryVerified).length;
 const verifiedRequiredSources=BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES.filter(appId=>states.find(x=>x.appId===appId)?.telemetryVerified).length;
 const state=build428RunState({verifiedRequired:verifiedRequiredSources,activeSources});
 const runId=randomUUID();
 await client.query("insert into app.master_build428_activation_runs(run_id,mode,required_sources,verified_required_sources,active_sources,state,observed_at) values($1,$2,$3::jsonb,$4,$5,$6,now())",[runId,mode,JSON.stringify(BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES),verifiedRequiredSources,activeSources,state]);
 return {runId,mode,verifiedRequiredSources,activeSources,state,sources:states};
}

export async function runBuild428ProtectedActivation(){
 const startedAt=new Date();
 await sweepBuild427Protected();
 return withProtectedDatabase(client=>recordBuild428Acceptance(client,startedAt,"PRODUCTION_BUILD"));
}

export async function refreshBuild428(userId:string){
 const startedAt=new Date();
 await refreshBuild427(userId);
 return withUserDatabase(userId,client=>recordBuild428Acceptance(client,startedAt,"OPERATOR"));
}

export async function readBuild428Dashboard(userId:string){
 const masterHealth=await readBuild427Dashboard(userId);
 return withUserDatabase(userId,async client=>{
  const [latest,runs]=await Promise.all([
   client.query<AcceptanceRow>("select acceptance_id,app_id,provider,credential_ref,credential_present,source_route_present,signer_pin_present,signer_pin_exact,public_key_fingerprint,expected_commit,telemetry_verified,source_receipt_id,state,detail,observed_at from app.master_build428_latest_source_acceptance order by app_id"),
   client.query<RunRow>("select run_id,mode,required_sources,verified_required_sources,active_sources,state,observed_at from app.master_build428_activation_runs order by observed_at desc limit 12")
  ]);
  const byApp=new Map(latest.rows.map(x=>[x.app_id,x]));
  const sources=BUILD_405_APPLICATION_IDS.map(appId=>{
   const row=byApp.get(appId),matrix=BUILD_428_SOURCE_MATRIX[appId],pin=build428PinSnapshot(appId),credential=build427CredentialSnapshot(appId);
   return row?{...row,observed_at:row.observed_at.toISOString()}:{app_id:appId,provider:matrix.provider,credential_ref:matrix.credentialRef,credential_present:credential.present,source_route_present:matrix.sourceRoutePresent,signer_pin_present:pin.present,signer_pin_exact:pin.exact,public_key_fingerprint:matrix.publicKeyFingerprint,expected_commit:matrix.expectedCommit,telemetry_verified:false,source_receipt_id:null,state:matrix.pendingReason??"HOLD_NOT_PROVISIONED",detail:"no_build428_acceptance_observation",observed_at:null};
  });
  return {schema:"rosevear.ai-data-platform.build428-source-signer-activation-dashboard.v1",build:428,capturedAt:new Date().toISOString(),requiredFirstHeartbeatSources:BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES,sources,runs:runs.rows.map(x=>({...x,observed_at:x.observed_at.toISOString()})),masterHealth};
 });
}
