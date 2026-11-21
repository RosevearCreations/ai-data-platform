import {createHash} from "node:crypto";
import type {Build426AppId} from "./master-seven-source-live-enrollment";

export const BUILD_430=430 as const;
export const BUILD_430_SCHEMA="rosevear.ai-data-platform.build430-source-signed-sweep-challenge.v1" as const;
export const BUILD_430_PROTOCOL="1.2" as const;
export const BUILD_430_CHALLENGE_HEADER="x-rosevear-telemetry-challenge" as const;
export const BUILD_430_REQUIRED_SOURCES=["yw","icamp"] as const satisfies readonly Build426AppId[];
export type Build430RequiredSource=(typeof BUILD_430_REQUIRED_SOURCES)[number];
export const BUILD_430_HOSTED_CADENCE={
 provider:"VERCEL_CRON",
 schedule:"17 12 * * *",
 floorSeconds:86400,
 statement:"Daily protected hosted floor; operator and production sweeps may add observations. This is not a five-minute uptime promise."
} as const;

export type Build430ReliabilityKind=
 |"ONLINE_VERIFIED"
 |"ONLINE_CONTINUITY_VERIFIED"
 |"DEPLOYMENT_CHANGE_VERIFIED"
 |"OFFLINE_OR_HELD"
 |"RETURN_VERIFIED";

export function build430ReliabilityKind(input:{previousVerified:boolean|null;previousCommit:string|null;currentVerified:boolean;currentCommit:string|null}):Build430ReliabilityKind{
 if(!input.currentVerified)return "OFFLINE_OR_HELD";
 if(input.previousVerified===false)return "RETURN_VERIFIED";
 if(input.previousVerified===null)return "ONLINE_VERIFIED";
 if(input.previousCommit&&input.currentCommit&&input.previousCommit!==input.currentCommit)return "DEPLOYMENT_CHANGE_VERIFIED";
 return "ONLINE_CONTINUITY_VERIFIED";
}

export function build430ChallengeSha256(challenge:string){
 if(!/^[a-f0-9]{64}$/.test(challenge))throw new Error("build430_challenge_invalid");
 return createHash("sha256").update(challenge).digest("hex");
}

export function build430OverlapCertified(rows:readonly {appId:string;challengeSha256:string;receiptId:string|null;challengeVerified:boolean}[]){
 return BUILD_430_REQUIRED_SOURCES.every(appId=>{
  const source=rows.filter(row=>row.appId===appId&&row.challengeVerified&&Boolean(row.receiptId));
  return source.length===2&&new Set(source.map(row=>row.challengeSha256)).size===2&&new Set(source.map(row=>row.receiptId)).size===2;
 });
}
