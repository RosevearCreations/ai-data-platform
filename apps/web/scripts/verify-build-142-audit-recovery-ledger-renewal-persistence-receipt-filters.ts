import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_FORMAT,
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY,
  MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT,
  createInterfaceRecoveryAuditPresetRecoveryAuditEntry,
  createInterfaceReceiptPresetRecoveryAuditEntry,
  filterInterfaceReceiptPresetRecoveryAudit,
  parseInterfaceRecoveryAuditPresetRecoveryAudit,
  prependInterfaceRecoveryAuditPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalHistorySearchPresetId,
  serializeInterfaceRecoveryAuditPresetRecoveryAudit
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  let recoveryAudit = [] as ReturnType<
    typeof createInterfaceRecoveryAuditPresetRecoveryAuditEntry
  >[];

  for (
    let index = 0;
    index < MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT + 3;
    index += 1
  ) {
    recoveryAudit = prependInterfaceRecoveryAuditPresetRecoveryAuditEntry(
      recoveryAudit,
      createInterfaceRecoveryAuditPresetRecoveryAuditEntry({
        auditId: "audit-preset-recovery-" + index,
        createdAt: 1_700_000_000_000 + index,
        requestedPresetId: "retired-audit-" + index,
        recoveredPresetId: "all",
        reason:
          "Recovery audit preset recovered to All recoveries because the saved preset ID is no longer supported."
      })
    );
  }

  assert(
    recoveryAudit.length ===
      MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT &&
      recoveryAudit[0]?.auditId ===
        "audit-preset-recovery-" +
          (MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT + 2) &&
      recoveryAudit.at(-1)?.auditId === "audit-preset-recovery-3",
    "Build 142 recovery-audit recovery audit must stay newest-first and bounded to ten entries."
  );

  const dedupedRecoveryAudit =
    prependInterfaceRecoveryAuditPresetRecoveryAuditEntry(
      recoveryAudit,
      recoveryAudit[2]
    );
  assert(
    dedupedRecoveryAudit.length ===
      MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT &&
      dedupedRecoveryAudit[0]?.auditId === recoveryAudit[2]?.auditId &&
      new Set(dedupedRecoveryAudit.map((entry) => entry.auditId)).size ===
        dedupedRecoveryAudit.length,
    "Build 142 recovery-audit recovery audit must deduplicate by audit ID while moving the selected event to the front."
  );

  const parsedRecoveryAudit = parseInterfaceRecoveryAuditPresetRecoveryAudit(
    serializeInterfaceRecoveryAuditPresetRecoveryAudit(dedupedRecoveryAudit)
  );
  assert(
    parsedRecoveryAudit.ok &&
      parsedRecoveryAudit.audit.format ===
        INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_FORMAT &&
      parsedRecoveryAudit.audit.entries.length === dedupedRecoveryAudit.length &&
      parsedRecoveryAudit.audit.entries[0]?.requestedPresetId ===
        dedupedRecoveryAudit[0]?.requestedPresetId,
    "Build 142 recovery-audit recovery audit must round-trip through its versioned local format."
  );

  assert(
    INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY.includes(
      "recovery-audit-preset-recovery-audit"
    ),
    "Build 142 recovery-audit recovery audit must use a dedicated browser-local namespace."
  );

  assert(
    sanitizeInterfaceRecoveryRenewalHistorySearchPresetId("expired") ===
      "expired" &&
      sanitizeInterfaceRecoveryRenewalHistorySearchPresetId("stale") ===
        "stale" &&
      sanitizeInterfaceRecoveryRenewalHistorySearchPresetId("legacy") ===
        "legacy" &&
      sanitizeInterfaceRecoveryRenewalHistorySearchPresetId("favorites") ===
        "favorites" &&
      sanitizeInterfaceRecoveryRenewalHistorySearchPresetId("unsupported") ===
        "all" &&
      INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY.includes(
        "recovery-renewal-history-search-preset"
      ),
    "Build 142 renewal-history preset persistence must sanitize IDs safely and use a dedicated browser-local namespace."
  );

  const now = 1_800_000_000_000;
  const receiptRecoveryAudit = [
    createInterfaceReceiptPresetRecoveryAuditEntry({
      auditId: "recent",
      createdAt: now - 6 * 60 * 60 * 1000,
      requestedPresetId: "recent-retired",
      recoveredPresetId: "all",
      reason: "Recovered recent preset."
    }),
    createInterfaceReceiptPresetRecoveryAuditEntry({
      auditId: "two-days",
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
      requestedPresetId: "two-day-retired",
      recoveredPresetId: "all",
      reason: "Recovered two-day preset."
    }),
    createInterfaceReceiptPresetRecoveryAuditEntry({
      auditId: "nine-days",
      createdAt: now - 9 * 24 * 60 * 60 * 1000,
      requestedPresetId: "nine-day-retired",
      recoveredPresetId: "all",
      reason: "Recovered older preset."
    })
  ];

  assert(
    filterInterfaceReceiptPresetRecoveryAudit(
      receiptRecoveryAudit,
      "all",
      now
    ).length === 3 &&
      filterInterfaceReceiptPresetRecoveryAudit(
        receiptRecoveryAudit,
        "24h",
        now
      ).map((entry) => entry.auditId).join(",") === "recent" &&
      filterInterfaceReceiptPresetRecoveryAudit(
        receiptRecoveryAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "recent,two-days",
    "Build 142 receipt-recovery audit age filters must preserve source order while selecting all, 24-hour and seven-day views."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify141, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-141-audit-recovery-renewal-presets-receipt-audit.ts"),
      source("../../../docs/BUILD_142_AUDIT_RECOVERY_AUDIT_RENEWAL_PRESET_PERSISTENCE_RECEIPT_FILTERS.md")
    ]);

  for (const token of [
    "INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_FORMAT",
    "MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT",
    "createInterfaceRecoveryAuditPresetRecoveryAuditEntry",
    "prependInterfaceRecoveryAuditPresetRecoveryAuditEntry",
    "parseInterfaceRecoveryAuditPresetRecoveryAudit",
    "INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY",
    "sanitizeInterfaceRecoveryRenewalHistorySearchPresetId",
    "InterfaceReceiptPresetRecoveryAuditAgeFilter",
    "filterInterfaceReceiptPresetRecoveryAudit"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 142 preference library missing: " + token
    );
  }

  for (const token of [
    "Recovery audit recovery audit",
    "readRecoveryAuditPresetRecoveryAudit",
    "writeRecoveryAuditPresetRecoveryAudit",
    "Export audit recovery log",
    "Clear audit recovery log",
    "readRecoveryRenewalHistorySearchPreset",
    "writeRecoveryRenewalHistorySearchPreset",
    "clearRecoveryRenewalHistorySearchPreset",
    "persistedRenewalHistoryPreset",
    "Recovery age",
    "All recovery events",
    "Last 24 hours",
    "Last 7 days",
    "filteredReceiptPresetRecoveryAudit"
  ]) {
    assert(insights.includes(token), "Build 142 Insights UI missing: " + token);
  }

  assert(
    insights.includes("createInterfaceRecoveryAuditPresetRecoveryAuditEntry") &&
      insights.includes("prependInterfaceRecoveryAuditPresetRecoveryAuditEntry") &&
      insights.includes("setRecoveryAuditPresetRecoveryAudit(recoveryAuditRecoveryAudit)") &&
      insights.includes("writeRecoveryRenewalHistorySearchPreset(preset.id)") &&
      insights.includes("setRenewalHistoryFreshnessFilter(\n      persistedRenewalHistoryPreset.freshnessFilter") &&
      insights.includes("setRenewalHistorySearch(persistedRenewalHistoryPreset.query)") &&
      insights.includes("clearRecoveryRenewalHistorySearchPreset()") &&
      insights.includes("filterInterfaceReceiptPresetRecoveryAudit") &&
      insights.includes(
        "window.localStorage.removeItem(\n        INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY"
      ) &&
      insights.includes(
        "window.localStorage.removeItem(\n        INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY"
      ),
    "Build 142 must wire audit-recovery evidence, renewal-preset restoration/clearing and receipt-audit filtering into browser-local UI state."
  );

  for (const selector of [
    ".interfaceRecoveryAuditPresetRecoveryAudit",
    ".interfaceRecoveryAuditPresetRecoveryAuditList",
    ".interfaceReceiptRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 142 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-audit",
    "renewal-search-preset-persistence",
    "receipt-recovery-audit-filtering"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 142 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 142 recovery audit recovery audit, renewal search preset persistence & receipt recovery audit filtering"
    ),
    "Help Center must register the Build 142 help group."
  );

  assert(
    shell.includes("Build 142 · Marble Standard"),
    "Build 142 shell must expose the current interface build."
  );

  assert(
    verify141.includes('shell.includes("Marble Standard")') &&
      !verify141.includes('shell.includes("Build 141 · Marble Standard")'),
    "Build 141 verifier must remain forward-compatible after the Build 142 shell label."
  );

  assert(
    pkg.includes("verify-build-142-audit-recovery-ledger-renewal-persistence-receipt-filters.ts"),
    "Build 142 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery audit") &&
      docLower.includes("renewal search preset persistence") &&
      docLower.includes("receipt recovery audit filtering") &&
      docLower.includes("ten") &&
      docLower.includes("view-only") &&
      docLower.includes("rls"),
    "Build 142 documentation must preserve local-only recovery-ledger, persistence and filter boundaries."
  );

  console.log(
    "Build 142 recovery audit ledger, renewal preset persistence and receipt recovery audit filtering verification passed."
  );
}

void main();
