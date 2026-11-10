export const ADAPTIVE_MASTER_CONTROL_BUILD = 359 as const;
export const ADAPTIVE_MASTER_CONTROL_SCHEMA =
  "rosevear.ai-data-platform.adaptive-master-control.v1" as const;

export const MASTER_PLANE_IDS = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub"
] as const;

export type MasterPlaneId = (typeof MASTER_PLANE_IDS)[number];

export type RuntimeEvidenceKind =
  | "SELF_REQUEST"
  | "VERCEL_DEPLOYMENT"
  | "PROTECTED_COMMS_PROJECTION"
  | "PROTECTED_OUTBOUND_HEARTBEAT"
  | "OWNER_FIELD_CHECK";

export type MasterRuntimeSample = {
  planeId: MasterPlaneId;
  observedAt: string;
  healthy: boolean;
  verified: boolean;
  evidenceKind: RuntimeEvidenceKind;
  revision: string | null;
  latencyMs: number | null;
  detail: string;
};

export type MasterRuntimeState =
  | "ONLINE"
  | "DEGRADED"
  | "OFFLINE"
  | "UNKNOWN";

type PredictiveRiskInput = {
  behaviourBaselines: Array<{
    metricKey: string;
    label: string;
    unit: string;
    currentValue: number | null;
    historicalSamples: number;
    baselineMedian: number | null;
    baselineMad: number | null;
    baselineQuality: "INSUFFICIENT" | "LIMITED" | "ESTABLISHED";
    anomalyState: "NORMAL" | "ATTENTION" | "ANOMALOUS" | "UNMEASURED";
  }>;
  predictiveRisk: {
    score: number;
    band: "LOW" | "GUARDED" | "ELEVATED" | "CRITICAL";
    confidence: "LOW" | "MEDIUM" | "HIGH";
  };
  evidenceContext: {
    criticalCapacityDimensions: number;
    attentionCapacityDimensions: number;
    criticalIncidentPlans: number;
    blockedIncidentPlans: number;
  };
};

const MASTER_PLANES = Object.freeze([
  {
    planeId: "ai-data-platform" as const,
    label: "AI Data Platform",
    role: "MASTER_INTELLIGENCE_AND_MONITORING",
    runtimeClass: "CLOUD_CONTROL_PLANE",
    authority:
      "Measures, correlates, forecasts, recommends and verifies evidence.",
    crossAppAutomationExecution: false,
    uptimeEvidence:
      "Current request/deployment evidence; historical uptime requires stored verified samples."
  },
  {
    planeId: "rosevear-comms-hub" as const,
    label: "Rosevear Comms Hub",
    role: "MASTER_COMMUNICATIONS_AND_INCIDENTS",
    runtimeClass: "CONTROL_PLANE",
    authority:
      "Owns communications, incident workflow, routing, acknowledgement and follow-up.",
    crossAppAutomationExecution: false,
    uptimeEvidence:
      "Protected health/incident projection. Public UI evidence never substitutes for protected receiver truth."
  },
  {
    planeId: "rosevear-ai-hub" as const,
    label: "Rosevear AI Hub",
    role: "WINDOWS_AUTOMATION_AND_LOCAL_EXECUTION",
    runtimeClass: "REE_WINDOWS_SERVER",
    authority:
      "Runs approved local automation, recovery and local-service execution on the Windows server.",
    crossAppAutomationExecution: true,
    uptimeEvidence:
      "Protected outbound heartbeat from the Windows host; heartbeat contract remains fail-closed until activated and verified."
  }
]);

const FRESHNESS_MS: Record<
  MasterPlaneId,
  { healthy: number; offline: number }
> = {
  "ai-data-platform": {
    healthy: 5 * 60_000,
    offline: 15 * 60_000
  },
  "rosevear-comms-hub": {
    healthy: 5 * 60_000,
    offline: 15 * 60_000
  },
  "rosevear-ai-hub": {
    // Existing QL-338 heartbeat contract permits a maximum 120-second expiry.
    healthy: 120_000,
    offline: 5 * 60_000
  }
};

