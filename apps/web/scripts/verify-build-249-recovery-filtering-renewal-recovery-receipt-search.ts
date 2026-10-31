import { readFile } from "node:fs/promises";
import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
} from "../lib/navigation-preferences";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const now=1_800_000_000_000;
  const repair:Parameters<typeof filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"repair-recent",createdAt:now-3_600_000,requestedPresetId:"old-a",recoveredPresetId:"all",reason:"Recent repair recovery."},
    {version:1,auditId:"repair-week",createdAt:now-3*86_400_000,requestedPresetId:"old-b",recoveredPresetId:"recent-7d",reason:"Weekly repair recovery."},
    {version:1,auditId:"repair-old",createdAt:now-10*86_400_000,requestedPresetId:"old-c",recoveredPresetId:"all",reason:"Old repair recovery."}
  ];
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"24h",now).length===1,"repair filter 24h");
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"7d",now).length===2,"repair filter 7d");
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"all",now).length===3,"repair filter all");

  const recovered=recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired");
  const valid=recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(recovered.recovered&&recovered.presetId==="all"&&Boolean(recovered.reason),"renewal recovery");
  ensure(!valid.recovered&&valid.presetId==="recent-7d","renewal valid");

  const receipt:Parameters<typeof searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"receipt-alpha",createdAt:now,requestedPresetId:"retired-alpha",recoveredPresetId:"all",reason:"Recovered alpha receipt preset."},
    {version:1,auditId:"receipt-beta",createdAt:now-1000,requestedPresetId:"retired-beta",recoveredPresetId:"recent-7d",reason:"Recovered beta receipt preset."}
  ];
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"alpha")[0]?.auditId==="receipt-alpha","receipt search alpha");
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"recent-7d")[0]?.auditId==="receipt-beta","receipt search recovered preset");
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"").length===2,"receipt blank search");

  const [shell,panels,css,statusPage,pkg,statusRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/globals.css"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build249-review.json"),
    source("../../../docs/BUILD_249_RECOVERY_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH.md")
  ]);

  ensure(shell.includes("Operations Command"),"Operations Command shell");
  for(const token of ["OperationsComparisonCard","OperationsExceptionPivot","OperationsHistoryPanel","OperationsInspectorShortcuts"]) ensure(panels.includes(token),"panel "+token);
  ensure(css.includes("Build 249 — comparison cards, exception pivots, responsive history panels and inspector shortcuts"),"Build 249 styles");
  for(const token of ["Consumer configuration","Delivery outcomes","Exception focus","Recent delivery history","System Status shortcuts"]) ensure(statusPage.includes(token),"System Status "+token);
  ensure(statusPage.includes("successfulEvents")&&statusPage.includes("configuredCount")&&statusPage.includes("needsConfigCount")&&statusPage.includes("rejectedEvents"),"real comparison/history data");
  ensure(pkg.includes("verify-build-249-recovery-filtering-renewal-recovery-receipt-search.ts"),"registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===249,"build");
  ensure(status.source_A_sha==="d2677d2fb0fce8a6aa2aaf76675bcbb55964e79f","source A");
  ensure(status.source_ci_conclusion==="success","source CI");
  ensure(status.recovery_scope.repair_recovery_filtering===true,"repair filtering");
  ensure(status.recovery_scope.renewal_preset_recovery===true,"renewal recovery");
  ensure(status.recovery_scope.receipt_recovery_search===true,"receipt search");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 review boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");

  const lower=doc.toLowerCase();
  for(const token of ["recovery filtering","renewal recovery","receipt search","under review","comparison cards","exception pivots","history panels","inspector shortcuts","disconnected"]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 249 recovery and Operations Command comparison/exception/history/shortcut verification passed; QL-266 remains under review.");
}
void main();
