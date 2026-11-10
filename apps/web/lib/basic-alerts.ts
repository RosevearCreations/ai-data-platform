import type { MasterProductionReadinessModel } from "./master-production-readiness-core";
import { MASTER_SHELL_SOURCE_DEFINITIONS } from "./master-shell-contract-v1";

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
    status: "ACK_RECEIVED_HOLD" as const
  },
  {
    targetId: "icamp",
    repository: "RosevearCreations/iCamp",
    label: "iCamp",
    token: "MS353-AIDATA-ICAMP-HELLO",
    status: "ACK_RECEIVED_HOLD" as const
  },
  {
    targetId: "rosiedazzlers",
    repository: "RosevearCreations/rosiedazzlers",
    label: "Rosie Dazzlers",
    token: "MS353-AIDATA-ROSIEDAZZLERS-HELLO",
    status: "ACK_RECEIVED_HOLD" as const
  },
  {
    targetId: "devilndove",
    repository: "RosevearCreations/devilndove-site",
    label: "Devil n Dove",
    token: "MS353-AIDATA-DEVILNDOVE-HELLO",
    status: "ACK_RECEIVED_HOLD" as const
  },
  {
    targetId: "rosevear-ai-hub",
    repository: "RosevearCreations/rosevear-ai-hub",
    label: "Rosevear AI Hub",
    token: "MS353-AIDATA-ROSEVEAR-AI-HUB-HELLO",
    status: "ACK_RECEIVED_HOLD" as const
  },
  {
    targetId: "rosevear-comms-hub",
    repository: "RosevearCreations/rosevear-comms-hub",
    label: "Rosevear Comms Hub",
    token: "MS353-AIDATA-COMMS-HUB-HELLO",
    status: "ACK_RECEIVED_REVIEW_HOLD" as const
  }
]);

export const SOURCE_ACKNOWLEDGEMENTS = Object.freeze([
  {
    sourceId: "yw",
    reportedRevision: "e51cf098aec6d49699645bc2d8ccbd2d756d579d",
    currentRevisionAtReconciliation: "e51cf098aec6d49699645bc2d8ccbd2d756d579d",
    role: "platform_shell",
    connection: "HOLD",
    manifest: "STALE",
    ownerProof: "HOLD",
    signedReceipt: "HOLD",
    revisionState: "CURRENT"
  },
  {
    sourceId: "icamp",
    reportedRevision: "b59fa045cb26f441aa32b890ba6c979c34045ce5",
    currentRevisionAtReconciliation: "b59fa045cb26f441aa32b890ba6c979c34045ce5",
    role: "INDEPENDENT_SOURCE",
    connection: "HOLD",
    manifest: "DISCOVERY_VERIFIED_AUTH_HOLD",
    ownerProof: "HOLD",
    signedReceipt: "HOLD",
    revisionState: "CURRENT"
  },
  {
    sourceId: "rosiedazzlers",
    reportedRevision: "91148a6a9beb127f04c7e8719119910709030448",
    currentRevisionAtReconciliation: "91148a6a9beb127f04c7e8719119910709030448",
    role: "owned_business_legacy",
    connection: "HOLD",
    manifest: "VERIFIED",
    ownerProof: "HOLD",
    signedReceipt: "HOLD",
    revisionState: "CURRENT"
  },
  {
    sourceId: "devilndove",
    reportedRevision: "d8ddee1d288e7db874cbf07448c79fe941f40f5e",
    currentRevisionAtReconciliation: "d8ddee1d288e7db874cbf07448c79fe941f40f5e",
    role: "owned_business",
    connection: "HOLD",
    manifest: "STALE",
    ownerProof: "UNKNOWN",
    signedReceipt: "UNKNOWN",
    revisionState: "CURRENT"
  },
  {
    sourceId: "rosevear-ai-hub",
    reportedRevision: "ecfa48707fc34d00cab8d94a4ccb226653c9e13b",
    currentRevisionAtReconciliation: "ecfa48707fc34d00cab8d94a4ccb226653c9e13b",
    role: "SOURCE",
    connection: "HOLD",
    manifest: "STALE",
    ownerProof: "HOLD",
    signedReceipt: "HOLD",
    revisionState: "CURRENT"
  },
  {
    sourceId: "rosevear-comms-hub",
    reportedRevision: "7d0aca7052dadc83c536fa372f59254e3f01febe",
    currentRevisionAtReconciliation: "7d0aca7052dadc83c536fa372f59254e3f01febe",
    role: "COMPLEMENTARY_CONTROL_PLANE",
    connection: "HOLD",
    manifest: "REVISION_DRIFT_REVIEW",
    ownerProof: "HOLD",
    signedReceipt: "HOLD",
    revisionState: "REVIEW"
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

  const acknowledgementBySource = new Map(
    SOURCE_ACKNOWLEDGEMENTS.map((ack) => [ack.sourceId, ack])
  );

  const handoffAlerts: Alert[] = CONNECTION_HANDOFFS.map((handoff) => {
    const ack = acknowledgementBySource.get(handoff.targetId);
    const revisionStale = ack?.revisionState === "STALE_REVISION";

    return {
      id: "HANDOFF-" + handoff.targetId.toUpperCase(),
      sourceId: handoff.targetId,
      level: revisionStale ? "CRITICAL" : "WARNING",
      owner:
        handoff.targetId === "rosevear-comms-hub"
          ? "Rosevear Comms Hub operator"
          : handoff.label + " operator",
      title: handoff.label + " Master Shell handshake",
      reason: revisionStale
        ? "Source acknowledgement received, but its reported revision is older than the current source main revision."
        : "Source acknowledgement received. The source reports connection HOLD pending stronger connection evidence.",
      resolutionState: "ACKNOWLEDGED",
      escalation: revisionStale
        ? "Re-run the source acknowledgement against the current main revision before any connection promotion."
        : "Resolve the source-reported HOLD prerequisite; do not promote connection state from the acknowledgement alone."
    };
  });

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
    acknowledgements: SOURCE_ACKNOWLEDGEMENTS,
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
