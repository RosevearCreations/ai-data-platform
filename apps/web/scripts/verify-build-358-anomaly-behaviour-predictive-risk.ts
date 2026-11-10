import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  ANOMALY_BEHAVIOUR_PREDICTIVE_RISK_BUILD,
  composeAnomalyBehaviourPredictiveRisk
} from "../lib/anomaly-behaviour-predictive-risk";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(ANOMALY_BEHAVIOUR_PREDICTIVE_RISK_BUILD, 358);

const snapshots = [100, 101, 99, 100, 102].map((value, index) => ({
  generatedAt: new Date(
    Date.parse("2026-11-01T00:00:00.000Z") + index * 86400000
  ).toISOString(),
  metrics: [
    {
      key: "database_probe_ms",
      label: "Database probe latency",
      value,
      unit: "ms",
      sampleCount: 1,
      measured: true
    }
  ]
}));

const model = composeAnomalyBehaviourPredictiveRisk({
  generatedAt: new Date("2026-11-10T15:40:00.000Z"),
  baseline: {
    live: {
      overallState: "critical",
      metrics: [
        {
          key: "database_probe_ms",
          label: "Database probe latency",
          value: 900,
          unit: "ms",
          sampleCount: 1,
          measured: true
        }
      ],
      budgetResults: [
        {
          metricKey: "database_probe_ms",
          status: "critical"
        }
      ],
      regressions: [
        {
          metricKey: "database_probe_ms",
          regressed: true,
          comparable: true
        }
      ]
    },
    snapshots
  },
  observatory: {
    api: [
      {
        operationKey: "api.command-center.get",
        state: "poor",
        p95Ms: 5200,
        failureRatePct: 10
      }
    ],
    database: [
      {
        operationKey: "database.authorized-probe",
        state: "needs-attention",
        p95Ms: 900,
        failureRatePct: 0,
        maxPoolWaiting: 2
      }
    ],
    dependencies: [],
    pools: {
      maxObservedAppWaiting: 2
    }
  },
  capacity: {
    schema:
      "rosevear.ai-data-platform.capacity-workload-resource-demand-forecasting.v1",
    build: 356,
    generatedAt: "2026-11-10T15:40:00.000Z",
    scenario: {
      id: "growth",
      label: "Moderate growth",
      multiplier: 1.5,
      description: "Moderate growth"
    },
    forecasts: [
      {
        key: "records",
        label: "Operational record workload",
        current: 100,
        forecast: 150,
        delta: 50,
        unit: "records",
        sourceHref: "/capacity-planning",
        pressure: "CRITICAL",
        growthMultiplier: 1.5,
        knownHardCapacity: null,
        headroomKnown: false,
        forecastIsDemandProxy: true,
        recommendation: "Review",
        recheckTrigger: "Recheck"
      }
    ],
    ranked: [],
    performanceContext: {
      poorSignals: 1,
      attentionSignals: 1,
      maxPoolWaiting: 2
    },
    summary: {
      forecastDimensions: 1,
      critical: 1,
      attention: 0,
      nominal: 0,
      unmeasured: 0
    },
    boundaries: {
      hardInfrastructureCapacityImported: false,
      cloudProviderQuotasImported: false,
      actualBillingImported: false,
      staffingCapacityImported: false,
      sourceAppCapacityImported: false,
      headroomClaimedWithoutLimitEvidence: false
    },
    policy: {
      measuredEvidenceOnly: true,
      forecastsAreOperationalProxies: true,
      missingEvidenceIsSuccess: false,
      automaticScaling: false,
      automaticPurchasing: false,
      automaticProviderUpgrade: false,
      automaticStaffingChange: false,
      automaticScheduleMutation: false,
      automaticRetentionDeletion: false,
      automaticSourceAppMutation: false,
      operatorApprovalRequired: true,
      validateAfterChange: true,
      rollbackRequired: true
    }
  },
  incidents: {
    schema:
      "rosevear.ai-data-platform.incident-runbook-recovery-orchestration.v1",
    build: 357,
    generatedAt: "2026-11-10T15:40:00.000Z",
    plans: [
      {
        id: "INC-357-TEST",
        sourceId: "yw",
        severity: "CRITICAL",
        state: "BLOCKED",
        trigger: "test",
        owner: "Yard Workers operator",
        dependencyState: "BLOCKED",
        connectionState: "HOLD",
        runbookId: "RB-357-CRITICAL-SUPERVISED-RECOVERY",
        steps: [],
        commsEscalationPrepared: true,
        sourceRecoveryHandoffPrepared: false,
        automaticExecution: false
      }
    ],
    grouped: {
      critical: [],
      warning: [],
      info: [],
      blocked: []
    },
    summary: {
      total: 1,
      critical: 1,
      warning: 0,
      info: 0,
      blocked: 1,
      supervisedRecoveryReady: 0
    },
    automation: {
      incidentClassification: true,
      runbookSelection: true,
      evidenceChecklistGeneration: true,
      escalationPacketPreparation: true,
      supervisedRecoverySequencePreparation: true,
      incidentCreationInCommsHubAutomatic: false,
      messageDispatchAutomatic: false,
      peerRecoveryExecutionAutomatic: false,
      sourceWriteAutomatic: false
    },
    authority: {
      aiDataPlatform: "intelligence",
      rosevearCommsHub: "incidents",
      sourceApplications: "recovery"
    },
    policy: {
      missingEvidenceIsSuccess: false,
      acknowledgementImpliesResolution: false,
      deploymentGreenImpliesRecovery: false,
      holdReleasedAutomatically: false,
      staleEvidenceCanAuthorizeRecovery: false,
      explicitApprovalRequiredForRecovery: true,
      rollbackRequired: true,
      postRecoveryEvidenceRequired: true,
      automaticPeerMutation: false
    }
  }
});

