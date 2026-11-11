import { composeMasterActivationEvidenceReconciliation } from "./master-activation-evidence-reconciliation";

export const SOURCE_SHELL_ONBOARDING_BUILD = 362 as const;
export const SOURCE_SHELL_ONBOARDING_SCHEMA =
  "rosevear.ai-data-platform.yw-icamp-product-shell-onboarding.v1" as const;

export const MASTER_362_COMMS_RECEIPT = Object.freeze({
  receipt: "MASTER360-COMMS-QL413-ACK",
  controller: "ai-data-platform",
  controllerMain: "69355a853f10bbe4d3785bcede8b44e0c788be65",
  commsMain: "c670c2523001294e8ac2e4f283a1f8e5edda3ddb",
  aiHubMain: "27b234337f5a3f041dfca4541e33ed6aa821fa4f",
  code: "GREEN",
  receiptIntake: "CODE_READY_RUNTIME_HOLD",
  operationalUptime: "HOLD",
  protectedSigner: "HOLD",
  durableReplayLedger: "CODE_READY_DEPLOYMENT_HOLD",
  incidentAcceptance: "HOLD",
  ownerConnectionDecision: "HOLD",
  connection: "HOLD",
  receiver: "OFF",
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
});

export const MASTER_362_PRODUCT_SHELLS = Object.freeze([
  {
    sourceId: "yw",
    sourceAppId: "yard-workers",
    label: "Yard Workers",
    repository: "RosevearCreations/yw",
    currentProductionMain: "cdc368e2f2773863595ff9cf6f35c1f02773eeaf",
    manifestRevision: "028aee250857415b9b9035aaec50060757e377a5",
    manifestPath: "/.well-known/rosevear-integration-manifest.json",
    healthPath: "/api/integration/v1/shell/health",
    manifestRole: "business_shell",
    tenantBoundary: "platform_shell",
    signatureState: "AWAITING_INDEPENDENT_SOURCE_SIGNER",
    connectionState: "DISCONNECTED / HOLD"
  },
  {
    sourceId: "icamp",
    sourceAppId: "icamp",
    label: "iCamp",
    repository: "RosevearCreations/iCamp",
    currentProductionMain: "e2d343595363ca9106e7f1dbc60006e3a6c616aa",
    manifestRevision: "dc1369338a4b191fc72031b7e62f7e48fd805bcd",
    manifestPath: "/.well-known/rosevear-integration-manifest.json",
    healthPath: "/api/integration/v1/shell/health",
    manifestRole: "business_shell",
    tenantBoundary: "platform_shell",
    signatureState: "AWAITING_INDEPENDENT_SOURCE_SIGNER",
    connectionState: "DISCONNECTED / HOLD"
  }
]);

function sourceStatus(source: (typeof MASTER_362_PRODUCT_SHELLS)[number]) {
  const revisionCurrent =
    source.manifestRevision === source.currentProductionMain;
  const signerEnrolled =
    source.signatureState !== "AWAITING_INDEPENDENT_SOURCE_SIGNER";
  const connectionAccepted =
    !source.connectionState.toUpperCase().includes("HOLD") &&
    !source.connectionState.toUpperCase().includes("DISCONNECTED");

  return {
    ...source,
    identityBound:
      source.tenantBoundary === "platform_shell" &&
      Boolean(source.sourceId) &&
      Boolean(source.sourceAppId),
    revisionCurrent,
    signerEnrolled,
    connectionAccepted,
    healthProjection:
      revisionCurrent && signerEnrolled && connectionAccepted
        ? ("ELIGIBLE_FOR_VERIFIED_READ_ONLY_PROJECTION" as const)
        : ("CODE_READY_SOURCE_EVIDENCE_HOLD" as const),
    supervisedMasterAcceptance:
      revisionCurrent && signerEnrolled && connectionAccepted
        ? ("OWNER_REVIEW_REQUIRED" as const)
        : ("HOLD" as const)
  };
}

export function composeSourceShellOnboarding() {
  const master = composeMasterActivationEvidenceReconciliation();
  const sources = MASTER_362_PRODUCT_SHELLS.map(sourceStatus);
  const allIdentitiesBound = sources.every((source) => source.identityBound);
  const allSourceEvidenceCurrent = sources.every(
    (source) =>
      source.revisionCurrent &&
      source.signerEnrolled &&
      source.connectionAccepted
  );
  const masterGateOpen = master.summary.mastersSynced;
  const supervisedAcceptanceEligible =
    masterGateOpen && allIdentitiesBound && allSourceEvidenceCurrent;

  return {
    schema: SOURCE_SHELL_ONBOARDING_SCHEMA,
    build: SOURCE_SHELL_ONBOARDING_BUILD,
    masterReceipt: MASTER_362_COMMS_RECEIPT,
    sources,
    summary: {
      onboardingCodeReady: allIdentitiesBound,
      masterState: master.summary.masterState,
      masterGateOpen,
      sourceEvidenceCurrent: allSourceEvidenceCurrent,
      supervisedAcceptanceEligible,
      supervisedMasterAcceptance: supervisedAcceptanceEligible
        ? ("OWNER_REVIEW_REQUIRED" as const)
        : ("HOLD" as const),
      yardWorkersConnection: sources[0].connectionAccepted
        ? ("ACCEPTED" as const)
        : ("HOLD" as const),
      iCampConnection: sources[1].connectionAccepted
        ? ("ACCEPTED" as const)
        : ("HOLD" as const)
    },
    blockers: [
      ...(!masterGateOpen
        ? [
            "Three-Master synchronization is not verified; QL-413 still reports runtime/owner/deployment HOLD."
          ]
        : []),
      ...sources.flatMap((source) => [
        ...(!source.revisionCurrent
          ? [
              `${source.label}: integration manifest revision does not match current production main.`
            ]
          : []),
        ...(!source.signerEnrolled
          ? [`${source.label}: independent source signer is not enrolled.`]
          : []),
        ...(!source.connectionAccepted
          ? [`${source.label}: source connection remains DISCONNECTED / HOLD.`]
          : [])
      ])
    ],
    policy: {
      platformShellIdentityOnly: true,
      childTenantMayBecomeSourceIdentity: false,
      readOnlyProjectionOnlyUntilAcceptance: true,
      deploymentGreenIsConnectionProof: false,
      manifestPresenceIsAcceptanceProof: false,
      revisionDriftMayBeIgnored: false,
      missingSignerMayBeIgnored: false,
      ownerAcceptanceMayBeInferred: false
    }
  };
}

export type SourceShellOnboardingModel = ReturnType<
  typeof composeSourceShellOnboarding
>;
