export const INTERFACE_PREFERENCES_STORAGE_KEY =
  "ai-data-platform:interface-preferences:v1";
export const INTERFACE_PREFERENCES_EVENT =
  "ai-data-platform:interface-preferences";
export const INTERFACE_PREFERENCES_RECONCILED_EVENT =
  "ai-data-platform:interface-preferences-reconciled";

export type NavigationDensityPreference =
  | "adaptive"
  | "comfortable"
  | "compact";

export type WorkspaceLayoutPreference =
  | "balanced"
  | "wide"
  | "focused";

export type RecommendationPreference =
  | "all"
  | "destinations"
  | "shortcuts"
  | "off";

export type InterfacePreferences = {
  version: 1;
  navigationDensity: NavigationDensityPreference;
  workspaceLayout: WorkspaceLayoutPreference;
  recommendations: RecommendationPreference;
};

export type InterfacePreferencePresetId =
  | "standard"
  | "focus"
  | "wide-canvas"
  | "compact-workspace";

export type InterfacePreferencePreset = {
  id: InterfacePreferencePresetId;
  label: string;
  description: string;
  preferences: InterfacePreferences;
};

export type InterfaceAccessibilityEnvironment = {
  viewportWidth: number;
  forcedColors: boolean;
  prefersMoreContrast: boolean;
  prefersReducedMotion: boolean;
};

export type InterfacePreferenceReconciliation = {
  storedPreferences: InterfacePreferences;
  effectivePreferences: InterfacePreferences;
  adjustments: string[];
  accessibilityGuardActive: boolean;
  reducedMotion: boolean;
};

export type InterfaceResetScope = "preferences" | "insights" | "all";

export const INTERFACE_RESET_GOVERNANCE: Record<
  InterfaceResetScope,
  {
    label: string;
    description: string;
    requiresConfirmation: boolean;
  }
> = {
  preferences: {
    label: "Interface only",
    description: "Restore interface defaults while preserving local navigation insights.",
    requiresConfirmation: false
  },
  insights: {
    label: "Insights only",
    description: "Clear local navigation usage counts while preserving interface preferences.",
    requiresConfirmation: false
  },
  all: {
    label: "All local navigation data",
    description: "Clear both interface preferences and local navigation insights in this browser.",
    requiresConfirmation: true
  }
};

export function defaultInterfacePreferences(): InterfacePreferences {
  return {
    version: 1,
    navigationDensity: "adaptive",
    workspaceLayout: "balanced",
    recommendations: "all"
  };
}

export const INTERFACE_PREFERENCE_PRESETS: InterfacePreferencePreset[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Adaptive spacing, balanced layout and all recommendations.",
    preferences: defaultInterfacePreferences()
  },
  {
    id: "focus",
    label: "Focus",
    description: "Comfortable spacing, focused layout and destination recommendations.",
    preferences: {
      version: 1,
      navigationDensity: "comfortable",
      workspaceLayout: "focused",
      recommendations: "destinations"
    }
  },
  {
    id: "wide-canvas",
    label: "Wide Canvas",
    description: "Comfortable spacing, wide layout and all recommendations.",
    preferences: {
      version: 1,
      navigationDensity: "comfortable",
      workspaceLayout: "wide",
      recommendations: "all"
    }
  },
  {
    id: "compact-workspace",
    label: "Compact Workspace",
    description: "Compact spacing, wide layout and shortcut recommendations.",
    preferences: {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "wide",
      recommendations: "shortcuts"
    }
  }
];

export function sanitizeInterfacePreferences(
  value: unknown
): InterfacePreferences {
  const defaults = defaultInterfacePreferences();
  if (!value || typeof value !== "object") return defaults;

  const record = value as Record<string, unknown>;

  const navigationDensity: NavigationDensityPreference =
    record.navigationDensity === "comfortable" ||
    record.navigationDensity === "compact" ||
    record.navigationDensity === "adaptive"
      ? record.navigationDensity
      : defaults.navigationDensity;

  const workspaceLayout: WorkspaceLayoutPreference =
    record.workspaceLayout === "balanced" ||
    record.workspaceLayout === "wide" ||
    record.workspaceLayout === "focused"
      ? record.workspaceLayout
      : defaults.workspaceLayout;

  const recommendations: RecommendationPreference =
    record.recommendations === "all" ||
    record.recommendations === "destinations" ||
    record.recommendations === "shortcuts" ||
    record.recommendations === "off"
      ? record.recommendations
      : defaults.recommendations;

  return {
    version: 1,
    navigationDensity,
    workspaceLayout,
    recommendations
  };
}

