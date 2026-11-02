import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 269 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [model,contract,page,api,nav,doc,status,queue]=await Promise.all([
  source("lib/reporting-studio.ts"),
  source("lib/reporting-studio-contract.ts"),
  source("app/reporting/page.tsx"),
  source("app/api/reporting/route.ts"),
  source("lib/application-navigation.ts"),
  source("../../docs/BUILD_269_REPORTING_STUDIO.md"),
  source("../../docs/integration/ql266-ai-data-platform-build269-review.json"),
  source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["collection-success","approval-throughput","exception-rate","integration-outcomes","data-quality","workspace-activity","adoption","retention","provider-usage"])ensure(model.includes(token),"KPI "+token);
 ensure(model.includes("renderReportingCsv"),"CSV renderer");
 ensure(contract.includes("ReportingStudioModel")&&contract.includes("ReportingKpi"),"client-safe contract");
 ensure(page.includes("Reporting Studio, KPI Dashboards & Evidence-Based Exports")&&page.includes("Export CSV")&&page.includes("Export JSON"),"reporting page");
 ensure(api.includes("text/csv")&&api.includes("application/json")&&api.includes("Unauthorized"),"authenticated exports");
 ensure(nav.includes('href: "/reporting"')&&nav.includes("Reporting Studio"),"navigation");
 ensure(doc.includes("same scoped reporting model")&&doc.includes("Build 270"),"documentation");
 const parsed=JSON.parse(status);
 ensure(parsed.build===269,"status build");
 ensure(parsed.reporting_studio.separate_analytics_truth_store===false,"no separate analytics truth store");
 ensure(parsed.reporting_studio.csv_export===true&&parsed.reporting_studio.json_export===true,"exports");
 ensure(parsed.connection_state==="DISCONNECTED","QL-266 disconnected");
 ensure(parsed.new_ql266_test_started===false,"no QL-266 restart");
 ensure(parsed.next_build===270,"next build");
 ensure(queue.includes("Build 270 — Capacity, Cost & Usage Planning"),"queue Build 270");
 console.log("Build 269 Reporting Studio verification passed.");
}
void main();
