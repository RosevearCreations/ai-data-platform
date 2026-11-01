import {
  INTEGRATION_CONTRACTS,
  buildIntegrationPackageFromPersistedBatch,
  integrationConsumerConfiguration,
  validateIntegrationPackage 
} from "./integration-delivery";
import { listIntegrationDeliveryOverviewForUser, loadIntegrationModulePayload } from "./integration-delivery-database";
import type { IntegrationCompatibilityModel, IntegrationSimulatorResult } from "./integration-simulator-contract";

const TARGETS=["rosie-dazzlers","devil-n-dove"] as const;
export async function buildIntegrationCompatibilityCenter(userId:string):Promise<IntegrationCompatibilityModel>{
 const overview=await listIntegrationDeliveryOverviewForUser(userId);
 const results:IntegrationSimulatorResult[]=[];
 for(const entry of overview){
  const canSimulate=entry.workspace.role==="owner"||entry.workspace.role==="admin";
  let payload:Record<string,unknown>|null=null;
  if(canSimulate) payload=await loadIntegrationModulePayload(userId,entry.workspace.id);
  for(const batch of entry.eligibleBatches){
   const config=integrationConsumerConfiguration(batch.target);
   if(!canSimulate||!payload){
    results.push({workspaceId:entry.workspace.id,workspaceName:entry.workspace.name,target:batch.target,batchId:batch.id,status:"unavailable",packageId:"",schemaId:INTEGRATION_CONTRACTS[batch.target].schemaId,adapterContract:INTEGRATION_CONTRACTS[batch.target].adapterContract,contractVersion:1,operationCount:0,actions:[],allowedFields:[...INTEGRATION_CONTRACTS[batch.target].allowedFields],validationCode:"workspace_admin_required",validationErrors:["Owner or admin role is required to build a package preview."],dryRunResult:"Not run",expectedAcknowledgement:["protocol","status","code","target","packageId","replayKey","fingerprint"],configured:config.configured,endpointOrigin:config.endpointOrigin});
    continue;
   }
   try{
    const pkg=buildIntegrationPackageFromPersistedBatch(payload,{target:batch.target,batchId:batch.id});
    const validation=validateIntegrationPackage(pkg,{expectedTarget:batch.target});
    results.push({workspaceId:entry.workspace.id,workspaceName:entry.workspace.name,target:batch.target,batchId:batch.id,status:validation.valid?"compatible":"invalid",packageId:pkg.packageId,schemaId:pkg.schemaId,adapterContract:pkg.adapterContract,contractVersion:pkg.contractVersion,operationCount:pkg.operations.length,actions:[...new Set(pkg.operations.map(op=>op.action))],allowedFields:[...INTEGRATION_CONTRACTS[batch.target].allowedFields],validationCode:validation.code,validationErrors:validation.errors,dryRunResult:validation.valid?"Accepted by local contract validator; no network request or mutation performed.":"Rejected by local contract validator.",expectedAcknowledgement:["protocol","status","code","target","packageId","replayKey","fingerprint"],configured:config.configured,endpointOrigin:config.endpointOrigin});
   }catch(error){
    const contract=INTEGRATION_CONTRACTS[batch.target];
    results.push({workspaceId:entry.workspace.id,workspaceName:entry.workspace.name,target:batch.target,batchId:batch.id,status:"invalid",packageId:"",schemaId:contract.schemaId,adapterContract:contract.adapterContract,contractVersion:1,operationCount:0,actions:[],allowedFields:[...contract.allowedFields],validationCode:"package-build-failed",validationErrors:[error instanceof Error?error.message:"Package preview failed."],dryRunResult:"Package could not be built; nothing was sent.",expectedAcknowledgement:["protocol","status","code","target","packageId","replayKey","fingerprint"],configured:config.configured,endpointOrigin:config.endpointOrigin});
   }
  }
 }
 const configuredTargets=TARGETS.filter(target=>integrationConsumerConfiguration(target).configured).length;
 return {generatedAt:new Date().toISOString(),results,totals:{batches:results.length,compatible:results.filter(r=>r.status==="compatible").length,invalid:results.filter(r=>r.status==="invalid").length,configuredTargets}};
}
