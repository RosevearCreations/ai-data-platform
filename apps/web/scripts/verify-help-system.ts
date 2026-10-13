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
    "../app/data-library/page.tsx",
    "../app/data-review/page.tsx",
    "../app/data-review/DataReviewWorkbench.tsx",
    "../app/approved-data/page.tsx",
    "../app/approved-data/ApprovedDatasetPublishing.tsx",
    "../app/approved-data/delivery/page.tsx",
    "../app/approved-data/delivery/PublicationDeliveryWorkbench.tsx",
    "../app/approved-data/live-delivery/page.tsx",
    "../app/approved-data/live-delivery/ControlledLiveDeliveryWorkbench.tsx",
    "../app/approved-data/reconciliation/page.tsx",
    "../app/approved-data/reconciliation/PostDeliveryReconciliationWorkbench.tsx",
    "../app/approved-data/reconciliation/triage/page.tsx",
    "../app/approved-data/reconciliation/triage/ReconciliationExceptionTriageWorkbench.tsx",
    "../app/approved-data/reconciliation/corrective-delivery/page.tsx",
    "../app/approved-data/reconciliation/corrective-delivery/CorrectiveDeliveryWorkbench.tsx",
    "../app/collection-projects/page.tsx",
    "../app/recipe-builder/page.tsx",
    "../app/collection-runs/page.tsx",
    "../app/collection-runs/CollectionRunConsole.tsx",
    "../app/remote-execution/page.tsx",
    "../app/remote-execution/RemotePilotAdminPanel.tsx",
    "../app/sign-in/page.tsx",
    "../app/workspace-profiles/page.tsx",
    "../app/workspace-profiles/WorkspaceProfileManager.tsx",
    "../app/connectors/page.tsx",
    "../app/connectors/ConnectorManager.tsx",
    "../app/integration-delivery/page.tsx",
    "../app/retention/page.tsx",
    "../app/adoption/page.tsx",
    "../app/first-evidence/page.tsx",
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

  const corrective = HELP_TOPICS["corrective-delivery-overview"];
  assert(
    "manual" in corrective &&
      corrective.steps.some((step) => step.includes("newest reconciliation")) &&
      corrective.steps.some((step) => step.includes("external dry-run")) &&
      corrective.steps.some((step) => step.includes("one-hour window")) &&
      corrective.steps.some((step) => step.includes("Idempotency-Key")) &&
      corrective.notes.some((note) => note.includes("new package ID and replay key")) &&
      corrective.notes.some((note) => note.includes("does not automatically close")) &&
      corrective.manual.some((step) => step.includes("0024_corrective_delivery_execution.sql")) &&
      corrective.manual.some((step) => step.includes("introduces no new secret")),
    "Build 054 help must preserve supersession, dry-run activation, short-lived authority, new corrective replay identity and same-key execution guidance."
  );

  const triage = HELP_TOPICS["reconciliation-triage-overview"];
  assert(
    "manual" in triage &&
      triage.steps.some((step) => step.includes("status=drift")) &&
      triage.steps.some((step) => step.includes("approve, reject or withdraw")) &&
      triage.notes.some((note) => note.includes("Approval is not execution")) &&
      triage.notes.some((note) => note.includes("manual-review")) &&
      triage.manual.some((step) => step.includes("0023_reconciliation_exception_triage.sql")) &&
      triage.manual.some((step) => step.includes("introduces no new secret")),
    "Build 053 help must preserve drift-only triage, frozen planning scope, planning-only approval and exact migration guidance."
  );

  const reconciliation = HELP_TOPICS["post-delivery-reconciliation-overview"];
  assert(
    "manual" in reconciliation &&
      reconciliation.steps.some((step) => step.includes("stateVerificationSupported=true")) &&
      reconciliation.steps.some((step) => step.includes("does not automatically repair")) &&
      reconciliation.notes.some((note) => note.includes("withdrawn")) &&
      reconciliation.notes.some((note) => note.includes("append-only")) &&
      reconciliation.manual.some((step) => step.includes("0022_post_delivery_reconciliation.sql")) &&
      reconciliation.manual.some((step) => step.includes("introduces no new secret")),
    "Build 052 help must preserve read-only verification, historical auditability, append-only evidence and exact migration guidance."
  );

  const controlledLive = HELP_TOPICS["controlled-live-delivery-overview"];
  assert(
    "manual" in controlledLive &&
      controlledLive.steps.some((step) => step.includes("24 hours")) &&
      controlledLive.steps.some((step) => step.includes("accepted external dry-run")) &&
      controlledLive.notes.some((note) => note.includes("Idempotency-Key")) &&
      controlledLive.notes.some((note) => note.includes("return-original-ack")) &&
      controlledLive.manual.some((step) => step.includes("0021_controlled_live_delivery.sql")) &&
      controlledLive.manual.some((step) => step.includes("introduces no new secret")),
    "Build 051 help must preserve temporary activation, recent external dry-run, replay-key idempotency and exact migration guidance."
  );

  const publicationDelivery = HELP_TOPICS["publication-delivery-overview"];
  assert(
    "manual" in publicationDelivery &&
      publicationDelivery.steps.some((step) => step.includes("owner/admin")) &&
      publicationDelivery.steps.some((step) => step.includes("conformance")) &&
      publicationDelivery.notes.some((note) => note.includes("dry-run only")) &&
      publicationDelivery.notes.some((note) => note.includes("cannot generate")) &&
      publicationDelivery.manual.some((step) => step.includes("0020_publication_delivery_bridge.sql")) &&
      publicationDelivery.manual.some((step) => step.includes("INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN")),
    "Build 050 help must preserve approved-publication mapping, conformance-first delivery, dry-run-only external transport and exact manual setup."
  );

  const approvedData = HELP_TOPICS["approved-data-overview"];
  assert(
    "manual" in approvedData &&
      approvedData.steps.some((step) => step.includes("owner/admin")) &&
      approvedData.notes.some((note) => note.includes("cannot recall")) &&
      approvedData.notes.some((note) => note.includes("does not automatically write")) &&
      approvedData.manual.some((step) => step.includes("0019_approved_dataset_publishing.sql")),
    "Build 049 help must preserve approved-only immutable publishing, withdrawal limits and no automatic downstream writes."
  );

  const dataReview = HELP_TOPICS["data-review-overview"];
  assert(
    "manual" in dataReview &&
      dataReview.steps.some((step) => step.includes("owner/admin")) &&
      dataReview.notes.some((note) => note.includes("never overwritten")) &&
      dataReview.notes.some((note) => note.includes("does not automatically write")) &&
      dataReview.manual.some((step) => step.includes("No new external account")),
    "Build 048 help must preserve source evidence, terminal owner/admin approval and no automatic business writes."
  );

  const collectionRuns = HELP_TOPICS["collection-runs-overview"];
  assert(
    "manual" in collectionRuns &&
      collectionRuns.steps.some((step) => step.includes("Stop / cancel")) &&
      collectionRuns.steps.some((step) => step.includes("failed, timed-out or cancelled")) &&
      collectionRuns.manual.some((step) => step.includes("BROWSERLESS_API_TOKEN")) &&
      collectionRuns.notes.some((note) => note.includes("operator-present")),
    "Build 047 help must preserve local Chrome ownership, remote cancellation, bounded retry and Browserless gates."
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

  const adoption = HELP_TOPICS["adoption-overview"];
  assert(
    "manual" in adoption &&
      adoption.manual.some((step) => step.includes("No external account")) &&
      adoption.steps.some((step) => step.includes("30 days")) &&
      adoption.steps.some((step) => step.includes("never edit roles")) &&
      adoption.notes.some((note) => note.includes("365 days / 60 snapshots")),
    "Build 035 help must preserve durable adoption, stale-grant and no-automatic-permission-change guidance."
  );

  const firstEvidence = HELP_TOPICS["first-evidence-overview"];
  assert(
    "manual" in firstEvidence &&
      firstEvidence.manual.some((step) => step.includes("No new external account")) &&
      firstEvidence.steps.some((step) => step.includes("Build 032-gated")) &&
      firstEvidence.steps.some((step) => step.includes("Build 033-gated")) &&
      firstEvidence.notes.some((note) => note.includes("writes no operational evidence")),
    "Build 037 help must preserve real-work-only adoption and existing remote/integration gates."
  );

  const trendValidation = HELP_TOPICS["learning-trend-validation"];
  assert(
    "manual" in trendValidation &&
      trendValidation.manual.some((step) => step.includes("No external account")) &&
      trendValidation.steps.some((step) => step.includes("evidence limit")) &&
      trendValidation.steps.some((step) => step.includes("Build 032")) &&
      trendValidation.steps.some((step) => step.includes("Build 033")) &&
      trendValidation.notes.some((note) => note.includes("cannot masquerade")),
    "Build 038 help must preserve non-fabricated trend baselines and unresolved provider/consumer gates."
  );

  const renewal = HELP_TOPICS["learning-renewal"];
  assert(
    "manual" in renewal &&
      renewal.manual.some((step) => step.includes("No infrastructure setup")) &&
      renewal.steps.some((step) => step.includes("never invents")) &&
      renewal.steps.some((step) => step.includes("Build 038")) &&
      renewal.notes.some((note) => note.includes("365 days / 30 snapshots")),
    "Build 036 help must preserve non-fabricated baseline, finite-roadmap and bounded renewal-snapshot guidance."
  );

  console.log(
    "Build 054 contextual help coverage, corrective activation/idempotent execution guidance and existing production gates passed."
  );

}

void main();
