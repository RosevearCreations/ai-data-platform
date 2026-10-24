import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_BUNDLE_FORMAT,
  MAX_NAMED_INTERFACE_PROFILES,
  createInterfacePreferenceBundle,
  createInterfacePreferenceRecoverySnapshot,
  createNamedInterfacePreferenceProfile,
  diffInterfacePreferenceRecoverySnapshot,
  favoriteNamedInterfacePreferenceProfiles,
  parseInterfacePreferenceBundle,
  planInterfacePreferenceBundleImportCapacity,
  setNamedInterfacePreferenceProfileFavorite
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

function localProfile(
  id: string,
  name: string,
  layout: "balanced" | "wide" | "focused",
  favorite = false
) {
  return createNamedInterfacePreferenceProfile({
    id,
    name,
    favorite,
    preferences: {
      version: 1,
      navigationDensity: "adaptive",
      workspaceLayout: layout,
      recommendations: "all"
    }
  });
}

async function main() {
  const profiles = [
    localProfile("one", "One", "balanced"),
    localProfile("two", "Two", "wide", true),
    localProfile("three", "Three", "focused")
  ];

  const favorited = setNamedInterfacePreferenceProfileFavorite(
    profiles,
    "one",
    true
  );
  assert(
    favorited[0]?.favorite === true &&
      favoriteNamedInterfacePreferenceProfiles(favorited)
        .map((profile) => profile.id)
        .join(",") === "one,two",
    "Build 132 must toggle browser-local favorite state without reordering profiles."
  );

  const unfavorited = setNamedInterfacePreferenceProfileFavorite(
    favorited,
    "two",
    false
  );
  assert(
    unfavorited.map((profile) => profile.id).join(",") === "one,two,three" &&
      favoriteNamedInterfacePreferenceProfiles(unfavorited)
        .map((profile) => profile.id)
        .join(",") === "one",
    "Build 132 favorite changes must preserve explicit named-profile order."
  );

  const portable = createInterfacePreferenceBundle(favorited);
  const portableJson = JSON.stringify(portable);
  assert(
    !portableJson.includes('"favorite"') &&
      portable.format === INTERFACE_PREFERENCE_BUNDLE_FORMAT,
    "Build 132 portable named bundles must not export browser-local favorite metadata."
  );

  const snapshot = createInterfacePreferenceRecoverySnapshot(
    {
      version: 1,
      navigationDensity: "compact",
      workspaceLayout: "focused",
      recommendations: "shortcuts"
    },
    favorited
  );
  assert(
    snapshot.namedProfiles[0]?.favorite === true &&
      snapshot.namedProfiles[1]?.favorite === true,
    "Build 132 recovery snapshots must preserve browser-local favorite state."
  );

  const currentProfiles = [
    localProfile("two", "Two renamed", "balanced", false),
    localProfile("one", "One", "balanced", false),
    localProfile("current-only", "Current only", "wide")
  ];
  const recoveryDiff = diffInterfacePreferenceRecoverySnapshot(
    snapshot,
    {
      version: 1,
      navigationDensity: "adaptive",
      workspaceLayout: "balanced",
      recommendations: "all"
    },
    currentProfiles
  );
  assert(
    recoveryDiff.hasChanges &&
      recoveryDiff.preferenceChanges.length === 3 &&
      recoveryDiff.currentOnlyProfiles.includes("Current only") &&
      recoveryDiff.snapshotOnlyProfiles.includes("Three") &&
      recoveryDiff.changedProfiles.includes("Two") &&
      recoveryDiff.favoriteChanges.includes("One") &&
      recoveryDiff.favoriteChanges.includes("Two") &&
      recoveryDiff.orderChanged,
    "Build 132 recovery diff must report preference, membership, detail, favorite and ordering changes before restore."
  );

  const matchingDiff = diffInterfacePreferenceRecoverySnapshot(
    snapshot,
    snapshot.preferences,
    snapshot.namedProfiles
  );
  assert(
    !matchingDiff.hasChanges &&
      matchingDiff.preferenceChanges.length === 0 &&
      !matchingDiff.orderChanged,
    "Build 132 recovery diff must report no changes for an identical snapshot/current state."
  );

  const incoming = parseInterfacePreferenceBundle(
    JSON.stringify({
      format: INTERFACE_PREFERENCE_BUNDLE_FORMAT,
      version: 1,
      profiles: [
        { name: "One", preferences: profiles[2].preferences },
        { name: "Travel", preferences: profiles[0].preferences },
        { name: "Night", preferences: profiles[1].preferences }
      ]
    })
  );
  assert(incoming.ok, "Build 132 capacity-planning fixture bundle must parse.");
  if (!incoming.ok) return;

  const skipPlan = planInterfacePreferenceBundleImportCapacity(
    profiles,
    incoming.bundle,
    "skip"
  );
  assert(
    skipPlan.currentCount === 3 &&
      skipPlan.selectedCount === 3 &&
      skipPlan.conflictCount === 1 &&
      skipPlan.newSlotDemand === 2 &&
      skipPlan.projectedAdded === 2 &&
      skipPlan.projectedSkippedConflicts === 1 &&
      skipPlan.projectedSkippedCapacity === 0 &&
      skipPlan.projectedFinalCount === 5 &&
      skipPlan.fitsWithoutCapacitySkips,
    "Build 132 Skip capacity plan must forecast conflicts and additions without consuming slots for skipped conflicts."
  );

  const replacePlan = planInterfacePreferenceBundleImportCapacity(
    profiles,
    incoming.bundle,
    "replace"
  );
  assert(
    replacePlan.projectedReplaced === 1 &&
      replacePlan.newSlotDemand === 2 &&
      replacePlan.projectedFinalCount === 5,
    "Build 132 Replace capacity plan must reuse the existing conflicting slot."
  );

  const keepBothPlan = planInterfacePreferenceBundleImportCapacity(
    profiles,
    incoming.bundle,
    "keep-both"
  );
  assert(
    keepBothPlan.newSlotDemand === 3 &&
      keepBothPlan.projectedAdded === 3 &&
      keepBothPlan.projectedFinalCount === 6,
    "Build 132 Keep both capacity plan must count same-name conflicts as new slot demand."
  );

  const nearCapacity = Array.from(
    { length: MAX_NAMED_INTERFACE_PROFILES - 1 },
    (_, index) => localProfile("full-" + index, "Full " + index, "balanced")
  );
  const capacityRisk = planInterfacePreferenceBundleImportCapacity(
    nearCapacity,
    incoming.bundle,
    "keep-both"
  );
  assert(
    capacityRisk.availableSlots === 1 &&
      capacityRisk.projectedAdded === 1 &&
      capacityRisk.projectedSkippedCapacity === 2 &&
      capacityRisk.projectedFinalCount === MAX_NAMED_INTERFACE_PROFILES &&
      !capacityRisk.fitsWithoutCapacitySkips,
    "Build 132 capacity plan must forecast skipped additions at the eight-profile local limit."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify131, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-131-profile-ordering-recovery.ts"),
      source("../../../docs/BUILD_132_PROFILE_FAVORITES_RECOVERY_DIFF_CAPACITY.md")
    ]);

  for (const token of [
    "setNamedInterfacePreferenceProfileFavorite",
    "favoriteNamedInterfacePreferenceProfiles",
    "diffInterfacePreferenceRecoverySnapshot",
    "planInterfacePreferenceBundleImportCapacity",
    "fitsWithoutCapacitySkips"
  ]) {
    assert(preferencesLib.includes(token), "Build 132 preference library missing: " + token);
  }

  for (const token of [
    "Favorite",
    "Unfavorite",
    "Recovery diff preview",
    "Import capacity plan",
    "projected final",
    "capacity skip",
    "bundleCapacityPlan",
    "recoveryDiff"
  ]) {
    assert(insights.includes(token), "Build 132 Insights UI missing: " + token);
  }

  assert(
    insights.includes('aria-pressed={selectedNamedProfile?.favorite ?? false}') &&
      insights.includes('profile.favorite ? "★ " : ""') &&
      insights.includes("diffInterfacePreferenceRecoverySnapshot") &&
      insights.includes("planInterfacePreferenceBundleImportCapacity"),
    "Build 132 UI must expose accessible favorite state plus live recovery/capacity previews."
  );

  for (const selector of [
    ".interfaceFavoriteSummary",
    ".interfaceRecoveryDiffPreview",
    ".interfaceRecoveryDiffSummary",
    ".interfaceBundleCapacityPlan",
    ".interfaceBundleCapacityMetrics"
  ]) {
    assert(css.includes(selector), "Build 132 CSS contract missing: " + selector);
  }

  for (const topic of [
    "named-profile-favorites",
    "recovery-diff-preview",
    "bundle-import-capacity-planning"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 132 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 132 profile favorites, recovery diff preview & bundle capacity planning"),
    "Help Center must register the Build 132 help group."
  );

  assert(
    shell.includes("Build 132 · Marble Standard"),
    "Build 132 shell must expose the current interface build."
  );

  assert(
    verify131.includes('shell.includes("Marble Standard")') &&
      !verify131.includes('shell.includes("Build 131 · Marble Standard")'),
    "Build 131 verifier must remain forward-compatible after the Build 132 shell label."
  );

  assert(
    pkg.includes("verify-build-132-profile-favorites-recovery-capacity.ts"),
    "Build 132 verifier must run in the application test chain."
  );

  assert(
    doc.includes("no database migration") &&
      doc.includes("no server-side synchronization") &&
      doc.includes("favorites are not exported") &&
      doc.includes("read-only diff") &&
      doc.includes("capacity forecast") &&
      doc.includes("RLS"),
    "Build 132 documentation must preserve local-only favorites, preview and capacity-planning boundaries."
  );

  console.log("Build 132 favorites, recovery diff and bundle capacity planning verification passed.");
}

void main();
