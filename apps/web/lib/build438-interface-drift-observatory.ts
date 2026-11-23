export const BUILD_438=438 as const;
export const BUILD_438_SCHEMA="rosevear.ai-data-platform.build438-interface-drift-observatory.v1" as const;

export type Build438DriftState=
 |"NO_DRIFT"
 |"REVISION_INSPECTION_REQUIRED"
 |"ADDITIVE_NON_BREAKING"
 |"REVIEW_SCHEMA_DRIFT"
 |"HOLD_REQUIRED_CAPABILITY_REMOVED"
 |"HOLD_REQUIRED_ENDPOINT_REMOVED"
 |"HOLD_AUTHORITY_BOUNDARY_CHANGED"
 |"OBSERVED_SURFACE_UNKNOWN";

export type Build438Profile={
 appId:string;repository:string;buildLabel:string;mainCommit:string;
 schemas:readonly string[];
 requiredCapabilities:readonly string[];
 requiredEndpoints:readonly string[];
 optionalEndpoints:readonly string[];
 authorityBoundary:string;
};

export const BUILD_438_PROFILES:readonly Build438Profile[]=[
 {appId:"ai-data-platform",repository:"RosevearCreations/ai-data-platform",buildLabel:"438",mainCommit:"SELF_AT_RUNTIME",schemas:["rosevear.master-shell.event.v1@1.0.0","rosevear.ai-data-platform.build438-interface-drift-observatory.v1"],requiredCapabilities:["validation","evidence","release-coordination"],requiredEndpoints:["/api/contract-compatibility","/api/interface-drift-observatory"],optionalEndpoints:["/api/peer-release-ledger","/api/branch-reconciliation"],authorityBoundary:"validation-evidence-and-intelligence"},
 {appId:"rosevear-comms-hub",repository:"RosevearCreations/rosevear-comms-hub",buildLabel:"QL-487",mainCommit:"9aadb43bf517ec90ecaa871f015d446cc1873568",schemas:["rosevear-master-shell-seven-apps.v1","rosevear.sysop.telemetry.v1.2"],requiredCapabilities:["communications-authority","operator-control","signed-telemetry"],requiredEndpoints:["/internal/rosevear/sysop/telemetry/v1"],optionalEndpoints:[],authorityBoundary:"communications-and-operator-control"},
 {appId:"rosevear-ai-hub",repository:"RosevearCreations/rosevear-ai-hub",buildLabel:"381",mainCommit:"40c5d5727234dad1f494c976f007774e2ac742c3",schemas:["rosevear-master-shell-seven-apps.v1","rosevear.sysop.telemetry.v1.2"],requiredCapabilities:["original-host-relay","local-automation-authority","signed-telemetry"],requiredEndpoints:["/internal/rosevear/sysop/build432/challenge/rosevear-ai-hub","/internal/rosevear/sysop/build432/intake"],optionalEndpoints:[],authorityBoundary:"original-windows-physical-automation"},
 {appId:"icamp",repository:"RosevearCreations/iCamp",buildLabel:"273",mainCommit:"13884dc708b83f4f1f3fde0b00e0c86aeb9bec34",schemas:["rosevear-master-shell-seven-apps.v1","rosevear.sysop.telemetry.v1.2"],requiredCapabilities:["tenant-isolation","campground-authority","signed-telemetry"],requiredEndpoints:["/api/rosevear/sysop/telemetry/v1"],optionalEndpoints:[],authorityBoundary:"campground-product-and-tenant-authority"},
 {appId:"yw",repository:"RosevearCreations/yw",buildLabel:"591",mainCommit:"0984b644aa9c5072cd2b0c1bb24cb165740ea0fe",schemas:["rosevear-master-shell-seven-apps.v1","rosevear.sysop.telemetry.v1.2"],requiredCapabilities:["tenant-isolation","field-service-authority","signed-telemetry"],requiredEndpoints:["/api/rosevear/sysop/telemetry/v1"],optionalEndpoints:[],authorityBoundary:"field-service-product-and-tenant-authority"},
 {appId:"devilndove",repository:"RosevearCreations/devilndove-site",buildLabel:"751",mainCommit:"4ccd689796a165c1f1e41c5cbe768f04cd6f2894",schemas:["rosevear-master-shell-seven-apps.v1","rosevear.sysop.telemetry.v1.2"],requiredCapabilities:["business-authority","customer-care","signed-telemetry"],requiredEndpoints:["/internal/rosevear/sysop/telemetry/v1"],optionalEndpoints:[],authorityBoundary:"owned-business-commerce-and-customer-care"},
 {appId:"rosiedazzlers",repository:"RosevearCreations/rosiedazzlers",buildLabel:"921",mainCommit:"c33b7a387fc637a22ad27413dd50613991d2ca93",schemas:["rosevear-master-shell-seven-apps.v1","rosevear.sysop.telemetry.v1.2"],requiredCapabilities:["business-authority","detailing-operations","signed-telemetry"],requiredEndpoints:["/internal/rosevear/sysop/telemetry/v1"],optionalEndpoints:[],authorityBoundary:"owned-business-detailing-and-customer-authority"}
] as const;

