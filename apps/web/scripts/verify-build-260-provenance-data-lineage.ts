import { readFile } from "node:fs/promises";
import path from "node:path";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 260 verification failed: " + message);
}
async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}
async function main() {
  const [lineage,page,nav,tools,doc,status,queue] = await Promise.all([
    source("lib/provenance-lineage.ts"),
    source("app/provenance-lineage/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("../../docs/BUILD_260_PROVENANCE_DATA_LINEAGE.md"),
    source("../../docs/integration/ql266-ai-data-platform-build260-review.json"),
    source("../../docs/NEXT_BUILDS_254_272.md")
  ]);
  for (const token of [
    "listDataReviewWorkbenchForUser",
    "listApprovedDatasetPublishingForUser",
    "listPublicationDeliveryBridgeForUser",
    "listCollectionRunConsoleForUser"
  ]) ensure(lineage.includes(token), "reuse " + token);
  ensure(!lineage.includes("insert into") && !lineage.includes("update app.") && !lineage.includes("delete from"), "lineage model is read-only");
  for (const token of ["Source","Capture","Recipe","Collection run","Review","Approval","Approved publication","Integration delivery"]) ensure(lineage.includes(token), "stage " + token);
  ensure(page.includes("Build 260"), "page build marker");
  ensure(page.includes("Provenance & Data Lineage Explorer"), "page title");
  ensure(page.includes("Missing links stay visibly missing") || page.includes("Missing links"), "missing-link truthfulness");
  ensure(nav.includes("/provenance-lineage"), "navigation route");
  ensure(tools.includes("/provenance-lineage"), "operator tools route");
  ensure(doc.includes("read-only") && doc.includes("Build 261"), "documentation boundary and next build");
  const parsed = JSON.parse(status);
  ensure(parsed.build === 260, "status build");
  ensure(parsed.ql266_status === "UNDER_REVIEW", "QL-266 remains under review");
  ensure(parsed.connection_state === "DISCONNECTED", "connection remains disconnected");
  ensure(parsed.new_ql266_test_started === false, "no QL-266 restart");
  ensure(parsed.next_build === 261, "next build");
  ensure(queue.includes("Build 261 — Bulk Review, Batch Decisions & Exception Routing"), "queue Build 261");
  console.log("Build 260 Provenance & Data Lineage Explorer verification passed.");
}
void main();
