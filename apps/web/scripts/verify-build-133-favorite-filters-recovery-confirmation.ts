import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_PREFERENCE_BUNDLE_FORMAT,
  createNamedInterfacePreferenceProfile,
  filterNamedInterfacePreferenceProfiles,
  parseInterfacePreferenceBundle,
  planInterfacePreferenceBundleImportCapacity,
  reconcileInterfacePreferenceBundleImportOutcome,
  resolveInterfacePreferenceBundleImport
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
  favorite = false
) {
  return createNamedInterfacePreferenceProfile({
    id,
    name,
    favorite,
    preferences: {
      version: 1,
      navigationDensity: "adaptive",
      workspaceLayout: "balanced",
      recommendations: "all"
    }
  });
}

async function main() {
  const profiles = [
    localProfile("one", "One"),
    localProfile("two", "Two", true),
    localProfile("three", "Three", true)
  ];

  const all = filterNamedInterfacePreferenceProfiles(profiles, "all");
  const favorites = filterNamedInterfacePreferenceProfiles(
    profiles,
    "favorites"
  );
  assert(
    all.map((profile) => profile.id).join(",") === "one,two,three" &&
      favorites.map((profile) => profile.id).join(",") === "two,three",
    "Build 133 favorite quick filters must preserve explicit order while narrowing to favorites."
  );

  const incoming = parseInterfacePreferenceBundle(
    JSON.stringify({
      format: INTERFACE_PREFERENCE_BUNDLE_FORMAT,
      version: 1,
      profiles: [
        { name: "One", preferences: profiles[0].preferences },
        { name: "Travel", preferences: profiles[1].preferences }
      ]
    })
  );
  assert(incoming.ok, "Build 133 import reconciliation fixture must parse.");
  if (!incoming.ok) return;

  const plan = planInterfacePreferenceBundleImportCapacity(
    profiles,
    incoming.bundle,
    "replace"
  );
  const outcome = resolveInterfacePreferenceBundleImport(
    profiles,
    incoming.bundle,
    "replace",
    "build-133.json",
    (name, index) => "build133-" + index + "-" + name.replace(/\W/g, "")
  );
  const reconciled = reconcileInterfacePreferenceBundleImportOutcome(
    plan,
    outcome
  );
  assert(
    reconciled.matchesPlan &&
      reconciled.deviations.length === 0 &&
      reconciled.planned.added === 1 &&
      reconciled.actual.added === 1 &&
      reconciled.planned.replaced === 1 &&
      reconciled.actual.replaced === 1 &&
      reconciled.planned.finalCount === 4 &&
      reconciled.actual.finalCount === 4,
    "Build 133 must reconcile a matching capacity plan against the completed resolver outcome."
  );

  const deviated = reconcileInterfacePreferenceBundleImportOutcome(plan, {
    ...outcome,
    imported: outcome.imported - 1,
    skippedCapacity: outcome.skippedCapacity + 1,
    profiles: outcome.profiles.slice(0, -1)
  });
  assert(
    !deviated.matchesPlan &&
      deviated.deviations.length >= 3 &&
      deviated.deviations.some((item) => item.includes("Added profiles")) &&
      deviated.deviations.some((item) => item.includes("Capacity skips")) &&
      deviated.deviations.some((item) => item.includes("Final profile count")),
    "Build 133 must surface planned-versus-actual deviations instead of hiding them."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify132, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-132-profile-favorites-recovery-capacity.ts"),
      source("../../../docs/BUILD_133_FAVORITE_FILTERS_RECOVERY_CONFIRMATION_IMPORT_RECONCILIATION.md")
    ]);

  for (const token of [
    "NamedInterfacePreferenceQuickFilter",
    "filterNamedInterfacePreferenceProfiles",
    "InterfacePreferenceBundleImportOutcomeReconciliation",
    "reconcileInterfacePreferenceBundleImportOutcome",
    "matchesPlan",
    "deviations"
  ]) {
    assert(preferencesLib.includes(token), "Build 133 preference library missing: " + token);
  }

  for (const token of [
    "All profiles (",
    "★ Favorites (",
    "Showing {filteredNamedProfiles.length} of {namedProfiles.length}",
    "Review & confirm restore",
    "Confirm restore",
    "Cancel confirmation",
    "Import plan outcome reconciliation",
    "planned /",
    "No deviations were detected",
    "setRecoveryRestoreArmed(false)",
    "setBundleImportOutcome(outcome)"
  ]) {
    assert(insights.includes(token), "Build 133 Insights UI missing: " + token);
  }

  assert(
    insights.includes('aria-pressed={profileQuickFilter === "all"}') &&
      insights.includes('aria-pressed={profileQuickFilter === "favorites"}') &&
      insights.includes("filterNamedInterfacePreferenceProfiles") &&
      insights.includes("reconcileInterfacePreferenceBundleImportOutcome"),
    "Build 133 must expose accessible quick-filter state and import outcome reconciliation."
  );

  assert(
    insights.includes("if (!recoveryRestoreArmed)") &&
      insights.includes("Restore confirmation armed") &&
      insights.includes("Local recovery snapshot restored after confirmation"),
    "Build 133 recovery restore must require an explicit second confirmation before applying local state."
  );

  for (const selector of [
    ".interfaceFavoriteQuickFilters",
    ".interfaceBundleOutcomeReconciliation",
    ".interfaceBundleOutcomeGrid",
    ".interfaceBundleOutcomeReconciliation.deviated"
  ]) {
    assert(css.includes(selector), "Build 133 CSS contract missing: " + selector);
  }

  for (const topic of [
    "favorite-profile-quick-filters",
    "recovery-restore-confirmation",
    "import-plan-outcome-reconciliation"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 133 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 133 favorite quick filters, recovery restore confirmation & import plan outcome reconciliation"),
    "Help Center must register the Build 133 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 133 shell must preserve Marble Standard as later interface builds advance."
  );

  assert(
    verify132.includes('shell.includes("Marble Standard")') &&
      !verify132.includes('shell.includes("Build 132 · Marble Standard")'),
    "Build 132 verifier must remain forward-compatible after the Build 133 shell label."
  );

  assert(
    pkg.includes("verify-build-133-favorite-filters-recovery-confirmation.ts"),
    "Build 133 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("favorite quick filter") &&
      docLower.includes("two-step confirmation") &&
      docLower.includes("planned-versus-actual") &&
      docLower.includes("rls"),
    "Build 133 documentation must preserve local-only filtering, confirmation and reconciliation boundaries."
  );

  console.log("Build 133 favorite filters, recovery confirmation and import outcome reconciliation verification passed.");
}

void main();
