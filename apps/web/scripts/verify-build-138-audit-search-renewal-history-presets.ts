import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS,
  INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_FORMAT,
  INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY,
  MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY,
  createInterfaceFavoriteViewRecoveryAuditEntry,
  createInterfacePreferenceRecoveryRenewalReceipt,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  interfacePreferenceReceiptSearchPresetById,
  parseInterfacePreferenceRecoveryRenewalReceiptHistory,
  prependInterfacePreferenceRecoveryRenewalReceipt,
  searchInterfaceFavoriteViewRecoveryAudit,
  serializeInterfacePreferenceRecoveryRenewalReceiptHistory
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

function renewalReceipt(index: number) {
  const previous = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "focused",
      recommendations: "shortcuts"
    },
    [profile("old-" + index)],
    1_690_000_000_000 + index
  );
  const renewed = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "comfortable",
      workspaceLayout: "balanced",
      recommendations: "all"
    },
    [profile("new-" + index, index % 2 === 0), profile("shared-" + index)],
    1_700_000_000_000 + index
  );
  return createInterfacePreferenceRecoveryRenewalReceipt({
    receiptId: "renewal-" + index,
    createdAt: 1_700_000_100_000 + index,
    previousSnapshot: previous,
    renewedSnapshot: renewed
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
      reason: "Recovered during startup because no favorites remained."
    }),
    createInterfaceFavoriteViewRecoveryAuditEntry({
      auditId: "audit-select",
      createdAt: 1_700_000_000_002,
      trigger: "filter-selection",
      requestedFilter: "favorites",
      resolvedFilter: "all",
      reason: "Recovered when Favorites was selected."
    }),
    createInterfaceFavoriteViewRecoveryAuditEntry({
      auditId: "audit-last",
      createdAt: 1_700_000_000_003,
      trigger: "last-favorite-removed",
      requestedFilter: "favorites",
      resolvedFilter: "all",
      reason: "Recovered after the last favorite was removed."
    })
  ];

  assert(
    searchInterfaceFavoriteViewRecoveryAudit(audit, "startup")[0]?.auditId ===
      "audit-load" &&
      searchInterfaceFavoriteViewRecoveryAudit(audit, "filter-selection")[0]
        ?.auditId === "audit-select" &&
      searchInterfaceFavoriteViewRecoveryAudit(audit, "last favorite")[0]
        ?.auditId === "audit-last" &&
      searchInterfaceFavoriteViewRecoveryAudit(audit, "favorites").length === 3 &&
      searchInterfaceFavoriteViewRecoveryAudit(audit, "missing").length === 0,
    "Build 138 recovery audit search must match IDs, triggers, filters and reasons without changing audit order."
  );

  let history = [] as ReturnType<typeof renewalReceipt>[];
  for (
    let index = 0;
    index < MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY + 3;
    index += 1
  ) {
    history = prependInterfacePreferenceRecoveryRenewalReceipt(
      history,
      renewalReceipt(index)
    );
  }

  assert(
    history.length ===
      MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY &&
      history[0]?.receiptId ===
        "renewal-" +
          (MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY + 2) &&
      history.at(-1)?.receiptId === "renewal-3",
    "Build 138 renewal receipt history must stay newest-first and bounded to ten entries."
  );

  const deduped = prependInterfacePreferenceRecoveryRenewalReceipt(
    history,
    history[2]
  );
  assert(
    deduped.length ===
      MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY &&
      deduped[0]?.receiptId === history[2]?.receiptId &&
      new Set(deduped.map((receipt) => receipt.receiptId)).size ===
        deduped.length,
    "Build 138 renewal receipt history must move an existing receipt to the front without duplicate IDs."
  );

  const parsedHistory = parseInterfacePreferenceRecoveryRenewalReceiptHistory(
    serializeInterfacePreferenceRecoveryRenewalReceiptHistory(deduped)
  );
  assert(
    parsedHistory.ok &&
      parsedHistory.history.format ===
        INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_FORMAT &&
      parsedHistory.history.receipts.length === deduped.length &&
      parsedHistory.history.receipts[0]?.receiptId === deduped[0]?.receiptId,
    "Build 138 renewal receipt history must round-trip through its versioned format."
  );

  assert(
    INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY.includes(
      "renewal-receipt-history"
    ),
    "Build 138 renewal history must use a dedicated browser-local namespace."
  );

  const presetIds = INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS.map(
    (preset) => preset.id
  );
  assert(
    presetIds.join(",") ===
      "all,deviations,replacements,keep-both,capacity" &&
      interfacePreferenceReceiptSearchPresetById("all").query === "" &&
      interfacePreferenceReceiptSearchPresetById("deviations").outcomeFilter ===
        "deviated" &&
      interfacePreferenceReceiptSearchPresetById("replacements")
        .strategyFilter === "replace" &&
      interfacePreferenceReceiptSearchPresetById("keep-both").strategyFilter ===
        "keep-both" &&
      interfacePreferenceReceiptSearchPresetById("capacity").query ===
        "capacity",
    "Build 138 receipt search presets must map common operator views to deterministic outcome, strategy and query values."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify137, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-137-audit-filtering-renewal-receipt-search.ts"),
      source("../../../docs/BUILD_138_AUDIT_SEARCH_RENEWAL_HISTORY_SEARCH_PRESETS.md")
    ]);

  for (const token of [
    "searchInterfaceFavoriteViewRecoveryAudit",
    "INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_FORMAT",
    "MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY",
    "prependInterfacePreferenceRecoveryRenewalReceipt",
    "parseInterfacePreferenceRecoveryRenewalReceiptHistory",
    "INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS",
    "interfacePreferenceReceiptSearchPresetById"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 138 preference library missing: " + token
    );
  }

  for (const token of [
    "Search recovery audit",
    "searchedFavoriteViewRecoveryAudit",
    "Snapshot renewal receipt history",
    "Export renewal history",
    "Clear renewal history",
    "readRecoveryRenewalReceiptHistory",
    "writeRecoveryRenewalReceiptHistory",
    "Receipt search presets",
    "INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS.map",
    "preset.label",
    "applyReceiptSearchPreset",
    "setReceiptSearchPresetId(null)"
  ]) {
    assert(insights.includes(token), "Build 138 Insights UI missing: " + token);
  }

  assert(
    insights.includes(
      "INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY"
    ) &&
      insights.includes("prependInterfacePreferenceRecoveryRenewalReceipt") &&
      insights.includes("setRecoveryRenewalReceiptHistory(nextHistory)") &&
      insights.includes("searchInterfaceFavoriteViewRecoveryAudit") &&
      insights.includes("INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS") &&
      insights.includes("setRecoveryAuditSearch") &&
      insights.includes("setReceiptSearchPresetId"),
    "Build 138 must wire audit search, renewal history and receipt search presets into browser-local UI state."
  );

  for (const selector of [
    ".interfaceRecoveryAuditSearch",
    ".interfaceRecoveryRenewalHistory",
    ".interfaceRecoveryRenewalHistoryList",
    ".interfaceReceiptSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 138 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-search",
    "renewal-receipt-history",
    "receipt-search-presets"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 138 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 138 recovery audit search, renewal receipt history & receipt search presets"
    ),
    "Help Center must register the Build 138 help group."
  );

  assert(
    shell.includes("Build 138 · Marble Standard"),
    "Build 138 shell must expose the current interface build."
  );

  assert(
    verify137.includes('shell.includes("Marble Standard")') &&
      !verify137.includes('shell.includes("Build 137 · Marble Standard")'),
    "Build 137 verifier must remain forward-compatible after the Build 138 shell label."
  );

  assert(
    pkg.includes("verify-build-138-audit-search-renewal-history-presets.ts"),
    "Build 138 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit search") &&
      docLower.includes("ten") &&
      docLower.includes("renewal receipt history") &&
      docLower.includes("receipt search presets") &&
      docLower.includes("view-only") &&
      docLower.includes("rls"),
    "Build 138 documentation must preserve local-only audit search, renewal history and view-only preset boundaries."
  );

  console.log(
    "Build 138 recovery audit search, renewal receipt history and receipt search presets verification passed."
  );
}

void main();