function missing(required:readonly string[],observed:readonly string[]){return required.filter(x=>!observed.includes(x));}
function added(expected:readonly string[],observed:readonly string[]){return observed.filter(x=>!expected.includes(x));}

export function classifyBuild438Drift(input:{
 baseline:Build438Profile;
 observedCommit:string|null;
 observedSchemas?:readonly string[]|null;
 observedCapabilities?:readonly string[]|null;
 observedEndpoints?:readonly string[]|null;
 observedAuthorityBoundary?:string|null;
}){
 if(input.observedAuthorityBoundary&&input.observedAuthorityBoundary!==input.baseline.authorityBoundary)return {state:"HOLD_AUTHORITY_BOUNDARY_CHANGED" as Build438DriftState,impact:"CRITICAL",details:["authority_boundary_changed"]};
 const surfacesKnown=Boolean(input.observedSchemas&&input.observedCapabilities&&input.observedEndpoints);
 if(!surfacesKnown){
  if(input.observedCommit&&input.baseline.mainCommit!=="SELF_AT_RUNTIME"&&input.observedCommit!==input.baseline.mainCommit)return {state:"REVISION_INSPECTION_REQUIRED" as Build438DriftState,impact:"MEDIUM",details:["revision_advanced_surface_observation_required"]};
  return {state:"OBSERVED_SURFACE_UNKNOWN" as Build438DriftState,impact:"MEDIUM",details:["interface_surface_not_observed"]};
 }
 const lostCaps=missing(input.baseline.requiredCapabilities,input.observedCapabilities!);
 if(lostCaps.length)return {state:"HOLD_REQUIRED_CAPABILITY_REMOVED" as Build438DriftState,impact:"CRITICAL",details:lostCaps};
 const lostEndpoints=missing(input.baseline.requiredEndpoints,input.observedEndpoints!);
 if(lostEndpoints.length)return {state:"HOLD_REQUIRED_ENDPOINT_REMOVED" as Build438DriftState,impact:"CRITICAL",details:lostEndpoints};
 const schemaMissing=missing(input.baseline.schemas,input.observedSchemas!);
 if(schemaMissing.length)return {state:"REVIEW_SCHEMA_DRIFT" as Build438DriftState,impact:"HIGH",details:schemaMissing};
 const additions=[...added(input.baseline.schemas,input.observedSchemas!),...added(input.baseline.requiredCapabilities,input.observedCapabilities!),...added([...input.baseline.requiredEndpoints,...input.baseline.optionalEndpoints],input.observedEndpoints!)];
 if(additions.length)return {state:"ADDITIVE_NON_BREAKING" as Build438DriftState,impact:"LOW",details:additions};
 return {state:"NO_DRIFT" as Build438DriftState,impact:"NONE",details:[]};
}

export function summarizeBuild438(rows:Array<{state:Build438DriftState}>){
 const holds=rows.filter(x=>x.state.startsWith("HOLD_")).length;
 const review=rows.filter(x=>x.state==="REVIEW_SCHEMA_DRIFT"||x.state==="REVISION_INSPECTION_REQUIRED"||x.state==="OBSERVED_SURFACE_UNKNOWN").length;
 const additive=rows.filter(x=>x.state==="ADDITIVE_NON_BREAKING").length;
 return {holds,review,additive,state:holds?"HOLD_BREAKING_INTERFACE_DRIFT":review?"INTERFACE_INSPECTION_REQUIRED":"INTERFACES_STABLE"};
}
