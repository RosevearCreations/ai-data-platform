import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  const repair: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
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
  ensure(renewal.length===2&&renewal[0]?.auditId==="renewal-2","renewal audit newest first");

  const ids=INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(ids.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","receipt preset ids");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","receipt 24h");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter==="7d","receipt 7d");
  ensure(interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query==="recovered","receipt reasons");

  const [shell,pkg,proof,qv,statusRaw,intakeRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql260-ai-data-platform-build239-status.json"),
    source("../../../docs/integration/ql260-ai-data-platform-owner-status-receipt-intake.json"),
    source("../../../docs/BUILD_239_REPAIR_SEARCH_RENEWAL_AUDIT_RECEIPT_PRESETS_QL260.md")
  ]);

  ensure(shell.includes("Build 239 · Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-239-repair-search-renewal-audit-receipt-presets-ql260.ts"),"registered");

  for(const t of [
    "intakeQl260AuthenticatedOwnerStatusReceipt",
    "verifyQl260CustodySourceEvidenceRenewal",
    "disposeQl260ImmutableProofPublicationException",
    "QL260_AUTHENTICATED_OWNER_STATUS_RECEIPT_NOT_AVAILABLE",
    "QL260_CUSTODY_SOURCE_RENEWAL_NOT_AVAILABLE",
    "QL260_PROOF_PUBLICATION_EXCEPTION_DISPOSITION_OPEN_PUBLICATION_REQUIRED"
  ]) ensure(proof.includes(t),"missing "+t);

  ensure(qv.includes("QL-260 authenticated owner receipt, custody renewal verification and proof exception disposition"),"QL260 fixture");

  const status=JSON.parse(statusRaw), intake=JSON.parse(intakeRaw);
  ensure(status.observed_main_sha==="ad958eee57fc02a1cd6753126e29e7e9a650fda2","observed main");
  ensure(status.source_A_sha==="ad958eee57fc02a1cd6753126e29e7e9a650fda2","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41072292854","source CI");
  ensure(status.source_ci_conclusion==="success","source CI success");
  ensure(status.ql265_source_connection_interface==="PRESERVED","QL265 preserved");
  ensure(status.ql260_authenticated_owner_status_receipt==="NOT_AVAILABLE","owner receipt unavailable");
  ensure(status.owner_status_receipt_intake==="QL260_AUTHENTICATED_OWNER_STATUS_RECEIPT_NOT_AVAILABLE","owner receipt state");
  ensure(status.custody_source_evidence_renewal_verification==="QL260_CUSTODY_SOURCE_RENEWAL_NOT_AVAILABLE","custody renewal unavailable");
  ensure(status.immutable_proof_http_status===404,"proof 404");
  ensure(status.proof_publication_exception_disposition==="KEEP_OPEN_PUBLICATION_REQUIRED","exception disposition");
  ensure(status.proof_publication_exception_status==="QL260_PROOF_PUBLICATION_EXCEPTION_DISPOSITION_OPEN_PUBLICATION_REQUIRED","exception status");
  ensure(status.proof_publication_exception_waiver_allowed===false,"no exception waiver");
  ensure(status.proof_B_publication_attempted===false&&status.proof_B_sha==="NOT_AVAILABLE","proof B absent");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.connection_state==="DISCONNECTED / HOLD"&&status.live_pilot_holds===12,"connection held");

  ensure(intake.receipt_available===false,"owner receipt absent");
  ensure(intake.max_receipt_window_minutes===30,"owner receipt max window");
  ensure(intake.custody_verified===false&&intake.network_test_authorized===false,"receipt cannot authorize custody/test");
  ensure(intake.owner_authorization==="NOT_GIVEN"&&intake.connection==="DISCONNECTED","receipt boundary");

  const lower=doc.toLowerCase();
  for(const t of [
    "ad958eee57fc02a1cd6753126e29e7e9a650fda2",
    "41072292854","http 404",
    "ql260_authenticated_owner_status_receipt_not_available",
    "ql260_custody_source_renewal_not_available",
    "keep_open_publication_required",
    "exceptionwaiverallowed","not_given","not_run","disconnected / hold"
  ]) ensure(lower.includes(t),"doc "+t);

  console.log("Build 239 recovery cycle and QL-260 owner/custody/proof-disposition verification passed.");
}
void main();
