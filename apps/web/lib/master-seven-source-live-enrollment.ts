import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";
export const BUILD_426=426 as const;
export const BUILD_426_SCHEMA="rosevear.ai-data-platform.build426-seven-source-live-enrollment.v1" as const;
export const BUILD_426_TELEMETRY_PATH="/internal/rosevear/sysop/telemetry/v1" as const;
export type Build426AppId=(typeof BUILD_405_APPLICATION_IDS)[number];
export const BUILD_426_DEFAULT_ORIGINS:Record<Build426AppId,string|null>={
 "ai-data-platform":"https://ai-data-platform-beryl.vercel.app",
 "rosevear-ai-hub":null,
 "rosevear-comms-hub":"https://rosevear-comms-hub.devilndovelive.workers.dev",
 "icamp":"https://i-camp-pi.vercel.app",
 "yw":"https://yw-alpha.vercel.app",
 "devilndove":"https://devilndove-site.pages.dev",
 "rosiedazzlers":"https://rosiedazzlers.ca"
};
export const BUILD_426_ENV_TAGS:Record<Build426AppId,string>={"ai-data-platform":"AIDP","rosevear-ai-hub":"HUB","rosevear-comms-hub":"COMMS","icamp":"ICAMP","yw":"YW","devilndove":"DEVIL","rosiedazzlers":"ROSIE"};
export function build426Origin(appId:Build426AppId,env:NodeJS.ProcessEnv=process.env){const tag=BUILD_426_ENV_TAGS[appId];const raw=(env["ROSEVEAR_SYSOP426_"+tag+"_ORIGIN"]||BUILD_426_DEFAULT_ORIGINS[appId]||"").trim();if(!raw)return null;const u=new URL(raw);if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.pathname!=="/")throw new Error("build426_origin_invalid_"+appId);return u.origin;}
export function build426Token(appId:Build426AppId,env:NodeJS.ProcessEnv=process.env){if(appId==="ai-data-platform")return env.ROSEVEAR_SYSOP_TELEMETRY_READ_TOKEN||null;const tag=BUILD_426_ENV_TAGS[appId];return env["ROSEVEAR_SYSOP426_"+tag+"_READ_TOKEN"]||null;}
export function aggregateBuild426Metrics(rows:Array<Record<string,unknown>>){const sumKeys=["requests","serverErrors","jobsCompleted","jobsFailed","queueDepth","activeSessions"] as const;const out:Record<string,{value:number|null;reportingSources:number;aggregation:string}>={};for(const key of sumKeys){const values=rows.map(r=>r[key]).filter((v):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0);out[key]={value:values.length?values.reduce((a,b)=>a+b,0):null,reportingSources:values.length,aggregation:"SUM"};}const latency=rows.map(r=>r.latencyP95Ms).filter((v):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0);out.latencyP95Ms={value:latency.length?Math.max(...latency):null,reportingSources:latency.length,aggregation:"MAX_SOURCE_P95"};return out;}
export function build426State(input:{configuredOrigins:number;reachableOrigins:number;tokenConfigured:number;verifiedTelemetry:number}){if(input.verifiedTelemetry===7)return "SEVEN_SOURCE_LIVE_ACCEPTED";if(input.verifiedTelemetry>0)return "PARTIAL_LIVE_TELEMETRY";if(input.reachableOrigins>0)return "LIVE_ORIGIN_REACHABILITY_ONLY";return input.configuredOrigins>0?"CONFIGURED_NOT_REACHABLE":"NO_LIVE_PEER_ORIGINS";}
