export const MASTER_ACTIVATION_RECONCILIATION_BUILD = 361 as const;
export const MASTER_ACTIVATION_RECONCILIATION_SCHEMA =
  "rosevear.ai-data-platform.master-activation-evidence-reconciliation.v1" as const;

export const MASTER_361_ACK_SNAPSHOT = Object.freeze({
  controllerMain: "69355a853f10bbe4d3785bcede8b44e0c788be65",
  comms: {
    receipt: "MASTER360-COMMS-QL413-ACK",
    main: "c670c2523001294e8ac2e4f283a1f8e5edda3ddb",
    aiHubMainObserved: "27b234337f5a3f041dfca4541e33ed6aa821fa4f",
    code: "GREEN",
    telemetry: "HOLD",
    receiptIntake: "CODE_READY_RUNTIME_HOLD",
    operationalUptime: "HOLD",
    signerEnrollment: "HOLD",
    protectedSigner: "HOLD",
    replayStore: "CODE_READY_DEPLOYMENT_HOLD",
    durableReplayLedger: "CODE_READY_DEPLOYMENT_HOLD",
    incidentAcceptance: "HOLD",
    ownerConnectionDecision: "HOLD",
    connection: "HOLD",
    receiver: "OFF",
    slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
  },
  aiHub: {
    receipt: "MASTER360-AIHUB-305-ACK",
    build: 305,
    main: "27b234337f5a3f041dfca4541e33ed6aa821fa4f",
    dev: "efbc0ef908698484b4cc60cdcbec35bcf3115ff6",
    production: "GREEN",
    installedRelease: "HOLD",
    durableMonitoring: "HOLD",
    signedTelemetry: "HOLD",
    commsAck: "HOLD",
    automationHost: "DESKTOP-AE894KC_CODE_GATED",
    newWindowsTasks: 0,
    connection: "HOLD",
    receiver: "OFF",
    slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
  }
});

export type Master361EvidenceOverride = Partial<{
  commsTelemetry: string;
  commsIncidentAcceptance: string;
  aiHubInstalledRelease: string;
  aiHubDurableMonitoring: string;
  aiHubSignedTelemetry: string;
  aiHubAutomationHost: string;
}>;

function verified(value: string) {
  const normalized = value.toUpperCase();
  if (
    normalized.includes("HOLD") ||
    normalized.includes("GATED") ||
    normalized.includes("OFF") ||
    normalized.includes("PENDING")
  ) {
    return false;
  }
  return (
    normalized.includes("VERIFIED") ||
    normalized.includes("ACCEPTED") ||
    normalized.includes("ACTIVE") ||
    normalized.includes("ENFORCED")
  );
}

export function composeMasterActivationEvidenceReconciliation(
  override: Master361EvidenceOverride = {}
) {
  const evidence = {
    commsTelemetry:
      override.commsTelemetry ?? MASTER_361_ACK_SNAPSHOT.comms.telemetry,
    commsIncidentAcceptance:
      override.commsIncidentAcceptance ??
      MASTER_361_ACK_SNAPSHOT.comms.incidentAcceptance,
    aiHubInstalledRelease:
      override.aiHubInstalledRelease ??
      MASTER_361_ACK_SNAPSHOT.aiHub.installedRelease,
    aiHubDurableMonitoring:
      override.aiHubDurableMonitoring ??
      MASTER_361_ACK_SNAPSHOT.aiHub.durableMonitoring,
    aiHubSignedTelemetry:
      override.aiHubSignedTelemetry ??
      MASTER_361_ACK_SNAPSHOT.aiHub.signedTelemetry,
    aiHubAutomationHost:
      override.aiHubAutomationHost ??
      MASTER_361_ACK_SNAPSHOT.aiHub.automationHost
  };

  const prerequisites = [
    {
      id: "comms-protected-telemetry",
      owner: "rosevear-comms-hub",
      label: "Protected telemetry projection verified at runtime",
      observed: evidence.commsTelemetry,
      verified: verified(evidence.commsTelemetry)
    },
    {
      id: "comms-incident-acceptance",
      owner: "rosevear-comms-hub",
      label: "Owner-supervised incident correlation accepted",
      observed: evidence.commsIncidentAcceptance,
      verified: verified(evidence.commsIncidentAcceptance)
    },
    {
      id: "aihub-installed-release",
      owner: "rosevear-ai-hub",
      label: "Build 305 installed on the original Ree Windows host",
      observed: evidence.aiHubInstalledRelease,
      verified: verified(evidence.aiHubInstalledRelease)
    },
    {
      id: "aihub-durable-monitoring",
      owner: "rosevear-ai-hub",
      label: "Durable monitoring history verified",
      observed: evidence.aiHubDurableMonitoring,
      verified: verified(evidence.aiHubDurableMonitoring)
    },
    {
      id: "aihub-signed-telemetry",
      owner: "rosevear-ai-hub",
      label: "Signed metadata-only telemetry verified",
      observed: evidence.aiHubSignedTelemetry,
      verified: verified(evidence.aiHubSignedTelemetry)
    },
    {
      id: "aihub-automation-host",
      owner: "rosevear-ai-hub",
      label: "DESKTOP-AE894KC automation-host enforcement verified",
      observed: evidence.aiHubAutomationHost,
      verified: verified(evidence.aiHubAutomationHost)
    }
  ] as const;

  const blockers = prerequisites.filter((item) => !item.verified);
  const mastersSynced = blockers.length === 0;

  return {
    schema: MASTER_ACTIVATION_RECONCILIATION_SCHEMA,
    build: MASTER_ACTIVATION_RECONCILIATION_BUILD,
    snapshot: MASTER_361_ACK_SNAPSHOT,
    prerequisites,
    blockers,
    summary: {
      codeGreen:
        MASTER_361_ACK_SNAPSHOT.comms.code === "GREEN" &&
        MASTER_361_ACK_SNAPSHOT.aiHub.production === "GREEN",
      mastersSynced,
      masterState: mastersSynced ? "MASTERS_SYNCED" : "MASTERS_NOT_SYNCED",
      sourceOnboardingGate: mastersSynced ? "OPEN" : "HOLD",
      yardWorkersMayBegin: mastersSynced,
      iCampMayBegin: mastersSynced
    },
    closureRequirements: [
      "Verify Build 305 is actually installed and running on DESKTOP-AE894KC.",
      "Verify durable uptime/monitoring history from the installed Ree-host release.",
      "Verify signed metadata-only telemetry from the original Ree host.",
      "Verify Comms has independently enrolled the source signer/owner proof.",
      "Verify the durable replay store is deployed and accepting protected evidence.",
      "Complete the owner-supervised incident acceptance and independently verified Comms acknowledgement.",
      "Only after all six Build 360 prerequisites are verified may AI Data mark MASTERS_SYNCED and open Yard Workers/iCamp supervised acceptance."
    ],
    policy: {
      deploymentGreenIsRuntimeProof: false,
      codeReadyIsRuntimeProof: false,
      holdMayBeAutoReleased: false,
      receiverOffMayBeInterpretedAsConnected: false,
      sourceOnboardingRequiresMastersSynced: true,
      newWindowsTasksAllowed: false
    }
  };
}

export type MasterActivationEvidenceReconciliationModel = ReturnType<
  typeof composeMasterActivationEvidenceReconciliation
>;
