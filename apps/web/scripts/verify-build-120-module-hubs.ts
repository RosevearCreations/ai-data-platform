import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  MODULE_CARDS,
  activeNavigationGroup,
  activeNavigationItem,
  moduleHubHref,
  moduleNavigationGroupById
} from "../lib/application-navigation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const hubHrefs = MODULE_CARDS.map((group) => moduleHubHref(group.id));

  assert(new Set(hubHrefs).size === hubHrefs.length, "Build 120 module hub hrefs must be unique.");
  assert(
    MODULE_CARDS.every((group) => moduleNavigationGroupById(group.id)?.id === group.id),
    "Build 120 module registry lookup must resolve every module card."
  );
  assert(activeNavigationGroup("/modules/collection").id === "collection", "Collection module hub must keep Collection & Intelligence active.");
  assert(activeNavigationGroup("/modules/corrective").id === "corrective", "Corrective module hub must keep Corrective Operations active.");
  assert(activeNavigationItem("/modules/collection") === null, "Module hubs must not pretend to be a workflow item.");

  const [shell, home, directory, modulePage, moduleTools, css, help, pkg, doc] = await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/page.tsx"),
    source("../app/workflows/page.tsx"),
    source("../app/modules/[moduleId]/page.tsx"),
    source("../app/modules/[moduleId]/ModuleHubTools.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("../../../docs/BUILD_120_MODULE_HUBS.md")
  ]);

  assert(
    shell.includes("applicationBreadcrumbs") &&
      shell.includes("applicationNavHubLink") &&
      shell.includes("Module hub") &&
      shell.includes("moduleHubHref"),
    "Build 120 shell must expose module-aware breadcrumbs and hub navigation."
  );
  assert(
    home.includes("moduleHubHref(group.id)") && home.includes("Open {group.shortLabel} hub"),
    "Build 120 Operator Home module cards must enter module hubs first."
  );
  assert(
    directory.includes("Open module hub") &&
      directory.includes("moduleHubHref(group.id)") &&
      directory.includes("sub-screen"),
    "Build 120 Workflow Directory must expose module hubs and sub-screen language."
  );
  assert(
    modulePage.includes("moduleNavigationGroupById") &&
      modulePage.includes("notFound()") &&
      moduleTools.includes("Choose the next sub-screen") &&
      modulePage.includes("cardHelpSurface") &&
      moduleTools.includes("cardHelpSurface") &&
      moduleTools.includes("Open sub-screen"),
    "Build 120 dynamic module hub must retain progressive help-enabled sub-screen cards, including when later builds extract them into a client component."
  );
  assert(
    css.includes(".moduleHubGrid") &&
      css.includes(".moduleHubStepCard") &&
      css.includes(".applicationBreadcrumbs") &&
      css.includes(".applicationNavHubLink"),
    "Build 120 module hub and progressive-navigation styles are incomplete."
  );

  for (const topic of ["module-hubs", "progressive-navigation"] as const) {
    assert(topic in HELP_TOPICS, "Build 120 help topic missing: " + topic);
  }
  assert(help.includes("Build 120 module hubs & progressive navigation"), "Help Center must register the Build 120 help group.");
  assert(pkg.includes("verify-build-120-module-hubs.ts"), "Build 120 verifier must run in the application test chain.");
  assert(
    doc.includes("no database migration") && doc.includes("navigation only") && doc.includes("RLS"),
    "Build 120 documentation must preserve its navigation-only safety boundary."
  );

  console.log("Build 120 module hubs, sub-screens and progressive navigation verification passed.");
}

void main();
