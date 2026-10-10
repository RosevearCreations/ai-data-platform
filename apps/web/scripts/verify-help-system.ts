import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
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
    "../app/integration-delivery/page.tsx",
    "../app/retention/page.tsx",
    "../app/production-learning/page.tsx",
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
    Object.keys(HELP_TOPICS).length >= 30,
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

  const learning = HELP_TOPICS["learning-browserless"];
  assert(
    "manual" in learning &&
      learning.manual.some((step) => step.includes("Source Policy")) &&
      learning.manual.some((step) => step.includes("REMOTE_EXECUTION_KILL_SWITCH")) &&
      learning.steps.some((step) => step.includes("BROWSERLESS_API_TOKEN")) &&
      learning.steps.some((step) => step.includes("REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED")),
    "Build 032 production-learning help must retain the encrypted-token readiness sequence, source-policy approval gate and one-run kill-switch workflow."
  );

  const delivery = HELP_TOPICS["integration-delivery"];
  assert(
    "manual" in delivery &&
      delivery.manual.some((step) => step.includes("INTEGRATION_CONSUMER_ROSIE_DAZZLERS_URL")) &&
      delivery.manual.some((step) => step.includes("INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN")) &&
      delivery.steps.some((step) => step.includes("Run conformance")),
    "Build 033 help must retain consumer conformance, endpoint and encrypted credential instructions."
  );

  const retention = HELP_TOPICS["retention-overview"];
  assert(
    "manual" in retention &&
      retention.manual.some((step) => step.includes("/retention")) &&
      retention.steps.some((step) => step.includes("90 days")) &&
      retention.steps.some((step) => step.includes("30 days")) &&
      retention.notes.some((note) => note.includes("No destructive production cleanup")),
    "Build 034 help must preserve explicit approval, age gates and no-cleanup-on-deploy guidance."
  );

  console.log(
    "Build 034 contextual help coverage, consumer delivery guidance and explicit retention-cleanup approval instructions passed."
  );

}

void main();
