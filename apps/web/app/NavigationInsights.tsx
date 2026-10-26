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
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS,
  INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_RECONCILED_EVENT,
  INTERFACE_PREFERENCES_STORAGE_KEY,
  INTERFACE_RESET_GOVERNANCE,
  MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT,
  MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY,
  MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY,
  MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT,
  MAX_NAMED_INTERFACE_PROFILES,
  analyzeInterfacePreferenceBundleImport,
  applyInterfacePreferencePreset,
  assessInterfacePreferenceRecoverySnapshotRenewal,
  createInterfaceFavoriteViewRecoveryAuditEntry,
  createInterfacePreferenceRecoveryRenewalReceipt,
  createInterfaceRecoveryAuditPresetRecoveryAuditEntry,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfaceReceiptPresetRecoveryAuditEntry,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
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
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit,
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  filterInterfaceReceiptPresetRecoveryAudit,
  interfacePreferenceReceiptSearchPresetById,
  interfaceReceiptPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryAuditSearchPresetById,
  interfaceRecoveryRenewalHistorySearchPresetById,
  interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
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
  parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit,
  parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  parseInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit,
  parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  parseInterfaceReceiptPresetRecoveryAudit,
  parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit,
  parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
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
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceReceiptPresetRecoveryAuditEntry,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  recommendationPreferenceAllowsKind,
  reconcileInterfacePreferenceBundleImportOutcome,
  recoverInterfacePreferenceReceiptSearchPresetId,
  recoverInterfaceReceiptPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  recoverInterfaceRecoveryRenewalHistorySearchPresetId,
  recoverInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
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
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  searchInterfaceReceiptPresetRecoveryAudit,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  setNamedInterfacePreferenceProfileFavorite,
  sanitizeInterfacePreferenceReceiptSearchPresetId,
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
  serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit,
  serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit,
  serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceReceiptPresetRecoveryAudit,
  serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
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
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryAuditPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryAuditPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalHistorySearchPresetId,
  type InterfaceRecoveryRenewalSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
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

function readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Repair-preset recovery audit search preset persistence is optional browser-local view state.
  }
}

function clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Repair-preset recovery audit search preset persistence is optional browser-local view state.
  }
}

function readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Repair-preset recovery audit search preset recovery audit is optional browser-local evidence.
  }
}

function readRecoveryAuditRepairSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(raw);
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRecoveryAuditRepairSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(entries)
    );
  } catch {
    // Repair-search-preset recovery audit is optional browser-local evidence.
  }
}

function readRenewalRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(raw);
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRenewalRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(entries)
    );
  } catch {
    // Renewal recovery-audit search preset recovery audit is optional browser-local evidence.
  }
}

function readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Renewal preset-recovery audit search preset recovery audit is optional browser-local evidence.
  }
}

function readRenewalRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRenewalRecoveryAuditSearchPreset(
  id: InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Renewal recovery-audit preset persistence is optional browser-local view state.
  }
}

function clearRenewalRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Renewal recovery-audit preset persistence is optional browser-local view state.
  }
}

function readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Renewal preset-recovery audit search preset persistence is optional browser-local view state.
  }
}

function clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Renewal preset-recovery audit search preset persistence is optional browser-local view state.
  }
}

function readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Receipt preset-repair audit search preset persistence is optional browser-local view state.
  }
}

function clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Receipt preset-repair audit search preset persistence is optional browser-local view state.
  }
}

function readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Repair search-preset recovery audit search preset persistence is optional browser-local view state.
  }
}

function clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Repair search-preset recovery audit search preset persistence is optional browser-local view state.
  }
}

function readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Deep repair search-preset recovery audit is optional browser-local evidence.
  }
}

function readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Renewal search-preset recovery audit preset persistence is optional browser-local view state.
  }
}

function clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Renewal search-preset recovery audit preset persistence is optional browser-local view state.
  }
}

function readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Deep renewal search-preset recovery audit is optional browser-local evidence.
  }
}

function readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return {
      ...recovery,
      requestedPresetId: raw ?? ""
    };
  } catch {
    return {
      presetId: "all" as InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Receipt search-preset recovery audit preset persistence is optional browser-local view state.
  }
}

function clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Receipt search-preset recovery audit preset persistence is optional browser-local view state.
  }
}

function readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return { ...recovery, requestedPresetId: raw ?? "" };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Newest repair preset persistence is optional browser-local view state.
  }
}

function clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Newest repair preset persistence is optional browser-local view state.
  }
}

function readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Newest repair preset recovery audit is optional browser-local evidence.
  }
}

function readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return { ...recovery, requestedPresetId: raw ?? "" };
  } catch {
    return {
      presetId: "all" as InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Newest renewal preset persistence is optional browser-local view state.
  }
}

function clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Newest renewal preset persistence is optional browser-local view state.
  }
}

function readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Newest renewal preset recovery audit is optional browser-local evidence.
  }
}

function readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
    const recovery =
      recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        raw
      );
    return { ...recovery, requestedPresetId: raw ?? "" };
  } catch {
    return {
      presetId: "all" as InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
      recovered: false,
      reason: null,
      requestedPresetId: ""
    };
  }
}

function writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
      id
    );
  } catch {
    // Newest receipt recovery preset persistence is optional browser-local view state.
  }
}

function clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset() {
  try {
    window.localStorage.removeItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
    );
  } catch {
    // Newest receipt recovery preset persistence is optional browser-local view state.
  }
}

function readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Newest receipt preset recovery audit is optional browser-local evidence.
  }
}

function readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Receipt search-preset recovery audit search preset recovery audit is optional browser-local evidence.
  }
}

function readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
  try {
    const raw = window.localStorage.getItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed =
      parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        raw
      );
    return parsed.ok ? parsed.audit.entries : [];
  } catch {
    return [];
  }
}

function writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  try {
    window.localStorage.setItem(
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
      serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        entries
      )
    );
  } catch {
    // Receipt preset-repair search preset recovery audit is optional browser-local evidence.
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
  const [recoveryAuditRepairSearchPresetRecoveryAudit, setRecoveryAuditRepairSearchPresetRecoveryAudit] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[]>([]);
  const [recoveryAuditRepairSearchPresetRecoveryAuditAgeFilter, setRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter>("all");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearch, setRecoveryAuditRepairSearchPresetRecoveryAuditSearch] =
    useState("");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch, setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [renewalHistoryPresetRecoveryAudit, setRenewalHistoryPresetRecoveryAudit] =
    useState<InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[]>([]);
  const [renewalHistoryPresetRecoveryAuditAgeFilter, setRenewalHistoryPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryRenewalSearchPresetRecoveryAuditAgeFilter>("all");
  const [renewalHistoryPresetRecoveryAuditSearch, setRenewalHistoryPresetRecoveryAuditSearch] =
    useState("");
  const [renewalHistoryPresetRecoveryAuditSearchPresetId, setRenewalHistoryPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [renewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice, setRenewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [renewalRecoveryAuditSearchPresetRecoveryAudit, setRenewalRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [renewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setRenewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearch, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [receiptPresetRecoveryAuditSearchPresetId, setReceiptPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceReceiptPresetRecoveryAuditSearchPresetId | null>("all");
  const [receiptPresetRecoveryAuditSearchPresetRecoveryNotice, setReceiptPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [receiptRecoveryAuditSearchPresetRecoveryAudit, setReceiptRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [receiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearch, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice] =
    useState<string | null>(null);
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]>([]);
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter>("all");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch] =
    useState("");
  const [receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId, setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId] =
    useState<InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId | null>("all");

  useEffect(() => {
    const existingNewestRepairPresetRecoveryAudit =
      readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit();
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      existingNewestRepairPresetRecoveryAudit
    );

    const newestRepairRecovery =
      readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
    const persistedNewestRepairPreset =
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        newestRepairRecovery.presetId
      );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      persistedNewestRepairPreset.ageFilter
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      persistedNewestRepairPreset.query
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      persistedNewestRepairPreset.id
    );
    if (newestRepairRecovery.recovered) {
      writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
        newestRepairRecovery.presetId
      );
      setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
        newestRepairRecovery.reason
      );

      const repairAuditEntry =
        createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "repair-newest-recovery-" + Date.now().toString(36),
          requestedPresetId: newestRepairRecovery.requestedPresetId,
          recoveredPresetId: newestRepairRecovery.presetId,
          reason: newestRepairRecovery.reason ?? "Recovered unsupported newest repair recovery preset."
        });
      const nextRepairAudit =
        prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          existingNewestRepairPresetRecoveryAudit,
          repairAuditEntry
        );
      writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        nextRepairAudit
      );
      setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        nextRepairAudit
      );
    }

    const existingNewestRenewalPresetRecoveryAudit =
      readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit();
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      existingNewestRenewalPresetRecoveryAudit
    );

    const newestRenewalRecovery =
      readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery();
    const persistedNewestRenewalPreset =
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        newestRenewalRecovery.presetId
      );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      persistedNewestRenewalPreset.ageFilter
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      persistedNewestRenewalPreset.query
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      persistedNewestRenewalPreset.id
    );
    if (newestRenewalRecovery.recovered) {
      writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
        newestRenewalRecovery.presetId
      );
      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
        newestRenewalRecovery.reason
      );

      const renewalAuditEntry =
        createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "renewal-newest-recovery-" + Date.now().toString(36),
          requestedPresetId: newestRenewalRecovery.requestedPresetId,
          recoveredPresetId: newestRenewalRecovery.presetId,
          reason: newestRenewalRecovery.reason ?? "Recovered unsupported newest renewal recovery preset."
        });
      const nextRenewalAudit =
        prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          existingNewestRenewalPresetRecoveryAudit,
          renewalAuditEntry
        );
      writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        nextRenewalAudit
      );
      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        nextRenewalAudit
      );
    }

    const existingNewestReceiptPresetRecoveryAudit =
      readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit();
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      existingNewestReceiptPresetRecoveryAudit
    );

    const newestReceiptRecovery =
      readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
    const persistedNewestReceiptRecoveryPreset =
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        newestReceiptRecovery.presetId
      );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      persistedNewestReceiptRecoveryPreset.ageFilter
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      persistedNewestReceiptRecoveryPreset.query
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      persistedNewestReceiptRecoveryPreset.id
    );
    if (newestReceiptRecovery.recovered) {
      writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
        newestReceiptRecovery.presetId
      );
      setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
        newestReceiptRecovery.reason
      );

      const auditEntry =
        createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "receipt-newest-recovery-" + Date.now().toString(36),
          requestedPresetId: newestReceiptRecovery.requestedPresetId,
          recoveredPresetId: newestReceiptRecovery.presetId,
          reason: newestReceiptRecovery.reason ?? "Recovered unsupported newest receipt recovery preset."
        });
      const nextAudit =
        prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          existingNewestReceiptPresetRecoveryAudit,
          auditEntry
        );
      writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        nextAudit
      );
      setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        nextAudit
      );
    }
  }, []);  useEffect(() => {
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
    const recoveryAuditRepairRecoverySearchPresetRecovery =
      readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecovery();
    const persistedRecoveryAuditRepairRecoverySearchPreset =
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById(
        recoveryAuditRepairRecoverySearchPresetRecovery.presetId
      );
    const receiptRecoveryAuditSearchPresetRecovery =
      readReceiptPresetRecoveryAuditSearchPresetRecovery();
    const renewalRecoveryAuditSearchPresetRecovery =
      readRenewalRecoveryAuditSearchPresetRecovery();
    const persistedRenewalRecoveryAuditSearchPreset =
      interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById(
        renewalRecoveryAuditSearchPresetRecovery.presetId
      );
    const persistedReceiptRecoveryAuditSearchPreset =
      interfaceReceiptPresetRecoveryAuditSearchPresetById(
        receiptRecoveryAuditSearchPresetRecovery.presetId
      );
    const renewalRecoveryAuditRepairSearchPresetRecovery =
      readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery();
    const persistedRenewalRecoveryAuditRepairSearchPreset =
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById(
        renewalRecoveryAuditRepairSearchPresetRecovery.presetId
      );
    const receiptRepairAuditSearchPresetRecovery =
      readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery();
    const persistedReceiptRepairAuditSearchPreset =
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        receiptRepairAuditSearchPresetRecovery.presetId
      );
    const repairSearchPresetRecoveryAuditSearchPresetRecovery =
      readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery();
    const persistedRepairSearchPresetRecoveryAuditSearchPreset =
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        repairSearchPresetRecoveryAuditSearchPresetRecovery.presetId
      );
    const receiptSearchPresetRecoveryAuditSearchPresetRecovery =
      readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery();
    const persistedReceiptSearchPresetRecoveryAuditSearchPreset =
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        receiptSearchPresetRecoveryAuditSearchPresetRecovery.presetId
      );
    const renewalSearchPresetRecoveryAuditSearchPresetRecovery =
      readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery();
    const persistedRenewalSearchPresetRecoveryAuditSearchPreset =
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        renewalSearchPresetRecoveryAuditSearchPresetRecovery.presetId
      );
    let receiptHistory = readImportReconciliationReceiptHistory();
    let recoveryAudit = readFavoriteViewRecoveryAudit();
    let receiptRecoveryAudit = readReceiptPresetRecoveryAudit();
    let recoveryAuditRecoveryAudit = readRecoveryAuditPresetRecoveryAudit();
    let repairSearchPresetRecoveryAudit =
      readRecoveryAuditRepairSearchPresetRecoveryAudit();
    let repairSearchPresetRecoveryAuditSearchPresetRecoveryAudit =
      readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit();
    let repairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit =
      readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit();
    let renewalPresetRecoveryAudit =
      readRecoveryRenewalSearchPresetRecoveryAudit();
    let renewalRecoveryAuditPresetRecoveryAudit =
      readRenewalRecoveryAuditSearchPresetRecoveryAudit();
    let renewalRecoveryAuditRepairSearchPresetRecoveryAudit =
      readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit();
    let renewalSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit =
      readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit();
    let receiptRecoveryAuditPresetRecoveryAudit =
      readReceiptRecoveryAuditSearchPresetRecoveryAudit();
    let receiptRepairAuditSearchPresetRecoveryAudit =
      readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit();
    let receiptSearchPresetRecoveryAuditSearchPresetRecoveryAudit =
      readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit();

    if (renewalSearchPresetRecoveryAuditSearchPresetRecovery.recovered) {
      writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
        renewalSearchPresetRecoveryAuditSearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "renewal-search-preset-recovery-audit-search-preset-recovery-" +
                Date.now().toString(36),
          requestedPresetId:
            renewalSearchPresetRecoveryAuditSearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            renewalSearchPresetRecoveryAuditSearchPresetRecovery.presetId,
          reason:
            renewalSearchPresetRecoveryAuditSearchPresetRecovery.reason ??
            "Renewal search-preset recovery audit search preset recovered."
        });
      renewalSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit =
        prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          renewalSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
          recoveryEntry
        );
      writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    }

    if (repairSearchPresetRecoveryAuditSearchPresetRecovery.recovered) {
      writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
        repairSearchPresetRecoveryAuditSearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "repair-search-preset-recovery-audit-search-preset-recovery-" +
                Date.now().toString(36),
          requestedPresetId:
            repairSearchPresetRecoveryAuditSearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            repairSearchPresetRecoveryAuditSearchPresetRecovery.presetId,
          reason:
            repairSearchPresetRecoveryAuditSearchPresetRecovery.reason ??
            "Repair search-preset recovery audit search preset recovered."
        });
      repairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit =
        prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          repairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
          recoveryEntry
        );
      writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    }

    if (receiptSearchPresetRecoveryAuditSearchPresetRecovery.recovered) {
      writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
        receiptSearchPresetRecoveryAuditSearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "receipt-search-preset-recovery-audit-search-preset-recovery-" +
                Date.now().toString(36),
          requestedPresetId:
            receiptSearchPresetRecoveryAuditSearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            receiptSearchPresetRecoveryAuditSearchPresetRecovery.presetId,
          reason:
            receiptSearchPresetRecoveryAuditSearchPresetRecovery.reason ??
            "Receipt search-preset recovery audit search preset recovered."
        });
      receiptSearchPresetRecoveryAuditSearchPresetRecoveryAudit =
        prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          receiptSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
          recoveryEntry
        );
      writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    }

    if (renewalRecoveryAuditRepairSearchPresetRecovery.recovered) {
      writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
        renewalRecoveryAuditRepairSearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "renewal-repair-audit-search-preset-recovery-" +
                Date.now().toString(36),
          requestedPresetId:
            renewalRecoveryAuditRepairSearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            renewalRecoveryAuditRepairSearchPresetRecovery.presetId,
          reason:
            renewalRecoveryAuditRepairSearchPresetRecovery.reason ??
            "Renewal preset-recovery audit search preset recovered."
        });
      renewalRecoveryAuditRepairSearchPresetRecoveryAudit =
        prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          renewalRecoveryAuditRepairSearchPresetRecoveryAudit,
          recoveryEntry
        );
      writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditRepairSearchPresetRecoveryAudit
      );
    }

    if (recoveryAuditRepairRecoverySearchPresetRecovery.recovered) {
      writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset(
        recoveryAuditRepairRecoverySearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "repair-audit-search-preset-recovery-" +
                Date.now().toString(36),
          requestedPresetId:
            recoveryAuditRepairRecoverySearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            recoveryAuditRepairRecoverySearchPresetRecovery.presetId,
          reason:
            recoveryAuditRepairRecoverySearchPresetRecovery.reason ??
            "Repair-preset recovery audit search preset recovered."
        });
      repairSearchPresetRecoveryAuditSearchPresetRecoveryAudit =
        prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          repairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
          recoveryEntry
        );
      writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    }

    if (recoveryAuditRepairSearchPresetRecovery.recovered) {
      writeRecoveryAuditPresetRecoveryAuditSearchPreset(
        recoveryAuditRepairSearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "repair-search-preset-recovery-" + Date.now().toString(36),
          requestedPresetId:
            recoveryAuditRepairSearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            recoveryAuditRepairSearchPresetRecovery.presetId,
          reason:
            recoveryAuditRepairSearchPresetRecovery.reason ??
            "Recovery-audit repair search preset recovered."
        });
      repairSearchPresetRecoveryAudit =
        prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry(
          repairSearchPresetRecoveryAudit,
          recoveryEntry
        );
      writeRecoveryAuditRepairSearchPresetRecoveryAudit(
        repairSearchPresetRecoveryAudit
      );
    }

    if (renewalRecoveryAuditSearchPresetRecovery.recovered) {
      writeRenewalRecoveryAuditSearchPreset(
        renewalRecoveryAuditSearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "renewal-recovery-audit-preset-recovery-" +
                Date.now().toString(36),
          requestedPresetId:
            renewalRecoveryAuditSearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            renewalRecoveryAuditSearchPresetRecovery.presetId,
          reason:
            renewalRecoveryAuditSearchPresetRecovery.reason ??
            "Renewal recovery audit search preset recovered."
        });
      renewalRecoveryAuditPresetRecoveryAudit =
        prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry(
          renewalRecoveryAuditPresetRecoveryAudit,
          recoveryEntry
        );
      writeRenewalRecoveryAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditPresetRecoveryAudit
      );
    }

    if (receiptRepairAuditSearchPresetRecovery.recovered) {
      writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
        receiptRepairAuditSearchPresetRecovery.presetId
      );
      const recoveryEntry =
        createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
          auditId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : "receipt-repair-search-preset-recovery-" +
                Date.now().toString(36),
          requestedPresetId:
            receiptRepairAuditSearchPresetRecovery.requestedPresetId,
          recoveredPresetId:
            receiptRepairAuditSearchPresetRecovery.presetId,
          reason:
            receiptRepairAuditSearchPresetRecovery.reason ??
            "Receipt preset-repair audit search preset recovered."
        });
      receiptRepairAuditSearchPresetRecoveryAudit =
        prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
          receiptRepairAuditSearchPresetRecoveryAudit,
          recoveryEntry
        );
      writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptRepairAuditSearchPresetRecoveryAudit
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
    setReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      persistedReceiptRepairAuditSearchPreset.ageFilter
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearch(
      persistedReceiptRepairAuditSearchPreset.query
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      persistedReceiptRepairAuditSearchPreset.id
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
      receiptRepairAuditSearchPresetRecovery.reason
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      receiptRepairAuditSearchPresetRecoveryAudit
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      persistedReceiptSearchPresetRecoveryAuditSearchPreset.ageFilter
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      persistedReceiptSearchPresetRecoveryAuditSearchPreset.query
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      persistedReceiptSearchPresetRecoveryAuditSearchPreset.id
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
      receiptSearchPresetRecoveryAuditSearchPresetRecovery.reason
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      receiptSearchPresetRecoveryAuditSearchPresetRecoveryAudit
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
    setRecoveryAuditRepairSearchPresetRecoveryAudit(
      repairSearchPresetRecoveryAudit
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter(
      persistedRecoveryAuditRepairRecoverySearchPreset.ageFilter
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearch(
      persistedRecoveryAuditRepairRecoverySearchPreset.query
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
      persistedRecoveryAuditRepairRecoverySearchPreset.id
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
      recoveryAuditRepairRecoverySearchPresetRecovery.reason
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      repairSearchPresetRecoveryAuditSearchPresetRecoveryAudit
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      persistedRepairSearchPresetRecoveryAuditSearchPreset.ageFilter
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      persistedRepairSearchPresetRecoveryAuditSearchPreset.query
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      persistedRepairSearchPresetRecoveryAuditSearchPreset.id
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
      repairSearchPresetRecoveryAuditSearchPresetRecovery.reason
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      repairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
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
    setRenewalHistoryPresetRecoveryAuditAgeFilter(
      persistedRenewalRecoveryAuditSearchPreset.ageFilter
    );
    setRenewalHistoryPresetRecoveryAuditSearch(
      persistedRenewalRecoveryAuditSearchPreset.query
    );
    setRenewalHistoryPresetRecoveryAuditSearchPresetId(
      persistedRenewalRecoveryAuditSearchPreset.id
    );
    setRenewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice(
      renewalRecoveryAuditSearchPresetRecovery.reason
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAudit(
      renewalRecoveryAuditPresetRecoveryAudit
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      persistedRenewalRecoveryAuditRepairSearchPreset.ageFilter
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearch(
      persistedRenewalRecoveryAuditRepairSearchPreset.query
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      persistedRenewalRecoveryAuditRepairSearchPreset.id
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
      renewalRecoveryAuditRepairSearchPresetRecovery.reason
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      renewalRecoveryAuditRepairSearchPresetRecoveryAudit
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      persistedRenewalSearchPresetRecoveryAuditSearchPreset.ageFilter
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      persistedRenewalSearchPresetRecoveryAuditSearchPreset.query
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      persistedRenewalSearchPresetRecoveryAuditSearchPreset.id
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(
      renewalSearchPresetRecoveryAuditSearchPresetRecovery.reason
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      renewalSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
    );
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
  const filteredRecoveryAuditRepairSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
        recoveryAuditRepairSearchPresetRecoveryAudit,
        recoveryAuditRepairSearchPresetRecoveryAuditAgeFilter
      ),
    [
      recoveryAuditRepairSearchPresetRecoveryAudit,
      recoveryAuditRepairSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRecoveryAuditRepairSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
        filteredRecoveryAuditRepairSearchPresetRecoveryAudit,
        recoveryAuditRepairSearchPresetRecoveryAuditSearch
      ),
    [
      filteredRecoveryAuditRepairSearchPresetRecoveryAudit,
      recoveryAuditRepairSearchPresetRecoveryAuditSearch
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
  const filteredRenewalRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditSearchPresetRecoveryAudit,
        renewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      renewalRecoveryAuditSearchPresetRecoveryAudit,
      renewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRenewalRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
        filteredRenewalRecoveryAuditSearchPresetRecoveryAudit,
        renewalRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredRenewalRecoveryAuditSearchPresetRecoveryAudit,
      renewalRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
  );
  const filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
  );
  const filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
  );
  const filteredRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        filteredRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
  );
  const filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
  );
    const filteredRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        filteredRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
  );
  const filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
  );
  const filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
  );
  const filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
      receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch
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
  const filteredReceiptRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditSearchPresetRecoveryAudit,
        receiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter
      ),
    [
      receiptRecoveryAuditSearchPresetRecoveryAudit,
      receiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter
    ]
  );
  const searchedReceiptRecoveryAuditSearchPresetRecoveryAudit = useMemo(
    () =>
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
        filteredReceiptRecoveryAuditSearchPresetRecoveryAudit,
        receiptRecoveryAuditSearchPresetRecoveryAuditSearch
      ),
    [
      filteredReceiptRecoveryAuditSearchPresetRecoveryAudit,
      receiptRecoveryAuditSearchPresetRecoveryAuditSearch
    ]
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

  function applyRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById(id);
    setRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter(preset.ageFilter);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearch(preset.query);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(preset.id);
    writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset(preset.id);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Repair-preset recovery audit preset “" + preset.label + "” applied."
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
    writeRenewalRecoveryAuditSearchPreset(preset.id);
    setRenewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Renewal recovery audit preset “" + preset.label + "” applied."
    );
  }

  function applyRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById(id);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter(preset.ageFilter);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearch(preset.query);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(preset.id);
    writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Renewal preset-recovery audit preset “" + preset.label + "” applied and saved locally."
    );
  }

  function applyRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        id
      );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      preset.ageFilter
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      preset.query
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      preset.id
    );
    writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
      preset.id
    );
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Repair search-preset recovery audit preset “" + preset.label + "” applied and saved locally."
    );
  }

  function applyRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        id
      );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      preset.ageFilter
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      preset.query
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      preset.id
    );
    writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
      preset.id
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Renewal search-preset recovery audit preset “" + preset.label + "” applied and saved locally."
    );
  }

  function applyRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(id);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(preset.ageFilter);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(preset.query);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(preset.id);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
      preset.id
    );
    setImportError(null);
    setPortabilityStatus("Newest repair recovery preset “" + preset.label + "” applied.");
  }

  function applyRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        id
      );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      preset.ageFilter
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      preset.query
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      preset.id
    );
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
      preset.id
    );
    setImportError(null);
    setPortabilityStatus(
      "Newest renewal recovery preset “" + preset.label + "” applied and saved locally."
    );
  }

  function applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        id
      );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      preset.ageFilter
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      preset.query
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      preset.id
    );
    setImportError(null);
    setPortabilityStatus(
      "Newest receipt recovery view “" + preset.label + "” applied."
    );
  }

  function applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        id
      );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      preset.ageFilter
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      preset.query
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      preset.id
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
      preset.id
    );
    setImportError(null);
    setPortabilityStatus(
      "Receipt search-preset recovery audit search preset recovery audit preset “" +
        preset.label +
        "” applied and saved locally."
    );
  }

  function applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        id
      );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
      preset.ageFilter
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
      preset.query
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      preset.id
    );
    writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
      preset.id
    );
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Receipt search-preset recovery audit preset “" + preset.label + "” applied and saved locally."
    );
  }

  function applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset(
    id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
  ) {
    const preset =
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(id);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter(preset.ageFilter);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearch(preset.query);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(preset.id);
    writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setImportError(null);
    setPortabilityStatus(
      "Receipt preset-repair audit preset “" + preset.label + "” applied."
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

  function exportRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-repair-search-preset-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Repair search-preset recovery audit search preset recovery audit exported."
    );
  }

  function clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Deep repair recovery evidence is optional browser-local state.
    }
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setImportError(null);
    setPortabilityStatus(
      "Repair search-preset recovery audit search preset recovery audit cleared."
    );
  }

  function exportRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-repair-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Repair-preset recovery audit search preset recovery audit exported."
    );
  }

  function clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Repair-preset recovery audit search preset recovery audit is optional browser-local evidence.
    }
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus(
      "Repair-preset recovery audit search preset recovery audit cleared."
    );
  }

  function exportRecoveryAuditRepairSearchPresetRecoveryAudit() {
    if (!recoveryAuditRepairSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
        recoveryAuditRepairSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-recovery-audit-repair-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Recovery-audit repair search preset recovery audit exported."
    );
  }

  function clearRecoveryAuditRepairSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
    } catch {
      // Repair-search-preset recovery audit is optional browser-local evidence.
    }
    setRecoveryAuditRepairSearchPresetRecoveryAudit([]);
    setRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearch("");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus(
      "Recovery-audit repair search preset recovery audit cleared."
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

  function exportRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Newest repair preset recovery audit exported.");
  }

  function clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Newest repair preset recovery audit is optional browser-local evidence.
    }
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setImportError(null);
    setPortabilityStatus("Newest repair preset recovery audit cleared.");
  }

  function exportRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Newest renewal preset recovery audit exported.");
  }

  function clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Newest renewal preset recovery audit is optional browser-local evidence.
    }
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setImportError(null);
    setPortabilityStatus("Newest renewal preset recovery audit cleared.");
  }

  function exportReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-receipt-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus("Newest receipt preset recovery audit exported.");
  }

  function clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Newest receipt preset recovery audit is optional browser-local evidence.
    }
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setImportError(null);
    setPortabilityStatus("Newest receipt preset recovery audit cleared.");
  }

  function exportReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-receipt-search-preset-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Receipt search-preset recovery audit search preset recovery audit exported."
    );
  }

  function clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Receipt search-preset recovery audit search preset recovery audit is optional browser-local evidence.
    }
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus(
      "Receipt search-preset recovery audit search preset recovery audit cleared."
    );
  }

  function exportReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-receipt-repair-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Receipt preset-repair audit search preset recovery audit exported."
    );
  }

  function clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Receipt preset-repair audit search preset recovery audit is optional browser-local evidence.
    }
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus(
      "Receipt preset-repair audit search preset recovery audit cleared."
    );
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
    setReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
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

  function exportRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-renewal-search-preset-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Renewal search-preset recovery audit search preset recovery audit exported."
    );
  }

  function clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Deep renewal recovery evidence is optional browser-local state.
    }
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus(
      "Renewal search-preset recovery audit search preset recovery audit cleared."
    );
  }

  function exportRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    if (!renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-renewal-repair-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Renewal preset-recovery audit search preset recovery audit exported."
    );
  }

  function clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Renewal preset-recovery audit search preset recovery audit is optional browser-local evidence.
    }
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus(
      "Renewal preset-recovery audit search preset recovery audit cleared."
    );
  }

  function exportRenewalRecoveryAuditSearchPresetRecoveryAudit() {
    if (!renewalRecoveryAuditSearchPresetRecoveryAudit.length) return;
    const payload =
      serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
        renewalRecoveryAuditSearchPresetRecoveryAudit
      );
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "ai-data-platform-renewal-recovery-audit-search-preset-recovery-audit.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Renewal recovery audit search preset recovery audit exported."
    );
  }

  function clearRenewalRecoveryAuditSearchPresetRecoveryAudit() {
    try {
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
    } catch {
      // Renewal recovery-audit search preset recovery evidence is optional browser-local state.
    }
    setRenewalRecoveryAuditSearchPresetRecoveryAudit([]);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
    setImportError(null);
    setPortabilityStatus(
      "Renewal recovery audit search preset recovery audit cleared."
    );
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
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
    } catch {
      // Renewal search preset recovery audit is optional browser-local evidence.
    }
    setRenewalHistoryPresetRecoveryAudit([]);
    setRenewalHistoryPresetRecoveryAuditAgeFilter("all");
    setRenewalHistoryPresetRecoveryAuditSearch("");
    setRenewalHistoryPresetRecoveryAuditSearchPresetId("all");
    setRenewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    clearRenewalRecoveryAuditSearchPreset();
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
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
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
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY
      );
      window.localStorage.removeItem(
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY
      );
    } catch {
      // Browser-local state is optional.
    }

    setRecoveryAuditPresetRecoveryAuditSearchPresetId("all");
    setRecoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setRecoveryAuditRepairSearchPresetRecoveryAudit([]);
    setRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearch("");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setRenewalHistoryPresetRecoveryAuditAgeFilter("all");
    setRenewalHistoryPresetRecoveryAuditSearch("");
    setRenewalHistoryPresetRecoveryAuditSearchPresetId("all");
    setRenewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setRenewalRecoveryAuditSearchPresetRecoveryAudit([]);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setReceiptPresetRecoveryAuditSearchPresetId("all");
    setReceiptPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setReceiptRecoveryAuditSearchPresetRecoveryAudit([]);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit([]);
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter("all");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch("");
    setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("all");
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
                <p className="eyebrow">Build 182 · Repair preset persistence, renewal recovery search & receipt preset recovery</p>
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

                {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                  <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Newest repair search-preset recovery audit</strong>
                        <span>
                          {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                    </div>
                    <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters">
                      <label>
                        <span>Newest repair recovery age</span>
                        <select
                          value={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                          onChange={(event) =>
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                            )
                          }
                        >
                          <option value="all">All search preset recoveries</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch">
                        <span>Search newest repair recoveries</span>
                        <input
                          type="search"
                          value={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch}
                          onChange={(event) =>
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            )
                          }
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search newest repair preset recovery audit evidence"
                        />
                      </label>
                      <span>
                        Showing {searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                    </div>
                    <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditList">
                      {searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
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
                      <button type="button" onClick={exportRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Export search preset recovery audit
                      </button>
                      <button type="button" onClick={clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Clear search preset recovery audit
                      </button>
                    </div>
                  </div>
                ) : null}

                {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                  <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Repair search-preset recovery audit search preset recovery audit</strong>
                        <span>
                          {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                    </div>
                    {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                      <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery" role="status">
                        <strong>Repair search-preset recovery audit search preset recovery audit search preset recovered</strong>
                        <span>{recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                        <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery" inline />
                      </div>
                    ) : null}
                    <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Repair search-preset recovery audit search preset recovery audit search presets</strong>
                          <span>Apply a deterministic newest repair recovery view without changing retained evidence.</span>
                        </div>
                        <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Newest repair recovery audit search presets">
                        {INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters">
                      <label>
                        <span>Recovery age</span>
                        <select
                          value={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                          onChange={(event) => {
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                            );
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                          }}
                        >
                          <option value="all">All search preset recoveries</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch">
                        <span>Search recoveries</span>
                        <input
                          type="search"
                          value={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch}
                          onChange={(event) => {
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            );
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                            clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                          }}
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search repair search-preset recovery audit search preset recovery evidence"
                        />
                      </label>
                      <span>
                        Showing {searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search" inline />
                    </div>
                    <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditList">
                      {searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
                        <article key={entry.auditId}>
                          <div>
                            <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <small>{entry.reason}</small>
                        </article>
                      ))}
                      {!searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                        <p>No repair search-preset recovery audit search preset recoveries match the selected age filter and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Export search preset recovery audit
                      </button>
                      <button type="button" onClick={clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Clear search preset recovery audit
                      </button>
                    </div>
                  </div>
                ) : null}

                {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                  <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Repair-preset recovery audit search preset recovery audit</strong>
                        <span>
                          {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                    </div>
                    {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                      <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecovery" role="status">
                        <strong>Repair search-preset recovery audit search preset recovered</strong>
                        <span>{recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                        <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery" inline />
                      </div>
                    ) : null}
                    <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Repair search-preset recovery audit search presets</strong>
                          <span>Apply a common repair search-preset recovery evidence view; the selected preset persists in this browser.</span>
                        </div>
                        <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Repair search-preset recovery audit search presets">
                        {INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditFilters">
                      <label>
                        <span>Recovery age</span>
                        <select
                          value={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                          onChange={(event) => {
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                            );
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                          }}
                        >
                          <option value="all">All search preset recoveries</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearch">
                        <span>Search recoveries</span>
                        <input
                          type="search"
                          value={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch}
                          onChange={(event) => {
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            );
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                          }}
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search repair-preset recovery audit search preset recovery evidence"
                        />
                      </label>
                      <span>
                        Showing {searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search" inline />
                    </div>
                    <div className="interfaceRecoveryAuditRepairSearchPresetRecoveryAuditList">
                      {searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
                        <article key={entry.auditId}>
                          <div>
                            <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <small>{entry.reason}</small>
                        </article>
                      ))}
                      {!searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                        <p>No repair-preset search preset recoveries match the selected age filter and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Export search preset recovery audit
                      </button>
                      <button type="button" onClick={clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Clear search preset recovery audit
                      </button>
                    </div>
                  </div>
                ) : null}

                {recoveryAuditRepairSearchPresetRecoveryAudit.length ? (
                  <div className="interfaceRecoveryAuditRepairPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Recovery-audit repair preset recovery audit</strong>
                        <span>
                          {recoveryAuditRepairSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit" inline />
                    </div>
                    {recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                      <div className="interfaceRecoveryAuditRepairSearchPresetRecovery" role="status">
                        <strong>Repair-preset recovery audit search preset recovered</strong>
                        <span>{recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                        <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery" inline />
                      </div>
                    ) : null}
                    <div className="interfaceRecoveryAuditRepairPresetRecoveryAuditSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Repair-preset recovery audit search presets</strong>
                          <span>Apply a common repair-preset recovery evidence view without changing stored audit events.</span>
                        </div>
                        <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Repair-preset recovery audit search presets">
                        {INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceRecoveryAuditRepairPresetRecoveryAuditFilters">
                      <label>
                        <span>Recovery age</span>
                        <select
                          value={recoveryAuditRepairSearchPresetRecoveryAuditAgeFilter}
                          onChange={(event) => {
                            setRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter
                            );
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(null);
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset();
                          }}
                        >
                          <option value="all">All repair-preset recoveries</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceRecoveryAuditRepairPresetRecoveryAuditSearch">
                        <span>Search repair-preset recoveries</span>
                        <input
                          type="search"
                          value={recoveryAuditRepairSearchPresetRecoveryAuditSearch}
                          onChange={(event) => {
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            );
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(null);
                            setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset();
                          }}
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search recovery-audit repair preset recovery evidence"
                        />
                      </label>
                      <span>
                        Showing {searchedRecoveryAuditRepairSearchPresetRecoveryAudit.length} of {recoveryAuditRepairSearchPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-filtering" inline />
                      <HelpInfo topic="recovery-audit-recovery-search-preset-recovery-audit-search" inline />
                    </div>
                    <div className="interfaceRecoveryAuditRepairPresetRecoveryAuditList">
                      {searchedRecoveryAuditRepairSearchPresetRecoveryAudit.map((entry) => (
                        <article key={entry.auditId}>
                          <div>
                            <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <small>{entry.reason}</small>
                        </article>
                      ))}
                      {!searchedRecoveryAuditRepairSearchPresetRecoveryAudit.length ? (
                        <p>No repair-preset recovery events match the selected age filter and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportRecoveryAuditRepairSearchPresetRecoveryAudit}>
                        Export repair preset recovery audit
                      </button>
                      <button type="button" onClick={clearRecoveryAuditRepairSearchPresetRecoveryAudit}>
                        Clear repair preset recovery audit
                      </button>
                    </div>
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
                            setRecoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice(null);
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
                      {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                        <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit">
                          <div className="interfacePresetHeading">
                            <div>
                              <strong>Renewal search-preset recovery audit search preset recovery audit</strong>
                              <span>
                                {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                              </span>
                            </div>
                            <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                          </div>
                          {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                            <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery" role="status">
                              <strong>Newest renewal recovery preset recovered</strong>
                              <span>{renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                              <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery" inline />
                            </div>
                          ) : null}
                          <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets">
                            <div className="interfacePresetHeading">
                              <div>
                                <strong>Renewal search-preset recovery audit search preset recovery audit search presets</strong>
                                <span>Apply a deterministic newest renewal recovery view without changing retained evidence.</span>
                              </div>
                              <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                            </div>
                            <div role="group" aria-label="Newest renewal recovery audit search presets">
                              {INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                                <button
                                  type="button"
                                  key={preset.id}
                                  aria-pressed={renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                                  title={preset.description}
                                  onClick={() => applyRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters">
                            <label>
                              <span>Recovery age</span>
                              <select
                                value={renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                                onChange={(event) => {
                                  setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                                    event.currentTarget.value as InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                                  );
                                  setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                                  setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                  clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                                }}
                              >
                                <option value="all">All preset recoveries</option>
                                <option value="24h">Last 24 hours</option>
                                <option value="7d">Last 7 days</option>
                              </select>
                            </label>
                            <label className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch">
                              <span>Search preset recoveries</span>
                              <input
                                type="search"
                                value={renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch}
                                onChange={(event) => {
                                  setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
                                    event.currentTarget.value
                                  );
                                  setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                                }}
                                placeholder="Audit ID, requested preset, reason…"
                                aria-label="Search newest renewal recovery audit evidence"
                              />
                            </label>
                            <span>
                              Showing {searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length}
                            </span>
                            <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search" inline />
                            <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                          </div>
                          <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditList">
                            {searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
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
                            <button type="button" onClick={exportRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                              Export search preset recovery audit
                            </button>
                            <button type="button" onClick={clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                              Clear search preset recovery audit
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                        <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit">
                          <div className="interfacePresetHeading">
                            <div>
                              <strong>Newest renewal search-preset recovery audit evidence</strong>
                              <span>
                                {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                              </span>
                            </div>
                            <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                          </div>
                          <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditList">
                            {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
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
                            <button type="button" onClick={exportRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                              Export search preset recovery audit
                            </button>
                            <button type="button" onClick={clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                              Clear search preset recovery audit
                            </button>
                          </div>
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
                          {renewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                            <div className="interfaceRenewalRecoveryAuditPresetRecovery" role="status">
                              <strong>Renewal recovery audit preset recovered</strong>
                              <span>{renewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                              <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery" inline />
                            </div>
                          ) : null}
                          {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                            <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAudit">
                              <div className="interfacePresetHeading">
                                <div>
                                  <strong>Renewal preset-recovery audit search preset recovery audit</strong>
                                  <span>
                                    {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                                  </span>
                                </div>
                                <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                              </div>
                              {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                                <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery" role="status">
                                  <strong>Renewal search-preset recovery audit search preset recovered</strong>
                                  <span>{renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                                  <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery" inline />
                                </div>
                              ) : null}
                              <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresets">
                                <div className="interfacePresetHeading">
                                  <div>
                                    <strong>Renewal search-preset recovery audit search presets</strong>
                                    <span>Apply a common renewal search-preset recovery evidence view without changing retained audit events.</span>
                                  </div>
                                  <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                                </div>
                                <div role="group" aria-label="Renewal search-preset recovery audit search presets">
                                  {INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                                    <button
                                      type="button"
                                      key={preset.id}
                                      aria-pressed={renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                                      title={preset.description}
                                      onClick={() => applyRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditFilters">
                                <label>
                                  <span>Recovery age</span>
                                  <select
                                    value={renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                                    onChange={(event) => {
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                                        event.currentTarget.value as InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                                      );
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                      clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                                    }}
                                  >
                                    <option value="all">All preset recoveries</option>
                                    <option value="24h">Last 24 hours</option>
                                    <option value="7d">Last 7 days</option>
                                  </select>
                                </label>
                                <label className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearch">
                                  <span>Search preset recoveries</span>
                                  <input
                                    type="search"
                                    value={renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch}
                                    onChange={(event) => {
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
                                        event.currentTarget.value
                                      );
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                      clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                                    }}
                                    placeholder="Audit ID, requested preset, reason…"
                                    aria-label="Search renewal preset-recovery audit search preset repair evidence"
                                  />
                                </label>
                                <span>
                                  Showing {searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length}
                                </span>
                                <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                                <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search" inline />
                              </div>
                              <div className="interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditList">
                                {searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
                                  <article key={entry.auditId}>
                                    <div>
                                      <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                                    </div>
                                    <small>{entry.reason}</small>
                                  </article>
                                ))}
                                {!searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                                  <p>No renewal preset-recovery audit search preset repairs match the selected age filter and search.</p>
                                ) : null}
                              </div>
                              <div className="interfaceImportPreviewActions">
                                <button type="button" onClick={exportRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                                  Export search preset recovery audit
                                </button>
                                <button type="button" onClick={clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                                  Clear search preset recovery audit
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {renewalRecoveryAuditSearchPresetRecoveryAudit.length ? (
                            <div className="interfaceRenewalRecoveryAuditPresetRecoveryAudit">
                              <div className="interfacePresetHeading">
                                <div>
                                  <strong>Renewal recovery audit preset recovery audit</strong>
                                  <span>
                                    {renewalRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                                  </span>
                                </div>
                                <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                              </div>
                              {renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                                <div className="interfaceRenewalRecoveryAuditSearchPresetRecovery" role="status">
                                  <strong>Renewal preset-recovery audit search preset recovered</strong>
                                  <span>{renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                                  <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery" inline />
                                </div>
                              ) : null}
                              <div className="interfaceRenewalRecoveryAuditPresetRecoveryAuditSearchPresets">
                                <div className="interfacePresetHeading">
                                  <div>
                                    <strong>Renewal preset-recovery audit search presets</strong>
                                    <span>Apply a common renewal preset-recovery evidence view; the selected preset persists in this browser.</span>
                                  </div>
                                  <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                                </div>
                                <div role="group" aria-label="Renewal preset-recovery audit search presets">
                                  {INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                                    <button
                                      type="button"
                                      key={preset.id}
                                      aria-pressed={renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                                      title={preset.description}
                                      onClick={() => applyRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="interfaceRenewalRecoveryAuditPresetRecoveryAuditFilters">
                                <label>
                                  <span>Recovery age</span>
                                  <select
                                    value={renewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                                    onChange={(event) => {
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                                        event.currentTarget.value as InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditAgeFilter
                                      );
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                      clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                                    }}
                                  >
                                    <option value="all">All preset recoveries</option>
                                    <option value="24h">Last 24 hours</option>
                                    <option value="7d">Last 7 days</option>
                                  </select>
                                </label>
                                <label className="interfaceRenewalRecoveryAuditPresetRecoveryAuditSearch">
                                  <span>Search preset recoveries</span>
                                  <input
                                    type="search"
                                    value={renewalRecoveryAuditSearchPresetRecoveryAuditSearch}
                                    onChange={(event) => {
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearch(
                                        event.currentTarget.value
                                      );
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                                      setRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                      clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                                    }}
                                    placeholder="Audit ID, requested preset, reason…"
                                    aria-label="Search renewal recovery audit preset repair evidence"
                                  />
                                </label>
                                <span>
                                  Showing {searchedRenewalRecoveryAuditSearchPresetRecoveryAudit.length} of {renewalRecoveryAuditSearchPresetRecoveryAudit.length}
                                </span>
                                <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                                <HelpInfo topic="renewal-search-preset-recovery-audit-search-preset-recovery-audit-search" inline />
                              </div>
                              <div className="interfaceRenewalRecoveryAuditPresetRecoveryAuditList">
                                {searchedRenewalRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
                                  <article key={entry.auditId}>
                                    <div>
                                      <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                                    </div>
                                    <small>{entry.reason}</small>
                                  </article>
                                ))}
                                {!searchedRenewalRecoveryAuditSearchPresetRecoveryAudit.length ? (
                                  <p>No renewal recovery-audit preset repairs match the selected age filter and search.</p>
                                ) : null}
                              </div>
                              <div className="interfaceImportPreviewActions">
                                <button type="button" onClick={exportRenewalRecoveryAuditSearchPresetRecoveryAudit}>
                                  Export preset recovery audit
                                </button>
                                <button type="button" onClick={clearRenewalRecoveryAuditSearchPresetRecoveryAudit}>
                                  Clear preset recovery audit
                                </button>
                              </div>
                            </div>
                          ) : null}
                          <div className="interfaceRenewalPresetRecoveryAuditSearchPresets">
                            <div className="interfacePresetHeading">
                              <div>
                                <strong>Renewal recovery audit search presets</strong>
                                <span>Apply a common recovery-evidence view; the selected preset persists in this browser.</span>
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
                                  setRenewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                  clearRenewalRecoveryAuditSearchPreset();
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
                                  setRenewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                  clearRenewalRecoveryAuditSearchPreset();
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

                {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                  <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Newest receipt search-preset recovery audit</strong>
                        <span>
                          {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                    </div>
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Newest receipt recovery audit search presets</strong>
                          <span>Apply a deterministic age and search view without changing retained evidence.</span>
                        </div>
                        <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Newest receipt recovery audit search presets">
                        {INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters">
                      <label>
                        <span>Newest receipt recovery age</span>
                        <select
                          value={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                          onChange={(event) => {
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                            );
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                          }}
                        >
                          <option value="all">All search preset recoveries</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch">
                        <span>Search newest receipt recoveries</span>
                        <input
                          type="search"
                          value={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch}
                          onChange={(event) => {
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            );
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                          }}
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search newest receipt preset recovery audit evidence"
                        />
                      </label>
                      <span>
                        Showing {searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                    </div>
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditList">
                      {searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
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
                      <button type="button" onClick={exportReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Export search preset recovery audit
                      </button>
                      <button type="button" onClick={clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Clear search preset recovery audit
                      </button>
                    </div>
                  </div>
                ) : null}

                {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                  <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Receipt search-preset recovery audit search preset recovery audit</strong>
                        <span>
                          {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                    </div>
                    {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                      <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery" role="status">
                        <strong>Receipt search-preset recovery audit search preset recovery audit search preset recovered</strong>
                        <span>{receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                        <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery" inline />
                      </div>
                    ) : null}
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Receipt search-preset recovery audit search preset recovery audit search presets</strong>
                          <span>Apply a common receipt recovery evidence view without changing retained audit events.</span>
                        </div>
                        <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Receipt search-preset recovery audit search preset recovery audit search presets">
                        {INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters">
                      <label>
                        <span>Recovery age</span>
                        <select
                          value={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                          onChange={(event) => {
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                            );
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                          }}
                        >
                          <option value="all">All search preset recoveries</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch">
                        <span>Search recoveries</span>
                        <input
                          type="search"
                          value={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch}
                          onChange={(event) => {
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            );
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                          }}
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search receipt search-preset recovery audit search preset recovery evidence"
                        />
                      </label>
                      <span>
                        Showing {searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                      <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search" inline />
                    </div>
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditList">
                      {searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
                        <article key={entry.auditId}>
                          <div>
                            <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <small>{entry.reason}</small>
                        </article>
                      ))}
                      {!searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                        <p>No receipt search-preset recovery audit search preset recoveries match the selected age filter and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Export search preset recovery audit
                      </button>
                      <button type="button" onClick={clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Clear search preset recovery audit
                      </button>
                    </div>
                  </div>
                ) : null}

                {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                  <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAudit">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Receipt preset-repair audit search preset recovery audit</strong>
                        <span>
                          {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT} local recovery events retained
                        </span>
                      </div>
                      <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit" inline />
                    </div>
                    {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                      <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery" role="status">
                        <strong>Receipt search-preset recovery audit search preset recovered</strong>
                        <span>{receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                        <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery" inline />
                      </div>
                    ) : null}
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresets">
                      <div className="interfacePresetHeading">
                        <div>
                          <strong>Receipt search-preset recovery audit search presets</strong>
                          <span>Apply a common receipt search-preset recovery evidence view; the selected preset persists in this browser.</span>
                        </div>
                        <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                      </div>
                      <div role="group" aria-label="Receipt search-preset recovery audit search presets">
                        {INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            aria-pressed={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                            title={preset.description}
                            onClick={() => applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditFilters">
                      <label>
                        <span>Recovery age</span>
                        <select
                          value={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                          onChange={(event) => {
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                              event.currentTarget.value as InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                            );
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                          }}
                        >
                          <option value="all">All search preset recoveries</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                        </select>
                      </label>
                      <label className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearch">
                        <span>Search recoveries</span>
                        <input
                          type="search"
                          value={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch}
                          onChange={(event) => {
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch(
                              event.currentTarget.value
                            );
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                            setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                            clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                          }}
                          placeholder="Audit ID, requested preset, reason…"
                          aria-label="Search receipt preset-repair search preset recovery audit evidence"
                        />
                      </label>
                      <span>
                        Showing {searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length} of {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length}
                      </span>
                      <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering" inline />
                      <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search" inline />
                    </div>
                    <div className="interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditList">
                      {searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
                        <article key={entry.auditId}>
                          <div>
                            <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <small>{entry.reason}</small>
                        </article>
                      ))}
                      {!searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? (
                        <p>No receipt preset-repair search preset recoveries match the selected age filter and search.</p>
                      ) : null}
                    </div>
                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={exportReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Export search preset recovery audit
                      </button>
                      <button type="button" onClick={clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit}>
                        Clear search preset recovery audit
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
                        {receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice ? (
                          <div className="interfaceReceiptRecoveryAuditSearchPresetRecovery" role="status">
                            <strong>Receipt preset-repair audit search preset recovered</strong>
                            <span>{receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice}</span>
                            <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery" inline />
                          </div>
                        ) : null}
                        <div className="interfaceReceiptRecoveryAuditPresetRecoveryAuditSearchPresets">
                          <div className="interfacePresetHeading">
                            <div>
                              <strong>Receipt preset-repair audit search presets</strong>
                              <span>Apply a common receipt preset-repair evidence view; the selected preset persists in this browser.</span>
                            </div>
                            <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search-presets" inline />
                          </div>
                          <div role="group" aria-label="Receipt preset-repair audit search presets">
                            {INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map((preset) => (
                              <button
                                type="button"
                                key={preset.id}
                                aria-pressed={receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId === preset.id}
                                title={preset.description}
                                onClick={() => applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="interfaceReceiptRecoveryAuditPresetRecoveryAuditFilters">
                          <label>
                            <span>Recovery age</span>
                            <select
                              value={receiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter}
                              onChange={(event) => {
                                setReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter(
                                  event.currentTarget.value as InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter
                                );
                                setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                                setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                              }}
                            >
                              <option value="all">All preset repairs</option>
                              <option value="24h">Last 24 hours</option>
                              <option value="7d">Last 7 days</option>
                            </select>
                          </label>
                          <label className="interfaceReceiptRecoveryAuditPresetRecoveryAuditSearch">
                            <span>Search preset repairs</span>
                            <input
                              type="search"
                              value={receiptRecoveryAuditSearchPresetRecoveryAuditSearch}
                              onChange={(event) => {
                                setReceiptRecoveryAuditSearchPresetRecoveryAuditSearch(
                                  event.currentTarget.value
                                );
                                setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null);
                                setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice(null);
                                clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset();
                              }}
                              placeholder="Audit ID, requested preset, reason…"
                              aria-label="Search receipt recovery audit preset repair evidence"
                            />
                          </label>
                          <span>
                            Showing {searchedReceiptRecoveryAuditSearchPresetRecoveryAudit.length} of {receiptRecoveryAuditSearchPresetRecoveryAudit.length}
                          </span>
                          <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-filtering" inline />
                          <HelpInfo topic="receipt-recovery-audit-search-preset-recovery-audit-search" inline />
                        </div>
                        <div className="interfaceReceiptRecoveryAuditPresetRecoveryAuditList">
                          {searchedReceiptRecoveryAuditSearchPresetRecoveryAudit.map((entry) => (
                            <article key={entry.auditId}>
                              <div>
                                <strong>{entry.requestedPresetId || "Unknown preset"} → {entry.recoveredPresetId}</strong>
                                <span>{new Date(entry.createdAt).toLocaleString()}</span>
                              </div>
                              <small>{entry.reason}</small>
                            </article>
                          ))}
                          {!searchedReceiptRecoveryAuditSearchPresetRecoveryAudit.length ? (
                            <p>No receipt recovery-audit preset repairs match the selected age filter and search.</p>
                          ) : null}
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
              <span>Browser-local repair recovery audit search, renewal recovery audit evidence and receipt recovery search presets only · no server sync or workflow authority changes.</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
