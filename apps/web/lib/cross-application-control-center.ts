import {
  CONNECTION_HANDOFFS,
  SOURCE_ACKNOWLEDGEMENTS
} from "./basic-alerts";
import { MASTER_SHELL_SOURCE_DEFINITIONS } from "./master-shell-contract-v1";

export const CROSS_APPLICATION_CONTROL_CENTER_BUILD = 354 as const;
export const CROSS_APPLICATION_CONTROL_CENTER_SCHEMA =
  "rosevear.ai-data-platform.cross-application-control-center.v1" as const;

export const DEPENDENCY_KINDS = [
  "SOURCE_EVIDENCE",
  "CONTRACT_COMPATIBILITY",
  "INCIDENT_ESCALATION",
  "RECOVERY_HANDOFF"
] as const;

export type DependencyKind = (typeof DEPENDENCY_KINDS)[number];

export const DEPENDENCY_STATES = [
  "READY",
  "BLOCKED",
  "STALE",
  "REVIEW"
] as const;

export type DependencyState = (typeof DEPENDENCY_STATES)[number];

type DependencyEdge = {
  id: string;
  from: string;
  to: string;
  kind: DependencyKind;
  state: DependencyState;
  reason: string;
  authority: string;
  automaticActionAllowed: false;
};

function dependencyState(input: {
  connection: string;
  manifest: string;
  revisionState: string;
}): DependencyState {
  if (input.revisionState === "STALE_REVISION") return "STALE";
  if (input.revisionState === "REVIEW") return "REVIEW";
  if (input.connection !== "CONNECTED" && input.connection !== "VERIFIED") {
    return "BLOCKED";
  }
  if (
    input.manifest.includes("STALE") ||
    input.manifest.includes("HOLD")
  ) {
    return "BLOCKED";
  }
  return "READY";
}

function dependencyReason(input: {
  connection: string;
  manifest: string;
  ownerProof: string;
  signedReceipt: string;
  revisionState: string;
}) {
  if (input.revisionState === "STALE_REVISION") {
    return "The source acknowledgement is older than the current source revision.";
  }
  if (input.revisionState === "REVIEW") {
    return "The dependency has current evidence that still requires operator review.";
  }
  if (input.connection !== "CONNECTED" && input.connection !== "VERIFIED") {
    return (
      "Connection remains " +
      input.connection +
      "; manifest=" +
      input.manifest +
      ", owner-proof=" +
      input.ownerProof +
      ", signed-receipt=" +
      input.signedReceipt +
      "."
    );
  }
  return "Current source evidence satisfies the dependency read model.";
}

