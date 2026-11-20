import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {BUILD_427_CREDENTIAL_ENV_KEYS} from "./master-seven-source-credential-activation";
import type {Build426AppId} from "./master-seven-source-live-enrollment";

export const BUILD_428=428 as const;
export const BUILD_428_SCHEMA="rosevear.ai-data-platform.build428-source-signer-provisioning.v1" as const;
export const BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES=["yw","icamp"] as const satisfies readonly Build426AppId[];

export const BUILD_428_SOURCE_MATRIX:Record<Build426AppId,{
 provider:"VERCEL"|"CLOUDFLARE"|"ORIGINAL_HOST";
 sourceRoutePresent:boolean;
 credentialRef:string;
 publicKeyFingerprint:string|null;
 expectedCommit:string|null;
 pendingReason:string|null;
}>={
 "ai-data-platform":{provider:"VERCEL",sourceRoutePresent:true,credentialRef:BUILD_427_CREDENTIAL_ENV_KEYS["ai-data-platform"],publicKeyFingerprint:null,expectedCommit:null,pendingReason:"AIDP_PRIVATE_SIGNER_PROVIDER_WRITE_BLOCKED"},
 "yw":{provider:"VERCEL",sourceRoutePresent:true,credentialRef:BUILD_427_CREDENTIAL_ENV_KEYS.yw,publicKeyFingerprint:"eefe31aa41ffc53b08f313b72290e632fa44c29fbc5dc71bd0f3dd6feef75847",expectedCommit:"ff08032062d2d2bf6636eba19e41c9aba1dc8cba",pendingReason:null},
 "icamp":{provider:"VERCEL",sourceRoutePresent:true,credentialRef:BUILD_427_CREDENTIAL_ENV_KEYS.icamp,publicKeyFingerprint:"c0fb0cfe20cafaf796a95b44ce4c375bd6afcdb1b177a5e78018045d43ce25e0",expectedCommit:"2ea77f56bc6c444ef489ac76fff4dd4a9bea5447",pendingReason:null},
 "rosevear-ai-hub":{provider:"ORIGINAL_HOST",sourceRoutePresent:false,credentialRef:BUILD_427_CREDENTIAL_ENV_KEYS["rosevear-ai-hub"],publicKeyFingerprint:null,expectedCommit:null,pendingReason:"ORIGINAL_HOST_SIGNER_AND_HTTPS_RELAY_REQUIRED"},
 "rosevear-comms-hub":{provider:"CLOUDFLARE",sourceRoutePresent:true,credentialRef:BUILD_427_CREDENTIAL_ENV_KEYS["rosevear-comms-hub"],publicKeyFingerprint:null,expectedCommit:null,pendingReason:"CLOUDFLARE_SECRET_AUTHORITY_NOT_CONNECTED"},
 "devilndove":{provider:"CLOUDFLARE",sourceRoutePresent:false,credentialRef:BUILD_427_CREDENTIAL_ENV_KEYS.devilndove,publicKeyFingerprint:null,expectedCommit:null,pendingReason:"SOURCE_TELEMETRY_ROUTE_AND_CLOUDFLARE_SECRET_AUTHORITY_REQUIRED"},
 "rosiedazzlers":{provider:"CLOUDFLARE",sourceRoutePresent:true,credentialRef:BUILD_427_CREDENTIAL_ENV_KEYS.rosiedazzlers,publicKeyFingerprint:null,expectedCommit:null,pendingReason:"CLOUDFLARE_SECRET_AUTHORITY_NOT_CONNECTED"}
};

type Pin={fingerprint?:unknown;expectedCommit?:unknown};
function pins(env:Record<string,string|undefined>=process.env):Record<string,Pin>{
 try{return JSON.parse(env.ROSEVEAR_SYSOP_TELEMETRY_PINS_JSON??"{}") as Record<string,Pin>;}catch{return {};}
}
export function build428PinSnapshot(appId:Build426AppId,env:Record<string,string|undefined>=process.env){
 const expected=BUILD_428_SOURCE_MATRIX[appId],pin=pins(env)[appId];
 const present=Boolean(pin&&typeof pin.fingerprint==="string"&&typeof pin.expectedCommit==="string");
 const exact=present&&expected.publicKeyFingerprint!==null&&expected.expectedCommit!==null&&pin.fingerprint===expected.publicKeyFingerprint&&pin.expectedCommit===expected.expectedCommit;
 return {appId,present,exact,fingerprint:typeof pin?.fingerprint==="string"?pin.fingerprint:null,expectedCommit:typeof pin?.expectedCommit==="string"?pin.expectedCommit:null};
}
export function build428AcceptanceState(input:{appId:Build426AppId;telemetryVerified:boolean;receiptPresent:boolean}){
 if(input.telemetryVerified&&input.receiptPresent)return "ACTIVE_SIGNED_FIRST_HEARTBEAT";
 const matrix=BUILD_428_SOURCE_MATRIX[input.appId];
 if(BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES.includes(input.appId as (typeof BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES)[number]))return "HOLD_REQUIRED_SOURCE_NOT_VERIFIED";
 return matrix.pendingReason??"HOLD_NOT_PROVISIONED";
}
export function build428RunState(input:{verifiedRequired:number;activeSources:number}){
 if(input.activeSources===BUILD_405_APPLICATION_IDS.length)return "SEVEN_SOURCE_SIGNED_LIVE";
 if(input.verifiedRequired===BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES.length)return "PARTIAL_GENUINE_ACTIVATION_ACCEPTED";
 return "REQUIRED_FIRST_HEARTBEAT_HOLD";
}
