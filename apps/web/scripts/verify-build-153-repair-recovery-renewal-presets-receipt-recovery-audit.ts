import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repaired =
    recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
      "retired-repair-view"
    );
  const repairValid =
    recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );
  assert(
    repaired.recovered &&
      repaired.presetId === "all" &&
      repaired.reason?.includes("no longer supported") &&
      !repairValid.recovered &&
      repairValid.presetId === "recent-7d",
    "Build 153 repair-preset recovery audit search preset recovery must repair unsupported persisted IDs to All repair-preset recoveries."
  );

  const renewalPresetIds =
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  assert(
    renewalPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 153 renewal preset-recovery audit search presets must map deterministic age/search views."
  );

  const first =
    createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "receipt-repair-preset-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-receipt-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported receipt preset-repair audit search preset."
    });
  const second =
    createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "receipt-repair-preset-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-receipt-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered to a supported receipt preset-repair audit search preset."
    });
  const receiptRecoveryAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    receiptRecoveryAudit.length === 2 &&
      receiptRecoveryAudit[0]?.auditId === "receipt-repair-preset-recovery-2" &&
      receiptRecoveryAudit[1]?.auditId === "receipt-repair-preset-recovery-1",
    "Build 153 receipt preset-repair search preset recovery audit must retain newest-first evidence."
  );

  const [insights, shell, css, help, pkg, verify152, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-152-repair-persistence-renewal-search-receipt-recovery.ts"),
    source("../../../docs/BUILD_153_REPAIR_RECOVERY_RENEWAL_PRESETS_RECEIPT_RECOVERY_AUDIT.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecovery",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice",
    "INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit"
  ]) {
    assert(insights.includes(token), "Build 153 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Repair-preset recovery audit search preset recovered") &&
      insights.includes("writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset(") &&
      insights.includes("Renewal preset-recovery audit search presets") &&
      insights.includes("setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null)") &&
      insights.includes("Receipt preset-repair audit search preset recovery audit") &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit"),
    "Build 153 must visibly recover repair presets, apply renewal recovery presets, and expose receipt search-preset recovery audit evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecovery",
    ".interfaceRenewalRecoveryAuditPresetRecoveryAuditSearchPresets",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAudit"
  ]) {
    assert(css.includes(selector), "Build 153 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-presets",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 153 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 153 repair preset recovery, renewal recovery audit search presets & receipt repair preset recovery audit"
    ),
    "Help Center must register the Build 153 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 153 shell must expose the current interface build."
  );

  assert(
    verify152.includes('shell.includes("Marble Standard")') &&
      !verify152.includes('shell.includes("Build 152 · Marble Standard")'),
    "Build 152 verifier must remain forward-compatible after the Build 153 shell label."
  );

  assert(
    pkg.includes("verify-build-153-repair-recovery-renewal-presets-receipt-recovery-audit.ts"),
    "Build 153 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery") &&
      docLower.includes("renewal recovery audit search preset recovery audit search presets") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 153 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 153 repair preset recovery, renewal recovery presets and receipt preset recovery audit verification passed."
  );
}

void main();
