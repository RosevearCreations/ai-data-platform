import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  ADAPTIVE_MASTER_CONTROL_BUILD,
  composeAdaptiveMasterControl,
  type MasterRuntimeSample
} from "../lib/adaptive-master-control";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(ADAPTIVE_MASTER_CONTROL_BUILD, 359);

const now = new Date("2026-11-10T17:00:00.000Z");
const runtimeSamples: MasterRuntimeSample[] = [
  {
    planeId: "ai-data-platform",
    observedAt: "2026-11-10T16:59:30.000Z",
    healthy: true,
    verified: true,
    evidenceKind: "VERCEL_DEPLOYMENT",
    revision: "1".repeat(40),
    latencyMs: 120,
    detail: "Production deployment reachable."
  },
  {
    planeId: "rosevear-comms-hub",
    observedAt: "2026-11-10T16:57:00.000Z",
    healthy: true,
    verified: true,
    evidenceKind: "PROTECTED_COMMS_PROJECTION",
    revision: "2".repeat(40),
    latencyMs: 150,
    detail: "Protected Comms projection received."
  },
  {
    planeId: "rosevear-ai-hub",
    observedAt: "2026-11-10T16:59:15.000Z",
    healthy: true,
    verified: true,
    evidenceKind: "PROTECTED_OUTBOUND_HEARTBEAT",
    revision: "3".repeat(40),
    latencyMs: 20,
    detail: "Protected outbound Windows heartbeat received."
  }
];

const risk = {
  behaviourBaselines: [
    {
      metricKey: "database_probe_ms",
      label: "Database probe latency",
      unit: "ms",
      currentValue: 160,
      historicalSamples: 8,
      baselineMedian: 100,
      baselineMad: 10,
      baselineQuality: "ESTABLISHED" as const,
      anomalyState: "ATTENTION" as const
    },
    {
      metricKey: "connector_error_rate_pct",
      label: "Connector error rate",
      unit: "percent",
      currentValue: null,
      historicalSamples: 1,
      baselineMedian: null,
      baselineMad: null,
      baselineQuality: "INSUFFICIENT" as const,
      anomalyState: "UNMEASURED" as const
    }
  ],
  predictiveRisk: {
    score: 52,
    band: "ELEVATED" as const,
    confidence: "HIGH" as const
  },
  evidenceContext: {
    criticalCapacityDimensions: 1,
    attentionCapacityDimensions: 1,
    criticalIncidentPlans: 0,
    blockedIncidentPlans: 1
  }
};

const model = composeAdaptiveMasterControl({
  risk,
  runtimeSamples,
  generatedAt: now
});

assert.equal(model.masterPlanes.length, 3);
assert.equal(model.coordination.intelligencePlane, "ai-data-platform");
assert.equal(model.coordination.communicationsPlane, "rosevear-comms-hub");
assert.equal(model.coordination.automationExecutionPlane, "rosevear-ai-hub");
assert.equal(model.coordination.automationExecutionHost, "Ree Windows Server");
assert.equal(model.monitoring.online, 3);
assert.equal(model.monitoring.offline, 0);
assert.equal(model.dynamicThresholds[0].adaptiveEligible, true);
assert.ok((model.dynamicThresholds[0].attentionUpper ?? 0) > 100);
assert.ok((model.dynamicThresholds[0].criticalUpper ?? 0) > 100);
assert.equal(model.dynamicThresholds[0].automaticallyApplied, false);
assert.equal(model.dynamicThresholds[1].adaptiveEligible, false);
assert.equal(model.dynamicThresholds[1].attentionUpper, null);
assert.equal(model.adaptiveResourcePlan.monitoringCadenceSeconds, 120);
assert.equal(model.adaptiveResourcePlan.executionHost, "rosevear-ai-hub");
assert.equal(model.adaptiveResourcePlan.automaticallyApplied, false);
assert.equal(model.adaptiveResourcePlan.createsWindowsTask, false);
assert.equal(model.adaptiveResourcePlan.changesExistingRecoveryTask, false);
assert.equal(model.policy.rosevearAiHubIsCrossAppAutomationHost, true);
assert.equal(model.policy.aiDataExecutesCrossAppAutomation, false);
assert.equal(model.policy.commsHubExecutesWindowsAutomation, false);
assert.equal(model.policy.missingHeartbeatIsHealthy, false);
assert.equal(model.policy.missingUptimeHistoryIsPerfectUptime, false);
assert.equal(model.policy.deploymentGreenImpliesRuntimeHealthy, false);

const missing = composeAdaptiveMasterControl({
  risk,
  runtimeSamples: [],
  generatedAt: now
});
assert.equal(missing.monitoring.unknown, 3);
assert.equal(missing.monitoring.measured24h, 0);
assert.equal(missing.masterPlanes[2].state, "UNKNOWN");

const page = source("app/adaptive-master-control/page.tsx");
for (const token of [
  "Adaptive Controls, Dynamic Thresholds &amp; Intelligent Resource Management",
  "Master runtime monitor",
  "Ree&apos;s Windows server",
  "Server-first automation placement",
  "Monitoring gaps remain visible."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/adaptive-master-control"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/adaptive-master-control"'));

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(
  roadmap.includes(
    "Build 359 — Advanced Adaptive Controls, Dynamic Thresholds & Intelligent Resource Management"
  )
);

const documentation = source(
  "../../docs/BUILD_359_ADAPTIVE_MASTER_CONTROL.md"
);
assert.ok(documentation.includes("Rosevear AI Hub"));
assert.ok(documentation.includes("uptime"));
assert.ok(documentation.includes("Build 360"));

const handoff = source(
  "../../docs/master-shell/BUILD_359_MASTER_APPLICATION_COORDINATION_HANDOFF.md"
);
assert.ok(handoff.includes("QL-409"));
assert.ok(handoff.includes("Build 302"));
assert.ok(handoff.includes("Ree Windows Server"));

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-359-adaptive-master-control.ts";
assert.equal(String(pkg.scripts["verify:build359"]), verifier);
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));

console.log(
  "Build 359 Advanced Adaptive Controls, Dynamic Thresholds & Intelligent Resource Management verification passed."
);
