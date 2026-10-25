import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_FORMAT,
  INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY,
  MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY,
  createInterfacePreferenceBundleImportReceipt,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  interfacePreferenceRecoverySnapshotFreshness,
  parseInterfacePreferenceBundleImportReceiptHistory,
  prependInterfacePreferenceBundleImportReceipt,
  recoverNamedInterfacePreferenceQuickFilter,
  serializeInterfacePreferenceBundleImportReceiptHistory
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

function receipt(index: number) {
  return createInterfacePreferenceBundleImportReceipt({
    receiptId: "receipt-" + index,
    createdAt: 1_700_000_000_000 + index,
    sourceName: "bundle-" + index + ".json",
    strategy: index % 2 ? "replace" : "skip",
    selectedNames: ["Profile " + index],
    plan: {
      currentCount: 1,
      selectedCount: 1,
      availableSlots: 7,
      conflictCount: index % 2,
      newSlotDemand: index % 2 ? 0 : 1,
      projectedAdded: index % 2 ? 0 : 1,
      projectedReplaced: index % 2 ? 1 : 0,
      projectedSkippedConflicts: 0,
      projectedSkippedCapacity: 0,
      projectedFinalCount: index % 2 ? 1 : 2,
      fitsWithoutCapacitySkips: true
    },
    reconciliation: {
      matchesPlan: true,
      planned: {
        added: index % 2 ? 0 : 1,
        replaced: index % 2 ? 1 : 0,
        skippedConflicts: 0,
        skippedCapacity: 0,
        finalCount: index % 2 ? 1 : 2
      },
      actual: {
        added: index % 2 ? 0 : 1,
        replaced: index % 2 ? 1 : 0,
        skippedConflicts: 0,
        skippedCapacity: 0,
        finalCount: index % 2 ? 1 : 2
      },
      deviations: []
    }
  });
}

