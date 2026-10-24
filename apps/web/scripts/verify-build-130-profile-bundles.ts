import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_BUNDLE_FORMAT,
  MAX_NAMED_INTERFACE_PROFILES,
  analyzeInterfacePreferenceBundleImport,
  createNamedInterfacePreferenceProfile,
  duplicateNamedInterfacePreferenceProfile,
  parseInterfacePreferenceBundle,
  renameNamedInterfacePreferenceProfile,
  resolveInterfacePreferenceBundleImport,
  serializeInterfacePreferenceBundle
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

function localProfile(id: string, name: string, layout: "balanced" | "wide" | "focused") {
  return createNamedInterfacePreferenceProfile({
    id,
    name,
    preferences: {
      version: 1,
      navigationDensity: "adaptive",
      workspaceLayout: layout,
      recommendations: "all"
    }
  });
}

async function main() {
  const existing = [
    localProfile("standard-shop", "Shop", "balanced"),
    localProfile("focus-shop", "Focus", "focused")
  ];

  const renamed = renameNamedInterfacePreferenceProfile(
    existing,
    "standard-shop",
    "Workshop"
  );
  assert(
    renamed.ok &&
      renamed.profile.name === "Workshop" &&
      renamed.profiles.length === 2,
    "Build 130 must rename a selected profile without changing profile count."
  );

  const renameConflict = renameNamedInterfacePreferenceProfile(
    existing,
    "standard-shop",
    " focus "
  );
  assert(
    !renameConflict.ok,
    "Build 130 must reject case-insensitive rename conflicts."
  );

  const duplicated = duplicateNamedInterfacePreferenceProfile(
    existing,
    "focus-shop",
    "focus-copy",
    "Focus copy"
  );
  assert(
    duplicated.ok &&
      duplicated.profiles.length === 3 &&
      duplicated.profile.preferences.workspaceLayout === "focused",
    "Build 130 must duplicate preferences into a new local profile."
  );

  const bundleJson = serializeInterfacePreferenceBundle(existing);
  const parsed = parseInterfacePreferenceBundle(bundleJson);
  assert(parsed.ok, "Build 130 exported named bundle must round-trip through strict parsing.");
  if (!parsed.ok) return;

  assert(
    parsed.bundle.format === INTERFACE_PREFERENCE_BUNDLE_FORMAT &&
      parsed.bundle.version === 1 &&
      parsed.bundle.profiles.length === 2 &&
      !bundleJson.includes("standard-shop") &&
      !bundleJson.includes("focus-shop"),
    "Build 130 bundles must contain names/preferences without exporting browser-local IDs."
  );

  const duplicateNames = parseInterfacePreferenceBundle(
    JSON.stringify({
      format: INTERFACE_PREFERENCE_BUNDLE_FORMAT,
      version: 1,
      profiles: [
        {
          name: "Same",
          preferences: existing[0].preferences
        },
        {
          name: " same ",
          preferences: existing[1].preferences
        }
      ]
    })
  );
  assert(
    !duplicateNames.ok,
    "Build 130 bundle parser must reject duplicate names case-insensitively."
  );

  const incoming = parseInterfacePreferenceBundle(
    JSON.stringify({
      format: INTERFACE_PREFERENCE_BUNDLE_FORMAT,
      version: 1,
      profiles: [
        { name: "Shop", preferences: existing[1].preferences },
        { name: "Travel", preferences: existing[0].preferences }
      ]
    })
  );
  assert(incoming.ok, "Build 130 conflict fixture bundle must parse.");
  if (!incoming.ok) return;

  const analysis = analyzeInterfacePreferenceBundleImport(existing, incoming.bundle);
  assert(
    analysis.incomingCount === 2 &&
      analysis.conflictCount === 1 &&
      analysis.conflicts[0]?.existingName === "Shop" &&
      analysis.availableSlots === MAX_NAMED_INTERFACE_PROFILES - existing.length,
    "Build 130 must preview same-name conflicts and available capacity before import."
  );

  const skipped = resolveInterfacePreferenceBundleImport(
    existing,
    incoming.bundle,
    "skip",
    "bundle.json",
    (name, index) => "skip-" + index + "-" + name.replace(/\W/g, "")
  );
  assert(
    skipped.profiles.length === 3 &&
      skipped.imported === 1 &&
      skipped.replaced === 0 &&
      skipped.skippedConflicts === 1,
    "Build 130 Skip strategy must preserve same-name locals and import non-conflicts."
  );

  const replaced = resolveInterfacePreferenceBundleImport(
    existing,
    incoming.bundle,
    "replace",
    "bundle.json",
    (name, index) => "replace-" + index + "-" + name.replace(/\W/g, "")
  );
  assert(
    replaced.profiles.length === 3 &&
      replaced.replaced === 1 &&
      replaced.imported === 1 &&
      replaced.profiles.find((profile) => profile.name === "Shop")?.preferences
        .workspaceLayout === "focused",
    "Build 130 Replace strategy must retain the local profile slot while applying incoming preferences."
  );

  const keptBoth = resolveInterfacePreferenceBundleImport(
    existing,
    incoming.bundle,
    "keep-both",
    "bundle.json",
    (name, index) => "both-" + index + "-" + name.replace(/\W/g, "")
  );
  assert(
    keptBoth.profiles.length === 4 &&
      keptBoth.imported === 2 &&
      keptBoth.renamedCopies === 1 &&
      keptBoth.profiles.some((profile) => profile.name.includes("(Imported)")),
    "Build 130 Keep both strategy must preserve the local conflict and import a uniquely renamed copy."
  );

  const nearCapacity = Array.from({ length: MAX_NAMED_INTERFACE_PROFILES - 1 }, (_, index) =>
    localProfile("local-" + index, "Local " + index, "balanced")
  );
  const capacityResult = resolveInterfacePreferenceBundleImport(
    nearCapacity,
    incoming.bundle,
    "keep-both",
    "bundle.json",
    (name, index) => "capacity-" + index + "-" + name.replace(/\W/g, "")
  );
  assert(
    capacityResult.profiles.length === MAX_NAMED_INTERFACE_PROFILES &&
      capacityResult.skippedCapacity === 1,
    "Build 130 bundle import must never evict local profiles when the eight-profile capacity is reached."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify129, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-129-named-preference-profiles.ts"),
      source("../../../docs/BUILD_130_PROFILE_BUNDLES.md")
    ]);

  for (const token of [
    "renameNamedInterfacePreferenceProfile",
    "duplicateNamedInterfacePreferenceProfile",
    "INTERFACE_PREFERENCE_BUNDLE_FORMAT",
    "parseInterfacePreferenceBundle",
    "resolveInterfacePreferenceBundleImport"
  ]) {
    assert(preferencesLib.includes(token), "Build 130 preference library missing: " + token);
  }

  for (const token of [
    "Rename",
    "Duplicate",
    "Export named bundle",
    "Import named bundle",
    "Named bundle conflict preview",
    "Skip same-name incoming profiles",
    "Replace same-name local profiles",
    "Keep both with Imported suffix",
    "applyPreferenceBundleImport"
  ]) {
    assert(insights.includes(token), "Build 130 Insights UI missing: " + token);
  }

  assert(
    insights.includes("64 * 1024") &&
      insights.includes("Nothing has been imported yet") &&
      insights.includes("bundleConflictStrategy"),
    "Build 130 bundle imports must be bounded, staged and strategy-driven."
  );

  for (const selector of [
    ".interfaceBundlePreview",
    ".interfaceBundleSummary",
    ".interfaceBundleStrategy",
    ".interfaceBundleProfileList"
  ]) {
    assert(css.includes(selector), "Build 130 CSS contract missing: " + selector);
  }

  for (const topic of [
    "named-profile-rename-duplicate",
    "portable-preference-bundles",
    "preference-bundle-conflict-resolution"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 130 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 130 profile rename/duplicate, portable bundles & conflict resolution"),
    "Help Center must register the Build 130 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 130 shell must preserve Marble Standard as later interface builds advance."
  );

  assert(
    verify129.includes('shell.includes("Marble Standard")') &&
      !verify129.includes('shell.includes("Build 129 · Marble Standard")'),
    "Build 129 verifier must remain forward-compatible after the Build 130 shell label."
  );

  assert(
    pkg.includes("verify-build-130-profile-bundles.ts"),
    "Build 130 verifier must run in the application test chain."
  );

  assert(
    doc.includes("no database migration") &&
      doc.includes("no server-side synchronization") &&
      doc.includes("local IDs are excluded") &&
      doc.includes("Skip") &&
      doc.includes("Replace") &&
      doc.includes("Keep both") &&
      doc.includes("RLS"),
    "Build 130 documentation must preserve local-only bundle portability and explicit conflict governance."
  );

  console.log("Build 130 profile rename/duplicate, portable bundles and conflict resolution verification passed.");
}

void main();
