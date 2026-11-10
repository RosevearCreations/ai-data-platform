import {
  MASTER_SHELL_SOURCE_DEFINITIONS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const BASIC_OPERATOR_ACTIONS_BUILD = 352 as const;
export const BASIC_OPERATOR_ACTIONS_SCHEMA =
  "rosevear.ai-data-platform.basic-operator-actions.v1" as const;

export const BASIC_OPERATOR_ACTIONS = [
  "refresh",
  "recheck",
  "retry",
  "recovery"
] as const;

export type BasicOperatorAction =
  (typeof BASIC_OPERATOR_ACTIONS)[number];

export type OperatorActionAuthority =
  | "AI_DATA_LOCAL"
  | "SOURCE_APPLICATION"
  | "COMMS_CONTROL_PLANE";

export type OperatorActionMode =
  | "READ_ONLY"
  | "REQUEST_ONLY"
  | "SUPERVISED";

export type OperatorActionDefinition = {
  action: BasicOperatorAction;
  title: string;
  purpose: string;
  mode: OperatorActionMode;
  authority: OperatorActionAuthority;
  mutatesPeerApplication: boolean;
  requiresFreshEvidence: boolean;
  requiresExplicitApproval: boolean;
};

export const OPERATOR_ACTION_DEFINITIONS: readonly OperatorActionDefinition[] =
  Object.freeze([
    {
      action: "refresh",
      title: "Refresh local read model",
      purpose:
        "Reload AI Data Platform projections from already-authorized source evidence without changing source state.",
      mode: "READ_ONLY",
      authority: "AI_DATA_LOCAL",
      mutatesPeerApplication: false,
      requiresFreshEvidence: false,
      requiresExplicitApproval: false
    },
    {
      action: "recheck",
      title: "Recheck current evidence",
      purpose:
        "Re-evaluate freshness, signatures, readiness and current evidence without manufacturing a PASS result.",
      mode: "READ_ONLY",
      authority: "AI_DATA_LOCAL",
      mutatesPeerApplication: false,
      requiresFreshEvidence: true,
      requiresExplicitApproval: false
    },
    {
      action: "retry",
      title: "Prepare bounded retry request",
      purpose:
        "Prepare a retry intent for the authoritative source or control plane; AI Data Platform does not silently execute the peer action.",
      mode: "REQUEST_ONLY",
      authority: "SOURCE_APPLICATION",
      mutatesPeerApplication: false,
      requiresFreshEvidence: true,
      requiresExplicitApproval: true
    },
    {
      action: "recovery",
      title: "Prepare supervised recovery",
      purpose:
        "Prepare evidence-aware recovery guidance or a governed handoff while preserving source-specific recovery authority and rollback boundaries.",
      mode: "SUPERVISED",
      authority: "SOURCE_APPLICATION",
      mutatesPeerApplication: false,
      requiresFreshEvidence: true,
      requiresExplicitApproval: true
    }
  ]);

export const MASTER_SHELL_LINKS = Object.freeze(
  MASTER_SHELL_SOURCE_DEFINITIONS.map((source) => ({
    sourceId: source.sourceId,
    shellId: source.shellId,
    repository: source.repository,
    shellBoundary: source.shellBoundary,
    tenancyModel: source.tenancyModel,
    relationship:
      source.sourceId === "ai-data-platform"
        ? ("MASTER_INTELLIGENCE_SELF" as const)
        : ("AUTHORITATIVE_SOURCE" as const),
    inboundToAiData: [
      "source.health.reported",
      "release.promoted",
      "module.readiness.changed",
      "audit.evidence.recorded"
    ] as const,
    outboundFromAiData: [
      "read-model refresh",
      "evidence recheck result",
      "retry request intent",
      "recovery guidance"
    ] as const,
    peerMutationAutomatic: false as const
  }))
);

export const COMMS_HUB_LINK = Object.freeze({
  id: "rosevear-comms-hub",
  repository: "RosevearCreations/rosevear-comms-hub",
  relationship: "COMPLEMENTARY_CONTROL_PLANE" as const,
  inboundToAiData: [
    "incident projection",
    "follow-up projection",
    "source impact",
    "acknowledgement/freshness projection"
  ] as const,
  outboundFromAiData: [
    "operator follow-up request intent",
    "incident context",
    "recheck outcome",
    "recovery handoff context"
  ] as const,
  messageAuthorityRemainsCommsHub: true as const,
  incidentAuthorityRemainsCommsHub: true as const,
  peerMutationAutomatic: false as const
});

export function composeBasicOperatorActions(input?: {
  sourceStates?: Partial<Record<MasterShellSourceId, string>>;
  generatedAt?: Date;
}) {
  const generatedAt = input?.generatedAt ?? new Date();

  const sourceLinks = MASTER_SHELL_LINKS.map((link) => ({
    ...link,
    observedState: input?.sourceStates?.[link.sourceId] ?? "UNKNOWN",
    safeActions: OPERATOR_ACTION_DEFINITIONS.map((action) => ({
      action: action.action,
      mode: action.mode,
      authority:
        link.sourceId === "ai-data-platform"
          ? action.action === "refresh" || action.action === "recheck"
            ? "AI_DATA_LOCAL"
            : action.authority
          : action.authority,
      automaticPeerMutation: false as const,
      approvalRequired: action.requiresExplicitApproval
    }))
  }));

  return {
    schema: BASIC_OPERATOR_ACTIONS_SCHEMA,
    build: BASIC_OPERATOR_ACTIONS_BUILD,
    generatedAt: generatedAt.toISOString(),
    role: {
      masterShellPosition: "MASTER_INTELLIGENCE_MONITORING" as const,
      universalWriteMaster: false as const,
      sourceApplicationsRetainOperationalAuthority: true as const,
      commsHubIsComplementaryControlPlane: true as const,
      aiDataIsAlsoOneOfSixSources: true as const
    },
    actions: OPERATOR_ACTION_DEFINITIONS,
    sourceLinks,
    commsHub: COMMS_HUB_LINK,
    connectionProcess: [
      "Discover exact source identity and approved shell boundary.",
      "Validate contract version, audience, source revision and tenancy context.",
      "Receive authorized signed/read-only source evidence.",
      "Normalize provenance, correlation, freshness and verification state.",
      "Project read-only status into Master Shell monitoring surfaces.",
      "For retry or recovery, prepare an intent/handoff to the authoritative source or Comms Hub.",
      "Require source-side acknowledgement/evidence before showing a changed operational state."
    ] as const,
    boundaries: {
      refreshCanCreateSourceSuccess: false as const,
      recheckCanCreateMissingEvidence: false as const,
      retryExecutesPeerWriteAutomatically: false as const,
      recoveryExecutesPeerRecoveryAutomatically: false as const,
      deploymentGreenImpliesConnection: false as const,
      holdReleasedAutomatically: false as const
    }
  };
}

export type BasicOperatorActionsModel = ReturnType<
  typeof composeBasicOperatorActions
>;
