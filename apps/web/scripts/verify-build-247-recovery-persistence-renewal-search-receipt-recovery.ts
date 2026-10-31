import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  ensure(
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h")==="recent-24h" &&
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recovery-reasons")==="recovery-reasons" &&
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all" &&
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("recovery-audit-repair"),
    "repair preset persistence"
  );

  const renewal:InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]=[
    {version:1,auditId:"renewal-alpha",createdAt:1_800_000_000_000,requestedPresetId:"retired-alpha",recoveredPresetId:"all",reason:"Recovered alpha renewal preset."},
    {version:1,auditId:"renewal-beta",createdAt:1_799_999_999_000,requestedPresetId:"retired-beta",recoveredPresetId:"recent-7d",reason:"Recovered beta renewal preset."}
  ];
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"alpha")[0]?.auditId==="renewal-alpha","renewal search alpha");
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"recent-7d")[0]?.auditId==="renewal-beta","renewal search preset");
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"").length===2,"renewal blank search");

  const repaired=recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-receipt");
  const valid=recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(repaired.recovered&&repaired.presetId==="all"&&Boolean(repaired.reason),"receipt preset recovery");
  ensure(!valid.recovered&&valid.presetId==="recent-7d","receipt valid preset");

  const [shell,panels,css,delivery,pkg,statusRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/globals.css"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build247-review.json"),
    source("../../../docs/BUILD_247_RECOVERY_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_RECOVERY.md")
  ]);

  ensure(shell.includes("Build 247 · Operations Command"),"Build 247 shell");
  for(const token of ["OperationsSearchPanel","OperationsActivitySummary","OperationsStatusGroup","OperationsInspectorWorkflow"]) ensure(panels.includes(token),"panel "+token);
  ensure(css.includes("Build 247 — search panels, activity summaries, responsive status groups and inspector workflows"),"Build 247 styles");
  for(const token of ["Search consumer configuration","Delivery activity","Review state","Consumer review workflow"]) ensure(delivery.includes(token),"System Status "+token);
  ensure(delivery.includes("filteredConsumers")&&delivery.includes("recentEvents")&&delivery.includes("rejectedEvents"),"real System Status data");
  ensure(pkg.includes("verify-build-247-recovery-persistence-renewal-search-receipt-recovery.ts"),"registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===247,"build");
  ensure(status.source_A_sha==="5a0d140a8080f890c90f6eb812ff04fa0a194b13","source A");
  ensure(status.source_ci_conclusion==="success","source CI");
  ensure(status.recovery_scope.repair_preset_persistence===true,"repair persistence");
  ensure(status.recovery_scope.renewal_recovery_search===true,"renewal search");
  ensure(status.recovery_scope.receipt_preset_recovery===true,"receipt recovery");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 review boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");

  const lower=doc.toLowerCase();
  for(const token of ["recovery persistence","renewal search","receipt recovery","under review","search panels","activity summaries","status groups","inspector workflows","disconnected"]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 247 recovery and Operations Command search/activity/status/inspector verification passed; QL-266 remains under review.");
}
void main();
