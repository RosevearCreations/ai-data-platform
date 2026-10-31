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
  ensure(searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"alpha")[0]?.auditId==="repair-alpha","recovery search alpha");
  ensure(searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"recent-7d")[0]?.auditId==="repair-beta","recovery search preset");
  ensure(searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"").length===2,"recovery blank search");

  const first=createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"renewal-254-a",createdAt:1_800_000_000_000,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered unsupported renewal preset."
  });
  const second=createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"renewal-254-b",createdAt:1_800_000_001_000,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered renewal preset."
  });
  const renewal=prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
    prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],first),second
  );
  ensure(renewal.length===2&&renewal[0]?.auditId==="renewal-254-b","renewal audit newest first");

  const ids=INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(ids.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","receipt preset ids");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","receipt 24h");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter==="7d","receipt 7d");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query==="recovered","receipt recovery reasons");

  const [shell,panels,css,statusPage,pkg,statusRaw,doc,queue]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/globals.css"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build254-review.json"),
    source("../../../docs/BUILD_254_RECOVERY_SEARCH_RENEWAL_AUDIT_RECEIPT_PRESETS.md"),
    source("../../../docs/NEXT_BUILDS_254_272.md")
  ]);

  ensure(shell.includes("Build 254 · Operations Command"),"Build 254 shell");
  ensure(shell.includes("Build 253 · Operations Command"),"Build 253 shell compatibility");
  for(const token of ["OperationsRiskSummary","OperationsDrillThroughBand","OperationsEvidenceLane","OperationsInspectorResolutionCard"]) ensure(panels.includes(token),"panel "+token);
  ensure(css.includes("Build 254 — risk summaries, drill-through bands, responsive evidence lanes and inspector resolution cards"),"Build 254 styles");
  for(const token of ["Delivery risk summary","Risk drill-through","Delivery evidence lane","Configuration resolution","Delivery exception resolution","QL-266 resolution boundary"]) ensure(statusPage.includes(token),"System Status "+token);
  ensure(statusPage.includes("last24hEvents")&&statusPage.includes("previous24hEvents")&&statusPage.includes("acceptedEventRows")&&statusPage.includes("rejectedEvents")&&statusPage.includes("needsConfigCount"),"real risk and evidence data");
  ensure(statusPage.includes('id="build250-ql266"'),"QL-266 evidence anchor compatibility");
  ensure(pkg.includes("verify-build-254-recovery-search-renewal-audit-receipt-presets.ts"),"registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===254,"build");
  ensure(status.source_A_sha==="a7a65c16483ac42ed8f07b9aa95687a640f73874","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41221813670","source CI run");
  ensure(status.source_ci_conclusion==="success","source CI");
  ensure(status.recovery_scope.recovery_search===true,"recovery search");
  ensure(status.recovery_scope.renewal_audit===true,"renewal audit");
  ensure(status.recovery_scope.receipt_presets===true,"receipt presets");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 review boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");
  ensure(status.roadmap_batch==="254-272","roadmap batch");

  const lower=doc.toLowerCase();
  for(const token of ["recovery search","renewal audit","receipt presets","under review","risk summaries","drill-through bands","evidence lanes","inspector resolution cards","disconnected"]) ensure(lower.includes(token),"doc "+token);

  for(const build of Array.from({length:19},(_,i)=>254+i)) ensure(queue.includes("Build "+build+" —"),"queue Build "+build);
  ensure(queue.includes("Only `dev` and `main`"),"branch policy");
  ensure(queue.includes("Build 255 — Operations Command Consolidation, Screen Cleanup & Component Standardization"),"next build");

  console.log("Build 254 recovery search, renewal audit, receipt presets and Operations Command risk/drill-through/evidence/resolution verification passed; Builds 254-272 are recorded and QL-266 remains under review.");
}
void main();
