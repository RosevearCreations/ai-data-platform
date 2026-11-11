import { composeMasterActivationEvidenceReconciliation } from "./master-activation-evidence-reconciliation";

export const SOURCE_CONVERGENCE_BUILD = 363 as const;
export const SOURCE_CONVERGENCE_SCHEMA =
  "rosevear.ai-data-platform.yw-icamp-source-convergence.v1" as const;

export const BUILD_363_SOURCE_SNAPSHOT = Object.freeze([
  {
    sourceId: "yw",
    sourceAppId: "yard-workers",
    label: "Yard Workers",
    repository: "RosevearCreations/yw",
    productionMain: "0010bbd5ae71cb025d77e613cce9bc6e3f064d34",
    manifestRevision: "0010bbd5ae71cb025d77e613cce9bc6e3f064d34",
    manifestPath: "/.well-known/rosevear-integration-manifest.json",
    healthPath: "/api/integration/v1/shell/health",
    signerState: "HOLD_UNENROLLED",
    connectionState: "DISCONNECTED / HOLD",
    tenantBoundary: "platform_shell",
    sourceHandoff: "MASTER363-YW-SOURCE-CONVERGE"
  },
  {
    sourceId: "icamp",
    sourceAppId: "icamp",
    label: "iCamp",
    repository: "RosevearCreations/iCamp",
    productionMain: "00112c6714ecdf4d49dc114d4b29a0a8b9a8bced",
    manifestRevision: "00112c6714ecdf4d49dc114d4b29a0a8b9a8bced",
    manifestPath: "/.well-known/rosevear-integration-manifest.json",
    healthPath: "/api/integration/v1/shell/health",
    signerState: "HOLD_UNENROLLED",
    connectionState: "DISCONNECTED / HOLD",
    tenantBoundary: "platform_shell",
    sourceHandoff: "MASTER363-ICAMP-SOURCE-CONVERGE"
  }
]);

export type Source363Override = Partial<{
  productionMain: string;
  manifestRevision: string;
  signerState: string;
  connectionState: string;
  healthReceiptState: string;
}>;

export function composeSourceConvergence(
  overrides: Partial<Record<"yw" | "icamp", Source363Override>> = {}
) {
  const master = composeMasterActivationEvidenceReconciliation();
  const sources = BUILD_363_SOURCE_SNAPSHOT.map((base) => {
    const override = overrides[base.sourceId as "yw" | "icamp"] ?? {};
    const source = { ...base, ...override };
    const revisionConverged =
      source.productionMain === source.manifestRevision;
    const signerReady =
      !source.signerState.toUpperCase().includes("AWAITING") &&
      !source.signerState.toUpperCase().includes("HOLD") &&
      !source.signerState.toUpperCase().includes("MISSING");
    const healthReceiptState =
      override.healthReceiptState ?? "NOT_RECEIVED";
    const healthVerified =
      healthReceiptState === "VERIFIED_SOURCE_BOUND_HEALTH";
    const connectionAccepted =
      !source.connectionState.toUpperCase().includes("DISCONNECTED") &&
      !source.connectionState.toUpperCase().includes("HOLD");
    const sourceReadyForOwnerAcceptance =
      revisionConverged && signerReady && healthVerified;

    return {
      ...source,
      healthReceiptState,
      identityBound:
        source.tenantBoundary === "platform_shell" &&
        Boolean(source.sourceId) &&
        Boolean(source.sourceAppId),
      revisionConverged,
      signerReady,
      healthVerified,
      connectionAccepted,
      sourceReadyForOwnerAcceptance,
      supervisedAcceptance:
        sourceReadyForOwnerAcceptance &&
        master.summary.mastersSynced
          ? ("OWNER_REVIEW_REQUIRED" as const)
          : ("HOLD" as const),
      nextSourceAction: !revisionConverged
        ? ("UPDATE_SOURCE_MANIFEST_REVISION" as const)
        : !signerReady
          ? ("ENROLL_INDEPENDENT_SOURCE_SIGNER" as const)
          : !healthVerified
            ? ("SUBMIT_VERIFIED_SOURCE_BOUND_HEALTH" as const)
            : !master.summary.mastersSynced
              ? ("WAIT_FOR_MASTER_RUNTIME_CLOSURE" as const)
              : ("OWNER_SUPERVISED_ACCEPTANCE_REVIEW" as const)
    };
  });

  const blockers = sources.flatMap((source) => [
    ...(!source.revisionConverged
      ? [
          `${source.label}: manifest revision ${source.manifestRevision} does not match production main ${source.productionMain}.`
        ]
      : []),
    ...(!source.signerReady
      ? [`${source.label}: independent source signer is not enrolled.`]
      : []),
    ...(!source.healthVerified
      ? [`${source.label}: no verified source-bound health receipt is recorded.`]
      : []),
    ...(!source.connectionAccepted
      ? [`${source.label}: connection remains DISCONNECTED / HOLD.`]
      : [])
  ]);

  if (!master.summary.mastersSynced) {
    blockers.unshift(
      "Three-Master runtime synchronization remains unverified; supervised source acceptance cannot close."
    );
  }

  const allSourceEvidenceReady = sources.every(
    (source) => source.sourceReadyForOwnerAcceptance
  );
  const supervisedClosureEligible =
    allSourceEvidenceReady && master.summary.mastersSynced;

  return {
    schema: SOURCE_CONVERGENCE_SCHEMA,
    build: SOURCE_CONVERGENCE_BUILD,
    sources,
    summary: {
      masterState: master.summary.masterState,
      allIdentitiesBound: sources.every((source) => source.identityBound),
      allRevisionsConverged: sources.every(
        (source) => source.revisionConverged
      ),
      allSignersReady: sources.every((source) => source.signerReady),
      allHealthReceiptsVerified: sources.every(
        (source) => source.healthVerified
      ),
      allSourceEvidenceReady,
      supervisedClosureEligible,
      closureState: supervisedClosureEligible
        ? ("OWNER_REVIEW_REQUIRED" as const)
        : ("HOLD" as const)
    },
    blockers,
    handoffs: sources.map((source) => ({
      sourceId: source.sourceId,
      token: source.sourceHandoff,
      requiredEvidence: [
        `manifest source_revision = ${source.productionMain}`,
        "independently enrolled Ed25519 source signer",
        "fresh source-bound health receipt for current production revision",
        "connection/owner acceptance must remain explicit and independently evidenced"
      ]
    })),
    policy: {
      controllerMayRewriteSourceManifest: false,
      controllerMayEnrollSourcePrivateKey: false,
      controllerMayInferHealthFromDeployment: false,
      controllerMayInferConnectionFromHealth: false,
      sourcePrivateKeysMayBeExposed: false,
      childTenantMayBecomeSourceIdentity: false,
      revisionConvergenceRequired: true,
      signerVerificationRequired: true,
      verifiedHealthRequired: true,
      ownerAcceptanceRequired: true
    }
  };
}

export type SourceConvergenceModel = ReturnType<typeof composeSourceConvergence>;