export function interfacePreferencePresetById(
  id: InterfacePreferencePresetId
) {
  return INTERFACE_PREFERENCE_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function applyInterfacePreferencePreset(
  id: InterfacePreferencePresetId
): InterfacePreferences {
  const preset = interfacePreferencePresetById(id);
  return sanitizeInterfacePreferences(
    preset?.preferences ?? defaultInterfacePreferences()
  );
}

export function matchingInterfacePreferencePreset(
  preferences: InterfacePreferences
) {
  const safe = sanitizeInterfacePreferences(preferences);
  return (
    INTERFACE_PREFERENCE_PRESETS.find(
      (preset) =>
        preset.preferences.navigationDensity === safe.navigationDensity &&
        preset.preferences.workspaceLayout === safe.workspaceLayout &&
        preset.preferences.recommendations === safe.recommendations
    ) ?? null
  );
}

export function resolveNavigationDensity(
  preference: NavigationDensityPreference,
  viewportWidth: number
): Exclude<NavigationDensityPreference, "adaptive"> {
  if (preference !== "adaptive") return preference;
  return viewportWidth <= 1180 ? "compact" : "comfortable";
}

export function recommendationPreferenceAllowsKind(
  preference: RecommendationPreference,
  kind: "destination" | "shortcut"
) {
  if (preference === "off") return false;
  if (preference === "all") return true;
  if (preference === "destinations") return kind === "destination";
  return kind === "shortcut";
}

export function reconcileInterfacePreferences(
  preferences: InterfacePreferences,
  environment: InterfaceAccessibilityEnvironment
): InterfacePreferenceReconciliation {
  const storedPreferences = sanitizeInterfacePreferences(preferences);
  const effectivePreferences = sanitizeInterfacePreferences(storedPreferences);
  const adjustments: string[] = [];

  const highContrast =
    environment.forcedColors || environment.prefersMoreContrast;

  if (highContrast && effectivePreferences.navigationDensity === "compact") {
    effectivePreferences.navigationDensity = "comfortable";
    adjustments.push(
      "Comfortable navigation spacing is active while a high-contrast display preference is detected."
    );
  }

  if (highContrast && effectivePreferences.workspaceLayout === "wide") {
    effectivePreferences.workspaceLayout = "balanced";
    adjustments.push(
      "Balanced workspace layout is active while a high-contrast display preference is detected."
    );
  }

  if (
    environment.viewportWidth <= 760 &&
    effectivePreferences.workspaceLayout !== "balanced"
  ) {
    effectivePreferences.workspaceLayout = "balanced";
    adjustments.push(
      "Balanced workspace layout is active on this narrow viewport to preserve readable navigation flow."
    );
  }

  if (environment.prefersReducedMotion) {
    adjustments.push(
      "Reduced-motion presentation is active for interface preference transitions."
    );
  }

  return {
    storedPreferences,
    effectivePreferences,
    adjustments,
    accessibilityGuardActive: adjustments.length > 0,
    reducedMotion: environment.prefersReducedMotion
  };
}

export const INTERFACE_PREFERENCE_PROFILE_FORMAT =
  "ai-data-platform-interface-preference-profile";

export type InterfacePreferenceProfileV1 = {
  format: typeof INTERFACE_PREFERENCE_PROFILE_FORMAT;
  version: 1;
  preferences: InterfacePreferences;
};

export type InterfacePreferenceProfileParseResult =
  | { ok: true; profile: InterfacePreferenceProfileV1 }
  | { ok: false; error: string };

function isPortableInterfacePreferences(
  value: unknown
): value is InterfacePreferences {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    (record.navigationDensity === "adaptive" ||
      record.navigationDensity === "comfortable" ||
      record.navigationDensity === "compact") &&
    (record.workspaceLayout === "balanced" ||
      record.workspaceLayout === "wide" ||
      record.workspaceLayout === "focused") &&
    (record.recommendations === "all" ||
      record.recommendations === "destinations" ||
      record.recommendations === "shortcuts" ||
      record.recommendations === "off")
  );
}

