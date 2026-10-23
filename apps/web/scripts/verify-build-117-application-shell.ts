import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  APPLICATION_NAVIGATION,
  MODULE_CARDS,
  activeNavigationGroup
} from "../lib/application-navigation";
import { HISTORICAL_CORRECTIVE_WORKFLOW_GROUPS } from "../lib/historical-corrective-workflows";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function unique(values: string[]) {
  return new Set(values).size === values.length;
}

function assertArticleHelpCoverage(source: string, label: string) {
  const articles = [...source.matchAll(/<article\b[^>]*>/g)].map((match) => match[0]);
  assert(articles.length > 0, label + " unexpectedly contains no article cards.");
  for (const article of articles) {
    assert(
      article.includes("cardHelpSurface"),
      label + " contains an article card without the Build 117 help-surface contract: " + article
    );
  }
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const groupIds = APPLICATION_NAVIGATION.map((group) => group.id);
  const items = APPLICATION_NAVIGATION.flatMap((group) => group.items);
  const hrefs = items.map((item) => item.href);

  assert(unique(groupIds), "Build 117 application navigation group IDs must be unique.");
  assert(unique(hrefs), "Build 117 application navigation workflow hrefs must be unique.");
  assert(APPLICATION_NAVIGATION.length >= 7, "Build 117 must keep the full grouped application shell.");
  assert(MODULE_CARDS.length >= 5, "Build 117 Command Center must expose task-oriented module cards.");

  for (const group of APPLICATION_NAVIGATION) {
    assert(group.items.length > 0, "Navigation group has no workflows: " + group.id);
    assert(
      group.helpTopic in HELP_TOPICS,
      "Navigation group help topic is missing from the centralized registry: " + group.helpTopic
    );
    for (const item of group.items) {
      assert(
        item.helpTopic in HELP_TOPICS,
        "Navigation item help topic is missing from the centralized registry: " + item.helpTopic
      );
    }
  }

  assert(
    activeNavigationGroup("/approved-data/reconciliation/corrective-generation-operations").id ===
      "corrective",
    "Current corrective operations must resolve to the Corrective Operations shell module."
  );
  assert(
    activeNavigationGroup("/collection-projects").id === "collection",
    "Collection Projects must resolve to the Collection & Intelligence shell module."
  );
  assert(
    items.some(
      (item) =>
        item.href === "/approved-data/reconciliation/history" &&
        item.helpTopic === "corrective-history"
    ),
    "Build 117 must expose a dedicated corrective history/legacy sub-screen."
  );

  const legacyLinks = HISTORICAL_CORRECTIVE_WORKFLOW_GROUPS.flatMap((group) => group.links);
  assert(
    HISTORICAL_CORRECTIVE_WORKFLOW_GROUPS.length >= 6,
    "Build 117 must preserve grouped historical corrective access."
  );
  assert(unique(legacyLinks.map((item) => item.href)), "Historical corrective links must be unique.");
  assert(
    legacyLinks.some((item) => item.href === "/approved-data/reconciliation/triage") &&
      legacyLinks.some(
        (item) => item.href === "/approved-data/reconciliation/following-corrective-generation-closure"
      ) &&
      legacyLinks.some(
        (item) => item.href === "/approved-data/reconciliation/corrective-generation-lineage"
      ),
    "Build 117 historical registry must retain original, pre-unified and lineage access."
  );

  const [
    layout,
    shell,
    home,
    workflowDirectory,
    history,
    helpInfo,
    helpPage,
    aiSuggestions,
    css,
    helpDoc,
    buildDoc
  ] = await Promise.all([
    source("../app/layout.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/page.tsx"),
    source("../app/workflows/page.tsx"),
    source("../app/approved-data/reconciliation/history/page.tsx"),
    source("../app/help/HelpInfo.tsx"),
    source("../app/help/page.tsx"),
    source("../app/ai-field-suggestions.tsx"),
    source("../app/globals.css"),
    source("../../../docs/HELP_SYSTEM.md"),
    source("../../../docs/BUILD_117_APPLICATION_SHELL.md")
  ]);

  assert(
    layout.includes("<ApplicationShell>{children}</ApplicationShell>"),
    "Build 117 root layout must install the shared application shell."
  );
  assert(
    shell.includes("usePathname") &&
      shell.includes("APPLICATION_NAVIGATION") &&
      shell.includes("shellHelpCircle") &&
      shell.includes('href={"/help#" + topic}'),
    "Build 117 shell must provide route-aware grouped navigation and circled help deep links."
  );
  assert(
    !home.includes("const workflowLinks") &&
      home.includes("MODULE_CARDS") &&
      home.includes("MetricCard") &&
      home.includes("Browse workflows"),
    "Build 117 Command Center must replace the historical flat workflow launcher with modules."
  );
  assert(
    workflowDirectory.includes("MODULE_CARDS") &&
      workflowDirectory.includes("Workflow Directory") &&
      workflowDirectory.includes("cardHelpSurface"),
    "Build 117 must expose the task-oriented workflow directory with help-enabled cards."
  );
  assert(
    history.includes("HISTORICAL_CORRECTIVE_WORKFLOW_GROUPS") &&
      history.includes("History & Legacy Workflows") &&
      history.includes("Open current operations console"),
    "Build 117 must expose historical corrective workflows behind a dedicated sub-screen."
  );

  assertArticleHelpCoverage(home, "Command Center");
  assertArticleHelpCoverage(workflowDirectory, "Workflow Directory");
  assertArticleHelpCoverage(history, "Corrective History");
  assertArticleHelpCoverage(aiSuggestions, "AI Suggestions");

  for (const topic of [
    "shell-overview",
    "workflow-directory",
    "shell-data",
    "shell-collection",
    "shell-corrective",
    "corrective-operations-console",
    "corrective-state-machine",
    "corrective-history",
    "shell-integrations",
    "shell-workspace",
    "help-system-standard"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 117 help topic missing: " + topic);
  }

  assert(
    HELP_TOPICS["help-system-standard"].steps.some((step) =>
      step.includes("create or reuse a centralized help topic")
    ),
    "Build 117 help standard must explicitly require a help topic for new interface cards."
  );
  assert(
    helpInfo.includes('href={"/help#" + topic}') &&
      helpInfo.includes("Open full help topic"),
    "Contextual help must deep-link to the exact Help Center topic."
  );
  assert(
    helpPage.includes('id={topic}') && helpPage.includes("cardHelpSurface"),
    "Help Center topic cards must be directly addressable and keep card-level help."
  );
  assert(
    css.includes(".shellHelpCircle") &&
      css.includes(".applicationSidebar") &&
      css.includes(".applicationTopbar") &&
      css.includes(".cardHelpSurface > .helpInfoInline") &&
      css.includes(".moduleDirectoryCard") &&
      css.includes(".legacyWorkflowCard"),
    "Build 117 shell/help presentation styles are incomplete."
  );
  assert(
    helpDoc.includes("A new card is not interface-complete") &&
      helpDoc.includes("circled information signal") &&
      helpDoc.includes("keyboard focusable"),
    "Build 117 contextual help documentation must retain card-completion and accessibility rules."
  );
  assert(
    buildDoc.includes("no database migration") &&
      buildDoc.includes("no new mutation endpoint") &&
      buildDoc.includes("no historical workflow deletion"),
    "Build 117 documentation must preserve its navigation-only safety boundary."
  );

  console.log(
    "Build 117 application shell, workflow consolidation and mandatory card-help verification passed."
  );
}

void main();
