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
  favorite: boolean;
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
  favorite?: boolean;
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
    provenance,
    favorite: input.favorite === true
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
        provenance,
        favorite: record.favorite === true
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

export function setNamedInterfacePreferenceProfileFavorite(
  profiles: NamedInterfacePreferenceProfile[],
  id: string,
  favorite: boolean
) {
  const safe = sanitizeNamedInterfacePreferenceProfiles(profiles);
  const safeId = sanitizeNamedInterfacePreferenceId(id);
  return safe.map((profile) =>
    profile.id === safeId
      ? createNamedInterfacePreferenceProfile({
          ...profile,
          favorite
        })
      : profile
  );
}

export function favoriteNamedInterfacePreferenceProfiles(
  profiles: NamedInterfacePreferenceProfile[]
) {
  return sanitizeNamedInterfacePreferenceProfiles(profiles).filter(
    (profile) => profile.favorite
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
        provenance,
        favorite: existing.favorite
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

export type NamedInterfacePreferenceMoveDirection =
  | "up"
  | "down"
  | "top"
  | "bottom";

export function reorderNamedInterfacePreferenceProfile(
  profiles: NamedInterfacePreferenceProfile[],
  id: string,
  direction: NamedInterfacePreferenceMoveDirection
) {
  const safe = sanitizeNamedInterfacePreferenceProfiles(profiles);
  const safeId = sanitizeNamedInterfacePreferenceId(id);
  const index = safe.findIndex((profile) => profile.id === safeId);
  if (index < 0 || safe.length < 2) return safe;

  let targetIndex = index;
  if (direction === "up") targetIndex = Math.max(0, index - 1);
  if (direction === "down") targetIndex = Math.min(safe.length - 1, index + 1);
  if (direction === "top") targetIndex = 0;
  if (direction === "bottom") targetIndex = safe.length - 1;
  if (targetIndex === index) return safe;

  const next = safe.slice();
  const [profile] = next.splice(index, 1);
  next.splice(targetIndex, 0, profile);
  return next;
}

export function selectInterfacePreferenceBundleProfiles(
  bundle: InterfacePreferenceBundleV1,
  selectedNames: string[]
): InterfacePreferenceBundleV1 {
  const selected = new Set(
    selectedNames
      .map((name) => sanitizeNamedInterfacePreferenceName(name))
      .filter(Boolean)
      .map((name) => normalizedNamedProfileKey(name))
  );

  return {
    format: INTERFACE_PREFERENCE_BUNDLE_FORMAT,
    version: 1,
    profiles: bundle.profiles.filter((profile) =>
      selected.has(normalizedNamedProfileKey(profile.name))
    )
  };
}

export const INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT =
  "ai-data-platform-interface-preference-recovery-snapshot";
export const INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY =
  "ai-data-platform:interface-preference-recovery-snapshot:v1";

export type InterfacePreferenceRecoverySnapshotV1 = {
  format: typeof INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT;
  version: 1;
  capturedAt: number | null;
  preferences: InterfacePreferences;
  namedProfiles: NamedInterfacePreferenceProfile[];
};

export type InterfacePreferenceRecoverySnapshotFreshnessStatus =
  | "unknown"
  | "fresh"
  | "aging"
  | "stale"
  | "expired";

export type InterfacePreferenceRecoverySnapshotFreshness = {
  status: InterfacePreferenceRecoverySnapshotFreshnessStatus;
  ageMs: number | null;
  ageHours: number | null;
};

export type InterfacePreferenceRecoverySnapshotParseResult =
  | { ok: true; snapshot: InterfacePreferenceRecoverySnapshotV1 }
  | { ok: false; error: string };

export function createInterfacePreferenceRecoverySnapshot(
  preferences: InterfacePreferences,
  namedProfiles: NamedInterfacePreferenceProfile[],
  capturedAt: number | null = Date.now()
): InterfacePreferenceRecoverySnapshotV1 {
  const safeCapturedAt =
    typeof capturedAt === "number" &&
    Number.isFinite(capturedAt) &&
    capturedAt > 0
      ? Math.floor(capturedAt)
      : null;

  return {
    format: INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT,
    version: 1,
    capturedAt: safeCapturedAt,
    preferences: sanitizeInterfacePreferences(preferences),
    namedProfiles: sanitizeNamedInterfacePreferenceProfiles(namedProfiles)
  };
}

export function serializeInterfacePreferenceRecoverySnapshot(
  preferences: InterfacePreferences,
  namedProfiles: NamedInterfacePreferenceProfile[],
  capturedAt: number | null = Date.now()
) {
  return JSON.stringify(
    createInterfacePreferenceRecoverySnapshot(
      preferences,
      namedProfiles,
      capturedAt
    )
  );
}

export function interfacePreferenceRecoverySnapshotFreshness(
  snapshot: InterfacePreferenceRecoverySnapshotV1,
  now: number = Date.now()
): InterfacePreferenceRecoverySnapshotFreshness {
  if (
    snapshot.capturedAt === null ||
    !Number.isFinite(now) ||
    now < snapshot.capturedAt
  ) {
    return {
      status: "unknown",
      ageMs: null,
      ageHours: null
    };
  }

  const ageMs = Math.max(0, now - snapshot.capturedAt);
  const ageHours = ageMs / (60 * 60 * 1000);
  const status: InterfacePreferenceRecoverySnapshotFreshnessStatus =
    ageHours < 24
      ? "fresh"
      : ageHours < 24 * 7
        ? "aging"
        : ageHours < 24 * 30
          ? "stale"
          : "expired";

  return {
    status,
    ageMs,
    ageHours
  };
}

export type InterfacePreferenceRecoveryRenewalAssessment = {
  recommended: boolean;
  priority: "none" | "consider" | "recommended";
  reason: string;
};

export function assessInterfacePreferenceRecoverySnapshotRenewal(
  snapshot: InterfacePreferenceRecoverySnapshotV1,
  now: number = Date.now()
): InterfacePreferenceRecoveryRenewalAssessment {
  const freshness = interfacePreferenceRecoverySnapshotFreshness(snapshot, now);

  if (freshness.status === "expired") {
    return {
      recommended: true,
      priority: "recommended",
      reason:
        "This recovery snapshot is outside the 30-day guidance window. Renew it from current browser state before further risky changes when practical."
    };
  }

  if (freshness.status === "unknown") {
    return {
      recommended: true,
      priority: "recommended",
      reason:
        "This legacy recovery snapshot has no reliable capture time. Renew it to establish a timestamped recovery point."
    };
  }

  if (freshness.status === "stale") {
    return {
      recommended: true,
      priority: "consider",
      reason:
        "This recovery snapshot is at least seven days old. Consider renewing it if current browser state is now the desired recovery point."
    };
  }

  if (freshness.status === "aging") {
    return {
      recommended: false,
      priority: "consider",
      reason:
        "This recovery snapshot is more than 24 hours old but still inside the seven-day freshness window."
    };
  }

  return {
    recommended: false,
    priority: "none",
    reason: "This recovery snapshot is still fresh."
  };
}

export function parseInterfacePreferenceRecoverySnapshot(
  input: unknown
): InterfacePreferenceRecoverySnapshotParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, error: "The local recovery snapshot is not valid JSON." };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "The local recovery snapshot is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (record.format !== INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT) {
    return {
      ok: false,
      error: "The local recovery snapshot format is not supported."
    };
  }
  if (record.version !== 1) {
    return {
      ok: false,
      error: "The local recovery snapshot version is not supported."
    };
  }
  if (!isPortableInterfacePreferences(record.preferences)) {
    return {
      ok: false,
      error: "The local recovery snapshot has invalid interface preferences."
    };
  }
  if (!Array.isArray(record.namedProfiles)) {
    return {
      ok: false,
      error: "The local recovery snapshot has invalid named profiles."
    };
  }

  const namedProfiles = sanitizeNamedInterfacePreferenceProfiles(
    record.namedProfiles
  );
  if (namedProfiles.length !== record.namedProfiles.length) {
    return {
      ok: false,
      error: "The local recovery snapshot contains invalid or duplicate named profiles."
    };
  }

  return {
    ok: true,
    snapshot: createInterfacePreferenceRecoverySnapshot(
      record.preferences,
      namedProfiles,
      typeof record.capturedAt === "number" &&
        Number.isFinite(record.capturedAt) &&
        record.capturedAt > 0
        ? record.capturedAt
        : null
    )
  };
}

export type InterfacePreferenceRecoveryDiffField =
  | "navigationDensity"
  | "workspaceLayout"
  | "recommendations";

export type InterfacePreferenceRecoveryDiff = {
  hasChanges: boolean;
  preferenceChanges: Array<{
    field: InterfacePreferenceRecoveryDiffField;
    current: string;
    snapshot: string;
  }>;
  currentOnlyProfiles: string[];
  snapshotOnlyProfiles: string[];
  changedProfiles: string[];
  favoriteChanges: string[];
  orderChanged: boolean;
};

function sameInterfacePreferenceValues(
  left: InterfacePreferences,
  right: InterfacePreferences
) {
  return (
    left.navigationDensity === right.navigationDensity &&
    left.workspaceLayout === right.workspaceLayout &&
    left.recommendations === right.recommendations
  );
}

