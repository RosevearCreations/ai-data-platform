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
  ensure(repaired.recovered&&repaired.presetId==="all"&&Boolean(repaired.reason),"repair preset recovery");
  ensure(!valid.recovered&&valid.presetId==="recent-7d","repair valid preset");

  const ids=INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(p=>p.id);
  ensure(ids.join(",")==="all,recent-24h,recent-7d,recovered-all,recovery-reasons","renewal preset IDs");
  ensure(interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter==="24h","renewal 24h");
  ensure(interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query==="all","renewal recovered-all");

  const first=createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"receipt-1",createdAt:1_800_000_000_000,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered unsupported receipt preset."
  });
  const second=createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId:"receipt-2",createdAt:1_800_000_001_000,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered receipt preset."
  });
  const audit=prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
    prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],first),second
  );
  ensure(audit.length===2&&audit[0]?.auditId==="receipt-2","receipt audit newest-first");

  const [shell,pkg,proof,qv,statusRaw,contractRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql258-ai-data-platform-build236-status.json"),
    source("../../../docs/integration/ql258-ai-data-platform-sanitized-owner-action-contract.json"),
    source("../../../docs/BUILD_236_REPAIR_RECOVERY_RENEWAL_PRESETS_RECEIPT_AUDIT_QL258.md")
  ]);

  ensure(shell.includes("Build 236 · Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-236-repair-recovery-renewal-presets-receipt-audit-ql258.ts"),"registered");

  for(const t of [
    "validateQl258SanitizedOwnerActionPacket",
    "refreshQl258ImmutableProofStatus",
    "evaluateQl258CustodySourceActivationReadiness",
    "OWNER_REPORTS_DONE_NOT_VERIFIED",
    "QL258_IMMUTABLE_PROOF_NOT_PUBLISHED",
    "HOLD_QL258_CUSTODY_SOURCE_ACTIVATION_NOT_READY"
  ]) ensure(proof.includes(t),"missing "+t);
  ensure(qv.includes("QL-258 sanitized owner packet, immutable proof refresh and custody-source readiness"),"QL258 fixture");

  const status=JSON.parse(statusRaw), contract=JSON.parse(contractRaw);
  ensure(status.observed_main_sha==="fefb13e63487e6685555ed52fcdb4573838513e7","observed main");
  ensure(status.source_A_sha==="fefb13e63487e6685555ed52fcdb4573838513e7","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/40996394692","source CI");
  ensure(status.source_ci_conclusion==="success","source CI success");
  ensure(status.ql265_source_connection_interface==="PRESERVED","QL265 preserved");
  ensure(status.ql258_sanitized_owner_action_packet==="NOT_RECEIVED","owner packet truth");
  ensure(status.immutable_proof_refresh==="HTTP 404","proof refresh");
  ensure(status.custody_source_activation_readiness==="HELD_NOT_READY","custody source held");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.live_pilot_holds===12&&status.connection_state==="DISCONNECTED / HOLD","connection held");

  ensure(contract.progress.length===7,"seven progress answers");
  ensure(contract.allowed_progress_values.join(",")==="NOT_ATTEMPTED,ATTEMPTED_NOT_VERIFIED,OWNER_REPORTS_DONE_NOT_VERIFIED","fixed enums");
  ensure(contract.owner_authorization==="NOT_GIVEN"&&contract.connection==="DISCONNECTED"&&contract.live_pilot_holds===12,"contract safety");
  ensure(contract.private_identity_fields_allowed===false&&contract.secret_fields_allowed===false&&contract.unknown_fields_allowed===false,"privacy contract");

  const lower=doc.toLowerCase();
  for(const t of [
    "fefb13e63487e6685555ed52fcdb4573838513e7",
    "40996394692","http 404","owner_reports_done_not_verified",
    "not_received","held_not_ready","not_given","not_run",
    "disconnected / hold","no new environment variables or bindings"
  ]) ensure(lower.includes(t),"doc "+t);

  console.log("Build 236 recovery cycle and QL-258 owner/proof/custody-source verification passed.");
}
void main();
