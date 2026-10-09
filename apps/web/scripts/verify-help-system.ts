import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const coveredFiles = [
  "../app/page.tsx",
  "../app/ai-field-suggestions.tsx",
  "../app/capture/page.tsx",
  "../app/capture/barcode-capture-client.tsx",
  "../app/intelligence/page.tsx",
  "../app/remote-execution/page.tsx",
  "../app/remote-execution/RemotePilotAdminPanel.tsx",
  "../app/sign-in/page.tsx",
  "../app/workspace-profiles/page.tsx",
  "../app/workspace-profiles/WorkspaceProfileManager.tsx",
  "../app/connectors/page.tsx",
  "../app/connectors/ConnectorManager.tsx",
  "../app/help/page.tsx"
];

for (const relative of coveredFiles) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  assert(
    source.includes("<HelpInfo"),
    "Contextual help control missing from " + relative
  );
}

assert(
  Object.keys(HELP_TOPICS).length >= 24,
  "Help registry unexpectedly lost detailed section topics."
);

const remote = HELP_TOPICS["remote-overview"];
assert(
  "manual" in remote &&
    remote.manual.some((step) => step.includes("BROWSERLESS_API_TOKEN")) &&
    remote.manual.some((step) => step.includes("REMOTE_EXECUTION_KILL_SWITCH")),
  "Remote help must retain exact Browserless manual-intervention variables."
);

const connector = HELP_TOPICS["connector-workspace"];
assert(
  "manual" in connector &&
    connector.manual.some((step) => step.includes("encrypted secret")) &&
    connector.manual.some((step) => step.includes("requires no manual")),
  "Connector help must explain both no-setup sample behavior and future secret setup."
);

console.log(
  "Build 029 contextual help coverage, Browserless manual variables and connector intervention guidance passed."
);