function sameProfileProvenance(
  left: InterfacePreferenceProfileProvenance,
  right: InterfacePreferenceProfileProvenance
) {
  if (left.kind !== right.kind) return false;
  if (left.kind === "local" && right.kind === "local") return true;
  if (left.kind !== "imported" || right.kind !== "imported") return false;
  return (
    left.sourceName === right.sourceName &&
    left.sourceFormat === right.sourceFormat &&
    left.sourceVersion === right.sourceVersion
  );
}

export function diffInterfacePreferenceRecoverySnapshot(
  snapshot: InterfacePreferenceRecoverySnapshotV1,
  currentPreferences: InterfacePreferences,
  currentProfiles: NamedInterfacePreferenceProfile[]
): InterfacePreferenceRecoveryDiff {
  const current = sanitizeInterfacePreferences(currentPreferences);
  const target = sanitizeInterfacePreferences(snapshot.preferences);
  const currentNamed = sanitizeNamedInterfacePreferenceProfiles(currentProfiles);
  const snapshotNamed = sanitizeNamedInterfacePreferenceProfiles(
    snapshot.namedProfiles
  );

  const preferenceChanges: InterfacePreferenceRecoveryDiff["preferenceChanges"] = [];
  for (const field of [
    "navigationDensity",
    "workspaceLayout",
    "recommendations"
  ] as const) {
    if (current[field] !== target[field]) {
      preferenceChanges.push({
        field,
        current: current[field],
        snapshot: target[field]
      });
    }
  }

  const currentById = new Map(currentNamed.map((profile) => [profile.id, profile]));
  const snapshotById = new Map(snapshotNamed.map((profile) => [profile.id, profile]));

  const currentOnlyProfiles = currentNamed
    .filter((profile) => !snapshotById.has(profile.id))
    .map((profile) => profile.name);
  const snapshotOnlyProfiles = snapshotNamed
    .filter((profile) => !currentById.has(profile.id))
    .map((profile) => profile.name);

  const changedProfiles: string[] = [];
  const favoriteChanges: string[] = [];

  for (const snapshotProfile of snapshotNamed) {
    const currentProfile = currentById.get(snapshotProfile.id);
    if (!currentProfile) continue;

    if (currentProfile.favorite !== snapshotProfile.favorite) {
      favoriteChanges.push(snapshotProfile.name);
    }

    if (
      currentProfile.name !== snapshotProfile.name ||
      !sameInterfacePreferenceValues(
        currentProfile.preferences,
        snapshotProfile.preferences
      ) ||
      !sameProfileProvenance(
        currentProfile.provenance,
        snapshotProfile.provenance
      )
    ) {
      changedProfiles.push(snapshotProfile.name);
    }
  }

  const currentSharedOrder = currentNamed
    .filter((profile) => snapshotById.has(profile.id))
    .map((profile) => profile.id);
  const snapshotSharedOrder = snapshotNamed
    .filter((profile) => currentById.has(profile.id))
    .map((profile) => profile.id);
  const orderChanged =
    currentSharedOrder.join("|") !== snapshotSharedOrder.join("|");

  return {
    hasChanges:
      preferenceChanges.length > 0 ||
      currentOnlyProfiles.length > 0 ||
      snapshotOnlyProfiles.length > 0 ||
      changedProfiles.length > 0 ||
      favoriteChanges.length > 0 ||
      orderChanged,
    preferenceChanges,
    currentOnlyProfiles,
    snapshotOnlyProfiles,
    changedProfiles,
    favoriteChanges,
    orderChanged
  };
}

export type InterfacePreferenceBundleCapacityPlan = {
  currentCount: number;
  selectedCount: number;
  availableSlots: number;
  conflictCount: number;
  newSlotDemand: number;
  projectedAdded: number;
  projectedReplaced: number;
  projectedSkippedConflicts: number;
  projectedSkippedCapacity: number;
  projectedFinalCount: number;
  fitsWithoutCapacitySkips: boolean;
};

export function planInterfacePreferenceBundleImportCapacity(
  existingProfiles: NamedInterfacePreferenceProfile[],
  bundle: InterfacePreferenceBundleV1,
  strategy: InterfacePreferenceBundleConflictStrategy
): InterfacePreferenceBundleCapacityPlan {
  const existing = sanitizeNamedInterfacePreferenceProfiles(existingProfiles);
  const existingNames = new Set(
    existing.map((profile) => normalizedNamedProfileKey(profile.name))
  );
  const availableSlots = Math.max(
    0,
    MAX_NAMED_INTERFACE_PROFILES - existing.length
  );

  let conflicts = 0;
  let newSlotDemand = 0;
  let projectedReplaced = 0;
  let projectedSkippedConflicts = 0;

  for (const incoming of bundle.profiles) {
    const conflict = existingNames.has(normalizedNamedProfileKey(incoming.name));
    if (conflict) conflicts += 1;

    if (conflict && strategy === "skip") {
      projectedSkippedConflicts += 1;
      continue;
    }

    if (conflict && strategy === "replace") {
      projectedReplaced += 1;
      continue;
    }

    newSlotDemand += 1;
  }

  const projectedAdded = Math.min(newSlotDemand, availableSlots);
  const projectedSkippedCapacity = Math.max(
    0,
    newSlotDemand - availableSlots
  );

  return {
    currentCount: existing.length,
    selectedCount: bundle.profiles.length,
    availableSlots,
    conflictCount: conflicts,
    newSlotDemand,
    projectedAdded,
    projectedReplaced,
    projectedSkippedConflicts,
    projectedSkippedCapacity,
    projectedFinalCount: existing.length + projectedAdded,
    fitsWithoutCapacitySkips: projectedSkippedCapacity === 0
  };
}

export const INTERFACE_NAMED_PROFILE_VIEW_STORAGE_KEY =
  "ai-data-platform:named-profile-view:v1";

export type NamedInterfacePreferenceQuickFilter = "all" | "favorites";

export function sanitizeNamedInterfacePreferenceQuickFilter(
  value: unknown
): NamedInterfacePreferenceQuickFilter {
  return value === "favorites" ? "favorites" : "all";
}

export type NamedInterfacePreferenceQuickFilterRecovery = {
  filter: NamedInterfacePreferenceQuickFilter;
  recovered: boolean;
  reason: string | null;
};

export function recoverNamedInterfacePreferenceQuickFilter(
  profiles: NamedInterfacePreferenceProfile[],
  requested: unknown
): NamedInterfacePreferenceQuickFilterRecovery {
  const filter = sanitizeNamedInterfacePreferenceQuickFilter(requested);
  if (
    filter === "favorites" &&
    !sanitizeNamedInterfacePreferenceProfiles(profiles).some(
      (profile) => profile.favorite
    )
  ) {
    return {
      filter: "all",
      recovered: true,
      reason:
        "Favorites view recovered to All profiles because no favorite profiles remain."
    };
  }

  return {
    filter,
    recovered: false,
    reason: null
  };
}

export function filterNamedInterfacePreferenceProfiles(
  profiles: NamedInterfacePreferenceProfile[],
  filter: NamedInterfacePreferenceQuickFilter
) {
  const safe = sanitizeNamedInterfacePreferenceProfiles(profiles);
  return filter === "favorites"
    ? safe.filter((profile) => profile.favorite)
    : safe;
}

export type InterfacePreferenceBundleImportOutcomeReconciliation = {
  matchesPlan: boolean;
  planned: {
    added: number;
    replaced: number;
    skippedConflicts: number;
    skippedCapacity: number;
    finalCount: number;
  };
  actual: {
    added: number;
    replaced: number;
    skippedConflicts: number;
    skippedCapacity: number;
    finalCount: number;
  };
  deviations: string[];
};

export function reconcileInterfacePreferenceBundleImportOutcome(
  plan: InterfacePreferenceBundleCapacityPlan,
  outcome: InterfacePreferenceBundleResolution
): InterfacePreferenceBundleImportOutcomeReconciliation {
  const planned = {
    added: plan.projectedAdded,
    replaced: plan.projectedReplaced,
    skippedConflicts: plan.projectedSkippedConflicts,
    skippedCapacity: plan.projectedSkippedCapacity,
    finalCount: plan.projectedFinalCount
  };
  const actual = {
    added: outcome.imported,
    replaced: outcome.replaced,
    skippedConflicts: outcome.skippedConflicts,
    skippedCapacity: outcome.skippedCapacity,
    finalCount: outcome.profiles.length
  };
  const deviations: string[] = [];

  if (planned.added !== actual.added) {
    deviations.push(
      "Added profiles: planned " + planned.added + ", actual " + actual.added + "."
    );
  }
  if (planned.replaced !== actual.replaced) {
    deviations.push(
      "Replacements: planned " +
        planned.replaced +
        ", actual " +
        actual.replaced +
        "."
    );
  }
  if (planned.skippedConflicts !== actual.skippedConflicts) {
    deviations.push(
      "Conflict skips: planned " +
        planned.skippedConflicts +
        ", actual " +
        actual.skippedConflicts +
        "."
    );
  }
  if (planned.skippedCapacity !== actual.skippedCapacity) {
    deviations.push(
      "Capacity skips: planned " +
        planned.skippedCapacity +
        ", actual " +
        actual.skippedCapacity +
        "."
    );
  }
  if (planned.finalCount !== actual.finalCount) {
    deviations.push(
      "Final profile count: planned " +
        planned.finalCount +
        ", actual " +
        actual.finalCount +
        "."
    );
  }

  return {
    matchesPlan: deviations.length === 0,
    planned,
    actual,
    deviations
  };
}

