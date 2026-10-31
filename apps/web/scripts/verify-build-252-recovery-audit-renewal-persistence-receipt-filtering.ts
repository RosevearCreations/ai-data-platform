import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const a=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"repair-252-a",createdAt:1_800_000_000_000,requestedPresetId:"legacy-a",recoveredPresetId:"all",reason:"Recovered legacy audit preset."
  });
  const b=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"repair-252-b",createdAt:1_800_000_001_000,requestedPresetId:"legacy-b",recoveredPresetId:"recent-7d",reason:"Recovered newer audit preset."
  });
  const audit=prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
    prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],a),b
  );
  ensure(audit.length===2&&audit[0]?.auditId==="repair-252-b","recovery audit newest first");

  ensure(sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h")==="recent-24h","renewal persistence valid");
  ensure(sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all","renewal persistence fallback");
  ensure(INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("renewal-recovery"),"renewal persistence storage");

  const now=1_800_000_000_000;
  const rows:Parameters<typeof filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"receipt-recent",createdAt:now-3_600_000,requestedPresetId:"a",recoveredPresetId:"all",reason:"Recent"},
    {version:1,auditId:"receipt-week",createdAt:now-3*86_400_000,requestedPresetId:"b",recoveredPresetId:"recent-7d",reason:"Week"},
    {version:1,auditId:"receipt-old",createdAt:now-9*86_400_000,requestedPresetId:"c",recoveredPresetId:"all",reason:"Old"}
  ];
  ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(rows,"24h",now).length===1,"receipt filter 24h");
  ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(rows,"7d",now).length===2,"receipt filter 7d");
  ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(rows,"all",now).length===3,"receipt filter all");

  const [shell,panels,css,statusPage,pkg,statusRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/globals.css"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build252-review.json"),
    source("../../../docs/BUILD_252_RECOVERY_AUDIT_RENEWAL_PERSISTENCE_RECEIPT_FILTERING.md")
  ]);

  ensure(shell.includes("Build 252 · Operations Command"),"Build 252 shell");
  ensure(shell.includes("Build 251 · Operations Command"),"Build 251 shell compatibility");
  for(const token of ["OperationsHealthSummary","OperationsSegmentedView","OperationsWorkflowTimeline","OperationsInspectorHandoffCard"]) ensure(panels.includes(token),"panel "+token);
  ensure(css.includes("Build 252 — health summaries, segmented views, responsive workflow timelines and inspector handoff cards"),"Build 252 styles");
  for(const token of ["Delivery health","System Status segments","Delivery review workflow","Configuration review","Exception review","QL-266 owner boundary"]) ensure(statusPage.includes(token),"System Status "+token);
  ensure(statusPage.includes("configuredCount")&&statusPage.includes("needsConfigCount")&&statusPage.includes("acceptedEventRows")&&statusPage.includes("rejectedEvents"),"real health and workflow data");
  ensure(statusPage.includes('id="build250-ql266"'),"QL-266 evidence anchor compatibility");
  ensure(pkg.includes("verify-build-252-recovery-audit-renewal-persistence-receipt-filtering.ts"),"registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===252,"build");
  ensure(status.source_A_sha==="185811ea69bd99efda68d07e0a06105c3dbaf1a2","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41214628086","source CI run");
  ensure(status.source_ci_conclusion==="success","source CI");
  ensure(status.recovery_scope.recovery_audit===true,"recovery audit");
  ensure(status.recovery_scope.renewal_persistence===true,"renewal persistence");
  ensure(status.recovery_scope.receipt_filtering===true,"receipt filtering");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 review boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");

  const lower=doc.toLowerCase();
  for(const token of ["recovery audit","renewal persistence","receipt filtering","under review","health summaries","segmented views","workflow timelines","inspector handoff cards","disconnected"]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 252 recovery audit, renewal persistence, receipt filtering and Operations Command health/segment/workflow/handoff verification passed; QL-266 remains under review.");
}
void main();
