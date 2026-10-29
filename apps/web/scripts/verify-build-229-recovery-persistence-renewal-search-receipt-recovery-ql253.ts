import { readFile } from "node:fs/promises";
import {
 INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
 recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
 sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
 searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
} from "../lib/navigation-preferences";
function ensure(c:unknown,m:string): asserts c { if(!c) throw new Error(m); }
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}
async function main(){
 ensure(sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h")==="recent-24h","repair preset");
 ensure(sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all","repair recovery");
 ensure(INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("recovery-audit-repair"),"repair storage");
 const renewal=[{version:1,auditId:"alpha",createdAt:1,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered alpha."},{version:1,auditId:"beta",createdAt:0,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered beta."}] as any;
 ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"alpha")[0]?.auditId==="alpha","renewal search");
 const repaired=recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired");
 ensure(repaired.recovered&&repaired.presetId==="all","receipt recovery");
 const [shell,pkg,proof,qv,statusRaw,doc]=await Promise.all([source("../app/application-shell.tsx"),source("../package.json"),source("./ql246-source-proof.mjs"),source("./verify-ql246-independent-six-app-source-proof.mjs"),source("../../../docs/integration/ql253-ai-data-platform-build229-status.json"),source("../../../docs/BUILD_229_RECOVERY_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_RECOVERY_QL253.md")]);
 ensure(shell.includes("Build 229 · Marble Standard"),"shell");
 ensure(pkg.includes("verify-build-229-recovery-persistence-renewal-search-receipt-recovery-ql253.ts"),"registered");
 for(const t of ["reconcileQl253PublicProofRetryResult","handleQl253AncestryDrift","intakeQl253OwnerTestDecision","HOLD_QL253_ANCESTRY_DRIFT_EXCEPTION","OWNER_TEST_PRIVATE_REVIEW_REQUESTED_AUTH_REQUESTS_HELD"]) ensure(proof.includes(t),"missing "+t);
 ensure(qv.includes("retry reconciliation, ancestry drift and owner TEST-only intake"),"fixture");
 const s=JSON.parse(statusRaw);
 ensure(s.source_ci_run_url==="NOT_AVAILABLE"&&s.immutable_proof_status==="404","truthful status");
 ensure(s.owner_test_decision==="NOT_GIVEN"&&s.actual_gateway_test==="NOT_RUN"&&s.connection_state==="DISCONNECTED","held");
 const lower=doc.toLowerCase(); for(const t of ["not_available","404","not_given","not_run","disconnected","authenticated requests"]) ensure(lower.includes(t),"doc "+t);
 console.log("Build 229 verification passed.");
}
void main();
