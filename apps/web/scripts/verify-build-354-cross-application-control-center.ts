import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  CROSS_APPLICATION_CONTROL_CENTER_BUILD,
  composeCrossApplicationControlCenter
} from "../lib/cross-application-control-center";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(CROSS_APPLICATION_CONTROL_CENTER_BUILD, 354);

const model = composeCrossApplicationControlCenter(
  new Date("2026-11-10T05:00:00.000Z")
);

assert.equal(model.sources.length, 6);
assert.ok(model.dependencies.length >= 12);
assert.ok(model.blockedDependencies.length > 0);
assert.equal(model.policy.automaticPeerWrite, false);
assert.equal(model.policy.automaticHoldRelease, false);
assert.equal(model.policy.acknowledgementImpliesConnected, false);
assert.equal(model.policy.deploymentGreenImpliesConnected, false);
assert.equal(model.policy.sourceApplicationsRetainOperationalAuthority, true);
assert.equal(model.policy.commsHubRetainsCommunicationsAuthority, true);
assert.ok(model.operations.every((item) => item.peerMutation === false));
assert.ok(
  model.dependencies.every((item) => item.automaticActionAllowed === false)
);

const page = source("app/cross-application-control-center/page.tsx");
assert.ok(page.includes("Cross-Application Control Center"));
assert.ok(page.includes("What blocks what?"));
assert.ok(page.includes("Safe control actions"));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/cross-application-control-center"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/cross-application-control-center"'));

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(
  roadmap.includes(
    "Build 354 — Moderate Cross-Application Control Center & Dependency-Aware Operations"
  )
);

console.log("Build 354 verification passed");
