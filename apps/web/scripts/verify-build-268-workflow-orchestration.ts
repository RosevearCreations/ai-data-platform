import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 268 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [model,contract,page,nav,doc,status,queue]=await Promise.all([
  source("lib/workflow-orchestration.ts"),
  source("lib/workflow-orchestration-contract.ts"),
  source("app/runbooks/page.tsx"),
  source("lib/application-navigation.ts"),
  source("../../docs/BUILD_268_WORKFLOW_ORCHESTRATION_RUNBOOKS.md"),
  source("../../docs/integration/ql266-ai-data-platform-build268-review.json"),
  source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["listCollectionProjectsForUser","listCollectionRunConsoleForUser","listBulkReviewWorkbenchForUser","listApprovedDatasetPublishingForUser","listIntegrationDeliveryOverviewForUser"])ensure(model.includes(token),"orchestration evidence "+token);
 for(const token of ["Collect","Review","Approve","Publish","Deliver"])ensure(model.includes(token),"primary runbook "+token);
 ensure(contract.includes("RunbookStepStatus")&&contract.includes("WorkflowOrchestrationModel"),"client-safe contract");
 ensure(page.includes("Guidance, not automation.")&&page.includes("Build 268"),"guided operations page");
 ensure(nav.includes('href: "/runbooks"')&&nav.includes("Guided Runbooks"),"navigation");
 ensure(doc.includes("auto-approve")&&doc.includes("auto-publish")&&doc.includes("auto-deliver")&&doc.includes("Build 269"),"safety documentation");
 const parsed=JSON.parse(status);
 ensure(parsed.build===268,"status build");
 ensure(parsed.workflow_orchestration.automatic_approval===false,"no automatic approval");
 ensure(parsed.workflow_orchestration.automatic_publication===false,"no automatic publication");
 ensure(parsed.workflow_orchestration.automatic_delivery===false,"no automatic delivery");
 ensure(parsed.workflow_orchestration.existing_safety_gates_preserved===true,"safety gates preserved");
 ensure(parsed.connection_state==="DISCONNECTED","QL-266 disconnected");
 ensure(parsed.new_ql266_test_started===false,"no QL-266 restart");
 ensure(parsed.next_build===269,"next build");
 ensure(queue.includes("Build 269 — Reporting Studio, KPI Dashboards & Evidence-Based Exports"),"queue Build 269");
 console.log("Build 268 Workflow Orchestration verification passed.");
}
void main();
