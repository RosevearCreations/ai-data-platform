import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { AdaptiveMasterControlModel } from "../lib/adaptive-master-control";
import {
  MASTER_360_ACTIVATION_TARGETS,
  MASTER_CONTROL_READINESS_BUILD,
  composeMasterControlReadinessCertification
} from "../lib/master-control-readiness-certification";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(MASTER_CONTROL_READINESS_BUILD, 360);
assert.equal(MASTER_360_ACTIVATION_TARGETS.length, 2);
assert.equal(
  MASTER_360_ACTIVATION_TARGETS[0].commandToken,
  "MASTER360-COMMS-ACTIVATE"
);
assert.equal(
  MASTER_360_ACTIVATION_TARGETS[1].commandToken,
  "MASTER360-AIHUB-ACTIVATE"
);

const adaptive = {
  schema: "rosevear.ai-data-platform.adaptive-master-control.v1",
  build: 359,
  generatedAt: "2026-11-10T17:40:00.000Z",
  mergeStage: "COORDINATED_MASTER_PLANES_V1",
  masterPlanes: [],
  dynamicThresholds: [],
  adaptiveResourcePlan: {
    riskScore: 45,
    riskBand: "ELEVATED",
    confidence: "HIGH",
    monitoringCadenceSeconds: 120,
    workloadPolicy: "HEALTH_FIRST_THROTTLE_NONESSENTIAL",
    nonessentialAutomation: "THROTTLE_PROPOSAL",
    executionHost: "rosevear-ai-hub",
    executionHostLabel: "Ree Windows Server",
    schedulerOwner: "Rosevear AI Hub",
    capacityPressure: 1,
    incidentPressure: 1,
    requiresOwnerApproval: true,
    automaticallyApplied: false,
    createsWindowsTask: false,
    changesExistingRecoveryTask: false,
    cloudPlaneExecutesCrossAppAutomation: false
  },
  monitoring: {
    runtimePlanes: 3,
    online: 1,
    degraded: 0,
    offline: 0,
    unknown: 2,
    measured24h: 0,
    gaps: []
  },
  coordination: {
    intelligencePlane: "ai-data-platform",
    communicationsPlane: "rosevear-comms-hub",
    automationExecutionPlane: "rosevear-ai-hub",
    automationExecutionHost: "Ree Windows Server",
    flow: []
  },
  policy: {
    repositoriesRemainSeparateSecurityBoundaries: true,
    sourceTruthRemainsSourceOwned: true,
    dynamicThresholdsCanOverrideSourceTruth: false,
    dynamicThresholdsAutomaticallyEnforced: false,
    resourcePlanAutomaticallyApplied: false,
    aiDataExecutesCrossAppAutomation: false,
    commsHubExecutesWindowsAutomation: false,
    rosevearAiHubIsCrossAppAutomationHost: true,
    windowsTaskCreationAutomatic: false,
    existingWindowsRecoveryTaskModifiedAutomatically: false,
    missingHeartbeatIsHealthy: false,
    missingUptimeHistoryIsPerfectUptime: false,
    deploymentGreenImpliesRuntimeHealthy: false,
    ownerApprovalRequiredForConsequentialChanges: true,
    rollbackRequired: true
  }
} satisfies AdaptiveMasterControlModel;

const pending = composeMasterControlReadinessCertification({
  adaptive,
  generatedAt: new Date("2026-11-10T17:40:00.000Z")
});

assert.equal(pending.certification.mastersSynced, false);
assert.equal(pending.certification.slaveApplicationsMayBegin, false);
assert.equal(pending.certification.pendingMasterPrerequisites.length, 6);
assert.equal(pending.policy.masterSyncRequiredBeforeSlaveOnboarding, true);
assert.equal(pending.policy.aiDataCanExecuteWindowsRecovery, false);
assert.equal(pending.policy.commsCanExecuteWindowsRecovery, false);
assert.equal(pending.policy.aiHubOwnsWindowsAutomation, true);
assert.equal(pending.policy.readOnlyIntelligenceMayRunAutomatically, true);

const synced = composeMasterControlReadinessCertification({
  adaptive,
  activationEvidence: {
    commsProtectedTelemetryProjection: true,
    commsIncidentCorrelationReady: true,
    aiHubOriginalHostMonitorEnabled: true,
    aiHubPersistentTelemetryHistory: true,
    aiHubSignedReadOnlyTelemetry: true,
    aiHubAutomationHostEnforced: true
  },
  generatedAt: new Date("2026-11-10T17:40:00.000Z")
});

assert.equal(synced.certification.mastersSynced, true);
assert.equal(synced.certification.slaveApplicationsMayBegin, true);
assert.equal(
  synced.controls.find(
    (control) => control.id === "master-uptime-aggregation"
  )?.certification,
  "AUTONOMOUS_READ_ONLY_CERTIFIED"
);
assert.equal(
  synced.controls.find(
    (control) => control.id === "comms-incident-correlation"
  )?.certification,
  "SUPERVISED_ONLY"
);
assert.equal(
  synced.controls.find(
    (control) => control.id === "cross-app-self-healing"
  )?.certification,
  "DENIED_AUTONOMY"
);

const page = source(
  "app/master-control-readiness-certification/page.tsx"
);
for (const token of [
  "Build 360 · Master Control Boundary Certification",
  "Three Masters first. Larger applications remain gated.",
  "MASTER360-COMMS-ACTIVATE",
  "MASTER360-AIHUB-ACTIVATE",
  "Autonomous actions explicitly denied"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(
  navigation.includes('href: "/master-control-readiness-certification"')
);

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(
  operatorTools.includes('"/master-control-readiness-certification"')
);

const contract = JSON.parse(
  source("../../docs/master-shell/MASTER_360_ACTIVATION_CONTRACT.json")
);
assert.equal(contract.schema, "rosevear.master-shell.activation.v1");
assert.equal(contract.controller, "ai-data-platform");
assert.equal(contract.targets.length, 2);

const docs = source(
  "../../docs/BUILD_360_MASTER_CONTROL_READINESS_CERTIFICATION.md"
);
assert.ok(docs.includes("QL-411"));
assert.ok(docs.includes("Build 304"));
assert.ok(docs.includes("larger applications remain gated"));

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-360-master-control-readiness-certification.ts";
assert.equal(String(pkg.scripts["verify:build360"]), verifier);
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));

console.log(
  "Build 360 Advanced Control Readiness, Supervised Self-Healing & Autonomous-Control Boundary Certification verification passed."
);
