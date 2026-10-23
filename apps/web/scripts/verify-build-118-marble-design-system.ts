import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import { APPLICATION_NAVIGATION } from "../lib/application-navigation";
import {
  DEFAULT_UI_THEME,
  UI_THEMES,
  uiThemeById
} from "../lib/ui-theme";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  assert(
    DEFAULT_UI_THEME === "marble-standard",
    "Build 118 default theme must remain Marble Standard."
  );
  assert(UI_THEMES.length >= 1, "Build 118 theme registry must contain at least one theme.");
  assert(
    UI_THEMES[0].name === "Marble Standard" &&
      UI_THEMES[0].status === "active" &&
      uiThemeById("marble-standard").id === "marble-standard",
    "Build 118 Marble Standard registry metadata is incomplete."
  );
  assert(
    uiThemeById("unknown-theme").id === DEFAULT_UI_THEME,
    "Unknown theme IDs must fail safely to the default theme."
  );

  const [
    layout,
    surfaceCard,
    appearance,
    css,
    home,
    workflows,
    history,
    aiSuggestions,
    navigation,
    helpContent,
    designDoc,
    buildDoc
  ] = await Promise.all([
    source("../app/layout.tsx"),
    source("../app/ui/SurfaceCard.tsx"),
    source("../app/appearance/page.tsx"),
    source("../app/globals.css"),
    source("../app/page.tsx"),
    source("../app/workflows/page.tsx"),
    source("../app/approved-data/reconciliation/history/page.tsx"),
    source("../app/ai-field-suggestions.tsx"),
    source("../lib/application-navigation.ts"),
    source("../app/help/help-content.ts"),
    source("../../../docs/DESIGN_SYSTEM.md"),
    source("../../../docs/BUILD_118_MARBLE_DESIGN_SYSTEM.md")
  ]);

  assert(
    layout.includes("DEFAULT_UI_THEME") &&
      layout.includes("data-theme={DEFAULT_UI_THEME}"),
    "Build 118 root layout must declare the active theme through the registry."
  );

  for (const variant of ["default", "raised", "metric", "interactive", "inset"]) {
    assert(
      surfaceCard.includes('"' + variant + '"'),
      "SurfaceCard variant missing: " + variant
    );
    assert(
      css.includes(".uiSurfaceCard--" + variant),
      "SurfaceCard CSS variant missing: " + variant
    );
  }

  for (const status of ["neutral", "healthy", "attention", "critical", "info"]) {
    assert(
      surfaceCard.includes('"' + status + '"'),
      "SurfaceCard status missing: " + status
    );
    assert(
      css.includes(".uiSurfaceCard--" + status),
      "SurfaceCard semantic CSS missing: " + status
    );
  }

  assert(
    surfaceCard.includes("<HelpInfo") &&
      surfaceCard.includes("cardHelpSurface"),
    "SurfaceCard must preserve Build 117 contextual-help support."
  );

  for (const token of [
    "--theme-bg",
    "--theme-text",
    "--theme-border",
    "--theme-accent",
    "--theme-focus",
    "--theme-status-healthy",
    "--theme-status-attention",
    "--theme-status-critical",
    "--theme-status-info",
    "--marble-default",
    "--marble-raised",
    "--marble-inset"
  ]) {
    assert(css.includes(token), "Build 118 theme token missing: " + token);
  }

  assert(
    css.includes(':root[data-theme="marble-standard"]') &&
      css.includes("linear-gradient") &&
      css.includes("radial-gradient"),
    "Marble Standard must be generated from CSS theme gradients."
  );

  assert(
    !css.includes("url(") ||
      !/marble[^\n]*url\(/i.test(css),
    "Build 118 must not depend on a marble bitmap/image asset."
  );

  assert(
    css.includes("@media (prefers-reduced-motion: reduce)") &&
      css.includes(":focus-visible"),
    "Build 118 must preserve reduced-motion and keyboard-focus accessibility."
  );

  assert(
    appearance.includes("Appearance & Design System") &&
      appearance.includes("<SurfaceCard") &&
      appearance.includes('helpTopic="appearance-design-system"') &&
      appearance.includes('helpTopic="appearance-card-framework"') &&
      appearance.includes('helpTopic="appearance-status-system"') &&
      appearance.includes('helpTopic="appearance-accessibility"'),
    "Appearance specimen screen must demonstrate the theme, card framework and contextual help."
  );

  assert(
    APPLICATION_NAVIGATION.some(
      (group) =>
        group.id === "workspace" &&
        group.items.some(
          (item) =>
            item.href === "/appearance" &&
            item.helpTopic === "appearance-design-system"
        )
    ),
    "Build 118 Appearance screen must be reachable from Workspace & Administration."
  );

  for (const topic of [
    "appearance-design-system",
    "appearance-card-framework",
    "appearance-status-system",
    "appearance-accessibility"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 118 help topic missing: " + topic);
  }

  assert(
    helpContent.includes("Build 118 Marble Standard design system"),
    "Help Center must register the Build 118 design-system topic group."
  );

  for (const operatorSource of [home, workflows, history, aiSuggestions]) {
    assert(
      operatorSource.includes("uiSurfaceCard"),
      "Build 118 operator surface migration is incomplete."
    );
  }

  assert(
    home.includes("uiSurfaceCard--metric") &&
      home.includes("uiSurfaceCard--raised") &&
      home.includes("uiSurfaceCard--inset"),
    "Command Center must use multiple shared card hierarchy variants."
  );

  assert(
    css.includes(":root[data-theme=\"marble-standard\"] .card") &&
      css.includes(":root[data-theme=\"marble-standard\"] .panel") &&
      css.includes(":root[data-theme=\"marble-standard\"] .metricCard"),
    "Existing generic cards/panels/metrics must inherit Marble Standard."
  );

  assert(
    designDoc.includes("CSS gradients") &&
      designDoc.includes("SurfaceCard") &&
      designDoc.includes("Every major card") &&
      designDoc.includes("Future themes"),
    "Design-system documentation must preserve implementation and migration rules."
  );

  assert(
    buildDoc.includes("no database migration") &&
      buildDoc.includes("no stored user theme preference") &&
      buildDoc.includes("Build 119"),
    "Build 118 documentation must preserve non-goals and the next roadmap item."
  );

  console.log(
    "Build 118 Marble Standard theme, reusable card framework and visual foundation verification passed."
  );
}

void main();
