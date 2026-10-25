import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_FORMAT,
  INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY,
  MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT,
  assessInterfacePreferenceRecoverySnapshotRenewal,
  createInterfaceFavoriteViewRecoveryAuditEntry,
  createInterfacePreferenceBundleImportReceipt,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  filterInterfacePreferenceBundleImportReceiptHistory,
  parseInterfaceFavoriteViewRecoveryAudit,
  prependInterfaceFavoriteViewRecoveryAuditEntry,
  serializeInterfaceFavoriteViewRecoveryAudit
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

function profile(id: string) {
  return createNamedInterfacePreferenceProfile({
    id,
    name: "Profile " + id,
    preferences: {
      version: 1,
      navigationDensity: "adaptive",
      workspaceLayout: "balanced",
      recommendations: "all"
    }
  });
}

function receipt(
  id: string,
  strategy: "skip" | "replace" | "keep-both",
  matchesPlan: boolean
) {
  return createInterfacePreferenceBundleImportReceipt({
    receiptId: id,
    createdAt: 1_700_000_000_000 + Number(id.replace(/\D/g, "") || "0"),
    sourceName: id + ".json",
    strategy,
    selectedNames: ["One"],
    plan: {
      currentCount: 1,
      selectedCount: 1,
      availableSlots: 7,
      conflictCount: strategy === "skip" ? 1 : 0,
      newSlotDemand: strategy === "replace" ? 0 : 1,
      projectedAdded: strategy === "replace" ? 0 : 1,
      projectedReplaced: strategy === "replace" ? 1 : 0,
      projectedSkippedConflicts: strategy === "skip" ? 1 : 0,
      projectedSkippedCapacity: 0,
      projectedFinalCount: strategy === "replace" ? 1 : 2,
      fitsWithoutCapacitySkips: true
    },
    reconciliation: {
      matchesPlan,
      planned: {
        added: strategy === "replace" ? 0 : 1,
        replaced: strategy === "replace" ? 1 : 0,
        skippedConflicts: strategy === "skip" ? 1 : 0,
        skippedCapacity: 0,
        finalCount: strategy === "replace" ? 1 : 2
      },
      actual: {
        added: strategy === "replace" ? 0 : 1,
        replaced: strategy === "replace" ? 1 : 0,
        skippedConflicts: strategy === "skip" ? 1 : 0,
        skippedCapacity: 0,
        finalCount: strategy === "replace" ? 1 : 2
      },
      deviations: matchesPlan ? [] : ["Synthetic deviation."]
    }
  });
}

