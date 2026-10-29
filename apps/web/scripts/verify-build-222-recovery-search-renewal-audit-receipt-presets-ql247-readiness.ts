import { readFile } from "node:fs/promises";

import {
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    { version: 1, auditId: "repair-alpha", createdAt: 1_800_000_000_000, requestedPresetId: "retired-alpha", recoveredPresetId: "all", reason: "Recovered alpha preset." },
    { version: 1, auditId: "repair-beta", createdAt: 1_799_999_999_000, requestedPresetId: "retired-beta", recoveredPresetId: "recent-7d", reason: "Recovered beta preset." }
  ];

  assert(
    searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repairAudit, "alpha")[0]?.auditId === "repair-alpha" &&
    searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repairAudit, "recent-7d")[0]?.auditId === "repair-beta",
    "Build 222 repair recovery search must match IDs, preset IDs and reasons."
  );

  const first = createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId: "renewal-1", createdAt: 1_800_000_000_000, requestedPresetId: "retired-a", recoveredPresetId: "all", reason: "Recovered unsupported renewal preset."
  });
  const second = createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
    auditId: "renewal-2", createdAt: 1_800_000_001_000, requestedPresetId: "retired-b", recoveredPresetId: "recent-7d", reason: "Recovered renewal preset."
  });
  const renewalAudit = prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
    prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
    second
  );
  assert(renewalAudit.length === 2 && renewalAudit[0]?.auditId === "renewal-2", "Build 222 renewal recovery audit must remain newest-first.");

  const ids = INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => preset.id);
  assert(
    ids.join(",") === "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
    interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
    interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 222 receipt recovery presets must remain deterministic."
  );

  const [shell, pkg, verify221, ql247, ownerReturn, doc] = await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./verify-build-221-repair-filtering-renewal-recovery-receipt-search-ql246-final-gate.ts"),
    source("../../../docs/ROSEVEAR_QL247_SIX_APP_CONNECTION_TEST_HANDOFF.md"),
    source("../../../docs/integration/ql247-ai-data-platform-owner-safe-return.md"),
    source("../../../docs/BUILD_222_RECOVERY_SEARCH_RENEWAL_AUDIT_RECEIPT_PRESETS_QL247_READINESS.md")
  ]);

  assert(shell.includes("Marble Standard"), "Current shell must retain the Marble Standard design system.");
  assert(verify221.includes('shell.includes("Build 221 · Marble Standard")') || verify221.includes('shell.includes("Marble Standard")'), "Build 221 verifier must remain compatible.");
  assert(pkg.includes("verify-build-222-recovery-search-renewal-audit-receipt-presets-ql247-readiness.ts"), "Build 222 verifier must be registered.");

  for (const token of [
    "GitHub identity is not service-to-service authentication",
    "GET /api/integration/v1/health",
    "GET /api/integration/v1/capabilities",
    "seven",
    "DISCONNECTED / HOLD",
    "NOT AUTHORIZED"
  ]) {
    assert(ql247.toLowerCase().includes(token.toLowerCase()), "QL-247 handoff missing required contract token: " + token);
  }

  for (const token of ["BLOCKED", "NOT PROVISIONED", "UNVERIFIED", "NOT GIVEN", "DISCONNECTED / HOLD"]) {
    assert(ownerReturn.includes(token), "Owner-safe return missing truthful state: " + token);
  }

  const lower = doc.toLowerCase();
  for (const token of [
    "no credentials committed",
    "no production integration",
    "seven genuine denial traces",
    "not given",
    "disconnected / hold",
    "github identity"
  ]) {
    assert(lower.includes(token), "Build 222 documentation missing safety term: " + token);
  }

  console.log("Build 222 recovery cycle and QL-247 connection-test readiness verification passed.");
}

void main();
