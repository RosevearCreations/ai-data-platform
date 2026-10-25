import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const first =
    createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "repair-search-preset-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-repair-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported repair-preset recovery audit search preset."
    });
  const second =
    createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "repair-search-preset-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-repair-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered repair-preset recovery audit search preset."
    });
  const repairRecoveryAudit =
    prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    repairRecoveryAudit.length === 2 &&
      repairRecoveryAudit[0]?.auditId === "repair-search-preset-recovery-2" &&
      repairRecoveryAudit[1]?.auditId === "repair-search-preset-recovery-1",
    "Build 154 repair-preset search preset recovery audit must retain newest-first evidence."
  );

  assert(
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
      sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId("retired") === "all" &&
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "renewal-recovery-audit-preset-recovery-audit-search-preset"
      ),
    "Build 154 renewal preset-recovery audit search preset persistence must use a dedicated sanitized local namespace."
  );

  const now = 1_800_000_000_000;
  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "receipt-recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-a",
      recoveredPresetId: "all",
      reason: "Recent receipt search-preset recovery."
    },
    {
      version: 1,
      auditId: "receipt-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-b",
      recoveredPresetId: "recent-7d",
      reason: "Weekly receipt search-preset recovery."
    },
    {
      version: 1,
      auditId: "receipt-old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-c",
      recoveredPresetId: "all",
      reason: "Old receipt search-preset recovery."
    }
  ];

  assert(
    filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      receiptAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "receipt-recent" &&
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "receipt-recent,receipt-week" &&
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "all",
        now
      ).length === 3,
    "Build 154 receipt search-preset recovery audit filtering must support all, 24h and 7d while preserving order."
  );

  const [insights, shell, css, help, pkg, verify153, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-153-repair-recovery-renewal-presets-receipt-recovery-audit.ts"),
    source("../../../docs/BUILD_154_REPAIR_RECOVERY_AUDIT_RENEWAL_PERSISTENCE_RECEIPT_FILTERING.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter"
  ]) {
    assert(insights.includes(token), "Build 154 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Repair-preset recovery audit search preset recovery audit") &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit") &&
      insights.includes("writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)") &&
      insights.includes("clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset();") &&
      insights.includes("selected preset persists in this browser") &&
      insights.includes("No receipt preset-repair search preset recoveries match the selected age filter."),
    "Build 154 must expose repair recovery evidence, persist renewal presets, and filter receipt recovery evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAudit",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 154 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-persistence",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 154 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 154 repair preset recovery audit, renewal preset persistence & receipt recovery audit filtering"
    ),
    "Help Center must register the Build 154 help group."
  );

  assert(
    shell.includes("Build 154 · Marble Standard"),
    "Build 154 shell must expose the current interface build."
  );

  assert(
    verify153.includes('shell.includes("Marble Standard")') &&
      !verify153.includes('shell.includes("Build 153 · Marble Standard")'),
    "Build 153 verifier must remain forward-compatible after the Build 154 shell label."
  );

  assert(
    pkg.includes("verify-build-154-repair-recovery-audit-renewal-persistence-receipt-filtering.ts"),
    "Build 154 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset persistence") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit filtering") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 154 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 154 repair recovery audit, renewal preset persistence and receipt recovery audit filtering verification passed."
  );
}

void main();
