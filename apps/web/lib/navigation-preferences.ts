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
