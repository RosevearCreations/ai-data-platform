import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY,
  INTERFACE_PREFERENCE_IMPORT_RECEIPT_FORMAT,
  INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY,
  INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT,
  createInterfacePreferenceBundleImportReceipt,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  interfacePreferenceRecoverySnapshotFreshness,
  parseInterfacePreferenceBundleImportReceipt,
  parseInterfacePreferenceRecoverySnapshot,
  sanitizeNamedInterfacePreferenceQuickFilter,
  serializeInterfacePreferenceBundleImportReceipt
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

function localProfile(id: string, name: string, favorite = false) {
  return createNamedInterfacePreferenceProfile({
    id,
    name,
    favorite,
    preferences: {
      version: 1,
      navigationDensity: "adaptive",
      workspaceLayout: "balanced",
      recommendations: "all"
    }
  });
}

async function main() {
  assert(
    sanitizeNamedInterfacePreferenceQuickFilter("favorites") === "favorites" &&
      sanitizeNamedInterfacePreferenceQuickFilter("all") === "all" &&
      sanitizeNamedInterfacePreferenceQuickFilter("invalid") === "all" &&
      INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY.includes("named-profile-view"),
    "Build 134 must sanitize and isolate persisted favorite-view state."
  );

  const capturedAt = 1_700_000_000_000;
  const profiles = [
    localProfile("one", "One", true),
    localProfile("two", "Two")
  ];
  const snapshot = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "focused",
      recommendations: "shortcuts"
    },
    profiles,
    capturedAt
  );
  assert(
    snapshot.capturedAt === capturedAt,
    "Build 134 recovery snapshots must preserve their capture timestamp."
  );

  const fresh = interfacePreferenceRecoverySnapshotFreshness(
    snapshot,
    capturedAt + 23 * 60 * 60 * 1000
  );
  const aging = interfacePreferenceRecoverySnapshotFreshness(
    snapshot,
    capturedAt + 2 * 24 * 60 * 60 * 1000
  );
  const stale = interfacePreferenceRecoverySnapshotFreshness(
    snapshot,
    capturedAt + 8 * 24 * 60 * 60 * 1000
  );
  assert(
    fresh.status === "fresh" &&
      aging.status === "aging" &&
      stale.status === "stale",
    "Build 134 must classify recovery snapshot freshness across the 24-hour and seven-day boundaries."
  );

  const legacy = parseInterfacePreferenceRecoverySnapshot(
    JSON.stringify({
      format: INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT,
      version: 1,
      preferences: snapshot.preferences,
      namedProfiles: snapshot.namedProfiles
    })
  );
  assert(
    legacy.ok &&
      legacy.snapshot.capturedAt === null &&
      interfacePreferenceRecoverySnapshotFreshness(
        legacy.snapshot,
        capturedAt
      ).status === "unknown",
    "Build 134 must keep pre-timestamp recovery snapshots readable and mark their freshness unknown."
  );

  const plan = {
    currentCount: 2,
    selectedCount: 2,
    availableSlots: 6,
    conflictCount: 1,
    newSlotDemand: 1,
    projectedAdded: 1,
    projectedReplaced: 1,
    projectedSkippedConflicts: 0,
    projectedSkippedCapacity: 0,
    projectedFinalCount: 3,
    fitsWithoutCapacitySkips: true
  };
  const reconciliation = {
    matchesPlan: true,
    planned: {
      added: 1,
      replaced: 1,
      skippedConflicts: 0,
      skippedCapacity: 0,
      finalCount: 3
    },
    actual: {
      added: 1,
      replaced: 1,
      skippedConflicts: 0,
      skippedCapacity: 0,
      finalCount: 3
    },
    deviations: [] as string[]
  };

  const receipt = createInterfacePreferenceBundleImportReceipt({
    receiptId: "receipt-build134",
    createdAt: capturedAt,
    sourceName: "portable-bundle.json",
    strategy: "replace",
    selectedNames: ["One", "Travel"],
    plan,
    reconciliation
  });
  assert(
    receipt.format === INTERFACE_PREFERENCE_IMPORT_RECEIPT_FORMAT &&
      receipt.receiptId === "receipt-build134" &&
      receipt.createdAt === capturedAt &&
      receipt.strategy === "replace" &&
      receipt.selectedNames.join(",") === "One,Travel" &&
      receipt.reconciliation.matchesPlan,
    "Build 134 must create a complete local import reconciliation receipt."
  );

  const parsedReceipt = parseInterfacePreferenceBundleImportReceipt(
    serializeInterfacePreferenceBundleImportReceipt(receipt)
  );
  assert(
    parsedReceipt.ok &&
      parsedReceipt.receipt.sourceName === "portable-bundle.json" &&
      parsedReceipt.receipt.plan.projectedFinalCount === 3 &&
      parsedReceipt.receipt.reconciliation.actual.finalCount === 3,
    "Build 134 import receipts must round-trip without losing plan or outcome evidence."
  );

  const invalidReceipt = parseInterfacePreferenceBundleImportReceipt(
    JSON.stringify({
      ...receipt,
      createdAt: 0
    })
  );
  assert(
    !invalidReceipt.ok,
    "Build 134 must reject incomplete or invalid persisted import receipts."
  );

  assert(
    INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY.includes(
      "import-reconciliation-receipt"
    ),
    "Build 134 must isolate the latest receipt in a dedicated browser-local namespace."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify133, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-133-favorite-filters-recovery-confirmation.ts"),
      source("../../../docs/BUILD_134_FAVORITE_VIEW_RECOVERY_FRESHNESS_IMPORT_RECEIPT.md")
    ]);

  for (const token of [
    "INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY",
    "sanitizeNamedInterfacePreferenceQuickFilter",
    "capturedAt",
    "interfacePreferenceRecoverySnapshotFreshness",
    "INTERFACE_PREFERENCE_IMPORT_RECEIPT_FORMAT",
    "createInterfacePreferenceBundleImportReceipt",
    "parseInterfacePreferenceBundleImportReceipt"
  ]) {
    assert(preferencesLib.includes(token), "Build 134 preference library missing: " + token);
  }

  for (const token of [
    "readProfileQuickFilter",
    "writeProfileQuickFilter",
    "view persists in this browser",
    "Fresh snapshot",
    "Aging snapshot",
    "Stale snapshot",
    "Legacy snapshot",
    "recoveryFreshness",
    "Latest import reconciliation receipt",
    "Export receipt",
    "Clear receipt",
    "writeImportReconciliationReceipt",
    "INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY"
  ]) {
    assert(insights.includes(token), "Build 134 Insights UI missing: " + token);
  }

  assert(
    insights.includes("setProfileQuickFilter(savedFilter)") &&
      insights.includes("window.localStorage.setItem(\n      INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY") &&
      insights.includes("window.localStorage.removeItem(INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY)") &&
      insights.includes("createInterfacePreferenceBundleImportReceipt") &&
      insights.includes("setImportReconciliationReceipt(receipt)"),
    "Build 134 must restore persisted view state, clear it on full reset and persist the latest completed import receipt."
  );

  for (const selector of [
    ".interfaceRecoveryFreshness",
    ".interfaceRecoveryFreshness.stale",
    ".interfaceRecoveryFreshness.unknown",
    ".interfaceImportReceipt",
    ".interfaceImportReceiptMeta"
  ]) {
    assert(css.includes(selector), "Build 134 CSS contract missing: " + selector);
  }

  for (const topic of [
    "favorite-view-persistence",
    "recovery-snapshot-freshness",
    "import-reconciliation-receipt"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 134 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 134 favorite view persistence, recovery snapshot freshness & import reconciliation receipt"),
    "Help Center must register the Build 134 help group."
  );

  assert(
    shell.includes("Build 134 · Marble Standard"),
    "Build 134 shell must expose the current interface build."
  );

  assert(
    verify133.includes('shell.includes("Marble Standard")') &&
      !verify133.includes('shell.includes("Build 133 · Marble Standard")'),
    "Build 133 verifier must remain forward-compatible after the Build 134 shell label."
  );

  assert(
    pkg.includes("verify-build-134-favorite-view-recovery-freshness.ts"),
    "Build 134 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("favorite view persists") &&
      docLower.includes("legacy snapshot") &&
      docLower.includes("freshness") &&
      docLower.includes("reconciliation receipt") &&
      docLower.includes("rls"),
    "Build 134 documentation must preserve local-only persistence, freshness and receipt boundaries."
  );

  console.log("Build 134 favorite view persistence, recovery freshness and import receipt verification passed.");
}

void main();
