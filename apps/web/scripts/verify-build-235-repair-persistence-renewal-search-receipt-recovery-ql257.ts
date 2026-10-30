import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  ensure(
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h")==="recent-24h" &&
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recovery-reasons")==="recovery-reasons" &&
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all" &&
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("recovery-audit-repair"),
    "repair preset persistence"
  );

  const renewal: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]=[
    {version:1,auditId:"renewal-alpha",createdAt:1_800_000_000_000,requestedPresetId:"retired-alpha",recoveredPresetId:"all",reason:"Recovered alpha renewal preset."},
    {version:1,auditId:"renewal-beta",createdAt:1_799_999_999_000,requestedPresetId:"retired-beta",recoveredPresetId:"recent-7d",reason:"Recovered beta renewal preset."}
  ];
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"alpha")[0]?.auditId==="renewal-alpha","renewal search alpha");
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"recent-7d")[0]?.auditId==="renewal-beta","renewal search preset");
  ensure(searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewal,"").length===2,"renewal blank search");

  const repaired=recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-receipt");
  const valid=recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(repaired.recovered&&repaired.presetId==="all"&&Boolean(repaired.reason),"receipt preset recovery");
  ensure(!valid.recovered&&valid.presetId==="recent-7d","receipt valid preset");

  const [shell,pkg,proof,qv,statusRaw,ql258Raw,ownerRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql257-ai-data-platform-build235-status.json"),
    source("../../../docs/integration/ql258-ai-data-platform-owner-action-intake.json"),
    source("../../../docs/integration/ql257-ai-data-platform-owner-status.json"),
    source("../../../docs/BUILD_235_REPAIR_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_RECOVERY_QL257.md")
  ]);

  ensure(shell.includes("Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-235-repair-persistence-renewal-search-receipt-recovery-ql257.ts"),"registered");

  for(const t of [
    "intakeQl257IndependentOwnerStatus",
    "reconcileQl257CustodyRoleApproval",
    "prepareQl257ProofBPublicationAuthorization",
    "OWNER_REPORTS_DONE_NOT_VERIFIED",
    "HOLD_QL257_CUSTODY_ROLE_APPROVAL_NOT_RECONCILED",
    "QL257_PROOF_B_PUBLICATION_AUTHORIZED_EXECUTION_NOT_RUN"
  ]) ensure(proof.includes(t),"missing "+t);
  ensure(qv.includes("QL-257 owner status, custody-role approval and proof-B publication authorization"),"QL257 fixture");

  const status=JSON.parse(statusRaw), ql258=JSON.parse(ql258Raw), owner=JSON.parse(ownerRaw);
  ensure(status.source_A_sha==="24c54b189f41c2473dad58af9847a5c28dff0483","source A");
  ensure(status.matching_green_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/40939115385","source CI");
  ensure(status.source_ci_conclusion==="success","source CI conclusion");
  ensure(status.ql257_owner_status_intake==="NOT_RECEIVED_FROM_INDEPENDENT_OWNER_PROCESS","owner intake truth");
  ensure(status.ql258_sanitized_owner_action_packet==="NOT_RECEIVED","QL258 packet truth");
  ensure(status.custody_role_approval_reconciliation==="HELD_NOT_RECONCILED","custody reconciliation");
  ensure(status.immutable_proof_status==="HTTP 404"&&!status.proof_B_publication_attempted,"proof truth");
  ensure(status.proof_B_publication_authorization==="HELD_CUSTODY_APPROVAL_MISSING","publication authorization");
  ensure(status.owner_test_only_authorization==="NOT_GIVEN"&&status.authenticated_gateway_gets==="NOT_RUN","gateway held");
  ensure(status.live_pilot_holds===12&&status.connection_state==="DISCONNECTED / HOLD","live holds");

  ensure(ql258.sanitized_packet_received===false&&ql258.owner_report_state==="NOT_RECEIVED","QL258 intake absent");
  ensure(ql258.fixed_enum_validation_enabled===true&&ql258.unknown_fields_rejected===true,"QL258 fail closed");
  ensure(ql258.owner_authorization==="NOT_GIVEN"&&ql258.connection==="DISCONNECTED"&&ql258.live_pilot_holds===12,"QL258 safety state");
  ensure(ql258.network_test_authorized===false&&ql258.proof_publication_authorized===false,"QL258 no authorization");

  ensure(owner.private_key_custodian_role==="NOT_ASSIGNED","owner custodian");
  ensure(owner.distinct_independent_witness==="NOT_ASSIGNED","owner witness");
  ensure(owner.separate_reviewer==="NOT_ASSIGNED","owner reviewer");
  ensure(owner.owner_test_only_authorization==="NOT_GIVEN"&&owner.connection==="DISCONNECTED / HOLD","owner held");

  const lower=doc.toLowerCase();
  for(const t of [
    "owner_reports_done_not_verified","not_received_from_independent_owner_process",
    "not_received","http 404","held_custody_approval_missing","not_given","not_run",
    "disconnected / hold","no new environment variables or bindings"
  ]) ensure(lower.includes(t),"doc "+t);

  console.log("Build 235 recovery cycle and QL-257 owner-status/proof authorization verification passed.");
}
void main();
