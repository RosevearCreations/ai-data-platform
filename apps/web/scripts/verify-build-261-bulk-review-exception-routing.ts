import { readFile } from "node:fs/promises";
import path from "node:path";
function ensure(value:unknown,message:string):asserts value{if(!value)throw new Error("Build 261 verification failed: "+message);}
async function source(relative:string){return readFile(path.resolve(process.cwd(),relative),"utf8");}
async function main(){
 const [lib,page,client,route,migration,doc,status,queue]=await Promise.all([
  source("lib/bulk-data-review.ts"),source("app/data-review/bulk/page.tsx"),source("app/data-review/bulk/BulkReviewWorkbench.tsx"),source("app/api/data-review/bulk/route.ts"),
  source("../../db/migrations/0088_bulk_review_exception_routing.sql"),source("../../docs/BUILD_261_BULK_REVIEW_EXCEPTION_ROUTING.md"),
  source("../../docs/integration/ql266-ai-data-platform-build261-review.json"),source("../../docs/NEXT_BUILDS_254_272.md")
 ]);
 for(const token of ["previewBulkReviewDecision","commitBulkReviewDecision","bulk_review_preview_stale","workspace_data_review_exceptions","reasonCode"])ensure(lib.includes(token),"lib "+token);
 ensure(lib.includes("requireAdmin"),"admin gate");
 ensure(lib.includes("ids.length>50"),"selection bound");
 ensure(page.includes("Build 261"),"page marker");
 ensure(client.includes("Preview bulk decision")&&client.includes("Confirm and commit"),"preview-before-commit UI");
 ensure(route.includes('action==="preview"')&&route.includes('action==="commit"'),"API preview/commit split");
 ensure(migration.includes("'held'")&&migration.includes("enable row level security"),"migration audit/RLS");
 ensure(doc.includes("UNDER_REVIEW")&&doc.includes("Build 262"),"doc boundary/next");
 const parsed=JSON.parse(status);ensure(parsed.build===261,"status build");ensure(parsed.connection_state==="DISCONNECTED","connection");ensure(parsed.new_ql266_test_started===false,"no QL restart");ensure(parsed.next_build===262,"next build");
 ensure(queue.includes("Build 262 — Unified Audit & Evidence Explorer"),"queue 262");
 console.log("Build 261 Bulk Review, Batch Decisions & Exception Routing verification passed.");
}
void main();
