import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  emptyNavigationUsageSnapshot,
  navigationUsageTotals,
  personalizedInterfaceRecommendations,
  recordNavigationShortcutUse,
  recordNavigationVisit,
  sanitizeNavigationUsageSnapshot,
  shortcutDiscoverabilityMetrics
} from "../lib/navigation-insights";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function source(relative: string) { return readFile(new URL(relative, import.meta.url), "utf8"); }

async function main() {
  const sanitized = sanitizeNavigationUsageSnapshot({
    version: 900,
    visits: { "/collection-runs": 4.8, "/connectors": 2, "/unknown": 500, "/retention": -3, "/modules/data": 5000 },
    shortcuts: { "command-palette": 2.9, "keyboard-map": 5000, unknown: 99 }
  });
  assert(
    sanitized.visits["/collection-runs"] === 4 &&
      sanitized.visits["/connectors"] === 2 &&
      sanitized.visits["/modules/data"] === 999 &&
      !("/unknown" in sanitized.visits) &&
      !("/retention" in sanitized.visits),
    "Build 125 usage sanitization must keep only registered, bounded positive destination counts."
  );
  assert(
    sanitized.shortcuts["command-palette"] === 2 &&
      sanitized.shortcuts["keyboard-map"] === 999,
    "Build 125 shortcut counts must be bounded and sanitized."
  );

  let snapshot = emptyNavigationUsageSnapshot();
  snapshot = recordNavigationVisit(snapshot, "/collection-runs");
  snapshot = recordNavigationVisit(snapshot, "/collection-runs/active");
  snapshot = recordNavigationVisit(snapshot, "/connectors");
  snapshot = recordNavigationShortcutUse(snapshot, "command-palette");

  const totals = navigationUsageTotals(snapshot);
  assert(totals.totalVisits === 3 && totals.uniqueDestinations === 2 && totals.shortcutUses === 1,
    "Build 125 aggregate totals must reflect only registered visits and shortcut opens.");

  const shortcutMetrics = shortcutDiscoverabilityMetrics(snapshot);
  assert(
    shortcutMetrics.find((metric) => metric.id === "command-palette")?.level === "exploring" &&
      shortcutMetrics.find((metric) => metric.id === "keyboard-map")?.level === "not-tried",
    "Build 125 shortcut discoverability levels must be deterministic."
  );

  const recommendations = personalizedInterfaceRecommendations(snapshot, "/retention", 6);
  assert(recommendations.some((item) => item.kind === "destination" && item.href === "/collection-runs"),
    "Build 125 recommendations must surface frequently visited registered destinations.");
  assert(recommendations.some((item) => item.kind === "shortcut" && item.id === "shortcut:keyboard-map"),
    "Build 125 recommendations must surface unused navigation shortcuts after sufficient local activity.");

  const [insights, palette, assist, shell, css, help, pkg, verify124, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/OperatorCommandPalette.tsx"),
    source("../app/NavigationAssist.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-124-navigation-accessibility.ts"),
    source("../../../docs/BUILD_125_NAVIGATION_INSIGHTS.md")
  ]);

  assert(
    insights.includes("NAVIGATION_INSIGHTS_STORAGE_KEY") &&
      insights.includes("window.localStorage") &&
      insights.includes("NAVIGATION_USAGE_EVENT") &&
      insights.includes("Reset local insights") &&
      insights.includes("Shortcut metrics") &&
      insights.includes("Suggested for you") &&
      insights.includes('role="dialog"') &&
      insights.includes('aria-modal="true"'),
    "Build 125 insights panel must provide local aggregate metrics, recommendations and reset controls."
  );
  assert(
    palette.includes("NAVIGATION_USAGE_EVENT") &&
      palette.includes('shortcutId: "command-palette"') &&
      assist.includes("NAVIGATION_USAGE_EVENT") &&
      assist.includes('shortcutId: "keyboard-map"'),
    "Build 125 must measure discoverability through explicit command-palette and keyboard-map opens."
  );
  assert(shell.includes("<NavigationInsights />") && shell.includes("Build 125 · Marble Standard"),
    "Build 125 shared shell must install navigation insights and expose the current interface build.");

  for (const selector of [
    ".navigationInsightsTrigger", ".navigationInsightsBackdrop", ".navigationInsightsDialog",
    ".navigationInsightMetrics", ".shortcutDiscoverabilityList",
    ".interfaceRecommendationList", ".navigationInsightsFooter"
  ]) assert(css.includes(selector), "Build 125 CSS selector missing: " + selector);

  for (const topic of [
    "navigation-usage-insights", "shortcut-discoverability-metrics", "personalized-interface-recommendations"
  ] as const) assert(topic in HELP_TOPICS, "Build 125 help topic missing: " + topic);

  assert(help.includes("Build 125 navigation insights, shortcut metrics & interface recommendations"),
    "Help Center must register the Build 125 help group.");
  assert(
    verify124.includes('shell.includes("Marble Standard")') &&
      !verify124.includes('shell.includes("Build 124 · Marble Standard")'),
    "Build 124 verifier must remain forward-compatible with later interface build labels."
  );
  assert(pkg.includes("verify-build-125-navigation-insights.ts"),
    "Build 125 verifier must run in the application test chain.");
  assert(
    doc.includes("no database migration") &&
      doc.includes("localStorage") &&
      doc.includes("no timestamps") &&
      doc.includes("navigation-only") &&
      doc.includes("RLS"),
    "Build 125 documentation must preserve local-only, aggregate and navigation-only safety boundaries."
  );

  console.log("Build 125 navigation insights, shortcut discoverability and personalized interface recommendations verification passed.");
}
void main();
