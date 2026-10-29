import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";
function ensure(c:unknown,m:string): asserts c { if(!c) throw new Error(m); }
async function source(r:string){ return readFile(new URL(r,import.meta.url),"utf8"); }
async function main(){
  const repaired=recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-repair");
  const valid=recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(repaired.recovered&&repaired.presetId==="all"&&!valid.recovered&&valid.presetId==="recent-7d","repair preset recovery");

  const ids=INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(ids.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","renewal presets");
  ensure(interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","renewal mapping");

  const first=createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({auditId:"receipt-1",createdAt:1,requestedPresetId:"a",recoveredPresetId:"all",reason:"one"});
  const second=createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({auditId:"receipt-2",createdAt:2,requestedPresetId:"b",recoveredPresetId:"recent-7d",reason:"two"});
  const audit=prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],first),second);
  ensure(audit[0]?.auditId==="receipt-2","receipt audit newest first");

  const [shell,pkg,proof,qv,statusRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql253-ai-data-platform-build230-status.json"),
    source("../../../docs/BUILD_230_REPAIR_RECOVERY_RENEWAL_PRESETS_RECEIPT_AUDIT_QL253.md")
  ]);
  ensure(shell.includes("Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-230-repair-recovery-renewal-presets-receipt-audit-ql253.ts"),"registered");
  for(const t of ["renewQl253RetryEvidence","ageQl253AncestryException","continueQl253VerifiedOwnerTestDecision","HOLD_ANCESTRY_EXCEPTION_OVERDUE","OWNER_TEST_DECISION_CONTINUITY_VERIFIED_REQUEST_EXECUTION_HELD"]) ensure(proof.includes(t),"missing "+t);
  ensure(qv.includes("retry evidence renewal, ancestry-exception aging and owner TEST continuity"),"fixtures");
  const s=JSON.parse(statusRaw);
  ensure(s.ql253_observed_main_sha==="76f73363a9a29a34ed8bf09b6b4ff58a0dc77482","observed main");
  ensure(s.source_ci_run_url==="NOT_AVAILABLE"&&s.immutable_public_proof_url==="HTTP 404","truthful proof state");
  ensure(s.owner_test_decision==="NOT_GIVEN"&&s.real_health_and_capabilities_get_receipts==="NOT_RUN"&&s.connection_state==="DISCONNECTED","held");
  const lower=doc.toLowerCase(); for(const t of ["not_available","http 404","not_given","not_run","disconnected","no gateway gets while held"]) ensure(lower.includes(t),"doc "+t);
  console.log("Build 230 verification passed.");
}
void main();
