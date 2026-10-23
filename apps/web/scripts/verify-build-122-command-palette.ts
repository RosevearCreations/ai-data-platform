import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import { APPLICATION_NAVIGATION, MODULE_CARDS, moduleHubHref } from "../lib/application-navigation";
import {
  OPERATOR_COMMAND_TARGETS,
  operatorCommandTargetByHref,
  operatorCommandTargetByPathname,
  sanitizeRecentOperatorDestinationHrefs,
  searchOperatorCommandTargets
} from "../lib/operator-command-palette";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const hrefs = OPERATOR_COMMAND_TARGETS.map((target) => target.href);
  assert(new Set(hrefs).size === hrefs.length, "Build 122 command targets must have unique hrefs.");

  for (const group of MODULE_CARDS) {
    const target = operatorCommandTargetByHref(moduleHubHref(group.id));
    assert(target?.kind === "module", "Build 122 palette missing module hub: " + group.id);
  }

  for (const group of APPLICATION_NAVIGATION) {
    for (const item of group.items) {
      assert(
        operatorCommandTargetByHref(item.href)?.kind === "screen",
        "Build 122 palette missing registered screen: " + item.href
      );
    }
  }

  assert(
    searchOperatorCommandTargets("collection run").some(
      (target) => target.href === "/collection-runs"
    ),
    "Build 122 command search must find Collection Runs across modules."
  );
  assert(
    searchOperatorCommandTargets("connector").some(
      (target) => target.href === "/connectors"
    ),
    "Build 122 command search must find connector workflows."
  );
  assert(
    operatorCommandTargetByPathname("/approved-data/delivery/example")?.href ===
      "/approved-data/delivery",
    "Build 122 pathname resolution must prefer the most specific registered destination."
  );

  const sanitized = sanitizeRecentOperatorDestinationHrefs([
    "/connectors",
    "/not-registered",
    "/connectors",
    "/collection-runs",
    42
  ]);
  assert(
    sanitized.length === 2 &&
      sanitized[0] === "/connectors" &&
      sanitized[1] === "/collection-runs",
    "Build 122 recent-destination sanitization must remove unknown and duplicate values."
  );

  const [component, shell, css, help, pkg, verify121, doc] = await Promise.all([
    source("../app/OperatorCommandPalette.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-121-module-operator-tools.ts"),
    source("../../../docs/BUILD_122_COMMAND_PALETTE.md")
  ]);

  assert(
    component.includes("RECENT_DESTINATIONS_KEY") &&
      component.includes("window.localStorage") &&
      component.includes("metaKey || event.ctrlKey") &&
      component.includes('event.key.toLowerCase() === "k"') &&
      component.includes('"Escape"') &&
      component.includes('"ArrowDown"') &&
      component.includes('"ArrowUp"') &&
      component.includes('type="search"') &&
      component.includes("Recent operator destinations") &&
      component.includes("router.push"),
    "Build 122 palette must provide keyboard-first cross-module search and browser-local recent navigation."
  );
  assert(
    shell.includes("<OperatorCommandPalette />") &&
      shell.includes("Build 122 · Marble Standard"),
    "Build 122 shared shell must expose the palette and current interface build."
  );

  for (const selector of [
    ".commandPaletteTrigger",
    ".commandPaletteBackdrop",
    ".commandPaletteDialog",
    ".commandPaletteSearch",
    ".commandPaletteResults",
    ".commandPaletteResult"
  ]) {
    assert(css.includes(selector), "Build 122 CSS selector missing: " + selector);
  }

  for (const topic of ["command-palette", "recent-operator-destinations"] as const) {
    assert(topic in HELP_TOPICS, "Build 122 help topic missing: " + topic);
  }
  assert(
    help.includes("Build 122 cross-module command palette & recent operator destinations"),
    "Help Center must register the Build 122 help group."
  );
  assert(
    verify121.includes('shell.includes("Marble Standard")') &&
      !verify121.includes('shell.includes("Build 121 · Marble Standard")'),
    "Build 121 verifier must remain forward-compatible with later interface build labels."
  );
  assert(
    pkg.includes("verify-build-122-command-palette.ts"),
    "Build 122 verifier must run in the application test chain."
  );
  assert(
    doc.includes("no database migration") &&
      doc.includes("localStorage") &&
      doc.includes("navigation-only") &&
      doc.includes("RLS"),
    "Build 122 documentation must preserve browser-local and navigation-only safety boundaries."
  );

  console.log("Build 122 cross-module command palette and recent operator destinations verification passed.");
}

void main();
