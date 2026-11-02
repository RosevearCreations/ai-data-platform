import { listControlledLiveDeliveryForUser } from "./controlled-live-delivery";
import { buildConsumerAcceptanceReconciliation } from "./consumer-acceptance-reconciliation";
import {
  integrationConsumerConfiguration,
  type IntegrationTarget
} from "./integration-delivery";
import { listWorkspacesForUser, withUserDatabase } from "./database";
import type { IntegrationDeliveryEventType } from "./integration-delivery-database";

const TARGETS = ["rosie-dazzlers", "devil-n-dove"] as const;

export async function buildConsumerAcceptanceReconciliationForUser(
  userId: string
) {
  const [workspaces, controlled] = await Promise.all([
    listWorkspacesForUser(userId),
    listControlledLiveDeliveryForUser(userId)
  ]);

  const events = [];
  for (const workspace of workspaces) {
    const rows = await withUserDatabase(userId, async (client) =>
      client.query<{
        target: IntegrationTarget;
        transport_mode: "conformance" | "live";
        event_type: IntegrationDeliveryEventType;
        validation_code: string;
        details: Record<string, unknown>;
      }>(
        `select target,transport_mode,event_type,validation_code,details
         from app.integration_delivery_events
         where workspace_id=$1
         order by occurred_at desc
         limit 500`,
        [workspace.id]
      )
    );

    events.push(
      ...rows.rows.map((event) => ({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        role: workspace.role,
        target: event.target,
        transportMode: event.transport_mode,
        eventType: event.event_type,
        validationCode: event.validation_code,
        details: event.details ?? {}
      }))
    );
  }

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
