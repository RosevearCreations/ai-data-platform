import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_NAMED_PROFILES_STORAGE_KEY,
  INTERFACE_PREFERENCE_PROFILE_FORMAT,
  MAX_NAMED_INTERFACE_PROFILES,
  createInterfacePreferenceProfile,
  createNamedInterfacePreferenceProfile,
  importedInterfacePreferenceProvenance,
  matchingNamedInterfacePreferenceProfile,
  namedInterfacePreferenceProvenanceLabel,
  removeNamedInterfacePreferenceProfile,
  sanitizeNamedInterfacePreferenceName,
  sanitizeNamedInterfacePreferenceProfiles,
  upsertNamedInterfacePreferenceProfile
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const workshop = createNamedInterfacePreferenceProfile({
    id: "workshop-focus",
    name: "  Workshop   Focus  ",
    preferences: {
      version: 1,
      navigationDensity: "comfortable",
      workspaceLayout: "focused",
      recommendations: "destinations"
    }
  });

  assert(
    workshop.name === "Workshop Focus" &&
      workshop.provenance.kind === "local",
    "Build 129 must sanitize named local profiles and default provenance to local."
  );

  const portable = createInterfacePreferenceProfile({
    version: 1,
    navigationDensity: "compact",
    workspaceLayout: "wide",
    recommendations: "shortcuts"
  });
  const imported = createNamedInterfacePreferenceProfile({
    id: "imported-shop",
    name: "Imported Shop",
    preferences: portable.preferences,
    provenance: importedInterfacePreferenceProvenance(
      " shop-layout.json ",
      portable
    )
  });

  assert(
    imported.provenance.kind === "imported" &&
      imported.provenance.sourceName === "shop-layout.json" &&
      imported.provenance.sourceFormat === INTERFACE_PREFERENCE_PROFILE_FORMAT &&
      imported.provenance.sourceVersion === 1,
    "Build 129 must preserve bounded import source name and format/version provenance."
  );
  assert(
    namedInterfacePreferenceProvenanceLabel(imported).includes("shop-layout.json") &&
      !namedInterfacePreferenceProvenanceLabel(imported).includes("path"),
    "Build 129 provenance labels must identify the local source without filesystem paths."
  );

  const stored = sanitizeNamedInterfacePreferenceProfiles([
    workshop,
    imported,
    { ...workshop, id: "workshop-focus" },
    { version: 99, id: "bad", name: "Bad", preferences: workshop.preferences }
  ]);
  assert(
    stored.length === 2,
    "Build 129 named-profile storage must reject duplicate IDs and unsupported records."
  );

  const updated = upsertNamedInterfacePreferenceProfile(
    stored,
    createNamedInterfacePreferenceProfile({
      id: "workshop-focus",
      name: "Workshop Focus",
      preferences: {
        version: 1,
        navigationDensity: "adaptive",
        workspaceLayout: "balanced",
        recommendations: "all"
      }
    })
  );
  assert(
    updated.length === 2 &&
      updated.find((profile) => profile.id === "workshop-focus")?.preferences
        .navigationDensity === "adaptive",
    "Build 129 upsert must update an existing profile without duplicating it."
  );

  const matched = matchingNamedInterfacePreferenceProfile(
    updated,
    imported.preferences
  );
  assert(
    matched?.id === "imported-shop",
    "Build 129 quick switcher support must detect exact named-profile matches."
  );

  assert(
    removeNamedInterfacePreferenceProfile(updated, "imported-shop").length === 1,
    "Build 129 must support local named-profile deletion."
  );

  assert(
    sanitizeNamedInterfacePreferenceName(" ".repeat(3)) === "" &&
      sanitizeNamedInterfacePreferenceName("A".repeat(60)).length === 40 &&
      MAX_NAMED_INTERFACE_PROFILES === 8,
    "Build 129 must enforce bounded profile names and the eight-profile local limit."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify128, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-128-preference-portability.ts"),
      source("../../../docs/BUILD_129_NAMED_PREFERENCE_PROFILES.md")
    ]);

  assert(
    preferencesLib.includes("INTERFACE_NAMED_PROFILES_STORAGE_KEY") &&
      preferencesLib.includes("MAX_NAMED_INTERFACE_PROFILES") &&
      preferencesLib.includes("importedInterfacePreferenceProvenance") &&
      preferencesLib.includes("matchingNamedInterfacePreferenceProfile"),
    "Build 129 preference primitives must define local named storage, bounds, provenance and exact matching."
  );

  for (const token of [
    "Named local preference profiles",
    "Quick switcher",
    "Save current",
    "Save imported as named profile",
    "Import provenance",
    "applySelectedNamedProfile",
    "deleteSelectedNamedProfile",
    "INTERFACE_NAMED_PROFILES_STORAGE_KEY",
    "namedInterfacePreferenceProvenanceLabel"
  ]) {
    assert(insights.includes(token), "Build 129 Insights UI is missing: " + token);
  }

  assert(
    insights.includes("window.localStorage.removeItem(INTERFACE_NAMED_PROFILES_STORAGE_KEY)") &&
      insights.includes("setNamedProfiles([])"),
    "Build 129 full local reset must also clear named profile state."
  );

  for (const selector of [
    ".interfaceNamedProfilesSection",
    ".interfaceNamedProfileSave",
    ".interfaceQuickSwitcher",
    ".interfaceNamedProfileList",
    ".interfaceImportProvenance"
  ]) {
    assert(css.includes(selector), "Build 129 CSS contract missing: " + selector);
  }

  for (const topic of [
    "named-local-preference-profiles",
    "preference-quick-switcher",
    "preference-import-provenance"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 129 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 129 named local profiles, quick switcher & import provenance"),
    "Help Center must register the Build 129 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 129 shell must preserve Marble Standard as later interface builds advance."
  );

  assert(
    verify128.includes('shell.includes("Marble Standard")') &&
      !verify128.includes('shell.includes("Build 128 · Marble Standard")'),
    "Build 128 verifier must remain forward-compatible after the Build 129 shell label."
  );

  assert(
    pkg.includes("verify-build-129-named-preference-profiles.ts"),
    "Build 129 verifier must run in the application test chain."
  );

  assert(
    doc.includes("browser localStorage only") &&
      doc.includes("source file name") &&
      doc.includes("no filesystem path") &&
      doc.includes("no database migration") &&
      doc.includes("no server-side synchronization") &&
      doc.includes("RLS"),
    "Build 129 documentation must preserve local-only named profiles and bounded import provenance."
  );

  assert(
    INTERFACE_NAMED_PROFILES_STORAGE_KEY.includes("named-interface-profiles"),
    "Build 129 must use a dedicated browser-local storage namespace."
  );

  console.log("Build 129 named local profiles, quick switcher and import provenance verification passed.");
}

void main();