export function createInterfacePreferenceProfile(
  preferences: InterfacePreferences
): InterfacePreferenceProfileV1 {
  return {
    format: INTERFACE_PREFERENCE_PROFILE_FORMAT,
    version: 1,
    preferences: sanitizeInterfacePreferences(preferences)
  };
}

export function serializeInterfacePreferenceProfile(
  preferences: InterfacePreferences
) {
  return JSON.stringify(createInterfacePreferenceProfile(preferences), null, 2);
}

export function parseInterfacePreferenceProfile(
  input: unknown
): InterfacePreferenceProfileParseResult {
  let value = input;

  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "This file is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "This file does not contain an interface preference profile."
    };
  }

  const record = value as Record<string, unknown>;
  if (record.format !== INTERFACE_PREFERENCE_PROFILE_FORMAT) {
    return {
      ok: false,
      error: "This file is not an AI Data Platform interface preference profile."
    };
  }

  if (record.version !== 1) {
    return {
      ok: false,
      error: "This preference profile version is not supported."
    };
  }

  if (!isPortableInterfacePreferences(record.preferences)) {
    return {
      ok: false,
      error: "The preference values in this file are incomplete or invalid."
    };
  }

  return {
    ok: true,
    profile: createInterfacePreferenceProfile(record.preferences)
  };
}

export function previewInterfacePreferenceProfile(
  profile: InterfacePreferenceProfileV1,
  environment: InterfaceAccessibilityEnvironment
) {
  return reconcileInterfacePreferences(profile.preferences, environment);
}

export const INTERFACE_NAMED_PROFILES_STORAGE_KEY =
  "ai-data-platform:named-interface-profiles:v1";
export const MAX_NAMED_INTERFACE_PROFILES = 8;
export const INTERFACE_PREFERENCE_BUNDLE_FORMAT =
  "ai-data-platform-interface-preference-bundle";

export type InterfacePreferenceImportFormat =
  | typeof INTERFACE_PREFERENCE_PROFILE_FORMAT
  | typeof INTERFACE_PREFERENCE_BUNDLE_FORMAT;

export type InterfacePreferenceProfileProvenance =
  | { kind: "local" }
  | {
      kind: "imported";
      sourceName: string;
      sourceFormat: InterfacePreferenceImportFormat;
      sourceVersion: 1;
    };

export type NamedInterfacePreferenceProfile = {
  version: 1;
  id: string;
  name: string;
  preferences: InterfacePreferences;
  provenance: InterfacePreferenceProfileProvenance;
};

export function sanitizeNamedInterfacePreferenceName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 40);
}

function sanitizeNamedInterfacePreferenceId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function sanitizePreferenceProfileSourceName(value: unknown) {
  if (typeof value !== "string") return "Imported profile";
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "Imported profile";
}

export function importedInterfacePreferenceProvenance(
  sourceName: string,
  profile: InterfacePreferenceProfileV1
): InterfacePreferenceProfileProvenance {
  return {
    kind: "imported",
    sourceName: sanitizePreferenceProfileSourceName(sourceName),
    sourceFormat: profile.format,
    sourceVersion: profile.version
  };
}

