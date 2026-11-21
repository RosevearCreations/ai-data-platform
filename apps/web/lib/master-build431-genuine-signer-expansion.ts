import type {Build426AppId} from "./master-seven-source-live-enrollment";

export const BUILD_431=431 as const;
export const BUILD_431_SCHEMA="rosevear.ai-data-platform.build431-genuine-signer-expansion.v1" as const;
export const BUILD_431_REQUIRED_SIGNED_SOURCES=["ai-data-platform","yw","icamp"] as const satisfies readonly Build426AppId[];
export type Build431Provider="VERCEL"|"CLOUDFLARE"|"ORIGINAL_HOST";
export type Build431SourceState=
 |"ACTIVE_V12_SIGNED"
 |"HOLD_ORIGINAL_HOST_RESTART_SIGNER_AND_HTTPS_RELAY_REQUIRED"
 |"HOLD_CLOUDFLARE_PUBLIC_BRIDGE_AND_SECRET_AUTHORITY_REQUIRED"
 |"HOLD_CLOUDFLARE_SECRET_AUTHORITY_REQUIRED"
 |"HOLD_V12_SIGNER_NOT_VERIFIED";

export const BUILD_431_PROVIDER_MATRIX:Record<Build426AppId,{
 provider:Build431Provider;
 expectedRole:"REQUIRED_SIGNED"|"PROVIDER_ENROLLMENT_TARGET";
 explicitHold:Build431SourceState|null;
 restartRequiredAfterCodeUpdate:boolean;
 authorityBoundary:string;
}>={
 "ai-data-platform":{provider:"VERCEL",expectedRole:"REQUIRED_SIGNED",explicitHold:null,restartRequiredAfterCodeUpdate:false,authorityBoundary:"Vercel production signer is service-owned; self-signing is not an independent outside witness."},
 "yw":{provider:"VERCEL",expectedRole:"REQUIRED_SIGNED",explicitHold:null,restartRequiredAfterCodeUpdate:false,authorityBoundary:"Existing production Ed25519 signer and protocol 1.2 challenge endpoint remain required."},
 "icamp":{provider:"VERCEL",expectedRole:"REQUIRED_SIGNED",explicitHold:null,restartRequiredAfterCodeUpdate:false,authorityBoundary:"Existing production Ed25519 signer and protocol 1.2 challenge endpoint remain required."},
 "rosevear-ai-hub":{provider:"ORIGINAL_HOST",expectedRole:"PROVIDER_ENROLLMENT_TARGET",explicitHold:"HOLD_ORIGINAL_HOST_RESTART_SIGNER_AND_HTTPS_RELAY_REQUIRED",restartRequiredAfterCodeUpdate:true,authorityBoundary:"Original Windows host must load the signer and HTTPS relay locally; repository code alone cannot prove the running host changed."},
 "rosevear-comms-hub":{provider:"CLOUDFLARE",expectedRole:"PROVIDER_ENROLLMENT_TARGET",explicitHold:"HOLD_CLOUDFLARE_PUBLIC_BRIDGE_AND_SECRET_AUTHORITY_REQUIRED",restartRequiredAfterCodeUpdate:false,authorityBoundary:"Public Cloudflare route plus provider-side secret custody are required; loopback-only source code is not public fleet telemetry."},
 "devilndove":{provider:"CLOUDFLARE",expectedRole:"PROVIDER_ENROLLMENT_TARGET",explicitHold:"HOLD_CLOUDFLARE_SECRET_AUTHORITY_REQUIRED",restartRequiredAfterCodeUpdate:false,authorityBoundary:"Cloudflare Pages Function signer requires provider-side private-key custody and read token."},
 "rosiedazzlers":{provider:"CLOUDFLARE",expectedRole:"PROVIDER_ENROLLMENT_TARGET",explicitHold:"HOLD_CLOUDFLARE_SECRET_AUTHORITY_REQUIRED",restartRequiredAfterCodeUpdate:false,authorityBoundary:"Cloudflare Pages Function signer requires provider-side private-key custody and read token."}
};

export function build431SourceState(appId:Build426AppId,input:{challengeVerified:boolean;protocolVersion:string|null;receiptId:string|null}):Build431SourceState{
 if(input.challengeVerified&&input.protocolVersion==="1.2"&&input.receiptId)return "ACTIVE_V12_SIGNED";
 return BUILD_431_PROVIDER_MATRIX[appId].explicitHold??"HOLD_V12_SIGNER_NOT_VERIFIED";
}
export function build431Coverage(input:{verifiedSources:number;classifiedSources:number}){
 return {
  verifiedSources:input.verifiedSources,
  classifiedSources:input.classifiedSources,
  allSources:7,
  signedCoveragePercent:Math.round(input.verifiedSources/7*1000)/10,
  classificationCoveragePercent:Math.round(input.classifiedSources/7*1000)/10,
  sevenSourceSignedLive:input.verifiedSources===7
 };
}
