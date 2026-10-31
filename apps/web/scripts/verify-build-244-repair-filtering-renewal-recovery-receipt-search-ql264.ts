import { readFile } from "node:fs/promises";
import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
} from "../lib/navigation-preferences";

function ensure(c: unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const now=1_800_000_000_000;
  const repair:Parameters<typeof filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"repair-recent",createdAt:now-3600000,requestedPresetId:"old-a",recoveredPresetId:"all",reason:"Recent repair recovery."},
    {version:1,auditId:"repair-week",createdAt:now-3*86400000,requestedPresetId:"old-b",recoveredPresetId:"recent-7d",reason:"Weekly repair recovery."},
    {version:1,auditId:"repair-old",createdAt:now-10*86400000,requestedPresetId:"old-c",recoveredPresetId:"all",reason:"Old repair recovery."}
  ];
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"24h",now).length===1,"repair filter 24h");
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"7d",now).length===2,"repair filter 7d");
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"all",now).length===3,"repair filter all");

  const recovered=recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired");
  const valid=recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(recovered.recovered&&recovered.presetId==="all"&&Boolean(recovered.reason),"renewal recovery");
  ensure(!valid.recovered&&valid.presetId==="recent-7d","renewal valid");

  const receipt:Parameters<typeof searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"receipt-alpha",createdAt:now,requestedPresetId:"retired-alpha",recoveredPresetId:"all",reason:"Recovered alpha receipt preset."},
    {version:1,auditId:"receipt-beta",createdAt:now-1000,requestedPresetId:"retired-beta",recoveredPresetId:"recent-7d",reason:"Recovered beta receipt preset."}
  ];
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"alpha")[0]?.auditId==="receipt-alpha","receipt alpha search");
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"recent-7d")[0]?.auditId==="receipt-beta","receipt recovered preset search");
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"").length===2,"receipt blank search");

  const [shell,css,panels,review,remote,adoption,delivery,pkg,proof,qv,statusRaw,ownerRaw,custodyRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/data-review/page.tsx"),
    source("../app/remote-execution/page.tsx"),
    source("../app/adoption/page.tsx"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql264-ai-data-platform-build244-status.json"),
    source("../../../docs/integration/ql264-ai-data-platform-owner-packet-renewal-reconciliation.json"),
    source("../../../docs/integration/ql264-ai-data-platform-signer-custody-freshness-renewal.json"),
    source("../../../docs/BUILD_244_REPAIR_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH_QL264.md")
  ]);

  ensure(shell.includes("Operations Command"),"Operations Command shell");
  ensure(css.includes("Build 244 — template-driven action drawers, exception queues and evidence timelines"),"Build 244 panel styling");
  for(const token of ["OperationsActionDrawer","OperationsExceptionQueue","OperationsEvidenceTimeline"]) ensure(panels.includes(token),"panel "+token);
  ensure(review.includes("OperationsActionDrawer"),"Data Review action drawer");
  ensure(remote.includes("OperationsExceptionQueue")&&remote.includes("OperationsEvidenceTimeline"),"Remote Execution exception/evidence panels");
  ensure(adoption.includes("OperationsExceptionQueue"),"Adoption exception queue");
  ensure(delivery.includes("OperationsExceptionQueue")&&delivery.includes("OperationsEvidenceTimeline"),"System Status exception/evidence panels");
  ensure(pkg.includes("verify-build-244-repair-filtering-renewal-recovery-receipt-search-ql264.ts"),"registered");

  for(const token of [
    "reconcileQl264OwnerPacketRenewal",
    "renewQl264SignerCustodyFreshnessReceipt",
    "disposeQl264SourceProofPublicationException",
    "QL264_OWNER_PACKET_RENEWAL_RECONCILIATION_NOT_AVAILABLE",
    "QL264_SIGNER_CUSTODY_FRESHNESS_RECEIPT_RENEWAL_NOT_AVAILABLE",
    "QL264_PROOF_PUBLICATION_EXCEPTION_DISPOSITION_OPEN_PUBLICATION_REQUIRED"
  ]) ensure(proof.includes(token),"QL264 source "+token);
  ensure(qv.includes("QL-264 owner renewal reconciliation, custody freshness receipt renewal and proof exception disposition"),"QL264 fixture");

  const status=JSON.parse(statusRaw),owner=JSON.parse(ownerRaw),custody=JSON.parse(custodyRaw);
  ensure(status.source_A_sha==="c6178ed786cba9cfeb33769e61d41a0559e6451e","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41112571900","source CI run");
  ensure(status.source_ci_conclusion==="failure","source CI recorded truthfully");
  ensure(status.source_ci_failure_reason==="HISTORICAL_BUILD_241_SHELL_LABEL_CONTRACT","source CI reason");
  ensure(status.owner_packet_renewal_reconciliation==="QL264_OWNER_PACKET_RENEWAL_RECONCILIATION_NOT_AVAILABLE","owner reconciliation");
  ensure(status.signer_custody_freshness_receipt_renewal==="QL264_SIGNER_CUSTODY_FRESHNESS_RECEIPT_RENEWAL_NOT_AVAILABLE","custody renewal");
  ensure(status.source_proof_exception_disposition==="QL264_PROOF_PUBLICATION_EXCEPTION_DISPOSITION_OPEN_PUBLICATION_REQUIRED","exception disposition");
  ensure(status.immutable_proof_http_status===404&&status.proof_B_publication_attempted===false,"proof absent");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.connection_state==="DISCONNECTED / HOLD","connection held");

  ensure(owner.renewal_available===false&&owner.reconciled===false&&owner.network_test_authorized===false,"owner evidence truth");
  ensure(custody.evidence_available===false&&custody.renewed===false&&custody.activation_allowed===false,"custody evidence truth");

  const lower=doc.toLowerCase();
  for(const token of ["repair filtering","renewal recovery","receipt search","owner-packet renewal reconciliation","signer-custody freshness receipt renewal","source-proof exception disposition","action drawers","exception queues","evidence timelines","http 404","not_given","not_run","disconnected / hold"]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 244 recovery cycle, QL-264 gates and template-driven Operations Command panels verification passed.");
}
void main();