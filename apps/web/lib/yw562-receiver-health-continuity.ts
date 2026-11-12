import { createHash } from "node:crypto";

import type { Build380ExternalRuntimeActivationModel } from "./yw562-external-runtime-activation-closure";

export const BUILD_381 = 381 as const;
export const BUILD_381_SCHEMA =
  "rosevear.ai-data-platform.yw562-receiver-health-continuity.v1" as const;
export const BUILD_381_CONTROLLER_BASE_REVISION =
  "ccd291f22e15750392fa3995dc3d5811c506cd05" as const;
export const BUILD_381_RENEWAL_SCHEMA =
  "rosevear.ai-data-platform.build381.runtime-renewal.v1" as const;
export const BUILD_381_ROLLBACK_SCHEMA =
  "rosevear.ai-data-platform.build381.fail-closed-rollback.v1" as const;

export const BUILD_381_RUNTIME = Object.freeze({
  yw: {
    build: 562,
    main: "6e0b77eebcfc77aa7fc48dcc398da958af8df696"
  },
  aiHub: {
    build: 321,
    main: "dbc3fd8ae7f8df3bfc85a402a00b0954648ec543",
    originalHost: "DESKTOP-AE894KC"
  },
  comms: {
    build: "QL-432",
    main: "f28f14f67d3ecd5fad9972d6f0500c14de0f89b7"
  }
} as const);

export type Build381MasterRenewalReceipt = {
  masterId: "rosevear-ai-hub" | "rosevear-comms-hub" | "ai-data-platform";
  receiptId: string;
  digest: string;
  runtimeState: "CONNECTED_HEALTHY";
  signerKeyId: string;
  signatureSha256: string;
};

export type Build381RenewalBinding = {
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  build380CeremonyEventId: string;
  build380TransitionEventId: string;
  build380ClosureEventId: string;
  registryEvidenceId: string;
  receiverHealthSequence: number;
  observedAt: string;
};

export function canonicalBuild381MasterRenewalReceipt(
  receipt: Pick<
    Build381MasterRenewalReceipt,
    "masterId" | "receiptId" | "digest" | "runtimeState" | "signerKeyId"
  >,
  binding: Build381RenewalBinding
) {
  return JSON.stringify({
    schema: "rosevear.ai-data-platform.build381.master-renewal-receipt.v1",
    masterId: receipt.masterId,
    receiptId: receipt.receiptId,
    digest: receipt.digest,
    runtimeState: receipt.runtimeState,
    signerKeyId: receipt.signerKeyId,
    ...binding
  });
}

export type Build381RenewalEnvelope = {
  authorityKeyId: string;
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  originalHostId: string;
  build380CeremonyEventId: string;
  build380TransitionEventId: string;
  build380ClosureEventId: string;
  registryEvidenceId: string;
  receiverInstanceId: string;
  receiverBootId: string;
  receiverHealthSequence: number;
  receiverState: "ON";
  receiverObservedAt: string;
  receiverHealthURI: string;
  receiverHealthDigest: string;
  masterReceipts: Build381MasterRenewalReceipt[];
  renewalDigest: string;
  evidenceURI: string;
  nonce: string;
  observedAt: string;
};

export function canonicalBuild381RenewalEnvelope(
  input: Build381RenewalEnvelope
) {
  return JSON.stringify({
    schema: BUILD_381_RENEWAL_SCHEMA,
    authorityKeyId: input.authorityKeyId,
    controllerRevision: input.controllerRevision,
    sourceRevision: input.sourceRevision,
    aiHubMain: input.aiHubMain,
    commsMain: input.commsMain,
    originalHostId: input.originalHostId,
    build380CeremonyEventId: input.build380CeremonyEventId,
    build380TransitionEventId: input.build380TransitionEventId,
    build380ClosureEventId: input.build380ClosureEventId,
    registryEvidenceId: input.registryEvidenceId,
    receiverInstanceId: input.receiverInstanceId,
    receiverBootId: input.receiverBootId,
    receiverHealthSequence: input.receiverHealthSequence,
    receiverState: input.receiverState,
    receiverObservedAt: input.receiverObservedAt,
    receiverHealthURI: input.receiverHealthURI,
    receiverHealthDigest: input.receiverHealthDigest,
    masterReceipts: [...input.masterReceipts]
      .map((receipt) => ({
        masterId: receipt.masterId,
        receiptId: receipt.receiptId,
        digest: receipt.digest,
        runtimeState: receipt.runtimeState,
        signerKeyId: receipt.signerKeyId,
        signatureSha256: receipt.signatureSha256
      }))
      .sort((a, b) => a.masterId.localeCompare(b.masterId)),
    renewalDigest: input.renewalDigest,
    evidenceURI: input.evidenceURI,
    nonce: input.nonce,
    observedAt: input.observedAt
  });
}