export const INTERFACE_PREFERENCE_IMPORT_RECEIPT_FORMAT =
  "ai-data-platform-interface-preference-import-reconciliation-receipt";
export const INTERFACE_PREFERENCE_IMPORT_RECEIPT_STORAGE_KEY =
  "ai-data-platform:preference-import-reconciliation-receipt:v1";

export type InterfacePreferenceBundleImportReceiptV1 = {
  format: typeof INTERFACE_PREFERENCE_IMPORT_RECEIPT_FORMAT;
  version: 1;
  receiptId: string;
  createdAt: number;
  sourceName: string;
  strategy: InterfacePreferenceBundleConflictStrategy;
  selectedNames: string[];
  plan: InterfacePreferenceBundleCapacityPlan;
  reconciliation: InterfacePreferenceBundleImportOutcomeReconciliation;
};

function sanitizeInterfacePreferenceReceiptId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function validReceiptPlan(
  value: unknown
): value is InterfacePreferenceBundleCapacityPlan {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    isNonNegativeFiniteNumber(record.currentCount) &&
    isNonNegativeFiniteNumber(record.selectedCount) &&
    isNonNegativeFiniteNumber(record.availableSlots) &&
    isNonNegativeFiniteNumber(record.conflictCount) &&
    isNonNegativeFiniteNumber(record.newSlotDemand) &&
    isNonNegativeFiniteNumber(record.projectedAdded) &&
    isNonNegativeFiniteNumber(record.projectedReplaced) &&
    isNonNegativeFiniteNumber(record.projectedSkippedConflicts) &&
    isNonNegativeFiniteNumber(record.projectedSkippedCapacity) &&
    isNonNegativeFiniteNumber(record.projectedFinalCount) &&
    typeof record.fitsWithoutCapacitySkips === "boolean"
  );
}

function validReceiptReconciliation(
  value: unknown
): value is InterfacePreferenceBundleImportOutcomeReconciliation {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (
    typeof record.matchesPlan !== "boolean" ||
    !record.planned ||
    typeof record.planned !== "object" ||
    !record.actual ||
    typeof record.actual !== "object" ||
    !Array.isArray(record.deviations) ||
    !record.deviations.every((item) => typeof item === "string")
  ) {
    return false;
  }

  for (const counts of [record.planned, record.actual]) {
    const countRecord = counts as Record<string, unknown>;
    for (const key of [
      "added",
      "replaced",
      "skippedConflicts",
      "skippedCapacity",
      "finalCount"
    ]) {
      if (!isNonNegativeFiniteNumber(countRecord[key])) return false;
    }
  }

  return true;
}

export function createInterfacePreferenceBundleImportReceipt(input: {
  receiptId: string;
  createdAt?: number;
  sourceName: string;
  strategy: InterfacePreferenceBundleConflictStrategy;
  selectedNames: string[];
  plan: InterfacePreferenceBundleCapacityPlan;
  reconciliation: InterfacePreferenceBundleImportOutcomeReconciliation;
}): InterfacePreferenceBundleImportReceiptV1 {
  const receiptId = sanitizeInterfacePreferenceReceiptId(input.receiptId);
  if (!receiptId) {
    throw new Error("Import reconciliation receipt ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  const selectedNames = input.selectedNames
    .map((name) => sanitizeNamedInterfacePreferenceName(name))
    .filter(Boolean)
    .slice(0, MAX_NAMED_INTERFACE_PROFILES);

  return {
    format: INTERFACE_PREFERENCE_IMPORT_RECEIPT_FORMAT,
    version: 1,
    receiptId,
    createdAt,
    sourceName: sanitizePreferenceProfileSourceName(input.sourceName),
    strategy:
      input.strategy === "replace" || input.strategy === "keep-both"
        ? input.strategy
        : "skip",
    selectedNames,
    plan: { ...input.plan },
    reconciliation: {
      matchesPlan: input.reconciliation.matchesPlan,
      planned: { ...input.reconciliation.planned },
      actual: { ...input.reconciliation.actual },
      deviations: input.reconciliation.deviations.slice(0, 20)
    }
  };
}

export function serializeInterfacePreferenceBundleImportReceipt(
  receipt: InterfacePreferenceBundleImportReceiptV1
) {
  return JSON.stringify(receipt, null, 2);
}

export type InterfacePreferenceBundleImportReceiptParseResult =
  | { ok: true; receipt: InterfacePreferenceBundleImportReceiptV1 }
  | { ok: false; error: string };

export function parseInterfacePreferenceBundleImportReceipt(
  input: unknown
): InterfacePreferenceBundleImportReceiptParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "The import reconciliation receipt is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "The import reconciliation receipt is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !== INTERFACE_PREFERENCE_IMPORT_RECEIPT_FORMAT ||
    record.version !== 1
  ) {
    return {
      ok: false,
      error: "The import reconciliation receipt format is not supported."
    };
  }

  const receiptId = sanitizeInterfacePreferenceReceiptId(record.receiptId);
  const createdAt =
    typeof record.createdAt === "number" &&
    Number.isFinite(record.createdAt) &&
    record.createdAt > 0
      ? record.createdAt
      : 0;
  const sourceName = sanitizePreferenceProfileSourceName(record.sourceName);
  const strategy =
    record.strategy === "skip" ||
    record.strategy === "replace" ||
    record.strategy === "keep-both"
      ? record.strategy
      : null;
  const selectedNames = Array.isArray(record.selectedNames)
    ? record.selectedNames
        .map((name) => sanitizeNamedInterfacePreferenceName(name))
        .filter(Boolean)
    : [];

  if (
    !receiptId ||
    !createdAt ||
    !strategy ||
    selectedNames.length > MAX_NAMED_INTERFACE_PROFILES ||
    !validReceiptPlan(record.plan) ||
    !validReceiptReconciliation(record.reconciliation)
  ) {
    return {
      ok: false,
      error: "The import reconciliation receipt is incomplete or invalid."
    };
  }

  return {
    ok: true,
    receipt: createInterfacePreferenceBundleImportReceipt({
      receiptId,
      createdAt,
      sourceName,
      strategy,
      selectedNames,
      plan: record.plan,
      reconciliation: record.reconciliation
    })
  };
}

export const INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_FORMAT =
  "ai-data-platform-interface-preference-import-reconciliation-history";
export const INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_STORAGE_KEY =
  "ai-data-platform:preference-import-reconciliation-history:v1";
export const MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY = 10;

export type InterfacePreferenceBundleImportReceiptHistoryV1 = {
  format: typeof INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_FORMAT;
  version: 1;
  receipts: InterfacePreferenceBundleImportReceiptV1[];
};

export function createInterfacePreferenceBundleImportReceiptHistory(
  receipts: InterfacePreferenceBundleImportReceiptV1[]
): InterfacePreferenceBundleImportReceiptHistoryV1 {
  const result: InterfacePreferenceBundleImportReceiptV1[] = [];
  const seen = new Set<string>();

  for (const candidate of receipts) {
    const parsed = parseInterfacePreferenceBundleImportReceipt(candidate);
    if (!parsed.ok || seen.has(parsed.receipt.receiptId)) continue;
    result.push(parsed.receipt);
    seen.add(parsed.receipt.receiptId);
    if (result.length >= MAX_INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY) break;
  }

  return {
    format: INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_FORMAT,
    version: 1,
    receipts: result
  };
}

export function prependInterfacePreferenceBundleImportReceipt(
  history: InterfacePreferenceBundleImportReceiptV1[],
  receipt: InterfacePreferenceBundleImportReceiptV1
) {
  return createInterfacePreferenceBundleImportReceiptHistory([
    receipt,
    ...history.filter((item) => item.receiptId !== receipt.receiptId)
  ]).receipts;
}

export function serializeInterfacePreferenceBundleImportReceiptHistory(
  receipts: InterfacePreferenceBundleImportReceiptV1[]
) {
  return JSON.stringify(
    createInterfacePreferenceBundleImportReceiptHistory(receipts),
    null,
    2
  );
}

export type InterfacePreferenceBundleImportReceiptHistoryParseResult =
  | {
      ok: true;
      history: InterfacePreferenceBundleImportReceiptHistoryV1;
    }
  | { ok: false; error: string };

export function parseInterfacePreferenceBundleImportReceiptHistory(
  input: unknown
): InterfacePreferenceBundleImportReceiptHistoryParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "The import reconciliation receipt history is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "The import reconciliation receipt history is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !== INTERFACE_PREFERENCE_IMPORT_RECEIPT_HISTORY_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.receipts)
  ) {
    return {
      ok: false,
      error: "The import reconciliation receipt history format is not supported."
    };
  }

  const parsedReceipts: InterfacePreferenceBundleImportReceiptV1[] = [];
  for (const candidate of record.receipts) {
    const parsed = parseInterfacePreferenceBundleImportReceipt(candidate);
    if (!parsed.ok) {
      return {
        ok: false,
        error:
          "The import reconciliation receipt history contains an invalid receipt."
      };
    }
    parsedReceipts.push(parsed.receipt);
  }

  return {
    ok: true,
    history: createInterfacePreferenceBundleImportReceiptHistory(
      parsedReceipts
    )
  };
}

export const INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-favorite-view-recovery-audit";
export const INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:favorite-view-recovery-audit:v1";
export const MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT = 12;

export type InterfaceFavoriteViewRecoveryAuditTrigger =
  | "initial-load"
  | "filter-selection"
  | "last-favorite-removed";

export type InterfaceFavoriteViewRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  trigger: InterfaceFavoriteViewRecoveryAuditTrigger;
  requestedFilter: NamedInterfacePreferenceQuickFilter;
  resolvedFilter: NamedInterfacePreferenceQuickFilter;
  reason: string;
};

export type InterfaceFavoriteViewRecoveryAuditV1 = {
  format: typeof INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceFavoriteViewRecoveryAuditEntryV1[];
};

function sanitizeFavoriteViewAuditId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeFavoriteViewAuditTrigger(
  value: unknown
): InterfaceFavoriteViewRecoveryAuditTrigger | null {
  return value === "initial-load" ||
    value === "filter-selection" ||
    value === "last-favorite-removed"
    ? value
    : null;
}

export function createInterfaceFavoriteViewRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  trigger: InterfaceFavoriteViewRecoveryAuditTrigger;
  requestedFilter: NamedInterfacePreferenceQuickFilter;
  resolvedFilter: NamedInterfacePreferenceQuickFilter;
  reason: string;
}): InterfaceFavoriteViewRecoveryAuditEntryV1 {
  const auditId = sanitizeFavoriteViewAuditId(input.auditId);
  if (!auditId) throw new Error("Favorite view recovery audit ID is required.");

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    trigger: input.trigger,
    requestedFilter: sanitizeNamedInterfacePreferenceQuickFilter(
      input.requestedFilter
    ),
    resolvedFilter: sanitizeNamedInterfacePreferenceQuickFilter(
      input.resolvedFilter
    ),
    reason: typeof input.reason === "string"
      ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
      : ""
  };
}

export function prependInterfaceFavoriteViewRecoveryAuditEntry(
  entries: InterfaceFavoriteViewRecoveryAuditEntryV1[],
  entry: InterfaceFavoriteViewRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(0, MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT);
}

export function serializeInterfaceFavoriteViewRecoveryAudit(
  entries: InterfaceFavoriteViewRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format: INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceFavoriteViewRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceFavoriteViewRecoveryAuditParseResult =
  | { ok: true; audit: InterfaceFavoriteViewRecoveryAuditV1 }
  | { ok: false; error: string };

export function parseInterfaceFavoriteViewRecoveryAudit(
  input: unknown
): InterfaceFavoriteViewRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, error: "Favorite view recovery audit is not valid JSON." };
    }
  }

  if (!value || typeof value !== "object") {
    return { ok: false, error: "Favorite view recovery audit is not available." };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !== INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error: "Favorite view recovery audit format is not supported."
    };
  }

  const entries: InterfaceFavoriteViewRecoveryAuditEntryV1[] = [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return { ok: false, error: "Favorite view recovery audit contains an invalid entry." };
    }
    const item = candidate as Record<string, unknown>;
    const auditId = sanitizeFavoriteViewAuditId(item.auditId);
    const trigger = sanitizeFavoriteViewAuditTrigger(item.trigger);
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;
    if (!auditId || !trigger || !createdAt) {
      return { ok: false, error: "Favorite view recovery audit contains an invalid entry." };
    }
    entries.push(
      createInterfaceFavoriteViewRecoveryAuditEntry({
        auditId,
        createdAt,
        trigger,
        requestedFilter: sanitizeNamedInterfacePreferenceQuickFilter(
          item.requestedFilter
        ),
        resolvedFilter: sanitizeNamedInterfacePreferenceQuickFilter(
          item.resolvedFilter
        ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format: INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(0, MAX_INTERFACE_FAVORITE_VIEW_RECOVERY_AUDIT)
    }
  };
}

export type InterfaceFavoriteViewRecoveryAuditFilter =
  | "all"
  | InterfaceFavoriteViewRecoveryAuditTrigger;

export function filterInterfaceFavoriteViewRecoveryAudit(
  entries: InterfaceFavoriteViewRecoveryAuditEntryV1[],
  filter: InterfaceFavoriteViewRecoveryAuditFilter
) {
  return filter === "all"
    ? entries
    : entries.filter((entry) => entry.trigger === filter);
}

function normalizeRecoveryAuditSearchQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceFavoriteViewRecoveryAudit(
  entries: InterfaceFavoriteViewRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized = normalizeRecoveryAuditSearchQuery(query);
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.trigger,
      entry.requestedFilter,
      entry.resolvedFilter,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryAuditSearchPresetId =
  | "all"
  | "initial-load"
  | "filter-selection"
  | "last-favorite-removed"
  | "favorites";

export type InterfaceRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  triggerFilter: InterfaceFavoriteViewRecoveryAuditFilter;
  query: string;
};

export const INTERFACE_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditSearchPresetId {
  return value === "initial-load" ||
    value === "filter-selection" ||
    value === "last-favorite-removed" ||
    value === "favorites"
    ? value
    : "all";
}

export type InterfaceRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditSearchPresetRecovery {
  const presetId = sanitizeInterfaceRecoveryAuditSearchPresetId(value);
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "initial-load" ||
    value === "filter-selection" ||
    value === "last-favorite-removed" ||
    value === "favorites";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Recovery audit preset recovered to All recoveries because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-recovery-audit-preset-recovery-audit";
export const INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:recovery-audit-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryAuditPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceRecoveryAuditPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceRecoveryAuditPresetRecoveryAuditEntryV1[];
};

function sanitizeRecoveryAuditPresetRecoveryAuditId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeRecoveryAuditPresetRecoveryRequestedId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceRecoveryAuditPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceRecoveryAuditPresetRecoveryAuditEntryV1 {
  const auditId = sanitizeRecoveryAuditPresetRecoveryAuditId(input.auditId);
  if (!auditId) {
    throw new Error("Recovery audit preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId: sanitizeRecoveryAuditPresetRecoveryRequestedId(
      input.requestedPresetId
    ),
    recoveredPresetId: sanitizeInterfaceRecoveryAuditSearchPresetId(
      input.recoveredPresetId
    ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryAuditPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryAuditPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryAuditPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(0, MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT);
}

export function serializeInterfaceRecoveryAuditPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format: INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceRecoveryAuditPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceRecoveryAuditPresetRecoveryAuditParseResult =
  | { ok: true; audit: InterfaceRecoveryAuditPresetRecoveryAuditV1 }
  | { ok: false; error: string };

export function parseInterfaceRecoveryAuditPresetRecoveryAudit(
  input: unknown
): InterfaceRecoveryAuditPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "Recovery audit preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "Recovery audit preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !== INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error: "Recovery audit preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceRecoveryAuditPresetRecoveryAuditEntryV1[] = [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error: "Recovery audit preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId = sanitizeRecoveryAuditPresetRecoveryAuditId(item.auditId);
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error: "Recovery audit preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceRecoveryAuditPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId: sanitizeInterfaceRecoveryAuditSearchPresetId(
          item.recoveredPresetId
        ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format: INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT
      )
    }
  };
}


export type InterfaceRecoveryAuditPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceRecoveryAuditPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceRecoveryAuditPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeRecoveryAuditPresetRecoverySearchQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceRecoveryAuditPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized = normalizeRecoveryAuditPresetRecoverySearchQuery(query);
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceRecoveryAuditPresetRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceRecoveryAuditPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryAuditPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All preset recoveries",
    description: "Clear recovery-audit preset repair search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show recovery-audit preset repairs from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show recovery-audit preset repairs from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search preset repair evidence for the All recoveries fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search preset repair evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ?? INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:recovery-audit-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId(value);
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Recovery-audit repair search preset recovered to All preset recoveries because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-recovery-audit-repair-search-preset-recovery-audit";
export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:recovery-audit-repair-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeRecoveryAuditRepairSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditId(input.auditId);
  if (!auditId) {
    throw new Error("Recovery-audit repair search preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeRecoveryAuditRepairSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchQuery(query);
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All repair-preset recoveries",
    description: "Clear repair-preset recovery audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show repair-preset recovery events from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show repair-preset recovery events from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search repair-preset recovery evidence for the All fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search repair-preset recovery evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ??
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:recovery-audit-repair-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Repair-preset recovery audit search preset recovered to All repair-preset recoveries because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-recovery-audit-repair-preset-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:recovery-audit-repair-preset-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
      input.auditId
    );
  if (!auditId) {
    throw new Error("Repair-preset recovery audit search preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
      query
    );
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All search preset recoveries",
    description: "Clear repair search-preset recovery audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show repair search-preset recovery events from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show repair search-preset recovery events from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search repair search-preset recovery evidence for the All fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search repair search-preset recovery evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ??
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:recovery-audit-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Repair search-preset recovery audit search preset recovered to All search preset recoveries because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-recovery-audit-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:recovery-audit-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
      input.auditId
    );
  if (!auditId) {
    throw new Error(
      "Repair search-preset recovery audit search preset recovery audit search preset recovery audit ID is required."
    );
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
      query
    );
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}


export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset[] = [
  { id: "all", label: "All search preset recoveries", description: "Clear newest repair recovery search and age filtering.", ageFilter: "all", query: "" },
  { id: "recent-24h", label: "Recent 24 hours", description: "Show newest repair recovery events from the last 24 hours.", ageFilter: "24h", query: "" },
  { id: "recent-7d", label: "Recent 7 days", description: "Show newest repair recovery events from the last seven days.", ageFilter: "7d", query: "" },
  { id: "recovered-all", label: "Recovered to All", description: "Search newest repair recovery evidence for the All fallback.", ageFilter: "all", query: "all" },
  { id: "recovery-reasons", label: "Recovery reasons", description: "Search newest repair recovery evidence for recovery reason text.", ageFilter: "all", query: "recovered" }
];

