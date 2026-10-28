import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repaired =
    recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "retired-newest-repair-view"
    );
  const repairValid =
    recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );

  assert(
    repaired.recovered &&
      repaired.presetId === "all" &&
      repaired.reason?.includes("no longer supported") &&
      !repairValid.recovered &&
      repairValid.presetId === "recent-7d",
    "Build 213 newest repair preset recovery must repair unsupported persisted IDs safely."
  );

  const renewalPresetIds =
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );

  assert(
    renewalPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recent-24h"
      ).ageFilter === "24h" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recent-7d"
      ).ageFilter === "7d" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recovered-all"
      ).query === "all" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recovery-reasons"
      ).query === "recovered",
    "Build 213 newest renewal recovery search presets must map deterministic age/search views."
  );

  const first =
    createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "receipt-newest-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-receipt-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported newest receipt preset."
    });
  const second =
    createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "receipt-newest-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-receipt-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered newest receipt preset to supported value."
    });

  const receiptRecoveryAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
        [],
        first
      ),
      second
    );

  assert(
    receiptRecoveryAudit.length === 2 &&
      receiptRecoveryAudit[0]?.auditId === "receipt-newest-recovery-2" &&
      receiptRecoveryAudit[1]?.auditId === "receipt-newest-recovery-1",
    "Build 213 newest receipt recovery audit must retain newest-first evidence."
  );

  const [insights, shell, css, help, pkg, verify212, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-212-repair-persistence-renewal-search-receipt-recovery.ts"),
    source("../../../docs/BUILD_213_REPAIR_RECOVERY_RENEWAL_PRESETS_RECEIPT_RECOVERY_AUDIT.md")
  ]);

  for (const token of [
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice",
    "INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit"
  ]) {
    assert(insights.includes(token), "Build 213 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Repair search-preset recovery audit search preset recovery audit search preset recovered") &&
      insights.includes("Renewal search-preset recovery audit search preset recovery audit search presets") &&
      insights.includes("Newest receipt search-preset recovery audit") &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit"),
    "Build 213 must visibly recover repair presets, apply renewal presets and expose receipt recovery evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    ".interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit"
  ]) {
    assert(css.includes(selector), "Build 213 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 213 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 213 repair recovery preset recovery, renewal recovery search presets & receipt recovery audit"),
    "Help Center must register the Build 213 help group."
  );

  assert(shell.includes("Marble Standard"), "Build 213 verifier must remain forward-compatible with later shell labels.");

  assert(
    verify212.includes('shell.includes("Marble Standard")') &&
      !verify212.includes('shell.includes("Build 212 · Marble Standard")'),
    "Build 212 verifier must remain forward-compatible after Build 213."
  );

  assert(
    pkg.includes("verify-build-213-repair-recovery-renewal-presets-receipt-recovery-audit.ts"),
    "Build 213 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search presets") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit") &&
      docLower.includes("rls"),
    "Build 213 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log("Build 213 repair preset recovery, renewal recovery presets and receipt recovery audit verification passed.");
}

void main();
