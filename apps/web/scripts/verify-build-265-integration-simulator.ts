import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 265 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [lib,contract,page,client,nav,tools,doc,status,queue]=await Promise.all([
  source("lib/integration-simulator.ts"),
  source("lib/integration-simulator-contract.ts"),
  source("app/integration-simulator/page.tsx"),
  source("app/integration-simulator/IntegrationCompatibilityCenter.tsx"),
  source("lib/application-navigation.ts"),
  source("lib/module-operator-tools.ts"),
  source("../../docs/BUILD_265_INTEGRATION_DELIVERY_SIMULATOR.md"),
  source("../../docs/integration/ql266-ai-data-platform-build265-review.json"),
  source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["buildIntegrationPackageFromPersistedBatch","validateIntegrationPackage","integrationConsumerConfiguration","expectedAcknowledgement"])ensure(lib.includes(token),"simulator source "+token);
 ensure(contract.includes("IntegrationCompatibilityModel")&&contract.includes("IntegrationSimulatorResult"),"client-safe simulator contract");
 ensure(page.includes("Build 265")&&page.includes("Simulation only."),"page simulation boundary");
 ensure(client.includes("Dry-run result")&&client.includes("Expected acknowledgement")&&client.includes("Target capabilities"),"compatibility UI");
 ensure(nav.includes('href: "/integration-simulator"'),"navigation");
 ensure(tools.includes('href: "/integration-simulator"'),"operator shortcut");
 ensure(doc.includes("send a network request")&&doc.includes("UNDER_REVIEW")&&doc.includes("Build 266"),"documentation");
 const parsed=JSON.parse(status);
 ensure(parsed.build===265,"status build");
 ensure(parsed.simulator.network_request===false,"no network request");
 ensure(parsed.simulator.consumer_receipt_write===false,"no receipt write");
 ensure(parsed.simulator.downstream_mutation===false,"no mutation");
 ensure(parsed.connection_state==="DISCONNECTED","QL-266 disconnected");
 ensure(parsed.new_ql266_test_started===false,"no QL-266 restart");
 ensure(parsed.next_build===266,"next build");
 ensure(queue.includes("Build 266 — Security, Workspace Access & Least-Privilege Review"),"queue Build 266");
 console.log("Build 265 Integration Delivery Simulator verification passed.");
}
void main();