async function main() {
  const noFavorites = [profile("one"), profile("two")];
  const recovered = recoverNamedInterfacePreferenceQuickFilter(
    noFavorites,
    "favorites"
  );
  assert(
    recovered.recovered &&
      recovered.filter === "all" &&
      recovered.reason?.includes("recovered to All profiles"),
    "Build 135 must recover an unusable Favorites view to All profiles."
  );

  const validFavorites = [profile("one", true), profile("two")];
  const retained = recoverNamedInterfacePreferenceQuickFilter(
    validFavorites,
    "favorites"
  );
  assert(
    !retained.recovered && retained.filter === "favorites",
    "Build 135 must keep Favorites selected when at least one favorite remains."
  );

  const capturedAt = 1_700_000_000_000;
  const snapshot = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "focused",
      recommendations: "shortcuts"
    },
    validFavorites,
    capturedAt
  );
  const stale = interfacePreferenceRecoverySnapshotFreshness(
    snapshot,
    capturedAt + 29 * 24 * 60 * 60 * 1000
  );
  const expired = interfacePreferenceRecoverySnapshotFreshness(
    snapshot,
    capturedAt + 30 * 24 * 60 * 60 * 1000
  );
  assert(
    stale.status === "stale" && expired.status === "expired",
    "Build 135 must preserve stale guidance below 30 days and mark 30+ day snapshots expired for guidance."
  );

  let history = [] as ReturnType<typeof receipt>[];
  for (let index = 0; index < MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY + 3; index += 1) {
    history = prependInterfacePreferenceBundleImportReceipt(
      history,
      receipt(index)
    );
  }
  assert(
    history.length === MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY &&
      history[0]?.receiptId ===
        "receipt-" + (MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY + 2) &&
      history.at(-1)?.receiptId === "receipt-3",
    "Build 135 receipt history must remain newest-first and bounded to ten entries."
  );

  const deduped = prependInterfacePreferenceBundleImportReceipt(
    history,
    history[2]
  );
  assert(
    deduped.length === MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY &&
      deduped[0]?.receiptId === history[2]?.receiptId &&
      new Set(deduped.map((item) => item.receiptId)).size === deduped.length,
    "Build 135 receipt history must move an existing receipt to the front without duplicating its ID."
  );

  const serializedHistory =
    serializeInterfacePreferenceBundleImportReceiptHistory(deduped);
  const parsedHistory =
    parseInterfacePreferenceBundleImportReceiptHistory(serializedHistory);
  assert(
    parsedHistory.ok &&
      parsedHistory.history.format ===
        INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_FORMAT &&
      parsedHistory.history.receipts.length === deduped.length &&
      parsedHistory.history.receipts[0]?.receiptId === deduped[0]?.receiptId,
    "Build 135 receipt history must round-trip through its versioned format."
  );

  assert(
    INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY.includes(
      "reconciliation-history"
    ),
    "Build 135 must isolate receipt history in its own browser-local storage namespace."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify134, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-134-favorite-view-recovery-freshness.ts"),
      source("../../../docs/BUILD_135_FAVORITE_VIEW_RECOVERY_EXPIRY_RECEIPT_HISTORY.md")
    ]);

  for (const token of [
    "recoverNamedInterfacePreferenceQuickFilter",
    '"expired"',
    "INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_FORMAT",
    "MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY",
    "prependInterfacePreferenceBundleImportReceipt",
    "parseInterfacePreferenceBundleImportReceiptHistory"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 135 preference library missing: " + token
    );
  }

  for (const token of [
    "Favorite view recovered",
    "favoriteViewRecoveryNotice",
    "Expired guidance window",
    "30-day guidance window",
    "Import reconciliation receipt history",
    "Export history",
    "Clear history",
    "readImportReconciliationReceiptHistory",
    "writeImportReconciliationReceiptHistory",
    "MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY"
  ]) {
    assert(insights.includes(token), "Build 135 Insights UI missing: " + token);
  }

  assert(
    insights.includes("recoverNamedInterfacePreferenceQuickFilter") &&
      insights.includes("writeProfileQuickFilter(recoveredView.filter)") &&
      insights.includes("prependInterfacePreferenceBundleImportReceipt") &&
      insights.includes("setImportReceiptHistory(nextHistory)") &&
      insights.includes(
        "INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY"
      ),
    "Build 135 must wire view recovery and bounded receipt history into browser-local UI state."
  );

  for (const selector of [
    ".interfaceFavoriteViewRecovery",
    ".interfaceRecoveryFreshness.expired",
    ".interfaceRecoveryExpiryGuidance",
    ".interfaceImportReceiptHistory",
    ".interfaceImportReceiptHistoryList"
  ]) {
    assert(css.includes(selector), "Build 135 CSS contract missing: " + selector);
  }

  for (const topic of [
    "favorite-view-recovery",
    "snapshot-expiry-guidance",
    "import-receipt-history"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 135 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 135 favorite view recovery, snapshot expiry guidance & import receipt history"
    ),
    "Help Center must register the Build 135 help group."
  );

  assert(
    shell.includes("Build 135 · Marble Standard"),
    "Build 135 shell must expose the current interface build."
  );

  assert(
    verify134.includes('shell.includes("Marble Standard")') &&
      !verify134.includes('shell.includes("Build 134 · Marble Standard")'),
    "Build 134 verifier must remain forward-compatible after the Build 135 shell label."
  );

  assert(
    pkg.includes("verify-build-135-favorite-recovery-expiry-history.ts"),
    "Build 135 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("favorite view recovery") &&
      docLower.includes("30-day") &&
      docLower.includes("guidance, not deletion") &&
      docLower.includes("ten") &&
      docLower.includes("receipt history") &&
      docLower.includes("rls"),
    "Build 135 documentation must preserve local-only recovery, expiry-guidance and receipt-history boundaries."
  );

  console.log(
    "Build 135 favorite view recovery, snapshot expiry guidance and receipt history verification passed."
  );
}

void main();
