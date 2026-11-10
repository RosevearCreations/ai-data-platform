import type { AdaptiveMasterControlModel } from "./adaptive-master-control";

export const MASTER_CONTROL_READINESS_BUILD = 360 as const;
export const MASTER_CONTROL_READINESS_SCHEMA =
  "rosevear.ai-data-platform.master-control-readiness-certification.v1" as const;

export type BoundaryCertification =
  | "AUTONOMOUS_READ_ONLY_CERTIFIED"
  | "SUPERVISED_ONLY"
  | "BLOCKED_UNTIL_MASTER_ACTIVATION"
  | "DENIED_AUTONOMY";

export type MasterActivationEvidence = {
  commsProtectedTelemetryProjection: boolean;
  commsIncidentCorrelationReady: boolean;
  aiHubOriginalHostMonitorEnabled: boolean;
  aiHubPersistentTelemetryHistory: boolean;
  aiHubSignedReadOnlyTelemetry: boolean;
  aiHubAutomationHostEnforced: boolean;
};

export const MASTER_360_ACTIVATION_TARGETS = Object.freeze([
  {
    planeId: "rosevear-comms-hub",
    observedProductionBaseline:
      "ccbeab4307ed6458399dcb0eb03324aeaf12f97f",
    observedBuild: "QL-410",
    nextBuild:
      "QL-411 — Original-Ree Host Telemetry Adapter, AI Data Platform Uptime Read Models & Comms Incident Correlation Pilot",
    commandToken: "MASTER360-COMMS-ACTIVATE",
    mode: "READ_ONLY_TELEMETRY_AND_INCIDENT_CORRELATION",
    requirements: [
      "Reconcile against current Comms main before implementation if the observed baseline has drifted.",
      "Consume AI Data Build 360 activation contract and Build 359 three-plane authority model.",
      "Accept only protected, authenticated, source-bound telemetry projections.",
      "Keep receiver/connection HOLD until the existing trust and owner gates are genuinely satisfied.",
      "Correlate stale/unhealthy telemetry into operator incidents without auto-release, auto-message or peer writes."
    ]
  },
  {
    planeId: "rosevear-ai-hub",
    observedProductionBaseline:
      "9df3130cbe87dd65a6a3da9c238a521f8fff38a5",
    observedBuild: "Build 303",
    nextBuild:
      "Build 304 — Ree Server Monitoring Persistence, Signed Read-Only Master Telemetry Contract & Comms Incident Handoff Acceptance",
    commandToken: "MASTER360-AIHUB-ACTIVATE",
    mode: "REE_WINDOWS_MONITORING_AND_AUTOMATION_HOST",
    requirements: [
      "Reconcile against current AI Hub main before implementation if the observed baseline has drifted.",
      "Run persistent monitoring only on the original Ree Windows host.",
      "Preserve the existing recovery/task authority; do not create duplicate scheduled tasks.",
      "Persist bounded monitoring history and prepare signed metadata-only telemetry for the protected Master path.",
      "Enforce Ree-host-only automation placement before any cross-application scheduler migration.",
      "Do not publish customer/device secrets or treat telemetry signing as connection acceptance."
    ]
  }
]);

const DEFAULT_EVIDENCE: MasterActivationEvidence = {
  commsProtectedTelemetryProjection: false,
  commsIncidentCorrelationReady: false,
  aiHubOriginalHostMonitorEnabled: false,
  aiHubPersistentTelemetryHistory: false,
  aiHubSignedReadOnlyTelemetry: false,
  aiHubAutomationHostEnforced: false
};

function readinessState(value: boolean) {
  return value ? "READY" : "PENDING";
}