export function interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ??
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:recovery-audit-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue = typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Repair search-preset recovery audit search preset recovery audit search preset recovery audit search preset recovered to All search preset recoveries because the saved preset ID is no longer supported."
    };
  }

  return { presetId, recovered: false, reason: null };
}

export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-recovery-audit-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:recovery-audit-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export function createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId = typeof input.auditId === "string" ? input.auditId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100) : "";
  if (!auditId) throw new Error("Newest repair preset recovery audit ID is required.");
  return {
    version: 1,
    auditId,
    createdAt:
      typeof input.createdAt === "number" && Number.isFinite(input.createdAt) && input.createdAt > 0
        ? Math.floor(input.createdAt)
        : Date.now(),
    requestedPresetId:
      typeof input.requestedPresetId === "string"
        ? input.requestedPresetId.replace(/\s+/g, " ").trim().slice(0, 120)
        : "",
    recoveredPresetId:
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(0, MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT);
}

export function serializeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify({
    format: INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
    version: 1,
    entries
  }, null, 2);
}

export function parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): { ok: true; audit: { format: typeof INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT; version: 1; entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] } } | { ok: false; error: string } {
  let value = input;
  if (typeof input === "string") {
    try { value = JSON.parse(input); } catch { return { ok: false, error: "Newest repair preset recovery audit is not valid JSON." }; }
  }
  if (!value || typeof value !== "object") return { ok: false, error: "Newest repair preset recovery audit is not available." };
  const record = value as Record<string, unknown>;
  if (
    record.format !== INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) return { ok: false, error: "Newest repair preset recovery audit format is not supported." };

  const entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") return { ok: false, error: "Newest repair preset recovery audit contains an invalid entry." };
    const item = candidate as Record<string, unknown>;
    if (typeof item.auditId !== "string" || typeof item.createdAt !== "number") return { ok: false, error: "Newest repair preset recovery audit contains an invalid entry." };
    entries.push(createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: item.auditId,
      createdAt: item.createdAt,
      requestedPresetId: typeof item.requestedPresetId === "string" ? item.requestedPresetId : "",
      recoveredPresetId: sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(item.recoveredPresetId),
      reason: typeof item.reason === "string" ? item.reason : ""
    }));
  }
  return {
    ok: true,
    audit: {
      format: INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(0, MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT)
    }
  };
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Repair search-preset recovery audit search preset recovery audit search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Repair search-preset recovery audit search preset recovery audit search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Repair search-preset recovery audit search preset recovery audit search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Repair search-preset recovery audit search preset recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
        item.auditId
      );
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Repair search-preset recovery audit search preset recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Repair-preset recovery audit search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Repair-preset recovery audit search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Repair-preset recovery audit search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Repair-preset recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
        item.auditId
      );
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Repair-preset recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
  input: unknown
): InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Recovery-audit repair search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Recovery-audit repair search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Recovery-audit repair search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Recovery-audit repair search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeRecoveryAuditRepairSearchPresetRecoveryAuditId(item.auditId);
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Recovery-audit repair search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export const INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All recoveries",
    description: "Clear audit search and show every retained recovery event.",
    triggerFilter: "all",
    query: ""
  },
  {
    id: "initial-load",
    label: "Initial load",
    description: "Show recoveries that occurred while persisted browser state was loading.",
    triggerFilter: "initial-load",
    query: ""
  },
  {
    id: "filter-selection",
    label: "Filter selection",
    description: "Show recoveries caused by selecting Favorites when no favorites remained.",
    triggerFilter: "filter-selection",
    query: ""
  },
  {
    id: "last-favorite-removed",
    label: "Last favorite removed",
    description: "Show recoveries caused by removing the final favorite while Favorites was active.",
    triggerFilter: "last-favorite-removed",
    query: ""
  },
  {
    id: "favorites",
    label: "Favorites mentions",
    description: "Search all retained recovery evidence for references to favorites.",
    triggerFilter: "all",
    query: "favorites"
  }
];

export function interfaceRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ?? INTERFACE_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_FORMAT =
  "ai-data-platform-recovery-snapshot-renewal-receipt";
export const INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_STORAGE_KEY =
  "ai-data-platform:recovery-snapshot-renewal-receipt:v1";

export type InterfacePreferenceRecoveryRenewalReceiptV1 = {
  format: typeof INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_FORMAT;
  version: 1;
  receiptId: string;
  createdAt: number;
  previousCapturedAt: number | null;
  renewedCapturedAt: number;
  previousFreshness: InterfacePreferenceRecoverySnapshotFreshnessStatus;
  profileCount: number;
  favoriteCount: number;
};

function sanitizeRecoveryRenewalReceiptId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

export function createInterfacePreferenceRecoveryRenewalReceipt(input: {
  receiptId: string;
  createdAt?: number;
  previousSnapshot: InterfacePreferenceRecoverySnapshotV1;
  renewedSnapshot: InterfacePreferenceRecoverySnapshotV1;
}): InterfacePreferenceRecoveryRenewalReceiptV1 {
  const receiptId = sanitizeRecoveryRenewalReceiptId(input.receiptId);
  if (!receiptId) {
    throw new Error("Recovery snapshot renewal receipt ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();
  const renewedCapturedAt =
    input.renewedSnapshot.capturedAt !== null &&
    Number.isFinite(input.renewedSnapshot.capturedAt) &&
    input.renewedSnapshot.capturedAt > 0
      ? input.renewedSnapshot.capturedAt
      : createdAt;
  const renewedProfiles = sanitizeNamedInterfacePreferenceProfiles(
    input.renewedSnapshot.namedProfiles
  );

  return {
    format: INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_FORMAT,
    version: 1,
    receiptId,
    createdAt,
    previousCapturedAt: input.previousSnapshot.capturedAt,
    renewedCapturedAt,
    previousFreshness: interfacePreferenceRecoverySnapshotFreshness(
      input.previousSnapshot,
      createdAt
    ).status,
    profileCount: renewedProfiles.length,
    favoriteCount: renewedProfiles.filter((profile) => profile.favorite).length
  };
}

export function serializeInterfacePreferenceRecoveryRenewalReceipt(
  receipt: InterfacePreferenceRecoveryRenewalReceiptV1
) {
  return JSON.stringify(receipt, null, 2);
}

export type InterfacePreferenceRecoveryRenewalReceiptParseResult =
  | { ok: true; receipt: InterfacePreferenceRecoveryRenewalReceiptV1 }
  | { ok: false; error: string };

export function parseInterfacePreferenceRecoveryRenewalReceipt(
  input: unknown
): InterfacePreferenceRecoveryRenewalReceiptParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "Recovery snapshot renewal receipt is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "Recovery snapshot renewal receipt is not available."
    };
  }

  const record = value as Record<string, unknown>;
  const receiptId = sanitizeRecoveryRenewalReceiptId(record.receiptId);
  const createdAt =
    typeof record.createdAt === "number" &&
    Number.isFinite(record.createdAt) &&
    record.createdAt > 0
      ? record.createdAt
      : 0;
  const previousCapturedAt =
    record.previousCapturedAt === null
      ? null
      : typeof record.previousCapturedAt === "number" &&
          Number.isFinite(record.previousCapturedAt) &&
          record.previousCapturedAt > 0
        ? record.previousCapturedAt
        : -1;
  const renewedCapturedAt =
    typeof record.renewedCapturedAt === "number" &&
    Number.isFinite(record.renewedCapturedAt) &&
    record.renewedCapturedAt > 0
      ? record.renewedCapturedAt
      : 0;
  const previousFreshness =
    record.previousFreshness === "unknown" ||
    record.previousFreshness === "fresh" ||
    record.previousFreshness === "aging" ||
    record.previousFreshness === "stale" ||
    record.previousFreshness === "expired"
      ? record.previousFreshness
      : null;
  const profileCount =
    typeof record.profileCount === "number" &&
    Number.isInteger(record.profileCount) &&
    record.profileCount >= 0 &&
    record.profileCount <= MAX_NAMED_INTERFACE_PROFILES
      ? record.profileCount
      : -1;
  const favoriteCount =
    typeof record.favoriteCount === "number" &&
    Number.isInteger(record.favoriteCount) &&
    record.favoriteCount >= 0 &&
    record.favoriteCount <= profileCount
      ? record.favoriteCount
      : -1;

  if (
    record.format !== INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_FORMAT ||
    record.version !== 1 ||
    !receiptId ||
    !createdAt ||
    previousCapturedAt === -1 ||
    !renewedCapturedAt ||
    !previousFreshness ||
    profileCount < 0 ||
    favoriteCount < 0
  ) {
    return {
      ok: false,
      error: "Recovery snapshot renewal receipt is incomplete or invalid."
    };
  }

  return {
    ok: true,
    receipt: {
      format: INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_FORMAT,
      version: 1,
      receiptId,
      createdAt,
      previousCapturedAt,
      renewedCapturedAt,
      previousFreshness,
      profileCount,
      favoriteCount
    }
  };
}


export const INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_FORMAT =
  "ai-data-platform-recovery-snapshot-renewal-receipt-history";
