import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const repairIds=INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(repairIds.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","repair presets");
  ensure(interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","repair 24h");
  ensure(interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query==="all","repair recovered-all");

  const now=1_800_000_000_000;
  const renewal:InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]=[
    {version:1,auditId:"recent",createdAt:now-3_600_000,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered recent."},
    {version:1,auditId:"week",createdAt:now-3*86_400_000,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered week."},
    {version:1,auditId:"old",createdAt:now-9*86_400_000,requestedPresetId:"retired-c",recoveredPresetId:"all",reason:"Recovered old."}
  ];
  ensure(filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"24h",now).length===1,"renewal 24h");
  ensure(filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"7d",now).length===2,"renewal 7d");
  ensure(filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"all",now).length===3,"renewal all");

  ensure(INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("receipt-recovery-audit"),"receipt persistence namespace");
  ensure(sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d")==="recent-7d","receipt persisted preset");
  ensure(sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all","receipt persistence fallback");

  const [panels,css,statistical,statusPage,pkg,statusRaw]=await Promise.all([
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/globals.css"),
    source("../app/production-learning/page.tsx"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build246-review.json")
  ]);

  for(const token of ["OperationsKpiCard","OperationsFilterToolbar","OperationsDetailInspector","OperationsModuleGrid"]) ensure(panels.includes(token),"panel "+token);
  ensure(css.includes("Build 246 — KPI cards, filter toolbars, detail inspectors and responsive module grids"),"Build 246 UI styles");
  ensure(statistical.includes("OperationsKpiCard")&&statistical.includes("OperationsFilterToolbar"),"Statistical KPI/filter conversion");
  ensure(statusPage.includes("QL-266 under review"),"System Status QL-266 review label");
  ensure(statusPage.includes("OperationsDetailInspector")&&statusPage.includes("OperationsModuleGrid"),"System Status inspector/grid conversion");
  ensure(pkg.includes("verify-build-246-repair-presets-renewal-filtering-receipt-persistence-review.ts"),"registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===246,"build");
  ensure(status.ql266_status==="UNDER_REVIEW","QL-266 review state");
  ensure(status.ql266_active_gate===false,"QL-266 deferred");
  ensure(status.external_test_status==="REVIEW_DEFERRED","gateway review state");
  ensure(status.connection_state==="DISCONNECTED","connection truth");
  ensure(status.previous_hold_label_removed===true,"held label removed");
  ensure(status.source_A_sha==="73842314ae77af0826c6403d851dbdd58ae964fe","source A");


  console.log("Build 246 recovery and Operations Command UI verification passed; QL-266 remains under review.");
}
void main();
