import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BASIC_OPERATOR_ACTIONS_BUILD,
  MASTER_SHELL_LINKS,
  composeBasicOperatorActions
} from "../lib/basic-operator-actions";
import { MASTER_SHELL_SOURCE_IDS } from "../lib/master-shell-contract-v1";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BASIC_OPERATOR_ACTIONS_BUILD, 352);
assert.equal(MASTER_SHELL_LINKS.length, MASTER_SHELL_SOURCE_IDS.length);

const model = composeBasicOperatorActions({
  generatedAt: new Date("2026-11-10T03:00:00.000Z")
});

assert.equal(model.role.masterShellPosition, "MASTER_INTELLIGENCE_MONITORING");
assert.equal(model.role.universalWriteMaster, false);
assert.equal(model.role.sourceApplicationsRetainOperationalAuthority, true);
assert.equal(model.role.commsHubIsComplementaryControlPlane, true);
assert.equal(model.role.aiDataIsAlsoOneOfSixSources, true);

for (const action of model.actions) {
  assert.equal(action.mutatesPeerApplication, false);
}
assert.equal(model.boundaries.refreshCanCreateSourceSuccess, false);
assert.equal(model.boundaries.recheckCanCreateMissingEvidence, false);
assert.equal(model.boundaries.retryExecutesPeerWriteAutomatically, false);
assert.equal(model.boundaries.recoveryExecutesPeerRecoveryAutomatically, false);
assert.equal(model.boundaries.deploymentGreenImpliesConnection, false);

const page = source("app/basic-operator-actions/page.tsx");
assert.ok(page.includes("Safe Refresh, Retry, Recheck & Recovery Controls"));
assert.ok(page.includes("not a universal write-master"));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/basic-operator-actions"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/basic-operator-actions"'));

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(roadmap.includes("Build 352 — Basic Operator Actions"));

const linkage = source("../../docs/MASTER_SHELL_AI_DATA_PLATFORM_LINKAGE.md");
assert.ok(linkage.includes("Master intelligence and monitoring coordinator"));
assert.ok(linkage.includes("Rosevear Comms Hub"));

console.log("Build 352 verification passed");
