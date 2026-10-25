"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HelpInfo } from "@/app/help/HelpInfo";
import {
  NAVIGATION_INSIGHTS_STORAGE_KEY,
  NAVIGATION_USAGE_EVENT,
  emptyNavigationUsageSnapshot,
  navigationUsageTotals,
  personalizedInterfaceRecommendations,
  recordNavigationShortcutUse,
  recordNavigationVisit,
  sanitizeNavigationUsageSnapshot,
  shortcutDiscoverabilityMetrics,
  type NavigationShortcutId,
  type NavigationUsageSnapshot
} from "@/lib/navigation-insights";
import {
  INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_NAMED_PROFILES_STORAGE_KEY,
  INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY,
  INTERFACE_PREFERENCE_BUNDLE_FORMAT,
  INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY,
  INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY,
  INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY,
  INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY,
  INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY,
  INTERFACE_PREFERENCE_PRESETS,
  INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS,
  INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS,
  INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_RECONCILED_EVENT,
  INTERFACE_PREFERENCES_STORAGE_KEY,
  INTERFACE_RESET_GOVERNANCE,
  MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT,
  MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY,
  MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY,
  MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_NAMED_INTERFACE_PROFILES,
  analyzeInterfacePreferenceBundleImport,
  applyInterfacePreferencePreset,
  assessInterfacePreferenceRecoverySnapshotRenewal,
  createInterfaceFavoriteViewRecoveryAuditEntry,
  createInterfacePreferenceRecoveryRenewalReceipt,
  createInterfaceRecoveryAuditPresetRecoveryAuditEntry,
  createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry,
  createInterfaceReceiptPresetRecoveryAuditEntry,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfacePreferenceBundleImportReceipt,
  createNamedInterfacePreferenceProfile,
  defaultInterfacePreferences,
  diffInterfacePreferenceRecoverySnapshot,
  duplicateNamedInterfacePreferenceProfile,
  favoriteNamedInterfacePreferenceProfiles,
  filterInterfaceFavoriteViewRecoveryAudit,
  filterInterfacePreferenceBundleImportReceiptHistory,
  filterInterfacePreferenceRecoveryRenewalReceiptHistory,
  filterInterfaceRecoveryAuditPresetRecoveryAudit,
  filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  filterInterfaceReceiptPresetRecoveryAudit,
  interfacePreferenceReceiptSearchPresetById,
  interfaceReceiptPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryAuditSearchPresetById,
  interfaceRecoveryRenewalHistorySearchPresetById,
  interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById,
  filterNamedInterfacePreferenceProfiles,
  importedInterfacePreferenceProvenance,
  interfacePreferenceRecoverySnapshotFreshness,
  parseInterfaceFavoriteViewRecoveryAudit,
  parseInterfacePreferenceBundle,
  parseInterfacePreferenceBundleImportReceipt,
  parseInterfacePreferenceBundleImportReceiptHistory,
  parseInterfacePreferenceRecoveryRenewalReceipt,
  parseInterfacePreferenceRecoveryRenewalReceiptHistory,
  parseInterfacePreferenceRecoverySnapshot,
  parseInterfaceRecoveryAuditPresetRecoveryAudit,
  parseInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  parseInterfaceReceiptPresetRecoveryAudit,
  parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit,
  planInterfacePreferenceBundleImportCapacity,
  matchingInterfacePreferencePreset,
  matchingNamedInterfacePreferenceProfile,
  namedInterfacePreferenceProvenanceLabel,
  parseInterfacePreferenceProfile,
  previewInterfacePreferenceProfile,
  prependInterfaceFavoriteViewRecoveryAuditEntry,
  prependInterfacePreferenceBundleImportReceipt,
  prependInterfacePreferenceRecoveryRenewalReceipt,
  prependInterfaceRecoveryAuditPresetRecoveryAuditEntry,
  prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry,
  prependInterfaceReceiptPresetRecoveryAuditEntry,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry,
  recommendationPreferenceAllowsKind,
  reconcileInterfacePreferenceBundleImportOutcome,
  recoverInterfacePreferenceReceiptSearchPresetId,
  recoverInterfaceReceiptPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryRenewalHistorySearchPresetId,
  recoverNamedInterfacePreferenceQuickFilter,
  removeNamedInterfacePreferenceProfile,
  renameNamedInterfacePreferenceProfile,
  reorderNamedInterfacePreferenceProfile,
  resolveInterfacePreferenceBundleImport,
  selectInterfacePreferenceBundleProfiles,
  searchInterfaceFavoriteViewRecoveryAudit,
  searchInterfacePreferenceBundleImportReceiptHistory,
  searchInterfacePreferenceRecoveryRenewalReceiptHistory,
  searchInterfaceRecoveryAuditPresetRecoveryAudit,
  searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  searchInterfaceReceiptPresetRecoveryAudit,
  setNamedInterfacePreferenceProfileFavorite,
  sanitizeInterfacePreferenceReceiptSearchPresetId,
  sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryRenewalHistorySearchPresetId,
  sanitizeInterfacePreferences,
  sanitizeNamedInterfacePreferenceName,
  sanitizeNamedInterfacePreferenceProfiles,
  sanitizeNamedInterfacePreferenceQuickFilter,
  serializeInterfaceFavoriteViewRecoveryAudit,
  serializeInterfacePreferenceBundle,
  serializeInterfacePreferenceBundleImportReceipt,
  serializeInterfacePreferenceBundleImportReceiptHistory,
  serializeInterfacePreferenceProfile,
  serializeInterfacePreferenceRecoveryRenewalReceipt,
  serializeInterfacePreferenceRecoveryRenewalReceiptHistory,
  serializeInterfacePreferenceRecoverySnapshot,
  serializeInterfaceRecoveryAuditPresetRecoveryAudit,
  serializeInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  serializeInterfaceReceiptPresetRecoveryAudit,
  serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit,
  suggestDuplicateNamedInterfacePreferenceName,
  upsertNamedInterfacePreferenceProfile,
  type InterfaceFavoriteViewRecoveryAuditEntryV1,
  type InterfaceFavoriteViewRecoveryAuditFilter,
  type InterfaceFavoriteViewRecoveryAuditTrigger,
  type InterfacePreferenceBundleConflictStrategy,
  type InterfacePreferenceBundleImportOutcomeReconciliation,
  type InterfacePreferenceBundleImportReceiptV1,
  type InterfacePreferenceBundleV1,
  type InterfacePreferencePresetId,
  type InterfacePreferenceProfileProvenance,
  type InterfacePreferenceRecoveryRenewalHistoryFreshnessFilter,
  type InterfacePreferenceRecoveryRenewalReceiptV1,
  type InterfacePreferenceReceiptSearchPresetId,
  type InterfaceReceiptPresetRecoveryAuditAgeFilter,
  type InterfaceReceiptPresetRecoveryAuditEntryV1,
  type InterfaceReceiptPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryAuditPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalHistorySearchPresetId,
  type InterfaceRecoveryRenewalSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId,
  type InterfacePreferenceReceiptHistoryOutcomeFilter,
  type InterfacePreferenceReceiptHistoryStrategyFilter,
  type InterfacePreferenceRecoverySnapshotV1,
  type InterfacePreferenceReconciliation,
  type InterfacePreferences,
  type NamedInterfacePreferenceProfile,
  type NamedInterfacePreferenceQuickFilter
} from "@/lib/navigation-preferences";

function readSnapshot() {
  try {
    const raw = window.localStorage.getItem(NAVIGATION_INSIGHTS_STORAGE_KEY);
    return sanitizeNavigationUsageSnapshot(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyNavigationUsageSnapshot();
  }
}

function writeSnapshot(snapshot: NavigationUsageSnapshot) {
  try {
    window.localStorage.setItem(
      NAVIGATION_INSIGHTS_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // Local insights are optional and must never interrupt navigation.
  }
}

function readNamedProfiles() {
  try {
    const raw = window.localStorage.getItem(INTERFACE_NAMED_PROFILES_STORAGE_KEY);
    return sanitizeNamedInterfacePreferenceProfiles(raw ? JSON.parse(raw) : null);
  } catch {
    return [];
  }
}

function writeNamedProfiles(profiles: NamedInterfacePreferenceProfile[]) {
  try {
    window.localStorage.setItem(
      INTERFACE_NAMED_PROFILES_STORAGE_KEY,
      JSON.stringify(sanitizeNamedInterfacePreferenceProfiles(profiles))
    );
  } catch {
    // Named profiles are optional browser-local convenience state.
  }
}

function readRecoverySnapshot() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY
    );
    if (!raw) return null;
    const parsed = parseInterfacePreferenceRecoverySnapshot(raw);
    return parsed.ok ? parsed.snapshot : null;
  } catch {
    return null;
  }
}

function writeRecoverySnapshot(
  snapshot: InterfacePreferenceRecoverySnapshotV1
) {
  try {
    window.localStorage.setItem(
      INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // Recovery snapshots are optional browser-local safety state.
  }
}

function readProfileQuickFilter(): NamedInterfacePreferenceQuickFilter {
  try {
    return sanitizeNamedInterfacePreferenceQuickFilter(
      window.localStorage.getItem(INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY)
    );
  } catch {
    return "all";
  }
}

function writeProfileQuickFilter(
  filter: NamedInterfacePreferenceQuickFilter
) {
  try {
    window.localStorage.setItem(
      INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY,
      filter
    );
  } catch {
    // Favorite view persistence is optional browser-local presentation state.
  }
}

function readReceiptSearchPreset(): InterfacePreferenceReceiptSearchPresetId {
  try {
    return sanitizeInterfacePreferenceReceiptSearchPresetId(
      window.localStorage.getItem(
        INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY
      )
    );
  } catch {
    return "all";
  }
}

function writeReceiptSearchPreset(id: InterfacePreferenceReceiptSearchPresetId) {
  try {
    window.localStorage.setItem(
      INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Receipt preset persistence is optional browser-local view state.
  }
}

function clearReceiptSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Receipt preset persistence is optional browser-local view state.
  }
}

function readReceiptSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery = recoverInterfacePreferenceReceiptSearchPresetId(raw);
    return {
      ...(recovery.recovered
        ? recovery
        : {
            ...recovery,
            presetId: readReceiptSearchPreset()
          }),
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfacePreferenceReceiptSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function readRecoveryAuditSearchPreset(): InterfaceRecoveryAuditSearchPresetId {
  try {
    return sanitizeInterfaceRecoveryAuditSearchPresetId(
      window.localStorage.getItem(
        INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      )
    );
  } catch {
    return "all";
  }
}

function readRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery = recoverInterfaceRecoveryAuditSearchPresetId(raw);
    return {
      ...(recovery.recovered
        ? recovery
        : {
            ...recovery,
            presetId: readRecoveryAuditSearchPreset()
          }),
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRecoveryAuditSearchPreset(
  id: InterfaceRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Recovery audit preset persistence is optional browser-local view state.
  }
}

function clearRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Recovery audit preset persistence is optional browser-local view state.
  }
}

function readRecoveryRenewalHistorySearchPreset(): InterfaceRecoveryRenewalHistorySearchPresetId {
  try {
    return sanitizeInterfaceRecoveryRenewalHistorySearchPresetId(
      window.localStorage.getItem(
        INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY
      )
    );
  } catch {
    return "all";
  }
}

function readRecoveryRenewalHistorySearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery = recoverInterfaceRecoveryRenewalHistorySearchPresetId(raw);
    return {
      ...(recovery.recovered
        ? recovery
        : {
            ...recovery,
            presetId: readRecoveryRenewalHistorySearchPreset()
          }),
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryRenewalHistorySearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRecoveryRenewalHistorySearchPreset(
  id: InterfaceRecoveryRenewalHistorySearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Renewal-history preset persistence is optional browser-local view state.
  }
}

function clearRecoveryRenewalHistorySearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Renewal-history preset persistence is optional browser-local view state.
  }
}

function readReceiptRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(raw);
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeReceiptRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(entries)
    );
  } catch {
    // Receipt recovery-audit preset recovery evidence is optional browser-local state.
  }
}

function readReceiptPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed = parseInterfaceReceiptPresetRecoveryAudit(raw);
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeReceiptPresetRecoveryAudit(
  entries: InterfaceReceiptPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceReceiptPresetRecoveryAudit(entries)
    );
  } catch {
    // Receipt preset recovery audit is optional browser-local evidence.
  }
}

function readRecoveryAuditPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId(raw);
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRecoveryAuditPresetRecoveryAuditSearchPreset(
  id: InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Recovery-audit repair search preset persistence is optional browser-local view state.
  }
}

function clearRecoveryAuditPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Recovery-audit repair search preset persistence is optional browser-local view state.
  }
}

function readReceiptPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceReceiptPresetRecoveryAuditSearchPresetId(raw);
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceReceiptPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeReceiptPresetRecoveryAuditSearchPreset(
  id: InterfaceReceiptPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Receipt recovery audit search preset persistence is optional browser-local view state.
  }
}

function clearReceiptPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Receipt recovery audit search preset persistence is optional browser-local view state.
  }
}

function readRecoveryAuditPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed = parseInterfaceRecoveryAuditPresetRecoveryAudit(raw);
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRecoveryAuditPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryAuditPresetRecoveryAudit(entries)
    );
  } catch {
    // Recovery-audit preset recovery audit is optional browser-local evidence.
  }
}

function readRecoveryRenewalSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed = parseInterfaceRecoveryRenewalSearchPresetRecoveryAudit(raw);
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRecoveryRenewalSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryRenewalSearchPresetRecoveryAudit(entries)
    );
  } catch {
    // Renewal search preset recovery audit is optional browser-local evidence.
  }
}

function readImportReconciliationReceipt() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY
    );
    if (!raw) return null;
    const parsed = parseInterfacePreferenceBundleImportReceipt(raw);
    return parsed.ok ? parsed.receipt : null;
  } catch {
    return null;
  }
}

function writeImportReconciliationReceipt(
  receipt: InterfacePreferenceBundleImportReceiptV1
) {
  try {
    window.localStorage.setItem(
      INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY,
      serializeInterfacePreferenceBundleImportReceipt(receipt)
    );
  } catch {
    // The latest import receipt is optional browser-local evidence.
  }
}

function readImportReconciliationReceiptHistory() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed = parseInterfacePreferenceBundleImportReceiptHistory(raw);
    return parsed.ok ? parsed.history.receipts : [];
  } catch {
    return [];
  }
}

function writeImportReconciliationReceiptHistory(
  receipts: InterfacePreferenceBundleImportReceiptV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY,
      serializeInterfacePreferenceBundleImportReceiptHistory(receipts)
    );
  } catch {
    // Receipt history is optional browser-local evidence.
  }
}

function readFavoriteViewRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed = parseInterfaceFavoriteViewRecoveryAudit(raw);
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeFavoriteViewRecoveryAudit(
  entries: InterfaceFavoriteViewRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceFavoriteViewRecoveryAudit(entries)
    );
  } catch {
    // Recovery audit is optional browser-local evidence.
  }
}

function readRecoveryRenewalReceipt() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY
    );
    if (!raw) return null;
    const parsed = parseInterfacePreferenceRecoveryRenewalReceipt(raw);
    return parsed.ok ? parsed.receipt : null;
  } catch {
    return null;
  }
}

function writeRecoveryRenewalReceipt(
  receipt: InterfacePreferenceRecoveryRenewalReceiptV1
) {
  try {
    window.localStorage.setItem(
      INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY,
      serializeInterfacePreferenceRecoveryRenewalReceipt(receipt)
    );
  } catch {
    // Renewal receipt is optional browser-local evidence.
  }
}

function readRecoveryRenewalReceiptHistory() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed = parseInterfacePreferenceRecoveryRenewalReceiptHistory(raw);
    return parsed.ok ? parsed.history.receipts : [];
  } catch {
    return [];
  }
}

