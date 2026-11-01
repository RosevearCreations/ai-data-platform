import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 266 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [lib,contract,page,client,nav,tools,doc,status,queue]=await Promise.all([
  source("lib/security-access-review.ts"),
  source("lib/security-access-review-contract.ts"),
  source("app/security-access-review/page.tsx"),
  source("app/security-access-review/SecurityAccessReview.tsx"),
  source("lib/application-navigation.ts"),
  source("lib/module-operator-tools.ts"),
  source("../../docs/BUILD_266_SECURITY_WORKSPACE_ACCESS_REVIEW.md"),
  source("../../docs/integration/ql266-ai-data-platform-build266-review.json"),
  source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["workspace_members","workspace_connector_audit","integration_delivery_events","workspace_operational_outcomes","unusedGrants"])ensure(lib.includes(token),"security source "+token);
 ensure(contract.includes("SecurityAccessReviewModel")&&contract.includes("AccessReviewMember"),"client-safe security contract");
 ensure(page.includes("Build 266")&&page.includes("Advisory only."),"page advisory boundary");
 ensure(client.includes("Effective capabilities")&&client.includes("Last reviewed privileged activity")&&client.includes("Unused:"),"security review UI");
 ensure(nav.includes('href: "/security-access-review"'),"navigation");
 ensure(tools.includes('href: "/security-access-review"'),"operator shortcut");
 ensure(doc.includes("ordinary workspace RLS policy remains unchanged")&&doc.includes("UNDER_REVIEW")&&doc.includes("Build 267"),"documentation");
 const parsed=JSON.parse(status);
 ensure(parsed.build===266,"status build");
 ensure(parsed.security_review.recommendations_advisory_only===true,"advisory recommendations");
 ensure(parsed.security_review.automatic_access_changes===false,"no automatic access changes");
 ensure(parsed.security_review.workspace_rls_changed===false,"RLS unchanged");
 ensure(parsed.connection_state==="DISCONNECTED","QL-266 disconnected");
 ensure(parsed.new_ql266_test_started===false,"no QL-266 restart");
 ensure(parsed.next_build===267,"next build");
 ensure(queue.includes("Build 267 — Retention, Archive & Storage Governance Center"),"queue Build 267");
 console.log("Build 266 Security & Workspace Access verification passed.");
}
void main();
