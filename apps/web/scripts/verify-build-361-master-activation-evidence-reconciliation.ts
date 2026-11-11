import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MASTER_361_ACK_SNAPSHOT,
  composeMasterActivationEvidenceReconciliation
} from "../lib/master-activation-evidence-reconciliation";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const current = composeMasterActivationEvidenceReconciliation();
assert.equal(current.build, 361);
assert.equal(current.summary.codeGreen, true);
assert.equal(current.summary.mastersSynced, false);
assert.equal(current.summary.masterState, "MASTERS_NOT_SYNCED");
assert.equal(current.summary.sourceOnboardingGate, "HOLD");
assert.equal(current.summary.yardWorkersMayBegin, false);
assert.equal(current.summary.iCampMayBegin, false);
assert.equal(current.blockers.length, 6);
assert.equal(MASTER_361_ACK_SNAPSHOT.comms.receipt, "MASTER360-COMMS-QL413-ACK");
assert.equal(MASTER_361_ACK_SNAPSHOT.comms.receiptIntake, "CODE_READY_RUNTIME_HOLD");
assert.equal(MASTER_361_ACK_SNAPSHOT.comms.operationalUptime, "HOLD");
assert.equal(
  MASTER_361_ACK_SNAPSHOT.comms.main,
  "c670c2523001294e8ac2e4f283a1f8e5edda3ddb"
);
assert.equal(
  MASTER_361_ACK_SNAPSHOT.aiHub.main,
  "27b234337f5a3f041dfca4541e33ed6aa821fa4f"
);
assert.equal(MASTER_361_ACK_SNAPSHOT.aiHub.newWindowsTasks, 0);
assert.equal(current.policy.deploymentGreenIsRuntimeProof, false);
assert.equal(current.policy.codeReadyIsRuntimeProof, false);
assert.equal(current.policy.holdMayBeAutoReleased, false);

const verified = composeMasterActivationEvidenceReconciliation({
  commsTelemetry: "RUNTIME_VERIFIED",
  commsIncidentAcceptance: "OWNER_ACCEPTED",
  aiHubInstalledRelease: "INSTALLED_VERIFIED",
  aiHubDurableMonitoring: "HISTORY_VERIFIED",
  aiHubSignedTelemetry: "SIGNED_TELEMETRY_VERIFIED",
  aiHubAutomationHost: "DESKTOP-AE894KC_ENFORCED"
});
assert.equal(verified.blockers.length, 0);
assert.equal(verified.summary.mastersSynced, true);
assert.equal(verified.summary.sourceOnboardingGate, "OPEN");
assert.equal(verified.summary.yardWorkersMayBegin, true);
assert.equal(verified.summary.iCampMayBegin, true);

const page = source("app/master-activation-reconciliation/page.tsx");
for (const token of [
  "Build 361 · Master activation evidence reconciliation",
  "Code GREEN is not MASTERS SYNCED.",
  "Next integration stage: HOLD."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/master-activation-reconciliation"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/master-activation-reconciliation"'));

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-361-master-activation-evidence-reconciliation.ts";
assert.equal(String(pkg.scripts["verify:build361"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 361 Master Activation Evidence Reconciliation verification passed."
);
