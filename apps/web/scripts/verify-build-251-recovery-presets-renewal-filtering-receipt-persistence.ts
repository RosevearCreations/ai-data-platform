import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  interfaceRecoveryAuditSearchPresetById,
  parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const recoveryPresetIds=INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset)=>preset.id);
  ensure(recoveryPresetIds.join(",")==="all,initial-load,filter-selection,last-favorite-removed,favorites","recovery preset ids");
  ensure(interfaceRecoveryAuditSearchPresetById("favorites").query==="favorites","recovery favorites preset");
  ensure(interfaceRecoveryAuditSearchPresetById("initial-load").triggerFilter==="initial-load","recovery initial-load preset");

  const now=1_800_000_000_000;
  const renewal:InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[]=[
    {version:1,auditId:"renewal-recent",createdAt:now-3_600_000,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered recent renewal preset."},
    {version:1,auditId:"renewal-week",createdAt:now-(2*86_400_000),requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered weekly renewal preset."},
    {version:1,auditId:"renewal-old",createdAt:now-(8*86_400_000),requestedPresetId:"retired-c",recoveredPresetId:"all",reason:"Recovered old renewal preset."}
  ];
  ensure(filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit(renewal,"24h",now).length===1,"renewal 24h filtering");
  ensure(filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit(renewal,"7d",now).length===2,"renewal 7d filtering");
  ensure(filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit(renewal,"all",now).length===3,"renewal all filtering");

  const receipt:InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]=[
    {version:1,auditId:"receipt-alpha",createdAt:now,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered receipt alpha."},
    {version:1,auditId:"receipt-beta",createdAt:now-1_000,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered receipt beta."}
  ];
  const serialized=serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt);
  const parsed=parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(serialized);
  ensure(parsed.ok&&parsed.audit.entries.length===2,"receipt persistence round trip");
  ensure(INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY.endsWith(":v1"),"receipt persistence storage version");

  const [shell,panels,css,statusPage,pkg,statusRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/globals.css"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build251-review.json"),
    source("../../../docs/BUILD_251_RECOVERY_PRESETS_RENEWAL_FILTERING_RECEIPT_PERSISTENCE.md")
  ]);

  ensure(shell.includes("Build 251 · Operations Command"),"Build 251 shell");
  for(const token of ["OperationsScorecard","OperationsLayeredFilters","OperationsActivityLane","OperationsInspectorCheckpoints"]) ensure(panels.includes(token),"panel "+token);
  ensure(css.includes("Build 251 — scorecards, layered filters, responsive activity lanes and inspector checkpoints"),"Build 251 styles");
  for(const token of ["Consumer readiness","System Status review layers","Accepted delivery activity","Exception delivery activity","Build 251 review checkpoints"]) ensure(statusPage.includes(token),"System Status "+token);
  ensure(statusPage.includes("acceptedEventRows")&&statusPage.includes("rejectedEventRows")&&statusPage.includes("savedViewHref")&&statusPage.includes("eventViewHref"),"real layered status data");
  ensure(pkg.includes("verify-build-251-recovery-presets-renewal-filtering-receipt-persistence.ts"),"registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===251,"build");
  ensure(status.source_A_sha==="067204cebebfac5c36cf3893bbdd8859e5ffb425","source A");
  ensure(status.source_ci_conclusion==="success","source CI");
  ensure(status.recovery_scope.recovery_presets===true,"recovery presets");
  ensure(status.recovery_scope.renewal_filtering===true,"renewal filtering");
  ensure(status.recovery_scope.receipt_persistence===true,"receipt persistence");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 review boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");

  const lower=doc.toLowerCase();
  for(const token of ["recovery presets","renewal filtering","receipt persistence","under review","scorecards","layered filters","activity lanes","inspector checkpoints","disconnected"]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 251 recovery presets, renewal filtering, receipt persistence and Operations Command scorecard/layer/activity/checkpoint verification passed; QL-266 remains under review.");
}
void main();
