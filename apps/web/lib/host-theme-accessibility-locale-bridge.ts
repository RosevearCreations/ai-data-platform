import type { HostRuntimeContext } from "./universal-module-contract";

export const HOST_PRESENTATION_BRIDGE_VERSION = "1.0.0" as const;
export const HOST_PRESENTATION_BRIDGE_SCHEMA =
  "rosevear.ai-data-platform.host-presentation-bridge.v1" as const;
export const ACCESSIBLE_DIALOG_CONTRACT_SCHEMA =
  "rosevear.ai-data-platform.accessible-dialog-contract.v1" as const;

export const HOST_THEME_PREFERENCES = ["light", "dark", "system"] as const;
export const HOST_DENSITIES = ["compact", "comfortable", "spacious"] as const;
export const REDUCED_MOTION_PREFERENCES = ["reduce", "no-preference"] as const;
export const FORCED_COLORS_STATES = ["active", "none"] as const;

export type HostThemePreference = (typeof HOST_THEME_PREFERENCES)[number];
export type HostDensity = (typeof HOST_DENSITIES)[number];
export type ReducedMotionPreference =
  (typeof REDUCED_MOTION_PREFERENCES)[number];
export type ForcedColorsState = (typeof FORCED_COLORS_STATES)[number];

export type HostDesignTokens = {
  colorBackground?: string;
  colorSurface?: string;
  colorText?: string;
  colorMutedText?: string;
  colorBorder?: string;
  colorAccent?: string;
  colorDanger?: string;
  colorWarning?: string;
  colorSuccess?: string;
  radiusPx?: number;
  spacingUnitPx?: number;
  focusRingWidthPx?: number;
};

export type HostTypographyPreferences = {
  family: "system-ui" | "sans-serif" | "serif" | "monospace";
  scale: number;
  lineHeight: number;
};

export type HostPresentationBridgeInput = {
  theme: HostThemePreference;
  systemResolvedTheme?: "light" | "dark";
  density: HostDensity;
  typography: HostTypographyPreferences;
  designTokens?: HostDesignTokens;
  reducedMotion: ReducedMotionPreference;
  forcedColors: ForcedColorsState;
  locale: string;
  timeZone: string;
};

export type SafeHostDesignTokens = Required<HostDesignTokens>;

export type HostPresentationBridgeResult = {
  schema: typeof HOST_PRESENTATION_BRIDGE_SCHEMA;
  version: typeof HOST_PRESENTATION_BRIDGE_VERSION;
  theme: {
    preference: HostThemePreference;
    effective: "light" | "dark";
  };
  density: HostDensity;
  typography: HostTypographyPreferences;
  designTokens: SafeHostDesignTokens;
  cssVariables: Readonly<Record<string, string>>;
  accessibility: {
    reducedMotion: ReducedMotionPreference;
    forcedColors: ForcedColorsState;
    motionDurationMs: number;
    hostColorsSuppressedByForcedColors: boolean;
    keyboardNavigationRequired: true;
    visibleFocusRequired: true;
  };
  locale: {
    requested: string;
    canonical: string;
    timeZone: string;
  };
  security: {
    rawCssAccepted: false;
    arbitrarySelectorsAccepted: false;
    securityStatesStyleable: false;
    approvalStatesStyleable: false;
    stylingGrantsAuthorization: false;
  };
};

export type FocusBoundaryCheckInput = {
  boundaryId: string;
  focusableElementIds: string[];
  activeElementId: string | null;
};

export type FocusBoundaryCheckResult = {
  boundaryId: string;
  valid: boolean;
  reason:
    | "focus_inside_boundary"
    | "no_active_focus"
    | "focus_outside_boundary"
    | "boundary_has_no_focusable_elements";
};

export type AccessibleDialogContractInput = {
  dialogId: string;
  labelledBy: string;
  describedBy?: string;
  initialFocusId: string;
  focusableElementIds: string[];
  restoreFocusId: string;
  closeOnEscape?: boolean;
};

