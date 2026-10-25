import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfacePreferenceRecoveryRenewalReceipt,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  filterInterfacePreferenceRecoveryRenewalReceiptHistory,
  interfaceRecoveryAuditSearchPresetById,
  sanitizeInterfacePreferenceReceiptSearchPresetId
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

function renewalReceipt(index: number, freshnessAgeDays: number | null) {
  const base = 1_700_000_000_000;
  const previousCapturedAt =
    freshnessAgeDays === null
      ? null
      : base - freshnessAgeDays * 24 * 60 * 60 * 1000;
  const previous = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "focused",
      recommendations: "shortcuts"
    },
    [profile("old-" + index)],
    previousCapturedAt
  );
  const renewed = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "comfortable",
      workspaceLayout: "balanced",
      recommendations: "all"
    },
    [profile("new-" + index, true)],
    base + index
  );
  return createInterfacePreferenceRecoveryRenewalReceipt({
    receiptId: "renewal-" + index,
    createdAt: base,
    previousSnapshot: previous,
    renewedSnapshot: renewed
  });
}

async function main() {
  const auditPresetIds = INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS.map(
    (preset) => preset.id
  );
  assert(
    auditPresetIds.join(",") ===
      "all,initial-load,filter-selection,last-favorite-removed,favorites" &&
      interfaceRecoveryAuditSearchPresetById("all").triggerFilter === "all" &&
      interfaceRecoveryAuditSearchPresetById("initial-load").triggerFilter ===
        "initial-load" &&
      interfaceRecoveryAuditSearchPresetById("filter-selection").triggerFilter ===
        "filter-selection" &&
      interfaceRecoveryAuditSearchPresetById("last-favorite-removed")
        .triggerFilter === "last-favorite-removed" &&
      interfaceRecoveryAuditSearchPresetById("favorites").query === "favorites",
    "Build 139 recovery-audit search presets must map common operator views deterministically."
  );

  const receipts = [
    renewalReceipt(1, 0),
    renewalReceipt(2, 2),
    renewalReceipt(3, 10),
    renewalReceipt(4, 31),
    renewalReceipt(5, null)
  ];
  assert(
    filterInterfacePreferenceRecoveryRenewalReceiptHistory(receipts, "all")
      .length === 5 &&
      filterInterfacePreferenceRecoveryRenewalReceiptHistory(receipts, "fresh")
        .length === 1 &&
      filterInterfacePreferenceRecoveryRenewalReceiptHistory(receipts, "aging")
        .length === 1 &&
      filterInterfacePreferenceRecoveryRenewalReceiptHistory(receipts, "stale")
        .length === 1 &&
      filterInterfacePreferenceRecoveryRenewalReceiptHistory(receipts, "expired")
        .length === 1 &&
      filterInterfacePreferenceRecoveryRenewalReceiptHistory(receipts, "unknown")
        .length === 1,
    "Build 139 renewal history filtering must isolate each previous-freshness state without changing receipt order."
  );

  assert(
    sanitizeInterfacePreferenceReceiptSearchPresetId("deviations") ===
      "deviations" &&
      sanitizeInterfacePreferenceReceiptSearchPresetId("replacements") ===
        "replacements" &&
      sanitizeInterfacePreferenceReceiptSearchPresetId("keep-both") ===
        "keep-both" &&
      sanitizeInterfacePreferenceReceiptSearchPresetId("capacity") ===
        "capacity" &&
      sanitizeInterfacePreferenceReceiptSearchPresetId("invalid") === "all" &&
      INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY.includes(
        "receipt-search-preset"
      ),
    "Build 139 persisted receipt-search preset IDs must sanitize safely and use a dedicated browser-local namespace."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify138, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-138-audit-search-renewal-history-presets.ts"),
      source("../../../docs/BUILD_139_AUDIT_PRESETS_RENEWAL_FILTERS_PRESET_PERSISTENCE.md")
    ]);

  for (const token of [
    "INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS",
    "interfaceRecoveryAuditSearchPresetById",
    "filterInterfacePreferenceRecoveryRenewalReceiptHistory",
    "InterfacePreferenceRecoveryRenewalHistoryFreshnessFilter",
    "INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY",
    "sanitizeInterfacePreferenceReceiptSearchPresetId"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 139 preference library missing: " + token
    );
  }

  for (const token of [
    "Recovery audit search presets",
    "INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "applyRecoveryAuditSearchPreset",
    "Previous freshness",
    "All prior freshness",
    "filteredRecoveryRenewalReceiptHistory",
    "readReceiptSearchPreset",
    "writeReceiptSearchPreset",
    "clearReceiptSearchPreset",
    "persistedReceiptPreset",
    "INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY"
  ]) {
    assert(insights.includes(token), "Build 139 Insights UI missing: " + token);
  }

  assert(
    insights.includes("setRecoveryAuditSearchPresetId(null)") &&
      insights.includes("setRenewalHistoryFreshnessFilter") &&
      insights.includes("writeReceiptSearchPreset(preset.id)") &&
      insights.includes("clearReceiptSearchPreset()") &&
      insights.includes("setReceiptSearchPresetId(persistedReceiptPreset.id)") &&
      insights.includes(
        "window.localStorage.removeItem(\n        INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY"
      ),
    "Build 139 must wire audit preset exit, renewal filtering and receipt-preset persistence/reset behavior."
  );

  for (const selector of [
    ".interfaceRecoveryAuditSearchPresets",
    ".interfaceRenewalHistoryFilters"
  ]) {
    assert(css.includes(selector), "Build 139 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-search-presets",
    "renewal-receipt-history-filtering",
    "receipt-search-preset-persistence"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 139 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 139 recovery audit search presets, renewal receipt history filtering & receipt search preset persistence"
    ),
    "Help Center must register the Build 139 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 139 shell must preserve Marble Standard as later interface builds advance."
  );

  assert(
    verify138.includes('shell.includes("Marble Standard")') &&
      !verify138.includes('shell.includes("Build 138 · Marble Standard")'),
    "Build 138 verifier must remain forward-compatible after the Build 139 shell label."
  );

  assert(
    pkg.includes("verify-build-139-audit-presets-renewal-filters-persistence.ts"),
    "Build 139 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit search presets") &&
      docLower.includes("renewal receipt history filtering") &&
      docLower.includes("receipt search preset persistence") &&
      docLower.includes("preset id") &&
      docLower.includes("view-only") &&
      docLower.includes("rls"),
    "Build 139 documentation must preserve local-only preset/filter/persistence boundaries."
  );

  console.log(
    "Build 139 recovery audit presets, renewal history filtering and receipt preset persistence verification passed."
  );
}

void main();
