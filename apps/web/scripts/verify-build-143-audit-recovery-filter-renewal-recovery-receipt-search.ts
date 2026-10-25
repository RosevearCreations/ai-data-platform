import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  createInterfaceRecoveryAuditPresetRecoveryAuditEntry,
  createInterfaceReceiptPresetRecoveryAuditEntry,
  filterInterfaceRecoveryAuditPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalHistorySearchPresetId,
  searchInterfaceReceiptPresetRecoveryAudit
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const now = 1_800_000_000_000;
  const recoveryAudit = [
    createInterfaceRecoveryAuditPresetRecoveryAuditEntry({
      auditId: "audit-recent",
      createdAt: now - 4 * 60 * 60 * 1000,
      requestedPresetId: "retired-recent",
      recoveredPresetId: "all",
      reason: "Recovered a recent audit preset."
    }),
    createInterfaceRecoveryAuditPresetRecoveryAuditEntry({
      auditId: "audit-three-days",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-three-days",
      recoveredPresetId: "all",
      reason: "Recovered a three-day audit preset."
    }),
    createInterfaceRecoveryAuditPresetRecoveryAuditEntry({
      auditId: "audit-nine-days",
      createdAt: now - 9 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-nine-days",
      recoveredPresetId: "all",
      reason: "Recovered an older audit preset."
    })
  ];

  assert(
    filterInterfaceRecoveryAuditPresetRecoveryAudit(
      recoveryAudit,
      "all",
      now
    ).length === 3 &&
      filterInterfaceRecoveryAuditPresetRecoveryAudit(
        recoveryAudit,
        "24h",
        now
      ).map((entry) => entry.auditId).join(",") === "audit-recent" &&
      filterInterfaceRecoveryAuditPresetRecoveryAudit(
        recoveryAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") ===
        "audit-recent,audit-three-days",
    "Build 143 recovery-audit recovery filtering must preserve source order while selecting all, 24-hour and seven-day views."
  );

  const validRenewalRecovery =
    recoverInterfaceRecoveryRenewalHistorySearchPresetId("stale");
  const invalidRenewalRecovery =
    recoverInterfaceRecoveryRenewalHistorySearchPresetId(
      "retired-renewal-preset"
    );
  const missingRenewalRecovery =
    recoverInterfaceRecoveryRenewalHistorySearchPresetId(null);

  assert(
    validRenewalRecovery.presetId === "stale" &&
      !validRenewalRecovery.recovered &&
      invalidRenewalRecovery.presetId === "all" &&
      invalidRenewalRecovery.recovered &&
      Boolean(invalidRenewalRecovery.reason?.includes("All renewals")) &&
      missingRenewalRecovery.presetId === "all" &&
      !missingRenewalRecovery.recovered,
    "Build 143 renewal search preset recovery must self-heal unsupported saved IDs while treating missing state as the normal All renewals default."
  );

  const receiptAudit = [
    createInterfaceReceiptPresetRecoveryAuditEntry({
      auditId: "receipt-alpha",
      createdAt: now,
      requestedPresetId: "retired-capacity",
      recoveredPresetId: "all",
      reason: "Capacity preset was retired."
    }),
    createInterfaceReceiptPresetRecoveryAuditEntry({
      auditId: "receipt-beta",
      createdAt: now - 1,
      requestedPresetId: "retired-replace",
      recoveredPresetId: "all",
      reason: "Replacement view was retired."
    })
  ];

  assert(
    searchInterfaceReceiptPresetRecoveryAudit(
      receiptAudit,
      "receipt-alpha"
    )[0]?.auditId === "receipt-alpha" &&
      searchInterfaceReceiptPresetRecoveryAudit(
        receiptAudit,
        "retired-replace"
      )[0]?.auditId === "receipt-beta" &&
      searchInterfaceReceiptPresetRecoveryAudit(
        receiptAudit,
        "capacity preset"
      )[0]?.auditId === "receipt-alpha" &&
      searchInterfaceReceiptPresetRecoveryAudit(receiptAudit, "ALL").length ===
        2 &&
      searchInterfaceReceiptPresetRecoveryAudit(
        receiptAudit,
        "missing"
      ).length === 0,
    "Build 143 receipt recovery audit search must match audit ID, requested preset, recovered preset and reason case-insensitively."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify142, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-142-audit-recovery-ledger-renewal-persistence-receipt-filters.ts"),
      source("../../../docs/BUILD_143_AUDIT_RECOVERY_FILTERING_RENEWAL_PRESET_RECOVERY_RECEIPT_AUDIT_SEARCH.md")
    ]);

  for (const token of [
    "InterfaceRecoveryAuditPresetRecoveryAuditAgeFilter",
    "filterInterfaceRecoveryAuditPresetRecoveryAudit",
    "InterfaceRecoveryRenewalHistorySearchPresetRecovery",
    "recoverInterfaceRecoveryRenewalHistorySearchPresetId",
    "searchInterfaceReceiptPresetRecoveryAudit"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 143 preference library missing: " + token
    );
  }

  for (const token of [
    "filteredRecoveryAuditPresetRecoveryAudit",
    "All audit recoveries",
    "No recovery-audit preset repairs match the selected age filter.",
    "readRecoveryRenewalHistorySearchPresetRecovery",
    "renewalHistoryPresetRecoveryNotice",
    "Renewal history preset recovered",
    "writeRecoveryRenewalHistorySearchPreset(",
    "searchedReceiptPresetRecoveryAudit",
    "interfaceReceiptRecoveryAuditSearch",
    "Search receipt preset recovery audit",
    "No receipt preset recovery events match the selected age filter and search."
  ]) {
    assert(insights.includes(token), "Build 143 Insights UI missing: " + token);
  }

  assert(
    insights.includes(
      "setRenewalHistoryPresetRecoveryNotice(\n      renewalHistoryPresetRecovery.reason"
    ) &&
      insights.includes("setRenewalHistoryPresetRecoveryNotice(null)") &&
      insights.includes("clearRecoveryRenewalHistorySearchPreset()") &&
      insights.includes("setRecoveryAuditPresetRecoveryAuditAgeFilter") &&
      insights.includes("setReceiptPresetRecoveryAuditSearch") &&
      insights.includes("searchInterfaceReceiptPresetRecoveryAudit"),
    "Build 143 must wire recovery filtering, renewal preset recovery and receipt-audit search into browser-local UI state."
  );

  const clearReceiptStart = insights.indexOf(
    "function clearReceiptPresetRecoveryAudit()"
  );
  const clearReceiptEnd = insights.indexOf(
    "function exportRecoveryRenewalReceipt()",
    clearReceiptStart
  );
  const clearReceiptBlock = insights.slice(clearReceiptStart, clearReceiptEnd);
  assert(
    clearReceiptStart >= 0 &&
      clearReceiptEnd > clearReceiptStart &&
      clearReceiptBlock.includes(
        "INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY"
      ) &&
      !clearReceiptBlock.includes(
        "INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY"
      ) &&
      !clearReceiptBlock.includes(
        "INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY"
      ),
    "Build 143 receipt recovery audit clear must remain scoped to receipt recovery evidence and must not erase unrelated recovery-ledger or renewal-preset state."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRecoveryFilters",
    ".interfaceRenewalPresetRecovery",
    ".interfaceReceiptRecoveryAuditSearch"
  ]) {
    assert(css.includes(selector), "Build 143 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-filtering",
    "renewal-search-preset-recovery",
    "receipt-recovery-audit-search"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 143 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 143 recovery audit recovery filtering, renewal search preset recovery & receipt recovery audit search"
    ),
    "Help Center must register the Build 143 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 143 shell must preserve Marble Standard as later interface builds advance."
  );

  assert(
    verify142.includes('shell.includes("Marble Standard")') &&
      !verify142.includes('shell.includes("Build 142 · Marble Standard")'),
    "Build 142 verifier must remain forward-compatible after the Build 143 shell label."
  );

  assert(
    pkg.includes("verify-build-143-audit-recovery-filter-renewal-recovery-receipt-search.ts"),
    "Build 143 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery filtering") &&
      docLower.includes("renewal search preset recovery") &&
      docLower.includes("receipt recovery audit search") &&
      docLower.includes("view-only") &&
      docLower.includes("independent clear") &&
      docLower.includes("rls"),
    "Build 143 documentation must preserve local-only filtering, recovery, search and independent-clear boundaries."
  );

  console.log(
    "Build 143 recovery audit filtering, renewal preset recovery and receipt recovery audit search verification passed."
  );
}

void main();
