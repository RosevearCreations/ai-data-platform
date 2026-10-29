import { readFile } from "node:fs/promises";

import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairPresetIds =
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  ensure(
    repairPresetIds.join(",") === "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all",
    "Build 223 repair search presets must remain deterministic."
  );

  const now = 1_800_000_000_000;
  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    { version: 1, auditId: "renewal-new", createdAt: now - 60 * 60 * 1000, requestedPresetId: "retired-new", recoveredPresetId: "all", reason: "Recovered newest renewal preset." },
    { version: 1, auditId: "renewal-week", createdAt: now - 3 * 24 * 60 * 60 * 1000, requestedPresetId: "retired-week", recoveredPresetId: "recent-7d", reason: "Recovered weekly renewal preset." },
    { version: 1, auditId: "renewal-old", createdAt: now - 9 * 24 * 60 * 60 * 1000, requestedPresetId: "retired-old", recoveredPresetId: "all", reason: "Recovered old renewal preset." }
  ];
  ensure(
    filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewalAudit, "24h", now).length === 1 &&
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewalAudit, "7d", now).length === 2 &&
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(renewalAudit, "all", now).length === 3,
    "Build 223 renewal recovery filtering must support all, 24h and 7d."
  );

  ensure(
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("receipt-recovery-audit") &&
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d") === "recent-7d" &&
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired") === "all",
    "Build 223 receipt preset persistence must use a dedicated safe namespace."
  );

  const [shell, pkg, verify222, sourceProof, ql248, doc] = await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./verify-build-222-recovery-search-renewal-audit-receipt-presets-ql247-readiness.ts"),
    source("./ql246-source-proof.mjs"),
    source("../../../docs/ROSEVEAR_QL248_PROOF_COMMIT_AMENDMENT_HANDOFF.md"),
    source("../../../docs/BUILD_223_RECOVERY_PRESETS_RENEWAL_FILTERING_RECEIPT_PERSISTENCE_QL248.md")
  ]);

  ensure(shell.includes("Marble Standard"), "Current shell must retain the Marble Standard design system.");
  ensure(verify222.includes('shell.includes("Marble Standard")'), "Build 222 verifier must remain available.");
  ensure(pkg.includes("verify-build-223-recovery-presets-renewal-filtering-receipt-persistence-ql248.ts"), "Build 223 verifier must be registered.");

  for (const token of ["proofCommitSha", "proofSha256", "ciRunUrl", "trusted-pins.v2", "rowProofCommitSha", "rowProofSha256"]) {
    ensure(sourceProof.includes(token), "QL-248 consumer amendment missing: " + token);
  }
  ensure(
    sourceProof.includes("p.source_revision !== row.sourceRevision") &&
      sourceProof.includes("p.ci_run_url !== row.ciRunUrl"),
    "QL-248 consumer must compare signed source revision and CI against independently supplied source identity."
  );

  for (const token of ["sourceRevision", "proofCommitSha", "proofSha256", "DISCONNECTED / HOLD", "NOT GIVEN"]) {
    ensure(ql248.includes(token), "QL-248 handoff copy missing: " + token);
  }

  const lower = doc.toLowerCase();
  for (const token of ["does not start phase-b", "not given", "disconnected / hold", "no direct database sharing"]) {
    ensure(lower.includes(token), "Build 223 documentation missing safety boundary: " + token);
  }

  console.log("Build 223 recovery cycle and QL-248 two-SHA consumer amendment verification passed.");
}

void main();