function writeRecoveryRenewalReceiptHistory(
  receipts: InterfacePreferenceRecoveryRenewalReceiptV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY,
      serializeInterfacePreferenceRecoveryRenewalReceiptHistory(receipts)
    );
  } catch {
    // Renewal receipt history is optional browser-local evidence.
  }
}

export function NavigationInsights() {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const bundleImportFileRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<NavigationUsageSnapshot>(
    emptyNavigationUsageSnapshot
  );
  const [preferences, setPreferences] = useState<InterfacePreferences>(
    defaultInterfacePreferences
  );
  const [reconciliation, setReconciliation] =
    useState<InterfacePreferenceReconciliation | null>(null);
  const [resetAllArmed, setResetAllArmed] = useState(false);
  const [importPreview, setImportPreview] =
    useState<InterfacePreferenceReconciliation | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [portabilityStatus, setPortabilityStatus] = useState<string | null>(null);
  const [namedProfiles, setNamedProfiles] = useState<NamedInterfacePreferenceProfile[]>([]);
  const [profileName, setProfileName] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [importSource, setImportSource] =
    useState<InterfacePreferenceProfileProvenance | null>(null);
  const [bundlePreview, setBundlePreview] =
    useState<InterfacePreferenceBundleV1 | null>(null);
  const [bundleSourceName, setBundleSourceName] = useState("");
  const [bundleConflictStrategy, setBundleConflictStrategy] =
    useState<InterfacePreferenceBundleConflictStrategy>("skip");
  const [bundleSelectedNames, setBundleSelectedNames] = useState<string[]>([]);
  const [recoverySnapshot, setRecoverySnapshot] =
    useState<InterfacePreferenceRecoverySnapshotV1 | null>(null);
  const [profileQuickFilter, setProfileQuickFilter] =
    useState<NamedInterfacePreferenceQuickFilter>("all");
  const [recoveryRestoreArmed, setRecoveryRestoreArmed] = useState(false);
  const [bundleImportOutcome, setBundleImportOutcome] =
    useState<InterfacePreferenceBundleImportOutcomeReconciliation | null>(null);
  const [importReconciliationReceipt, setImportReconciliationReceipt] =
    useState<InterfacePreferenceBundleImportReceiptV1 | null>(null);
  const [importReceiptHistory, setImportReceiptHistory] = useState<
    InterfacePreferenceBundleImportReceiptV1[]
  >([]);
  const [favoriteViewRecoveryNotice, setFavoriteViewRecoveryNotice] =
    useState<string | null>(null);
  const [favoriteViewRecoveryAudit, setFavoriteViewRecoveryAudit] = useState<
    InterfaceFavoriteViewRecoveryAuditEntryV1[]
  >([]);
  const [snapshotRenewalArmed, setSnapshotRenewalArmed] = useState(false);
  const [receiptOutcomeFilter, setReceiptOutcomeFilter] =
    useState<InterfacePreferenceReceiptHistoryOutcomeFilter>("all");
  const [receiptStrategyFilter, setReceiptStrategyFilter] =
    useState<InterfacePreferenceReceiptHistoryStrategyFilter>("all");
  const [recoveryAuditFilter, setRecoveryAuditFilter] =
    useState<InterfaceFavoriteViewRecoveryAuditFilter>("all");
  const [recoveryRenewalReceipt, setRecoveryRenewalReceipt] =
    useState<InterfacePreferenceRecoveryRenewalReceiptV1 | null>(null);
  const [receiptHistorySearch, setReceiptHistorySearch] = useState("");
  const [recoveryAuditSearch, setRecoveryAuditSearch] = useState("");
  const [recoveryRenewalReceiptHistory, setRecoveryRenewalReceiptHistory] =
    useState<InterfacePreferenceRecoveryRenewalReceiptV1[]>([]);
  const [receiptSearchPresetId, setReceiptSearchPresetId] =
    useState<InterfacePreferenceReceiptSearchPresetId | null>("all");
  const [recoveryAuditSearchPresetId, setRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryAuditSearchPresetId | null>("all");
  const [renewalHistoryFreshnessFilter, setRenewalHistoryFreshnessFilter] =
    useState<InterfacePreferenceRecoveryRenewalHistoryFreshnessFilter>("all");
  const [renewalHistorySearch, setRenewalHistorySearch] = useState("");
  const [receiptPresetRecoveryNotice, setReceiptPresetRecoveryNotice] =
    useState<string | null>(null);
  const [recoveryAuditPresetRecoveryNotice, setRecoveryAuditPresetRecoveryNotice] =
    useState<string | null>(null);
  const [renewalHistorySearchPresetId, setRenewalHistorySearchPresetId] =
    useState<InterfaceRecoveryRenewalHistorySearchPresetId | null>("all");
  const [receiptPresetRecoveryAudit, setReceiptPresetRecoveryAudit] = useState<
    InterfaceReceiptPresetRecoveryAuditEntryV1[]
  >([]);
  const [recoveryAuditPresetRecoveryAudit, setRecoveryAuditPresetRecoveryAudit] =
    useState<InterfaceRecoveryAuditPresetRecoveryAuditEntryV1[]>([]);
  const [receiptPresetRecoveryAuditAgeFilter, setReceiptPresetRecoveryAuditAgeFilter] =
    useState<InterfaceReceiptPresetRecoveryAuditAgeFilter>("all");
  const [recoveryAuditPresetRecoveryAuditAgeFilter, setRecoveryAuditPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryAuditPresetRecoveryAuditAgeFilter>("all");
  const [renewalHistoryPresetRecoveryNotice, setRenewalHistoryPresetRecoveryNotice] =
    useState<string | null>(null);
  const [receiptPresetRecoveryAuditSearch, setReceiptPresetRecoveryAuditSearch] =
    useState("");
  const [recoveryAuditPresetRecoveryAuditSearch, setRecoveryAuditPresetRecoveryAuditSearch] =
    useState("");
  const [recoveryAuditPresetRecoveryAuditSearchPresetId, setRecoveryAuditPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId | null>("all");
  const [recoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice, setRecoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [renewalHistoryPresetRecoveryAudit, setRenewalHistoryPresetRecoveryAudit] =
    useState<InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[]>([]);
  const [renewalHistoryPresetRecoveryAuditAgeFilter, setRenewalHistoryPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryRenewalSearchPresetRecoveryAuditAgeFilter>("all");
  const [renewalHistoryPresetRecoveryAuditSearch, setRenewalHistoryPresetRecoveryAuditSearch] =
    useState("");
  const [renewalHistoryPresetRecoveryAuditSearchPresetId, setRenewalHistoryPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [receiptPresetRecoveryAuditSearchPresetId, setReceiptPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceReceiptPresetRecoveryAuditSearchPresetId | null>("all");
  const [receiptPresetRecoveryAuditSearchPresetRecoveryNotice, setReceiptPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [receiptRecoveryAuditSearchPresetRecoveryAudit, setReceiptRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);

  useEffect(() => {
    const next = recordNavigationVisit(readSnapshot(), pathname);
    setSnapshot(next);
    writeSnapshot(next);

    try {
      const raw = window.localStorage.getItem(INTERFACE_PREFERENCES_STORAGE_KEY);
      setPreferences(
        sanitizeInterfacePreferences(raw ? JSON.parse(raw) : null)
      );
    } catch {
      setPreferences(defaultInterfacePreferences());
    }
  }, [pathname]);

  useEffect(() => {
    const profiles = readNamedProfiles();
    const savedFilter = readProfileQuickFilter();
    const recoveredView = recoverNamedInterfacePreferenceQuickFilter(
      profiles,
      savedFilter
    );
    const visibleProfiles = filterNamedInterfacePreferenceProfiles(
      profiles,
      recoveredView.filter
    );
    const receipt = readImportReconciliationReceipt();
    const auditPresetRecovery = readRecoveryAuditSearchPresetRecovery();
    const persistedAuditPreset =
      interfaceRecoveryAuditSearchPresetById(auditPresetRecovery.presetId);
    const renewalHistoryPresetRecovery =
      readRecoveryRenewalHistorySearchPresetRecovery();
    const persistedRenewalHistoryPreset =
      interfaceRecoveryRenewalHistorySearchPresetById(
        renewalHistoryPresetRecovery.presetId
      );
    const receiptPresetRecovery = readReceiptSearchPresetRecovery();
    const persistedReceiptPreset =
      interfacePreferenceReceiptSearchPresetById(
        receiptPresetRecovery.presetId
      );
    const recoveryAuditRepairSearchPresetRecovery =
      readRecoveryAuditPresetRecoveryAuditSearchPresetRecovery();
    const persistedRecoveryAuditRepairSearchPreset =
      interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById(
        recoveryAuditRepairSearchPresetRecovery.presetId
      );
    const receiptRecoveryAuditSearchPresetRecovery =
      readReceiptPresetRecoveryAuditSearchPresetRecovery();
    const persistedReceiptRecoveryAuditSearchPreset =
      interfaceReceiptPresetRecoveryAuditSearchPresetById(
        receiptRecoveryAuditSearchPresetRecovery.presetId
      );
    let receiptHistory = readImportReconciliationReceiptHistory();
    let recoveryAudit = readFavoriteViewRecoveryAudit();
    let receiptRecoveryAudit = readReceiptPresetRecoveryAudit();
    let recoveryAuditRecoveryAudit = readRecoveryAuditPresetRecoveryAudit();
    let renewalPresetRecoveryAudit =
      readRecoveryRenewalSearchPresetRecoveryAudit();
    let receiptRecoveryAuditPresetRecoveryAudit =
      readReceiptRecoveryAuditSearchPresetRecoveryAudit();

    if (recoveryAuditRepairSearchPresetRecovery.recovered) {
      writeRecoveryAuditPresetRecoveryAuditSearchPreset(
        recoveryAuditRepairSearchPresetRecovery.presetId
      );
    }

    if (receiptRecoveryAuditSearchPresetRecovery.recovered) {
      writeReceiptPresetRecoveryAuditSearchPreset(
        receiptRecoveryAuditSearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "receipt-recovery-audit-preset-recovery-" +
                Date.now().toString(36),
          requestedPresetId:
            receiptRecoveryAuditSearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            receiptRecoveryAuditSearchPresetRecovery.presetId,
          reason:
            receiptRecoveryAuditSearchPresetRecovery.reason ??
            "Receipt recovery audit search preset recovered."
        });
      receiptRecoveryAuditPresetRecoveryAudit =
        prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry(
          receiptRecoveryAuditPresetRecoveryAudit,
          recoveryEntry
        );
      writeReceiptRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditPresetRecoveryAudit
      );
    }

    if (renewalHistoryPresetRecovery.recovered) {
      writeRecoveryRenewalHistorySearchPreset(
        renewalHistoryPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "renewal-preset-recovery-" + Date.now().toString(36),
          requestedPresetId: renewalHistoryPresetRecovery.requestedPresetId,
          recoveredPresetId: renewalHistoryPresetRecovery.presetId,
          reason:
            renewalHistoryPresetRecovery.reason ??
            "Renewal history search preset recovered."
        });
      renewalPresetRecoveryAudit =
        prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry(
          renewalPresetRecoveryAudit,
          recoveryEntry
        );
      writeRecoveryRenewalSearchPresetRecoveryAudit(
        renewalPresetRecoveryAudit
      );
    }

    if (auditPresetRecovery.recovered) {
      writeRecoveryAuditSearchPreset(auditPresetRecovery.presetId);
      const recoveryEntry =
        createInterfaceRecoveryAuditPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "audit-preset-recovery-" + Date.now().toString(36),
          requestedPresetId: auditPresetRecovery.requestedPresetId,
          recoveredPresetId: auditPresetRecovery.presetId,
          reason:
            auditPresetRecovery.reason ?? "Recovery audit preset recovered."
        });
      recoveryAuditRecoveryAudit =
        prependInterfaceRecoveryAuditPresetRecoveryAuditEntry(
          recoveryAuditRecoveryAudit,
          recoveryEntry
        );
      writeRecoveryAuditPresetRecoveryAudit(recoveryAuditRecoveryAudit);
    }

    if (receiptPresetRecovery.recovered) {
      writeReceiptSearchPreset(receiptPresetRecovery.presetId);
      const recoveryEntry = createInterfaceReceiptPresetRecoveryAuditEntry({
        auditId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : "receipt-preset-recovery-" + Date.now().toString(36),
        requestedPresetId: receiptPresetRecovery.requestedPresetId,
        recoveredPresetId: receiptPresetRecovery.presetId,
        reason:
          receiptPresetRecovery.reason ?? "Receipt preset recovered."
      });
      receiptRecoveryAudit = prependInterfaceReceiptPresetRecoveryAuditEntry(
        receiptRecoveryAudit,
        recoveryEntry
      );
      writeReceiptPresetRecoveryAudit(receiptRecoveryAudit);
    }
    const renewalReceipt = readRecoveryRenewalReceipt();
    let renewalReceiptHistory = readRecoveryRenewalReceiptHistory();

    if (!receiptHistory.length && receipt) {
      receiptHistory = prependInterfacePreferenceBundleImportReceipt(
        receiptHistory,
        receipt
      );
      writeImportReconciliationReceiptHistory(receiptHistory);
    }

    if (!renewalReceiptHistory.length && renewalReceipt) {
      renewalReceiptHistory = prependInterfacePreferenceRecoveryRenewalReceipt(
        renewalReceiptHistory,
        renewalReceipt
      );
      writeRecoveryRenewalReceiptHistory(renewalReceiptHistory);
    }

    if (recoveredView.recovered) {
      writeProfileQuickFilter(recoveredView.filter);
      const auditEntry = createInterfaceFavoriteViewRecoveryAuditEntry({
        auditId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : "view-recovery-" + Date.now().toString(36),
        trigger: "initial-load",
        requestedFilter: savedFilter,
        resolvedFilter: recoveredView.filter,
        reason: recoveredView.reason ?? "Favorite view recovered."
      });
      recoveryAudit = prependInterfaceFavoriteViewRecoveryAuditEntry(
        recoveryAudit,
        auditEntry
      );
      writeFavoriteViewRecoveryAudit(recoveryAudit);
    }

    setRecoverySnapshot(readRecoverySnapshot());
    setRecoveryRenewalReceipt(renewalReceiptHistory[0] ?? renewalReceipt);
    setRecoveryRenewalReceiptHistory(renewalReceiptHistory);
    setImportReconciliationReceipt(receiptHistory[0] ?? receipt);
    setImportReceiptHistory(receiptHistory);
    setReceiptOutcomeFilter(persistedReceiptPreset.outcomeFilter);
    setReceiptStrategyFilter(persistedReceiptPreset.strategyFilter);
    setReceiptHistorySearch(persistedReceiptPreset.query);
    setReceiptSearchPresetId(persistedReceiptPreset.id);
    setReceiptPresetRecoveryNotice(receiptPresetRecovery.reason);
    setReceiptPresetRecoveryAudit(receiptRecoveryAudit);
    setReceiptPresetRecoveryAuditAgeFilter(
      persistedReceiptRecoveryAuditSearchPreset.ageFilter
    );
    setReceiptPresetRecoveryAuditSearch(
      persistedReceiptRecoveryAuditSearchPreset.query
    );
    setReceiptPresetRecoveryAuditSearchPresetId(
      persistedReceiptRecoveryAuditSearchPreset.id
    );
    setReceiptPresetRecoveryAuditSearchPresetRecoveryNotice(
      receiptRecoveryAuditSearchPresetRecovery.reason
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAudit(
      receiptRecoveryAuditPresetRecoveryAudit
    );
    setRecoveryAuditPresetRecoveryNotice(auditPresetRecovery.reason);
    setRecoveryAuditPresetRecoveryAudit(recoveryAuditRecoveryAudit);
    setRecoveryAuditPresetRecoveryAuditAgeFilter(
      persistedRecoveryAuditRepairSearchPreset.ageFilter
    );
    setRecoveryAuditPresetRecoveryAuditSearch(
      persistedRecoveryAuditRepairSearchPreset.query
    );
    setRecoveryAuditPresetRecoveryAuditSearchPresetId(
      persistedRecoveryAuditRepairSearchPreset.id
    );
    setRecoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice(
      recoveryAuditRepairSearchPresetRecovery.reason
    );
    setRecoveryAuditFilter(persistedAuditPreset.triggerFilter);
    setRecoveryAuditSearch(persistedAuditPreset.query);
    setRecoveryAuditSearchPresetId(persistedAuditPreset.id);
    setRenewalHistoryFreshnessFilter(
      persistedRenewalHistoryPreset.freshnessFilter
    );
    setRenewalHistorySearch(persistedRenewalHistoryPreset.query);
    setRenewalHistorySearchPresetId(persistedRenewalHistoryPreset.id);
    setRenewalHistoryPresetRecoveryNotice(
      renewalHistoryPresetRecovery.reason
    );
    setRenewalHistoryPresetRecoveryAudit(renewalPresetRecoveryAudit);
    setFavoriteViewRecoveryAudit(recoveryAudit);
    setFavoriteViewRecoveryNotice(recoveredView.reason);
    setNamedProfiles(profiles);
    setProfileQuickFilter(recoveredView.filter);
    setSelectedProfileId((current) =>
      visibleProfiles.some((profile) => profile.id === current)
        ? current
        : visibleProfiles[0]?.id ?? ""
    );
  }, []);

  useEffect(() => {
    function handleUsage(event: Event) {
      const detail = (event as CustomEvent<{ shortcutId?: NavigationShortcutId }>).detail;
      const shortcutId = detail?.shortcutId;
      if (shortcutId !== "command-palette" && shortcutId !== "keyboard-map") return;

      setSnapshot((current) => {
        const next = recordNavigationShortcutUse(current, shortcutId);
        writeSnapshot(next);
        return next;
      });
    }

    window.addEventListener(NAVIGATION_USAGE_EVENT, handleUsage);
    return () => window.removeEventListener(NAVIGATION_USAGE_EVENT, handleUsage);
  }, []);

  useEffect(() => {
    function handleReconciliation(event: Event) {
      const detail = (
        event as CustomEvent<InterfacePreferenceReconciliation>
      ).detail;
      if (!detail?.effectivePreferences) return;
      setReconciliation(detail);
    }

    window.addEventListener(
      INTERFACE_PREFERENCES_RECONCILED_EVENT,
      handleReconciliation
    );
    return () =>
      window.removeEventListener(
        INTERFACE_PREFERENCES_RECONCILED_EVENT,
        handleReconciliation
      );
  }, []);

  const totals = useMemo(() => navigationUsageTotals(snapshot), [snapshot]);
  const shortcutMetrics = useMemo(
    () => shortcutDiscoverabilityMetrics(snapshot),
    [snapshot]
  );
  const recommendations = useMemo(
    () => personalizedInterfaceRecommendations(snapshot, pathname, 6),
    [pathname, snapshot]
  );
  const visibleRecommendations = useMemo(
    () =>
      recommendations.filter((recommendation) =>
        recommendationPreferenceAllowsKind(
          preferences.recommendations,
          recommendation.kind
        )
      ),
    [preferences.recommendations, recommendations]
  );
  const activePreset = useMemo(
    () => matchingInterfacePreferencePreset(preferences),
    [preferences]
  );
  const activeNamedProfile = useMemo(
    () => matchingNamedInterfacePreferenceProfile(namedProfiles, preferences),
    [namedProfiles, preferences]
  );
  const selectedNamedProfile = useMemo(
    () => namedProfiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [namedProfiles, selectedProfileId]
  );
  const favoriteProfiles = useMemo(
    () => favoriteNamedInterfacePreferenceProfiles(namedProfiles),
    [namedProfiles]
  );
  const filteredNamedProfiles = useMemo(
    () =>
      filterNamedInterfacePreferenceProfiles(
        namedProfiles,
        profileQuickFilter
      ),
    [namedProfiles, profileQuickFilter]
  );
  const filteredFavoriteViewRecoveryAudit = useMemo(
    () =>
      filterInterfaceFavoriteViewRecoveryAudit(
        favoriteViewRecoveryAudit,
        recoveryAuditFilter
      ),
    [favoriteViewRecoveryAudit, recoveryAuditFilter]
  );
  const searchedFavoriteViewRecoveryAudit = useMemo(
    () =>
      searchInterfaceFavoriteViewRecoveryAudit(
        filteredFavoriteViewRecoveryAudit,
        recoveryAuditSearch
      ),
    [filteredFavoriteViewRecoveryAudit, recoveryAuditSearch]
  );
  const filteredRecoveryAuditPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryAuditPresetRecoveryAudit(
        recoveryAuditPresetRecoveryAudit,
        recoveryAuditPresetRecoveryAuditAgeFilter
      ),
    [
      recoveryAuditPresetRecoveryAudit,
      recoveryAuditPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRecoveryAuditPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryAuditPresetRecoveryAudit(
        filteredRecoveryAuditPresetRecoveryAudit,
        recoveryAuditPresetRecoveryAuditSearch
      ),
    [
      filteredRecoveryAuditPresetRecoveryAudit,
      recoveryAuditPresetRecoveryAuditSearch
    ]
  );
  const filteredRenewalHistoryPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
        renewalHistoryPresetRecoveryAudit,
        renewalHistoryPresetRecoveryAuditAgeFilter
      ),
    [
      renewalHistoryPresetRecoveryAudit,
      renewalHistoryPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRenewalHistoryPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
        filteredRenewalHistoryPresetRecoveryAudit,
        renewalHistoryPresetRecoveryAuditSearch
      ),
    [
      filteredRenewalHistoryPresetRecoveryAudit,
      renewalHistoryPresetRecoveryAuditSearch
    ]
  );
  const filteredImportReceiptHistory = useMemo(
    () =>
      filterInterfacePreferenceBundleImportReceiptHistory(
        importReceiptHistory,
        receiptOutcomeFilter,
        receiptStrategyFilter
      ),
    [importReceiptHistory, receiptOutcomeFilter, receiptStrategyFilter]
  );
  const searchedImportReceiptHistory = useMemo(
    () =>
      searchInterfacePreferenceBundleImportReceiptHistory(
        filteredImportReceiptHistory,
        receiptHistorySearch
      ),
    [filteredImportReceiptHistory, receiptHistorySearch]
  );
  const filteredRecoveryRenewalReceiptHistory = useMemo(
    () =>
      filterInterfacePreferenceRecoveryRenewalReceiptHistory(
        recoveryRenewalReceiptHistory,
        renewalHistoryFreshnessFilter
      ),
    [recoveryRenewalReceiptHistory, renewalHistoryFreshnessFilter]
  );
  const searchedRecoveryRenewalReceiptHistory = useMemo(
    () =>
      searchInterfacePreferenceRecoveryRenewalReceiptHistory(
        filteredRecoveryRenewalReceiptHistory,
        renewalHistorySearch
      ),
    [filteredRecoveryRenewalReceiptHistory, renewalHistorySearch]
  );
  const filteredReceiptPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceReceiptPresetRecoveryAudit(
        receiptPresetRecoveryAudit,
        receiptPresetRecoveryAuditAgeFilter
      ),
    [receiptPresetRecoveryAudit, receiptPresetRecoveryAuditAgeFilter]
  );
  const searchedReceiptPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceReceiptPresetRecoveryAudit(
        filteredReceiptPresetRecoveryAudit,
        receiptPresetRecoveryAuditSearch
      ),
    [filteredReceiptPresetRecoveryAudit, receiptPresetRecoveryAuditSearch]
  );
  const selectedBundlePreview = useMemo(
    () =>
      bundlePreview
        ? selectInterfacePreferenceBundleProfiles(
            bundlePreview,
            bundleSelectedNames
          )
        : null,
    [bundlePreview, bundleSelectedNames]
  );
  const bundleAnalysis = useMemo(
    () =>
      selectedBundlePreview
        ? analyzeInterfacePreferenceBundleImport(
            namedProfiles,
            selectedBundlePreview
          )
        : null,
    [namedProfiles, selectedBundlePreview]
  );
  const bundleCapacityPlan = useMemo(
    () =>
      selectedBundlePreview
        ? planInterfacePreferenceBundleImportCapacity(
            namedProfiles,
            selectedBundlePreview,
            bundleConflictStrategy
          )
        : null,
    [bundleConflictStrategy, namedProfiles, selectedBundlePreview]
  );
  const recoveryDiff = useMemo(
    () =>
      recoverySnapshot
        ? diffInterfacePreferenceRecoverySnapshot(
            recoverySnapshot,
            preferences,
            namedProfiles
          )
        : null,
    [namedProfiles, preferences, recoverySnapshot]
  );
  const recoveryFreshness = useMemo(
    () =>
      recoverySnapshot
        ? interfacePreferenceRecoverySnapshotFreshness(recoverySnapshot)
        : null,
    [recoverySnapshot]
  );
  const recoveryRenewalAssessment = useMemo(
    () =>
      recoverySnapshot
        ? assessInterfacePreferenceRecoverySnapshotRenewal(recoverySnapshot)
        : null,
    [recoverySnapshot]
  );

  const openInsights = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
    window.dispatchEvent(
      new CustomEvent(INTERFACE_PREFERENCES_EVENT, {
        detail: { preferences }
      })
    );
  }, [preferences]);

  const closeInsights = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeInsights();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeInsights, open]);

  function resetLocalInsights() {
    const empty = emptyNavigationUsageSnapshot();
    setSnapshot(empty);
    setResetAllArmed(false);
    try {
      window.localStorage.removeItem(NAVIGATION_INSIGHTS_STORAGE_KEY);
    } catch {
      // Local insights are optional.
    }
  }

  function updatePreferences(next: Partial<InterfacePreferences>) {
    const sanitized = sanitizeInterfacePreferences({
      ...preferences,
      ...next,
      version: 1
    });
    setPreferences(sanitized);
    setResetAllArmed(false);
    setRecoveryRestoreArmed(false);
    setSnapshotRenewalArmed(false);

    try {
      window.localStorage.setItem(
        INTERFACE_PREFERENCES_STORAGE_KEY,
        JSON.stringify(sanitized)
      );
    } catch {
      // Browser-local preferences are optional.
    }

    window.dispatchEvent(
      new CustomEvent(INTERFACE_PREFERENCES_EVENT, {
        detail: { preferences: sanitized }
      })
    );
  }

  function resetInterfacePreferences() {
    const defaults = defaultInterfacePreferences();
    setPreferences(defaults);
    setResetAllArmed(false);
    try {
      window.localStorage.removeItem(INTERFACE_PREFERENCES_STORAGE_KEY);
    } catch {
      // Browser-local preferences are optional.
    }
    window.dispatchEvent(
      new CustomEvent(INTERFACE_PREFERENCES_EVENT, {
        detail: { preferences: defaults }
      })
    );
  }

  function applyPreset(id: InterfacePreferencePresetId) {
    updatePreferences(applyInterfacePreferencePreset(id));
  }

  function persistNamedProfiles(nextProfiles: NamedInterfacePreferenceProfile[]) {
    const safe = sanitizeNamedInterfacePreferenceProfiles(nextProfiles);
    setNamedProfiles(safe);
    writeNamedProfiles(safe);
    setRecoveryRestoreArmed(false);
    setSnapshotRenewalArmed(false);
    setSelectedProfileId((current) =>
      safe.some((profile) => profile.id === current)
        ? current
        : safe[0]?.id ?? ""
    );
  }

  function recordFavoriteViewRecovery(
    trigger: InterfaceFavoriteViewRecoveryAuditTrigger,
    requestedFilter: NamedInterfacePreferenceQuickFilter,
    resolvedFilter: NamedInterfacePreferenceQuickFilter,
    reason: string
  ) {
    const entry = createInterfaceFavoriteViewRecoveryAuditEntry({
      auditId:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "view-recovery-" + Date.now().toString(36),
      trigger,
      requestedFilter,
      resolvedFilter,
      reason
    });
    const nextAudit = prependInterfaceFavoriteViewRecoveryAuditEntry(
      favoriteViewRecoveryAudit,
      entry
    );
    setFavoriteViewRecoveryAudit(nextAudit);
    writeFavoriteViewRecoveryAudit(nextAudit);
  }

  function chooseProfileQuickFilter(
    filter: NamedInterfacePreferenceQuickFilter
  ) {
    const recovered = recoverNamedInterfacePreferenceQuickFilter(
      namedProfiles,
      filter
    );
    setProfileQuickFilter(recovered.filter);
    writeProfileQuickFilter(recovered.filter);
    setFavoriteViewRecoveryNotice(recovered.reason);
    if (recovered.recovered) {
      recordFavoriteViewRecovery(
        "filter-selection",
        filter,
        recovered.filter,
        recovered.reason ?? "Favorite view recovered."
      );
    }
    const visible = filterNamedInterfacePreferenceProfiles(
      namedProfiles,
      recovered.filter
    );
    if (!visible.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(visible[0]?.id ?? "");
    }
    setImportError(null);
    setPortabilityStatus(
      recovered.recovered
        ? recovered.reason
        : recovered.filter === "favorites"
          ? "Showing favorite named profiles only."
          : "Showing all named profiles."
    );
  }

  function moveSelectedNamedProfile(direction: "up" | "down" | "top" | "bottom") {
    if (!selectedNamedProfile) return;
    const reordered = reorderNamedInterfacePreferenceProfile(
      namedProfiles,
      selectedNamedProfile.id,
      direction
    );
    persistNamedProfiles(reordered);
    setSelectedProfileId(selectedNamedProfile.id);
    setImportError(null);
    setPortabilityStatus(
      "Moved named profile “" + selectedNamedProfile.name + "” " +
        (direction === "up" ? "up." :
          direction === "down" ? "down." :
          direction === "top" ? "to the top." : "to the bottom.")
    );
  }

  function toggleSelectedNamedProfileFavorite() {
    if (!selectedNamedProfile) return;
    const nextFavorite = !selectedNamedProfile.favorite;
    const updated = setNamedInterfacePreferenceProfileFavorite(
      namedProfiles,
      selectedNamedProfile.id,
      nextFavorite
    );
    persistNamedProfiles(updated);
    setSelectedProfileId(selectedNamedProfile.id);
    setImportError(null);
    if (profileQuickFilter === "favorites" && !nextFavorite) {
      const recovered = recoverNamedInterfacePreferenceQuickFilter(
        updated,
        profileQuickFilter
      );
      setProfileQuickFilter(recovered.filter);
      writeProfileQuickFilter(recovered.filter);
      setFavoriteViewRecoveryNotice(recovered.reason);
      if (recovered.recovered) {
        recordFavoriteViewRecovery(
          "last-favorite-removed",
          profileQuickFilter,
          recovered.filter,
          recovered.reason ?? "Favorite view recovered."
        );
      }
      const visible = filterNamedInterfacePreferenceProfiles(
        updated,
        recovered.filter
      );
      setSelectedProfileId(visible[0]?.id ?? "");
    }
    setPortabilityStatus(
      (nextFavorite ? "Favorited “" : "Removed favorite from “") +
        selectedNamedProfile.name +
        "”." +
        (profileQuickFilter === "favorites" &&
        !nextFavorite &&
        !updated.some((profile) => profile.favorite)
          ? " Favorites view recovered to All profiles."
          : "")
    );
  }

  function captureRecoverySnapshot(message = "Local recovery snapshot saved.") {
    const snapshot = parseInterfacePreferenceRecoverySnapshot(
      serializeInterfacePreferenceRecoverySnapshot(preferences, namedProfiles)
    );
    if (!snapshot.ok) {
      setPortabilityStatus(null);
      setImportError(snapshot.error);
      return null;
    }
    writeRecoverySnapshot(snapshot.snapshot);
    setRecoverySnapshot(snapshot.snapshot);
    setRecoveryRestoreArmed(false);
    setSnapshotRenewalArmed(false);
    setImportError(null);
    setPortabilityStatus(message);
    return snapshot.snapshot;
  }

  function exportFavoriteViewRecoveryAudit() {
    if (!favoriteViewRecoveryAudit.length) return;
    const payload = serializeInterfaceFavoriteViewRecoveryAudit(
      favoriteViewRecoveryAudit
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-favorite-view-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Favorite view recovery audit exported.");
  }

  function clearFavoriteViewRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Recovery audit is optional browser-local evidence.
    }
    setFavoriteViewRecoveryAudit([]);
    setImportError(null);
    setPortabilityStatus("Favorite view recovery audit cleared.");
  }

  function applyRecoveryAuditSearchPreset(
    id: InterfaceRecoveryAuditSearchPresetId
  ) {
    const preset = interfaceRecoveryAuditSearchPresetById(id);
    setRecoveryAuditFilter(preset.triggerFilter);
    setRecoveryAuditSearch(preset.query);
    setRecoveryAuditSearchPresetId(preset.id);
    writeRecoveryAuditSearchPreset(preset.id);
    setRecoveryAuditPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Recovery audit preset “" + preset.label + "” applied."
    );
  }

  function applyRecoveryRenewalHistorySearchPreset(
    id: InterfaceRecoveryRenewalHistorySearchPresetId
  ) {
    const preset = interfaceRecoveryRenewalHistorySearchPresetById(id);
    setRenewalHistoryFreshnessFilter(preset.freshnessFilter);
    setRenewalHistorySearch(preset.query);
    setRenewalHistorySearchPresetId(preset.id);
    writeRecoveryRenewalHistorySearchPreset(preset.id);
    setRenewalHistoryPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Renewal history preset “" + preset.label + "” applied."
    );
  }

  function applyRecoveryAuditPresetRecoveryAuditSearchPreset(
    id: InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById(id);
    setRecoveryAuditPresetRecoveryAuditAgeFilter(preset.ageFilter);
    setRecoveryAuditPresetRecoveryAuditSearch(preset.query);
    setRecoveryAuditPresetRecoveryAuditSearchPresetId(preset.id);
    writeRecoveryAuditPresetRecoveryAuditSearchPreset(preset.id);
    setRecoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Recovery-audit repair preset “" + preset.label + "” applied and saved locally."
    );
  }

  function applyRenewalSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById(id);
    setRenewalHistoryPresetRecoveryAuditAgeFilter(preset.ageFilter);
    setRenewalHistoryPresetRecoveryAuditSearch(preset.query);
    setRenewalHistoryPresetRecoveryAuditSearchPresetId(preset.id);
    setImportError(null);
    setPortabilityStatus(
      "Renewal recovery audit preset “" + preset.label + "” applied."
    );
  }

  function applyReceiptPresetRecoveryAuditSearchPreset(
    id: InterfaceReceiptPresetRecoveryAuditSearchPresetId
  ) {
    const preset = interfaceReceiptPresetRecoveryAuditSearchPresetById(id);
    setReceiptPresetRecoveryAuditAgeFilter(preset.ageFilter);
    setReceiptPresetRecoveryAuditSearch(preset.query);
    setReceiptPresetRecoveryAuditSearchPresetId(preset.id);
    writeReceiptPresetRecoveryAuditSearchPreset(preset.id);
    setReceiptPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Receipt recovery audit preset “" + preset.label + "” applied and saved locally."
    );
  }

  function applyReceiptSearchPreset(
    id: InterfacePreferenceReceiptSearchPresetId
  ) {
    const preset = interfacePreferenceReceiptSearchPresetById(id);
    setReceiptOutcomeFilter(preset.outcomeFilter);
    setReceiptStrategyFilter(preset.strategyFilter);
    setReceiptHistorySearch(preset.query);
    setReceiptSearchPresetId(preset.id);
    writeReceiptSearchPreset(preset.id);
    setReceiptPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Receipt search preset “" + preset.label + "” applied."
    );
  }

  function renewRecoverySnapshot() {
    if (!recoverySnapshot) return;
    if (!snapshotRenewalArmed) {
      setSnapshotRenewalArmed(true);
      setRecoveryRestoreArmed(false);
      setImportError(null);
      setPortabilityStatus(
        "Snapshot renewal review armed. Confirm renewal to replace the existing recovery point with current preferences and named-profile state."
      );
      return;
    }

    const previousSnapshot = recoverySnapshot;
    const renewed = captureRecoverySnapshot(
      "Recovery snapshot renewed from current browser state."
    );
    if (renewed) {
      const receipt = createInterfacePreferenceRecoveryRenewalReceipt({
        receiptId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : "renewal-" + Date.now().toString(36),
        previousSnapshot,
        renewedSnapshot: renewed
      });
      const nextHistory = prependInterfacePreferenceRecoveryRenewalReceipt(
        recoveryRenewalReceiptHistory,
        receipt
      );
      writeRecoveryRenewalReceipt(receipt);
      writeRecoveryRenewalReceiptHistory(nextHistory);
      setRecoveryRenewalReceipt(receipt);
      setRecoveryRenewalReceiptHistory(nextHistory);
      setSnapshotRenewalArmed(false);
      setPortabilityStatus(
        "Recovery snapshot renewed from current browser state and a local renewal receipt was saved."
      );
    }
  }

  function cancelRecoverySnapshotRenewal() {
    setSnapshotRenewalArmed(false);
    setImportError(null);
    setPortabilityStatus(
      "Recovery snapshot renewal cancelled. The existing recovery point was preserved."
    );
  }

  function exportRecoveryAuditPresetRecoveryAudit() {
    if (!recoveryAuditPresetRecoveryAudit.length) return;
    const payload = serializeInterfaceRecoveryAuditPresetRecoveryAudit(
      recoveryAuditPresetRecoveryAudit
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-recovery-audit-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Recovery audit preset recovery audit exported.");
  }

  function clearRecoveryAuditPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
    } catch {
      // Recovery-audit preset recovery audit is optional browser-local evidence.
    }
    setRecoveryAuditPresetRecoveryAudit([]);
    setRecoveryAuditPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditPresetRecoveryAuditSearch("");
    setRecoveryAuditPresetRecoveryAuditSearchPresetId("all");
    setRecoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearRecoveryAuditPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus("Recovery audit preset recovery audit cleared.");
  }

  function exportReceiptRecoveryAuditSearchPresetRecoveryAudit() {
    if (!receiptRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-receipt-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Receipt recovery audit search preset recovery audit exported."
    );
  }

  function clearReceiptRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Receipt recovery-audit preset recovery evidence is optional browser-local state.
    }
    setReceiptRecoveryAuditSearchPresetRecoveryAudit([]);
    setImportError(null);
    setPortabilityStatus(
      "Receipt recovery audit search preset recovery audit cleared."
    );
  }

  function exportReceiptPresetRecoveryAudit() {
    if (!receiptPresetRecoveryAudit.length) return;
    const payload = serializeInterfaceReceiptPresetRecoveryAudit(
      receiptPresetRecoveryAudit
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-receipt-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Receipt preset recovery audit exported.");
  }

  function clearReceiptPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Receipt preset recovery audit is optional browser-local evidence.
    }
    setReceiptPresetRecoveryAudit([]);
    setReceiptPresetRecoveryAuditAgeFilter("all");
    setReceiptPresetRecoveryAuditSearch("");
    setReceiptPresetRecoveryAuditSearchPresetId("all");
    clearReceiptPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus("Receipt preset recovery audit cleared.");
  }

  function exportRecoveryRenewalSearchPresetRecoveryAudit() {
    if (!renewalHistoryPresetRecoveryAudit.length) return;
    const payload = serializeInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
      renewalHistoryPresetRecoveryAudit
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-renewal-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Renewal search preset recovery audit exported.");
  }

  function clearRecoveryRenewalSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Renewal search preset recovery audit is optional browser-local evidence.
    }
    setRenewalHistoryPresetRecoveryAudit([]);
    setRenewalHistoryPresetRecoveryAuditAgeFilter("all");
    setRenewalHistoryPresetRecoveryAuditSearch("");
    setRenewalHistoryPresetRecoveryAuditSearchPresetId("all");
    setImportError(null);
    setPortabilityStatus("Renewal search preset recovery audit cleared.");
  }

  function exportRecoveryRenewalReceipt() {
    if (!recoveryRenewalReceipt) return;
    const payload = serializeInterfacePreferenceRecoveryRenewalReceipt(
      recoveryRenewalReceipt
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-recovery-renewal-" +
      recoveryRenewalReceipt.receiptId +
      ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Recovery snapshot renewal receipt exported.");
  }

  function clearRecoveryRenewalReceipt() {
    const nextHistory = recoveryRenewalReceipt
      ? recoveryRenewalReceiptHistory.filter(
          (receipt) => receipt.receiptId !== recoveryRenewalReceipt.receiptId
        )
      : recoveryRenewalReceiptHistory;
    const nextLatest = nextHistory[0] ?? null;

    try {
      if (nextLatest) {
        writeRecoveryRenewalReceipt(nextLatest);
      } else {
        window.localStorage.removeItem(
          INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY
        );
      }
      writeRecoveryRenewalReceiptHistory(nextHistory);
    } catch {
      // Renewal receipt evidence is optional browser-local state.
    }

    setRecoveryRenewalReceiptHistory(nextHistory);
    setRecoveryRenewalReceipt(nextLatest);
    setImportError(null);
    setPortabilityStatus(
      nextLatest
        ? "Latest renewal receipt cleared. The previous renewal receipt is now current."
        : "Recovery snapshot renewal receipt cleared."
    );
  }

  function exportRecoveryRenewalReceiptHistory() {
    if (!recoveryRenewalReceiptHistory.length) return;
    const payload = serializeInterfacePreferenceRecoveryRenewalReceiptHistory(
      recoveryRenewalReceiptHistory
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-recovery-renewal-history.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Recovery snapshot renewal receipt history exported.");
  }

  function clearRecoveryRenewalReceiptHistory() {
    try {
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY
      );
    } catch {
      // Renewal receipt history is optional browser-local evidence.
    }
    setRecoveryRenewalReceiptHistory([]);
    setRecoveryRenewalReceipt(null);
    setRenewalHistoryFreshnessFilter("all");
    setRenewalHistorySearch("");
    setRenewalHistorySearchPresetId("all");
    setRenewalHistoryPresetRecoveryNotice(null);
    clearRecoveryRenewalHistorySearchPreset();
    setImportError(null);
    setPortabilityStatus("Recovery snapshot renewal receipt history cleared.");
  }

  function restoreRecoverySnapshot() {
    if (!recoverySnapshot) return;
    if (!recoveryRestoreArmed) {
      setRecoveryRestoreArmed(true);
      setImportError(null);
      setPortabilityStatus(
        recoveryFreshness?.status === "expired"
          ? "Restore confirmation armed for a snapshot past the 30-day guidance window. Consider saving a newer point first; review age and diff carefully before Confirm restore."
          : recoveryFreshness?.status === "stale"
            ? "Restore confirmation armed for a stale snapshot. Review its age and diff carefully, then choose Confirm restore."
            : recoveryDiff?.hasChanges
            ? "Restore confirmation armed. Review the diff, then choose Confirm restore."
            : "Restore confirmation armed. The snapshot currently matches this browser; confirm only if you still want to reapply it."
      );
      return;
    }

    const nextPreferences = recoverySnapshot.preferences;
    const nextProfiles = recoverySnapshot.namedProfiles;
    persistNamedProfiles(nextProfiles);
    setSelectedProfileId(nextProfiles[0]?.id ?? "");
    updatePreferences(nextPreferences);
    setRecoveryRestoreArmed(false);
    setImportError(null);
    setPortabilityStatus(
      "Local recovery snapshot restored after confirmation. Current preferences, favorites and named profile order were recovered."
    );
  }

  function cancelRecoveryRestore() {
    setRecoveryRestoreArmed(false);
    setImportError(null);
    setPortabilityStatus("Recovery restore confirmation cancelled. Nothing changed.");
  }

  function clearRecoverySnapshot() {
    try {
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY
      );
    } catch {
      // Recovery snapshots are optional browser-local safety state.
    }
    setRecoverySnapshot(null);
    setRecoveryRestoreArmed(false);
    setSnapshotRenewalArmed(false);
    setImportError(null);
    setPortabilityStatus("Local recovery snapshot cleared.");
  }

  function saveNamedProfile(
    sourcePreferences: InterfacePreferences,
    provenance: InterfacePreferenceProfileProvenance = { kind: "local" }
  ) {
    const safeName = sanitizeNamedInterfacePreferenceName(profileName);
    if (!safeName) {
      setPortabilityStatus(null);
      setImportError("Enter a profile name before saving.");
      return;
    }

    const existingByName = namedProfiles.find(
      (profile) => profile.name.toLocaleLowerCase() === safeName.toLocaleLowerCase()
    );
    if (!existingByName && namedProfiles.length >= MAX_NAMED_INTERFACE_PROFILES) {
      setPortabilityStatus(null);
      setImportError(
        "This browser already has the maximum of " +
          MAX_NAMED_INTERFACE_PROFILES +
          " named profiles."
      );
      return;
    }

    const id =
      existingByName?.id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "profile-" + Date.now().toString(36));

    const profile = createNamedInterfacePreferenceProfile({
      id,
      name: safeName,
      preferences: sourcePreferences,
      provenance
    });
    const updated = upsertNamedInterfacePreferenceProfile(namedProfiles, profile);
    persistNamedProfiles(updated);
    setSelectedProfileId(profile.id);
    setProfileName("");
    setImportError(null);
    setPortabilityStatus(
      existingByName
        ? "Named profile updated in this browser."
        : "Named profile saved in this browser."
    );
  }

  function applySelectedNamedProfile() {
    if (!selectedNamedProfile) return;
    updatePreferences(selectedNamedProfile.preferences);
    setImportError(null);
    setPortabilityStatus(
      "Applied named profile “" + selectedNamedProfile.name + "”."
    );
  }

  function renameSelectedNamedProfile() {
    if (!selectedNamedProfile) return;
    const result = renameNamedInterfacePreferenceProfile(
      namedProfiles,
      selectedNamedProfile.id,
      profileName
    );
    if (!result.ok) {
      setPortabilityStatus(null);
      setImportError(result.error);
      return;
    }
    persistNamedProfiles(result.profiles);
    setSelectedProfileId(result.profile.id);
    setProfileName("");
    setImportError(null);
    setPortabilityStatus("Named profile renamed to “" + result.profile.name + "”.");
  }

  function duplicateSelectedNamedProfile() {
    if (!selectedNamedProfile) return;
    const requestedName =
      sanitizeNamedInterfacePreferenceName(profileName) ||
      suggestDuplicateNamedInterfacePreferenceName(
        namedProfiles,
        selectedNamedProfile.name
      );
    const duplicateId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "profile-" + Date.now().toString(36);
    const result = duplicateNamedInterfacePreferenceProfile(
      namedProfiles,
      selectedNamedProfile.id,
      duplicateId,
      requestedName
    );
    if (!result.ok) {
      setPortabilityStatus(null);
      setImportError(result.error);
      return;
    }
    persistNamedProfiles(result.profiles);
    setSelectedProfileId(result.profile.id);
    setProfileName("");
    setImportError(null);
    setPortabilityStatus("Duplicated named profile as “" + result.profile.name + "”.");
  }

  function deleteSelectedNamedProfile() {
    if (!selectedNamedProfile) return;
    captureRecoverySnapshot(
      "Recovery snapshot saved before deleting “" + selectedNamedProfile.name + "”."
    );
    persistNamedProfiles(
      removeNamedInterfacePreferenceProfile(
        namedProfiles,
        selectedNamedProfile.id
      )
    );
    setImportError(null);
    setPortabilityStatus(
      "Deleted named profile “" + selectedNamedProfile.name + "” from this browser."
    );
  }

  function currentAccessibilityEnvironment() {
    return {
      viewportWidth: window.innerWidth,
      forcedColors: window.matchMedia("(forced-colors: active)").matches,
      prefersMoreContrast: window.matchMedia("(prefers-contrast: more)").matches,
      prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    };
  }

  function exportPreferenceBundle() {
    if (!namedProfiles.length) {
      setPortabilityStatus(null);
      setImportError("Save at least one named profile before exporting a bundle.");
      return;
    }

    const payload = serializeInterfacePreferenceBundle(namedProfiles);
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-preference-bundle.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Named profile bundle exported. IDs, navigation insights and business data were not included."
    );
  }

  async function stagePreferenceBundleImport(file?: File) {
    setImportError(null);
    setPortabilityStatus(null);
    setBundleImportOutcome(null);
    setBundlePreview(null);
    setBundleSourceName("");
    setBundleSelectedNames([]);

    if (!file) return;
    if (file.size > 64 * 1024) {
      setImportError("Preference bundle files must be 64 KB or smaller.");
      return;
    }

    const parsed = parseInterfacePreferenceBundle(await file.text());
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }

    setBundlePreview(parsed.bundle);
    setBundleSourceName(file.name);
    setBundleSelectedNames(parsed.bundle.profiles.map((profile) => profile.name));
    setBundleConflictStrategy("skip");
    setPortabilityStatus(
      "Bundle loaded for conflict preview. Nothing has been imported yet."
    );
  }

  function clearImportReconciliationReceipt() {
    const nextHistory = importReconciliationReceipt
      ? importReceiptHistory.filter(
          (receipt) =>
            receipt.receiptId !== importReconciliationReceipt.receiptId
        )
      : importReceiptHistory;
    const nextLatest = nextHistory[0] ?? null;

    try {
      if (nextLatest) {
        writeImportReconciliationReceipt(nextLatest);
      } else {
        window.localStorage.removeItem(
          INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY
        );
      }
      writeImportReconciliationReceiptHistory(nextHistory);
    } catch {
      // Import receipt persistence is optional browser-local evidence.
    }
    setImportReceiptHistory(nextHistory);
    setImportReconciliationReceipt(nextLatest);
    setImportError(null);
    setPortabilityStatus(
      nextLatest
        ? "Latest receipt cleared. The previous receipt is now current."
        : "Saved import reconciliation receipt cleared."
    );
  }

  function exportImportReconciliationReceipt() {
    if (!importReconciliationReceipt) return;
    const payload = serializeInterfacePreferenceBundleImportReceipt(
      importReconciliationReceipt
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-import-reconciliation-" +
      importReconciliationReceipt.receiptId +
      ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Import reconciliation receipt exported.");
  }

  function exportImportReconciliationReceiptHistory() {
    if (!importReceiptHistory.length) return;
    const payload = serializeInterfacePreferenceBundleImportReceiptHistory(
      importReceiptHistory
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-import-reconciliation-history.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Import reconciliation receipt history exported.");
  }

  function clearImportReconciliationReceiptHistory() {
    try {
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY
      );
    } catch {
      // Receipt history is optional browser-local evidence.
    }
    setImportReceiptHistory([]);
    setImportReconciliationReceipt(null);
    setImportError(null);
    setPortabilityStatus("Import reconciliation receipt history cleared.");
  }

  function applyPreferenceBundleImport() {
    if (!selectedBundlePreview || !selectedBundlePreview.profiles.length) {
      setPortabilityStatus(null);
      setImportError("Select at least one incoming bundle profile to import.");
      return;
    }
    captureRecoverySnapshot(
      "Recovery snapshot saved before importing the selected bundle profiles."
    );
    let sequence = 0;
    const plan = bundleCapacityPlan;
    const result = resolveInterfacePreferenceBundleImport(
      namedProfiles,
      selectedBundlePreview,
      bundleConflictStrategy,
      bundleSourceName || "Imported bundle",
      (name, index) => {
        sequence += 1;
        return typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "bundle-" + index.toString(36) + "-" + sequence.toString(36) + "-" + Date.now().toString(36);
      }
    );
    const outcome = plan
      ? reconcileInterfacePreferenceBundleImportOutcome(plan, result)
      : null;
    setBundleImportOutcome(outcome);

    if (plan && outcome) {
      const receipt = createInterfacePreferenceBundleImportReceipt({
        receiptId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : "receipt-" + Date.now().toString(36),
        sourceName: bundleSourceName || "Imported bundle",
        strategy: bundleConflictStrategy,
        selectedNames: selectedBundlePreview.profiles.map(
          (profile) => profile.name
        ),
        plan,
        reconciliation: outcome
      });
      const nextHistory = prependInterfacePreferenceBundleImportReceipt(
        importReceiptHistory,
        receipt
      );
      writeImportReconciliationReceipt(receipt);
      writeImportReconciliationReceiptHistory(nextHistory);
      setImportReconciliationReceipt(receipt);
      setImportReceiptHistory(nextHistory);
    }

    persistNamedProfiles(result.profiles);
    setBundlePreview(null);
    setBundleSourceName("");
    setBundleSelectedNames([]);
    setImportError(null);
    setPortabilityStatus(
      "Bundle import complete: " +
        result.imported +
        " added, " +
        result.replaced +
        " replaced, " +
        result.skippedConflicts +
        " conflict" +
        (result.skippedConflicts === 1 ? "" : "s") +
        " skipped, " +
        result.skippedCapacity +
        " skipped for capacity." +
        (outcome
          ? outcome.matchesPlan
            ? " Import outcome matched the capacity plan."
            : " Import outcome differed from the capacity plan; review the reconciliation below."
          : "")
    );
  }

  function cancelPreferenceBundleImport() {
    setBundlePreview(null);
    setBundleSourceName("");
    setBundleSelectedNames([]);
    setImportError(null);
    setPortabilityStatus("Bundle import cancelled. Named profiles were not changed.");
  }

  function exportPreferenceProfile() {
    const payload = serializeInterfacePreferenceProfile(preferences);
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-interface-preferences.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Preference profile exported. Navigation insights and business data were not included."
    );
  }

  async function stagePreferenceProfileImport(file?: File) {
    setImportError(null);
    setPortabilityStatus(null);
    setImportPreview(null);
    setImportSource(null);

    if (!file) return;
    if (file.size > 32 * 1024) {
      setImportError("Preference profile files must be 32 KB or smaller.");
      return;
    }

    const parsed = parseInterfacePreferenceProfile(await file.text());
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }

    setImportPreview(
      previewInterfacePreferenceProfile(
        parsed.profile,
        currentAccessibilityEnvironment()
      )
    );
    setImportSource(
      importedInterfacePreferenceProvenance(file.name, parsed.profile)
    );
    setPortabilityStatus(
      "Profile loaded for preview. Nothing has been applied yet."
    );
  }

  function applyImportedPreferenceProfile() {
    if (!importPreview) return;
    updatePreferences(importPreview.storedPreferences);
    setImportPreview(null);
    setImportError(null);
    setPortabilityStatus(
      "Imported interface preferences are now active in this browser."
    );
  }

  function cancelPreferenceProfileImport() {
    setImportPreview(null);
    setImportSource(null);
    setImportError(null);
    setPortabilityStatus("Import cancelled. Current preferences were not changed.");
  }

  function resetAllLocalNavigationData() {
    if (!resetAllArmed) {
      setResetAllArmed(true);
      return;
    }

    const defaults = defaultInterfacePreferences();
    const empty = emptyNavigationUsageSnapshot();
    setPreferences(defaults);
    setSnapshot(empty);
    setNamedProfiles([]);
    setSelectedProfileId("");
    setRecoverySnapshot(null);
    setRecoveryRestoreArmed(false);
    setBundleImportOutcome(null);
    setImportReconciliationReceipt(null);
    setImportReceiptHistory([]);
    setFavoriteViewRecoveryNotice(null);
    setFavoriteViewRecoveryAudit([]);
    setRecoveryAuditFilter("all");
    setRecoveryAuditSearch("");
    setRecoveryAuditSearchPresetId("all");
    setRecoveryAuditPresetRecoveryNotice(null);
    setRecoveryAuditPresetRecoveryAudit([]);
    setRecoveryAuditPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditPresetRecoveryAuditSearch("");
    setSnapshotRenewalArmed(false);
    setRecoveryRenewalReceipt(null);
    setRecoveryRenewalReceiptHistory([]);
    setRenewalHistoryFreshnessFilter("all");
    setRenewalHistorySearch("");
    setRenewalHistorySearchPresetId("all");
    setRenewalHistoryPresetRecoveryNotice(null);
    setRenewalHistoryPresetRecoveryAudit([]);
    setReceiptPresetRecoveryNotice(null);
    setReceiptPresetRecoveryAudit([]);
    setReceiptPresetRecoveryAuditAgeFilter("all");
    setReceiptPresetRecoveryAuditSearch("");
    setReceiptPresetRecoveryAuditSearchPresetId("all");
    setReceiptOutcomeFilter("all");
    setReceiptStrategyFilter("all");
    setReceiptHistorySearch("");
    setReceiptSearchPresetId("all");
    setProfileQuickFilter("all");
    setResetAllArmed(false);

    try {
      window.localStorage.removeItem(INTERFACE_PREFERENCES_STORAGE_KEY);
      window.localStorage.removeItem(NAVIGATION_INSIGHTS_STORAGE_KEY);
      window.localStorage.removeItem(INTERFACE_NAMED_PROFILES_STORAGE_KEY);
      window.localStorage.removeItem(INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY);
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Browser-local state is optional.
    }

    setRecoveryAuditPresetRecoveryAuditSearchPresetId("all");
    setRecoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setRenewalHistoryPresetRecoveryAuditAgeFilter("all");
    setRenewalHistoryPresetRecoveryAuditSearch("");
    setRenewalHistoryPresetRecoveryAuditSearchPresetId("all");
    setReceiptPresetRecoveryAuditSearchPresetId("all");
    setReceiptPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setReceiptRecoveryAuditSearchPresetRecoveryAudit([]);
    setReceiptPresetRecoveryAuditAgeFilter("all");
    setReceiptPresetRecoveryAuditSearch("");

    window.dispatchEvent(
      new CustomEvent(INTERFACE_PREFERENCES_EVENT, {
        detail: { preferences: defaults }
      })
    );
  }

  return (
    <>
      <button
        className="navigationInsightsTrigger"
        type="button"
        onClick={openInsights}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Insights
      </button>

      {open ? (
        <div
          className="navigationInsightsBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeInsights();
          }}
        >
          <section
            className="navigationInsightsDialog uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral"
            role="dialog"
            aria-modal="true"
            aria-labelledby="navigation-insights-title"
          >
            <header className="navigationInsightsHeader">
              <div>
                <p className="eyebrow">Build 147 · Repair preset recovery, renewal audit presets & receipt recovery audit</p>
                <h2 id="navigation-insights-title">Navigation usage insights</h2>
                <p>
                  Aggregate navigation counts stay in this browser. No timestamps, search terms or business data are collected.
                </p>
              </div>
              <div className="navigationInsightsHeaderActions">
                <HelpInfo topic="navigation-usage-insights" inline />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeInsights}
                  aria-label="Close navigation insights"
                >
                  ×
                </button>
              </div>
            </header>

            <section className="interfacePreferencePanel" aria-labelledby="interface-preferences-heading">
              <div className="navigationInsightsSectionHeading">
                <div>
                  <p className="eyebrow">Role-neutral browser preferences</p>
                  <h3 id="interface-preferences-heading">Interface preferences</h3>
                </div>
                <HelpInfo topic="interface-preference-presets" inline />
              </div>

              <section className="interfacePresetSection" aria-labelledby="interface-preset-heading">
                <div className="interfacePresetHeading">
                  <div>
                    <strong id="interface-preset-heading">Preference presets</strong>
                    <span>Apply a known browser-local combination, then fine-tune any setting below.</span>
                  </div>
                  <HelpInfo topic="interface-preference-presets" inline />
                </div>
                <div className="interfacePresetGrid">
                  {INTERFACE_PREFERENCE_PRESETS.map((preset) => (
                    <button
                      type="button"
                      className={activePreset?.id === preset.id ? "active" : ""}
                      aria-pressed={activePreset?.id === preset.id}
                      onClick={() => applyPreset(preset.id)}
                      key={preset.id}
                    >
                      <strong>{preset.label}</strong>
                      <span>{preset.description}</span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="interfacePreferenceGrid">
                <fieldset>
                  <legend>Navigation density</legend>
                  <div className="interfacePreferenceChoices">
                    {(["adaptive", "comfortable", "compact"] as const).map((value) => (
                      <button
                        type="button"
                        className={preferences.navigationDensity === value ? "active" : ""}
                        aria-pressed={preferences.navigationDensity === value}
                        onClick={() => updatePreferences({ navigationDensity: value })}
                        key={value}
                      >
                        {value === "adaptive" ? "Adaptive" : value === "comfortable" ? "Comfortable" : "Compact"}
                      </button>
                    ))}
                  </div>
                  <small>Adaptive responds only to viewport width.</small>
                </fieldset>

                <fieldset>
                  <legend>Workspace layout</legend>
                  <div className="interfacePreferenceChoices">
                    {(["balanced", "wide", "focused"] as const).map((value) => (
                      <button
                        type="button"
                        className={preferences.workspaceLayout === value ? "active" : ""}
                        aria-pressed={preferences.workspaceLayout === value}
                        onClick={() => updatePreferences({ workspaceLayout: value })}
                        key={value}
                      >
                        {value === "balanced" ? "Balanced" : value === "wide" ? "Wide" : "Focused"}
                      </button>
                    ))}
                  </div>
                  <small>No role, permission or job-function inference is used.</small>
                </fieldset>

                <fieldset>
                  <legend>Recommendations</legend>
                  <div className="interfacePreferenceChoices">
                    {(["all", "destinations", "shortcuts", "off"] as const).map((value) => (
                      <button
                        type="button"
                        className={preferences.recommendations === value ? "active" : ""}
                        aria-pressed={preferences.recommendations === value}
                        onClick={() => updatePreferences({ recommendations: value })}
                        key={value}
                      >
                        {value === "all" ? "All" : value === "destinations" ? "Destinations" : value === "shortcuts" ? "Shortcuts" : "Off"}
                      </button>
                    ))}
                  </div>
                  <small>Controls what appears in Suggested for you.</small>
                </fieldset>
              </div>

              <section className="interfaceReconciliationStatus" aria-live="polite">
                <div>
                  <strong>Accessibility-safe reconciliation</strong>
                  <HelpInfo topic="accessibility-preference-reconciliation" inline />
                </div>
                {reconciliation?.accessibilityGuardActive ? (
                  <ul>
                    {reconciliation.adjustments.map((adjustment) => (
                      <li key={adjustment}>{adjustment}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No accessibility reconciliation is currently required. Stored preferences are active as selected.</p>
                )}
                <small>Accessibility safeguards can temporarily change the effective shell without rewriting your saved preference.</small>
              </section>

              <section className="interfaceNamedProfilesSection" aria-labelledby="named-profiles-heading">
                <div className="interfacePresetHeading">
                  <div>
                    <strong id="named-profiles-heading">Named local preference profiles</strong>
                    <span>Save up to {MAX_NAMED_INTERFACE_PROFILES} reusable combinations, then rename, duplicate or switch between them locally.</span>
                  </div>
                  <HelpInfo topic="named-local-preference-profiles" inline />
                </div>

                <div className="interfaceNamedProfileSave">
                  <label>
                    <span>Profile name</span>
                    <input
                      type="text"
                      maxLength={40}
                      value={profileName}
                      onChange={(event) => setProfileName(event.currentTarget.value)}
                      placeholder="For example: Workshop focus"
                    />
                  </label>
                  <button type="button" onClick={() => saveNamedProfile(preferences)}>
                    Save current
                  </button>
                </div>

                <div
                  className="interfaceFavoriteQuickFilters"
                  role="group"
                  aria-label="Filter named preference profiles"
                >
                  <button
                    type="button"
                    aria-pressed={profileQuickFilter === "all"}
                    onClick={() => chooseProfileQuickFilter("all")}
                  >
                    All profiles ({namedProfiles.length})
                  </button>
                  <button
                    type="button"
                    aria-pressed={profileQuickFilter === "favorites"}
                    onClick={() => chooseProfileQuickFilter("favorites")}
                  >
                    ★ Favorites ({favoriteProfiles.length})
                  </button>
                  <span>
                    Showing {filteredNamedProfiles.length} of {namedProfiles.length} · view persists in this browser
                  </span>
                  <HelpInfo topic="favorite-profile-quick-filters" inline />
                </div>

                {favoriteViewRecoveryNotice ? (
                  <div className="interfaceFavoriteViewRecovery" role="status">
                    <strong>Favorite view recovered</strong>
                    <span>{favoriteViewRecoveryNotice}</span>
                    <HelpInfo topic="favorite-view-recovery" inline />
                  </div>
                ) : null}

                {recoveryAuditPresetRecoveryAudit.length ? (
                  <div className="interfaceRecoveryAuditPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Recovery audit recovery audit</strong>
                        <span>
                          {recoveryAuditPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="recovery-audit-recovery-audit" inline />
                    </div>
                    {recoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                      <div className="interfaceRecoveryAuditRepairPresetRecovery" role="status">
                        <strong>Recovery-audit repair preset recovered</strong>
                        <span>{recoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                        <HelpInfo topic="recovery-audit-recovery-search-preset-recovery" inline />
                      </div>
                    ) : null}
                    <div className="interfaceRecoveryAuditRecoverySearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Recovery-audit repair search presets</strong>
                          <span>Apply a common repair-evidence view without changing stored audit events.</span>
                        </div>
                        <HelpInfo topic="recovery-audit-recovery-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Recovery audit repair search presets">
                        {INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={recoveryAuditPresetRecoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyRecoveryAuditPresetRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceRecoveryAuditRecoveryFilters">
                      <label>
                        <span>Recovery age</span>
                        <select
                          value={recoveryAuditPresetRecoveryAuditAgeFilter}
                          onChange={(event) => {
                            setRecoveryAuditPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceRecoveryAuditPresetRecoveryAuditAgeFilter
                            );
                            setRecoveryAuditPresetRecoveryAuditSearchPresetId(null);
                            setRecoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearRecoveryAuditPresetRecoveryAuditSearchPreset();
                          }}
                        >
                          <option value="all">All audit recoveries</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceRecoveryAuditRecoverySearch">
                        <span>Search audit recoveries</span>
                        <input
                          type="search"
                          value={recoveryAuditPresetRecoveryAuditSearch}
                          onChange={(event) => {
                            setRecoveryAuditPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            );
                            setRecoveryAuditPresetRecoveryAuditSearchPresetId(null);
                            clearRecoveryAuditPresetRecoveryAuditSearchPreset();
                          }}
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search recovery audit preset repair ledger"
                        />
                      </label>
                      <span>
                        Showing {searchedRecoveryAuditPresetRecoveryAudit.length} of {recoveryAuditPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="recovery-audit-recovery-filtering" inline />
                      <HelpInfo topic="recovery-audit-recovery-search" inline />
                    </div>
                    <div className="interfaceRecoveryAuditPresetRecoveryAuditList">
                      {searchedRecoveryAuditPresetRecoveryAudit.map((entry) => (
                        <article key={entry.auditId}>
                          <div>
                            <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <small>{entry.reason}</small>
                        </article>
                      ))}
                      {!searchedRecoveryAuditPresetRecoveryAudit.length ? (
                        <p>No recovery-audit preset repairs match the selected age filter and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportRecoveryAuditPresetRecoveryAudit}>
                        Export audit recovery log
                      </button>
                      <button type="button" onClick={clearRecoveryAuditPresetRecoveryAudit}>
                        Clear audit recovery log
                      </button>
                    </div>
                  </div>
                ) : null}

                {favoriteViewRecoveryAudit.length ? (
                  <div className="interfaceFavoriteRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Favorite view recovery audit</strong>
                        <span>
                          {favoriteViewRecoveryAudit.length} of {MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="favorite-view-recovery-audit" inline />
                    </div>
                    {recoveryAuditPresetRecoveryNotice ? (
                      <div className="interfaceAuditPresetRecovery" role="status">
                        <strong>Recovery audit preset recovered</strong>
                        <span>{recoveryAuditPresetRecoveryNotice}</span>
                        <HelpInfo topic="recovery-audit-preset-recovery" inline />
                      </div>
                    ) : null}
                    <div className="interfaceRecoveryAuditSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Recovery audit search presets</strong>
                          <span>Apply a common audit view without changing stored recovery evidence.</span>
                        </div>
                        <HelpInfo topic="recovery-audit-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Recovery audit search presets">
                        {INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={recoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceRecoveryAuditFilters">
                      <label>
                        <span>Recovery trigger</span>
                        <select
                          value={recoveryAuditFilter}
                          onChange={(event) => {
                            setRecoveryAuditFilter(
                              event.currentTarget.value as InterfaceFavoriteViewRecoveryAuditFilter
                            );
                            setRecoveryAuditSearchPresetId(null);
                            setRecoveryAuditPresetRecoveryNotice(null);
                            clearRecoveryAuditSearchPreset();
                          }}
                        >
                          <option value="all">All recovery triggers</option>
                          <option value="initial-load">Initial load</option>
                          <option value="filter-selection">Filter selection</option>
                          <option value="last-favorite-removed">Last favorite removed</option>
                        </select>
                      </label>
                      <label className="interfaceRecoveryAuditSearch">
                        <span>Search recovery audit</span>
                        <input
                          type="search"
                          value={recoveryAuditSearch}
                          onChange={(event) => {
                            setRecoveryAuditSearch(event.currentTarget.value);
                            setRecoveryAuditSearchPresetId(null);
                            setRecoveryAuditPresetRecoveryNotice(null);
                            clearRecoveryAuditSearchPreset();
                          }}
                          placeholder="Trigger, reason, audit ID…"
                          aria-label="Search favorite view recovery audit"
                        />
                      </label>
                      <span>
                        Showing {searchedFavoriteViewRecoveryAudit.length} of {favoriteViewRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="recovery-audit-filtering" inline />
                      <HelpInfo topic="recovery-audit-search" inline />
                    </div>
                    <div className="interfaceFavoriteRecoveryAuditList">
                      {searchedFavoriteViewRecoveryAudit.map((entry) => (
                        <article key={entry.auditId}>
                          <strong>{entry.trigger.replaceAll("-", " ")}</strong>
                          <span>
                            {new Date(entry.createdAt).toLocaleString()} · {entry.requestedFilter} → {entry.resolvedFilter}
                          </span>
                          <small>{entry.reason}</small>
                        </article>
                      ))}
                      {!searchedFavoriteViewRecoveryAudit.length ? (
                        <p>No recovery audit events match the selected trigger and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportFavoriteViewRecoveryAudit}>
                        Export audit
                      </button>
                      <button type="button" onClick={clearFavoriteViewRecoveryAudit}>
                        Clear audit
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="interfaceQuickSwitcher">
                  <div>
                    <strong>Quick switcher</strong>
                    <HelpInfo topic="preference-quick-switcher" inline />
                  </div>
                  <select
                    value={selectedProfileId}
                    onChange={(event) => setSelectedProfileId(event.currentTarget.value)}
                    aria-label="Choose named local preference profile"
                  >
                    <option value="">Choose a saved profile</option>
                    {filteredNamedProfiles.map((profile) => (
                      <option value={profile.id} key={profile.id}>
                        {profile.favorite ? "★ " : ""}{profile.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applySelectedNamedProfile}
                    disabled={!selectedNamedProfile}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={renameSelectedNamedProfile}
                    disabled={!selectedNamedProfile || !sanitizeNamedInterfacePreferenceName(profileName)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={duplicateSelectedNamedProfile}
                    disabled={!selectedNamedProfile}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSelectedNamedProfile("up")}
                    disabled={
                      !selectedNamedProfile ||
                      namedProfiles[0]?.id === selectedNamedProfile.id
                    }
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSelectedNamedProfile("down")}
                    disabled={
                      !selectedNamedProfile ||
                      namedProfiles[namedProfiles.length - 1]?.id ===
                        selectedNamedProfile.id
                    }
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={toggleSelectedNamedProfileFavorite}
                    disabled={!selectedNamedProfile}
                    aria-pressed={selectedNamedProfile?.favorite ?? false}
                  >
                    {selectedNamedProfile?.favorite ? "Unfavorite" : "Favorite"}
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedNamedProfile}
                    disabled={!selectedNamedProfile}
                  >
                    Delete
                  </button>
                </div>

                {activeNamedProfile ? (
                  <p className="interfaceNamedProfileMatch" role="status">
                    Current preferences exactly match “{activeNamedProfile.name}”.
                  </p>
                ) : null}

                <p className="interfaceFavoriteSummary">
                  ★ {favoriteProfiles.length} favorite{favoriteProfiles.length === 1 ? "" : "s"} · favorites stay local and do not change explicit profile order.
                </p>

                <div className="interfaceNamedProfileList">
                  {filteredNamedProfiles.map((profile) => (
                    <article
                      className={activeNamedProfile?.id === profile.id ? "active" : ""}
                      key={profile.id}
                    >
                      <div>
                        <strong>
                          {profile.favorite ? "★ " : ""}{profile.name}
                        </strong>
                        <span>
                          {profile.favorite ? "Favorite · " : ""}
                          {namedInterfacePreferenceProvenanceLabel(profile)}
                        </span>
                      </div>
                      <small>
                        {profile.preferences.navigationDensity} · {profile.preferences.workspaceLayout} · {profile.preferences.recommendations}
                      </small>
                    </article>
                  ))}
                  {!namedProfiles.length ? (
                    <p>No named profiles are saved in this browser yet.</p>
                  ) : profileQuickFilter === "favorites" && !filteredNamedProfiles.length ? (
                    <p>No favorite named profiles match this quick filter yet.</p>
                  ) : null}
                </div>

                <div className="interfaceRecoverySnapshot">
                  <div>
                    <strong>Local recovery snapshot</strong>
                    <span>
                      {recoverySnapshot
                        ? recoveryDiff?.hasChanges
                          ? "A recovery point is available. Review the differences below before restoring."
                          : "A recovery point is available and currently matches this browser state."
                        : "Save one local recovery point before experimenting with ordering or imports."}
                    </span>
                  </div>
                  <HelpInfo topic="local-preference-recovery-snapshot" inline />
                  {recoverySnapshot && recoveryFreshness ? (
                    <div
                      className={
                        "interfaceRecoveryFreshness " + recoveryFreshness.status
                      }
                    >
                      <strong>
                        {recoveryFreshness.status === "fresh"
                          ? "Fresh snapshot"
                          : recoveryFreshness.status === "aging"
                            ? "Aging snapshot"
                            : recoveryFreshness.status === "stale"
                              ? "Stale snapshot"
                              : recoveryFreshness.status === "expired"
                                ? "Expired guidance window"
                                : "Legacy snapshot"}
                      </strong>
                      <span>
                        {recoverySnapshot.capturedAt
                          ? "Captured " +
                            new Date(recoverySnapshot.capturedAt).toLocaleString() +
                            " · " +
                            Math.floor(recoveryFreshness.ageHours ?? 0) +
                            " hour" +
                            (Math.floor(recoveryFreshness.ageHours ?? 0) === 1
                              ? ""
                              : "s") +
                            " old"
                          : "Capture time unavailable for a pre-Build-134 recovery snapshot."}
                      </span>
                      {recoveryFreshness.status === "expired" ? (
                        <p className="interfaceRecoveryExpiryGuidance">
                          This snapshot is 30 days old or older. Capture a new recovery point before restore when practical; the existing snapshot remains available behind the two-step confirmation.
                        </p>
                      ) : null}
                      <HelpInfo topic="recovery-snapshot-freshness" inline />
                      <HelpInfo topic="snapshot-expiry-guidance" inline />
                    </div>
                  ) : null}
                  {recoverySnapshot && recoveryRenewalAssessment ? (
                    <div
                      className={
                        "interfaceRecoveryRenewal " +
                        recoveryRenewalAssessment.priority
                      }
                    >
                      <strong>Snapshot renewal guidance</strong>
                      <span>{recoveryRenewalAssessment.reason}</span>
                      <HelpInfo topic="recovery-snapshot-renewal" inline />
                    </div>
                  ) : null}
                  <button type="button" onClick={() => captureRecoverySnapshot()}>
                    Save snapshot
                  </button>
                  <button
                    type="button"
                    onClick={renewRecoverySnapshot}
                    disabled={!recoverySnapshot}
                    aria-pressed={snapshotRenewalArmed}
                  >
                    {snapshotRenewalArmed ? "Confirm renewal" : "Review renewal"}
                  </button>
                  {snapshotRenewalArmed ? (
                    <button type="button" onClick={cancelRecoverySnapshotRenewal}>
                      Cancel renewal
                    </button>
                  ) : null}
                  {recoveryRenewalReceipt ? (
                    <div className="interfaceRecoveryRenewalReceipt">
                      <div>
                        <strong>Latest snapshot renewal receipt</strong>
                        <span>
                          {new Date(recoveryRenewalReceipt.createdAt).toLocaleString()} · previous {recoveryRenewalReceipt.previousFreshness}
                        </span>
                      </div>
                      <span>
                        {recoveryRenewalReceipt.profileCount} profiles · {recoveryRenewalReceipt.favoriteCount} favorites · renewed {new Date(recoveryRenewalReceipt.renewedCapturedAt).toLocaleString()}
                      </span>
                      <HelpInfo topic="snapshot-renewal-receipt" inline />
                      <div className="interfaceImportPreviewActions">
                        <button type="button" onClick={exportRecoveryRenewalReceipt}>
                          Export renewal receipt
                        </button>
                        <button type="button" onClick={clearRecoveryRenewalReceipt}>
                          Clear renewal receipt
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {recoveryRenewalReceiptHistory.length ? (
                    <div className="interfaceRecoveryRenewalHistory">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Snapshot renewal receipt history</strong>
                          <span>
                            {recoveryRenewalReceiptHistory.length} of {MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY} local renewal receipts retained
                          </span>
                        </div>
                        <HelpInfo topic="renewal-receipt-history" inline />
                      </div>
                      {renewalHistoryPresetRecoveryNotice ? (
                        <div className="interfaceRenewalPresetRecovery" role="status">
                          <strong>Renewal history preset recovered</strong>
                          <span>{renewalHistoryPresetRecoveryNotice}</span>
                          <HelpInfo topic="renewal-search-preset-recovery" inline />
                        </div>
                      ) : null}
                      {renewalHistoryPresetRecoveryAudit.length ? (
                        <div className="interfaceRenewalPresetRecoveryAudit">
                          <div className="interfacePresetHeading">
                            <div>
                              <strong>Renewal search preset recovery audit</strong>
                              <span>
                                {renewalHistoryPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                              </span>
                            </div>
                            <HelpInfo topic="renewal-search-preset-recovery-audit" inline />
                          </div>
                          <div className="interfaceRenewalPresetRecoveryAuditSearchPresets">
                            <div className="interfacePresetHeading">
                              <div>
                                <strong>Renewal recovery audit search presets</strong>
                                <span>Apply a common recovery-evidence view without changing stored audit events.</span>
                              </div>
                              <HelpInfo topic="renewal-search-preset-recovery-audit-search-presets" inline />
                            </div>
                            <div role="group" aria-label="Renewal recovery audit search presets">
                              {INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                                <button
                                  type="button"
                                  key={preset.id}
                                  aria-pressed={renewalHistoryPresetRecoveryAuditSearchPresetId === preset.id}
                                  title={preset.description}
                                  onClick={() => applyRenewalSearchPresetRecoveryAuditSearchPreset(preset.id)}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="interfaceRenewalPresetRecoveryAuditFilters">
                            <label>
                              <span>Recovery age</span>
                              <select
                                value={renewalHistoryPresetRecoveryAuditAgeFilter}
                                onChange={(event) => {
                                  setRenewalHistoryPresetRecoveryAuditAgeFilter(
                                    event.currentTarget.value as InterfaceRecoveryRenewalSearchPresetRecoveryAuditAgeFilter
                                  );
                                  setRenewalHistoryPresetRecoveryAuditSearchPresetId(null);
                                }}
                              >
                                <option value="all">All recovery events</option>
                                <option value="24h">Last 24 hours</option>
                                <option value="7d">Last 7 days</option>
                              </select>
                            </label>
                            <label className="interfaceRenewalPresetRecoveryAuditSearch">
                              <span>Search recovery audit</span>
                              <input
                                type="search"
                                value={renewalHistoryPresetRecoveryAuditSearch}
                                onChange={(event) => {
                                  setRenewalHistoryPresetRecoveryAuditSearch(
                                    event.currentTarget.value
                                  );
                                  setRenewalHistoryPresetRecoveryAuditSearchPresetId(null);
                                }}
                                placeholder="Audit ID, requested preset, reason…"
                                aria-label="Search renewal search preset recovery audit"
                              />
                            </label>
                            <span>
                              Showing {searchedRenewalHistoryPresetRecoveryAudit.length} of {renewalHistoryPresetRecoveryAudit.length}
                            </span>
                            <HelpInfo topic="renewal-search-preset-recovery-audit-filtering" inline />
                            <HelpInfo topic="renewal-search-preset-recovery-audit-search" inline />
                          </div>
                          <div className="interfaceRenewalPresetRecoveryAuditList">
                            {searchedRenewalHistoryPresetRecoveryAudit.map((entry) => (
                              <article key={entry.auditId}>
                                <div>
                                  <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                                  <span>{new Date(entry.createdAt).toLocaleString()}</span>
                                </div>
                                <small>{entry.reason}</small>
                              </article>
                            ))}
                          </div>
                          <div className="interfaceImportPreviewActions">
                            <button type="button" onClick={exportRecoveryRenewalSearchPresetRecoveryAudit}>
                              Export renewal recovery audit
                            </button>
                            <button type="button" onClick={clearRecoveryRenewalSearchPresetRecoveryAudit}>
                              Clear renewal recovery audit
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <div className="interfaceRenewalHistorySearchPresets">
                        <div className="interfacePresetHeading">
                          <div>
                            <strong>Renewal history search presets</strong>
                            <span>Apply a common renewal-history view without changing receipt evidence.</span>
                          </div>
                          <HelpInfo topic="renewal-history-search-presets" inline />
                        </div>
                        <div role="group" aria-label="Renewal history search presets">
                          {INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS.map((preset) => (
                            <button
                              type="button"
                              key={preset.id}
                              aria-pressed={renewalHistorySearchPresetId === preset.id}
                              title={preset.description}
                              onClick={() => applyRecoveryRenewalHistorySearchPreset(preset.id)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="interfaceRenewalHistoryFilters">
                        <label>
                          <span>Previous freshness</span>
                          <select
                            value={renewalHistoryFreshnessFilter}
                            onChange={(event) => {
                              setRenewalHistoryFreshnessFilter(
                                event.currentTarget.value as InterfacePreferenceRecoveryRenewalHistoryFreshnessFilter
                              );
                              setRenewalHistorySearchPresetId(null);
                              setRenewalHistoryPresetRecoveryNotice(null);
                              clearRecoveryRenewalHistorySearchPreset();
                            }}
                          >
                            <option value="all">All prior freshness</option>
                            <option value="fresh">Fresh</option>
                            <option value="aging">Aging</option>
                            <option value="stale">Stale</option>
                            <option value="expired">Expired</option>
                            <option value="unknown">Legacy / unknown</option>
                          </select>
                        </label>
                        <label className="interfaceRenewalHistorySearch">
                          <span>Search renewal history</span>
                          <input
                            type="search"
                            value={renewalHistorySearch}
                            onChange={(event) => {
                              setRenewalHistorySearch(event.currentTarget.value);
                              setRenewalHistorySearchPresetId(null);
                              setRenewalHistoryPresetRecoveryNotice(null);
                              clearRecoveryRenewalHistorySearchPreset();
                            }}
                            placeholder="Receipt ID, freshness, profile count…"
                            aria-label="Search recovery snapshot renewal receipt history"
                          />
                        </label>
                        <span>
                          Showing {searchedRecoveryRenewalReceiptHistory.length} of {recoveryRenewalReceiptHistory.length}
                        </span>
                        <HelpInfo topic="renewal-receipt-history-filtering" inline />
                        <HelpInfo topic="renewal-receipt-history-search" inline />
                      </div>
                      <div className="interfaceRecoveryRenewalHistoryList">
                        {searchedRecoveryRenewalReceiptHistory.map((receipt) => (
                          <article key={receipt.receiptId}>
                            <div>
                              <strong>
                                {receipt.receiptId === recoveryRenewalReceipt?.receiptId ? "Latest · " : ""}
                                {receipt.previousFreshness} → renewed
                              </strong>
                              <span>{new Date(receipt.createdAt).toLocaleString()}</span>
                            </div>
                            <span>
                              {receipt.profileCount} profiles · {receipt.favoriteCount} favorites
                            </span>
                          </article>
                        ))}
                        {!searchedRecoveryRenewalReceiptHistory.length ? (
                          <p>No renewal receipts match the selected freshness filter and search.</p>
                        ) : null}
                      </div>
                      <div className="interfaceImportPreviewActions">
                        <button type="button" onClick={exportRecoveryRenewalReceiptHistory}>
                          Export renewal history
                        </button>
                        <button type="button" onClick={clearRecoveryRenewalReceiptHistory}>
                          Clear renewal history
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={restoreRecoverySnapshot}
                    disabled={!recoverySnapshot}
                    aria-pressed={recoveryRestoreArmed}
                  >
                    {recoveryRestoreArmed ? "Confirm restore" : "Review & confirm restore"}
                  </button>
                  {recoveryRestoreArmed ? (
                    <button type="button" onClick={cancelRecoveryRestore}>
                      Cancel confirmation
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearRecoverySnapshot}
                    disabled={!recoverySnapshot}
                  >
                    Clear snapshot
                  </button>
                </div>

                {recoverySnapshot && recoveryDiff ? (
                  <div className="interfaceRecoveryDiffPreview">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Recovery diff preview</strong>
                        <span>Shows what a confirmed restore would change before any local state is replaced.</span>
                      </div>
                      <HelpInfo topic="recovery-diff-preview" inline />
                    </div>
                    <div className="interfaceRecoveryDiffSummary">
                      <span>{recoveryDiff.preferenceChanges.length} interface setting change{recoveryDiff.preferenceChanges.length === 1 ? "" : "s"}</span>
                      <span>{recoveryDiff.currentOnlyProfiles.length} current-only profile{recoveryDiff.currentOnlyProfiles.length === 1 ? "" : "s"}</span>
                      <span>{recoveryDiff.snapshotOnlyProfiles.length} profile{recoveryDiff.snapshotOnlyProfiles.length === 1 ? "" : "s"} restored</span>
                      <span>{recoveryDiff.changedProfiles.length} profile detail change{recoveryDiff.changedProfiles.length === 1 ? "" : "s"}</span>
                      <span>{recoveryDiff.favoriteChanges.length} favorite change{recoveryDiff.favoriteChanges.length === 1 ? "" : "s"}</span>
                      <span>{recoveryDiff.orderChanged ? "Order will change" : "Order unchanged"}</span>
                    </div>
                    {recoveryDiff.preferenceChanges.length ? (
                      <ul>
                        {recoveryDiff.preferenceChanges.map((change) => (
                          <li key={change.field}>
                            {change.field}: {change.current} → {change.snapshot}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {recoveryDiff.currentOnlyProfiles.length ? (
                      <p>Restore would remove current-only: {recoveryDiff.currentOnlyProfiles.join(", ")}.</p>
                    ) : null}
                    {recoveryDiff.snapshotOnlyProfiles.length ? (
                      <p>Restore would bring back: {recoveryDiff.snapshotOnlyProfiles.join(", ")}.</p>
                    ) : null}
                    {recoveryDiff.changedProfiles.length ? (
                      <p>Restore would reset profile details for: {recoveryDiff.changedProfiles.join(", ")}.</p>
                    ) : null}
                    {recoveryDiff.favoriteChanges.length ? (
                      <p>Restore would change favorite state for: {recoveryDiff.favoriteChanges.join(", ")}.</p>
                    ) : null}
                    {!recoveryDiff.hasChanges ? (
                      <p>No differences are currently detected between this browser and the saved recovery snapshot.</p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="interfacePortabilitySection" aria-labelledby="preference-portability-heading">
                <div className="interfacePresetHeading">
                  <div>
                    <strong id="preference-portability-heading">Preference profile portability</strong>
                    <span>Move interface preferences between browsers without syncing account, workspace or navigation-history data.</span>
                  </div>
                  <HelpInfo topic="preference-profile-portability" inline />
                </div>

                <div className="interfacePortabilityActions">
                  <button type="button" onClick={exportPreferenceProfile}>
                    Export profile
                  </button>
                  <button type="button" onClick={() => importFileRef.current?.click()}>
                    Import profile
                  </button>
                  <button type="button" onClick={exportPreferenceBundle}>
                    Export named bundle
                  </button>
                  <button type="button" onClick={() => bundleImportFileRef.current?.click()}>
                    Import named bundle
                  </button>
                  <input
                    ref={importFileRef}
                    hidden
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      void stagePreferenceProfileImport(file);
                      event.currentTarget.value = "";
                    }}
                  />
                  <input
                    ref={bundleImportFileRef}
                    hidden
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      void stagePreferenceBundleImport(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>

                <p className="interfacePortabilityBoundary">
                  Single-profile files contain one preference set. Named bundles contain profile names plus preference values only. Local IDs, navigation insights, account information and business data are excluded.
                </p>

                {importError ? (
                  <div className="interfacePortabilityError" role="alert">{importError}</div>
                ) : null}
                {portabilityStatus ? (
                  <div className="interfacePortabilityStatus" role="status">{portabilityStatus}</div>
                ) : null}

                {bundlePreview && bundleAnalysis ? (
                  <div className="interfaceBundlePreview">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Named bundle conflict preview</strong>
                        <span>Review incoming profiles and choose how same-name conflicts should be handled before import.</span>
                      </div>
                      <HelpInfo topic="preference-bundle-conflict-resolution" inline />
                    </div>

                    <div className="interfaceImportProvenance">
                      <strong>Bundle source</strong>
                      <span>
                        {bundleSourceName || "Imported bundle"} · {INTERFACE_PREFERENCE_BUNDLE_FORMAT} v{bundlePreview.version}
                      </span>
                      <HelpInfo topic="portable-preference-bundles" inline />
                    </div>

                    <div className="interfaceBundleSummary">
                      <span>{bundleSelectedNames.length} selected of {bundlePreview.profiles.length}</span>
                      <span>{bundleAnalysis.incomingCount} selected incoming</span>
                      <span>{bundleAnalysis.conflictCount} name conflict{bundleAnalysis.conflictCount === 1 ? "" : "s"}</span>
                      <span>{bundleAnalysis.availableSlots} open slot{bundleAnalysis.availableSlots === 1 ? "" : "s"}</span>
                    </div>

                    {bundleCapacityPlan ? (
                      <div
                        className={
                          "interfaceBundleCapacityPlan " +
                          (bundleCapacityPlan.fitsWithoutCapacitySkips
                            ? "fits"
                            : "capacityRisk")
                        }
                      >
                        <div className="interfacePresetHeading">
                          <div>
                            <strong>Import capacity plan</strong>
                            <span>Forecasts the selected import before any named-profile slots are written.</span>
                          </div>
                          <HelpInfo topic="bundle-import-capacity-planning" inline />
                        </div>
                        <div className="interfaceBundleCapacityMetrics">
                          <span>{bundleCapacityPlan.currentCount}/{MAX_NAMED_INTERFACE_PROFILES} currently used</span>
                          <span>{bundleCapacityPlan.newSlotDemand} new slot{bundleCapacityPlan.newSlotDemand === 1 ? "" : "s"} requested</span>
                          <span>{bundleCapacityPlan.projectedAdded} projected add{bundleCapacityPlan.projectedAdded === 1 ? "" : "s"}</span>
                          <span>{bundleCapacityPlan.projectedReplaced} projected replacement{bundleCapacityPlan.projectedReplaced === 1 ? "" : "s"}</span>
                          <span>{bundleCapacityPlan.projectedSkippedConflicts} conflict skip{bundleCapacityPlan.projectedSkippedConflicts === 1 ? "" : "s"}</span>
                          <span>{bundleCapacityPlan.projectedSkippedCapacity} capacity skip{bundleCapacityPlan.projectedSkippedCapacity === 1 ? "" : "s"}</span>
                          <span>{bundleCapacityPlan.projectedFinalCount}/{MAX_NAMED_INTERFACE_PROFILES} projected final</span>
                        </div>
                        <p>
                          {bundleCapacityPlan.fitsWithoutCapacitySkips
                            ? "Selected profiles fit within local capacity under the current conflict strategy."
                            : "Local capacity is insufficient for every selected profile under the current conflict strategy; excess additions will be skipped."}
                        </p>
                      </div>
                    ) : null}

                    <label className="interfaceBundleStrategy">
                      <span>Conflict resolution</span>
                      <select
                        value={bundleConflictStrategy}
                        onChange={(event) =>
                          setBundleConflictStrategy(
                            event.currentTarget.value as InterfacePreferenceBundleConflictStrategy
                          )
                        }
                      >
                        <option value="skip">Skip same-name incoming profiles</option>
                        <option value="replace">Replace same-name local profiles</option>
                        <option value="keep-both">Keep both with Imported suffix</option>
                      </select>
                    </label>

                    <div className="interfaceBundleSelectionControls">
                      <strong>Selective import</strong>
                      <span>Choose exactly which incoming named profiles should participate in conflict resolution.</span>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setBundleSelectedNames(
                              bundlePreview.profiles.map((profile) => profile.name)
                            )
                          }
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => setBundleSelectedNames([])}
                        >
                          Clear selection
                        </button>
                      </div>
                    </div>

                    <div className="interfaceBundleProfileList">
                      {bundlePreview.profiles.map((profile) => {
                        const conflict = bundleAnalysis.conflicts.find(
                          (item) =>
                            item.incomingName.toLocaleLowerCase() ===
                            profile.name.toLocaleLowerCase()
                        );
                        return (
                          <article
                            className={
                              (conflict ? "conflict " : "") +
                              (bundleSelectedNames.includes(profile.name)
                                ? "selected"
                                : "notSelected")
                            }
                            key={profile.name}
                          >
                            <label className="interfaceBundleProfileSelect">
                              <input
                                type="checkbox"
                                checked={bundleSelectedNames.includes(profile.name)}
                                onChange={(event) =>
                                  setBundleSelectedNames((current) =>
                                    event.currentTarget.checked
                                      ? [...current, profile.name]
                                      : current.filter((name) => name !== profile.name)
                                  )
                                }
                              />
                              <span className="srOnly">
                                Select {profile.name} for bundle import
                              </span>
                            </label>
                            <div>
                              <strong>{profile.name}</strong>
                              <span>
                                {profile.preferences.navigationDensity} · {profile.preferences.workspaceLayout} · {profile.preferences.recommendations}
                              </span>
                            </div>
                            <em>{conflict ? "Name conflict" : "New profile"}</em>
                          </article>
                        );
                      })}
                    </div>

                    <div className="interfaceImportPreviewActions">
                      <button
                        type="button"
                        onClick={applyPreferenceBundleImport}
                        disabled={!bundleSelectedNames.length}
                      >
                        Import selected profiles
                      </button>
                      <button type="button" onClick={cancelPreferenceBundleImport}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {bundleImportOutcome ? (
                  <div
                    className={
                      "interfaceBundleOutcomeReconciliation " +
                      (bundleImportOutcome.matchesPlan ? "matched" : "deviated")
                    }
                    role="status"
                  >
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Import plan outcome reconciliation</strong>
                        <span>
                          {bundleImportOutcome.matchesPlan
                            ? "The completed import matched every forecasted capacity outcome."
                            : "The completed import differed from at least one forecasted capacity outcome."}
                        </span>
                      </div>
                      <HelpInfo topic="import-plan-outcome-reconciliation" inline />
                    </div>
                    <div className="interfaceBundleOutcomeGrid">
                      <span>Added: {bundleImportOutcome.planned.added} planned / {bundleImportOutcome.actual.added} actual</span>
                      <span>Replaced: {bundleImportOutcome.planned.replaced} planned / {bundleImportOutcome.actual.replaced} actual</span>
                      <span>Conflict skips: {bundleImportOutcome.planned.skippedConflicts} planned / {bundleImportOutcome.actual.skippedConflicts} actual</span>
                      <span>Capacity skips: {bundleImportOutcome.planned.skippedCapacity} planned / {bundleImportOutcome.actual.skippedCapacity} actual</span>
                      <span>Final count: {bundleImportOutcome.planned.finalCount} planned / {bundleImportOutcome.actual.finalCount} actual</span>
                    </div>
                    {bundleImportOutcome.deviations.length ? (
                      <ul>
                        {bundleImportOutcome.deviations.map((deviation) => (
                          <li key={deviation}>{deviation}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No deviations were detected between the import plan and the resolver outcome.</p>
                    )}
                  </div>
                ) : null}

                {importReconciliationReceipt ? (
                  <div className="interfaceImportReceipt">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Latest import reconciliation receipt</strong>
                        <span>
                          Saved locally · {new Date(importReconciliationReceipt.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <HelpInfo topic="import-reconciliation-receipt" inline />
                    </div>
                    <div className="interfaceImportReceiptMeta">
                      <span>Receipt {importReconciliationReceipt.receiptId}</span>
                      <span>Source: {importReconciliationReceipt.sourceName}</span>
                      <span>Strategy: {importReconciliationReceipt.strategy}</span>
                      <span>
                        Selected: {importReconciliationReceipt.selectedNames.join(", ") || "none"}
                      </span>
                      <span>
                        Result: {importReconciliationReceipt.reconciliation.matchesPlan ? "matched plan" : "deviated from plan"}
                      </span>
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportImportReconciliationReceipt}>
                        Export receipt
                      </button>
                      <button type="button" onClick={clearImportReconciliationReceipt}>
                        Clear receipt
                      </button>
                    </div>
                  </div>
                ) : null}

                {receiptPresetRecoveryAudit.length ? (
                  <div className="interfaceReceiptPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Receipt preset recovery audit</strong>
                        <span>
                          {receiptPresetRecoveryAudit.length} of {MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="receipt-preset-recovery-audit" inline />
                    </div>
                    {receiptPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                      <div className="interfaceReceiptRecoveryAuditPresetRecovery" role="status">
                        <strong>Receipt recovery audit preset recovered</strong>
                        <span>{receiptPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                        <HelpInfo topic="receipt-recovery-audit-search-preset-recovery" inline />
                      </div>
                    ) : null}
                    {receiptRecoveryAuditSearchPresetRecoveryAudit.length ? (
                      <div className="interfaceReceiptRecoveryAuditPresetRecoveryAudit">
                        <div className="interfacePresetHeading">
                          <div>
                            <strong>Receipt recovery audit preset recovery audit</strong>
                            <span>
                              {receiptRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                            </span>
                          </div>
                          <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit" inline />
                        </div>
                        <div className="interfaceReceiptRecoveryAuditPresetRecoveryAuditList">
                          {receiptRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
                            <article key={entry.auditId}>
                              <div>
                                <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                                <span>{new Date(entry.createdAt).toLocaleString()}</span>
                              </div>
                              <small>{entry.reason}</small>
                            </article>
                          ))}
                        </div>
                        <div className="interfaceImportPreviewActions">
                          <button type="button" onClick={exportReceiptRecoveryAuditSearchPresetRecoveryAudit}>
                            Export preset recovery audit
                          </button>
                          <button type="button" onClick={clearReceiptRecoveryAuditSearchPresetRecoveryAudit}>
                            Clear preset recovery audit
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="interfaceReceiptRecoveryAuditSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Receipt recovery audit search presets</strong>
                          <span>Apply a common recovery-audit view without changing stored evidence.</span>
                        </div>
                        <HelpInfo topic="receipt-recovery-audit-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Receipt recovery audit search presets">
                        {INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={receiptPresetRecoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyReceiptPresetRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceReceiptRecoveryAuditFilters">
                      <label>
                        <span>Recovery age</span>
                        <select
                          value={receiptPresetRecoveryAuditAgeFilter}
                          onChange={(event) => {
                            setReceiptPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceReceiptPresetRecoveryAuditAgeFilter
                            );
                            setReceiptPresetRecoveryAuditSearchPresetId(null);
                            setReceiptPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearReceiptPresetRecoveryAuditSearchPreset();
                          }}
                        >
                          <option value="all">All recovery events</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceReceiptRecoveryAuditSearch">
                        <span>Search recovery audit</span>
                        <input
                          type="search"
                          value={receiptPresetRecoveryAuditSearch}
                          onChange={(event) => {
                            setReceiptPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            );
                            setReceiptPresetRecoveryAuditSearchPresetId(null);
                            setReceiptPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearReceiptPresetRecoveryAuditSearchPreset();
                          }}
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search receipt preset recovery audit"
                        />
                      </label>
                      <span>
                        Showing {searchedReceiptPresetRecoveryAudit.length} of {receiptPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="receipt-recovery-audit-filtering" inline />
                      <HelpInfo topic="receipt-recovery-audit-search" inline />
                    </div>
                    <div className="interfaceReceiptPresetRecoveryAuditList">
                      {searchedReceiptPresetRecoveryAudit.map((entry) => (
                        <article key={entry.auditId}>
                          <div>
                            <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <small>{entry.reason}</small>
                        </article>
                      ))}
                      {!searchedReceiptPresetRecoveryAudit.length ? (
                        <p>No receipt preset recovery events match the selected age filter and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportReceiptPresetRecoveryAudit}>
                        Export recovery audit
                      </button>
                      <button type="button" onClick={clearReceiptPresetRecoveryAudit}>
                        Clear recovery audit
                      </button>
                    </div>
                  </div>
                ) : null}

                {importReceiptHistory.length ? (
                  <div className="interfaceImportReceiptHistory">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Import reconciliation receipt history</strong>
                        <span>
                          {importReceiptHistory.length} of {MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY} local receipt slots used
                        </span>
                      </div>
                      <HelpInfo topic="import-receipt-history" inline />
                    </div>
                    {receiptPresetRecoveryNotice ? (
                      <div className="interfaceReceiptPresetRecovery" role="status">
                        <strong>Receipt preset recovered</strong>
                        <span>{receiptPresetRecoveryNotice}</span>
                        <HelpInfo topic="receipt-preset-recovery" inline />
                      </div>
                    ) : null}
                    <div className="interfaceReceiptSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Receipt search presets</strong>
                          <span>Apply a quick view without changing stored receipt evidence.</span>
                        </div>
                        <HelpInfo topic="receipt-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Receipt search presets">
                        {INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={receiptSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyReceiptSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceReceiptHistoryFilters">
                      <div role="group" aria-label="Filter receipt history by outcome">
                        {(["all", "matched", "deviated"] as const).map((value) => (
                          <button
                            type="button"
                            key={value}
                            aria-pressed={receiptOutcomeFilter === value}
                            onClick={() => {
                              setReceiptOutcomeFilter(value);
                              setReceiptSearchPresetId(null);
                              setReceiptPresetRecoveryNotice(null);
                              clearReceiptSearchPreset();
                            }}
                          >
                            {value === "all" ? "All outcomes" : value === "matched" ? "Matched" : "Deviated"}
                          </button>
                        ))}
                      </div>
                      <label>
                        <span>Strategy</span>
                        <select
                          value={receiptStrategyFilter}
                          onChange={(event) => {
                            setReceiptStrategyFilter(
                              event.currentTarget.value as InterfacePreferenceReceiptHistoryStrategyFilter
                            );
                            setReceiptSearchPresetId(null);
                            setReceiptPresetRecoveryNotice(null);
                            clearReceiptSearchPreset();
                          }}
                        >
                          <option value="all">All strategies</option>
                          <option value="skip">Skip</option>
                          <option value="replace">Replace</option>
                          <option value="keep-both">Keep both</option>
                        </select>
                      </label>
                      <label className="interfaceReceiptHistorySearch">
                        <span>Search receipts</span>
                        <input
                          type="search"
                          value={receiptHistorySearch}
                          onChange={(event) => {
                            setReceiptHistorySearch(event.currentTarget.value);
                            setReceiptSearchPresetId(null);
                            setReceiptPresetRecoveryNotice(null);
                            clearReceiptSearchPreset();
                          }}
                          placeholder="Source, profile, receipt ID, strategy…"
                          aria-label="Search import reconciliation receipt history"
                        />
                      </label>
                      <span>
                        Showing {searchedImportReceiptHistory.length} of {importReceiptHistory.length}
                      </span>
                      <HelpInfo topic="receipt-history-filtering" inline />
                      <HelpInfo topic="receipt-history-search" inline />
                    </div>
                    <div className="interfaceImportReceiptHistoryList">
                      {searchedImportReceiptHistory.map((receipt) => (
                        <article key={receipt.receiptId}>
                          <div>
                            <strong>
                              {receipt.receiptId === importReconciliationReceipt?.receiptId ? "Latest · " : ""}
                              {receipt.sourceName}
                            </strong>
                            <span>
                              {new Date(receipt.createdAt).toLocaleString()} · {receipt.strategy}
                            </span>
                          </div>
                          <span>
                            {receipt.selectedNames.length} selected · {receipt.reconciliation.matchesPlan ? "matched plan" : "deviated"}
                          </span>
                        </article>
                      ))}
                      {!searchedImportReceiptHistory.length ? (
                        <p>No receipts match the selected history filters and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button
                        type="button"
                        onClick={exportImportReconciliationReceiptHistory}
                      >
                        Export history
                      </button>
                      <button
                        type="button"
                        onClick={clearImportReconciliationReceiptHistory}
                      >
                        Clear history
                      </button>
                    </div>
                  </div>
                ) : null}

                {importPreview ? (
                  <div className="interfaceImportPreview">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Import reconciliation preview</strong>
                        <span>Review stored values and the effective values this browser will use before applying.</span>
                      </div>
                      <HelpInfo topic="preference-import-preview" inline />
                    </div>

                    {importSource?.kind === "imported" ? (
                      <div className="interfaceImportProvenance">
                        <strong>Import provenance</strong>
                        <span>
                          {importSource.sourceName} · {importSource.sourceFormat} v{importSource.sourceVersion}
                        </span>
                        <HelpInfo topic="preference-import-provenance" inline />
                      </div>
                    ) : null}

                    <dl>
                      <div>
                        <dt>Navigation density</dt>
                        <dd>{importPreview.storedPreferences.navigationDensity} → {importPreview.effectivePreferences.navigationDensity}</dd>
                      </div>
                      <div>
                        <dt>Workspace layout</dt>
                        <dd>{importPreview.storedPreferences.workspaceLayout} → {importPreview.effectivePreferences.workspaceLayout}</dd>
                      </div>
                      <div>
                        <dt>Recommendations</dt>
                        <dd>{importPreview.storedPreferences.recommendations} → {importPreview.effectivePreferences.recommendations}</dd>
                      </div>
                    </dl>

                    {importPreview.adjustments.length ? (
                      <ul>
                        {importPreview.adjustments.map((adjustment) => (
                          <li key={adjustment}>{adjustment}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No accessibility reconciliation is required for this imported profile in the current browser.</p>
                    )}

                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={applyImportedPreferenceProfile}>
                        Apply imported profile
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          importPreview && importSource
                            ? saveNamedProfile(
                                importPreview.storedPreferences,
                                importSource
                              )
                            : undefined
                        }
                      >
                        Save imported as named profile
                      </button>
                      <button type="button" onClick={cancelPreferenceProfileImport}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="interfaceResetGovernance" aria-labelledby="reset-governance-heading">
                <div className="interfacePresetHeading">
                  <div>
                    <strong id="reset-governance-heading">Operator reset governance</strong>
                    <span>Choose the reset scope deliberately. Full reset requires a second activation.</span>
                  </div>
                  <HelpInfo topic="operator-reset-governance" inline />
                </div>
                <div className="interfaceResetChoices">
                  <button type="button" onClick={resetInterfacePreferences}>
                    <strong>{INTERFACE_RESET_GOVERNANCE.preferences.label}</strong>
                    <span>{INTERFACE_RESET_GOVERNANCE.preferences.description}</span>
                  </button>
                  <button type="button" onClick={resetLocalInsights}>
                    <strong>{INTERFACE_RESET_GOVERNANCE.insights.label}</strong>
                    <span>{INTERFACE_RESET_GOVERNANCE.insights.description}</span>
                  </button>
                  <button
                    type="button"
                    className={resetAllArmed ? "armed" : ""}
                    onClick={resetAllLocalNavigationData}
                    aria-pressed={resetAllArmed}
                  >
                    <strong>
                      {resetAllArmed ? "Confirm full local reset" : INTERFACE_RESET_GOVERNANCE.all.label}
                    </strong>
                    <span>
                      {resetAllArmed
                        ? "Activate once more to clear preferences and insights in this browser."
                        : INTERFACE_RESET_GOVERNANCE.all.description}
                    </span>
                  </button>
                </div>
              </section>
            </section>

            <div className="navigationInsightMetrics" aria-label="Local navigation usage summary">
              <article><strong>{totals.totalVisits}</strong><span>Registered visits</span></article>
              <article><strong>{totals.uniqueDestinations}</strong><span>Destinations used</span></article>
              <article><strong>{totals.shortcutUses}</strong><span>Shortcut opens</span></article>
            </div>

            <div className="navigationInsightsGrid">
              <section className="navigationInsightsPanel" aria-labelledby="shortcut-discoverability-heading">
                <div className="navigationInsightsSectionHeading">
                  <div><p className="eyebrow">Discoverability</p><h3 id="shortcut-discoverability-heading">Shortcut metrics</h3></div>
                  <HelpInfo topic="shortcut-discoverability-metrics" inline />
                </div>
                <div className="shortcutDiscoverabilityList">
                  {shortcutMetrics.map((metric) => (
                    <article key={metric.id}>
                      <div><strong>{metric.label}</strong><span>{metric.guidance}</span></div>
                      <div className="shortcutDiscoverabilityMeta">
                        <kbd>{metric.keys}</kbd>
                        <span>{metric.uses} use{metric.uses === 1 ? "" : "s"}</span>
                        <em>{metric.level.replace("-", " ")}</em>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="navigationInsightsPanel" aria-labelledby="personalized-recommendations-heading">
                <div className="navigationInsightsSectionHeading">
                  <div><p className="eyebrow">Local recommendations</p><h3 id="personalized-recommendations-heading">Suggested for you</h3></div>
                  <HelpInfo topic="personalized-interface-recommendations" inline />
                </div>
                <div className="interfaceRecommendationList">
                  {visibleRecommendations.map((recommendation) =>
                    recommendation.kind === "destination" ? (
                      <Link href={recommendation.href} onClick={closeInsights} key={recommendation.id}>
                        <span><strong>{recommendation.label}</strong><small>{recommendation.description}</small></span>
                        <em>{recommendation.reason}</em>
                      </Link>
                    ) : (
                      <article key={recommendation.id}>
                        <span><strong>{recommendation.label}</strong><small>{recommendation.description}</small></span>
                        <div><kbd>{recommendation.keys}</kbd><em>{recommendation.reason}</em></div>
                      </article>
                    )
                  )}
                  {!visibleRecommendations.length ? (
                    <div className="interfaceRecommendationEmpty">
                      Recommendations are hidden by your local interface preference.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <footer className="navigationInsightsFooter">
              <span>Browser-local repair-preset recovery, renewal recovery-audit presets and receipt-preset recovery audit only · no server sync or workflow authority changes.</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
