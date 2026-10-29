import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string){ return readFile(new URL(r, import.meta.url), "utf8"); }

async function main(){
  const presetIds = INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(presetIds.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","repair presets");
  ensure(interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","repair preset mapping");

  const now=1_800_000_000_000;
  const renewal=[
    {version:1,auditId:"new",createdAt:now-3600000,requestedPresetId:"a",recoveredPresetId:"all",reason:"Recent"},
    {version:1,auditId:"week",createdAt:now-3*86400000,requestedPresetId:"b",recoveredPresetId:"recent-7d",reason:"Week"},
    {version:1,auditId:"old",createdAt:now-9*86400000,requestedPresetId:"c",recoveredPresetId:"all",reason:"Old"}
  ] as any;
  ensure(filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"24h",now).length===1,"renewal 24h");
  ensure(filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"7d",now).length===2,"renewal 7d");

  ensure(INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("receipt-recovery-audit"),"receipt storage");
  ensure(sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d")==="recent-7d","receipt valid");
  ensure(sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all","receipt recovery");

  const [shell,pkg,proof,verify,statusRaw,doc,ql253]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql253-ai-data-platform-retry-status.json"),
    source("../../../docs/BUILD_228_RECOVERY_PRESETS_RENEWAL_FILTERING_RECEIPT_PERSISTENCE_QL253.md"),
    source("../../../docs/ROSEVEAR_QL253_AI_DATA_PLATFORM_RETRY_READINESS.md")
  ]);

  ensure(shell.includes("Build 228 · Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-228-recovery-presets-renewal-filtering-receipt-persistence-ql253.ts"),"registered");

  for(const t of ["reconcileQl253SourceCiProofAncestry","renewQl253CustodyPinException","HOLD_SOURCE_CI_SHA_MISMATCH","HOLD_SOURCE_TO_PROOF_ANCESTRY_UNVERIFIED","HOLD_IMMUTABLE_PROOF_NOT_PUBLISHED","CUSTODY_PIN_EXCEPTION_RENEWED_OWNER_TEST_AUTH_HELD"]) ensure(proof.includes(t),"proof gate "+t);
  ensure(verify.includes("QL-253 immutable-proof retry readiness")&&verify.includes("QL-253 custody-pin exception renewal"),"ql253 fixtures");

  const status=JSON.parse(statusRaw);
  ensure(status.ql253_retry_source_sha==="691017754d7e2bfa91ee880079e41f3d89c5a105","source sha");
  ensure(status.source_ci_run_url==="NOT_AVAILABLE"&&status.immutable_proof_status==="404","truthful source/proof state");
  ensure(status.owner_test_decision==="NOT_GIVEN"&&status.actual_gateway_test==="NOT_RUN"&&status.connection_state==="DISCONNECTED","held state");

  const lower=(doc+"\n"+ql253).toLowerCase();
  for(const t of ["not_available","404","not_given","not_run","disconnected","no gateway request"]) ensure(lower.includes(t),"doc boundary "+t);

  console.log("Build 228 recovery and QL-253 retry readiness verification passed.");
}
void main();
