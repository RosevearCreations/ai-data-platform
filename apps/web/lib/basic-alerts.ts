import type { MasterProductionReadinessModel } from "./master-production-readiness-core";
import {
  MASTER_SHELL_SOURCE_DEFINITIONS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const BASIC_ALERTS_BUILD = 353 as const;
export const BASIC_ALERTS_SCHEMA =
  "rosevear.ai-data-platform.basic-alerts.v1" as const;

export const BASIC_ALERT_LEVELS = [
  "INFO",
  "WARNING",
  "CRITICAL"
] as const;

export type BasicAlertLevel = (typeof BASIC_ALERT_LEVELS)[number];

export const BASIC_ALERT_RESOLUTION_STATES = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED"
] as const;

export type BasicAlertResolutionState =
  (typeof BASIC_ALERT_RESOLUTION_STATES)[number];

export const CONNECTION_HANDOFFS = Object.freeze([
  {
    targetId: "yw",
    repository: "RosevearCreations/yw",
    label: "Yard Workers",
    token: "MS353-AIDATA-YW-HELLO",
    status: "HANDOFF_SENT" as const
  },
  {
    targetId: "icamp",
    repository: "RosevearCreations/iCamp",
    label: "iCamp",
    token: "MS353-AIDATA-ICAMP-HELLO",
    status: "HANDOFF_SENT" as const
  },
  {
    targetId: "rosiedazzlers",
    repository: "RosevearCreations/rosiedazzlers",
    label: "Rosie Dazzlers",
    token: "MS353-AIDATA-ROSIEDAZZLERS-HELLO",
    status: "HANDOFF_SENT" as const
  },
  {
    targetId: "devilndove",
    repository: "RosevearCreations/devilndove-site",
    label: "Devil n Dove",
    token: "MS353-AIDATA-DEVILNDOVE-HELLO",
    status: "HANDOFF_SENT" as const
  },
  {
    targetId: "rosevear-ai-hub",
    repository: "RosevearCreations/rosevear-ai-hub",
    label: "Rosevear AI Hub",
    token: "MS353-AIDATA-ROSEVEAR-AI-HUB-HELLO",
    status: "HANDOFF_SENT" as const
  },
  {
    targetId: "rosevear-comms-hub",
    repository: "RosevearCreations/rosevear-comms-hub",
    label: "Rosevear Comms Hub",
    token: "MS353-AIDATA-COMMS-HUB-HELLO",
    status: "HANDOFF_SENT" as const
  }
]);

type Alert = {
  id: string;
  sourceId: string;
  level: BasicAlertLevel;
  owner: string;
  title: string;
  reason: string;
  resolutionState: BasicAlertResolutionState;
  escalation: string;
};

function levelForState(state: string): BasicAlertLevel {
  if (state === "FAIL" || state === "STALE") return "CRITICAL";
  if (state === "HOLD" || state === "READY_FOR_OWNER") return "WARNING";
  return "INFO";
}

function resolutionForState(state: string): BasicAlertResolutionState {
  return state === "ACCEPTED" ? "RESOLVED" : "OPEN";
}

export function composeBasicAlerts(input?: {
  readiness?: MasterProductionReadinessModel | null;
  generatedAt?: Date;
}) {
  const generatedAt = input?.generatedAt ?? new Date();
  const readinessBySource = new Map(
    (input?.readiness?.sources ?? []).map((source) => [
      source.sourceId,
      source.effectiveState
    ])
  );

  const sourceAlerts: Alert[] = MASTER_SHELL_SOURCE_DEFINITIONS.map((source) => {
    const state = readinessBySource.get(source.sourceId) ?? "UNKNOWN";
    const level = levelForState(state);
    return {
      id: "SOURCE-" + source.sourceId.toUpperCase(),
      sourceId: source.sourceId,
      level,
      owner:
        source.sourceId === "ai-data-platform"
          ? "AI Data Platform operator"
          : source.shellBoundary + " operator",
      title: source.shellBoundary + " operational truth",
      reason:
        state === "ACCEPTED"
          ? "Current accepted evidence is present."
          : state === "UNKNOWN"
            ? "No current readiness evidence was supplied to this view."
            : "Current effective state is " + state + ".",
      resolutionState: resolutionForState(state),
      escalation:
        level === "CRITICAL"
          ? "Escalate to source owner and Comms Hub incident workflow."
          : level === "WARNING"
            ? "Assign source owner and request evidence/recheck."
            : "Monitor."
    };
  });

  const handoffAlerts: Alert[] = CONNECTION_HANDOFFS.map((handoff) => ({
    id: "HANDOFF-" + handoff.targetId.toUpperCase(),
    sourceId: handoff.targetId,
    level: "INFO",
    owner:
      handoff.targetId === "rosevear-comms-hub"
        ? "Rosevear Comms Hub operator"
        : handoff.label + " operator",
    title: handoff.label + " Master Shell handshake",
    reason: "AI Data Platform handoff has been sent and awaits source-side acknowledgement.",
    resolutionState: "OPEN",
    escalation: "No escalation yet; complete the simple source-side acknowledgement."
  }));

  const alerts = [...sourceAlerts, ...handoffAlerts];

  return {
    schema: BASIC_ALERTS_SCHEMA,
    build: BASIC_ALERTS_BUILD,
    generatedAt: generatedAt.toISOString(),
    alerts,
    thresholds: {
      criticalStates: ["FAIL", "STALE"],
      warningStates: ["HOLD", "READY_FOR_OWNER"],
      informationalStates: ["ACCEPTED", "UNKNOWN"],
      note:
        "These are basic attention thresholds. They classify observed truth; they do not override source authority."
    },
    summary: {
      total: alerts.length,
      critical: alerts.filter((item) => item.level === "CRITICAL").length,
      warning: alerts.filter((item) => item.level === "WARNING").length,
      info: alerts.filter((item) => item.level === "INFO").length,
      open: alerts.filter((item) => item.resolutionState === "OPEN").length,
      acknowledged: alerts.filter(
        (item) => item.resolutionState === "ACKNOWLEDGED"
      ).length,
      resolved: alerts.filter(
        (item) => item.resolutionState === "RESOLVED"
      ).length
    },
    handoffs: CONNECTION_HANDOFFS,
    policy: {
      alertCanChangeSourceState: false as const,
      acknowledgementCanCreateAcceptance: false as const,
      escalationCanReleaseHold: false as const,
      missingEvidenceIsSuccess: false as const,
      commsHubOwnsIncidentWorkflow: true as const,
      sourceOwnerOwnsOperationalResolution: true as const
    }
  };
}

export type BasicAlertsModel = ReturnType<typeof composeBasicAlerts>;