export type Build381RollbackEnvelope = {
  authorityKeyId: string;
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  originalHostId: string;
  renewalEventId: string | null;
  registryEvidenceId: string;
  receiverInstanceId: string;
  receiverBootId: string;
  receiverState: "OFF";
  reason:
    | "HEALTH_RENEWAL_EXPIRED"
    | "MASTER_REVALIDATION_FAILED"
    | "RECEIVER_HEALTH_FAILED"
    | "EXPLICIT_PROTECTED_SHUTDOWN";
  receiverOffObservedAt: string;
  receiverOffProofURI: string;
  receiverOffDigest: string;
  evidenceURI: string;
  nonce: string;
  observedAt: string;
};

export function canonicalBuild381RollbackEnvelope(
  input: Build381RollbackEnvelope
) {
  return JSON.stringify({
    schema: BUILD_381_ROLLBACK_SCHEMA,
    ...input
  });
}

export function build381Digest(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export type Build381RenewalEvent = {
  renewalEventId: string;
  authorityKeyId: string;
  authorityKeySpkiSha256: string;
  envelopeSha256: string;
  signatureSha256: string;
  nonce: string;
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  originalHostId: string;
  build380CeremonyEventId: string;
  build380TransitionEventId: string;
  build380ClosureEventId: string;
  registryEvidenceId: string;
  renewedRegistryEvidenceId: string;
  receiverInstanceId: string;
  receiverBootId: string;
  receiverHealthSequence: number;
  receiverState: "ON";
  receiverObservedAt: string;
  receiverHealthURI: string;
  receiverHealthDigest: string;
  aiHubRuntimeReceiptId: string;
  aiHubRuntimeDigest: string;
  aiHubSignerKeyId: string;
  aiHubSignatureSha256: string;
  commsRuntimeReceiptId: string;
  commsRuntimeDigest: string;
  commsSignerKeyId: string;
  commsSignatureSha256: string;
  controllerRuntimeReceiptId: string;
  controllerRuntimeDigest: string;
  controllerSignerKeyId: string;
  controllerSignatureSha256: string;
  renewalDigest: string;
  evidenceURI: string;
  renewalState: "RENEWED_VERIFIED";
  observedAt: string;
  validUntil: string;
  recordedAt: string;
};

export type Build381RollbackEvent = {
  rollbackEventId: string;
  renewalEventId: string | null;
  priorRegistryEvidenceId: string;
  rollbackRegistryEvidenceId: string;
  authorityKeyId: string;
  authorityKeySpkiSha256: string;
  envelopeSha256: string;
  signatureSha256: string;
  nonce: string;
  controllerRevision: string;
  sourceRevision: string;
  aiHubMain: string;
  commsMain: string;
  originalHostId: string;
  receiverInstanceId: string;
  receiverBootId: string;
  receiverState: "OFF";
  reason: Build381RollbackEnvelope["reason"];
  receiverOffObservedAt: string;
  receiverOffProofURI: string;
  receiverOffDigest: string;
  evidenceURI: string;
  rollbackState: "ROLLED_BACK_VERIFIED";
  observedAt: string;
  recordedAt: string;
};

export type Build381Input = {
  build380: Build380ExternalRuntimeActivationModel;
  renewalEvents?: readonly Build381RenewalEvent[];
  rollbackEvents?: readonly Build381RollbackEvent[];
  now?: Date;
};

function freshWithin(value: string, now: Date, minutes: number) {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp <= now.getTime() + 2 * 60_000 &&
    now.getTime() - timestamp <= minutes * 60_000
  );
}

