import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BASIC_ALERTS_BUILD,
  CONNECTION_HANDOFFS,
  SOURCE_ACKNOWLEDGEMENTS,
  composeBasicAlerts
} from "../lib/basic-alerts";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BASIC_ALERTS_BUILD, 353);
assert.equal(CONNECTION_HANDOFFS.length, 6);
assert.equal(new Set(CONNECTION_HANDOFFS.map((item) => item.token)).size, 6);
assert.equal(SOURCE_ACKNOWLEDGEMENTS.length, 6);
assert.ok(SOURCE_ACKNOWLEDGEMENTS.every((item) => item.connection === "HOLD"));
assert.equal(
  SOURCE_ACKNOWLEDGEMENTS.find((item) => item.sourceId === "rosiedazzlers")?.revisionState,
  "STALE_REVISION"
);
assert.ok(CONNECTION_HANDOFFS.every((item) => item.status.startsWith("ACK_RECEIVED")));

const model = composeBasicAlerts({
  generatedAt: new Date("2026-11-10T03:30:00.000Z")
});

assert.equal(model.policy.alertCanChangeSourceState, false);
assert.equal(model.policy.acknowledgementCanCreateAcceptance, false);
assert.equal(model.policy.escalationCanReleaseHold, false);
assert.equal(model.policy.commsHubOwnsIncidentWorkflow, true);
assert.equal(model.policy.sourceOwnerOwnsOperationalResolution, true);
assert.ok(model.alerts.some((item) => item.id.startsWith("HANDOFF-")));
assert.equal(model.summary.acknowledged, 6);

const page = source("app/basic-alerts/page.tsx");
assert.ok(page.includes("Alerts, Ownership, Escalation & Resolution"));
assert.ok(page.includes("Source-side acknowledgement queue"));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/basic-alerts"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/basic-alerts"'));

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(roadmap.includes("Build 353 — Basic Alerts"));

const handoff = source("../../docs/BUILD_353_MASTER_SHELL_HANDOFFS.md");
for (const item of CONNECTION_HANDOFFS) {
  assert.ok(handoff.includes(item.token));
}

console.log("Build 353 verification passed");
