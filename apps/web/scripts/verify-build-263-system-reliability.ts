import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 263 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [lib,contract,page,client,nav,doc,status,queue]=await Promise.all([
  source("lib/system-reliability.ts"),
  source("lib/system-reliability-contract.ts"),
  source("app/system-reliability/page.tsx"),
  source("app/system-reliability/SystemReliabilityDashboard.tsx"),
  source("lib/application-navigation.ts"),
  source("../../docs/BUILD_263_SYSTEM_HEALTH_OBSERVABILITY_RELIABILITY.md"),
  source("../../docs/integration/ql266-ai-data-platform-build263-review.json"),
  source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["select 1 as ok","listCollectionRunConsoleForUser","listConnectorOverviewForUser","listIntegrationDeliveryOverviewForUser","buildOperatorAttentionCenter","listBulkReviewWorkbenchForUser"])ensure(lib.includes(token),"measured source "+token);
 for(const token of ["Application","Database","Collection","Connectors","Integration delivery","Remote execution","Review queues","Recent exceptions"])ensure(lib.includes(token),"health signal "+token);
 ensure(contract.includes("ReliabilityState")&&contract.includes("ReliabilityException"),"dashboard contract");
 ensure(page.includes("Build 263")&&page.includes("Evidence-based status only"),"page evidence boundary");
 ensure(client.includes("Recent reliability exceptions")&&client.includes("Open source evidence"),"operator drill-through");
 ensure(nav.includes('href: "/system-reliability"'),"navigation");
 ensure(doc.includes("No second observability database")&&doc.includes("UNDER_REVIEW")&&doc.includes("Build 264"),"documentation");
 const parsed=JSON.parse(status);
 ensure(parsed.build===263,"status build");
 ensure(parsed.connection_state==="DISCONNECTED","QL-266 disconnected");
 ensure(parsed.new_ql266_test_started===false,"no QL-266 restart");
 ensure(parsed.next_build===264,"next build");
 ensure(queue.includes("Build 264 — Connector Diagnostics, Configuration Validation & Recovery Assistant"),"queue Build 264");
 console.log("Build 263 System Health, Observability & Reliability Dashboard verification passed.");
}
void main();