export type AccessibleDialogContract = {
  schema: typeof ACCESSIBLE_DIALOG_CONTRACT_SCHEMA;
  version: typeof HOST_PRESENTATION_BRIDGE_VERSION;
  dialogId: string;
  role: "dialog";
  ariaModal: true;
  labelledBy: string;
  describedBy: string | null;
  initialFocusId: string;
  focusableElementIds: string[];
  restoreFocusId: string;
  keyboard: {
    trapFocus: true;
    cycleTabWithinDialog: true;
    closeOnEscape: boolean;
    restoreFocusOnClose: true;
  };
  security: {
    securityIndicatorsMayBeHidden: false;
    approvalStatesMayBeHidden: false;
    dialogContractGrantsAuthorization: false;
  };
};

export class HostPresentationBridgeError extends Error {
  readonly code:
    | "theme_invalid"
    | "density_invalid"
    | "typography_invalid"
    | "design_token_invalid"
    | "locale_invalid"
    | "time_zone_invalid"
    | "accessibility_invalid"
    | "focus_boundary_invalid"
    | "dialog_invalid";

  constructor(code: HostPresentationBridgeError["code"], message: string) {
    super(message);
    this.name = "HostPresentationBridgeError";
    this.code = code;
  }
}

const COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const DOM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;

const DEFAULT_TOKENS: SafeHostDesignTokens = Object.freeze({
  colorBackground: "#ffffff",
  colorSurface: "#f7f7f8",
  colorText: "#111111",
  colorMutedText: "#5f6368",
  colorBorder: "#d9dce1",
  colorAccent: "#6750a4",
  colorDanger: "#b3261e",
  colorWarning: "#8a4b00",
  colorSuccess: "#146c43",
  radiusPx: 12,
  spacingUnitPx: 8,
  focusRingWidthPx: 2
});

const DESIGN_TOKEN_KEYS = new Set<keyof HostDesignTokens>([
  "colorBackground",
  "colorSurface",
  "colorText",
  "colorMutedText",
  "colorBorder",
  "colorAccent",
  "colorDanger",
  "colorWarning",
  "colorSuccess",
  "radiusPx",
  "spacingUnitPx",
  "focusRingWidthPx"
]);

function assertTheme(
  theme: HostThemePreference,
  systemResolvedTheme: HostPresentationBridgeInput["systemResolvedTheme"]
) {
  if (!HOST_THEME_PREFERENCES.includes(theme)) {
    throw new HostPresentationBridgeError(
      "theme_invalid",
      "Host theme preference is unsupported."
    );
  }

  if (theme === "system" && systemResolvedTheme === undefined) {
    throw new HostPresentationBridgeError(
      "theme_invalid",
      "System theme preference requires an explicit resolved light/dark value."
    );
  }

  if (
    systemResolvedTheme !== undefined &&
    systemResolvedTheme !== "light" &&
    systemResolvedTheme !== "dark"
  ) {
    throw new HostPresentationBridgeError(
      "theme_invalid",
      "Resolved system theme is invalid."
    );
  }
}

function assertDensity(density: HostDensity) {
  if (!HOST_DENSITIES.includes(density)) {
    throw new HostPresentationBridgeError(
      "density_invalid",
      "Host density is unsupported."
    );
  }
}

function normalizeTypography(
  typography: HostTypographyPreferences
): HostTypographyPreferences {
  if (
    !["system-ui", "sans-serif", "serif", "monospace"].includes(
      typography.family
    ) ||
    !Number.isFinite(typography.scale) ||
    typography.scale < 0.875 ||
    typography.scale > 1.25 ||
    !Number.isFinite(typography.lineHeight) ||
    typography.lineHeight < 1.2 ||
    typography.lineHeight > 1.8
  ) {
    throw new HostPresentationBridgeError(
      "typography_invalid",
      "Typography preferences are outside the supported accessibility-safe range."
    );
  }

  return Object.freeze({ ...typography });
}

