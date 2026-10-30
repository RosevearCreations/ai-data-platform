import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  const a=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"repair-a",createdAt:1_800_000_000_000,requestedPresetId:"old-a",recoveredPresetId:"all",reason:"Recovered."
  });
  const b=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"repair-b",createdAt:1_800_000_001_000,requestedPresetId:"old-b",recoveredPresetId:"recent-7d",reason:"Recovered."
  });
  const audit=prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
    prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],a),b
  );
  ensure(audit.length===2&&audit[0]?.auditId==="repair-b","repair audit newest-first");

  ensure(
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h")==="recent-24h" &&
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all" &&
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("renewal-recovery"),
    "renewal preset persistence"
  );

  const now=1_800_000_000_000;
  const receipt: Parameters<typeof filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"r1",createdAt:now-3600000,requestedPresetId:"a",recoveredPresetId:"all",reason:"Recent"},
    {version:1,auditId:"r2",createdAt:now-3*86400000,requestedPresetId:"b",recoveredPresetId:"recent-7d",reason:"Week"},
    {version:1,auditId:"r3",createdAt:now-10*86400000,requestedPresetId:"c",recoveredPresetId:"all",reason:"Old"}
  ];
  ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"24h",now).length===1,"receipt 24h");
  ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"7d",now).length===2,"receipt 7d");
  ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"all",now).length===3,"receipt all");

  const [shell,pkg,proof,qv,statusRaw,reconciliationRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql258-ai-data-platform-build237-status.json"),
    source("../../../docs/integration/ql258-ai-data-platform-owner-return-reconciliation.json"),
    source("../../../docs/BUILD_237_REPAIR_AUDIT_RENEWAL_PERSISTENCE_RECEIPT_FILTERING_QL258.md")
  ]);

  ensure(shell.includes("Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-237-repair-audit-renewal-persistence-receipt-filtering-ql258.ts"),"registered");

  for(const t of [
    "reconcileQl258SanitizedOwnerActionReturn",
    "followUpQl258ImmutableProofPublication",
    "ageQl258CustodySourceActivationEvidence",
    "QL258_OWNER_RETURN_RECONCILED_SELF_REPORT_ONLY",
    "QL258_PROOF_PUBLICATION_FOLLOWUP_NOT_PUBLISHED",
    "HOLD_QL258_CUSTODY_EVIDENCE_STALE_OR_EXPIRED"
  ]) ensure(proof.includes(t),"missing "+t);

  ensure(qv.includes("QL-258 owner return reconciliation, proof publication follow-up and custody evidence aging"),"QL258 fixture");

  const status=JSON.parse(statusRaw), reconciliation=JSON.parse(reconciliationRaw);
  ensure(status.observed_main_sha==="467ca1fad5822ce61c53689bb5826b35e26b5dc0","observed main");
  ensure(status.source_A_sha==="467ca1fad5822ce61c53689bb5826b35e26b5dc0","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41063977694","source CI");
  ensure(status.source_ci_conclusion==="success","source CI success");
  ensure(status.ql265_source_connection_interface==="PRESERVED","QL265 preserved");
  ensure(status.ql258_sanitized_owner_action_return==="NOT_RECEIVED","return absent");
  ensure(status.owner_return_reconciliation==="QL258_OWNER_RETURN_NOT_RECEIVED_OR_INCOMPLETE","return reconciliation");
  ensure(status.immutable_proof_publication_follow_up==="HTTP 404","proof follow-up");
  ensure(status.proof_publication_follow_up_status==="QL258_PROOF_PUBLICATION_FOLLOWUP_NOT_PUBLISHED","proof status");
  ensure(status.custody_source_activation_evidence==="NOT_AVAILABLE","custody evidence unavailable");
  ensure(status.custody_source_evidence_aging==="QL258_CUSTODY_EVIDENCE_NOT_AVAILABLE","aging status");
  ensure(status.proof_B_publication_attempted===false&&status.proof_B_sha==="NOT_AVAILABLE","proof B absent");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.connection_state==="DISCONNECTED / HOLD"&&status.live_pilot_holds===12,"connection held");

  ensure(reconciliation.return_received===false,"return not received");
  ensure(reconciliation.expected_progress_count===7,"seven progress answers");
  ensure(reconciliation.authenticated_identity===false&&reconciliation.proof_publication_authorized===false,"self-report not auth");
  ensure(reconciliation.owner_authorization==="NOT_GIVEN"&&reconciliation.network_test_authorized===false,"no test auth");

  const lower=doc.toLowerCase();
  for(const t of [
    "467ca1fad5822ce61c53689bb5826b35e26b5dc0",
    "41063977694","http 404","not_received",
    "ql258_custody_evidence_not_available","not_given","not_run",
    "disconnected / hold","default maximum evidence age is 30 minutes"
  ]) ensure(lower.includes(t),"doc "+t);

  console.log("Build 237 recovery cycle and QL-258 return/proof/evidence-aging verification passed.");
}

void main();