export function createNamedInterfacePreferenceProfile(input: {
  id: string;
  name: string;
  preferences: InterfacePreferences;
  provenance?: InterfacePreferenceProfileProvenance;
}): NamedInterfacePreferenceProfile {
  const id = sanitizeNamedInterfacePreferenceId(input.id);
  const name = sanitizeNamedInterfacePreferenceName(input.name);
  if (!id) throw new Error("Named interface profile ID is required.");
  if (!name) throw new Error("Named interface profile name is required.");

  const provenance: InterfacePreferenceProfileProvenance =
    input.provenance?.kind === "imported"
      ? {
          kind: "imported",
          sourceName: sanitizePreferenceProfileSourceName(
            input.provenance.sourceName
          ),
          sourceFormat:
            input.provenance.sourceFormat === INTERFACE_PREFERENCE_BUNDLE_FORMAT
              ? INTERFACE_PREFERENCE_BUNDLE_FORMAT
              : INTERFACE_PREFERENCE_PROFILE_FORMAT,
          sourceVersion: 1 as const
        }
      : { kind: "local" as const };

  return {
    version: 1,
    id,
    name,
    preferences: sanitizeInterfacePreferences(input.preferences),
    provenance
  };
}

export function sanitizeNamedInterfacePreferenceProfiles(
  value: unknown
): NamedInterfacePreferenceProfile[] {
  if (!Array.isArray(value)) return [];

  const result: NamedInterfacePreferenceProfile[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (record.version !== 1) continue;

    const id = sanitizeNamedInterfacePreferenceId(record.id);
    const name = sanitizeNamedInterfacePreferenceName(record.name);
    if (!id || !name || ids.has(id)) continue;
    if (!isPortableInterfacePreferences(record.preferences)) continue;

    let provenance: InterfacePreferenceProfileProvenance = { kind: "local" };
    if (
      record.provenance &&
      typeof record.provenance === "object" &&
      (record.provenance as Record<string, unknown>).kind === "imported"
    ) {
      const source = record.provenance as Record<string, unknown>;
      if (
        (source.sourceFormat === INTERFACE_PREFERENCE_PROFILE_FORMAT ||
          source.sourceFormat === INTERFACE_PREFERENCE_BUNDLE_FORMAT) &&
        source.sourceVersion === 1
      ) {
        provenance = {
          kind: "imported",
          sourceName: sanitizePreferenceProfileSourceName(source.sourceName),
          sourceFormat:
            source.sourceFormat === INTERFACE_PREFERENCE_BUNDLE_FORMAT
              ? INTERFACE_PREFERENCE_BUNDLE_FORMAT
              : INTERFACE_PREFERENCE_PROFILE_FORMAT,
          sourceVersion: 1
        };
      }
    }

    result.push(
      createNamedInterfacePreferenceProfile({
        id,
        name,
        preferences: record.preferences,
        provenance
      })
    );
    ids.add(id);
    if (result.length >= MAX_NAMED_INTERFACE_PROFILES) break;
  }

  return result;
}

export function upsertNamedInterfacePreferenceProfile(
  profiles: NamedInterfacePreferenceProfile[],
  profile: NamedInterfacePreferenceProfile
) {
  const safe = sanitizeNamedInterfacePreferenceProfiles(profiles);
  const existingIndex = safe.findIndex((item) => item.id === profile.id);
  if (existingIndex >= 0) {
    const next = safe.slice();
    next[existingIndex] = createNamedInterfacePreferenceProfile(profile);
    return next;
  }

  if (safe.length >= MAX_NAMED_INTERFACE_PROFILES) return safe;
  return [...safe, createNamedInterfacePreferenceProfile(profile)];
}

export function removeNamedInterfacePreferenceProfile(
  profiles: NamedInterfacePreferenceProfile[],
  id: string
) {
  const safeId = sanitizeNamedInterfacePreferenceId(id);
  return sanitizeNamedInterfacePreferenceProfiles(profiles).filter(
    (profile) => profile.id !== safeId
  );
}

export function matchingNamedInterfacePreferenceProfile(
  profiles: NamedInterfacePreferenceProfile[],
  preferences: InterfacePreferences
) {
  const safePreferences = sanitizeInterfacePreferences(preferences);
  return (
    sanitizeNamedInterfacePreferenceProfiles(profiles).find(
      (profile) =>
        profile.preferences.navigationDensity ===
          safePreferences.navigationDensity &&
        profile.preferences.workspaceLayout === safePreferences.workspaceLayout &&
        profile.preferences.recommendations === safePreferences.recommendations
    ) ?? null
  );
}

