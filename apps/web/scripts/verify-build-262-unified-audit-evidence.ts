import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 262 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [lib,contract,page,client,nav,tools,doc,status,queue]=await Promise.all([
  source("lib/unified-audit-evidence.ts"),source("lib/unified-audit-evidence-contract.ts"),
  source("app/audit-evidence/page.tsx"),source("app/audit-evidence/UnifiedAuditEvidenceExplorer.tsx"),
  source("lib/application-navigation.ts"),source("lib/module-operator-tools.ts"),
  source("../../docs/BUILD_262_UNIFIED_AUDIT_EVIDENCE_EXPLORER.md"),
  source("../../docs/integration/ql266-ai-data-platform-build262-review.json"),
  source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["workspace_data_review_events","workspace_dataset_publication_events","workspace_publication_delivery_receipts","integration_delivery_events","workspace_operational_outcomes","remote_execution_provider_events"])ensure(lib.includes(token),"evidence source "+token);
 ensure(lib.includes("limit 800"),"bounded recent evidence");
 ensure(contract.includes("collectionRunId")&&contract.includes("recordId"),"filterable identifiers");
 ensure(page.includes("Build 262")&&page.includes("Read-only evidence surface"),"page boundary");
 for(const label of ["Workspace","User","Module","Operation","Result","Source","Consumer","Collection run","Record","From","To"])ensure(client.includes(label),"filter "+label);
 ensure(client.includes("JSON.stringify(item.details"),"details search/display");
 ensure(nav.includes('href: "/audit-evidence"'),"navigation");
 ensure(tools.includes('href: "/audit-evidence"'),"operator shortcut");
 ensure(doc.includes("UNDER_REVIEW")&&doc.includes("Build 263"),"doc QL boundary/next");
 const parsed=JSON.parse(status);ensure(parsed.build===262,"status build");ensure(parsed.connection_state==="DISCONNECTED","connection");ensure(parsed.new_ql266_test_started===false,"no QL restart");ensure(parsed.next_build===263,"next build");
 ensure(queue.includes("Build 263 — System Health, Observability & Reliability Dashboard"),"queue 263");
 console.log("Build 262 Unified Audit & Evidence Explorer verification passed.");
}
void main();
