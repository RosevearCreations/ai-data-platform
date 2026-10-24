import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_PRESETS,
  INTERFACE_RESET_GOVERNANCE,
  applyInterfacePreferencePreset,
  defaultInterfacePreferences,
  matchingInterfacePreferencePreset,
  reconcileInterfacePreferences,
  sanitizeInterfacePreferences
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const presetIds = INTERFACE_PREFERENCE_PRESETS.map((preset) => preset.id);
  for (const id of ["standard", "focus", "wide-canvas", "compact-workspace"] as const) {
    assert(presetIds.includes(id), "Build 127 interface preset missing: " + id);
  }

  const focus = applyInterfacePreferencePreset("focus");
  assert(
    focus.navigationDensity === "comfortable" &&
      focus.workspaceLayout === "focused" &&
      focus.recommendations === "destinations",
    "Build 127 Focus preset must apply its documented role-neutral preference combination."
  );
  assert(
    matchingInterfacePreferencePreset(focus)?.id === "focus",
    "Build 127 must identify an exact preset match."
  );
  assert(
    matchingInterfacePreferencePreset({
      version: 1,
      navigationDensity: "adaptive",
      workspaceLayout: "focused",
      recommendations: "off"
    }) === null,
    "Build 127 must not label a manually customized combination as a preset."
  );

  const storedCompact = sanitizeInterfacePreferences({
    version: 1,
    navigationDensity: "compact",
    workspaceLayout: "wide",
    recommendations: "shortcuts"
  });
  const highContrast = reconcileInterfacePreferences(storedCompact, {
    viewportWidth: 1440,
    forcedColors: false,
    prefersMoreContrast: true,
    prefersReducedMotion: false
  });
  assert(
    highContrast.storedPreferences.navigationDensity === "compact" &&
      highContrast.storedPreferences.workspaceLayout === "wide" &&
      highContrast.effectivePreferences.navigationDensity === "comfortable" &&
      highContrast.effectivePreferences.workspaceLayout === "balanced" &&
      highContrast.accessibilityGuardActive,
    "Build 127 high-contrast reconciliation must protect effective density/layout without rewriting stored preferences."
  );

  const narrowFocus = reconcileInterfacePreferences(focus, {
    viewportWidth: 720,
    forcedColors: false,
    prefersMoreContrast: false,
    prefersReducedMotion: false
  });
  assert(
    narrowFocus.storedPreferences.workspaceLayout === "focused" &&
      narrowFocus.effectivePreferences.workspaceLayout === "balanced" &&
      narrowFocus.adjustments.some((adjustment) => adjustment.includes("narrow viewport")),
    "Build 127 narrow-view reconciliation must temporarily preserve readable shell flow."
  );

  const reducedMotion = reconcileInterfacePreferences(
    defaultInterfacePreferences(),
    {
      viewportWidth: 1440,
      forcedColors: false,
      prefersMoreContrast: false,
      prefersReducedMotion: true
    }
  );
  assert(
    reducedMotion.reducedMotion &&
      reducedMotion.adjustments.some((adjustment) => adjustment.includes("Reduced-motion")),
    "Build 127 must surface the reduced-motion accessibility safeguard."
  );

  assert(
    !INTERFACE_RESET_GOVERNANCE.preferences.requiresConfirmation &&
      !INTERFACE_RESET_GOVERNANCE.insights.requiresConfirmation &&
      INTERFACE_RESET_GOVERNANCE.all.requiresConfirmation,
    "Build 127 reset governance must require confirmation only for the full local reset."
  );

  const [
    preferencesLib,
    controller,
    insights,
    shell,
    css,
    help,
    pkg,
    verify126,
    doc
  ] = await Promise.all([
    source("../lib/navigation-preferences.ts"),
    source("../app/InterfacePreferenceController.tsx"),
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-126-interface-preferences.ts"),
    source("../../../docs/BUILD_127_PREFERENCE_GOVERNANCE.md")
  ]);

  assert(
    preferencesLib.includes("INTERFACE_PREFERENCE_PRESETS") &&
      preferencesLib.includes("INTERFACE_PREFERENCES_RECONCILED_EVENT") &&
      preferencesLib.includes("reconcileInterfacePreferences") &&
      preferencesLib.includes("INTERFACE_RESET_GOVERNANCE"),
    "Build 127 preference primitives must define presets, reconciliation and reset governance."
  );

  assert(
    controller.includes('window.matchMedia("(forced-colors: active)")') &&
      controller.includes('window.matchMedia("(prefers-contrast: more)")') &&
      controller.includes('window.matchMedia("(prefers-reduced-motion: reduce)")') &&
      controller.includes("INTERFACE_PREFERENCES_RECONCILED_EVENT") &&
      controller.includes("dataset.preferenceReconciled") &&
      controller.includes("dataset.reducedMotion"),
    "Build 127 controller must monitor accessibility environment changes and publish effective reconciliation."
  );

  assert(
    insights.includes("Preference presets") &&
      insights.includes("Accessibility-safe reconciliation") &&
      insights.includes("Operator reset governance") &&
      insights.includes("INTERFACE_PREFERENCE_PRESETS") &&
      insights.includes("INTERFACE_RESET_GOVERNANCE") &&
      insights.includes("Confirm full local reset") &&
      insights.includes("resetAllArmed") &&
      insights.includes("window.localStorage.removeItem(INTERFACE_PREFERENCES_STORAGE_KEY)") &&
      insights.includes("window.localStorage.removeItem(NAVIGATION_INSIGHTS_STORAGE_KEY)"),
    "Build 127 Insights panel must expose presets, effective reconciliation and scoped reset governance."
  );

  assert(
    shell.includes("<InterfacePreferenceController />") &&
      shell.includes("<NavigationInsights />") &&
      shell.includes("Marble Standard"),
    "Build 127 shell must preserve the preference controller and Marble Standard as later interface builds advance."
  );

  for (const selector of [
    ".interfacePresetSection",
    ".interfacePresetGrid",
    ".interfaceReconciliationStatus",
    ".interfaceResetGovernance",
    ".interfaceResetChoices",
    'html[data-preference-reconciled="true"]',
    'html[data-reduced-motion="true"]'
  ]) {
    assert(css.includes(selector), "Build 127 CSS contract missing: " + selector);
  }
  assert(
    css.includes("@media (forced-colors: active)"),
    "Build 127 CSS must preserve visible state in forced-colors mode."
  );

  for (const topic of [
    "interface-preference-presets",
    "accessibility-preference-reconciliation",
    "operator-reset-governance"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 127 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 127 preference presets, accessibility reconciliation & reset governance"),
    "Help Center must register the Build 127 help group."
  );

  assert(
    verify126.includes('shell.includes("Marble Standard")') &&
      !verify126.includes('shell.includes("Build 126 · Marble Standard")'),
    "Build 126 verifier must remain forward-compatible with later interface build labels."
  );

  assert(
    pkg.includes("verify-build-127-preference-governance.ts"),
    "Build 127 verifier must run in the application test chain."
  );

  assert(
    doc.includes("localStorage") &&
      doc.includes("stored preferences") &&
      doc.includes("effective preferences") &&
      doc.includes("second activation") &&
      doc.includes("no database migration") &&
      doc.includes("navigation-only") &&
      doc.includes("RLS"),
    "Build 127 documentation must preserve local-only, accessibility-safe and navigation-only boundaries."
  );

  console.log("Build 127 preference presets, accessibility reconciliation and reset governance verification passed.");
}

void main();