export function namedInterfacePreferenceProvenanceLabel(
  profile: NamedInterfacePreferenceProfile
) {
  if (profile.provenance.kind === "local") return "Created in this browser";
  return (
    "Imported from " +
    profile.provenance.sourceName +
    " · format v" +
    profile.provenance.sourceVersion
  );
}

export type NamedInterfacePreferenceMutationResult =
  | {
      ok: true;
      profiles: NamedInterfacePreferenceProfile[];
      profile: NamedInterfacePreferenceProfile;
    }
  | { ok: false; error: string };

function normalizedNamedProfileKey(name: string) {
  return sanitizeNamedInterfacePreferenceName(name).toLocaleLowerCase();
}

export function renameNamedInterfacePreferenceProfile(
  profiles: NamedInterfacePreferenceProfile[],
  id: string,
  nextName: string
): NamedInterfacePreferenceMutationResult {
  const safe = sanitizeNamedInterfacePreferenceProfiles(profiles);
  const safeId = sanitizeNamedInterfacePreferenceId(id);
  const name = sanitizeNamedInterfacePreferenceName(nextName);
  if (!name) return { ok: false, error: "Enter a valid profile name." };

  const index = safe.findIndex((profile) => profile.id === safeId);
  if (index < 0) return { ok: false, error: "Choose a saved profile first." };

  const key = normalizedNamedProfileKey(name);
  if (
    safe.some(
      (profile, profileIndex) =>
        profileIndex !== index &&
        normalizedNamedProfileKey(profile.name) === key
    )
  ) {
    return {
      ok: false,
      error: "Another named profile already uses that name."
    };
  }

  const renamed = createNamedInterfacePreferenceProfile({
    ...safe[index],
    name
  });
  const next = safe.slice();
  next[index] = renamed;
  return { ok: true, profiles: next, profile: renamed };
}

export function suggestDuplicateNamedInterfacePreferenceName(
  profiles: NamedInterfacePreferenceProfile[],
  sourceName: string
) {
  const safe = sanitizeNamedInterfacePreferenceProfiles(profiles);
  const base = sanitizeNamedInterfacePreferenceName(sourceName) || "Profile";
  const used = new Set(
    safe.map((profile) => normalizedNamedProfileKey(profile.name))
  );

  for (let index = 1; index <= MAX_NAMED_INTERFACE_PROFILES + 1; index += 1) {
    const suffix = index === 1 ? " copy" : " copy " + index;
    const candidate = sanitizeNamedInterfacePreferenceName(
      base.slice(0, Math.max(1, 40 - suffix.length)) + suffix
    );
    if (!used.has(normalizedNamedProfileKey(candidate))) return candidate;
  }

  return sanitizeNamedInterfacePreferenceName("Copy of " + base);
}

export function duplicateNamedInterfacePreferenceProfile(
  profiles: NamedInterfacePreferenceProfile[],
  id: string,
  newId: string,
  requestedName?: string
): NamedInterfacePreferenceMutationResult {
  const safe = sanitizeNamedInterfacePreferenceProfiles(profiles);
  if (safe.length >= MAX_NAMED_INTERFACE_PROFILES) {
    return {
      ok: false,
      error:
        "This browser already has the maximum of " +
        MAX_NAMED_INTERFACE_PROFILES +
        " named profiles."
    };
  }

  const source = safe.find(
    (profile) => profile.id === sanitizeNamedInterfacePreferenceId(id)
  );
  if (!source) return { ok: false, error: "Choose a saved profile first." };

  const name = sanitizeNamedInterfacePreferenceName(
    requestedName || suggestDuplicateNamedInterfacePreferenceName(safe, source.name)
  );
  if (!name) return { ok: false, error: "Enter a valid duplicate profile name." };

  if (
    safe.some(
      (profile) =>
        normalizedNamedProfileKey(profile.name) === normalizedNamedProfileKey(name)
    )
  ) {
    return {
      ok: false,
      error: "Another named profile already uses that name."
    };
  }

  const duplicate = createNamedInterfacePreferenceProfile({
    id: newId,
    name,
    preferences: source.preferences,
    provenance: source.provenance
  });

  return {
    ok: true,
    profiles: [...safe, duplicate],
    profile: duplicate
  };
}

