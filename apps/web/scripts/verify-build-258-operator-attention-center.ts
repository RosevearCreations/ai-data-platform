import { readFile } from "node:fs/promises";

import {
  OPERATOR_ATTENTION_CATEGORIES,
  OPERATOR_ATTENTION_SEVERITIES,
  isStaleOperatorApproval,
  normalizeOperatorAttentionFilters,
  operatorAttentionAgeDays
} from "../lib/operator-attention";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  ensure(
    OPERATOR_ATTENTION_CATEGORIES.join(",") ===
      "all,governance,collection,connectors,review,approval,integration,retention,corrective",
    "attention categories"
  );
  ensure(
    OPERATOR_ATTENTION_SEVERITIES.join(",") === "all,critical,attention,info",
    "attention severities"
  );

  const filters=normalizeOperatorAttentionFilters({
    category:"integration",
    severity:"critical",
    workspace:" workspace-1 ",
    query:" Delivery Error "
  });
  ensure(filters.category==="integration"&&filters.severity==="critical","valid filters");
  ensure(filters.workspace==="workspace-1"&&filters.query==="delivery error","bounded filter cleanup");
  const safe=normalizeOperatorAttentionFilters({category:"admin",severity:"hidden"});
  ensure(safe.category==="all"&&safe.severity==="all","invalid filters fail safe");

  const now=new Date("2026-11-01T12:00:00.000Z");
  ensure(operatorAttentionAgeDays("2026-10-18T12:00:00.000Z",now)===14,"attention age");
  ensure(isStaleOperatorApproval("2026-10-18T12:00:00.000Z",now)===true,"14-day stale approval");
  ensure(isStaleOperatorApproval("2026-10-19T12:00:00.000Z",now)===false,"fresh approval");

  const [attention,page,shell,home,nav,help,css,pkg,statusRaw,doc,queue]=await Promise.all([
    source("../lib/operator-attention.ts"),
    source("../app/attention/page.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/page.tsx"),
    source("../lib/application-navigation.ts"),
    source("../app/help/help-content.ts"),
    source("../app/globals.css"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build258-review.json"),
    source("../../../docs/BUILD_258_OPERATOR_ATTENTION_CENTER.md"),
    source("../../../docs/NEXT_BUILDS_254_272.md")
  ]);

  for(const token of [
    "buildCommandCenterHome",
    "listCollectionRunConsoleForUser",
    "listConnectorOverviewForUser",
    "listDataReviewWorkbenchForUser",
    "listApprovedDatasetPublishingForUser",
    "listIntegrationDeliveryOverviewForUser",
    "listRetentionOverviewForUser",
    "listReconciliationExceptionTriageForUser"
  ]) ensure(attention.includes(token),"authorized attention source "+token);

  ensure(attention.includes("STALE_APPROVAL_DAYS = 14"),"stale approval threshold");
  ensure(attention.includes(".slice(0, 100)"),"bounded attention queue");
  ensure(!attention.includes("insert into")&&!attention.includes("update app.")&&!attention.includes("delete from"),"attention model is read-only");
  ensure(page.includes("Operator Attention Center"),"Attention Center page");
  ensure(page.includes("Filter follow-up queue"),"exception inbox filters");
  ensure(page.includes("Items disappear only when their underlying measured condition changes"),"source-derived queue semantics");
  ensure(page.includes('destination="/attention"'),"Build 257 saved filters");
  ensure(shell.includes("Build 258 · Operations Command"),"Build 258 shell marker");
  ensure(shell.includes("Build 257 · Operations Command"),"Build 257 compatibility marker");
  ensure(shell.includes('href="/attention">Attention</Link>'),"Attention topbar link");
  ensure(home.includes('href="/attention">Open full Attention Center</Link>'),"Operator Home handoff");
  ensure(nav.includes('href: "/attention"')&&nav.includes('label: "Attention Center"'),"Attention navigation");
  ensure(help.includes('"operator-attention-center": {'),"Attention help");
  ensure(css.includes("Build 258 — Operator Attention Center, Exception Inbox & Follow-Up Queue"),"Build 258 styles");
  ensure(pkg.includes("verify-build-258-operator-attention-center.ts"),"Build 258 verifier registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===258,"build");
  ensure(status.source_A_sha==="a1abb5ac19cfe507620d1f9b374dc7b94128b92c","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41252818880","source CI");
  ensure(status.source_ci_conclusion==="success","source CI conclusion");
  ensure(status.attention_center.dedicated_exception_inbox===true&&status.attention_center.follow_up_queue===true,"attention center scope");
  ensure(status.attention_center.second_task_database===false&&status.attention_center.cosmetic_acknowledgement===false,"source-derived only");
  ensure(status.attention_center.stale_approval_days===14&&status.attention_center.max_items===100,"bounded attention policy");
  ensure(status.authorization.existing_user_scoped_read_models===true&&status.authorization.rls_preserved===true,"authorization");
  ensure(status.authorization.mutation_from_attention_center===false,"read-only attention surface");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");
  ensure(status.next_build===259,"next build");

  const lower=doc.toLowerCase();
  for(const token of [
    "attention sources",
    "priority model",
    "exception inbox filters",
    "follow-up semantics",
    "stale approvals",
    "under_review",
    "disconnected",
    "build 259"
  ]) ensure(lower.includes(token),"doc "+token);

  ensure(queue.includes("Build 258 — Operator Attention Center, Exception Inbox & Follow-Up Queue"),"queue Build 258");
  ensure(queue.includes("Build 259 — Data Quality Workbench, Validation Rules & Duplicate Detection"),"queue Build 259");

  console.log("Build 258 Operator Attention Center verification passed; the exception inbox remains source-derived/read-only and QL-266 remains under review.");
}
void main();
