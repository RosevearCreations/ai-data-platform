import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import { MODULE_CARDS } from "../lib/application-navigation";
import {
  moduleOperatorToolsById,
  validateModuleOperatorTools
} from "../lib/module-operator-tools";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  for (const group of MODULE_CARDS) {
    const tools = moduleOperatorToolsById(group.id);
    assert(tools, "Build 121 operator-tool registry missing module: " + group.id);
    assert(tools.taskPanels.length > 0, "Build 121 module has no task panels: " + group.id);
    assert(tools.shortcuts.length >= 2, "Build 121 module has too few shortcuts: " + group.id);

    const validation = validateModuleOperatorTools(group, tools);
    assert(validation.panelHrefsValid, "Build 121 task panel references an unknown screen: " + group.id);
    assert(validation.shortcutsValid, "Build 121 shortcut references an unknown screen: " + group.id);
    assert(validation.allItemsCovered, "Build 121 task panels do not cover every module screen: " + group.id);
  }

  const [page, client, registry, shell, css, help, pkg, doc] = await Promise.all([
    source("../app/modules/[moduleId]/page.tsx"),
    source("../app/modules/[moduleId]/ModuleHubTools.tsx"),
    source("../lib/module-operator-tools.ts"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("../../../docs/BUILD_121_MODULE_OPERATOR_TOOLS.md")
  ]);

  assert(
    page.includes("<ModuleHubTools") &&
      page.includes("moduleOperatorToolsById") &&
      client.includes("Choose the next sub-screen") &&
      page.includes('aria-label="Open sub-screen task panels"'),
    "Build 121 module hub must install the operator tools without breaking Build 120 progressive navigation."
  );
  assert(
    client.includes('"use client"') &&
      client.includes('type="search"') &&
      client.includes("useMemo") &&
      client.includes("matching sub-screen") &&
      client.includes("Operator shortcuts") &&
      client.includes("moduleTaskPanel"),
    "Build 121 client module tools must provide live local search, shortcuts and task panels."
  );
  assert(
    registry.includes("MODULE_OPERATOR_TOOLS") &&
      registry.includes("validateModuleOperatorTools") &&
      registry.includes("allItemsCovered"),
    "Build 121 module operator registry or validation contract is incomplete."
  );
  assert(
    shell.includes("Build 121 · Marble Standard"),
    "Build 121 shared shell footer must expose the active interface build."
  );
  for (const selector of [
    ".moduleOperatorToolbar",
    ".moduleSearchCard",
    ".moduleShortcutLinks",
    ".moduleTaskPanelGrid",
    ".moduleTaskItem"
  ]) {
    assert(css.includes(selector), "Build 121 CSS selector missing: " + selector);
  }

  for (const topic of ["module-task-panels", "module-search", "operator-shortcuts"] as const) {
    assert(topic in HELP_TOPICS, "Build 121 help topic missing: " + topic);
  }
  assert(
    help.includes("Build 121 in-module task panels, search & operator shortcuts"),
    "Help Center must register the Build 121 help group."
  );
  assert(
    pkg.includes("verify-build-121-module-operator-tools.ts"),
    "Build 121 verifier must run in the application test chain."
  );
  assert(
    doc.includes("no database migration") &&
      doc.includes("client-side") &&
      doc.includes("navigation-only") &&
      doc.includes("RLS"),
    "Build 121 documentation must preserve local-search and navigation-only safety boundaries."
  );

  console.log("Build 121 in-module task panels, search and operator shortcuts verification passed.");
}

void main();