export const INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_STORAGE_KEY =
  "ai-data-platform:recovery-snapshot-renewal-receipt-history:v1";
export const MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY = 10;

export type InterfacePreferenceRecoveryRenewalReceiptHistoryV1 = {
  format: typeof INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_FORMAT;
  version: 1;
  receipts: InterfacePreferenceRecoveryRenewalReceiptV1[];
};

export function createInterfacePreferenceRecoveryRenewalReceiptHistory(
  receipts: InterfacePreferenceRecoveryRenewalReceiptV1[]
): InterfacePreferenceRecoveryRenewalReceiptHistoryV1 {
  const result: InterfacePreferenceRecoveryRenewalReceiptV1[] = [];
  const seen = new Set<string>();

  for (const candidate of receipts) {
    const parsed = parseInterfacePreferenceRecoveryRenewalReceipt(candidate);
    if (!parsed.ok || seen.has(parsed.receipt.receiptId)) continue;
    result.push(parsed.receipt);
    seen.add(parsed.receipt.receiptId);
    if (
      result.length >=
      MAX_INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY
    ) {
      break;
    }
  }

  return {
    format: INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_FORMAT,
    version: 1,
    receipts: result
  };
}

export function prependInterfacePreferenceRecoveryRenewalReceipt(
  history: InterfacePreferenceRecoveryRenewalReceiptV1[],
  receipt: InterfacePreferenceRecoveryRenewalReceiptV1
) {
  return createInterfacePreferenceRecoveryRenewalReceiptHistory([
    receipt,
    ...history.filter((item) => item.receiptId !== receipt.receiptId)
  ]).receipts;
}

export function serializeInterfacePreferenceRecoveryRenewalReceiptHistory(
  receipts: InterfacePreferenceRecoveryRenewalReceiptV1[]
) {
  return JSON.stringify(
    createInterfacePreferenceRecoveryRenewalReceiptHistory(receipts),
    null,
    2
  );
}

export type InterfacePreferenceRecoveryRenewalReceiptHistoryParseResult =
  | {
      ok: true;
      history: InterfacePreferenceRecoveryRenewalReceiptHistoryV1;
    }
  | { ok: false; error: string };

export function parseInterfacePreferenceRecoveryRenewalReceiptHistory(
  input: unknown
): InterfacePreferenceRecoveryRenewalReceiptHistoryParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "Recovery snapshot renewal receipt history is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "Recovery snapshot renewal receipt history is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_PREFERENCE_RECOVERY_RENEWAL_RECEIPT_HISTORY_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.receipts)
  ) {
    return {
      ok: false,
      error: "Recovery snapshot renewal receipt history format is not supported."
    };
  }

  const receipts: InterfacePreferenceRecoveryRenewalReceiptV1[] = [];
  for (const candidate of record.receipts) {
    const parsed = parseInterfacePreferenceRecoveryRenewalReceipt(candidate);
    if (!parsed.ok) {
      return {
        ok: false,
        error:
          "Recovery snapshot renewal receipt history contains an invalid receipt."
      };
    }
    receipts.push(parsed.receipt);
  }

  return {
    ok: true,
    history: createInterfacePreferenceRecoveryRenewalReceiptHistory(receipts)
  };
}


export type InterfacePreferenceRecoveryRenewalHistoryFreshnessFilter =
  | "all"
  | InterfacePreferenceRecoverySnapshotFreshnessStatus;

export function filterInterfacePreferenceRecoveryRenewalReceiptHistory(
  receipts: InterfacePreferenceRecoveryRenewalReceiptV1[],
  previousFreshness: InterfacePreferenceRecoveryRenewalHistoryFreshnessFilter
) {
  return previousFreshness === "all"
    ? receipts
    : receipts.filter(
        (receipt) => receipt.previousFreshness === previousFreshness
      );
}

function normalizeRecoveryRenewalHistorySearchQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfacePreferenceRecoveryRenewalReceiptHistory(
  receipts: InterfacePreferenceRecoveryRenewalReceiptV1[],
  query: unknown
) {
  const normalized = normalizeRecoveryRenewalHistorySearchQuery(query);
  if (!normalized) return receipts;

  return receipts.filter((receipt) => {
    const haystack = [
      receipt.receiptId,
      receipt.previousFreshness,
      receipt.previousFreshness === "unknown" ? "legacy unknown" : "",
      String(receipt.profileCount) + " profiles",
      String(receipt.favoriteCount) + " favorites"
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryRenewalHistorySearchPresetId =
  | "all"
  | "expired"
  | "stale"
  | "legacy"
  | "favorites";

export type InterfaceRecoveryRenewalHistorySearchPreset = {
  id: InterfaceRecoveryRenewalHistorySearchPresetId;
  label: string;
  description: string;
  freshnessFilter: InterfacePreferenceRecoveryRenewalHistoryFreshnessFilter;
  query: string;
};

export const INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:recovery-renewal-history-search-preset:v1";

export function sanitizeInterfaceRecoveryRenewalHistorySearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalHistorySearchPresetId {
  return value === "expired" ||
    value === "stale" ||
    value === "legacy" ||
    value === "favorites"
    ? value
    : "all";
}

export type InterfaceRecoveryRenewalHistorySearchPresetRecovery = {
  presetId: InterfaceRecoveryRenewalHistorySearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryRenewalHistorySearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalHistorySearchPresetRecovery {
  const presetId = sanitizeInterfaceRecoveryRenewalHistorySearchPresetId(value);
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "expired" ||
    value === "stale" ||
    value === "legacy" ||
    value === "favorites";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Renewal history search preset recovered to All renewals because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-recovery-renewal-search-preset-recovery-audit";
export const INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:recovery-renewal-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryRenewalHistorySearchPresetId;
  reason: string;
};

export type InterfaceRecoveryRenewalSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeRecoveryRenewalSearchPresetRecoveryAuditId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeRecoveryRenewalSearchPresetRecoveryRequestedId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryRenewalHistorySearchPresetId;
  reason: string;
}): InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1 {
  const auditId = sanitizeRecoveryRenewalSearchPresetRecoveryAuditId(
    input.auditId
  );
  if (!auditId) {
    throw new Error("Renewal search preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId: sanitizeRecoveryRenewalSearchPresetRecoveryRequestedId(
      input.requestedPresetId
    ),
    recoveredPresetId:
      sanitizeInterfaceRecoveryRenewalHistorySearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format: INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceRecoveryRenewalSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceRecoveryRenewalSearchPresetRecoveryAuditParseResult =
  | { ok: true; audit: InterfaceRecoveryRenewalSearchPresetRecoveryAuditV1 }
  | { ok: false; error: string };

export function parseInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
  input: unknown
): InterfaceRecoveryRenewalSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "Renewal search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "Renewal search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error: "Renewal search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[] =
    [];

  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error: "Renewal search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId = sanitizeRecoveryRenewalSearchPresetRecoveryAuditId(
      item.auditId
    );
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error: "Renewal search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceRecoveryRenewalHistorySearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export type InterfaceRecoveryRenewalSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceRecoveryRenewalSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeRecoveryRenewalSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeRecoveryRenewalSearchPresetRecoveryAuditSearchQuery(query);
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceRecoveryRenewalSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All recovery events",
    description: "Clear renewal-preset recovery audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show renewal-preset recoveries from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show renewal-preset recoveries from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search renewal-preset recovery evidence for the All renewals fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search renewal-preset recovery evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ?? INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:renewal-recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Renewal recovery audit search preset recovered to All recovery events because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-renewal-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:renewal-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeRecoveryRenewalAuditSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditId(input.auditId);
  if (!auditId) {
    throw new Error("Renewal recovery-audit search preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeRecoveryRenewalAuditSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchQuery(query);
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All preset recoveries",
    description: "Clear renewal preset-recovery audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show renewal preset-recovery audit events from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show renewal preset-recovery audit events from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search renewal preset-recovery evidence for the All recovery fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search renewal preset-recovery evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ??
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:renewal-recovery-audit-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Renewal preset-recovery audit search preset recovered to All preset recoveries because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-renewal-recovery-audit-preset-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:renewal-recovery-audit-preset-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
      input.auditId
    );
  if (!auditId) {
    throw new Error("Renewal preset-recovery audit search preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
      query
    );
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All preset recoveries",
    description: "Clear renewal preset-recovery audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show renewal preset-recovery audit search-preset recovery events from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show renewal preset-recovery audit search-preset recovery events from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search renewal search-preset recovery evidence for the All recovery fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search renewal search-preset recovery evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ??
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:renewal-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Renewal search-preset recovery audit search preset recovered to All preset recoveries because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-renewal-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:renewal-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
      input.auditId
    );
  if (!auditId) {
    throw new Error(
      "Renewal search-preset recovery audit search preset recovery audit search preset recovery audit ID is required."
    );
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}


export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;
  const maxAge = ageFilter === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
      query
    );
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset[] = [
  { id: "all", label: "All preset recoveries", description: "Clear newest renewal recovery audit search and age filtering.", ageFilter: "all", query: "" },
  { id: "recent-24h", label: "Recent 24 hours", description: "Show newest renewal recovery events from the last 24 hours.", ageFilter: "24h", query: "" },
  { id: "recent-7d", label: "Recent 7 days", description: "Show newest renewal recovery events from the last seven days.", ageFilter: "7d", query: "" },
  { id: "recovered-all", label: "Recovered to All", description: "Search newest renewal recovery evidence for the All fallback.", ageFilter: "all", query: "all" },
  { id: "recovery-reasons", label: "Recovery reasons", description: "Search newest renewal recovery evidence for recovery reason text.", ageFilter: "all", query: "recovered" }
];

export function interfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ??
    INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:renewal-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Renewal search-preset recovery audit search preset recovery audit search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Renewal search-preset recovery audit search preset recovery audit search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Renewal search-preset recovery audit search preset recovery audit search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Renewal search-preset recovery audit search preset recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
        item.auditId
      );
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Renewal search-preset recovery audit search preset recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Renewal preset-recovery audit search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Renewal preset-recovery audit search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Renewal preset-recovery audit search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Renewal preset-recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
        item.auditId
      );
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Renewal preset-recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Renewal recovery-audit search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Renewal recovery-audit search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Renewal recovery-audit search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Renewal recovery-audit search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeRecoveryRenewalAuditSearchPresetRecoveryAuditId(item.auditId);
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Renewal recovery-audit search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export const INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS: InterfaceRecoveryRenewalHistorySearchPreset[] = [
  {
    id: "all",
    label: "All renewals",
    description: "Clear renewal-history search and freshness filtering.",
    freshnessFilter: "all",
    query: ""
  },
  {
    id: "expired",
    label: "Expired prior",
    description: "Show renewals whose previous recovery point was outside the 30-day guidance window.",
    freshnessFilter: "expired",
    query: ""
  },
  {
    id: "stale",
    label: "Stale prior",
    description: "Show renewals whose previous recovery point was stale.",
    freshnessFilter: "stale",
    query: ""
  },
  {
    id: "legacy",
    label: "Legacy prior",
    description: "Show renewals whose previous recovery point had unknown legacy freshness.",
    freshnessFilter: "unknown",
    query: ""
  },
  {
    id: "favorites",
    label: "Favorites count",
    description: "Search all renewal receipts for favorite-count evidence.",
    freshnessFilter: "all",
    query: "favorites"
  }
];

export function interfaceRecoveryRenewalHistorySearchPresetById(
  id: InterfaceRecoveryRenewalHistorySearchPresetId
) {
  return (
    INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ?? INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS[0]
  );
}

function normalizeReceiptHistorySearchQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfacePreferenceBundleImportReceiptHistory(
  receipts: InterfacePreferenceBundleImportReceiptV1[],
  query: unknown
) {
  const normalized = normalizeReceiptHistorySearchQuery(query);
  if (!normalized) return receipts;

  return receipts.filter((receipt) => {
    const haystack = [
      receipt.receiptId,
      receipt.sourceName,
      receipt.strategy,
      ...receipt.selectedNames,
      ...receipt.reconciliation.deviations,
      receipt.reconciliation.matchesPlan ? "matched" : "deviated"
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfacePreferenceReceiptSearchPresetId =
  | "all"
  | "deviations"
  | "replacements"
  | "keep-both"
  | "capacity";

export type InterfacePreferenceReceiptSearchPreset = {
  id: InterfacePreferenceReceiptSearchPresetId;
  label: string;
  description: string;
  outcomeFilter: InterfacePreferenceReceiptHistoryOutcomeFilter;
  strategyFilter: InterfacePreferenceReceiptHistoryStrategyFilter;
  query: string;
};

export const INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:receipt-search-preset:v1";

export function sanitizeInterfacePreferenceReceiptSearchPresetId(
  value: unknown
): InterfacePreferenceReceiptSearchPresetId {
  return value === "deviations" ||
    value === "replacements" ||
    value === "keep-both" ||
    value === "capacity"
    ? value
    : "all";
}

export type InterfacePreferenceReceiptSearchPresetRecovery = {
  presetId: InterfacePreferenceReceiptSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfacePreferenceReceiptSearchPresetId(
  value: unknown
): InterfacePreferenceReceiptSearchPresetRecovery {
  const presetId = sanitizeInterfacePreferenceReceiptSearchPresetId(value);
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "deviations" ||
    value === "replacements" ||
    value === "keep-both" ||
    value === "capacity";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Receipt search preset recovered to All receipts because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-receipt-preset-recovery-audit";
export const INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:receipt-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceReceiptPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfacePreferenceReceiptSearchPresetId;
  reason: string;
};

export type InterfaceReceiptPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceReceiptPresetRecoveryAuditEntryV1[];
};

function sanitizeReceiptPresetRecoveryAuditId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeReceiptPresetRecoveryRequestedId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceReceiptPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfacePreferenceReceiptSearchPresetId;
  reason: string;
}): InterfaceReceiptPresetRecoveryAuditEntryV1 {
  const auditId = sanitizeReceiptPresetRecoveryAuditId(input.auditId);
  if (!auditId) throw new Error("Receipt preset recovery audit ID is required.");

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId: sanitizeReceiptPresetRecoveryRequestedId(
      input.requestedPresetId
    ),
    recoveredPresetId: sanitizeInterfacePreferenceReceiptSearchPresetId(
      input.recoveredPresetId
    ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceReceiptPresetRecoveryAuditEntry(
  entries: InterfaceReceiptPresetRecoveryAuditEntryV1[],
  entry: InterfaceReceiptPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(0, MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT);
}

export function serializeInterfaceReceiptPresetRecoveryAudit(
  entries: InterfaceReceiptPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format: INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceReceiptPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceReceiptPresetRecoveryAuditParseResult =
  | { ok: true; audit: InterfaceReceiptPresetRecoveryAuditV1 }
  | { ok: false; error: string };

export function parseInterfaceReceiptPresetRecoveryAudit(
  input: unknown
): InterfaceReceiptPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "Receipt preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "Receipt preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !== INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error: "Receipt preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceReceiptPresetRecoveryAuditEntryV1[] = [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error: "Receipt preset recovery audit contains an invalid entry."
      };
    }
    const item = candidate as Record<string, unknown>;
    const auditId = sanitizeReceiptPresetRecoveryAuditId(item.auditId);
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;
    if (!auditId || !createdAt) {
      return {
        ok: false,
        error: "Receipt preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceReceiptPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId: sanitizeInterfacePreferenceReceiptSearchPresetId(
          item.recoveredPresetId
        ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format: INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(0, MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT)
    }
  };
}


export type InterfaceReceiptPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceReceiptPresetRecoveryAudit(
  entries: InterfaceReceiptPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceReceiptPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;
  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeReceiptPresetRecoveryAuditSearchQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceReceiptPresetRecoveryAudit(
  entries: InterfaceReceiptPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized = normalizeReceiptPresetRecoveryAuditSearchQuery(query);
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceReceiptPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceReceiptPresetRecoveryAuditSearchPreset = {
  id: InterfaceReceiptPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceReceiptPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceReceiptPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All recovery events",
    description: "Clear receipt-recovery audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show receipt-preset recoveries from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show receipt-preset recoveries from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search receipt-preset recovery evidence for the All receipts fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search receipt-preset recovery evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceReceiptPresetRecoveryAuditSearchPresetById(
  id: InterfaceReceiptPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ?? INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:receipt-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceReceiptPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceReceiptPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceReceiptPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceReceiptPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceReceiptPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId(value);
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Receipt recovery audit search preset recovered to All recovery events because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-receipt-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:receipt-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceReceiptPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeReceiptRecoveryAuditSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceReceiptPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditId(input.auditId);
  if (!auditId) {
    throw new Error("Receipt recovery audit search preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeReceiptRecoveryAuditSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Receipt recovery audit search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Receipt recovery audit search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Receipt recovery audit search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Receipt recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditId(item.auditId);
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Receipt recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchQuery(query);
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All preset repairs",
    description: "Clear receipt preset-repair audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show receipt preset-repair audit events from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show receipt preset-repair audit events from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search receipt preset-repair evidence for the All recovery fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search receipt preset-repair evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ?? INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:receipt-recovery-audit-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Receipt preset-repair audit search preset recovered to All preset repairs because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:receipt-recovery-audit-preset-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
      input.auditId
    );
  if (!auditId) {
    throw new Error("Receipt preset-repair audit search preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
      query
    );
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All recoveries",
    description: "Clear receipt search-preset recovery audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show receipt search-preset recovery audit events from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show receipt search-preset recovery audit events from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search receipt search-preset recovery evidence for the All fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search receipt search-preset recovery evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ??
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue =
    typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Receipt search-preset recovery audit search preset recovered to All recoveries because the saved preset ID is no longer supported."
    };
  }

  return {
    presetId,
    recovered: false,
    reason: null
  };
}

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

function sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
      input.auditId
    );
  if (!auditId) {
    throw new Error("Receipt search-preset recovery audit search preset recovery audit ID is required.");
  }

  const createdAt =
    typeof input.createdAt === "number" &&
    Number.isFinite(input.createdAt) &&
    input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return {
    version: 1,
    auditId,
    createdAt,
    requestedPresetId:
      sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryRequestedId(
        input.requestedPresetId
      ),
    recoveredPresetId:
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;

  const maxAge =
    ageFilter === "24h"
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}

function normalizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100);
}

export function searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  query: unknown
) {
  const normalized =
    normalizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchQuery(
      query
    );
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.auditId,
      entry.requestedPresetId,
      entry.recoveredPresetId,
      entry.reason
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalized);
  });
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId =
  | "all"
  | "recent-24h"
  | "recent-7d"
  | "recovered-all"
  | "recovery-reasons";

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset = {
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  label: string;
  description: string;
  ageFilter: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter;
  query: string;
};

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset[] = [
  {
    id: "all",
    label: "All recoveries",
    description: "Clear receipt search-preset recovery audit search and age filtering.",
    ageFilter: "all",
    query: ""
  },
  {
    id: "recent-24h",
    label: "Recent 24 hours",
    description: "Show receipt search-preset recovery audit events from the last 24 hours.",
    ageFilter: "24h",
    query: ""
  },
  {
    id: "recent-7d",
    label: "Recent 7 days",
    description: "Show receipt search-preset recovery audit events from the last seven days.",
    ageFilter: "7d",
    query: ""
  },
  {
    id: "recovered-all",
    label: "Recovered to All",
    description: "Search receipt search-preset recovery evidence for the All fallback.",
    ageFilter: "all",
    query: "all"
  },
  {
    id: "recovery-reasons",
    label: "Recovery reasons",
    description: "Search receipt search-preset recovery evidence for recovery reason text.",
    ageFilter: "all",
    query: "recovered"
  }
];

