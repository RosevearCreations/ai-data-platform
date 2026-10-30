import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";
import {
  reconcileQl261ActualOwnerPacketReceipt,
  evaluateQl261IndependentSignerCustodyEvidenceGate,
  prepareQl261SourceProofPublicationReadiness
} from "./ql246-source-proof.mjs";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  ensure(
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired") === "all" &&
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("recovery-audit-repair"),
    "repair preset persistence"
  );

  const renewal: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {version:1,auditId:"renewal-alpha",createdAt:1_800_000_000_000,requestedPresetId:"retired-alpha",recoveredPresetId:"all",reason:"Recovered alpha renewal preset."},
    {version:1,auditId:"renewal-beta",createdAt:1_799_999_999_000,requestedPresetId:"retired-beta",recoveredPresetId:"recent-7d",reason:"Recovered beta renewal preset."}
  ];
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"alpha")[0]?.auditId==="renewal-alpha","renewal search alpha");
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"recent-7d")[0]?.auditId==="renewal-beta","renewal search recovered preset");
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"").length===2,"renewal blank search");

  const repaired = recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-receipt");
  const valid = recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(repaired.recovered && repaired.presetId==="all" && Boolean(repaired.reason),"receipt preset recovery");
  ensure(!valid.recovered && valid.presetId==="recent-7d","receipt valid preset");

  const now = 1_800_000_000_000;
  const noPacket = reconcileQl261ActualOwnerPacketReceipt({packetAvailable:false}, now);
  ensure(noPacket.reconciled===false && noPacket.status==="QL261_ACTUAL_OWNER_PACKET_RECEIPT_NOT_AVAILABLE","owner packet absent");

  const noCustody = evaluateQl261IndependentSignerCustodyEvidenceGate({evidenceAvailable:false}, now);
  ensure(noCustody.gatePassed===false && noCustody.status==="QL261_SIGNER_CUSTODY_EVIDENCE_NOT_AVAILABLE","custody evidence absent");

  const proofMissing = prepareQl261SourceProofPublicationReadiness({
    observedMainSha:"5b30613d6ccd27de0661b78bd657bd68cfee4a4a",
    proofHttpStatus:404
  });
  ensure(proofMissing.ready===false && proofMissing.status==="QL261_SOURCE_PROOF_PUBLICATION_NOT_READY_PROOF_MISSING","proof publication held");

  const [shell,css,theme,pkg,statusRaw,packetRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../lib/ui-theme.ts"),
    source("../package.json"),
    source("../../../docs/integration/ql261-ai-data-platform-build241-status.json"),
    source("../../../docs/integration/ql261-ai-data-platform-owner-packet-reconciliation.json"),
    source("../../../docs/BUILD_241_REPAIR_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_RECOVERY_QL261.md")
  ]);

  ensure(shell.includes("Build 241 · Operations Command"),"Build 241 shell label");
  for (const token of ["Front End","I.T.","Management","Statistical","System Status"]) ensure(shell.includes(token),"shell nav "+token);
  ensure(css.includes("Build 241 — Operations Command visual system"),"visual system CSS");
  ensure(css.includes("--ops-violet") && css.includes("--ops-blue") && css.includes("--ops-gold"),"visual tokens");
  ensure(theme.includes("Operations Command"),"theme label");
  ensure(pkg.includes("verify-build-241-repair-persistence-renewal-search-receipt-recovery-ql261.ts"),"registered verifier");

  const status=JSON.parse(statusRaw), packet=JSON.parse(packetRaw);
  ensure(status.source_A_sha==="5b30613d6ccd27de0661b78bd657bd68cfee4a4a","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41089596533","source CI");
  ensure(status.actual_owner_packet_receipt_reconciliation==="QL261_ACTUAL_OWNER_PACKET_RECEIPT_NOT_AVAILABLE","packet status");
  ensure(status.independent_signer_custody_evidence_gate==="QL261_SIGNER_CUSTODY_EVIDENCE_NOT_AVAILABLE","custody status");
  ensure(status.source_proof_A_to_B_publication_readiness==="QL261_SOURCE_PROOF_PUBLICATION_NOT_READY_PROOF_MISSING","proof readiness");
  ensure(status.immutable_proof_http_status===404 && status.proof_B_publication_attempted===false,"proof remains missing");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN" && status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.connection_state==="DISCONNECTED / HOLD" && status.live_pilot_holds===12,"connection held");

  ensure(packet.packet_available===false && packet.reconciled===false,"packet unavailable truth");
  ensure(packet.owner_authorization==="NOT_GIVEN" && packet.network_test_authorized===false,"packet does not authorize");
  ensure(packet.custody_verified===false,"packet does not prove custody");

  const lower=doc.toLowerCase();
  for(const token of [
    "repair preset persistence","renewal recovery search","receipt preset recovery",
    "actual owner packet","independent signer-custody","source-proof a→b",
    "http 404","not_given","not_run","disconnected / hold","operations command"
  ]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 241 recovery, QL-261 evidence gates and Operations Command visual-system verification passed.");
}
void main();
