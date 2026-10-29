import { readFile } from "node:fs/promises";

import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  ensure(
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired") === "all" &&
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("recovery-audit-repair"),
    "Build 224 repair preset persistence must remain sanitized and browser-local."
  );

  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    { version: 1, auditId: "renewal-alpha", createdAt: 1_800_000_000_000, requestedPresetId: "retired-alpha", recoveredPresetId: "all", reason: "Recovered alpha renewal preset." },
    { version: 1, auditId: "renewal-beta", createdAt: 1_799_999_999_000, requestedPresetId: "retired-beta", recoveredPresetId: "recent-7d", reason: "Recovered beta renewal preset." }
  ];
  ensure(
    searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewalAudit, "alpha")[0]?.auditId === "renewal-alpha" &&
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewalAudit, "recent-7d")[0]?.auditId === "renewal-beta" &&
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewalAudit, "").length === 2,
    "Build 224 renewal recovery search must match IDs, preset IDs and reasons."
  );

  const repaired = recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-receipt");
  ensure(repaired.recovered && repaired.presetId === "all" && Boolean(repaired.reason), "Build 224 receipt preset recovery must fail safe to All.");

  const [shell, pkg, verify223, sourceProof, ql246Verify, doc] = await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./verify-build-223-recovery-presets-renewal-filtering-receipt-persistence-ql248.ts"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/BUILD_224_RECOVERY_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_REPAIR_QL248_HARDENING.md")
  ]);

  ensure(shell.includes("Marble Standard"), "Current shell must retain the Marble Standard design system.");
  ensure(verify223.includes('shell.includes("Marble Standard")'), "Build 223 verifier must remain available.");
  ensure(pkg.includes("verify-build-224-recovery-persistence-renewal-search-receipt-repair-ql248-hardening.ts"), "Build 224 verifier must be registered.");

  for (const token of [
    "requiredRowVersion",
    "row.sourceRevision === row.proofCommitSha",
    "p.source_revision !== row.sourceRevision",
    "p.ci_run_url !== row.ciRunUrl",
    "sourceCiRunUrl"
  ]) {
    ensure(sourceProof.includes(token), "Build 224 QL-248 hardening missing: " + token);
  }

  for (const token of [
    "QL-248 v2 manifest separates source revision from proof commit",
    "must not fetch invalid v2 manifest",
    "must not fetch mixed-version manifest",
    "SIGNED_SOURCE_SCOPE_OR_FRESHNESS_INVALID"
  ]) {
    ensure(ql246Verify.includes(token), "Build 224 v2 fixture hardening missing: " + token);
  }

  const lower = doc.toLowerCase();
  for (const token of ["does not", "not given", "disconnected / hold", "no direct database sharing"]) {
    ensure(lower.includes(token), "Build 224 documentation missing safety boundary: " + token);
  }

  console.log("Build 224 recovery cycle and QL-248 v2 provenance hardening verification passed.");
}

void main();
