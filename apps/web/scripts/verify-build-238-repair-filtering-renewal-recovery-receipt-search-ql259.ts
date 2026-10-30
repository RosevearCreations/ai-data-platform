import { readFile } from "node:fs/promises";
import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  const now=1_800_000_000_000;
  const repair: Parameters<typeof filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"recent",createdAt:now-3600000,requestedPresetId:"old-a",recoveredPresetId:"all",reason:"Recent."},
    {version:1,auditId:"week",createdAt:now-3*86400000,requestedPresetId:"old-b",recoveredPresetId:"recent-7d",reason:"Week."},
    {version:1,auditId:"old",createdAt:now-10*86400000,requestedPresetId:"old-c",recoveredPresetId:"all",reason:"Old."}
  ];
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"24h",now).length===1,"repair 24h");
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"7d",now).length===2,"repair 7d");
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"all",now).length===3,"repair all");

  const recovered=recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired");
  const valid=recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(recovered.recovered&&recovered.presetId==="all"&&Boolean(recovered.reason),"renewal recovery");
  ensure(!valid.recovered&&valid.presetId==="recent-7d","renewal valid");

  const receipt: Parameters<typeof searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"receipt-a",createdAt:now,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered alpha."},
    {version:1,auditId:"receipt-b",createdAt:now-1000,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered beta."}
  ];
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"alpha")[0]?.auditId==="receipt-a","receipt alpha");
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"recent-7d")[0]?.auditId==="receipt-b","receipt preset");
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"").length===2,"receipt blank");

  const [shell,pkg,proof,qv,statusRaw,refreshRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql259-ai-data-platform-build238-status.json"),
    source("../../../docs/integration/ql259-ai-data-platform-owner-status-refresh.json"),
    source("../../../docs/BUILD_238_REPAIR_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH_QL259.md")
  ]);

  ensure(shell.includes("Build 238 · Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-238-repair-filtering-renewal-recovery-receipt-search-ql259.ts"),"registered");

  for(const t of [
    "refreshQl259OwnerStatus",
    "renewQl259CustodySourceEvidence",
    "reviewQl259ImmutableProofPublicationException",
    "QL259_OWNER_STATUS_NOT_AVAILABLE",
    "QL259_CUSTODY_SOURCE_EVIDENCE_NOT_AVAILABLE",
    "QL259_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED"
  ]) ensure(proof.includes(t),"missing "+t);

  ensure(qv.includes("QL-259 owner refresh, custody renewal and proof exception review"),"QL259 fixture");

  const status=JSON.parse(statusRaw), refresh=JSON.parse(refreshRaw);
  ensure(status.observed_main_sha==="5b03307cb366e74af01fb54d2385096996772b5c","observed main");
  ensure(status.source_A_sha==="5b03307cb366e74af01fb54d2385096996772b5c","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41070310506","source CI");
  ensure(status.source_ci_conclusion==="success","source CI success");
  ensure(status.ql265_source_connection_interface==="PRESERVED","QL265 preserved");
  ensure(status.ql259_owner_status_refresh==="QL259_OWNER_STATUS_NOT_AVAILABLE","owner status");
  ensure(status.custody_source_evidence_renewal==="QL259_CUSTODY_SOURCE_EVIDENCE_NOT_AVAILABLE","custody renewal");
  ensure(status.immutable_proof_http_status===404,"proof 404");
  ensure(status.immutable_proof_publication_exception==="QL259_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED","exception open");
  ensure(status.proof_publication_exception_waiver_allowed===false,"no exception waiver");
  ensure(status.proof_B_publication_attempted===false&&status.proof_B_sha==="NOT_AVAILABLE","proof B absent");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.connection_state==="DISCONNECTED / HOLD"&&status.live_pilot_holds===12,"connection held");

  ensure(refresh.owner_status_available===false,"owner refresh unavailable");
  ensure(refresh.authenticated_identity===false&&refresh.custody_verified===false,"owner self report not auth");
  ensure(refresh.owner_authorization==="NOT_GIVEN"&&refresh.network_test_authorized===false,"no network auth");

  const lower=doc.toLowerCase();
  for(const t of [
    "5b03307cb366e74af01fb54d2385096996772b5c",
    "41070310506","http 404","ql259_owner_status_not_available",
    "ql259_custody_source_evidence_not_available",
    "ql259_proof_publication_exception_open_publication_required",
    "exceptionwaiverallowed","not_given","not_run","disconnected / hold"
  ]) ensure(lower.includes(t),"doc "+t);

  console.log("Build 238 recovery cycle and QL-259 owner/custody/proof-exception verification passed.");
}
void main();
