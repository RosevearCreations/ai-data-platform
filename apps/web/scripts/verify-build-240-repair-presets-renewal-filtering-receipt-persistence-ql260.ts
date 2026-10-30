import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  const repairIds=INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(repairIds.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","repair presets");
  ensure(interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","repair 24h");
  ensure(interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query==="all","repair recovered all");

  const now=1_800_000_000_000;
  const renewal: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]=[
    {version:1,auditId:"new",createdAt:now-3600000,requestedPresetId:"retired-new",recoveredPresetId:"all",reason:"Recovered newest."},
    {version:1,auditId:"week",createdAt:now-3*86400000,requestedPresetId:"retired-week",recoveredPresetId:"recent-7d",reason:"Recovered week."},
    {version:1,auditId:"old",createdAt:now-9*86400000,requestedPresetId:"retired-old",recoveredPresetId:"all",reason:"Recovered old."}
  ];
  ensure(filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"24h",now).length===1,"renewal 24h");
  ensure(filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"7d",now).length===2,"renewal 7d");
  ensure(filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"all",now).length===3,"renewal all");

  ensure(INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("receipt-recovery-audit"),"receipt storage namespace");
  ensure(sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d")==="recent-7d","receipt preset valid");
  ensure(sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all","receipt preset fallback");

  const [shell,pkg,proof,qv,statusRaw,reconciliationRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql260-ai-data-platform-build240-status.json"),
    source("../../../docs/integration/ql260-ai-data-platform-owner-status-receipt-reconciliation.json"),
    source("../../../docs/BUILD_240_REPAIR_PRESETS_RENEWAL_FILTERING_RECEIPT_PERSISTENCE_QL260.md")
  ]);

  ensure(shell.includes("Build 240 · Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-240-repair-presets-renewal-filtering-receipt-persistence-ql260.ts"),"registered");

  for(const t of [
    "reconcileQl260AuthenticatedOwnerStatusReceipt",
    "enforceQl260CustodySourceRenewalFreshness",
    "prepareQl260ImmutableProofExceptionClosureReadiness",
    "QL260_OWNER_RECEIPT_RECONCILIATION_NOT_AVAILABLE",
    "QL260_CUSTODY_RENEWAL_FRESHNESS_NOT_AVAILABLE",
    "QL260_PROOF_EXCEPTION_CLOSURE_NOT_READY_PUBLICATION_MISSING"
  ]) ensure(proof.includes(t),"missing "+t);

  ensure(qv.includes("QL-260 receipt reconciliation, custody renewal freshness and proof exception closure readiness"),"QL260 fixture");

  const status=JSON.parse(statusRaw), reconciliation=JSON.parse(reconciliationRaw);
  ensure(status.observed_main_sha==="71c94f351366d9ab2df1e3e5ba372830c6821ddd","observed main");
  ensure(status.source_A_sha==="71c94f351366d9ab2df1e3e5ba372830c6821ddd","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41074503478","source CI");
  ensure(status.source_ci_conclusion==="success","source CI success");
  ensure(status.ql265_source_connection_interface==="PRESERVED","QL265 preserved");
  ensure(status.ql260_authenticated_owner_status_receipt==="NOT_AVAILABLE","owner receipt unavailable");
  ensure(status.owner_status_receipt_reconciliation==="QL260_OWNER_RECEIPT_RECONCILIATION_NOT_AVAILABLE","receipt reconciliation");
  ensure(status.custody_source_renewal_freshness==="QL260_CUSTODY_RENEWAL_FRESHNESS_NOT_AVAILABLE","renewal freshness");
  ensure(status.immutable_proof_http_status===404,"proof 404");
  ensure(status.proof_publication_exception_closure_readiness==="QL260_PROOF_EXCEPTION_CLOSURE_NOT_READY_PUBLICATION_MISSING","closure not ready");
  ensure(status.proof_publication_exception_closure_allowed===false&&status.proof_publication_exception_waiver_allowed===false,"closure no bypass");
  ensure(status.proof_B_publication_attempted===false&&status.proof_B_sha==="NOT_AVAILABLE","proof B absent");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.connection_state==="DISCONNECTED / HOLD"&&status.live_pilot_holds===12,"connection held");

  ensure(reconciliation.receipt_available===false,"receipt absent");
  ensure(reconciliation.reconciliation_status==="QL260_OWNER_RECEIPT_RECONCILIATION_NOT_AVAILABLE","reconciliation state");
  ensure(reconciliation.owner_identity_authenticated===false&&reconciliation.custody_verified===false,"no auth/custody");
  ensure(reconciliation.owner_authorization==="NOT_GIVEN"&&reconciliation.network_test_authorized===false,"no network auth");

  const lower=doc.toLowerCase();
  for(const t of [
    "71c94f351366d9ab2df1e3e5ba372830c6821ddd",
    "41074503478","http 404",
    "ql260_owner_receipt_reconciliation_not_available",
    "ql260_custody_renewal_freshness_not_available",
    "ql260_proof_exception_closure_not_ready_publication_missing",
    "exceptionwaiverallowed","not_given","not_run","disconnected / hold"
  ]) ensure(lower.includes(t),"doc "+t);

  console.log("Build 240 recovery cycle and QL-260 reconciliation/freshness/closure verification passed.");
}
void main();
