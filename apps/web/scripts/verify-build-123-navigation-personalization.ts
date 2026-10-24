import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  operatorCommandTargetByHref,
  sanitizeFavoriteOperatorDestinationHrefs,
  sanitizeSavedOperatorNavigationSets,
  workspaceOperatorShortcutTargets
} from "../lib/operator-command-palette";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const favorites = sanitizeFavoriteOperatorDestinationHrefs([
    "/connectors",
    "/not-registered",
    "/collection-runs",
    "/connectors",
    "/retention"
  ]);
  assert(
    favorites.length === 3 &&
      favorites[0] === "/connectors" &&
      favorites[1] === "/collection-runs" &&
      favorites[2] === "/retention",
    "Build 123 favorites must sanitize unknown routes and duplicates."
  );

  const sets = sanitizeSavedOperatorNavigationSets([
    {
      id: "set-daily",
      name: "  Daily   Ops ",
      hrefs: ["/collection-runs", "/connectors", "/unknown"]
    },
    {
      id: "bad id",
      name: "Reject me",
      hrefs: ["/retention"]
    },
    {
      id: "set-empty",
      name: "Empty",
      hrefs: ["/unknown"]
    }
  ]);
  assert(
    sets.length === 1 &&
      sets[0].id === "set-daily" &&
      sets[0].name === "Daily Ops" &&
      sets[0].hrefs.length === 2,
    "Build 123 saved navigation sets must sanitize identifiers, names and registered destinations."
  );

  const workspaceTargets = workspaceOperatorShortcutTargets(8);
  assert(workspaceTargets.length > 1, "Build 123 workspace shortcut collection must not be empty.");
  assert(
    workspaceTargets.every((target) => target.groupId === "workspace"),
    "Build 123 workspace shortcuts must derive only from the Workspace & Administration registry."
  );
  assert(
    workspaceTargets.some((target) => target.kind === "module") &&
      workspaceTargets.some((target) => target.href === "/workspace-profiles"),
    "Build 123 workspace shortcuts must include the module hub and registered workspace screens."
  );
  assert(
    workspaceTargets.every((target) => operatorCommandTargetByHref(target.href) !== null),
    "Build 123 workspace shortcuts must remain registered command targets."
  );

  const [component, registry, shell, css, help, pkg, verify122, doc] = await Promise.all([
    source("../app/OperatorCommandPalette.tsx"),
    source("../lib/operator-command-palette.ts"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-122-command-palette.ts"),
    source("../../../docs/BUILD_123_NAVIGATION_PERSONALIZATION.md")
  ]);

  assert(
    component.includes("FAVORITE_DESTINATIONS_KEY") &&
      component.includes("SAVED_NAVIGATION_SETS_KEY") &&
      component.includes("toggleFavorite") &&
      component.includes("saveFavoriteNavigationSet") &&
      component.includes("removeSavedNavigationSet") &&
      component.includes('setCollection("workspace")') === false &&
      component.includes('"workspace"') &&
      component.includes("workspaceOperatorShortcutTargets") &&
      component.includes("Saved navigation set name") &&
      component.includes("aria-pressed={isFavorite}"),
    "Build 123 command palette must provide favorites, named sets and workspace shortcuts."
  );
  assert(
    registry.includes("sanitizeFavoriteOperatorDestinationHrefs") &&
      registry.includes("sanitizeSavedOperatorNavigationSets") &&
      registry.includes("workspaceOperatorShortcutTargets"),
    "Build 123 registry helpers are incomplete."
  );
  assert(
    shell.includes("Build 123 · Marble Standard"),
    "Build 123 shared shell must expose the current interface build."
  );

  for (const selector of [
    ".commandPaletteCollections",
    ".commandPaletteSavedSetTab",
    ".commandPaletteResultRow",
    ".commandPaletteFavorite",
    ".commandPaletteSetBuilder"
  ]) {
    assert(css.includes(selector), "Build 123 CSS selector missing: " + selector);
  }

  for (const topic of [
    "operator-favorites",
    "saved-navigation-sets",
    "workspace-shortcuts"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 123 help topic missing: " + topic);
  }
  assert(
    help.includes("Build 123 pinned favorites, saved navigation sets & workspace shortcuts"),
    "Help Center must register the Build 123 help group."
  );
  assert(
    verify122.includes('shell.includes("Marble Standard")') &&
      !verify122.includes('shell.includes("Build 122 · Marble Standard")'),
    "Build 122 verifier must remain forward-compatible with later interface build labels."
  );
  assert(
    pkg.includes("verify-build-123-navigation-personalization.ts"),
    "Build 123 verifier must run in the application test chain."
  );
  assert(
    doc.includes("no database migration") &&
      doc.includes("localStorage") &&
      doc.includes("navigation-only") &&
      doc.includes("RLS"),
    "Build 123 documentation must preserve browser-local and navigation-only safety boundaries."
  );

  console.log("Build 123 pinned favorites, saved navigation sets and workspace shortcuts verification passed.");
}

void main();
