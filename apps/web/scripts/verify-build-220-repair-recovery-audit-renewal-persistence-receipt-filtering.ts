import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const first =
    createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "repair-newest-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-repair-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported newest repair preset."
    });
  const second =
    createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "repair-newest-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-repair-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered newest repair preset to supported value."
    });

  const repairRecoveryAudit =
    prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    repairRecoveryAudit.length === 2 &&
      repairRecoveryAudit[0]?.auditId === "repair-newest-recovery-2" &&
      repairRecoveryAudit[1]?.auditId === "repair-newest-recovery-1",
    "Build 220 newest repair recovery audit must retain newest-first evidence."
  );

  assert(
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
      sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired") === "all" &&
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "renewal-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset"
      ),
    "Build 220 newest renewal preset persistence must use a dedicated sanitized local namespace."
  );

  const now = 1_800_000_000_000;
  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "receipt-newest-recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-a",
      recoveredPresetId: "all",
      reason: "Recent newest receipt preset recovery."
    },
    {
      version: 1,
      auditId: "receipt-newest-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-b",
      recoveredPresetId: "recent-7d",
      reason: "Weekly newest receipt preset recovery."
    },
    {
      version: 1,
      auditId: "receipt-newest-old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-c",
      recoveredPresetId: "all",
      reason: "Old newest receipt preset recovery."
    }
  ];

  assert(
    filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      receiptAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "receipt-newest-recent" &&
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "receipt-newest-recent,receipt-newest-week" &&
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "all",
        now
      ).length === 3,
    "Build 220 newest receipt recovery audit filtering must support all, 24h and 7d while preserving order."
  );

  const [insights, shell, css, help, pkg, verify219, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-219-repair-recovery-renewal-presets-receipt-recovery-audit.ts"),
    source("../../../docs/BUILD_220_REPAIR_RECOVERY_AUDIT_RENEWAL_PERSISTENCE_RECEIPT_FILTERING.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter"
  ]) {
    assert(insights.includes(token), "Build 220 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Newest repair search-preset recovery audit") &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit") &&
      insights.includes("applied and saved locally") &&
      insights.includes("Newest receipt recovery age"),
    "Build 220 must expose repair recovery evidence, persist renewal presets and filter newest receipt recovery evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 220 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-persistence",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 220 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 220 repair recovery audit, renewal preset persistence, receipt recovery audit filtering & QL-245 evidence return"),
    "Help Center must register the Build 220 help group."
  );

  assert(shell.includes("Marble Standard"), "Build 220 verifier must remain forward-compatible with later shell labels.");

  assert(
    verify219.includes('shell.includes("Marble Standard")') &&
      !verify219.includes('shell.includes("Build 219 · Marble Standard")'),
    "Build 219 verifier must remain forward-compatible after Build 220."
  );

  assert(
    pkg.includes("verify-build-220-repair-recovery-audit-renewal-persistence-receipt-filtering.ts"),
    "Build 220 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset persistence") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit filtering") &&
      docLower.includes("rls"),
    "Build 220 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log("Build 220 repair recovery audit, renewal preset persistence and receipt recovery filtering verification passed.");
}

void main();
