import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 267 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [model,contract,page,controls,nav,tools,doc,status,queue]=await Promise.all([
  source("lib/retention-governance.ts"),
  source("lib/retention-governance-contract.ts"),
  source("app/retention/page.tsx"),
  source("app/retention/RetentionControls.tsx"),
  source("lib/application-navigation.ts"),
  source("lib/module-operator-tools.ts"),
  source("../../docs/BUILD_267_RETENTION_ARCHIVE_STORAGE_GOVERNANCE.md"),
  source("../../docs/integration/ql266-ai-data-platform-build267-review.json"),
  source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["oldestAgeDays","archiveEligibleRows","deleteEligibleRows","protectedRows","projectedRowsAfterFullEligibleDelete","boundedDeleteRowsThisRun"])ensure(model.includes(token),"governance model "+token);
 ensure(contract.includes("RetentionGovernanceModel")&&contract.includes("RetentionGovernanceClass"),"client-safe governance contract");
 ensure(page.includes("Build 267")&&page.includes("Impact preview")&&page.includes("Archive candidates")&&page.includes("Protected evidence"),"retention governance page");
 ensure(controls.includes("APPROVE CLEANUP")&&controls.includes("RUN CLEANUP"),"existing explicit cleanup gates preserved");
 ensure(nav.includes("Retention & Archive Governance"),"navigation label");
 ensure(tools.includes("Retention governance"),"operator shortcut");
 ensure(doc.includes("Archive candidates remain preview-only")&&doc.includes("protected remain excluded")&&doc.includes("Build 268"),"documentation");
 const parsed=JSON.parse(status);
 ensure(parsed.build===267,"status build");
 ensure(parsed.retention_governance.archive_preview_only===true,"archive preview only");
 ensure(parsed.retention_governance.protected_evidence_destructive_cleanup===false,"protected evidence safe");
 ensure(parsed.retention_governance.existing_cleanup_approval_gate_preserved===true,"cleanup gate preserved");
 ensure(parsed.connection_state==="DISCONNECTED","QL-266 disconnected");
 ensure(parsed.new_ql266_test_started===false,"no QL-266 restart");
 ensure(parsed.next_build===268,"next build");
 ensure(queue.includes("Build 268 — Workflow Orchestration, Runbook Templates & Guided Operations"),"queue Build 268");
 console.log("Build 267 Retention, Archive & Storage Governance verification passed.");
}
void main();
