export const BUILD_437=437 as const;
export const BUILD_437_SCHEMA="rosevear.ai-data-platform.build437-contract-compatibility.v1" as const;

export type Build437Impact="NONE"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
export type Build437Compatibility=
 |"COMPATIBLE_VERIFIED"
 |"EXPECTED_RELEASE_PENDING_OBSERVATION"
 |"REVIEW_REQUIRED"
 |"HOLD_CONTRACT_BREAK"
 |"HOLD_RELEASE_REGRESSION";

export type Build437PeerRelease={
 appId:string;repository:string;buildLabel:string;mainCommit:string;
 authorityBoundary:string;
 contracts:{id:string;version:string;criticality:Build437Impact}[];
};

export const BUILD_437_RELEASE_SNAPSHOT:readonly Build437PeerRelease[]=[
 {appId:"rosevear-comms-hub",repository:"RosevearCreations/rosevear-comms-hub",buildLabel:"QL-486",mainCommit:"a4659352aa2704361139b4a45b826fea25df7d00",authorityBoundary:"communications-and-operator-control",contracts:[
  {id:"signed-telemetry",version:"1.2",criticality:"CRITICAL"},{id:"master-topology",version:"v1",criticality:"HIGH"},{id:"communications-authority",version:"source-owned",criticality:"CRITICAL"}]},
 {appId:"rosevear-ai-hub",repository:"RosevearCreations/rosevear-ai-hub",buildLabel:"380",mainCommit:"4da442db5b09cf5db9946a843b66413538f32b6d",authorityBoundary:"original-windows-physical-automation",contracts:[
  {id:"signed-telemetry",version:"1.2",criticality:"CRITICAL"},{id:"master-topology",version:"v1",criticality:"HIGH"},{id:"original-host-outbound-relay",version:"build432",criticality:"CRITICAL"}]},
 {appId:"icamp",repository:"RosevearCreations/iCamp",buildLabel:"273",mainCommit:"13884dc708b83f4f1f3fde0b00e0c86aeb9bec34",authorityBoundary:"campground-product-and-tenant-authority",contracts:[
  {id:"signed-telemetry",version:"1.2",criticality:"CRITICAL"},{id:"master-topology",version:"v1",criticality:"HIGH"},{id:"tenant-boundary",version:"source-owned",criticality:"CRITICAL"}]},
 {appId:"yw",repository:"RosevearCreations/yw",buildLabel:"591",mainCommit:"0984b644aa9c5072cd2b0c1bb24cb165740ea0fe",authorityBoundary:"field-service-product-and-tenant-authority",contracts:[
  {id:"signed-telemetry",version:"1.2",criticality:"CRITICAL"},{id:"master-topology",version:"v1",criticality:"HIGH"},{id:"tenant-boundary",version:"source-owned",criticality:"CRITICAL"}]},
 {appId:"devilndove",repository:"RosevearCreations/devilndove-site",buildLabel:"751",mainCommit:"4ccd689796a165c1f1e41c5cbe768f04cd6f2894",authorityBoundary:"owned-business-commerce-and-customer-care",contracts:[
  {id:"signed-telemetry",version:"1.2",criticality:"CRITICAL"},{id:"master-topology",version:"v1",criticality:"HIGH"},{id:"business-authority",version:"source-owned",criticality:"HIGH"}]},
 {appId:"rosiedazzlers",repository:"RosevearCreations/rosiedazzlers",buildLabel:"921",mainCommit:"c33b7a387fc637a22ad27413dd50613991d2ca93",authorityBoundary:"owned-business-detailing-and-customer-authority",contracts:[
  {id:"signed-telemetry",version:"1.2",criticality:"CRITICAL"},{id:"master-topology",version:"v1",criticality:"HIGH"},{id:"business-authority",version:"source-owned",criticality:"HIGH"}]}
] as const;

export function forecastBuild437(input:{
 release:Build437PeerRelease;
 observedCommit:string|null;
 observedContinuity:string|null;
 verified:boolean;
 criticalContractBreak?:boolean;
 authorityBoundaryChanged?:boolean;
}){
 if(input.criticalContractBreak)return {compatibility:"HOLD_CONTRACT_BREAK" as Build437Compatibility,impact:"CRITICAL" as Build437Impact,reason:"critical_contract_break"};
 if(input.observedContinuity==="REGRESSION_HOLD")return {compatibility:"HOLD_RELEASE_REGRESSION" as Build437Compatibility,impact:"CRITICAL" as Build437Impact,reason:"release_regression"};
 if(input.authorityBoundaryChanged)return {compatibility:"REVIEW_REQUIRED" as Build437Compatibility,impact:"CRITICAL" as Build437Impact,reason:"authority_boundary_change"};
 if(input.observedCommit!==input.release.mainCommit)return {compatibility:"EXPECTED_RELEASE_PENDING_OBSERVATION" as Build437Compatibility,impact:"MEDIUM" as Build437Impact,reason:"new_peer_main_not_yet_signed_observed"};
 if(!input.verified)return {compatibility:"REVIEW_REQUIRED" as Build437Compatibility,impact:"HIGH" as Build437Impact,reason:"matching_revision_not_verified"};
 return {compatibility:"COMPATIBLE_VERIFIED" as Build437Compatibility,impact:"LOW" as Build437Impact,reason:"matching_signed_revision_and_contract_baseline"};
}

export function summarizeBuild437(rows:Array<{compatibility:Build437Compatibility;impact:Build437Impact}>){
 const holds=rows.filter(x=>x.compatibility.startsWith("HOLD_")).length;
 const pending=rows.filter(x=>x.compatibility==="EXPECTED_RELEASE_PENDING_OBSERVATION").length;
 const review=rows.filter(x=>x.compatibility==="REVIEW_REQUIRED").length;
 const compatible=rows.filter(x=>x.compatibility==="COMPATIBLE_VERIFIED").length;
 const critical=rows.filter(x=>x.impact==="CRITICAL").length;
 return {holds,pending,review,compatible,critical,state:holds?"HOLD_CONTRACT_RISK":review?"REVIEW_REQUIRED":pending?"PEER_RELEASES_PENDING_OBSERVATION":"COMPATIBLE"};
}