export function interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
  id: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
) {
  return (
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ??
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS[0]
  );
}


export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY =
  "ai-data-platform:receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset:v1";

export function sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId {
  return value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons"
    ? value
    : "all";
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery = {
  presetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  recovered: boolean;
  reason: string | null;
};

export function recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
  value: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery {
  const presetId =
    sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      value
    );
  const hasStoredValue = typeof value === "string" && value.trim().length > 0;
  const isValidStoredValue =
    value === "all" ||
    value === "recent-24h" ||
    value === "recent-7d" ||
    value === "recovered-all" ||
    value === "recovery-reasons";

  if (hasStoredValue && !isValidStoredValue) {
    return {
      presetId: "all",
      recovered: true,
      reason:
        "Receipt search-preset recovery audit search preset recovery audit search preset recovery audit search preset recovered to All recoveries because the saved preset ID is no longer supported."
    };
  }

  return { presetId, recovered: false, reason: null };
}

export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT =
  "ai-data-platform-receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit";
export const INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY =
  "ai-data-platform:receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit:v1";
export const MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT = 10;

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 = {
  version: 1;
  auditId: string;
  createdAt: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
};

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1 = {
  format: typeof INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT;
  version: 1;
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[];
};

function sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
  value: unknown
) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

export function createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(input: {
  auditId: string;
  createdAt?: number;
  requestedPresetId: string;
  recoveredPresetId: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId;
  reason: string;
}): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1 {
  const auditId =
    sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
      input.auditId
    );
  if (!auditId) throw new Error("Newest receipt preset recovery audit ID is required.");

  return {
    version: 1,
    auditId,
    createdAt:
      typeof input.createdAt === "number" && Number.isFinite(input.createdAt) && input.createdAt > 0
        ? Math.floor(input.createdAt)
        : Date.now(),
    requestedPresetId:
      typeof input.requestedPresetId === "string"
        ? input.requestedPresetId.replace(/\s+/g, " ").trim().slice(0, 120)
        : "",
    recoveredPresetId:
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        input.recoveredPresetId
      ),
    reason:
      typeof input.reason === "string"
        ? input.reason.replace(/\s+/g, " ").trim().slice(0, 240)
        : ""
  };
}

export function prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  entry: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
) {
  const next = [entry, ...entries].filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.auditId === candidate.auditId) === index
  );
  return next.slice(
    0,
    MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
  );
}

export function serializeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[]
) {
  return JSON.stringify(
    {
      format:
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries
    } satisfies InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1,
    null,
    2
  );
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter =
  | "all"
  | "24h"
  | "7d";

export function filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[],
  ageFilter: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter,
  now: number = Date.now()
) {
  if (ageFilter === "all") return entries;
  const maxAge = ageFilter === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => {
    const age = now - entry.createdAt;
    return age >= 0 && age <= maxAge;
  });
}


export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult =
  | { ok: true; audit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1 }
  | { ok: false; error: string };

export function parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, error: "Newest receipt preset recovery audit is not valid JSON." };
    }
  }

  if (!value || typeof value !== "object") {
    return { ok: false, error: "Newest receipt preset recovery audit is not available." };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return { ok: false, error: "Newest receipt preset recovery audit format is not supported." };
  }

  const entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return { ok: false, error: "Newest receipt preset recovery audit contains an invalid entry." };
    }
    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
        item.auditId
      );
    const createdAt =
      typeof item.createdAt === "number" && Number.isFinite(item.createdAt) && item.createdAt > 0
        ? item.createdAt
        : 0;
    if (!auditId || !createdAt) {
      return { ok: false, error: "Newest receipt preset recovery audit contains an invalid entry." };
    }
    entries.push(
      createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId: typeof item.requestedPresetId === "string" ? item.requestedPresetId : "",
        recoveredPresetId:
          sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Receipt search-preset recovery audit search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Receipt search-preset recovery audit search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Receipt search-preset recovery audit search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Receipt search-preset recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
        item.auditId
      );
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Receipt search-preset recovery audit search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult =
  | {
      ok: true;
      audit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditV1;
    }
  | { ok: false; error: string };

export function parseInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
  input: unknown
): InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error:
          "Receipt preset-repair audit search preset recovery audit is not valid JSON."
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error:
        "Receipt preset-repair audit search preset recovery audit is not available."
    };
  }

  const record = value as Record<string, unknown>;
  if (
    record.format !==
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT ||
    record.version !== 1 ||
    !Array.isArray(record.entries)
  ) {
    return {
      ok: false,
      error:
        "Receipt preset-repair audit search preset recovery audit format is not supported."
    };
  }

  const entries: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    [];
  for (const candidate of record.entries) {
    if (!candidate || typeof candidate !== "object") {
      return {
        ok: false,
        error:
          "Receipt preset-repair audit search preset recovery audit contains an invalid entry."
      };
    }

    const item = candidate as Record<string, unknown>;
    const auditId =
      sanitizeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditId(
        item.auditId
      );
    const createdAt =
      typeof item.createdAt === "number" &&
      Number.isFinite(item.createdAt) &&
      item.createdAt > 0
        ? item.createdAt
        : 0;

    if (!auditId || !createdAt) {
      return {
        ok: false,
        error:
          "Receipt preset-repair audit search preset recovery audit contains an invalid entry."
      };
    }

    entries.push(
      createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
        auditId,
        createdAt,
        requestedPresetId:
          typeof item.requestedPresetId === "string"
            ? item.requestedPresetId
            : "",
        recoveredPresetId:
          sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
            item.recoveredPresetId
          ),
        reason: typeof item.reason === "string" ? item.reason : ""
      })
    );
  }

  return {
    ok: true,
    audit: {
      format:
        INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
      version: 1,
      entries: entries.slice(
        0,
        MAX_INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT
      )
    }
  };
}

export const INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS: InterfacePreferenceReceiptSearchPreset[] = [
  {
    id: "all",
    label: "All receipts",
    description: "Clear receipt search and show every stored reconciliation receipt.",
    outcomeFilter: "all",
    strategyFilter: "all",
    query: ""
  },
  {
    id: "deviations",
    label: "Deviations",
    description: "Show only receipts where the actual import differed from the plan.",
    outcomeFilter: "deviated",
    strategyFilter: "all",
    query: ""
  },
  {
    id: "replacements",
    label: "Replacements",
    description: "Show imports completed with the Replace conflict strategy.",
    outcomeFilter: "all",
    strategyFilter: "replace",
    query: ""
  },
  {
    id: "keep-both",
    label: "Keep both",
    description: "Show imports completed with the Keep both conflict strategy.",
    outcomeFilter: "all",
    strategyFilter: "keep-both",
    query: ""
  },
  {
    id: "capacity",
    label: "Capacity",
    description: "Search receipt evidence for capacity-related reconciliation details.",
    outcomeFilter: "all",
    strategyFilter: "all",
    query: "capacity"
  }
];

export function interfacePreferenceReceiptSearchPresetById(
  id: InterfacePreferenceReceiptSearchPresetId
) {
  return (
    INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS.find(
      (preset) => preset.id === id
    ) ?? INTERFACE_PREFERENCE_RECEIPT_SEARCH_PRESETS[0]
  );
}

export type InterfacePreferenceReceiptHistoryOutcomeFilter =
  | "all"
  | "matched"
  | "deviated";
export type InterfacePreferenceReceiptHistoryStrategyFilter =
  | "all"
  | InterfacePreferenceBundleConflictStrategy;

export function filterInterfacePreferenceBundleImportReceiptHistory(
  receipts: InterfacePreferenceBundleImportReceiptV1[],
  outcomeFilter: InterfacePreferenceReceiptHistoryOutcomeFilter,
  strategyFilter: InterfacePreferenceReceiptHistoryStrategyFilter
) {
  return receipts.filter((receipt) => {
    const outcomeMatches =
      outcomeFilter === "all" ||
      (outcomeFilter === "matched" && receipt.reconciliation.matchesPlan) ||
      (outcomeFilter === "deviated" && !receipt.reconciliation.matchesPlan);
    const strategyMatches =
      strategyFilter === "all" || receipt.strategy === strategyFilter;
    return outcomeMatches && strategyMatches;
  });
}
