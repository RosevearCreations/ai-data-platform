import { listControlledLiveDeliveryForUser } from "./controlled-live-delivery";
import { buildConsumerAcceptanceReconciliation } from "./consumer-acceptance-reconciliation";
import { integrationConsumerConfiguration } from "./integration-delivery";
import { listIntegrationDeliveryOverviewForUser } from "./integration-delivery-database";

const TARGETS = ["rosie-dazzlers", "devil-n-dove"] as const;

export async function buildConsumerAcceptanceReconciliationForUser(
  userId: string
) {
  const [overview, controlled] = await Promise.all([
    listIntegrationDeliveryOverviewForUser(userId),
    listControlledLiveDeliveryForUser(userId)
  ]);

  const events = overview.flatMap((entry) =>
    entry.recent.map((event) => ({
      workspaceId: entry.workspace.id,
      workspaceName: entry.workspace.name,
      role: entry.workspace.role,
      target: event.target,
      transportMode: event.transportMode,
      eventType: event.eventType,
      validationCode: event.validationCode,
      details: event.details
    }))
  );

  return buildConsumerAcceptanceReconciliation({
    events,
    receipts: controlled.bridge.receipts.map((receipt) => ({
      workspaceId: receipt.workspaceId,
      target: receipt.target,
      transportMode: receipt.transportMode,
      receiptStatus: receipt.receiptStatus,
      dryRun: receipt.dryRun
    })),
    liveDeliveries: controlled.deliveries.map((delivery) => ({
      workspaceId: delivery.workspaceId,
      status: delivery.status,
      attemptCount: delivery.attemptCount,
      replayKey: delivery.replayKey,
      idempotencyKey: delivery.idempotencyKey,
      acknowledgement: delivery.acknowledgement
    })),
    activations: controlled.activations.map((activation) => ({
      workspaceId: activation.workspaceId,
      status: activation.status,
      expired: activation.expired
    })),
    configurations: TARGETS.map((target) => ({
      target,
      configured: integrationConsumerConfiguration(target).configured
    }))
  });
}
