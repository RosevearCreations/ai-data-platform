import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";
import type {
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

async function requireWorkspaceAdmin(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: string }>(
    `
      select role
      from app.workspace_members
      where workspace_id=$1
        and user_id=nullif(current_setting('app.user_id', true), '')
      limit 1
    `,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("workspace_admin_required");
  }
}

export async function assertIntegrationDeliveryAdmin(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, workspaceId);
    return true;
  });
}

export type IntegrationDeliveryEventType =
  | "handshake-accepted"
  | "handshake-rejected"
  | "delivery-attempted"
  | "delivery-accepted"
  | "delivery-rejected"
  | "transport-error";

export async function appendIntegrationDeliveryEvent(
  userId: string,
  input: {
    workspaceId: string;
    consumerId: string;
    target: IntegrationTarget;
    transportMode: "conformance" | "live";
    eventType: IntegrationDeliveryEventType;
    batchId?: string | null;
    packageId?: string | null;
    replayKey?: string | null;
    fingerprint?: string | null;
    validationCode: string;
    httpStatus?: number | null;
    details?: Record<string, unknown>;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `
        insert into app.integration_delivery_events (
          workspace_id,event_id,consumer_id,target,transport_mode,event_type,
          batch_id,package_id,replay_key,fingerprint,validation_code,http_status,
          actor_user_id,details,occurred_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,now())
      `,
      [
        input.workspaceId,
        randomUUID(),
        input.consumerId.slice(0, 128),
        input.target,
        input.transportMode,
        input.eventType,
        input.batchId ?? null,
        input.packageId ?? null,
        input.replayKey ?? null,
        input.fingerprint ?? null,
        input.validationCode.slice(0, 96),
        input.httpStatus ?? null,
        userId,
        JSON.stringify(input.details ?? {})
      ]
    );
    return result.rowCount ?? 0;
  });
}

export async function loadIntegrationModulePayload(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, workspaceId);
    const result = await client.query<{ payload: Record<string, unknown> }>(
      `
        select payload
        from app.workspace_intelligence_modules
        where workspace_id=$1
          and module_key='business-integrations'
        limit 1
      `,
      [workspaceId]
    );
    return result.rows[0]?.payload ?? null;
  });
}

export async function hasIntegrationConsumerReceipt(
  userId: string,
  input: {
    workspaceId: string;
    consumerId: string;
    target: IntegrationTarget;
    packageId: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `
        select 1
        from app.integration_consumer_receipts
        where workspace_id=$1
          and consumer_id=$2
          and target=$3
          and package_id=$4
        limit 1
      `,
      [input.workspaceId, input.consumerId, input.target, input.packageId]
    );
    return result.rowCount === 1;
  });
}

export async function recordIntegrationConsumerReceipt(
  userId: string,
  input: {
    workspaceId: string;
    consumerId: string;
    package: IntegrationPackageV1;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `
        insert into app.integration_consumer_receipts (
          workspace_id,consumer_id,target,package_id,replay_key,fingerprint,
          actor_user_id,received_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,now())
        on conflict (workspace_id,consumer_id,target,package_id) do nothing
      `,
      [
        input.workspaceId,
        input.consumerId.slice(0, 128),
        input.package.target,
        input.package.packageId,
        input.package.replayKey,
        input.package.fingerprint,
        userId
      ]
    );
    return result.rowCount === 1;
  });
}

export async function listIntegrationDeliveryOverviewForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const overview = [];

  for (const workspace of workspaces) {
    const data = await withUserDatabase(userId, async (client) => {
      const counts = await client.query<{
        event_type: IntegrationDeliveryEventType;
        count: string;
      }>(
        `
          select event_type, count(*)::text as count
          from app.integration_delivery_events
          where workspace_id=$1
          group by event_type
        `,
        [workspace.id]
      );
      const recent = await client.query<{
        event_id: string;
        consumer_id: string;
        target: IntegrationTarget;
        transport_mode: "conformance" | "live";
        event_type: IntegrationDeliveryEventType;
        batch_id: string | null;
        package_id: string | null;
        validation_code: string;
        http_status: number | null;
        details: Record<string, unknown>;
        occurred_at: Date;
      }>(
        `
          select
            event_id,consumer_id,target,transport_mode,event_type,batch_id,
            package_id,validation_code,http_status,details,occurred_at
          from app.integration_delivery_events
          where workspace_id=$1
          order by occurred_at desc
          limit 25
        `,
        [workspace.id]
      );
      const moduleResult = await client.query<{ payload: Record<string, unknown> }>(
        `
          select payload
          from app.workspace_intelligence_modules
          where workspace_id=$1 and module_key='business-integrations'
          limit 1
        `,
        [workspace.id]
      );
      const batches = Array.isArray(moduleResult.rows[0]?.payload?.batches)
        ? moduleResult.rows[0].payload.batches
        : [];
      const eligibleBatches = batches.flatMap((raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
        const item = raw as Record<string, unknown>;
        if (
          (item.status !== "approved" && item.status !== "exported") ||
          typeof item.id !== "string" ||
          (item.target !== "rosie-dazzlers" && item.target !== "devil-n-dove")
        ) {
          return [];
        }
        return [{
          id: item.id,
          target: item.target as IntegrationTarget,
          status: item.status as "approved" | "exported",
          approvedAt:
            typeof item.approvedAt === "string" ? item.approvedAt : null
        }];
      });

      return {
        counts: Object.fromEntries(
          counts.rows.map((row) => [row.event_type, Number(row.count)])
        ),
        recent: recent.rows.map((row) => ({
          eventId: row.event_id,
          consumerId: row.consumer_id,
          target: row.target,
          transportMode: row.transport_mode,
          eventType: row.event_type,
          batchId: row.batch_id,
          packageId: row.package_id,
          validationCode: row.validation_code,
          httpStatus: row.http_status,
          details: row.details,
          occurredAt: row.occurred_at
        })),
        eligibleBatches
      };
    });

    overview.push({ workspace, ...data });
  }

  return overview;
}