export function composeCrossApplicationControlCenter(
  generatedAt = new Date()
) {
  const acknowledgementBySource = new Map(
    SOURCE_ACKNOWLEDGEMENTS.map((ack) => [ack.sourceId, ack])
  );

  const sources = MASTER_SHELL_SOURCE_DEFINITIONS.map((source) => {
    const ack = acknowledgementBySource.get(source.sourceId);
    const connectionState = ack?.connection ?? "HOLD";
    const manifestState = ack?.manifest ?? "UNKNOWN";
    const revisionState = ack?.revisionState ?? "UNKNOWN";

    return {
      sourceId: source.sourceId,
      shellId: source.shellId,
      repository: source.repository,
      shellBoundary: source.shellBoundary,
      tenancyModel: source.tenancyModel,
      connectionState,
      manifestState,
      revisionState,
      currentRevisionAtReconciliation:
        ack?.currentRevisionAtReconciliation ?? null,
      ownerProof: ack?.ownerProof ?? "UNKNOWN",
      signedReceipt: ack?.signedReceipt ?? "UNKNOWN",
      dependencyState: dependencyState({
        connection: connectionState,
        manifest: manifestState,
        revisionState
      })
    };
  });

  const sourceDependencies: DependencyEdge[] = sources
    .filter((source) => source.sourceId !== "ai-data-platform")
    .map((source) => {
      const ack = acknowledgementBySource.get(source.sourceId);
      return {
        id: "source-evidence:" + source.sourceId,
        from: source.sourceId,
        to: "ai-data-platform",
        kind: "SOURCE_EVIDENCE",
        state: source.dependencyState,
        reason: ack
          ? dependencyReason(ack)
          : "No source acknowledgement is available.",
        authority:
          source.shellBoundary +
          " retains operational authority; AI Data Platform consumes read-only evidence.",
        automaticActionAllowed: false
      };
    });

  const contractDependencies: DependencyEdge[] = sources.map((source) => ({
    id: "contract:" + source.sourceId,
    from: source.sourceId,
    to: "rosevear-master-shell-contract-v1",
    kind: "CONTRACT_COMPATIBILITY",
    state:
      source.manifestState === "VERIFIED" ||
      source.manifestState === "DISCOVERY_VERIFIED_AUTH_HOLD" ||
      source.manifestState === "SOURCE_CODE_COMPATIBLE"
        ? "READY"
        : source.manifestState.includes("STALE")
          ? "STALE"
          : "REVIEW",
    reason:
      source.manifestState === "VERIFIED"
        ? "Manifest is verified for the current reconciliation."
        : "Contract/manifest evidence remains " + source.manifestState + ".",
    authority:
      "Source contract evidence remains source-owned and cannot be upgraded by the control center.",
    automaticActionAllowed: false
  }));

  const commsAck = acknowledgementBySource.get("rosevear-comms-hub");
  const commsDependency: DependencyEdge = {
    id: "incident-escalation:rosevear-comms-hub",
    from: "ai-data-platform",
    to: "rosevear-comms-hub",
    kind: "INCIDENT_ESCALATION",
    state: commsAck
      ? dependencyState({
          connection: commsAck.connection,
          manifest: commsAck.manifest,
          revisionState: commsAck.revisionState
        })
      : "BLOCKED",
    reason: commsAck
      ? dependencyReason(commsAck)
      : "No current Comms Hub acknowledgement is available.",
    authority:
      "Rosevear Comms Hub retains message, incident, routing and follow-up authority.",
    automaticActionAllowed: false
  };

  const recoveryDependencies: DependencyEdge[] = sources
    .filter((source) => source.sourceId !== "ai-data-platform")
    .map((source) => ({
      id: "recovery:" + source.sourceId,
      from: "ai-data-platform",
      to: source.sourceId,
      kind: "RECOVERY_HANDOFF",
      state:
        source.dependencyState === "READY" ? "READY" : source.dependencyState,
      reason:
        source.dependencyState === "READY"
          ? "A supervised recovery request may be prepared if needed."
          : "Recovery remains blocked from automatic execution while the source dependency is not READY.",
      authority:
        source.shellBoundary + " retains recovery and write authority.",
      automaticActionAllowed: false
    }));

  const dependencies = [
    ...sourceDependencies,
    ...contractDependencies,
    commsDependency,
    ...recoveryDependencies
  ];

  const blockedDependencies = dependencies.filter(
    (item) => item.state !== "READY"
  );

  const handoffs = CONNECTION_HANDOFFS.map((handoff) => {
    const ack = acknowledgementBySource.get(handoff.targetId);
    return {
      ...handoff,
      connection: ack?.connection ?? "HOLD",
      revisionState: ack?.revisionState ?? "UNKNOWN",
      manifest: ack?.manifest ?? "UNKNOWN"
    };
  });

  const operations = [
    {
      id: "refresh-dependencies",
      label: "Refresh dependency view",
      mode: "READ_ONLY",
      description:
        "Recompose the dependency graph from current stored source evidence.",
      peerMutation: false
    },
    {
      id: "recheck-blockers",
      label: "Recheck blockers",
      mode: "READ_ONLY",
      description:
        "Re-evaluate HOLD, STALE and REVIEW dependencies without manufacturing missing evidence.",
      peerMutation: false
    },
    {
      id: "prepare-escalation",
      label: "Prepare escalation",
      mode: "REQUEST_ONLY",
      description:
        "Prepare an evidence-aware Comms Hub escalation request. Comms Hub decides and executes communications workflow.",
      peerMutation: false
    },
    {
      id: "prepare-recovery-handoff",
      label: "Prepare recovery handoff",
      mode: "SUPERVISED",
      description:
        "Prepare a source-owned recovery handoff. The target source retains execution authority.",
      peerMutation: false
    }
  ] as const;

  return {
    schema: CROSS_APPLICATION_CONTROL_CENTER_SCHEMA,
    build: CROSS_APPLICATION_CONTROL_CENTER_BUILD,
    generatedAt: generatedAt.toISOString(),
    sources,
    dependencies,
    blockedDependencies,
    handoffs,
    operations,
    summary: {
      sourceApplications: sources.length,
      readySourceDependencies: sourceDependencies.filter(
        (item) => item.state === "READY"
      ).length,
      blockedSourceDependencies: sourceDependencies.filter(
        (item) => item.state !== "READY"
      ).length,
      dependencies: dependencies.length,
      readyDependencies: dependencies.filter(
        (item) => item.state === "READY"
      ).length,
      blockedDependencies: blockedDependencies.length,
      staleDependencies: dependencies.filter(
        (item) => item.state === "STALE"
      ).length,
      reviewDependencies: dependencies.filter(
        (item) => item.state === "REVIEW"
      ).length
    },
    policy: {
      readOnlyControlCenter: true,
      dependencyStateCanOverrideSourceTruth: false as const,
      automaticPeerWrite: false as const,
      automaticHoldRelease: false as const,
      acknowledgementImpliesConnected: false as const,
      deploymentGreenImpliesConnected: false as const,
      sourceApplicationsRetainOperationalAuthority: true as const,
      commsHubRetainsCommunicationsAuthority: true as const,
      recoveryRequiresSourceExecution: true as const,
      missingEvidenceIsSuccess: false as const
    }
  };
}

export type CrossApplicationControlCenterModel = ReturnType<
  typeof composeCrossApplicationControlCenter
>;
