import type { BasicAlertsModel } from "./basic-alerts";
import type { CrossApplicationControlCenterModel } from "./cross-application-control-center";

export const INCIDENT_RUNBOOK_RECOVERY_BUILD = 357 as const;
export const INCIDENT_RUNBOOK_RECOVERY_SCHEMA =
  "rosevear.ai-data-platform.incident-runbook-recovery-orchestration.v1" as const;

export type IncidentSeverity = "INFO" | "WARNING" | "CRITICAL";
export type RunbookActionMode = "READ_ONLY" | "REQUEST_ONLY" | "SUPERVISED";
export type IncidentPlanState =
  | "MONITOR"
  | "NEEDS_REVIEW"
  | "READY_FOR_SUPERVISED_HANDOFF"
  | "BLOCKED";

export type RunbookStep = {
  id: string;
  order: number;
  title: string;
  mode: RunbookActionMode;
  authority:
    | "AI_DATA_LOCAL"
    | "COMMS_CONTROL_PLANE"
    | "SOURCE_APPLICATION";
  evidenceRequired: boolean;
  explicitApprovalRequired: boolean;
  automaticPeerMutation: false;
};

export type IncidentPlan = {
  id: string;
  sourceId: string;
  severity: IncidentSeverity;
  state: IncidentPlanState;
  trigger: string;
  owner: string;
  dependencyState: string;
  connectionState: string;
  runbookId: string;
  steps: RunbookStep[];
  commsEscalationPrepared: boolean;
  sourceRecoveryHandoffPrepared: boolean;
  automaticExecution: false;
};

function runbookFor(input: {
  sourceId: string;
  severity: IncidentSeverity;
  dependencyState: string;
  connectionState: string;
}) {
  const steps: RunbookStep[] = [
    {
      id: "recheck-evidence",
      order: 1,
      title: "Recheck current evidence and freshness",
      mode: "READ_ONLY",
      authority: "AI_DATA_LOCAL",
      evidenceRequired: true,
      explicitApprovalRequired: false,
      automaticPeerMutation: false
    },
    {
      id: "prepare-incident-context",
      order: 2,
      title: "Prepare evidence-aware incident context",
      mode: "REQUEST_ONLY",
      authority: "COMMS_CONTROL_PLANE",
      evidenceRequired: true,
      explicitApprovalRequired: false,
      automaticPeerMutation: false
    },
    {
      id: "request-operator-review",
      order: 3,
      title: "Request operator review and acknowledgement",
      mode: "REQUEST_ONLY",
      authority: "COMMS_CONTROL_PLANE",
      evidenceRequired: true,
      explicitApprovalRequired: true,
      automaticPeerMutation: false
    },
    {
      id: "prepare-source-recovery",
      order: 4,
      title: "Prepare source-owned recovery handoff",
      mode: "SUPERVISED",
      authority: "SOURCE_APPLICATION",
      evidenceRequired: true,
      explicitApprovalRequired: true,
      automaticPeerMutation: false
    },
    {
      id: "verify-post-recovery",
      order: 5,
      title: "Verify fresh post-recovery evidence",
      mode: "READ_ONLY",
      authority: "AI_DATA_LOCAL",
      evidenceRequired: true,
      explicitApprovalRequired: false,
      automaticPeerMutation: false
    }
  ];

  const blocked =
    input.dependencyState === "BLOCKED" ||
    input.dependencyState === "STALE" ||
    input.dependencyState === "REVIEW" ||
    input.connectionState === "HOLD";

  const state: IncidentPlanState =
    input.severity === "INFO"
      ? "MONITOR"
      : blocked
        ? "BLOCKED"
        : input.severity === "CRITICAL"
          ? "READY_FOR_SUPERVISED_HANDOFF"
          : "NEEDS_REVIEW";

  return {
    runbookId:
      input.severity === "CRITICAL"
        ? "RB-357-CRITICAL-SUPERVISED-RECOVERY"
        : input.severity === "WARNING"
          ? "RB-357-WARNING-REVIEW-AND-RECHECK"
          : "RB-357-INFO-MONITOR",
    state,
    steps:
      input.severity === "INFO"
        ? steps.filter((step) =>
            ["recheck-evidence", "verify-post-recovery"].includes(step.id)
          )
        : input.severity === "WARNING"
          ? steps.filter((step) => step.id !== "prepare-source-recovery")
          : steps
  };
}

export function composeIncidentRunbookRecoveryOrchestration(input: {
  alerts: BasicAlertsModel;
  controlCenter: CrossApplicationControlCenterModel;
  generatedAt?: Date;
}) {
  const generatedAt = input.generatedAt ?? new Date();
  const sourceState = new Map<
    string,
    { dependencyState: string; connectionState: string }
  >(
    input.controlCenter.sources.map((source) => [
      source.sourceId,
      {
        dependencyState: source.dependencyState,
        connectionState: source.connectionState
      }
    ])
  );

  const plans: IncidentPlan[] = input.alerts.alerts.map((alert) => {
    const source = sourceState.get(alert.sourceId) ?? {
      dependencyState: "REVIEW",
      connectionState: "UNKNOWN"
    };
    const runbook = runbookFor({
      sourceId: alert.sourceId,
      severity: alert.level,
      dependencyState: source.dependencyState,
      connectionState: source.connectionState
    });

    return {
      id: "INC-357-" + alert.id,
      sourceId: alert.sourceId,
      severity: alert.level,
      state: runbook.state,
      trigger: alert.reason,
      owner: alert.owner,
      dependencyState: source.dependencyState,
      connectionState: source.connectionState,
      runbookId: runbook.runbookId,
      steps: runbook.steps,
      commsEscalationPrepared: alert.level !== "INFO",
      sourceRecoveryHandoffPrepared:
        alert.level === "CRITICAL" && runbook.state !== "BLOCKED",
      automaticExecution: false
    };
  });

  const grouped = {
    critical: plans.filter((plan) => plan.severity === "CRITICAL"),
    warning: plans.filter((plan) => plan.severity === "WARNING"),
    info: plans.filter((plan) => plan.severity === "INFO"),
    blocked: plans.filter((plan) => plan.state === "BLOCKED")
  };

  return {
    schema: INCIDENT_RUNBOOK_RECOVERY_SCHEMA,
    build: INCIDENT_RUNBOOK_RECOVERY_BUILD,
    generatedAt: generatedAt.toISOString(),
    plans,
    grouped,
    summary: {
      total: plans.length,
      critical: grouped.critical.length,
      warning: grouped.warning.length,
      info: grouped.info.length,
      blocked: grouped.blocked.length,
      supervisedRecoveryReady: plans.filter(
        (plan) => plan.state === "READY_FOR_SUPERVISED_HANDOFF"
      ).length
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
      aiDataPlatform:
        "classifies, correlates, prepares runbooks and verifies evidence",
      rosevearCommsHub:
        "owns incident workflow, messaging, routing, acknowledgement and follow-up",
      sourceApplications:
        "own operational recovery execution, consequential writes and source acceptance"
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
  };
}

export type IncidentRunbookRecoveryModel = ReturnType<
  typeof composeIncidentRunbookRecoveryOrchestration
>;