assert.equal(model.behaviourBaselines.length, 1);
assert.equal(model.behaviourBaselines[0].baselineQuality, "ESTABLISHED");
assert.equal(model.behaviourBaselines[0].anomalyState, "ANOMALOUS");
assert.ok((model.behaviourBaselines[0].robustZ ?? 0) >= 3.5);
assert.ok(model.predictiveRisk.score >= 40);
assert.ok(
  ["ELEVATED", "CRITICAL"].includes(model.predictiveRisk.band)
);
assert.equal(
  model.predictiveRisk.scoreMeaning,
  "Heuristic review-priority index from 0-100; it is not a probability of failure."
);
assert.equal(model.intelligence.anomalyDetectionAutomatic, true);
assert.equal(model.intelligence.riskIndexComputationAutomatic, true);
assert.equal(model.intelligence.recommendationIsAdvisoryOnly, true);
assert.equal(model.intelligence.predictionIsFutureFact, false);
assert.equal(model.intelligence.predictionIsFailureProbability, false);
assert.equal(model.policy.missingEvidenceIsNormal, false);
assert.equal(model.policy.insufficientBaselineCanClaimAnomaly, false);
assert.equal(model.policy.anomalyCanChangeSourceTruth, false);
assert.equal(model.policy.riskCanReleaseHold, false);
assert.equal(model.policy.riskCanCreateAcceptance, false);
assert.equal(model.policy.riskCanTriggerPeerRecovery, false);
assert.equal(model.policy.riskCanTriggerScaling, false);
assert.equal(model.policy.riskCanTriggerCommsIncident, false);
assert.equal(model.policy.riskCanTriggerSourceWrite, false);
assert.equal(model.policy.explicitOperatorReviewRequired, true);

const page = source("app/anomaly-predictive-risk/page.tsx");
for (const token of [
  "Anomaly Detection, Behaviour Baselines &amp; Predictive Risk",
  "Predictive risk is advisory intelligence, not future truth.",
  "Robust deviation from historical evidence",
  "Advanced does not mean autonomous authority."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/anomaly-predictive-risk"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/anomaly-predictive-risk"'));

const roadmap = source("../../docs/NEXT_BUILDS_351_360.md");
assert.ok(
  roadmap.includes(
    "Build 358 — Advanced Anomaly Detection, Behaviour Baselines & Predictive Risk Intelligence"
  )
);

const documentation = source(
  "../../docs/BUILD_358_ANOMALY_BEHAVIOUR_PREDICTIVE_RISK.md"
);
assert.ok(documentation.includes("not a probability"));
assert.ok(documentation.includes("Build 359"));

const pkg = JSON.parse(source("package.json"));
const verifier =
  "tsx scripts/verify-build-358-anomaly-behaviour-predictive-risk.ts";
assert.equal(String(pkg.scripts["verify:build358"]), verifier);
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifier));

console.log(
  "Build 358 Advanced Anomaly Detection, Behaviour Baselines & Predictive Risk Intelligence verification passed."
);
