import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const repair:InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]=[
    {version:1,auditId:"repair-alpha",createdAt:1_800_000_000_000,requestedPresetId:"retired-alpha",recoveredPresetId:"all",reason:"Recovered alpha preset."},
    {version:1,auditId:"repair-beta",createdAt:1_799_999_999_000,requestedPresetId:"retired-beta",recoveredPresetId:"recent-7d",reason:"Recovered beta preset."}
  ];
  ensure(searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"alpha")[0]?.auditId==="repair-alpha","repair search alpha");
  ensure(searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"recent-7d")[0]?.auditId==="repair-beta","repair search preset");
  ensure(searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"").length===2,"repair blank search");

  const first=createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"renewal-1",createdAt:1_800_000_000_000,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered unsupported renewal preset."
  });
  const second=createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"renewal-2",createdAt:1_800_000_001_000,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered renewal preset."
  });
  const renewal=prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
    prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],first),second
  );
  ensure(renewal.length===2&&renewal[0]?.auditId==="renewal-2","renewal recovery audit newest first");

  const ids=INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(ids.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","receipt preset ids");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","receipt 24h");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter==="7d","receipt 7d");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query==="recovered","receipt recovery-reasons");

  const [shell,panels,css,statusPage,pkg,statusRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/globals.css"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build250-review.json"),
    source("../../../docs/BUILD_250_RECOVERY_SEARCH_RENEWAL_AUDIT_RECEIPT_PRESETS.md")
  ]);

  ensure(shell.includes("Build 250 · Operations Command"),"Build 250 shell");
  for(const token of ["OperationsTrendCard","OperationsDrilldownFilters","OperationsEventGroup","OperationsInspectorTaskLinks"]) ensure(panels.includes(token),"panel "+token);
  ensure(css.includes("Build 250 — trend cards, drilldown filters, responsive event groups and inspector task links"),"Build 250 styles");
  for(const token of ["Delivery events · last 24h","Delivery event drilldown","Accepted / non-error events","HTTP exception events","Review tasks"]) ensure(statusPage.includes(token),"System Status "+token);
  ensure(statusPage.includes("last24hEvents")&&statusPage.includes("previous24hEvents")&&statusPage.includes("eventRows")&&statusPage.includes("eventDelta"),"real trend/drilldown data");
  ensure(pkg.includes("verify-build-250-recovery-search-renewal-audit-receipt-presets.ts"),"registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===250,"build");
  ensure(status.source_A_sha==="61b5ee0a479345089df5ddc3043b6b7c2243eb65","source A");
  ensure(status.source_ci_conclusion==="success","source CI");
  ensure(status.recovery_scope.repair_recovery_search===true,"repair search");
  ensure(status.recovery_scope.renewal_recovery_audit===true,"renewal audit");
  ensure(status.recovery_scope.receipt_recovery_presets===true,"receipt presets");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 review boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");

  const lower=doc.toLowerCase();
  for(const token of ["recovery search","renewal audit","receipt presets","under review","trend cards","drilldown filters","event groups","inspector task links","disconnected"]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 250 recovery and Operations Command trend/drilldown/event/task verification passed; QL-266 remains under review.");
}
void main();