function normalizeDesignTokens(
  input: HostDesignTokens | undefined,
  forcedColors: ForcedColorsState
): SafeHostDesignTokens {
  const raw = input ?? {};
  for (const key of Object.keys(raw)) {
    if (!DESIGN_TOKEN_KEYS.has(key as keyof HostDesignTokens)) {
      throw new HostPresentationBridgeError(
        "design_token_invalid",
        "Unknown design tokens are not accepted."
      );
    }
  }

  const merged: SafeHostDesignTokens = {
    ...DEFAULT_TOKENS,
    ...raw
  };

  for (const key of [
    "colorBackground",
    "colorSurface",
    "colorText",
    "colorMutedText",
    "colorBorder",
    "colorAccent",
    "colorDanger",
    "colorWarning",
    "colorSuccess"
  ] as const) {
    if (!COLOR_PATTERN.test(merged[key])) {
      throw new HostPresentationBridgeError(
        "design_token_invalid",
        key + " must be a literal hex colour token."
      );
    }
  }

  if (
    !Number.isFinite(merged.radiusPx) ||
    merged.radiusPx < 0 ||
    merged.radiusPx > 24 ||
    !Number.isFinite(merged.spacingUnitPx) ||
    merged.spacingUnitPx < 4 ||
    merged.spacingUnitPx > 16 ||
    !Number.isFinite(merged.focusRingWidthPx) ||
    merged.focusRingWidthPx < 2 ||
    merged.focusRingWidthPx > 6
  ) {
    throw new HostPresentationBridgeError(
      "design_token_invalid",
      "Numeric design tokens are outside the supported range."
    );
  }

  if (forcedColors === "active") {
    return Object.freeze({
      ...merged,
      colorBackground: DEFAULT_TOKENS.colorBackground,
      colorSurface: DEFAULT_TOKENS.colorSurface,
      colorText: DEFAULT_TOKENS.colorText,
      colorMutedText: DEFAULT_TOKENS.colorMutedText,
      colorBorder: DEFAULT_TOKENS.colorBorder,
      colorAccent: DEFAULT_TOKENS.colorAccent,
      colorDanger: DEFAULT_TOKENS.colorDanger,
      colorWarning: DEFAULT_TOKENS.colorWarning,
      colorSuccess: DEFAULT_TOKENS.colorSuccess
    });
  }

  return Object.freeze(merged);
}

function canonicalizeLocale(locale: string) {
  if (
    typeof locale !== "string" ||
    locale.length < 2 ||
    locale.length > 35 ||
    /[\r\n\0]/.test(locale)
  ) {
    throw new HostPresentationBridgeError(
      "locale_invalid",
      "Locale is invalid."
    );
  }

  try {
    const canonical = Intl.getCanonicalLocales(locale);
    if (canonical.length !== 1) throw new Error("ambiguous locale");
    return canonical[0];
  } catch {
    throw new HostPresentationBridgeError(
      "locale_invalid",
      "Locale must be a valid BCP 47 locale."
    );
  }
}

function normalizeTimeZone(timeZone: string) {
  if (
    typeof timeZone !== "string" ||
    timeZone.length < 1 ||
    timeZone.length > 80 ||
    /[\r\n\0]/.test(timeZone)
  ) {
    throw new HostPresentationBridgeError(
      "time_zone_invalid",
      "Time zone is invalid."
    );
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone;
  } catch {
    throw new HostPresentationBridgeError(
      "time_zone_invalid",
      "Time zone must be a valid IANA time zone."
    );
  }
}

