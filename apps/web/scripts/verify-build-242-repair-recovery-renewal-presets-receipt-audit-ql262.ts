import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  const repaired=recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-repair");
  const valid=recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(repaired.recovered&&repaired.presetId==="all"&&Boolean(repaired.reason),"repair recovery");
  ensure(!valid.recovered&&valid.presetId==="recent-7d","repair valid preset");

  const renewalIds=INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(renewalIds.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","renewal presets");
  ensure(interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","renewal 24h");
  ensure(interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query==="all","renewal recovered-all");

  const first=createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"receipt-242-a",createdAt:1_800_000_000_000,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered unsupported receipt preset."
  });
  const second=createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"receipt-242-b",createdAt:1_800_000_001_000,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered receipt preset."
  });
  const audit=prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
    prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],first),second
  );
  ensure(audit.length===2&&audit[0]?.auditId==="receipt-242-b","receipt recovery audit newest-first");

  const [shell,css,frontEnd,itPage,management,statistical,statusPage,pkg,proof,qv,statusRaw,freshRaw,custodyRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/data-library/page.tsx"),
    source("../app/connectors/page.tsx"),
    source("../app/page.tsx"),
    source("../app/production-learning/page.tsx"),
    source("../app/integration-delivery/page.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql262-ai-data-platform-build242-status.json"),
    source("../../../docs/integration/ql262-ai-data-platform-owner-packet-freshness.json"),
    source("../../../docs/integration/ql262-ai-data-platform-signer-custody-receipt-audit.json"),
    source("../../../docs/BUILD_242_REPAIR_RECOVERY_RENEWAL_PRESETS_RECEIPT_AUDIT_QL262.md")
  ]);

  ensure(shell.includes("Build 242 · Operations Command"),"Build 242 shell");
  ensure(shell.includes('href="/data-library">Front End')&&shell.includes('href="/connectors">I.T.')&&shell.includes('href="/">Management')&&shell.includes('href="/production-learning">Statistical')&&shell.includes('href="/integration-delivery">System Status'),"five command routes");
  ensure(css.includes("Build 242 — individual Operations Command screens"),"Build 242 visual CSS");
  ensure(frontEnd.includes("opsCommandScreen--frontEnd")&&frontEnd.includes("Operations Command Front End"),"Front End screen");
  ensure(itPage.includes("opsCommandScreen--it")&&itPage.includes("Operations Command I.T."),"I.T. screen");
  ensure(management.includes("opsCommandScreen--management")&&management.includes("Operations Command Management"),"Management screen");
  ensure(statistical.includes("opsCommandScreen--statistical")&&statistical.includes("Operations Command Statistical"),"Statistical screen");
  ensure(statusPage.includes("opsCommandScreen--status")&&statusPage.includes("Operations Command System Status"),"Status screen");
  ensure(pkg.includes("verify-build-242-repair-recovery-renewal-presets-receipt-audit-ql262.ts"),"registered");

  for(const token of [
    "enforceQl262OwnerPacketFreshness",
    "auditQl262IndependentSignerCustodyEvidenceReceipts",
    "preflightQl262SourceProofPublication",
    "QL262_OWNER_PACKET_FRESHNESS_NOT_AVAILABLE",
    "QL262_SIGNER_CUSTODY_RECEIPT_AUDIT_NOT_AVAILABLE",
    "QL262_SOURCE_PROOF_PUBLICATION_PREFLIGHT_NOT_READY_PROOF_MISSING"
  ]) ensure(proof.includes(token),"QL262 source "+token);
  ensure(qv.includes("QL-262 owner packet freshness, signer-custody receipt audit and publication preflight"),"QL262 fixture");

  const status=JSON.parse(statusRaw), freshness=JSON.parse(freshRaw), custody=JSON.parse(custodyRaw);
  ensure(status.source_A_sha==="7f32e1bf82312f890bb6b37d9461d22deded26d1","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41106073456","source CI");
  ensure(status.source_ci_conclusion==="success","source CI success");
  ensure(status.owner_packet_freshness==="QL262_OWNER_PACKET_FRESHNESS_NOT_AVAILABLE","owner freshness");
  ensure(status.signer_custody_receipt_audit==="QL262_SIGNER_CUSTODY_RECEIPT_AUDIT_NOT_AVAILABLE","custody audit");
  ensure(status.source_proof_publication_preflight==="QL262_SOURCE_PROOF_PUBLICATION_PREFLIGHT_NOT_READY_PROOF_MISSING","proof preflight");
  ensure(status.immutable_proof_http_status===404&&status.proof_B_publication_attempted===false,"proof missing");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.connection_state==="DISCONNECTED / HOLD"&&status.live_pilot_holds===12,"connection held");

  ensure(freshness.packet_available===false&&freshness.fresh===false,"freshness unavailable truth");
  ensure(freshness.owner_authorization==="NOT_GIVEN"&&freshness.network_test_authorized===false,"freshness no auth");

  ensure(custody.evidence_available===false&&custody.audit_passed===false,"custody audit unavailable truth");
  ensure(custody.activation_allowed===false&&custody.authenticated_gateway_gets==="NOT_RUN","custody audit held");

  const lower=doc.toLowerCase();
  for(const token of [
    "repair recovery","renewal presets","receipt recovery audit","owner-packet freshness",
    "signer-custody evidence receipt audit","source-proof publication preflight","http 404",
    "front end","i.t.","management","statistical","system status","not_given","not_run","disconnected / hold"
  ]) ensure(lower.includes(token),"doc "+token);

  console.log("Build 242 recovery cycle, QL-262 gates and individual Operations Command screen verification passed.");
}
void main();