function finiteIso(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function runtimeSummary(
  planeId: MasterPlaneId,
  samples: readonly MasterRuntimeSample[],
  nowMs: number
) {
  const verified = samples
    .filter(
      (sample) =>
        sample.planeId === planeId &&
        sample.verified &&
        finiteIso(sample.observedAt) !== null
    )
    .sort(
      (a, b) =>
        Number(finiteIso(b.observedAt)) - Number(finiteIso(a.observedAt))
    );
  const latest = verified[0] ?? null;
  const thresholds = FRESHNESS_MS[planeId];

  let state: MasterRuntimeState = "UNKNOWN";
  let ageMs: number | null = null;

  if (latest) {
    ageMs = Math.max(0, nowMs - Number(finiteIso(latest.observedAt)));
    if (ageMs > thresholds.offline) {
      state = "OFFLINE";
    } else if (!latest.healthy || ageMs > thresholds.healthy) {
      state = "DEGRADED";
    } else {
      state = "ONLINE";
    }
  }

  const windowStart = nowMs - 24 * 60 * 60_000;
  const windowSamples = verified.filter(
    (sample) => Number(finiteIso(sample.observedAt)) >= windowStart
  );
  const uptimePct24h =
    windowSamples.length >= 3
      ? round(
          (windowSamples.filter((sample) => sample.healthy).length /
            windowSamples.length) *
            100
        )
      : null;

  return {
    planeId,
    state,
    latestObservedAt: latest?.observedAt ?? null,
    latestEvidenceKind: latest?.evidenceKind ?? null,
    latestRevision: latest?.revision ?? null,
    latestLatencyMs: latest?.latencyMs ?? null,
    latestDetail: latest?.detail ?? "No verified runtime observation supplied.",
    ageMs,
    healthyFreshnessMs: thresholds.healthy,
    offlineAfterMs: thresholds.offline,
    verifiedSamples24h: windowSamples.length,
    uptimePct24h,
    uptimeMeasured: uptimePct24h !== null
  };
}

function dynamicThresholds(risk: PredictiveRiskInput) {
  return risk.behaviourBaselines.map((metric) => {
    const median = metric.baselineMedian;
    const mad = metric.baselineMad;
    const established =
      metric.baselineQuality === "ESTABLISHED" &&
      median !== null &&
      mad !== null;
    const robustSigma =
      established && mad !== null ? Math.max(1, 1.4826 * mad) : null;
    const attentionUpper =
      established && median !== null && robustSigma !== null
        ? round(median + 2.5 * robustSigma, 3)
        : null;
    const criticalUpper =
      established && median !== null && robustSigma !== null
        ? round(median + 4 * robustSigma, 3)
        : null;

    return {
      metricKey: metric.metricKey,
      label: metric.label,
      unit: metric.unit,
      currentValue: metric.currentValue,
      baselineQuality: metric.baselineQuality,
      historicalSamples: metric.historicalSamples,
      anomalyState: metric.anomalyState,
      attentionUpper,
      criticalUpper,
      adaptiveEligible: established,
      enforcementMode: "ADVISORY_READ_MODEL" as const,
      automaticallyApplied: false as const,
      method:
        established
          ? "Historical median + robust MAD-derived upper bands."
          : "No dynamic threshold is claimed until an established baseline exists."
    };
  });
}

function adaptiveResourcePlan(risk: PredictiveRiskInput) {
  const band = risk.predictiveRisk.band;
  const monitoringCadenceSeconds =
    band === "CRITICAL"
      ? 60
      : band === "ELEVATED"
        ? 120
        : band === "GUARDED"
          ? 180
          : 300;
  const workloadPolicy =
    band === "CRITICAL"
      ? "RECOVERY_AND_HEALTH_FIRST"
      : band === "ELEVATED"
        ? "HEALTH_FIRST_THROTTLE_NONESSENTIAL"
        : band === "GUARDED"
          ? "NORMAL_WITH_ELEVATED_OBSERVATION"
          : "NORMAL";
  const nonessentialAutomation =
    band === "CRITICAL"
      ? "PAUSE_PROPOSAL"
      : band === "ELEVATED"
        ? "THROTTLE_PROPOSAL"
        : "NO_CHANGE_PROPOSAL";

  return {
    riskScore: risk.predictiveRisk.score,
    riskBand: band,
    confidence: risk.predictiveRisk.confidence,
    monitoringCadenceSeconds,
    workloadPolicy,
    nonessentialAutomation,
    executionHost: "rosevear-ai-hub" as const,
    executionHostLabel: "Ree Windows Server",
    schedulerOwner: "Rosevear AI Hub",
    capacityPressure:
      risk.evidenceContext.criticalCapacityDimensions +
      risk.evidenceContext.attentionCapacityDimensions,
    incidentPressure:
      risk.evidenceContext.criticalIncidentPlans +
      risk.evidenceContext.blockedIncidentPlans,
    requiresOwnerApproval: true as const,
    automaticallyApplied: false as const,
    createsWindowsTask: false as const,
    changesExistingRecoveryTask: false as const,
    cloudPlaneExecutesCrossAppAutomation: false as const
  };
}

export function composeAdaptiveMasterControl(input: {
  risk: PredictiveRiskInput;
  runtimeSamples?: readonly MasterRuntimeSample[];
  generatedAt?: Date;
}) {
  const generatedAt = input.generatedAt ?? new Date();
  const nowMs = generatedAt.getTime();
  const samples = input.runtimeSamples ?? [];

  const runtime = MASTER_PLANES.map((plane) => ({
    ...plane,
    ...runtimeSummary(plane.planeId, samples, nowMs)
  }));
  const thresholds = dynamicThresholds(input.risk);
  const resourcePlan = adaptiveResourcePlan(input.risk);

  const monitoringGaps = runtime
    .filter((item) => item.state === "UNKNOWN" || item.state === "OFFLINE")
    .map((item) => ({
      planeId: item.planeId,
      state: item.state,
      action:
        item.planeId === "rosevear-ai-hub"
          ? "Require a fresh protected outbound Windows heartbeat before claiming server uptime."
          : "Require a fresh protected runtime projection before claiming uptime."
    }));

  return {
    schema: ADAPTIVE_MASTER_CONTROL_SCHEMA,
    build: ADAPTIVE_MASTER_CONTROL_BUILD,
    generatedAt: generatedAt.toISOString(),
    mergeStage: "COORDINATED_MASTER_PLANES_V1" as const,
    masterPlanes: runtime,
    dynamicThresholds: thresholds,
    adaptiveResourcePlan: resourcePlan,
    monitoring: {
      runtimePlanes: runtime.length,
      online: runtime.filter((item) => item.state === "ONLINE").length,
      degraded: runtime.filter((item) => item.state === "DEGRADED").length,
      offline: runtime.filter((item) => item.state === "OFFLINE").length,
      unknown: runtime.filter((item) => item.state === "UNKNOWN").length,
      measured24h: runtime.filter((item) => item.uptimeMeasured).length,
      gaps: monitoringGaps
    },
    coordination: {
      intelligencePlane: "ai-data-platform" as const,
      communicationsPlane: "rosevear-comms-hub" as const,
      automationExecutionPlane: "rosevear-ai-hub" as const,
      automationExecutionHost: "Ree Windows Server",
      flow: [
        "AI Data Platform measures, correlates and proposes adaptive controls.",
        "Rosevear Comms Hub receives protected incident/notification requests and owns communications workflow.",
        "Rosevear AI Hub executes separately approved Windows/local automation and recovery.",
        "Rosevear AI Hub emits protected outbound heartbeat evidence; Comms may project redacted status; AI Data consumes the projection for monitoring."
      ]
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
  };
}

export type AdaptiveMasterControlModel = ReturnType<
  typeof composeAdaptiveMasterControl
>;
