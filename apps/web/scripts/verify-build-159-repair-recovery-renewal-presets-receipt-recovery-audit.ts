import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repaired =
    recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "retired-repair-view"
    );
  const repairValid =
    recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );

  assert(
    repaired.recovered &&
      repaired.presetId === "all" &&
      repaired.reason?.includes("no longer supported") &&
      !repairValid.recovered &&
      repairValid.presetId === "recent-7d",
    "Build 159 repair search-preset recovery audit search preset recovery must repair unsupported persisted IDs to All search preset recoveries."
  );

  const renewalPresetIds =
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  assert(
    renewalPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recent-24h"
      ).ageFilter === "24h" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recent-7d"
      ).ageFilter === "7d" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recovered-all"
      ).query === "all" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recovery-reasons"
      ).query === "recovered",
    "Build 159 renewal search-preset recovery audit search presets must map deterministic age/search views."
  );

  const first =
    createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "receipt-search-preset-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-receipt-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported receipt search-preset recovery audit search preset."
    });
  const second =
    createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "receipt-search-preset-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-receipt-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered to a supported receipt search-preset recovery audit search preset."
    });

  const receiptRecoveryAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
        [],
        first
      ),
      second
    );

  assert(
    receiptRecoveryAudit.length === 2 &&
      receiptRecoveryAudit[0]?.auditId === "receipt-search-preset-recovery-2" &&
      receiptRecoveryAudit[1]?.auditId === "receipt-search-preset-recovery-1",
    "Build 159 receipt search-preset recovery audit must retain newest-first evidence."
  );

  const [insights, shell, css, help, pkg, verify158, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-158-repair-persistence-renewal-search-receipt-recovery.ts"),
    source("../../../docs/BUILD_159_REPAIR_RECOVERY_RENEWAL_PRESETS_RECEIPT_RECOVERY_AUDIT.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice",
    "INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit"
  ]) {
    assert(insights.includes(token), "Build 159 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Repair search-preset recovery audit search preset recovered") &&
      insights.includes(
        "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset("
      ) &&
      insights.includes("Renewal search-preset recovery audit search presets") &&
      insights.includes(
        "setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null)"
      ) &&
      insights.includes(
        "Receipt search-preset recovery audit search preset recovery audit"
      ) &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit"),
    "Build 159 must visibly recover repair presets, apply renewal recovery presets, and expose receipt search-preset recovery audit evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecovery",
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresets",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit"
  ]) {
    assert(css.includes(selector), "Build 159 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 159 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 159 repair recovery preset recovery, renewal recovery search presets & receipt recovery audit"
    ),
    "Help Center must register the Build 159 help group."
  );

  assert(
    shell.includes("Build 159 · Marble Standard"),
    "Build 159 shell must expose the current interface build."
  );

  assert(
    verify158.includes('shell.includes("Marble Standard")') &&
      !verify158.includes('shell.includes("Build 158 · Marble Standard")'),
    "Build 158 verifier must remain forward-compatible after the Build 159 shell label."
  );

  assert(
    pkg.includes(
      "verify-build-159-repair-recovery-renewal-presets-receipt-recovery-audit.ts"
    ),
    "Build 159 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes(
        "recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery"
      ) &&
      docLower.includes(
        "renewal recovery audit search preset recovery audit search preset recovery audit search presets"
      ) &&
      docLower.includes(
        "receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit"
      ) &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 159 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 159 repair preset recovery, renewal recovery presets and receipt preset recovery audit verification passed."
  );
}

void main();