async function main() {
  let audit = [] as ReturnType<typeof createInterfaceFavoriteViewRecoveryAuditEntry>[];
  for (let index = 0; index < MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT + 3; index += 1) {
    audit = prependInterfaceFavoriteViewRecoveryAuditEntry(
      audit,
      createInterfaceFavoriteViewRecoveryAuditEntry({
        auditId: "audit-" + index,
        createdAt: 1_700_000_000_000 + index,
        trigger:
          index % 3 === 0
            ? "initial-load"
            : index % 3 === 1
              ? "filter-selection"
              : "last-favorite-removed",
        requestedFilter: "favorites",
        resolvedFilter: "all",
        reason: "Favorites view recovered to All profiles."
      })
    );
  }
  assert(
    audit.length === MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT &&
      audit[0]?.auditId ===
        "audit-" + (MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT + 2) &&
      audit.at(-1)?.auditId === "audit-3",
    "Build 136 recovery audit must stay newest-first and bounded to twelve entries."
  );

  const parsedAudit = parseInterfaceFavoriteViewRecoveryAudit(
    serializeInterfaceFavoriteViewRecoveryAudit(audit)
  );
  assert(
    parsedAudit.ok &&
      parsedAudit.audit.format === INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_FORMAT &&
      parsedAudit.audit.entries.length === audit.length &&
      parsedAudit.audit.entries[0]?.trigger === audit[0]?.trigger,
    "Build 136 recovery audit must round-trip through its versioned browser-local format."
  );
  assert(
    INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY.includes(
      "favorite-view-recovery-audit"
    ),
    "Build 136 recovery audit must use a dedicated browser-local storage namespace."
  );

  const capturedAt = 1_700_000_000_000;
  const snapshot = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "focused",
      recommendations: "shortcuts"
    },
    [profile("one")],
    capturedAt
  );
  const freshAssessment = assessInterfacePreferenceRecoverySnapshotRenewal(
    snapshot,
    capturedAt + 6 * 60 * 60 * 1000
  );
  const staleAssessment = assessInterfacePreferenceRecoverySnapshotRenewal(
    snapshot,
    capturedAt + 10 * 24 * 60 * 60 * 1000
  );
  const expiredAssessment = assessInterfacePreferenceRecoverySnapshotRenewal(
    snapshot,
    capturedAt + 31 * 24 * 60 * 60 * 1000
  );
  const legacyAssessment = assessInterfacePreferenceRecoverySnapshotRenewal(
    { ...snapshot, capturedAt: null },
    capturedAt
  );
  assert(
    freshAssessment.priority === "none" &&
      !freshAssessment.recommended &&
      staleAssessment.priority === "consider" &&
      staleAssessment.recommended &&
      expiredAssessment.priority === "recommended" &&
      expiredAssessment.recommended &&
      legacyAssessment.priority === "recommended" &&
      legacyAssessment.recommended,
    "Build 136 renewal assessment must distinguish fresh, stale, expired and legacy recovery points."
  );

  const receipts = [
    receipt("receipt-1", "skip", true),
    receipt("receipt-2", "replace", false),
    receipt("receipt-3", "keep-both", true),
    receipt("receipt-4", "replace", true)
  ];
  const matched = filterInterfacePreferenceBundleImportReceiptHistory(
    receipts,
    "matched",
    "all"
  );
  const replaceOnly = filterInterfacePreferenceBundleImportReceiptHistory(
    receipts,
    "all",
    "replace"
  );
  const deviatedReplace = filterInterfacePreferenceBundleImportReceiptHistory(
    receipts,
    "deviated",
    "replace"
  );
  assert(
    matched.map((item) => item.receiptId).join(",") ===
      "receipt-1,receipt-3,receipt-4" &&
      replaceOnly.map((item) => item.receiptId).join(",") ===
        "receipt-2,receipt-4" &&
      deviatedReplace.map((item) => item.receiptId).join(",") === "receipt-2",
    "Build 136 receipt-history filtering must combine outcome and strategy without changing receipt order."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify135, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-135-favorite-recovery-expiry-history.ts"),
      source("../../../docs/BUILD_136_RECOVERY_AUDIT_SNAPSHOT_RENEWAL_RECEIPT_FILTERS.md")
    ]);

  for (const token of [
    "INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_FORMAT",
    "MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT",
    "createInterfaceFavoriteViewRecoveryAuditEntry",
    "prependInterfaceFavoriteViewRecoveryAuditEntry",
    "assessInterfacePreferenceRecoverySnapshotRenewal",
    "filterInterfacePreferenceBundleImportReceiptHistory",
    "InterfacePreferenceReceiptHistoryOutcomeFilter",
    "InterfacePreferenceReceiptHistoryStrategyFilter"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 136 preference library missing: " + token
    );
  }

  for (const token of [
    "Favorite view recovery audit",
    "Export audit",
    "Clear audit",
    "Snapshot renewal guidance",
    "Review renewal",
    "Confirm renewal",
    "Cancel renewal",
    "Filter receipt history by outcome",
    "All outcomes",
    "All strategies",
    "No receipts match the selected history filters",
    "filteredImportReceiptHistory",
    "recordFavoriteViewRecovery"
  ]) {
    assert(insights.includes(token), "Build 136 Insights UI missing: " + token);
  }

  assert(
    insights.includes('trigger: "initial-load"') &&
      insights.includes('"filter-selection"') &&
      insights.includes('"last-favorite-removed"') &&
      insights.includes("setSnapshotRenewalArmed(false)") &&
      insights.includes("aria-pressed={snapshotRenewalArmed}") &&
      insights.includes("aria-pressed={receiptOutcomeFilter === value}") &&
      insights.includes("INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY") &&
      insights.includes("INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY"),
    "Build 136 must wire recovery audit, renewal confirmation and history filters into browser-local UI state."
  );

  for (const selector of [
    ".interfaceFavoriteRecoveryAudit",
    ".interfaceFavoriteRecoveryAuditList",
    ".interfaceRecoveryRenewal",
    ".interfaceRecoveryRenewal.recommended",
    ".interfaceReceiptHistoryFilters"
  ]) {
    assert(css.includes(selector), "Build 136 CSS contract missing: " + selector);
  }

  for (const topic of [
    "favorite-view-recovery-audit",
    "recovery-snapshot-renewal",
    "receipt-history-filtering"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 136 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 136 favorite view recovery audit, recovery snapshot renewal workflow & receipt history filtering"
    ),
    "Help Center must register the Build 136 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 136 shell must preserve Marble Standard as later interface builds advance."
  );

  assert(
    verify135.includes('shell.includes("Marble Standard")') &&
      !verify135.includes('shell.includes("Build 135 · Marble Standard")'),
    "Build 135 verifier must remain forward-compatible after the Build 136 shell label."
  );

  assert(
    pkg.includes("verify-build-136-recovery-audit-renewal-filters.ts"),
    "Build 136 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit") &&
      docLower.includes("twelve") &&
      docLower.includes("two-step renewal") &&
      docLower.includes("receipt history filtering") &&
      docLower.includes("view-only") &&
      docLower.includes("rls"),
    "Build 136 documentation must preserve local-only audit, renewal and view-only filtering boundaries."
  );

  console.log(
    "Build 136 recovery audit, snapshot renewal workflow and receipt history filtering verification passed."
  );
}

void main();
