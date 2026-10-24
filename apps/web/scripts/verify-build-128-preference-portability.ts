import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_PROFILE_FORMAT,
  createInterfacePreferenceProfile,
  parseInterfacePreferenceProfile,
  previewInterfacePreferenceProfile,
  serializeInterfacePreferenceProfile
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const sourcePreferences = {
    version: 1 as const,
    navigationDensity: "compact" as const,
    workspaceLayout: "wide" as const,
    recommendations: "shortcuts" as const
  };

  const profile = createInterfacePreferenceProfile(sourcePreferences);
  assert(
    profile.format === INTERFACE_PREFERENCE_PROFILE_FORMAT &&
      profile.version === 1 &&
      profile.preferences.navigationDensity === "compact",
    "Build 128 must create a versioned preference-only portable profile."
  );

  const serialized = serializeInterfacePreferenceProfile(sourcePreferences);
  const parsed = parseInterfacePreferenceProfile(serialized);
  assert(parsed.ok, "Build 128 exported profile must round-trip through strict import parsing.");
  if (!parsed.ok) return;

  assert(
    parsed.profile.preferences.workspaceLayout === "wide" &&
      parsed.profile.preferences.recommendations === "shortcuts",
    "Build 128 import must preserve supported preference values."
  );

  const invalidFormat = parseInterfacePreferenceProfile(
    JSON.stringify({
      format: "not-ai-data-platform",
      version: 1,
      preferences: sourcePreferences
    })
  );
  assert(!invalidFormat.ok, "Build 128 must reject foreign JSON formats.");

  const invalidValue = parseInterfacePreferenceProfile(
    JSON.stringify({
      format: INTERFACE_PREFERENCE_PROFILE_FORMAT,
      version: 1,
      preferences: {
        ...sourcePreferences,
        navigationDensity: "microscopic"
      }
    })
  );
  assert(!invalidValue.ok, "Build 128 must reject invalid imported preference values instead of silently defaulting them.");

  const preview = previewInterfacePreferenceProfile(parsed.profile, {
    viewportWidth: 1440,
    forcedColors: true,
    prefersMoreContrast: false,
    prefersReducedMotion: false
  });
  assert(
    preview.storedPreferences.navigationDensity === "compact" &&
      preview.storedPreferences.workspaceLayout === "wide" &&
      preview.effectivePreferences.navigationDensity === "comfortable" &&
      preview.effectivePreferences.workspaceLayout === "balanced",
    "Build 128 reconciliation preview must preserve imported stored values while showing accessibility-safe effective values."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify127, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-127-preference-governance.ts"),
      source("../../../docs/BUILD_128_PREFERENCE_PORTABILITY.md")
    ]);

  assert(
    preferencesLib.includes("INTERFACE_PREFERENCE_PROFILE_FORMAT") &&
      preferencesLib.includes("parseInterfacePreferenceProfile") &&
      preferencesLib.includes("previewInterfacePreferenceProfile"),
    "Build 128 preference library must define portable profile creation, strict parsing and preview primitives."
  );

  for (const token of [
    "Preference profile portability",
    "Export profile",
    "Import profile",
    "Import reconciliation preview",
    "Apply imported profile",
    "stagePreferenceProfileImport",
    "serializeInterfacePreferenceProfile",
    "parseInterfacePreferenceProfile",
    "previewInterfacePreferenceProfile",
    "new Blob",
    "file.text()"
  ]) {
    assert(insights.includes(token), "Build 128 Insights portability UI is missing: " + token);
  }

  assert(
    insights.includes("32 * 1024") &&
      insights.includes("Nothing has been applied yet") &&
      insights.includes("Navigation insights") &&
      insights.includes("business data"),
    "Build 128 import must be bounded, staged before apply, and explicit about excluded data."
  );

  for (const selector of [
    ".interfacePortabilitySection",
    ".interfacePortabilityActions",
    ".interfaceImportPreview",
    ".interfaceImportPreviewActions"
  ]) {
    assert(css.includes(selector), "Build 128 CSS contract missing: " + selector);
  }

  for (const topic of [
    "preference-profile-portability",
    "preference-import-preview"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 128 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 128 preference profile portability & reconciliation preview"),
    "Help Center must register the Build 128 help group."
  );

  assert(
    shell.includes("Build 128 · Marble Standard"),
    "Build 128 shell must expose the current interface build."
  );

  assert(
    verify127.includes('shell.includes("Marble Standard")') &&
      !verify127.includes('shell.includes("Build 127 · Marble Standard")'),
    "Build 127 verifier must remain forward-compatible after the Build 128 shell label."
  );

  assert(
    pkg.includes("verify-build-128-preference-portability.ts"),
    "Build 128 verifier must run in the application test chain."
  );

  assert(
    doc.includes("no database migration") &&
      doc.includes("no server-side synchronization") &&
      doc.includes("Navigation insights are excluded") &&
      doc.includes("preview before apply") &&
      doc.includes("RLS"),
    "Build 128 documentation must preserve local-only portability, preview-before-apply and workflow authority boundaries."
  );

  console.log("Build 128 preference portability and reconciliation preview verification passed.");
}

void main();