export type InterfacePreferenceBundleProfileV1 = {
  name: string;
  preferences: InterfacePreferences;
};

export type InterfacePreferenceBundleV1 = {
  format: typeof INTERFACE_PREFERENCE_BUNDLE_FORMAT;
  version: 1;
  profiles: InterfacePreferenceBundleProfileV1[];
};

export type InterfacePreferenceBundleParseResult =
  | { ok: true; bundle: InterfacePreferenceBundleV1 }
  | { ok: false; error: string };

export type InterfacePreferenceBundleConflictStrategy =
  | "skip"
  | "replace"
  | "keep-both";

export type InterfacePreferenceBundleConflict = {
  incomingName: string;
  existingId: string;
  existingName: string;
};

export type InterfacePreferenceBundleImportAnalysis = {
  incomingCount: number;
  conflictCount: number;
  conflicts: InterfacePreferenceBundleConflict[];
  availableSlots: number;
};

export type InterfacePreferenceBundleResolution = {
  profiles: NamedInterfacePreferenceProfile[];
  imported: number;
  replaced: number;
  skippedConflicts: number;
  skippedCapacity: number;
  renamedCopies: number;
};

export function createInterfacePreferenceBundle(
  profiles: NamedInterfacePreferenceProfile[]
): InterfacePreferenceBundleV1 {
  const safe = sanitizeNamedInterfacePreferenceProfiles(profiles);
  return {
    format: INTERFACE_PREFERENCE_BUNDLE_FORMAT,
    version: 1,
    profiles: safe.map((profile) => ({
      name: profile.name,
      preferences: sanitizeInterfacePreferences(profile.preferences)
    }))
  };
}

export function serializeInterfacePreferenceBundle(
  profiles: NamedInterfacePreferenceProfile[]
) {
  return JSON.stringify(createInterfacePreferenceBundle(profiles), null, 2);
}

export function parseInterfacePreferenceBundle(
  input: unknown
): InterfacePreferenceBundleParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, error: "This bundle is not valid JSON." };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "This file does not contain an interface preference bundle."
    };
  }

  const record = value as Record<string, unknown>;
  if (record.format !== INTERFACE_PREFERENCE_BUNDLE_FORMAT) {
    return {
      ok: false,
      error: "This file is not an AI Data Platform preference bundle."
    };
  }
  if (record.version !== 1) {
    return {
      ok: false,
      error: "This preference bundle version is not supported."
    };
  }
  if (!Array.isArray(record.profiles) || record.profiles.length < 1) {
    return { ok: false, error: "This preference bundle is empty." };
  }
  if (record.profiles.length > MAX_NAMED_INTERFACE_PROFILES) {
    return {
      ok: false,
      error:
        "A preference bundle can contain at most " +
        MAX_NAMED_INTERFACE_PROFILES +
        " profiles."
    };
  }

  const profiles: InterfacePreferenceBundleProfileV1[] = [];
  const names = new Set<string>();
  for (const item of record.profiles) {
    if (!item || typeof item !== "object") {
      return {
        ok: false,
        error: "The bundle contains an invalid profile record."
      };
    }
    const itemRecord = item as Record<string, unknown>;
    const name = sanitizeNamedInterfacePreferenceName(itemRecord.name);
    if (!name || !isPortableInterfacePreferences(itemRecord.preferences)) {
      return {
        ok: false,
        error: "The bundle contains an invalid profile name or preference value."
      };
    }
    const key = normalizedNamedProfileKey(name);
    if (names.has(key)) {
      return {
        ok: false,
        error: "The bundle contains duplicate profile names."
      };
    }
    names.add(key);
    profiles.push({
      name,
      preferences: sanitizeInterfacePreferences(itemRecord.preferences)
    });
  }

  return {
    ok: true,
    bundle: {
      format: INTERFACE_PREFERENCE_BUNDLE_FORMAT,
      version: 1,
      profiles
    }
  };
}

