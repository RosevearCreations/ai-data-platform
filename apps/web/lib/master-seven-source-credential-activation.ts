import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
import {BUILD_426_ENV_TAGS,type Build426AppId} from "./master-seven-source-live-enrollment";

export const BUILD_427=427 as const;
export const BUILD_427_SCHEMA="rosevear.ai-data-platform.build427-seven-source-credential-activation.v1" as const;
export const BUILD_427_FRESHNESS_MS=15*60*1000;
export const BUILD_427_ROLLUP_BUCKET_MINUTES=15;

export const BUILD_427_CREDENTIAL_ENV_KEYS:Record<Build426AppId,string>=Object.fromEntries(
 BUILD_405_APPLICATION_IDS.map(appId=>[appId,appId==="ai-data-platform"?"ROSEVEAR_SYSOP_TELEMETRY_READ_TOKEN":"ROSEVEAR_SYSOP426_"+BUILD_426_ENV_TAGS[appId]+"_READ_TOKEN"])
) as Record<Build426AppId,string>;

export function build427CredentialSnapshot(appId:Build426AppId,env:Record<string,string|undefined>=process.env){
 const envKey=BUILD_427_CREDENTIAL_ENV_KEYS[appId];
 return {appId,envKey,present:Boolean(env[envKey]?.trim())};
}
export function build427SourceState(input:{credentialPresent:boolean;telemetryVerified:boolean;observedAtMs:number|null;nowMs?:number}){
 const now=input.nowMs??Date.now();
 const fresh=input.observedAtMs!==null&&input.observedAtMs<=now&&now-input.observedAtMs<=BUILD_427_FRESHNESS_MS;
 if(input.telemetryVerified&&fresh)return "ACTIVE_SIGNED_FRESH";
 if(input.telemetryVerified)return "SIGNED_STALE";
 if(input.credentialPresent)return "CREDENTIAL_ENROLLED_AWAITING_SIGNED_TELEMETRY";
 return "CREDENTIAL_MISSING";
}
export function build427MasterState(input:{activeFresh:number;credentialed:number;observed:number}){
 if(input.activeFresh===7)return "SEVEN_SOURCE_SIGNED_LIVE";
 if(input.activeFresh>0)return "PARTIAL_SIGNED_LIVE";
 if(input.credentialed>0)return "CREDENTIAL_ENROLLMENT_IN_PROGRESS";
 return input.observed>0?"OBSERVED_WITHOUT_CREDENTIALS":"NO_LIVE_OBSERVATIONS";
}
