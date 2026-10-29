import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";

function ensure(c:unknown,m:string): asserts c { if(!c) throw new Error(m); }
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const a=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({auditId:"a",createdAt:1_800_000_000_000,requestedPresetId:"old",recoveredPresetId:"all",reason:"Recovered."});
  const b=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({auditId:"b",createdAt:1_800_000_001_000,requestedPresetId:"old2",recoveredPresetId:"recent-7d",reason:"Recovered."});
  const audit=prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],a),b);
  ensure(audit[0]?.auditId==="b","repair audit");

  ensure(
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h")==="recent-24h" &&
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all" &&
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("renewal-recovery"),
    "renewal persistence"
  );

  const now=1_800_000_000_000;
  const receipt: Parameters<typeof filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"r1",createdAt:now-3600000,requestedPresetId:"a",recoveredPresetId:"all",reason:"Recent"},
    {version:1,auditId:"r2",createdAt:now-3*86400000,requestedPresetId:"b",recoveredPresetId:"all",reason:"Week"},
    {version:1,auditId:"r3",createdAt:now-10*86400000,requestedPresetId:"c",recoveredPresetId:"all",reason:"Old"}
  ];
  ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"24h",now).length===1,"receipt 24h");
  ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"7d",now).length===2,"receipt 7d");

  const [shell,pkg,proof,qv,statusRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql254-ai-data-platform-build231-status.json"),
    source("../../../docs/BUILD_231_REPAIR_AUDIT_RENEWAL_PERSISTENCE_RECEIPT_FILTERING_QL254.md")
  ]);

  ensure(shell.includes("Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-231-repair-audit-renewal-persistence-receipt-filtering-ql254.ts"),"registered");
  for(const t of ["reconcileQl254OriginalProofRetrieval","verifyQl254IndependentWitnessClaim","evaluateQl254RelayReadiness","HOLD_QL254_ORIGINAL_PROOF_NOT_PUBLISHED","QL254_RELAY_REVERSIBILITY_SIMULATION_READY_CONNECTION_HELD"]) ensure(proof.includes(t),"missing "+t);
  ensure(qv.includes("QL-254 original proof retrieval, independent witness claim and relay reversibility"),"fixture");

  const s=JSON.parse(statusRaw);
  ensure(s.observed_main_sha==="9e570d82707fd476b43458fa869776bac9ddc65f","main sha");
  ensure(s.immutable_proof_url==="HTTP 404"&&s.matching_source_green_ci_run_url==="NOT_AVAILABLE","proof state");
  ensure(s.owner_test_decision==="NOT_GIVEN"&&s.actual_nonproduction_gateway_gets==="NOT_RUN"&&s.connection_state==="DISCONNECTED","held");

  const lower=doc.toLowerCase();
  for(const t of ["http 404","not_available","not installed or started","no home-pc configuration","disconnected"]) ensure(lower.includes(t),"doc "+t);
  console.log("Build 231 verification passed.");
}
void main();
