import type {Build426AppId} from "./master-seven-source-live-enrollment";

export const BUILD_429=429 as const;
export const BUILD_429_SCHEMA="rosevear.ai-data-platform.build429-seven-source-continuous-health.v1" as const;

export type Build429Provider="VERCEL"|"CLOUDFLARE"|"ORIGINAL_HOST";
export type Build429HealthState=
 |"ACTIVE_SIGNED_FRESH"
 |"HOLD_AIDP_SELF_SIGNER_PROVIDER_WRITE_BLOCKED"
 |"HOLD_ORIGINAL_HOST_SIGNER_AND_HTTPS_RELAY_REQUIRED"
 |"HOLD_CLOUDFLARE_PUBLIC_TELEMETRY_BRIDGE_AND_SECRET_AUTHORITY_REQUIRED"
 |"HOLD_CLOUDFLARE_SECRET_AUTHORITY_NOT_CONNECTED"
 |"HOLD_UNVERIFIED";

export const BUILD_429_SOURCE_CATALOG:Record<Build426AppId,{
 displayName:string;
 owner:string;
 environment:"production";
 provider:Build429Provider;
 sourceRouteImplemented:boolean;
 reviewedCommit:string|null;
 expectedCadenceSeconds:number|null;
 supportPath:string;
 dependencies:readonly string[];
 proposedGoal:string;
 explicitHold:Build429HealthState|null;
}>={
 "ai-data-platform":{
  displayName:"AI Data Platform",owner:"AI Data Platform",environment:"production",provider:"VERCEL",sourceRouteImplemented:true,reviewedCommit:null,expectedCadenceSeconds:300,supportPath:"/source-signer-activation",dependencies:["Vercel","Neon"],
  proposedGoal:"Provider-side self signer plus an independently observed outside-in availability witness.",
  explicitHold:"HOLD_AIDP_SELF_SIGNER_PROVIDER_WRITE_BLOCKED"
 },
 "yw":{
  displayName:"Yard Workers",owner:"Yard Workers",environment:"production",provider:"VERCEL",sourceRouteImplemented:true,reviewedCommit:"0681809271428de7aea94ea83ca6a0dc9abacd0c",expectedCadenceSeconds:300,supportPath:"/source-signer-activation",dependencies:["Vercel"],
  proposedGoal:"Repeated signed receipts across ordinary deployment and offline/recovery intervals.",explicitHold:null
 },
 "icamp":{
  displayName:"iCamp",owner:"iCamp",environment:"production",provider:"VERCEL",sourceRouteImplemented:true,reviewedCommit:"2ea77f56bc6c444ef489ac76fff4dd4a9bea5447",expectedCadenceSeconds:300,supportPath:"/source-signer-activation",dependencies:["Vercel"],
  proposedGoal:"Fresh fleet receipts with tenant-scoped support evidence kept separately.",explicitHold:null
 },
 "rosevear-ai-hub":{
  displayName:"Rosevear AI Hub",owner:"Rosevear AI Hub",environment:"production",provider:"ORIGINAL_HOST",sourceRouteImplemented:true,reviewedCommit:"732a6da22f12ffa2e5e2a1ec02da99750af5a9f6",expectedCadenceSeconds:null,supportPath:"/original-host-continuity",dependencies:["Ree Windows host","HTTPS relay","printer PC"],
  proposedGoal:"Original-host signer, secure relay, real workshop receipt, observed expiry and return.",explicitHold:"HOLD_ORIGINAL_HOST_SIGNER_AND_HTTPS_RELAY_REQUIRED"
 },
 "rosevear-comms-hub":{
  displayName:"Rosevear Comms Hub",owner:"Rosevear Comms Hub",environment:"production",provider:"CLOUDFLARE",sourceRouteImplemented:false,reviewedCommit:"dd55fd73ad10287cc8c71df09831a82e40a40950",expectedCadenceSeconds:300,supportPath:"/communications-delivery-operations",dependencies:["Cloudflare Worker","original-host relay"],
  proposedGoal:"Public read-only telemetry bridge plus provider secret custody and an authorized remote peer receipt.",explicitHold:"HOLD_CLOUDFLARE_PUBLIC_TELEMETRY_BRIDGE_AND_SECRET_AUTHORITY_REQUIRED"
 },
 "devilndove":{
  displayName:"Devil n Dove",owner:"Devil n Dove",environment:"production",provider:"CLOUDFLARE",sourceRouteImplemented:true,reviewedCommit:"0df3530618e6f8e5774289985cb414cea002ffe1",expectedCadenceSeconds:300,supportPath:"/source-signer-activation",dependencies:["Cloudflare Pages/Functions"],
  proposedGoal:"Provider secret enrollment, canonical fleet receipt and controlled signer rotation rehearsal.",explicitHold:"HOLD_CLOUDFLARE_SECRET_AUTHORITY_NOT_CONNECTED"
 },
 "rosiedazzlers":{
  displayName:"Rosie Dazzlers",owner:"Rosie Dazzlers",environment:"production",provider:"CLOUDFLARE",sourceRouteImplemented:true,reviewedCommit:"9d85e8b42b0a55a001b09ec2b6118dfcde8a3806",expectedCadenceSeconds:300,supportPath:"/source-signer-activation",dependencies:["Cloudflare Pages/Functions"],
  proposedGoal:"Provider secret enrollment and fresh fleet receipt; publication evidence remains a separate business workflow.",explicitHold:"HOLD_CLOUDFLARE_SECRET_AUTHORITY_NOT_CONNECTED"
 }
};

export const BUILD_429_METRIC_DICTIONARY={
 fleetCoverage:{
  unit:"ratio",numerator:"fresh_verified_sources",denominator:"all_seven_sources",eligiblePopulation:"seven named production sources",
  source:"Build 429 correlated sweep",interval:"per sweep",timeZone:"UTC",revision:"v1",audience:"owner/operator",
  completenessRule:"Always show held sources and reasons; enrolled-source coverage is a separate denominator."
 },
 freshness:{
  unit:"seconds",numerator:"age_since_latest_verified_receipt",denominator:null,eligiblePopulation:"each source",
  source:"signed receipt or explicit observation",interval:"per source",timeZone:"UTC",revision:"v1",audience:"owner/operator",
  completenessRule:"Hosted five-minute cadence is a proposed pilot goal, not a current uptime promise."
 },
 convergenceDelay:{
  unit:"milliseconds",numerator:"master_observation_time_minus_source_receipt_time",denominator:null,eligiblePopulation:"verified receipt observations",
  source:"receipt-bound Build 429 sweep",interval:"per verified observation",timeZone:"UTC",revision:"v1",audience:"owner/operator",
  completenessRule:"No value is reported when the source receipt is absent or the sweep is held."
 }
} as const;

export function build429HealthState(appId:Build426AppId,input:{telemetryVerified:boolean;receiptId:string|null}):Build429HealthState{
 if(input.telemetryVerified&&input.receiptId)return "ACTIVE_SIGNED_FRESH";
 return BUILD_429_SOURCE_CATALOG[appId].explicitHold??"HOLD_UNVERIFIED";
}
export function build429Coverage(input:{verifiedSources:number;classifiedSources:number}){
 return {
  freshVerifiedSources:input.verifiedSources,
  allSources:7,
  classifiedSources:input.classifiedSources,
  fleetCoveragePercent:Math.round(input.verifiedSources/7*1000)/10,
  classificationCoveragePercent:Math.round(input.classifiedSources/7*1000)/10,
  sevenSourceConnected:input.verifiedSources===7
 };
}
