import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_FORMAT,
  INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY,
  createInterfaceFavoriteViewRecoveryAuditEntry,
  createInterfacePreferenceBundleImportReceipt,
  createInterfacePreferenceRecoveryRenewalReceipt,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  filterInterfaceFavoriteViewRecoveryAudit,
  parseInterfacePreferenceRecoveryRenewalReceipt,
  searchInterfacePreferenceBundleImportReceiptHistory,
  serializeInterfacePreferenceRecoveryRenewalReceipt
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

function profile(id: string, favorite = false) {
  return createNamedInterfacePreferenceProfile({
    id,
    name: "Profile " + id,
    favorite,
    preferences: {
      version: 1,
      navigationDensity: "adaptive",
      workspaceLayout: "balanced",
      recommendations: "all"
    }
  });
}

function receipt(input: {
  id: string;
  source: string;
  strategy: "skip" | "replace" | "keep-both";
  selected: string[];
  matches: boolean;
  deviations?: string[];
}) {
  return createInterfacePreferenceBundleImportReceipt({
    receiptId: input.id,
    createdAt: 1_700_000_000_000,
    sourceName: input.source,
    strategy: input.strategy,
    selectedNames: input.selected,
    plan: {
      currentCount: 1,
      selectedCount: input.selected.length,
      availableSlots: 7,
      conflictCount: input.strategy === "replace" ? 1 : 0,
      newSlotDemand: input.strategy === "replace" ? 0 : input.selected.length,
      projectedAdded: input.strategy === "replace" ? 0 : input.selected.length,
      projectedReplaced: input.strategy === "replace" ? 1 : 0,
      projectedSkippedConflicts: 0,
      projectedSkippedCapacity: 0,
      projectedFinalCount: input.strategy === "replace" ? 1 : 1 + input.selected.length,
      fitsWithoutCapacitySkips: true
    },
    reconciliation: {
      matchesPlan: input.matches,
      planned: {
        added: input.strategy === "replace" ? 0 : input.selected.length,
        replaced: input.strategy === "replace" ? 1 : 0,
        skippedConflicts: 0,
        skippedCapacity: 0,
        finalCount: input.strategy === "replace" ? 1 : 1 + input.selected.length
      },
      actual: {
        added: input.strategy === "replace" ? 0 : input.selected.length,
        replaced: input.strategy === "replace" ? 1 : 0,
        skippedConflicts: 0,
        skippedCapacity: 0,
        finalCount: input.strategy === "replace" ? 1 : 1 + input.selected.length
      },
      deviations: input.deviations ?? []
    }
  });
}

