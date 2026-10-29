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

  const [shell,pkg,proof,qv,statusRaw,intakeRaw,signerRaw,doc]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql256-ai-data-platform-build233-status.json"),
    source("../../../docs/integration/ql256-ai-data-platform-independent-custody-intake.json"),
    source("../../../docs/integration/ql256-ai-data-platform-signer-custody-report.json"),
    source("../../../docs/BUILD_233_REPAIR_SEARCH_RENEWAL_AUDIT_RECEIPT_PRESETS_QL256.md")
  ]);

  ensure(shell.includes("Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-233-repair-search-renewal-audit-receipt-presets-ql256.ts"),"registered");
  for(const t of [
    "intakeQl256IndependentSignerCustodyEvidence",
    "evaluateQl256ProofBPublicationReadiness",
    "prepareQl256AuthenticatedOwnerTestOnlyDecision",
    "HOLD_QL256_INDEPENDENT_CUSTODY_EVIDENCE_NOT_VERIFIED",
    "HOLD_QL256_PROOF_B_CUSTODY_NOT_VERIFIED",
    "QL256_OWNER_TEST_DECISION_READY_FOR_EXPLICIT_APPROVAL_GATEWAY_HELD"
  ]) ensure(proof.includes(t),"missing "+t);
  ensure(qv.includes("QL-256 custody intake, proof-B readiness and owner TEST-only preparation"),"QL256 fixture");

  const status=JSON.parse(statusRaw), intake=JSON.parse(intakeRaw), signer=JSON.parse(signerRaw);
  ensure(/^[a-f0-9]{40}$/.test(status.source_A_sha),"source A");
  ensure(/^https:\/\/github\.com\/RosevearCreations\/ai-data-platform\/actions\/runs\/[0-9]+$/.test(status.matching_green_ci_run),"source CI");
  ensure(status.source_ci_conclusion==="success","source CI conclusion");
  ensure(status.signer_provisioning_decision==="SIGNER_EXISTS_CUSTODY_NOT_VERIFIED","signer state");
  ensure(status.independent_custody_evidence_intake==="NOT_AVAILABLE","custody truthfulness");
  ensure(status.current_immutable_proof_status==="HTTP 404","proof 404");
  ensure(status.proof_B_publication_readiness==="HELD_CUSTODY_NOT_VERIFIED"&&!status.proof_B_publication_attempted,"proof B held");
  ensure(status.owner_test_authorization==="NOT_GIVEN"&&status.actual_gateway_gets==="NOT_RUN"&&status.connection_state==="DISCONNECTED","gateway held");

  ensure(intake.expected_public_spki_sha256==="d16f21ab82c12760c88b1cdaa7d2fe7491148e9efd4a8762c4a0e9be137311c6","intake expected SPKI");
  ensure(intake.intake_status==="PENDING_INDEPENDENT_EVIDENCE"&&intake.private_key_material_included===false&&intake.network_test_authorized===false,"intake safety");
  ensure(/^[a-f0-9]{40}$/.test(signer.source_A_sha),"signer source A refreshed");

  const lower=doc.toLowerCase();
  for(const t of ["no such independently authenticated receipt package","does **not** sign or publish proof b","not_given","not_run","disconnected","no gateway gets while held"]) ensure(lower.includes(t),"doc "+t);

  console.log("Build 233 recovery cycle and QL-256 custody/proof-B readiness verification passed.");
}
void main();
