import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  defaultInterfacePreferences,
  recommendationPreferenceAllowsKind,
  resolveNavigationDensity,
  sanitizeInterfacePreferences
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const defaults = defaultInterfacePreferences();
  assert(
    defaults.navigationDensity === "adaptive" &&
      defaults.workspaceLayout === "balanced" &&
      defaults.recommendations === "all",
    "Build 126 defaults must preserve the existing interface while enabling adaptive density."
  );

  const sanitized = sanitizeInterfacePreferences({
    version: 900,
    navigationDensity: "compact",
    workspaceLayout: "wide",
    recommendations: "shortcuts",
    roleId: "must-not-matter"
  });
  assert(
    sanitized.navigationDensity === "compact" &&
      sanitized.workspaceLayout === "wide" &&
      sanitized.recommendations === "shortcuts",
    "Build 126 must sanitize known browser-local interface preferences."
  );

  const invalid = sanitizeInterfacePreferences({
    navigationDensity: "role-based",
    workspaceLayout: "admin",
    recommendations: "force"
  });
  assert(
    invalid.navigationDensity === "adaptive" &&
      invalid.workspaceLayout === "balanced" &&
      invalid.recommendations === "all",
    "Build 126 must fall back safely when stored preferences are invalid."
  );

  assert(
    resolveNavigationDensity("adaptive", 900) === "compact" &&
      resolveNavigationDensity("adaptive", 1440) === "comfortable" &&
      resolveNavigationDensity("compact", 1600) === "compact" &&
      resolveNavigationDensity("comfortable", 700) === "comfortable",
    "Build 126 adaptive density must depend only on viewport width while explicit choices remain stable."
  );

  assert(
    recommendationPreferenceAllowsKind("all", "destination") &&
      recommendationPreferenceAllowsKind("all", "shortcut") &&
      recommendationPreferenceAllowsKind("destinations", "destination") &&
      !recommendationPreferenceAllowsKind("destinations", "shortcut") &&
      recommendationPreferenceAllowsKind("shortcuts", "shortcut") &&
      !recommendationPreferenceAllowsKind("shortcuts", "destination") &&
      !recommendationPreferenceAllowsKind("off", "destination") &&
      !recommendationPreferenceAllowsKind("off", "shortcut"),
    "Build 126 recommendation controls must deterministically filter local interface recommendations."
  );

  const [
    preferencesLib,
    controller,
    insights,
    shell,
    css,
    help,
    pkg,
    verify125,
    doc
  ] = await Promise.all([
    source("../lib/navigation-preferences.ts"),
    source("../app/InterfacePreferenceController.tsx"),
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-125-navigation-insights.ts"),
    source("../../../docs/BUILD_126_INTERFACE_PREFERENCES.md")
  ]);

  assert(
    preferencesLib.includes("INTERFACE_PREFERENCES_STORAGE_KEY") &&
      preferencesLib.includes("INTERFACE_PREFERENCES_EVENT") &&
      preferencesLib.includes("resolveNavigationDensity") &&
      preferencesLib.includes("recommendationPreferenceAllowsKind") &&
      !preferencesLib.includes("roleId") &&
      !preferencesLib.includes("activeRole"),
    "Build 126 preference primitives must be browser-local and role-neutral."
  );

  assert(
    controller.includes("document.documentElement") &&
      controller.includes("dataset.navigationDensity") &&
      controller.includes("dataset.workspaceLayout") &&
      controller.includes("dataset.recommendationMode") &&
      controller.includes('window.addEventListener("resize"') &&
      controller.includes('preferences.navigationDensity === "adaptive"'),
    "Build 126 preference controller must apply local shell attributes and viewport-only adaptive density."
  );

  assert(
    insights.includes("Interface preferences") &&
      insights.includes("Navigation density") &&
      insights.includes("Workspace layout") &&
      insights.includes("Recommendations") &&
      insights.includes("Reset interface preferences") &&
      insights.includes("recommendationPreferenceAllowsKind") &&
      insights.includes("INTERFACE_PREFERENCES_STORAGE_KEY") &&
      insights.includes("INTERFACE_PREFERENCES_EVENT") &&
      insights.includes('aria-pressed={preferences.navigationDensity === value}') &&
      insights.includes('aria-pressed={preferences.workspaceLayout === value}') &&
      insights.includes('aria-pressed={preferences.recommendations === value}'),
    "Build 126 Insights panel must expose explicit density, layout and recommendation controls."
  );

  assert(
    shell.includes("<InterfacePreferenceController />") &&
      shell.includes("<NavigationInsights />") &&
      shell.includes("Build 126 · Marble Standard"),
    "Build 126 shared shell must install the preference controller and expose the current interface build."
  );

  for (const selector of [
    ".interfacePreferencePanel",
    ".interfacePreferenceGrid",
    ".interfacePreferenceChoices",
    ".interfacePreferenceActions",
    ".interfaceRecommendationEmpty",
    'html[data-navigation-density="compact"]',
    'html[data-navigation-density="comfortable"]',
    'html[data-workspace-layout="wide"]',
    'html[data-workspace-layout="focused"]'
  ]) {
    assert(css.includes(selector), "Build 126 CSS contract missing: " + selector);
  }

  for (const topic of [
    "adaptive-navigation-density",
    "workspace-layout-preferences",
    "recommendation-controls"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 126 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 126 adaptive density, role-neutral layout & recommendation controls"),
    "Help Center must register the Build 126 help group."
  );

  assert(
    verify125.includes('shell.includes("Marble Standard")') &&
      !verify125.includes('shell.includes("Build 125 · Marble Standard")'),
    "Build 125 verifier must remain forward-compatible with later interface build labels."
  );

  assert(
    pkg.includes("verify-build-126-interface-preferences.ts"),
    "Build 126 verifier must run in the application test chain."
  );

  assert(
    doc.includes("localStorage") &&
      doc.includes("role-neutral") &&
      doc.includes("viewport width") &&
      doc.includes("no database migration") &&
      doc.includes("navigation-only") &&
      doc.includes("RLS"),
    "Build 126 documentation must preserve browser-local, role-neutral and navigation-only safety boundaries."
  );

  console.log("Build 126 adaptive density, role-neutral workspace layout and recommendation controls verification passed.");
}

void main();