export function composeBuild381ReceiverHealthContinuity(
  input: Build381Input
) {
  const now = input.now ?? new Date();
  const latestRenewal =
    [...(input.renewalEvents ?? [])].sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt)
    )[0] ?? null;
  const latestRollback =
    [...(input.rollbackEvents ?? [])].sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt)
    )[0] ?? null;

  const build380HistoricalClosure =
    !!input.build380.latestCeremony &&
    !!input.build380.latestConnectedTransition &&
    input.build380.latestConnectedTransition.transitionState ===
      "CONNECTED_VERIFIED" &&
    input.build380.latestConnectedTransition.connectionState === "CONNECTED" &&
    !!input.build380.latestThreeMasterClosure &&
    input.build380.latestThreeMasterClosure.closureState === "CLOSED_VERIFIED" &&
    input.build380.latestThreeMasterClosure.mastersSynced === true;

  const currentRegistryConnected =
    !!input.build380.latestRegistryEvidence &&
    input.build380.latestRegistryEvidence.sourceId === "yw" &&
    input.build380.latestRegistryEvidence.environment === "production" &&
    input.build380.latestRegistryEvidence.immutableRevision ===
      BUILD_381_RUNTIME.yw.main &&
    input.build380.latestRegistryEvidence.declaredStatus === "CONNECTED" &&
    input.build380.latestRegistryEvidence.evidenceAuthority ===
      "independent-source-verification" &&
    input.build380.latestRegistryEvidence.independentConnectionVerified === true;

  const build380ConnectedPrerequisite =
    build380HistoricalClosure &&
    currentRegistryConnected &&
    (input.build380.connectionState === "CONNECTED" || !!latestRenewal)
      ? ("CONNECTED_CURRENT" as const)
      : ("HOLD_NO_BUILD380_CONNECTED_BASELINE" as const);

  const renewalBindingState =
    !latestRenewal
      ? ("HOLD_NO_RUNTIME_RENEWAL" as const)
      : latestRenewal.controllerRevision !== BUILD_381_CONTROLLER_BASE_REVISION ||
          latestRenewal.sourceRevision !== BUILD_381_RUNTIME.yw.main ||
          latestRenewal.aiHubMain !== BUILD_381_RUNTIME.aiHub.main ||
          latestRenewal.commsMain !== BUILD_381_RUNTIME.comms.main ||
          latestRenewal.originalHostId !== BUILD_381_RUNTIME.aiHub.originalHost
        ? ("HOLD_RUNTIME_REVISION_MISMATCH" as const)
        : latestRenewal.build380CeremonyEventId !==
              input.build380.latestCeremony?.ceremonyEventId ||
            latestRenewal.build380TransitionEventId !==
              input.build380.latestConnectedTransition?.transitionEventId ||
            latestRenewal.build380ClosureEventId !==
              input.build380.latestThreeMasterClosure?.closureEventId
          ? ("HOLD_BUILD380_BINDING_CHANGED" as const)
          : ("BOUND_CURRENT" as const);

  const receiverHealthContinuityState =
    build380ConnectedPrerequisite !== "CONNECTED_CURRENT"
      ? ("HOLD_NO_CONNECTED_BASELINE" as const)
      : renewalBindingState !== "BOUND_CURRENT"
        ? renewalBindingState
        : latestRenewal?.receiverState !== "ON" ||
            !freshWithin(latestRenewal.receiverObservedAt, now, 5) ||
            Date.parse(latestRenewal.validUntil) <= now.getTime()
          ? ("ROLLBACK_REQUIRED_HEALTH_EXPIRED" as const)
          : ("HEALTHY_RENEWED_CURRENT" as const);

  const threeMasterConnectedRevalidationState =
    receiverHealthContinuityState !== "HEALTHY_RENEWED_CURRENT"
      ? ("HOLD_RECEIVER_HEALTH" as const)
      : !latestRenewal ||
          !latestRenewal.aiHubRuntimeReceiptId ||
          !latestRenewal.commsRuntimeReceiptId ||
          !latestRenewal.controllerRuntimeReceiptId ||
          !latestRenewal.aiHubSignerKeyId ||
          !latestRenewal.commsSignerKeyId ||
          !latestRenewal.controllerSignerKeyId
        ? ("HOLD_THREE_MASTER_REVALIDATION_INCOMPLETE" as const)
        : ("CONNECTED_REVALIDATED" as const);

  const rollbackApplies =
    !!latestRollback &&
    (!latestRenewal ||
      latestRollback.recordedAt.localeCompare(latestRenewal.recordedAt) >= 0);

  const rollbackState = rollbackApplies
    ? latestRollback?.rollbackState === "ROLLED_BACK_VERIFIED" &&
      latestRollback.receiverState === "OFF" &&
      latestRollback.controllerRevision === BUILD_381_CONTROLLER_BASE_REVISION &&
      latestRollback.sourceRevision === BUILD_381_RUNTIME.yw.main
      ? ("ROLLED_BACK_VERIFIED" as const)
      : ("HOLD_ROLLBACK_PROOF_INVALID" as const)
    : build380ConnectedPrerequisite === "CONNECTED_CURRENT" &&
        (receiverHealthContinuityState !== "HEALTHY_RENEWED_CURRENT" ||
          threeMasterConnectedRevalidationState !== "CONNECTED_REVALIDATED")
      ? ("ROLLBACK_REQUIRED_FAIL_CLOSED" as const)
      : ("NO_ROLLBACK_REQUIRED" as const);

  const connectionState =
    rollbackState === "ROLLED_BACK_VERIFIED" ||
    rollbackState === "ROLLBACK_REQUIRED_FAIL_CLOSED" ||
    receiverHealthContinuityState !== "HEALTHY_RENEWED_CURRENT" ||
    threeMasterConnectedRevalidationState !== "CONNECTED_REVALIDATED"
      ? ("DISCONNECTED_HOLD" as const)
      : ("CONNECTED" as const);

  const blockers = [
    ...(build380ConnectedPrerequisite !== "CONNECTED_CURRENT"
      ? [
          "Build 381 requires a genuine current Build 380 CONNECTED baseline; code GREEN or isolated pilot evidence cannot create it."
        ]
      : []),
    ...(receiverHealthContinuityState !== "HEALTHY_RENEWED_CURRENT"
      ? [
          "No fresh protected receiver-health renewal is current for the exact YW562 / AI Hub 321 / Comms QL-432 runtime set."
        ]
      : []),
    ...(threeMasterConnectedRevalidationState !== "CONNECTED_REVALIDATED"
      ? [
          "Three-Master CONNECTED revalidation is not current under three independently pinned signed renewal receipts."
        ]
      : []),
    ...(rollbackState === "ROLLBACK_REQUIRED_FAIL_CLOSED"
      ? [
          "The controller has automatically failed closed and requires independently signed receiver-OFF rollback proof for durable closure."
        ]
      : [])
  ];

  return {
    schema: BUILD_381_SCHEMA,
    build: BUILD_381,
    controllerBaseRevision: BUILD_381_CONTROLLER_BASE_REVISION,
    runtime: BUILD_381_RUNTIME,
    build380: input.build380,
    build380ConnectedPrerequisite,
    latestRenewal,
    renewalBindingState,
    receiverHealthContinuityState,
    threeMasterConnectedRevalidationState,
    latestRollback,
    rollbackState,
    connectionState,
    mastersSynced:
      connectionState === "CONNECTED" &&
      threeMasterConnectedRevalidationState === "CONNECTED_REVALIDATED",
    blockers,
    policy: {
      currentBuild380ConnectedBaselineRequired: true,
      receiverRenewalFreshnessMinutes: 5,
      protectedEd25519RenewalAuthorityRequired: true,
      threeDistinctMasterRenewalSignaturesRequired: true,
      exactAiHub321AndCommsQl432RevisionsRequired: true,
      staleRenewalAutomaticallyFailsClosed: true,
      signedReceiverOffProofRequiredForDurableRollbackClosure: true,
      isolatedPilotCannotSetGeneralConnected: true,
      browserMayRenewRuntime: false,
      browserMayClearRollback: false,
      codeGreenMaySetConnected: false
    }
  };
}

export type Build381ReceiverHealthContinuityModel = ReturnType<
  typeof composeBuild381ReceiverHealthContinuity
>;
