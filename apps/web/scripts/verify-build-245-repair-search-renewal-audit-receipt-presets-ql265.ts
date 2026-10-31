import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(c: unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const repair:InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]=[
    {version:1,auditId:"repair-alpha",createdAt:1_800_000_000_000,requestedPresetId:"retired-alpha",recoveredPresetId:"all",reason:"Recovered alpha preset."},
    {version:1,auditId:"repair-beta",createdAt:1_799_999_999_000,requestedPresetId:"retired-beta",recoveredPresetId:"recent-7d",reason:"Recovered beta preset."}
  ];
  ensure(searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"alpha")[0]?.auditId==="repair-alpha","repair search alpha");
  ensure(searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"recent-7d")[0]?.auditId==="repair-beta","repair search preset");

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
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query==="recovered","receipt reasons");

  const [shell,css,panels,delivery,adoption,pkg,proof,qv,statusRaw,ownerRaw,custodyRaw,closureRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/integration-delivery/page.tsx"),
    source("../app/adoption/page.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql265-ai-data-platform-build245-status.json"),
    source("../../../docs/integration/ql265-ai-data-platform-owner-renewal-freshness.json"),
    source("../../../docs/integration/ql265-ai-data-platform-signer-custody-renewal-audit.json"),
    source("../../../docs/integration/ql265-ai-data-platform-proof-disposition-closure-readiness.json"),
    source("../../../docs/BUILD_245_REPAIR_SEARCH_RENEWAL_AUDIT_RECEIPT_PRESETS_QL265.md")
  ]);

  ensure(shell.includes("Operations Command"),"Operations Command shell");
  ensure(css.includes("Build 245 — reusable tables, inspectors, status badges and responsive workflows"),"Build 245 styles");
  for(const token of ["OperationsDataTable","OperationsInspector","OperationsStatusBadge"]) ensure(panels.includes(token),"panel "+token);
  ensure(delivery.includes("OperationsDataTable")&&delivery.includes("OperationsInspector")&&delivery.includes("OperationsStatusBadge"),"System Status reusable components");
  ensure(adoption.includes("OperationsInspector")&&adoption.includes("OperationsStatusBadge"),"Management reusable components");
  ensure(pkg.includes("verify-build-245-repair-search-renewal-audit-receipt-presets-ql265.ts"),"registered");

  for(const token of [
    "reconcileQl265OwnerRenewalFreshness",
    "auditQl265SignerCustodyRenewalReceipt",
    "prepareQl265SourceProofDispositionClosureReadiness",
    "QL265_OWNER_RENEWAL_FRESHNESS_RECONCILIATION_NOT_AVAILABLE",
    "QL265_SIGNER_CUSTODY_RENEWAL_RECEIPT_AUDIT_NOT_AVAILABLE",
    "QL265_PROOF_DISPOSITION_CLOSURE_NOT_READY_PUBLICATION_MISSING"
  ]) ensure(proof.includes(token),"QL265 source "+token);
  ensure(qv.includes("QL-265 owner renewal freshness, signer-custody renewal audit and proof disposition closure readiness"),"QL265 fixture");

  const status=JSON.parse(statusRaw),owner=JSON.parse(ownerRaw),custody=JSON.parse(custodyRaw),closure=JSON.parse(closureRaw);
  ensure(status.source_A_sha==="79a90aa17c2f04b77b27bd3eca54dbdc50d87fe5","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41148633285","source CI run");
  ensure(status.source_ci_conclusion==="success","source CI success");
  ensure(status.owner_renewal_freshness_reconciliation==="QL265_OWNER_RENEWAL_FRESHNESS_RECONCILIATION_NOT_AVAILABLE","owner freshness");
  ensure(status.signer_custody_renewal_receipt_audit==="QL265_SIGNER_CUSTODY_RENEWAL_RECEIPT_AUDIT_NOT_AVAILABLE","custody audit");
  ensure(status.source_proof_disposition_closure_readiness==="QL265_PROOF_DISPOSITION_CLOSURE_NOT_READY_PUBLICATION_MISSING","closure readiness");
  ensure(status.immutable_proof_http_status===404&&status.proof_B_publication_attempted===false,"proof absent");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.connection_state==="DISCONNECTED / HOLD"&&status.live_pilot_holds===12,"connection held");

  ensure(owner.renewal_available===false&&owner.freshness_reconciled===false&&owner.network_test_authorized===false,"owner evidence truth");
  ensure(custody.evidence_available===false&&custody.audit_passed===false&&custody.activation_allowed===false,"custody evidence truth");
  ensure(closure.ready===false&&closure.exception_waiver_allowed===false&&closure.proof_http_status===404,"closure evidence truth");

  const lower=doc.toLowerCase();
  for(const token of ["repair search","renewal recovery audit","receipt presets","owner-renewal freshness reconciliation","signer-custody renewal receipt audit","source-proof disposition closure readiness","reusable tables","inspectors","status badges","responsive workflow layouts","http 404","not_given","not_run","disconnected / hold"]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 245 recovery cycle, QL-265 gates and reusable Operations Command workflow components verification passed.");
}
void main();