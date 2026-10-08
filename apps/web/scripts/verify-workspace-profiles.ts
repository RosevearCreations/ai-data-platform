import {
  buildWorkspaceProfileConfiguration,
  defaultCapabilities,
  normalizeProfileToken,
  normalizeWorkspaceSlug,
  parseWorkspaceProfileDraft,
  safeCustomProfileDraft
} from "../lib/workspace-profiles";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const defaults=safeCustomProfileDraft("business");
assert(defaults.capabilities.history,"Safe profile must preserve history.");
assert(defaults.capabilities.sourcePolicy,"Safe profile must preserve source governance.");
assert(!defaults.capabilities.remoteExecution,"Remote execution must default off.");
assert(!defaults.capabilities.businessIntegrations,"Business writes must default off.");

const draft=parseWorkspaceProfileDraft({
  name:"Outdoor Equipment Research",
  description:"Example configurable domain.",
  workspaceType:"business",
  normalizationFields:[" Product Name ","price","price","Source URL"],
  reviewDimensions:["identity","pricing","source evidence"],
  capabilities:{
    history:true,sourcePolicy:true,scheduledJobs:true,
    remoteExecution:false,barcodeIntake:false,businessIntegrations:false
  }
});
assert(draft.normalizationFields.join(",")==="product_name,price,source_url","Normalization keys were not stable.");
assert(draft.reviewDimensions.includes("source_evidence"),"Review normalization failed.");

const config=buildWorkspaceProfileConfiguration(draft);
assert(config.reviewPolicy.requireHumanApproval,"Human review must remain required.");
assert(!config.reviewPolicy.allowAutomaticWrites,"Automatic writes must remain disabled.");
assert(config.templates[0].fieldKeys.length===3,"Template did not inherit fields.");
assert(config.provenancePolicy.requireSourceUrl,"Source provenance must be required.");
assert(normalizeProfileToken("  Movie / Media  ")==="movie_media","Profile token normalization failed.");
assert(normalizeWorkspaceSlug("New Domain Workspace")==="new-domain-workspace","Workspace slug normalization failed.");

let immutable=false;
try {
  parseWorkspaceProfileDraft({...draft,workspaceType:"personal"},{fixedWorkspaceType:"business"});
} catch(error) {
  immutable=error instanceof Error && error.message==="workspace_profile_type_immutable";
}
assert(immutable,"Profile workspace class could silently change.");
const personalCaps=defaultCapabilities("personal");
assert(!personalCaps.barcodeIntake,"Generic personal barcode intake must require explicit enablement.");
assert(!personalCaps.remoteExecution,"Generic personal remote execution must require explicit enablement.");

console.log("Build 028 profile defaults, normalization, review, provenance, templates and capability verification passed.");
