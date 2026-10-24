import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT,
  INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY,
  analyzeInterfacePreferenceBundleImport,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  parseInterfacePreferenceBundle,
  parseInterfacePreferenceRecoverySnapshot,
  reorderNamedInterfacePreferenceProfile,
  resolveInterfacePreferenceBundleImport,
  selectInterfacePreferenceBundleProfiles,
  serializeInterfacePreferenceRecoverySnapshot
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
  const ordered = [
    localProfile("one", "One", "balanced"),
    localProfile("two", "Two", "wide"),
    localProfile("three", "Three", "focused")
  ];

  const movedUp = reorderNamedInterfacePreferenceProfile(ordered, "three", "up");
  assert(
    movedUp.map((profile) => profile.id).join(",") === "one,three,two",
    "Build 131 must move a named profile up while preserving all records."
  );

  const movedTop = reorderNamedInterfacePreferenceProfile(ordered, "three", "top");
  assert(
    movedTop.map((profile) => profile.id).join(",") === "three,one,two",
    "Build 131 must support deterministic top ordering."
  );

  const boundary = reorderNamedInterfacePreferenceProfile(ordered, "one", "up");
  assert(
    boundary.map((profile) => profile.id).join(",") === "one,two,three",
    "Build 131 ordering must be stable at list boundaries."
  );

  const incoming = parseInterfacePreferenceBundle(
    JSON.stringify({
      format: "ai-data-platform-interface-preference-bundle",
      version: 1,
      profiles: [
        { name: "One", preferences: ordered[2].preferences },
        { name: "Travel", preferences: ordered[0].preferences },
        { name: "Night", preferences: ordered[1].preferences }
      ]
    })
  );
  assert(incoming.ok, "Build 131 selective import fixture bundle must parse.");
  if (!incoming.ok) return;

  const selected = selectInterfacePreferenceBundleProfiles(
    incoming.bundle,
    ["One", "Night"]
  );
  assert(
    selected.profiles.map((profile) => profile.name).join(",") === "One,Night",
    "Build 131 must preserve bundle order while filtering to the operator-selected subset."
  );

  const analysis = analyzeInterfacePreferenceBundleImport(ordered, selected);
  assert(
    analysis.incomingCount === 2 &&
      analysis.conflictCount === 1 &&
      analysis.conflicts[0]?.incomingName === "One",
    "Build 131 conflict analysis must operate only on selected incoming profiles."
  );

  const imported = resolveInterfacePreferenceBundleImport(
    ordered,
    selected,
    "skip",
    "selective-bundle.json",
    (name, index) => "selected-" + index + "-" + name.replace(/\W/g, "")
  );
  assert(
    imported.imported === 1 &&
      imported.skippedConflicts === 1 &&
      imported.profiles.some((profile) => profile.name === "Night") &&
      !imported.profiles.some((profile) => profile.name === "Travel"),
    "Build 131 selective import must ignore unselected bundle profiles completely."
  );

  const preferences = {
    version: 1 as const,
    navigationDensity: "compact" as const,
    workspaceLayout: "wide" as const,
    recommendations: "shortcuts" as const
  };
  const snapshot = createInterfacePreferenceRecoverySnapshot(
    preferences,
    movedUp
  );
  assert(
    snapshot.format === INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT &&
      snapshot.version === 1 &&
      snapshot.namedProfiles.map((profile) => profile.id).join(",") ===
        "one,three,two",
    "Build 131 recovery snapshot must preserve current preferences and named-profile order."
  );

  const serialized = serializeInterfacePreferenceRecoverySnapshot(
    preferences,
    movedUp
  );
  const parsedSnapshot = parseInterfacePreferenceRecoverySnapshot(serialized);
  assert(
    parsedSnapshot.ok &&
      parsedSnapshot.snapshot.preferences.workspaceLayout === "wide" &&
      parsedSnapshot.snapshot.namedProfiles[1]?.id === "three",
    "Build 131 recovery snapshot must round-trip without losing preference or ordering state."
  );

  const malformedSnapshot = parseInterfacePreferenceRecoverySnapshot(
    JSON.stringify({
      format: INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT,
      version: 1,
      preferences,
      namedProfiles: [ordered[0], ordered[0]]
    })
  );
  assert(
    !malformedSnapshot.ok,
    "Build 131 recovery parsing must reject duplicate or invalid named-profile records."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify130, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-130-profile-bundles.ts"),
      source("../../../docs/BUILD_131_PROFILE_ORDERING_RECOVERY.md")
    ]);

  for (const token of [
    "reorderNamedInterfacePreferenceProfile",
    "selectInterfacePreferenceBundleProfiles",
    "INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_FORMAT",
    "createInterfacePreferenceRecoverySnapshot",
    "parseInterfacePreferenceRecoverySnapshot"
  ]) {
    assert(preferencesLib.includes(token), "Build 131 preference library missing: " + token);
  }

  for (const token of [
    "Move up",
    "Move down",
    "Selective import",
    "Select all",
    "Clear selection",
    "Import selected profiles",
    "Local recovery snapshot",
    "Save snapshot",
    "Restore snapshot",
    "captureRecoverySnapshot"
  ]) {
    assert(insights.includes(token), "Build 131 Insights UI missing: " + token);
  }

  assert(
    insights.includes("setBundleSelectedNames(parsed.bundle.profiles.map") &&
      insights.includes("selectedBundlePreview") &&
      insights.includes("INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY") &&
      insights.includes("Recovery snapshot saved before importing"),
    "Build 131 must initialize selective imports and automatically snapshot before destructive bundle changes."
  );

  for (const selector of [
    ".interfaceRecoverySnapshot",
    ".interfaceBundleSelectionControls",
    ".interfaceBundleProfileSelect",
    ".interfaceBundleProfileList article.notSelected"
  ]) {
    assert(css.includes(selector), "Build 131 CSS contract missing: " + selector);
  }

  for (const topic of [
    "named-profile-ordering",
    "selective-bundle-import",
    "local-preference-recovery-snapshot"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 131 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 131 named profile ordering, selective bundle import & local recovery"),
    "Help Center must register the Build 131 help group."
  );

  assert(
    shell.includes("Build 131 · Marble Standard"),
    "Build 131 shell must expose the current interface build."
  );

  assert(
    verify130.includes('shell.includes("Marble Standard")') &&
      !verify130.includes('shell.includes("Build 130 · Marble Standard")'),
    "Build 130 verifier must remain forward-compatible after the Build 131 shell label."
  );

  assert(
    pkg.includes("verify-build-131-profile-ordering-recovery.ts"),
    "Build 131 verifier must run in the application test chain."
  );

  assert(
    doc.includes("no database migration") &&
      doc.includes("no server-side synchronization") &&
      doc.includes("one recovery snapshot") &&
      doc.includes("unselected") &&
      doc.includes("profile order") &&
      doc.includes("RLS"),
    "Build 131 documentation must preserve local-only ordering, selective import and recovery boundaries."
  );

  assert(
    INTERFACE_PREFERENCE_RECOVERY_SNAPSHOT_STORAGE_KEY.includes("recovery-snapshot"),
    "Build 131 must use a dedicated browser-local recovery snapshot namespace."
  );

  console.log("Build 131 profile ordering, selective bundle import and local recovery verification passed.");
}

void main();
