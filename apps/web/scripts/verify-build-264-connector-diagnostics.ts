import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 264 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [lib,contract,api,page,client,nav,tools,doc,status,queue]=await Promise.all([
  source("lib/connector-diagnostics.ts"),
  source("lib/connector-diagnostics-contract.ts"),
  source("app/api/connectors/diagnostics/route.ts"),
  source("app/connector-diagnostics/page.tsx"),
  source("app/connector-diagnostics/ConnectorDiagnosticsAssistant.tsx"),
  source("lib/application-navigation.ts"),
  source("lib/module-operator-tools.ts"),
  source("../../docs/BUILD_264_CONNECTOR_DIAGNOSTICS_RECOVERY_ASSISTANT.md"),
  source("../../docs/integration/ql266-ai-data-platform-build264-review.json"),
  source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["normalizeConnectorConfig","validateConnectorSecretReferences","Permission diagnostics","Endpoint validation","Credential reference age","Latest connector evidence"])ensure(lib.includes(token),"diagnostic "+token);
 ensure(lib.includes("executeWorkspaceConnector")&&lib.includes('capability==="export"'),"controlled non-export connection test");
 ensure(api.includes("runConnectorConnectionTest")&&api.includes("buildConnectorDiagnostics"),"diagnostics API");
 ensure(page.includes("Build 264")&&page.includes("Provider-safe diagnostics"),"page safety boundary");
 ensure(client.includes("Run controlled connection test")&&client.includes("Secret values are never displayed"),"operator UI");
 ensure(nav.includes('href: "/connector-diagnostics"'),"navigation");
 ensure(tools.includes('href: "/connector-diagnostics"'),"operator shortcut");
 ensure(doc.includes("Export-only connectors remain manual-review only")&&doc.includes("UNDER_REVIEW")&&doc.includes("Build 265"),"documentation");
 const parsed=JSON.parse(status);
 ensure(parsed.build===264,"status build");
 ensure(parsed.diagnostics.secret_values_exposed===false,"no secret exposure");
 ensure(parsed.diagnostics.automatic_export_test===false,"no automatic export test");
 ensure(parsed.connection_state==="DISCONNECTED","QL-266 disconnected");
 ensure(parsed.new_ql266_test_started===false,"no QL-266 restart");
 ensure(parsed.next_build===265,"next build");
 ensure(queue.includes("Build 265 — Integration Delivery Simulator & Contract Compatibility Center"),"queue Build 265");
 console.log("Build 264 Connector Diagnostics verification passed.");
}
void main();
