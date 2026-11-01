import {
  normalizeConnectorConfig,
  validateConnectorSecretReferences,
  type ConnectorCapability
} from "@rosevear/ai-data-connector-sdk";
import { executeWorkspaceConnector, listConnectorOverviewForUser } from "./connector-database";
import { getRegisteredConnector } from "./connectors/registry";
import type {
  ConnectorDiagnosticCheck,
  ConnectorDiagnosticItem,
  ConnectorDiagnosticsModel,
  ConnectorDiagnosticState
} from "./connector-diagnostics-contract";

function ageDays(value:Date){
  return Math.max(0,Math.floor((Date.now()-value.getTime())/86_400_000));
}
function stateRank(value:ConnectorDiagnosticState){
  return value==="fail"?3:value==="attention"?2:value==="pass"?1:0;
}
function overall(checks:ConnectorDiagnosticCheck[]):ConnectorDiagnosticState{
  return checks.reduce<ConnectorDiagnosticState>((best,item)=>stateRank(item.state)>stateRank(best)?item.state:best,"not-applicable");
}
function endpointCheck(config:Record<string,unknown>):ConnectorDiagnosticCheck{
  const entries=Object.entries(config).filter(([key,value])=>typeof value==="string"&&/(url|uri|endpoint|host|base)/i.test(key));
  if(!entries.length)return {id:"endpoint",label:"Endpoint validation",state:"not-applicable",detail:"This connector has no endpoint-like configuration fields.",recovery:"No endpoint action is required."};
  const invalid:string[]=[];
  for(const [key,value] of entries){
    try{
      const parsed=new URL(String(value));
      if(parsed.protocol!=="https:"&&parsed.protocol!=="http:")invalid.push(key);
    }catch{invalid.push(key);}
  }
  return invalid.length
    ? {id:"endpoint",label:"Endpoint validation",state:"fail",detail:"Invalid endpoint field(s): "+invalid.join(", ")+".",recovery:"Correct the endpoint value and save the connector configuration again."}
    : {id:"endpoint",label:"Endpoint validation",state:"pass",detail:entries.length+" endpoint-like field(s) parsed successfully.",recovery:"No endpoint recovery is required."};
}
function permissionCheck(input:{role:string;grants:string[];supported:string[]}):ConnectorDiagnosticCheck{
  if(input.role!=="owner"&&input.role!=="admin"){
    return {id:"permissions",label:"Permission diagnostics",state:"attention",detail:"Current workspace role is read-only for connector changes.",recovery:"Ask a workspace owner or admin to apply connector configuration changes."};
  }
  const unsupported=input.grants.filter((grant)=>!input.supported.includes(grant));
  if(unsupported.length){
    return {id:"permissions",label:"Permission diagnostics",state:"fail",detail:"Unsupported granted capability: "+unsupported.join(", ")+".",recovery:"Reconfigure grants so they match the connector manifest."};
  }
  return {id:"permissions",label:"Permission diagnostics",state:"pass",detail:"Workspace role can manage this connector and grants match the manifest.",recovery:"No permission recovery is required."};
}
export async function buildConnectorDiagnostics(userId:string):Promise<ConnectorDiagnosticsModel>{
  const overview=await listConnectorOverviewForUser(userId);
  const manifestByKey=new Map(overview.manifests.map((manifest)=>[manifest.key,manifest]));
  const items:ConnectorDiagnosticItem[]=[];
  for(const entry of overview.workspaces){
    for(const installation of entry.installations){
      const manifest=manifestByKey.get(installation.connectorKey);
      const checks:ConnectorDiagnosticCheck[]=[];
      if(!manifest){
        checks.push({id:"registration",label:"Connector registration",state:"fail",detail:"The installed connector is not present in the registered connector catalog.",recovery:"Restore the connector definition or remove the stale installation."});
        items.push({
          workspaceId:entry.workspace.id,workspaceName:entry.workspace.name,role:entry.workspace.role,
          connectorKey:installation.connectorKey,displayName:installation.connectorKey,enabled:installation.enabled,
          canManage:entry.workspace.role==="owner"||entry.workspace.role==="admin",
          connectorVersion:installation.connectorVersion,manifestVersion:installation.manifestVersion,
          referenceAgeDays:Object.keys(installation.secretRefs).length?ageDays(installation.updatedAt):null,
          endpointSummary:"No registered manifest",latestAuditStatus:"none",latestAuditError:"",latestAuditAt:null,
          checks,overall:"fail",testCapability:null
        });
        continue;
      }
      const compatible=installation.manifestVersion===manifest.manifestVersion&&installation.connectorVersion===manifest.version;
      checks.push(compatible
        ? {id:"version",label:"Version compatibility",state:"pass",detail:"Installed connector and registered manifest versions match.",recovery:"No version recovery is required."}
        : {id:"version",label:"Version compatibility",state:"fail",detail:"Installed connector version does not match the registered manifest.",recovery:"Re-save the connector configuration to the current registered version before enabling it."});
      try{
        normalizeConnectorConfig(manifest,installation.config);
        checks.push({id:"configuration",label:"Configuration completeness",state:"pass",detail:"Required configuration fields are present and valid.",recovery:"No configuration recovery is required."});
      }catch(error){
        checks.push({id:"configuration",label:"Configuration completeness",state:"fail",detail:error instanceof Error?error.message:"Connector configuration is invalid.",recovery:"Review required fields, allowed values and numeric bounds, then save the connector again."});
      }
      try{
        validateConnectorSecretReferences(manifest,installation.secretRefs);
        checks.push({id:"references",label:"Secret reference validation",state:"pass",detail:"Required secret references are structurally valid. Secret values are not exposed.",recovery:"No secret-reference recovery is required."});
      }catch(error){
        checks.push({id:"references",label:"Secret reference validation",state:"fail",detail:error instanceof Error?error.message:"Secret references are incomplete.",recovery:"Add the required environment-backed secret reference. Do not paste secret values into the connector form."});
      }
      const referenceCount=Object.keys(installation.secretRefs).length;
      const referenceAge=referenceCount?ageDays(installation.updatedAt):null;
      checks.push(referenceAge===null
        ? {id:"reference-age",label:"Credential reference age",state:"not-applicable",detail:"This connector does not declare secret references.",recovery:"No credential-reference action is required."}
        : referenceAge>=180
          ? {id:"reference-age",label:"Credential reference age",state:"attention",detail:"Secret references were last configured "+referenceAge+" day(s) ago. This is reference age only; secret values are not read.",recovery:"Confirm the referenced environment credentials are still current and rotate them according to provider policy if required."}
          : {id:"reference-age",label:"Credential reference age",state:"pass",detail:"Secret references were last configured "+referenceAge+" day(s) ago. Secret values are not read.",recovery:"No age-based follow-up is currently indicated."});
      checks.push(permissionCheck({role:entry.workspace.role,grants:installation.grantedCapabilities,supported:manifest.capabilities}));
      checks.push(endpointCheck(installation.config));
      const latest=entry.audit.find((audit)=>audit.connectorKey===installation.connectorKey)??null;
      checks.push(!latest
        ? {id:"latest-run",label:"Latest connector evidence",state:"attention",detail:"No connector execution evidence is available yet.",recovery:"Run a controlled connection test before relying on this connector."}
        : latest.status==="succeeded"
          ? {id:"latest-run",label:"Latest connector evidence",state:"pass",detail:"Latest connector execution completed successfully.",recovery:"No execution recovery is required."}
          : {id:"latest-run",label:"Latest connector evidence",state:latest.status==="failed"?"fail":"attention",detail:"Latest connector execution is "+latest.status+(latest.errorCode?": "+latest.errorCode:"")+".",recovery:"Use the failure explanation below, correct configuration or permissions, then rerun the connection test."});
      const testCapability=(manifest.capabilities.find((capability)=>capability!=="export")??manifest.capabilities[0]??null) as ConnectorCapability|null;
      const endpointSummary=checks.find((check)=>check.id==="endpoint")?.detail??"";
      items.push({
        workspaceId:entry.workspace.id,workspaceName:entry.workspace.name,role:entry.workspace.role,
        connectorKey:installation.connectorKey,displayName:manifest.displayName,enabled:installation.enabled,
        canManage:entry.workspace.role==="owner"||entry.workspace.role==="admin",
        connectorVersion:installation.connectorVersion,manifestVersion:installation.manifestVersion,
        referenceAgeDays:referenceAge,endpointSummary,
        latestAuditStatus:latest?.status??"none",latestAuditError:latest?.errorCode??"",latestAuditAt:latest?.createdAt.toISOString()??null,
        checks,overall:overall(checks),testCapability
      });
    }
  }
  const totals={connectors:items.length,pass:0,attention:0,fail:0,enabled:items.filter((item)=>item.enabled).length};
  for(const item of items){if(item.overall==="pass")totals.pass++;else if(item.overall==="attention")totals.attention++;else if(item.overall==="fail")totals.fail++;}
  return {generatedAt:new Date().toISOString(),items,totals};
}
export async function runConnectorConnectionTest(userId:string,input:{workspaceId:string;connectorKey:string}){
  const definition=getRegisteredConnector(input.connectorKey);
  if(!definition)throw new Error("connector_not_registered");
  const capability=(definition.manifest.capabilities.find((item)=>item!=="export")??definition.manifest.capabilities[0]) as ConnectorCapability|undefined;
  if(!capability)throw new Error("connector_test_capability_unavailable");
  if(capability==="export")throw new Error("connector_export_test_requires_manual_review");
  const result=await executeWorkspaceConnector(userId,{workspaceId:input.workspaceId,connectorKey:input.connectorKey,capability,payload:{records:[],diagnostic:true}});
  return {capability,durationMs:result.durationMs,summary:result.summary};
}
