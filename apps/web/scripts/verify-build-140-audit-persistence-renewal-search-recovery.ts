import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfacePreferenceRecoveryRenewalReceipt,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  recoverInterfacePreferenceReceiptSearchPresetId,
  sanitizeInterfaceRecoveryAuditSearchPresetId,
  searchInterfacePreferenceRecoveryRenewalReceiptHistory
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

function renewalReceipt(input: {
  id: string;
  freshnessAgeDays: number | null;
  profileCount: number;
  favoriteCount: number;
}) {
  const base = 1_700_000_000_000;
  const previousCapturedAt =
    input.freshnessAgeDays === null
      ? null
      : base - input.freshnessAgeDays * 24 * 60 * 60 * 1000;
  const previous = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "focused",
      recommendations: "shortcuts"
    },
    [profile("old-" + input.id)],
    previousCapturedAt
  );
  const renewedProfiles = Array.from({ length: input.profileCount }, (_, index) =>
    profile(
      input.id + "-profile-" + index,
      index < input.favoriteCount
    )
  );
  const renewed = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "comfortable",
      workspaceLayout: "balanced",
      recommendations: "all"
    },
    renewedProfiles,
    base + input.profileCount
  );
  return createInterfacePreferenceRecoveryRenewalReceipt({
    receiptId: input.id,
    createdAt: base,
    previousSnapshot: previous,
    renewedSnapshot: renewed
  });
}