function createCssVariableProjection(input: {
  theme: "light" | "dark";
  density: HostDensity;
  typography: HostTypographyPreferences;
  designTokens: SafeHostDesignTokens;
  forcedColors: ForcedColorsState;
  reducedMotion: ReducedMotionPreference;
}) {
  const densityMultiplier =
    input.density === "compact"
      ? 0.875
      : input.density === "spacious"
        ? 1.125
        : 1;

  const variables: Record<string, string> = {
    "--rosevear-module-color-scheme": input.theme,
    "--rosevear-module-font-family": input.typography.family,
    "--rosevear-module-font-scale": String(input.typography.scale),
    "--rosevear-module-line-height": String(input.typography.lineHeight),
    "--rosevear-module-density": String(densityMultiplier),
    "--rosevear-module-radius": input.designTokens.radiusPx + "px",
    "--rosevear-module-spacing-unit":
      input.designTokens.spacingUnitPx * densityMultiplier + "px",
    "--rosevear-module-focus-ring-width":
      input.designTokens.focusRingWidthPx + "px",
    "--rosevear-module-motion-duration":
      input.reducedMotion === "reduce" ? "0ms" : "160ms"
  };

  if (input.forcedColors === "none") {
    variables["--rosevear-module-color-background"] =
      input.designTokens.colorBackground;
    variables["--rosevear-module-color-surface"] =
      input.designTokens.colorSurface;
    variables["--rosevear-module-color-text"] =
      input.designTokens.colorText;
    variables["--rosevear-module-color-muted-text"] =
      input.designTokens.colorMutedText;
    variables["--rosevear-module-color-border"] =
      input.designTokens.colorBorder;
    variables["--rosevear-module-color-accent"] =
      input.designTokens.colorAccent;
    variables["--rosevear-module-color-danger"] =
      input.designTokens.colorDanger;
    variables["--rosevear-module-color-warning"] =
      input.designTokens.colorWarning;
    variables["--rosevear-module-color-success"] =
      input.designTokens.colorSuccess;
  }

  return Object.freeze(variables);
}

export function createHostPresentationBridge(
  input: HostPresentationBridgeInput
): HostPresentationBridgeResult {
  assertTheme(input.theme, input.systemResolvedTheme);
  assertDensity(input.density);

  if (!REDUCED_MOTION_PREFERENCES.includes(input.reducedMotion)) {
    throw new HostPresentationBridgeError(
      "accessibility_invalid",
      "Reduced-motion preference is unsupported."
    );
  }

  if (!FORCED_COLORS_STATES.includes(input.forcedColors)) {
    throw new HostPresentationBridgeError(
      "accessibility_invalid",
      "Forced-colors state is unsupported."
    );
  }

  const typography = normalizeTypography(input.typography);
  const designTokens = normalizeDesignTokens(
    input.designTokens,
    input.forcedColors
  );
  const effectiveTheme =
    input.theme === "system" ? input.systemResolvedTheme! : input.theme;
  const canonicalLocale = canonicalizeLocale(input.locale);
  const timeZone = normalizeTimeZone(input.timeZone);

  const cssVariables = createCssVariableProjection({
    theme: effectiveTheme,
    density: input.density,
    typography,
    designTokens,
    forcedColors: input.forcedColors,
    reducedMotion: input.reducedMotion
  });

  const result: HostPresentationBridgeResult = {
    schema: HOST_PRESENTATION_BRIDGE_SCHEMA,
    version: HOST_PRESENTATION_BRIDGE_VERSION,
    theme: {
      preference: input.theme,
      effective: effectiveTheme
    },
    density: input.density,
    typography,
    designTokens,
    cssVariables,
    accessibility: {
      reducedMotion: input.reducedMotion,
      forcedColors: input.forcedColors,
      motionDurationMs: input.reducedMotion === "reduce" ? 0 : 160,
      hostColorsSuppressedByForcedColors: input.forcedColors === "active",
      keyboardNavigationRequired: true,
      visibleFocusRequired: true
    },
    locale: {
      requested: input.locale,
      canonical: canonicalLocale,
      timeZone
    },
    security: {
      rawCssAccepted: false,
      arbitrarySelectorsAccepted: false,
      securityStatesStyleable: false,
      approvalStatesStyleable: false,
      stylingGrantsAuthorization: false
    }
  };

  return Object.freeze(result);
}

