import {
  BUILD_381_RUNTIME,
  type Build381ReceiverHealthContinuityModel
} from "./yw562-receiver-health-continuity";

export const BUILD_382 = 382 as const;
export const BUILD_382_SCHEMA =
  "rosevear.ai-data-platform.yw562-runtime-renewal-drift-continuity.v1" as const;
export const BUILD_382_CONTROLLER_BASE_REVISION =
  "3d73fecb47b2933b71c0b2b866a38a14ead475db" as const;

export type Build382DriftReason =
  | "NONE"
  | "BUILD381_NOT_CONNECTED"
  | "RENEWAL_MISSING"
  | "RENEWAL_EXPIRED"
  | "RUNTIME_REVISION_DRIFT"
  | "THREE_MASTER_RECEIPT_DRIFT"
  | "ROLLBACK_PRESENT";

export type Build382Input = {
  build381: Build381ReceiverHealthContinuityModel;
  now?: Date;
};

function hasThreeMasterReceiptContinuity(
  renewal: Build381ReceiverHealthContinuityModel["latestRenewal"]
) {
  if (!renewal) return false;
  const receiptIds = [
    renewal.aiHubRuntimeReceiptId,
    renewal.commsRuntimeReceiptId,
    renewal.controllerRuntimeReceiptId
  ];
  const digests = [
    renewal.aiHubRuntimeDigest,
    renewal.commsRuntimeDigest,
    renewal.controllerRuntimeDigest
  ];
  const signers = [
    renewal.aiHubSignerKeyId,
    renewal.commsSignerKeyId,
    renewal.controllerSignerKeyId
  ];
  return (
    receiptIds.every(Boolean) &&
    digests.every((value) => /^[a-f0-9]{64}$/.test(value)) &&
    signers.every(Boolean) &&
    new Set(receiptIds).size === 3
  );
}

export function composeBuild382RuntimeRenewalDriftContinuity(
  input: Build382Input
) {
  const now = input.now ?? new Date();
  const build381 = input.build381;
  const renewal = build381.latestRenewal;

  const exactRuntimeBinding =
    !!renewal &&
    renewal.sourceRevision === BUILD_381_RUNTIME.yw.main &&
    renewal.aiHubMain === BUILD_381_RUNTIME.aiHub.main &&
    renewal.commsMain === BUILD_381_RUNTIME.comms.main &&
    renewal.originalHostId === BUILD_381_RUNTIME.aiHub.originalHost;

  const renewalCurrent =
    !!renewal &&
    Number.isFinite(Date.parse(renewal.validUntil)) &&
    Date.parse(renewal.validUntil) > now.getTime() &&
    build381.receiverHealthContinuityState === "HEALTHY_RENEWED_CURRENT";

  const threeMasterReceiptContinuity =
    hasThreeMasterReceiptContinuity(renewal) &&
    build381.threeMasterConnectedRevalidationState === "CONNECTED_REVALIDATED";

  const rollbackPresent =
    build381.rollbackState === "ROLLED_BACK_VERIFIED" ||
    build381.connectionState === "DISCONNECTED_HOLD";

  let driftReason: Build382DriftReason = "NONE";
  if (!renewal) driftReason = "RENEWAL_MISSING";
  else if (!exactRuntimeBinding) driftReason = "RUNTIME_REVISION_DRIFT";
  else if (!renewalCurrent) driftReason = "RENEWAL_EXPIRED";
  else if (!threeMasterReceiptContinuity)
    driftReason = "THREE_MASTER_RECEIPT_DRIFT";
  else if (build381.connectionState !== "CONNECTED")
    driftReason =
      build381.rollbackState === "ROLLED_BACK_VERIFIED"
        ? "ROLLBACK_PRESENT"
        : "BUILD381_NOT_CONNECTED";

  const renewalDriftState =
    driftReason === "NONE" ? ("CURRENT" as const) : ("DRIFT_DETECTED" as const);

  const failClosedRecoveryValidationState =
    renewalDriftState === "CURRENT"
      ? ("NOT_REQUIRED" as const)
      : build381.rollbackState === "ROLLED_BACK_VERIFIED" &&
          build381.connectionState === "DISCONNECTED_HOLD" &&
          build381.mastersSynced === false
        ? ("FAIL_CLOSED_RECOVERY_VERIFIED" as const)
        : ("FAIL_CLOSED_REQUIRED" as const);

  const threeMasterContinuityState =
    renewalDriftState === "CURRENT" &&
    threeMasterReceiptContinuity &&
    build381.mastersSynced === true
      ? ("CONNECTED_CONTINUITY_VERIFIED" as const)
      : failClosedRecoveryValidationState === "FAIL_CLOSED_RECOVERY_VERIFIED"
        ? ("DISCONNECTED_FAIL_CLOSED_VERIFIED" as const)
        : ("HOLD_CONTINUITY_NOT_VERIFIED" as const);

  const connectionState =
    threeMasterContinuityState === "CONNECTED_CONTINUITY_VERIFIED"
      ? ("CONNECTED" as const)
      : ("DISCONNECTED_HOLD" as const);

  return {
    schema: BUILD_382_SCHEMA,
    build: BUILD_382,
    controllerBaseRevision: BUILD_382_CONTROLLER_BASE_REVISION,
    runtime: BUILD_381_RUNTIME,
    build381,
    renewalDriftState,
    driftReason,
    exactRuntimeBinding,
    renewalCurrent,
    threeMasterReceiptContinuity,
    failClosedRecoveryValidationState,
    threeMasterContinuityState,
    connectionState,
    mastersSynced:
      connectionState === "CONNECTED" &&
      threeMasterContinuityState === "CONNECTED_CONTINUITY_VERIFIED",
    blockers:
      renewalDriftState === "CURRENT"
        ? []
        : [
            `Build 382 detected runtime continuity drift: ${driftReason}.`,
            ...(failClosedRecoveryValidationState === "FAIL_CLOSED_REQUIRED"
              ? [
                  "Automatic fail-closed recovery must complete and remain DISCONNECTED until protected rollback evidence is verified."
                ]
              : [])
          ],
    policy: {
      renewalDriftNeverExtendsConnectivity: true,
      expiredRenewalFailsClosed: true,
      revisionDriftFailsClosed: true,
      threeMasterReceiptDriftFailsClosed: true,
      verifiedRollbackCannotReportConnected: true,
      allThreeMastersRequiredForConnectedContinuity: true,
      codeGreenCannotOverrideRuntimeEvidence: true
    }
  };
}

export type Build382RuntimeRenewalDriftContinuityModel = ReturnType<
  typeof composeBuild382RuntimeRenewalDriftContinuity
>;
