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
  INTERFACE_NAMED_PROFILES_STORAGE_KEY,
  INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY,
  INTERFACE_PREFERENCE_BUNDLE_FORMAT,
  INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY,
  INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY,
  INTERFACE_PREFERENCE_PRESETS,
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_RECONCILED_EVENT,
  INTERFACE_PREFERENCES_STORAGE_KEY,
  INTERFACE_RESET_GOVERNANCE,
  MAX_NAMED_INTERFACE_PROFILES,
  analyzeInterfacePreferenceBundleImport,
  applyInterfacePreferencePreset,
  createInterfacePreferenceBundleImportReceipt,
  createNamedInterfacePreferenceProfile,
  defaultInterfacePreferences,
  diffInterfacePreferenceRecoverySnapshot,
  duplicateNamedInterfacePreferenceProfile,
  favoriteNamedInterfacePreferenceProfiles,
  filterNamedInterfacePreferenceProfiles,
  importedInterfacePreferenceProvenance,
  interfacePreferenceRecoverySnapshotFreshness,
  parseInterfacePreferenceBundle,
  parseInterfacePreferenceBundleImportReceipt,
  parseInterfacePreferenceRecoverySnapshot,
  planInterfacePreferenceBundleImportCapacity,
  matchingInterfacePreferencePreset,
  matchingNamedInterfacePreferenceProfile,
  namedInterfacePreferenceProvenanceLabel,
  parseInterfacePreferenceProfile,
  previewInterfacePreferenceProfile,
  recommendationPreferenceAllowsKind,
  reconcileInterfacePreferenceBundleImportOutcome,
  removeNamedInterfacePreferenceProfile,
  renameNamedInterfacePreferenceProfile,
  reorderNamedInterfacePreferenceProfile,
  resolveInterfacePreferenceBundleImport,
  selectInterfacePreferenceBundleProfiles,
  setNamedInterfacePreferenceProfileFavorite,
  sanitizeInterfacePreferences,
  sanitizeNamedInterfacePreferenceName,
  sanitizeNamedInterfacePreferenceProfiles,
  sanitizeNamedInterfacePreferenceQuickFilter,
  serializeInterfacePreferenceBundle,
  serializeInterfacePreferenceBundleImportReceipt,
  serializeInterfacePreferenceProfile,
  serializeInterfacePreferenceRecoverySnapshot,
  suggestDuplicateNamedInterfacePreferenceName,
  upsertNamedInterfacePreferenceProfile,
  type InterfacePreferenceBundleConflictStrategy,
  type InterfacePreferenceBundleImportOutcomeReconciliation,
  type InterfacePreferenceBundleImportReceiptV1,
  type InterfacePreferenceBundleV1,
  type InterfacePreferencePresetId,
  type InterfacePreferenceProfileProvenance,
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
    const visibleProfiles = filterNamedInterfacePreferenceProfiles(
      profiles,
      savedFilter
    );
    const receipt = readImportReconciliationReceipt();

    setRecoverySnapshot(readRecoverySnapshot());
    setImportReconciliationReceipt(receipt);
    setNamedProfiles(profiles);
    setProfileQuickFilter(savedFilter);
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
    setSelectedProfileId((current) =>
      safe.some((profile) => profile.id === current)
        ? current
        : safe[0]?.id ?? ""
    );
  }

  function chooseProfileQuickFilter(
    filter: NamedInterfacePreferenceQuickFilter
  ) {
    setProfileQuickFilter(filter);
    writeProfileQuickFilter(filter);
    const visible = filterNamedInterfacePreferenceProfiles(namedProfiles, filter);
    if (!visible.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(visible[0]?.id ?? "");
    }
    setImportError(null);
    setPortabilityStatus(
      filter === "favorites"
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
      const remainingFavorite = updated.find((profile) => profile.favorite);
      setSelectedProfileId(remainingFavorite?.id ?? "");
    }
    setPortabilityStatus(
      (nextFavorite ? "Favorited “" : "Removed favorite from “") +
        selectedNamedProfile.name +
        "”."
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
    setImportError(null);
    setPortabilityStatus(message);
    return snapshot.snapshot;
  }

  function restoreRecoverySnapshot() {
    if (!recoverySnapshot) return;
    if (!recoveryRestoreArmed) {
      setRecoveryRestoreArmed(true);
      setImportError(null);
      setPortabilityStatus(
        recoveryFreshness?.status === "stale"
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
    try {
      window.localStorage.removeItem(
        INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY
      );
    } catch {
      // Import receipt persistence is optional browser-local evidence.
    }
    setImportReconciliationReceipt(null);
    setImportError(null);
    setPortabilityStatus("Saved import reconciliation receipt cleared.");
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
      writeImportReconciliationReceipt(receipt);
      setImportReconciliationReceipt(receipt);
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
    } catch {
      // Browser-local state is optional.
    }

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
                <p className="eyebrow">Build 134 · Persistent favorites, recovery freshness & import receipts</p>
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
                      <HelpInfo topic="recovery-snapshot-freshness" inline />
                    </div>
                  ) : null}
                  <button type="button" onClick={() => captureRecoverySnapshot()}>
                    Save snapshot
                  </button>
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
              <span>Browser-local persisted favorite views, recovery freshness and import receipts only · no server sync or workflow authority changes.</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