export function presentationBridgeInputFromHostContext(
  context: HostRuntimeContext,
  input: Omit<
    HostPresentationBridgeInput,
    "theme" | "locale" | "timeZone"
  > & {
    systemResolvedTheme?: "light" | "dark";
  }
): HostPresentationBridgeInput {
  if (!context.theme || !context.locale || !context.timeZone) {
    throw new HostPresentationBridgeError(
      "locale_invalid",
      "Host context must provide theme, locale and time zone before presentation projection."
    );
  }

  return {
    ...input,
    theme: context.theme,
    locale: context.locale,
    timeZone: context.timeZone,
    systemResolvedTheme: input.systemResolvedTheme
  };
}

export function checkKeyboardFocusBoundary(
  input: FocusBoundaryCheckInput
): FocusBoundaryCheckResult {
  if (
    !DOM_ID_PATTERN.test(input.boundaryId) ||
    input.focusableElementIds.some((id) => !DOM_ID_PATTERN.test(id)) ||
    new Set(input.focusableElementIds).size !==
      input.focusableElementIds.length ||
    (input.activeElementId !== null &&
      !DOM_ID_PATTERN.test(input.activeElementId))
  ) {
    throw new HostPresentationBridgeError(
      "focus_boundary_invalid",
      "Focus boundary identifiers are invalid."
    );
  }

  if (input.focusableElementIds.length === 0) {
    return {
      boundaryId: input.boundaryId,
      valid: false,
      reason: "boundary_has_no_focusable_elements"
    };
  }

  if (input.activeElementId === null) {
    return {
      boundaryId: input.boundaryId,
      valid: false,
      reason: "no_active_focus"
    };
  }

  if (!input.focusableElementIds.includes(input.activeElementId)) {
    return {
      boundaryId: input.boundaryId,
      valid: false,
      reason: "focus_outside_boundary"
    };
  }

  return {
    boundaryId: input.boundaryId,
    valid: true,
    reason: "focus_inside_boundary"
  };
}

export function createAccessibleDialogContract(
  input: AccessibleDialogContractInput
): AccessibleDialogContract {
  const ids = [
    input.dialogId,
    input.labelledBy,
    input.initialFocusId,
    input.restoreFocusId,
    ...(input.describedBy ? [input.describedBy] : []),
    ...input.focusableElementIds
  ];

  if (
    ids.some((id) => !DOM_ID_PATTERN.test(id)) ||
    input.focusableElementIds.length === 0 ||
    !input.focusableElementIds.includes(input.initialFocusId) ||
    new Set(input.focusableElementIds).size !==
      input.focusableElementIds.length
  ) {
    throw new HostPresentationBridgeError(
      "dialog_invalid",
      "Accessible dialog contract contains invalid or inconsistent focus identifiers."
    );
  }

  const contract: AccessibleDialogContract = {
    schema: ACCESSIBLE_DIALOG_CONTRACT_SCHEMA,
    version: HOST_PRESENTATION_BRIDGE_VERSION,
    dialogId: input.dialogId,
    role: "dialog",
    ariaModal: true,
    labelledBy: input.labelledBy,
    describedBy: input.describedBy ?? null,
    initialFocusId: input.initialFocusId,
    focusableElementIds: [...input.focusableElementIds],
    restoreFocusId: input.restoreFocusId,
    keyboard: {
      trapFocus: true,
      cycleTabWithinDialog: true,
      closeOnEscape: input.closeOnEscape ?? true,
      restoreFocusOnClose: true
    },
    security: {
      securityIndicatorsMayBeHidden: false,
      approvalStatesMayBeHidden: false,
      dialogContractGrantsAuthorization: false
    }
  };

  return Object.freeze(contract);
}
