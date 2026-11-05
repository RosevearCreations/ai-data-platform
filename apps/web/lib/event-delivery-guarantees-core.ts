import { createHash } from "node:crypto";

export type DeliveryGuaranteeSourceKind = "original" | "replay";

export interface DeliveryIntentIdentity {
  workspaceId: string;
  publicationId: string;
  subscriptionId: string;
  destinationApplicationId: string;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function safeDeliveryIdempotencyKey(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

export function deliveryIntentIdempotencyKey(
  identity: DeliveryIntentIdentity
) {
  return sha256(
    JSON.stringify([
      "rosevear-event-delivery-intent-v1",
      identity.workspaceId,
      identity.publicationId,
      identity.subscriptionId,
      identity.destinationApplicationId
    ])
  );
}

export function deliveryAttemptReservationKey(input: {
  idempotencyKeySha256: string;
  sourceKind: DeliveryGuaranteeSourceKind;
  sourceReferenceId: string;
}) {
  if (!safeDeliveryIdempotencyKey(input.idempotencyKeySha256)) {
    throw new Error("event_bus_idempotency_key_invalid");
  }
  return sha256(
    JSON.stringify([
      "rosevear-event-delivery-attempt-v1",
      input.idempotencyKeySha256,
      input.sourceKind,
      input.sourceReferenceId
    ])
  );
}

export function deliveryAttemptOrdinal(
  sourceKind: DeliveryGuaranteeSourceKind,
  replayNumber?: number
) {
  if (sourceKind === "original") return 1;
  if (
    !Number.isInteger(replayNumber) ||
    Number(replayNumber) < 1 ||
    Number(replayNumber) > 5
  ) {
    throw new Error("event_bus_replay_number_invalid");
  }
  return Number(replayNumber) + 1;
}
