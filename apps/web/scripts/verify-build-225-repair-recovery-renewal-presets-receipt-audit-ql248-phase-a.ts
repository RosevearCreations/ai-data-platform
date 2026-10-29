import { readFile } from "node:fs/promises";

import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repaired = recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-repair");
  const valid = recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  ensure(
    repaired.recovered && repaired.presetId === "all" && Boolean(repaired.reason) &&
    !valid.recovered && valid.presetId === "recent-7d",
    "Build 225 repair preset recovery must repair unsupported IDs safely."
  );

  const renewalIds = INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => preset.id);
  ensure(
    renewalIds.join(",") === "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
    interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
    interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all",
    "Build 225 renewal recovery presets must remain deterministic."
  );

  const first = createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId: "receipt-1", createdAt: 1_800_000_000_000, requestedPresetId: "retired-a", recoveredPresetId: "all", reason: "Recovered unsupported receipt preset."
  });
  const second = createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId: "receipt-2", createdAt: 1_800_000_001_000, requestedPresetId: "retired-b", recoveredPresetId: "recent-7d", reason: "Recovered receipt preset."
  });
  const audit = prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
    prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
    second
  );
  ensure(audit.length === 2 && audit[0]?.auditId === "receipt-2", "Build 225 receipt recovery audit must remain newest-first.");

  const [shell, pkg, verify224, sourceProof, ql246Verify, doc] = await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./verify-build-224-recovery-persistence-renewal-search-receipt-repair-ql248-hardening.ts"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/BUILD_225_REPAIR_RECOVERY_RENEWAL_PRESETS_RECEIPT_AUDIT_QL248_PHASE_A.md")
  ]);

  ensure(shell.includes("Build 225 · Marble Standard"), "Build 225 shell label must be current.");
  ensure(verify224.includes('shell.includes("Build 224 · Marble Standard")'), "Build 224 verifier must remain available.");
  ensure(pkg.includes("verify-build-225-repair-recovery-renewal-presets-receipt-audit-ql248-phase-a.ts"), "Build 225 verifier must be registered.");

  for (const token of [
    "ql248PhaseAProofOriginScaffold",
    "SIX_SOURCE_PHASE_A_PROVENANCE_COMPLETE_AUTH_TESTING_HELD",
    "HOLD_PHASE_A_MANIFEST_INCOMPLETE",
    "sourceCiRunUrl",
    "publicProofUrl"
  ]) {
    ensure(sourceProof.includes(token), "Build 225 proof-origin scaffold missing: " + token);
  }

  for (const token of [
    "QL-248 Phase-A proof-origin scaffold requires six complete v2 source/proof rows",
    "phaseA.sourceCount, 6",
    "held.complete, false"
  ]) {
    ensure(ql246Verify.includes(token), "Build 225 six-source fixture missing: " + token);
  }

  const lower = doc.toLowerCase();
  for (const token of ["authenticated phase-b", "not given", "disconnected", "no partial six-source set"]) {
    ensure(lower.includes(token), "Build 225 documentation missing safety/completeness boundary: " + token);
  }

  console.log("Build 225 recovery cycle and QL-248 Phase-A proof-origin completeness verification passed.");
}

void main();