async function main() {
  assert(
    sanitizeInterfaceRecoveryAuditSearchPresetId("initial-load") ===
      "initial-load" &&
      sanitizeInterfaceRecoveryAuditSearchPresetId("filter-selection") ===
        "filter-selection" &&
      sanitizeInterfaceRecoveryAuditSearchPresetId(
        "last-favorite-removed"
      ) === "last-favorite-removed" &&
      sanitizeInterfaceRecoveryAuditSearchPresetId("favorites") ===
        "favorites" &&
      sanitizeInterfaceRecoveryAuditSearchPresetId("unsupported") === "all" &&
      INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "recovery-audit-search-preset"
      ),
    "Build 140 recovery-audit preset persistence must sanitize IDs safely and use a dedicated browser-local namespace."
  );

  const history = [
    renewalReceipt({
      id: "renewal-fresh",
      freshnessAgeDays: 0,
      profileCount: 2,
      favoriteCount: 1
    }),
    renewalReceipt({
      id: "renewal-stale",
      freshnessAgeDays: 10,
      profileCount: 3,
      favoriteCount: 2
    }),
    renewalReceipt({
      id: "renewal-legacy",
      freshnessAgeDays: null,
      profileCount: 4,
      favoriteCount: 0
    })
  ];

  assert(
    searchInterfacePreferenceRecoveryRenewalReceiptHistory(
      history,
      "renewal-stale"
    )[0]?.receiptId === "renewal-stale" &&
      searchInterfacePreferenceRecoveryRenewalReceiptHistory(history, "stale")[0]
        ?.receiptId === "renewal-stale" &&
      searchInterfacePreferenceRecoveryRenewalReceiptHistory(
        history,
        "legacy"
      )[0]?.receiptId === "renewal-legacy" &&
      searchInterfacePreferenceRecoveryRenewalReceiptHistory(
        history,
        "3 profiles"
      )[0]?.receiptId === "renewal-stale" &&
      searchInterfacePreferenceRecoveryRenewalReceiptHistory(
        history,
        "1 favorites"
      )[0]?.receiptId === "renewal-fresh" &&
      searchInterfacePreferenceRecoveryRenewalReceiptHistory(
        history,
        "missing"
      ).length === 0,
    "Build 140 renewal receipt history search must match receipt ID, freshness, legacy wording and profile/favorite counts."
  );

  const validRecovery =
    recoverInterfacePreferenceReceiptSearchPresetId("capacity");
  const invalidRecovery =
    recoverInterfacePreferenceReceiptSearchPresetId("retired-preset");
  const missingRecovery =
    recoverInterfacePreferenceReceiptSearchPresetId(null);
  assert(
    validRecovery.presetId === "capacity" &&
      !validRecovery.recovered &&
      invalidRecovery.presetId === "all" &&
      invalidRecovery.recovered &&
      Boolean(invalidRecovery.reason?.includes("All receipts")) &&
      missingRecovery.presetId === "all" &&
      !missingRecovery.recovered,
    "Build 140 receipt preset recovery must self-heal invalid saved IDs while treating missing state as the normal All receipts default."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify139, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-139-audit-presets-renewal-filters-persistence.ts"),
      source("../../../docs/BUILD_140_AUDIT_PRESET_PERSISTENCE_RENEWAL_SEARCH_PRESET_RECOVERY.md")
    ]);

  for (const token of [
    "INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY",
    "sanitizeInterfaceRecoveryAuditSearchPresetId",
    "searchInterfacePreferenceRecoveryRenewalReceiptHistory",
    "recoverInterfacePreferenceReceiptSearchPresetId",
    "InterfacePreferenceReceiptSearchPresetRecovery"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 140 preference library missing: " + token
    );
  }

  for (const token of [
    "readRecoveryAuditSearchPreset",
    "writeRecoveryAuditSearchPreset",
    "clearRecoveryAuditSearchPreset",
    "persistedAuditPreset",
    "Search renewal history",
    "searchedRecoveryRenewalReceiptHistory",
    "readReceiptSearchPresetRecovery",
    "receiptPresetRecoveryNotice",
    "Receipt preset recovered",
    "writeReceiptSearchPreset(receiptPresetRecovery.presetId)",
    "INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY"
  ]) {
    assert(insights.includes(token), "Build 140 Insights UI missing: " + token);
  }

  assert(
    insights.includes("writeRecoveryAuditSearchPreset(preset.id)") &&
      insights.includes("setRecoveryAuditFilter(persistedAuditPreset.triggerFilter)") &&
      insights.includes("setRecoveryAuditSearch(persistedAuditPreset.query)") &&
      insights.includes("setRecoveryAuditSearchPresetId(persistedAuditPreset.id)") &&
      insights.includes("clearRecoveryAuditSearchPreset()") &&
      insights.includes("searchInterfacePreferenceRecoveryRenewalReceiptHistory") &&
      insights.includes("setRenewalHistorySearch") &&
      insights.includes("setReceiptPresetRecoveryNotice(receiptPresetRecovery.reason)") &&
      insights.includes(
        "window.localStorage.removeItem(\n        INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY"
      ),
    "Build 140 must wire audit-preset persistence/reset, renewal-history search and receipt-preset recovery into browser-local UI state."
  );

  for (const selector of [
    ".interfaceRenewalHistorySearch",
    ".interfaceReceiptPresetRecovery"
  ]) {
    assert(css.includes(selector), "Build 140 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-preset-persistence",
    "renewal-receipt-history-search",
    "receipt-preset-recovery"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 140 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 140 recovery audit preset persistence, renewal receipt history search & receipt preset recovery"
    ),
    "Help Center must register the Build 140 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 140 shell must preserve Marble Standard as later interface builds advance."
  );

  assert(
    verify139.includes('shell.includes("Marble Standard")') &&
      !verify139.includes('shell.includes("Build 139 · Marble Standard")'),
    "Build 139 verifier must remain forward-compatible after the Build 140 shell label."
  );

  assert(
    pkg.includes("verify-build-140-audit-persistence-renewal-search-recovery.ts"),
    "Build 140 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit preset persistence") &&
      docLower.includes("renewal receipt history search") &&
      docLower.includes("receipt preset recovery") &&
      docLower.includes("preset id") &&
      docLower.includes("view-only") &&
      docLower.includes("rls"),
    "Build 140 documentation must preserve local-only persistence, search and recovery boundaries."
  );

  console.log(
    "Build 140 audit preset persistence, renewal history search and receipt preset recovery verification passed."
  );
}

void main();