export function importedInterfacePreferenceBundleProvenance(
  sourceName: string
): InterfacePreferenceProfileProvenance {
  return {
    kind: "imported",
    sourceName: sanitizePreferenceProfileSourceName(sourceName),
    sourceFormat: INTERFACE_PREFERENCE_BUNDLE_FORMAT,
    sourceVersion: 1
  };
}

export function analyzeInterfacePreferenceBundleImport(
  existingProfiles: NamedInterfacePreferenceProfile[],
  bundle: InterfacePreferenceBundleV1
): InterfacePreferenceBundleImportAnalysis {
  const existing = sanitizeNamedInterfacePreferenceProfiles(existingProfiles);
  const conflicts: InterfacePreferenceBundleConflict[] = [];

  for (const incoming of bundle.profiles) {
    const match = existing.find(
      (profile) =>
        normalizedNamedProfileKey(profile.name) ===
        normalizedNamedProfileKey(incoming.name)
    );
    if (match) {
      conflicts.push({
        incomingName: incoming.name,
        existingId: match.id,
        existingName: match.name
      });
    }
  }

  return {
    incomingCount: bundle.profiles.length,
    conflictCount: conflicts.length,
    conflicts,
    availableSlots: Math.max(0, MAX_NAMED_INTERFACE_PROFILES - existing.length)
  };
}

function uniqueImportedCopyName(
  profiles: NamedInterfacePreferenceProfile[],
  incomingName: string
) {
  const used = new Set(
    profiles.map((profile) => normalizedNamedProfileKey(profile.name))
  );
  const base = sanitizeNamedInterfacePreferenceName(incomingName) || "Imported";

  for (let index = 1; index <= MAX_NAMED_INTERFACE_PROFILES + 1; index += 1) {
    const suffix =
      index === 1 ? " (Imported)" : " (Imported " + index + ")";
    const candidate = sanitizeNamedInterfacePreferenceName(
      base.slice(0, Math.max(1, 40 - suffix.length)) + suffix
    );
    if (!used.has(normalizedNamedProfileKey(candidate))) return candidate;
  }

  return suggestDuplicateNamedInterfacePreferenceName(profiles, base);
}

export function resolveInterfacePreferenceBundleImport(
  existingProfiles: NamedInterfacePreferenceProfile[],
  bundle: InterfacePreferenceBundleV1,
  strategy: InterfacePreferenceBundleConflictStrategy,
  sourceName: string,
  createId: (name: string, index: number) => string
): InterfacePreferenceBundleResolution {
  let profiles = sanitizeNamedInterfacePreferenceProfiles(existingProfiles);
  const provenance = importedInterfacePreferenceBundleProvenance(sourceName);
  let imported = 0;
  let replaced = 0;
  let skippedConflicts = 0;
  let skippedCapacity = 0;
  let renamedCopies = 0;

  bundle.profiles.forEach((incoming, index) => {
    const conflictIndex = profiles.findIndex(
      (profile) =>
        normalizedNamedProfileKey(profile.name) ===
        normalizedNamedProfileKey(incoming.name)
    );

    if (conflictIndex >= 0 && strategy === "skip") {
      skippedConflicts += 1;
      return;
    }

    if (conflictIndex >= 0 && strategy === "replace") {
      const existing = profiles[conflictIndex];
      profiles = profiles.slice();
      profiles[conflictIndex] = createNamedInterfacePreferenceProfile({
        id: existing.id,
        name: incoming.name,
        preferences: incoming.preferences,
        provenance
      });
      replaced += 1;
      return;
    }

    if (profiles.length >= MAX_NAMED_INTERFACE_PROFILES) {
      skippedCapacity += 1;
      return;
    }

    const name =
      conflictIndex >= 0
        ? uniqueImportedCopyName(profiles, incoming.name)
        : incoming.name;
    if (conflictIndex >= 0) renamedCopies += 1;

    profiles.push(
      createNamedInterfacePreferenceProfile({
        id: createId(name, index),
        name,
        preferences: incoming.preferences,
        provenance
      })
    );
    imported += 1;
  });

  return {
    profiles: sanitizeNamedInterfacePreferenceProfiles(profiles),
    imported,
    replaced,
    skippedConflicts,
    skippedCapacity,
    renamedCopies
  };
}
