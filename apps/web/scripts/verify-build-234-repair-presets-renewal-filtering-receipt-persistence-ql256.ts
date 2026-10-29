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

  const [shell,pkg,proof,qv,statusRaw,ownerRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql256-ai-data-platform-build234-status.json"),
    source("../../../docs/integration/ql257-ai-data-platform-owner-status.json"),
    source("../../../docs/BUILD_234_REPAIR_PRESETS_RENEWAL_FILTERING_RECEIPT_PERSISTENCE_QL256.md")
  ]);

  ensure(shell.includes("Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-234-repair-presets-renewal-filtering-receipt-persistence-ql256.ts"),"registered");

  for(const t of [
    "reconcileQl256CustodyChallenge",
    "evaluateQl256SignedProofBExecutionReadiness",
    "intakeQl256OwnerTestAuthorizationEvidence",
    "HOLD_QL256_CUSTODY_CHALLENGE_NOT_RECONCILED",
    "HOLD_QL256_SIGNED_PROOF_B_CUSTODY_NOT_RECONCILED",
    "QL256_OWNER_TEST_AUTH_EVIDENCE_ACCEPTED_GATEWAY_EXECUTION_HELD"
  ]) ensure(proof.includes(t),"missing "+t);
  ensure(qv.includes("QL-256 custody challenge, signed proof-B execution and owner authorization evidence"),"fixture");

  const status=JSON.parse(statusRaw), owner=JSON.parse(ownerRaw);
  ensure(status.source_A_sha==="a86dce3a71cd6795f5b32b22ddf4320c091dd7a5","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/40928884781","source CI");
  ensure(status.signer_status==="SIGNER_EXISTS_CUSTODY_NOT_VERIFIED","signer state");
  ensure(status.custody_challenge_reconciliation==="HELD_NOT_RECONCILED","custody challenge");
  ensure(status.immutable_proof_status==="HTTP 404"&&!status.proof_B_publication_attempted,"proof not published");
  ensure(status.owner_test_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");

  ensure(owner.private_key_custodian_role==="NOT_ASSIGNED","custodian owner status");
  ensure(owner.distinct_independent_witness==="NOT_ASSIGNED","witness owner status");
  ensure(owner.separate_reviewer==="NOT_ASSIGNED","reviewer owner status");
  ensure(owner.approved_restricted_private_key_host_store==="NOT_APPROVED","host owner status");
  ensure(owner.public_spki_pin_independently_checked==="NOT_VERIFIED","pin owner status");
  ensure(owner.custody_receipt_certified_by_ql257===false,"QL257 cannot certify custody");

  const lower=doc.toLowerCase();
  for(const t of ["not_assigned","not_approved","not_verified","http 404","not_given","not_run","disconnected / hold","no gateway execution while held"]) ensure(lower.includes(t),"doc "+t);

  console.log("Build 234 recovery cycle and QL-256 custody challenge verification passed.");
}
void main();
