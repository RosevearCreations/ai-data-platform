import { createHash, createPrivateKey, createPublicKey, randomBytes, randomUUID, sign, timingSafeEqual, verify } from "node:crypto";
import { withProtectedDatabase } from "./database";
import { BUILD_405_APPLICATION_IDS } from "./master-assurance-renewal-security-comms-recertification";

export const SYSOP_TELEMETRY_SCHEMA="rosevear.sysop.statistics.v1" as const;
export const SYSOP_TELEMETRY_PATH="/internal/rosevear/sysop/telemetry/v1" as const;
export const SYSOP_TELEMETRY_CHALLENGE_HEADER="x-rosevear-telemetry-challenge" as const;
const MAX_AGE_MS=90_000;
const METRIC_KEYS=["requests","serverErrors","jobsCompleted","jobsFailed","queueDepth","latencyP95Ms","activeSessions"] as const;
const SYSOP_KEYS=["eventKind","observedAtMs","processUptimeSec","restartCount","lastRestartAtMs","bootTimeMs","rebootIsIndependentlyWitnessed"] as const;
type Envelope={payload:Record<string,unknown>;signature:string};
function canonical(value:unknown):string{
 if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
 if(value&&typeof value==="object")return "{"+Object.keys(value as Record<string,unknown>).sort().map(k=>JSON.stringify(k)+":"+canonical((value as Record<string,unknown>)[k])).join(",")+"}";
 return JSON.stringify(value);
}
function exact(value:unknown,keys:readonly string[]){return Boolean(value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value as object).length===keys.length&&Object.keys(value as object).every(k=>keys.includes(k)));}
function bounded(value:unknown){return value===null||(Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=2147483647);}
function tokenOk(actual:string|null,expected:string|undefined){
 if(!expected||!actual)return false;const a=Buffer.from(actual),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);
}
type Pin={publicKeyPem:string;fingerprint:string;expectedCommit:string};
function pins():Record<string,Pin>{
 try{return JSON.parse(process.env.ROSEVEAR_SYSOP_TELEMETRY_PINS_JSON??"{}") as Record<string,Pin>;}catch{return {};}
}
function expectedCommitMatches(appId:string,pinExpected:string,sourceCommit:string){
 if(appId==="ai-data-platform"&&pinExpected==="SELF_VERCEL_GIT_COMMIT_SHA"){
  const deployed=process.env.VERCEL_GIT_COMMIT_SHA??process.env.GITHUB_SHA??"";
  return /^[a-f0-9]{40}$/.test(deployed)&&sourceCommit===deployed;
 }
 return sourceCommit===pinExpected;
}
export function verifySysopTelemetryEnvelope(envelope:Envelope,nowMs=Date.now(),options:{expectedChallenge?:string|null}={}){
 if(!envelope||!exact(envelope,["payload","signature"])||!/^[a-f0-9]{128}$/.test(envelope.signature))throw new Error("build423_telemetry_envelope_invalid");
 const p=envelope.payload;
 const protocolVersion=String(p.protocolVersion);
 const fieldsV11=["schema","protocolVersion","appId","sourceCommit","eventId","nonce","issuedAtMs","expiresAtMs","state","metricsWindowSeconds","metrics","sysop","dataClass","tenantId","authorizesAction"];
 const fieldsV12=[...fieldsV11.slice(0,9),"challenge",...fieldsV11.slice(9)];
 if(protocolVersion==="1.1"){if(!exact(p,fieldsV11))throw new Error("build423_telemetry_payload_shape_invalid");}
 else if(protocolVersion==="1.2"){if(!exact(p,fieldsV12))throw new Error("build430_telemetry_payload_shape_invalid");}
 else throw new Error("build430_telemetry_protocol_unsupported");
 const appId=String(p.appId);
 if(!BUILD_405_APPLICATION_IDS.includes(appId as (typeof BUILD_405_APPLICATION_IDS)[number]))throw new Error("build423_telemetry_app_invalid");
 const pin=pins()[appId];if(!pin)throw new Error("build423_telemetry_source_not_enrolled");
 if(p.schema!==SYSOP_TELEMETRY_SCHEMA||!expectedCommitMatches(appId,pin.expectedCommit,String(p.sourceCommit))||!/^[a-f0-9]{40}$/.test(String(p.sourceCommit))||
  !/^[A-Za-z0-9_-]{16,80}$/.test(String(p.eventId))||!/^[a-f0-9]{32}$/.test(String(p.nonce))||
  !Number.isSafeInteger(p.issuedAtMs)||!Number.isSafeInteger(p.expiresAtMs)||Number(p.issuedAtMs)>nowMs+2000||nowMs-Number(p.issuedAtMs)>MAX_AGE_MS||
  Number(p.expiresAtMs)<=nowMs||Number(p.expiresAtMs)-Number(p.issuedAtMs)>MAX_AGE_MS||!["HEALTHY","DEGRADED","UNHEALTHY","UNKNOWN"].includes(String(p.state))||
  !Number.isSafeInteger(p.metricsWindowSeconds)||Number(p.metricsWindowSeconds)<60||Number(p.metricsWindowSeconds)>86400||
  p.dataClass!=="NON_SENSITIVE_AGGREGATE"||p.tenantId!==null||p.authorizesAction!==false)throw new Error("build423_telemetry_scope_or_freshness_invalid");
 if(!exact(p.metrics,METRIC_KEYS)||!METRIC_KEYS.every(k=>bounded((p.metrics as Record<string,unknown>)[k])))throw new Error("build423_telemetry_metrics_invalid");
 const sysop=p.sysop as Record<string,unknown>;
 const observedAtMs=sysop.observedAtMs;
 const optionalEpoch=(value:unknown)=>value===null||(Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=nowMs+2000);
 if(!exact(p.sysop,SYSOP_KEYS)||
   !Number.isSafeInteger(observedAtMs)||Number(observedAtMs)<0||Number(observedAtMs)>nowMs+2000||nowMs-Number(observedAtMs)>MAX_AGE_MS||
   !bounded(sysop.processUptimeSec)||!bounded(sysop.restartCount)||!optionalEpoch(sysop.lastRestartAtMs)||!optionalEpoch(sysop.bootTimeMs)||
   !["HEARTBEAT","PROCESS_RESTART_OBSERVED","HOST_BOOT_OBSERVED","SCHEDULED_MAINTENANCE_OBSERVED","BACKUP_VERIFY_OBSERVED","INCIDENT_OBSERVED"].includes(String(sysop.eventKind))||
   sysop.rebootIsIndependentlyWitnessed!==false)throw new Error("build423_telemetry_sysop_invalid");
 if(appId!=="rosevear-ai-hub"&&((p.sysop as Record<string,unknown>).bootTimeMs!==null||(p.sysop as Record<string,unknown>).eventKind==="HOST_BOOT_OBSERVED"))throw new Error("build423_telemetry_boot_scope_invalid");
 const challenge=protocolVersion==="1.2"?String(p.challenge):null;
 if(protocolVersion==="1.2"&&!/^[a-f0-9]{64}$/.test(challenge??""))throw new Error("build430_telemetry_challenge_invalid");
 if(options.expectedChallenge!==undefined&&options.expectedChallenge!==null){
  if(!/^[a-f0-9]{64}$/.test(options.expectedChallenge))throw new Error("build430_expected_challenge_invalid");
  if(protocolVersion!=="1.2"||challenge!==options.expectedChallenge)throw new Error("build430_telemetry_challenge_mismatch");
 }
 const key=createPublicKey(pin.publicKeyPem);const raw=key.export({format:"der",type:"spki"});const fingerprint=createHash("sha256").update(raw.subarray(raw.length-32)).digest("hex");
 if(fingerprint!==pin.fingerprint)throw new Error("build423_telemetry_pin_mismatch");
 if(!verify(null,Buffer.from(canonical(p)),key,Buffer.from(envelope.signature,"hex")))throw new Error("build423_telemetry_signature_invalid");
 const challengeVerified=protocolVersion==="1.2"&&Boolean(options.expectedChallenge)&&challenge===options.expectedChallenge;
 return {appId,eventId:String(p.eventId),nonce:String(p.nonce),sourceCommit:String(p.sourceCommit),state:String(p.state),metrics:p.metrics as Record<string,unknown>,sysop:p.sysop as Record<string,unknown>,protocolVersion,challenge,challengeVerified,
  issuedAt:new Date(Number(p.issuedAtMs)).toISOString(),expiresAt:new Date(Number(p.expiresAtMs)).toISOString(),signatureSha256:createHash("sha256").update(Buffer.from(envelope.signature,"hex")).digest("hex")};
}
export async function admitSysopTelemetryEnvelope(envelope:Envelope,options:{expectedChallenge?:string|null}={}){
 const v=verifySysopTelemetryEnvelope(envelope,Date.now(),options);
 return withProtectedDatabase(async client=>{
  const receiptId=randomUUID();
  await client.query(`insert into app.master_build423_sysop_telemetry_receipts(
   receipt_id,app_id,event_id,nonce,source_commit,state,event_kind,metrics,process_uptime_sec,restart_count,last_restart_at_ms,boot_time_ms,
   source_signature_verified,source_commit_verified,privacy_boundary_verified,anti_replay_verified,transport_verified,independent_signer_pin_verified,owner_reviewed,
   signature_sha256,issued_at,expires_at,protocol_version,challenge_sha256,challenge_verified
  ) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,true,true,true,true,false,true,false,$13,$14::timestamptz,$15::timestamptz,$16,$17,$18)`,
  [receiptId,v.appId,v.eventId,v.nonce,v.sourceCommit,v.state,String(v.sysop.eventKind),JSON.stringify(v.metrics),v.sysop.processUptimeSec,v.sysop.restartCount,v.sysop.lastRestartAtMs,v.sysop.bootTimeMs,v.signatureSha256,v.issuedAt,v.expiresAt,v.protocolVersion,v.challenge?createHash("sha256").update(v.challenge).digest("hex"):null,v.challengeVerified]);
  return {receiptId,appId:v.appId,state:"SIGNED_SOURCE_ONLY",protocolVersion:v.protocolVersion,challengeVerified:v.challengeVerified,liveTransportVerified:false,authorizesAction:false};
 });
}
export function authorizeTelemetryRequest(request:Request){
 const expected=process.env.ROSEVEAR_SYSOP_TELEMETRY_READ_TOKEN;
 const actual=request.headers.get("x-rosevear-telemetry-token");
 return tokenOk(actual,expected);
}
export function buildLocalAIDPTelemetryEnvelope(nowMs=Date.now(),challenge:string|null=null){
 const tokenConfigured=Boolean(process.env.ROSEVEAR_SYSOP_TELEMETRY_READ_TOKEN);
 const pem=process.env.ROSEVEAR_SYSOP_TELEMETRY_PRIVATE_KEY_PEM;
 const sourceCommit=process.env.VERCEL_GIT_COMMIT_SHA??process.env.GITHUB_SHA??"";
 if(!tokenConfigured||!pem||!/^[a-f0-9]{40}$/.test(sourceCommit))throw new Error("build423_local_telemetry_not_enrolled");
 if(challenge!==null&&!/^[a-f0-9]{64}$/.test(challenge))throw new Error("build430_local_challenge_invalid");
 const payload={schema:SYSOP_TELEMETRY_SCHEMA,protocolVersion:challenge?"1.2":"1.1",appId:"ai-data-platform",sourceCommit,eventId:randomUUID().replaceAll("-",""),
  nonce:randomBytes(16).toString("hex"),issuedAtMs:nowMs,expiresAtMs:nowMs+60_000,state:"UNKNOWN",...(challenge?{challenge}:{}),metricsWindowSeconds:60,
  metrics:{requests:null,serverErrors:null,jobsCompleted:null,jobsFailed:null,queueDepth:null,latencyP95Ms:null,activeSessions:null},
  sysop:{eventKind:"HEARTBEAT",observedAtMs:nowMs,processUptimeSec:Math.floor(process.uptime()),restartCount:null,lastRestartAtMs:null,bootTimeMs:null,rebootIsIndependentlyWitnessed:false},
  dataClass:"NON_SENSITIVE_AGGREGATE",tenantId:null,authorizesAction:false};
 const signature=sign(null,Buffer.from(canonical(payload)),createPrivateKey(pem)).toString("hex");
 return {payload,signature};
}