async function main() {
  const audit = [
    createInterfaceFavoriteViewRecoveryAuditEntry({
      auditId: "audit-load",
      createdAt: 1_700_000_000_001,
      trigger: "initial-load",
      requestedFilter: "favorites",
      resolvedFilter: "all",
      reason: "Recovered during initial load."
    }),
    createInterfaceFavoriteViewRecoveryAuditEntry({
      auditId: "audit-select",
      createdAt: 1_700_000_000_002,
      trigger: "filter-selection",
      requestedFilter: "favorites",
      resolvedFilter: "all",
      reason: "Recovered after filter selection."
    }),
    createInterfaceFavoriteViewRecoveryAuditEntry({
      auditId: "audit-last",
      createdAt: 1_700_000_000_003,
      trigger: "last-favorite-removed",
      requestedFilter: "favorites",
      resolvedFilter: "all",
      reason: "Recovered after last favorite removal."
    })
  ];

  assert(
    filterInterfaceFavoriteViewRecoveryAudit(audit, "all").length === 3 &&
      filterInterfaceFavoriteViewRecoveryAudit(audit, "initial-load")[0]?.auditId ===
        "audit-load" &&
      filterInterfaceFavoriteViewRecoveryAudit(audit, "filter-selection")[0]
        ?.auditId === "audit-select" &&
      filterInterfaceFavoriteViewRecoveryAudit(audit, "last-favorite-removed")[0]
        ?.auditId === "audit-last",
    "Build 137 recovery audit filtering must isolate each recovery trigger without changing stored order."
  );

  const previousSnapshot = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "focused",
      recommendations: "shortcuts"
    },
    [profile("one")],
    1_697_000_000_000
  );
  const renewedSnapshot = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "comfortable",
      workspaceLayout: "balanced",
      recommendations: "all"
    },
    [profile("one", true), profile("two")],
    1_700_000_000_000
  );
  const renewalReceipt = createInterfacePreferenceRecoveryRenewalReceipt({
    receiptId: "renewal-build137",
    createdAt: 1_700_000_000_100,
    previousSnapshot,
    renewedSnapshot
  });
  assert(
    renewalReceipt.format ===
      INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_FORMAT &&
      renewalReceipt.previousCapturedAt === previousSnapshot.capturedAt &&
      renewalReceipt.renewedCapturedAt === renewedSnapshot.capturedAt &&
      renewalReceipt.profileCount === 2 &&
      renewalReceipt.favoriteCount === 1,
    "Build 137 renewal receipt must capture the prior and renewed recovery-point metadata."
  );

  const parsedRenewal = parseInterfacePreferenceRecoveryRenewalReceipt(
    serializeInterfacePreferenceRecoveryRenewalReceipt(renewalReceipt)
  );
  assert(
    parsedRenewal.ok &&
      parsedRenewal.receipt.receiptId === "renewal-build137" &&
      parsedRenewal.receipt.profileCount === 2 &&
      parsedRenewal.receipt.favoriteCount === 1,
    "Build 137 renewal receipt must round-trip through its versioned local format."
  );

  const invalidRenewal = parseInterfacePreferenceRecoveryRenewalReceipt(
    JSON.stringify({
      ...renewalReceipt,
      renewedCapturedAt: 0
    })
  );
  assert(
    !invalidRenewal.ok,
    "Build 137 must reject incomplete or invalid persisted renewal receipts."
  );

  assert(
    INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY.includes(
      "recovery-snapshot-renewal-receipt"
    ),
    "Build 137 must isolate the latest renewal receipt in a dedicated browser-local namespace."
  );

  const receipts = [
    receipt({
      id: "receipt-alpha",
      source: "makers.json",
      strategy: "skip",
      selected: ["Forge", "Jewelry"],
      matches: true
    }),
    receipt({
      id: "receipt-beta",
      source: "travel.json",
      strategy: "replace",
      selected: ["Road Trip"],
      matches: false,
      deviations: ["Final profile count differed."]
    }),
    receipt({
      id: "receipt-gamma",
      source: "studio.json",
      strategy: "keep-both",
      selected: ["Photo Studio"],
      matches: true
    })
  ];

  assert(
    searchInterfacePreferenceBundleImportReceiptHistory(receipts, "makers")[0]
      ?.receiptId === "receipt-alpha" &&
      searchInterfacePreferenceBundleImportReceiptHistory(receipts, "Road Trip")[0]
        ?.receiptId === "receipt-beta" &&
      searchInterfacePreferenceBundleImportReceiptHistory(receipts, "keep-both")[0]
        ?.receiptId === "receipt-gamma" &&
      searchInterfacePreferenceBundleImportReceiptHistory(receipts, "deviated")[0]
        ?.receiptId === "receipt-beta" &&
      searchInterfacePreferenceBundleImportReceiptHistory(
        receipts,
        "Final profile count"
      )[0]?.receiptId === "receipt-beta" &&
      searchInterfacePreferenceBundleImportReceiptHistory(receipts, "missing")
        .length === 0,
    "Build 137 receipt search must match source, profile, strategy, outcome and deviation text case-insensitively."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify136, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-136-recovery-audit-renewal-filters.ts"),
      source("../../../docs/BUILD_137_AUDIT_FILTERING_RENEWAL_RECEIPT_HISTORY_SEARCH.md")
    ]);

  for (const token of [
    "InterfaceFavoriteViewRecoveryAuditFilter",
    "filterInterfaceFavoriteViewRecoveryAudit",
    "INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_FORMAT",
    "createInterfacePreferenceRecoveryRenewalReceipt",
    "parseInterfacePreferenceRecoveryRenewalReceipt",
    "searchInterfacePreferenceBundleImportReceiptHistory"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 137 preference library missing: " + token
    );
  }

  for (const token of [
    "All recovery triggers",
    "Initial load",
    "Filter selection",
    "Last favorite removed",
    "filteredFavoriteViewRecoveryAudit",
    "Latest snapshot renewal receipt",
    "Export renewal receipt",
    "Clear renewal receipt",
    "Search receipts",
    "Search import reconciliation receipt history",
    "searchedImportReceiptHistory",
    "No receipts match the selected history filters and search"
  ]) {
    assert(insights.includes(token), "Build 137 Insights UI missing: " + token);
  }

  assert(
    insights.includes("readRecoveryRenewalReceipt") &&
      insights.includes("writeRecoveryRenewalReceipt(receipt)") &&
      insights.includes("createInterfacePreferenceRecoveryRenewalReceipt") &&
      insights.includes("setRecoveryRenewalReceipt(receipt)") &&
      insights.includes("filterInterfaceFavoriteViewRecoveryAudit") &&
      insights.includes("searchInterfacePreferenceBundleImportReceiptHistory") &&
      insights.includes("setReceiptHistorySearch") &&
      insights.includes(
        "INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY"
      ),
    "Build 137 must wire audit filtering, renewal receipt persistence and receipt search into browser-local UI state."
  );

  for (const selector of [
    ".interfaceRecoveryAuditFilters",
    ".interfaceRecoveryRenewalReceipt",
    ".interfaceReceiptHistorySearch"
  ]) {
    assert(css.includes(selector), "Build 137 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-filtering",
    "snapshot-renewal-receipt",
    "receipt-history-search"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 137 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 137 recovery audit filtering, snapshot renewal receipt & receipt history search"
    ),
    "Help Center must register the Build 137 help group."
  );

  assert(
    shell.includes("Build 137 · Marble Standard"),
    "Build 137 shell must expose the current interface build."
  );

  assert(
    verify136.includes('shell.includes("Marble Standard")') &&
      !verify136.includes('shell.includes("Build 136 · Marble Standard")'),
    "Build 136 verifier must remain forward-compatible after the Build 137 shell label."
  );

  assert(
    pkg.includes("verify-build-137-audit-filtering-renewal-receipt-search.ts"),
    "Build 137 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("audit filtering") &&
      docLower.includes("renewal receipt") &&
      docLower.includes("receipt history search") &&
      docLower.includes("view-only") &&
      docLower.includes("rls"),
    "Build 137 documentation must preserve local-only audit filtering, renewal receipt and view-only search boundaries."
  );

  console.log(
    "Build 137 recovery audit filtering, snapshot renewal receipt and receipt history search verification passed."
  );
}

void main();
