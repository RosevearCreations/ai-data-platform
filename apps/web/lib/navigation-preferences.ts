export const INTERFACE_PREFERENCES_STORAGE_KEY =
  "ai-data-platform:interface-preferences:v1";
export const INTERFACE_PREFERENCES_EVENT =
  "ai-data-platform:interface-preferences";

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

export function defaultInterfacePreferences(): InterfacePreferences {
  return {
    version: 1,
    navigationDensity: "adaptive",
    workspaceLayout: "balanced",
    recommendations: "all"
  };
}

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
