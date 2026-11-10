import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { composeBasicAlerts } from "../lib/basic-alerts";
import { composeCrossApplicationControlCenter } from "../lib/cross-application-control-center";
import {
  INCIDENT_RUNBOOK_RECOVERY_BUILD,
  composeIncidentRunbookRecoveryOrchestration
} from "../lib/incident-runbook-recovery-orchestration";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(INCIDENT_RUNBOOK_RECOVERY_BUILD, 357);

const model = composeIncidentRunbookRecoveryOrchestration({
  alerts: composeBasicAlerts({
    generatedAt: new Date("2026-11-10T15:00:00.000Z")
  }),
  controlCenter: composeCrossApplicationControlCenter(
    new Date("2026-11-10T15:00:00.000Z")
  ),
  generatedAt: new Date("2026-11-10T15:00:00.000Z")
});

assert.ok(model.plans.length > 0);
assert.ok(model.plans.every((plan) => plan.automaticExecution === false));
assert.ok(
  model.plans.flatMap((plan) => plan.steps).every(
    (step) => step.automaticPeerMutation === false
  )
);
assert.equal(model.automation.incidentClassification, true);
assert.equal(model.automation.runbookSelection, true);
assert.equal(model.automation.escalationPacketPreparation, true);
assert.equal(model.automation.supervisedRecoverySequencePreparation, true);
assert.equal(model.automation.incidentCreationInCommsHubAutomatic, false);
assert.equal(model.automation.messageDispatchAutomatic, false);
assert.equal(model.automation.peerRecoveryExecutionAutomatic, false);
assert.equal(model.automation.sourceWriteAutomatic, false);
assert.equal(model.policy.missingEvidenceIsSuccess, false);
assert.equal(model.policy.acknowledgementImpliesResolution, false);
assert.equal(model.policy.deploymentGreenImpliesRecovery, false);
assert.equal(model.policy.holdReleasedAutomatically, false);
assert.equal(model.policy.staleEvidenceCanAuthorizeRecovery, false);
assert.equal(model.policy.explicitApprovalRequiredForRecovery, true);
assert.equal(model.policy.rollbackRequired, true);
assert.equal(model.policy.postRecoveryEvidenceRequired, true);
assert.equal(model.policy.automaticPeerMutation, false);
assert.ok(
  model.plans
    .filter((plan) => plan.connectionState === "HOLD")
    .every((plan) => plan.state === "BLOCKED" || plan.state === "MONITOR")
);

const page = source("app/incident-runbook-recovery/page.tsx");
for (const token of [
  "Incident Automation, Runbooks &amp; Supervised Recovery",
  "Automation prepares; authority executes.",
  "Evidence-aware incident plans",
  "Fail closed on missing or held evidence."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/incident-runbook-recovery"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/incident-runbook-recovery"'));

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(
  roadmap.includes(
    "Build 357 — Moderate Incident Automation, Runbooks & Supervised Recovery Orchestration"
  )
);

const documentation = source(
  "../../docs/BUILD_357_INCIDENT_AUTOMATION_RUNBOOKS_SUPERVISED_RECOVERY.md"
);
assert.ok(documentation.includes("Comms Hub owns incident workflow"));
assert.ok(documentation.includes("Build 358"));

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-357-incident-runbooks-supervised-recovery.ts";
assert.equal(String(pkg.scripts["verify:build357"]), verifier);
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));

console.log(
  "Build 357 Moderate Incident Automation, Runbooks & Supervised Recovery Orchestration verification passed."
);