export function composeMasterControlReadinessCertification(input: {
  adaptive: AdaptiveMasterControlModel;
  activationEvidence?: Partial<MasterActivationEvidence>;
  generatedAt?: Date;
}) {
  const evidence = {
    ...DEFAULT_EVIDENCE,
    ...(input.activationEvidence ?? {})
  };

  const controls = [
    {
      id: "adaptive-threshold-recompute",
      label: "Recompute adaptive thresholds from established baselines",
      ownerPlane: "ai-data-platform",
      certification: "AUTONOMOUS_READ_ONLY_CERTIFIED" as BoundaryCertification,
      automaticExecutionAllowed: true,
      mutatesPeer: false,
      approvalRequired: false,
      rationale:
        "Pure read-model computation from measured evidence; cannot change budgets, source truth or peer configuration."
    },
    {
      id: "risk-and-anomaly-refresh",
      label: "Refresh anomaly and predictive-risk intelligence",
      ownerPlane: "ai-data-platform",
      certification: "AUTONOMOUS_READ_ONLY_CERTIFIED" as BoundaryCertification,
      automaticExecutionAllowed: true,
      mutatesPeer: false,
      approvalRequired: false,
      rationale:
        "Read-only intelligence may run automatically when evidence is available."
    },
    {
      id: "master-uptime-aggregation",
      label: "Aggregate verified Master-plane uptime/freshness",
      ownerPlane: "ai-data-platform",
      certification:
        evidence.commsProtectedTelemetryProjection &&
        evidence.aiHubPersistentTelemetryHistory &&
        evidence.aiHubSignedReadOnlyTelemetry
          ? ("AUTONOMOUS_READ_ONLY_CERTIFIED" as BoundaryCertification)
          : ("BLOCKED_UNTIL_MASTER_ACTIVATION" as BoundaryCertification),
      automaticExecutionAllowed:
        evidence.commsProtectedTelemetryProjection &&
        evidence.aiHubPersistentTelemetryHistory &&
        evidence.aiHubSignedReadOnlyTelemetry,
      mutatesPeer: false,
      approvalRequired: false,
      rationale:
        "Aggregation is safe only after protected Comms projection and persistent signed AI Hub telemetry are truly available."
    },
    {
      id: "comms-incident-correlation",
      label: "Correlate stale/unhealthy Master telemetry into Comms incidents",
      ownerPlane: "rosevear-comms-hub",
      certification:
        evidence.commsIncidentCorrelationReady
          ? ("SUPERVISED_ONLY" as BoundaryCertification)
          : ("BLOCKED_UNTIL_MASTER_ACTIVATION" as BoundaryCertification),
      automaticExecutionAllowed: false,
      mutatesPeer: false,
      approvalRequired: true,
      rationale:
        "Comms owns incident workflow; AI Data may propose but cannot create/close incidents autonomously."
    },
    {
      id: "ree-host-local-recovery",
      label: "Run bounded local recovery on Ree Windows server",
      ownerPlane: "rosevear-ai-hub",
      certification:
        evidence.aiHubAutomationHostEnforced &&
        evidence.aiHubOriginalHostMonitorEnabled
          ? ("SUPERVISED_ONLY" as BoundaryCertification)
          : ("BLOCKED_UNTIL_MASTER_ACTIVATION" as BoundaryCertification),
      automaticExecutionAllowed: false,
      mutatesPeer: false,
      approvalRequired: true,
      rationale:
        "Existing AI Hub recovery remains source-owned. Build 360 does not remotely invoke it or install a scheduler."
    },
    {
      id: "cross-app-self-healing",
      label: "Execute consequential recovery in another application",
      ownerPlane: "source-application",
      certification: "DENIED_AUTONOMY" as BoundaryCertification,
      automaticExecutionAllowed: false,
      mutatesPeer: true,
      approvalRequired: true,
      rationale:
        "Peer/source writes, redeploys, migrations, credential changes and acceptance decisions remain outside autonomous Master authority."
    }
  ];

  const deniedAutonomousActions = [
    "release HOLD or create source/Master acceptance",
    "restart or redeploy another application",
    "run database migrations or destructive repairs",
    "create, replace or modify Windows scheduled tasks",
    "rotate credentials, signing keys or trust pins",
    "send customer communications without Comms authorization",
    "scale infrastructure or purchase capacity",
    "change source-owned business/customer/device data",
    "convert deployment GREEN into runtime-health or uptime truth"
  ];

  const activation = {
    comms: {
      planeId: "rosevear-comms-hub" as const,
      commandToken: "MASTER360-COMMS-ACTIVATE" as const,
      observedBuild: "QL-410",
      nextBuild: MASTER_360_ACTIVATION_TARGETS[0].nextBuild,
      protectedTelemetryProjection:
        readinessState(evidence.commsProtectedTelemetryProjection),
      incidentCorrelation:
        readinessState(evidence.commsIncidentCorrelationReady)
    },
    aiHub: {
      planeId: "rosevear-ai-hub" as const,
      commandToken: "MASTER360-AIHUB-ACTIVATE" as const,
      observedBuild: "Build 303",
      nextBuild: MASTER_360_ACTIVATION_TARGETS[1].nextBuild,
      originalHostMonitor:
        readinessState(evidence.aiHubOriginalHostMonitorEnabled),
      persistentHistory:
        readinessState(evidence.aiHubPersistentTelemetryHistory),
      signedReadOnlyTelemetry:
        readinessState(evidence.aiHubSignedReadOnlyTelemetry),
      automationHostEnforced:
        readinessState(evidence.aiHubAutomationHostEnforced)
    }
  };

  const pendingMasterPrerequisites = [
    !evidence.commsProtectedTelemetryProjection &&
      "Comms protected telemetry projection",
    !evidence.commsIncidentCorrelationReady &&
      "Comms incident correlation acceptance",
    !evidence.aiHubOriginalHostMonitorEnabled &&
      "AI Hub original-host monitor activation",
    !evidence.aiHubPersistentTelemetryHistory &&
      "AI Hub persistent monitoring history",
    !evidence.aiHubSignedReadOnlyTelemetry &&
      "AI Hub signed read-only telemetry",
    !evidence.aiHubAutomationHostEnforced &&
      "AI Hub Ree-host automation enforcement"
  ].filter((item): item is string => Boolean(item));

  const slaveApplicationsMayBegin =
    pendingMasterPrerequisites.length === 0 &&
    controls
      .filter((control) => control.id !== "cross-app-self-healing")
      .every(
        (control) =>
          control.certification !== "BLOCKED_UNTIL_MASTER_ACTIVATION"
      );

  return {
    schema: MASTER_CONTROL_READINESS_SCHEMA,
    build: MASTER_CONTROL_READINESS_BUILD,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    masterStage: "THREE_MASTER_SYNC_BEFORE_SLAVE_ONBOARDING" as const,
    controls,
    deniedAutonomousActions,
    activationTargets: MASTER_360_ACTIVATION_TARGETS,
    activation,
    adaptiveContext: {
      mergeStage: input.adaptive.mergeStage,
      onlinePlanes: input.adaptive.monitoring.online,
      unknownPlanes: input.adaptive.monitoring.unknown,
      measured24hPlanes: input.adaptive.monitoring.measured24h,
      proposedMonitoringCadenceSeconds:
        input.adaptive.adaptiveResourcePlan.monitoringCadenceSeconds,
      executionHost: input.adaptive.adaptiveResourcePlan.executionHost,
      executionHostLabel:
        input.adaptive.adaptiveResourcePlan.executionHostLabel
    },
    certification: {
      readOnlyAutonomyCertified: controls.filter(
        (control) =>
          control.certification === "AUTONOMOUS_READ_ONLY_CERTIFIED"
      ).length,
      supervisedOnly: controls.filter(
        (control) => control.certification === "SUPERVISED_ONLY"
      ).length,
      blockedUntilMasterActivation: controls.filter(
        (control) =>
          control.certification === "BLOCKED_UNTIL_MASTER_ACTIVATION"
      ).length,
      deniedAutonomy: controls.filter(
        (control) => control.certification === "DENIED_AUTONOMY"
      ).length,
      pendingMasterPrerequisites,
      mastersSynced:
        pendingMasterPrerequisites.length === 0,
      slaveApplicationsMayBegin
    },
    policy: {
      masterSyncRequiredBeforeSlaveOnboarding: true,
      missingActivationEvidenceIsReady: false,
      aiDataCanExecuteWindowsRecovery: false,
      commsCanExecuteWindowsRecovery: false,
      aiHubOwnsWindowsAutomation: true,
      sourceAppsOwnConsequentialWrites: true,
      supervisedSelfHealingRequiresApproval: true,
      readOnlyIntelligenceMayRunAutomatically: true,
      ownerOverrideRequired: true,
      rollbackRequired: true
    }
  };
}

export type MasterControlReadinessCertificationModel = ReturnType<
  typeof composeMasterControlReadinessCertification
>;
