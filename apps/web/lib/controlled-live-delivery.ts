import { createHash, randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import type {
  IntegrationPackageV1,
  IntegrationTarget,
  LiveConsumerHandshake
} from "./integration-delivery";
import {
  listPublicationDeliveryBridgeForUser,
  type PublicationDeliveryBridgeModel
} from "./publication-delivery-bridge";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export const LIVE_ACTIVATION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const LIVE_DELIVERY_RETRY_LIMIT = 5;
export const LIVE_DELIVERY_RESERVATION_STALE_MS = 2 * 60 * 1000;

export interface ConsumerLiveActivation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  activationId: string;
  mappingId: string;
  publicationId: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumerId: string;
  publicationFingerprint: string;
  mappingFingerprint: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
  dryRunReceiptId: string;
  activationFingerprint: string;
  activatedBy: string;
  activatedAt: string;
  expiresAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  revocationNote: string;
  expired: boolean;
  canManage: boolean;
}

export interface ControlledLiveDelivery {
  workspaceId: string;
  workspaceName: string;
  deliveryId: string;
  activationId: string;
  mappingId: string;
  publicationId: string;
  target: IntegrationTarget;
  consumerId: string;
  publicationFingerprint: string;
  mappingFingerprint: string;
  activationFingerprint: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
  idempotencyKey: string;
  status: "reserved" | "accepted" | "rejected" | "transport-error";
  attemptCount: number;
  validationCode: string;
  httpStatus: number | null;
  consumerReceivedAt: string | null;
  acknowledgement: JsonRecord;
  createdBy: string;
  createdAt: string;
  lastAttemptAt: string;
  updatedAt: string;
}

export interface ControlledLiveDeliveryModel {
  bridge: PublicationDeliveryBridgeModel;
  activations: ConsumerLiveActivation[];
  deliveries: ControlledLiveDelivery[];
  totals: {
    activeActivations: number;
    expiringActivations: number;
    acceptedLiveDeliveries: number;
    retryableTransportErrors: number;
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonical(nested)])
    );
  }
  return value;
}

function hash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export function liveActivationConfirmation(target: IntegrationTarget) {
  return "ACTIVATE " + target.toUpperCase() + " LIVE";
}

export function liveDeliveryConfirmation(target: IntegrationTarget) {
  return "DELIVER " + target.toUpperCase() + " LIVE";
}

export function consumerLiveActivationFingerprint(input: {
  publicationFingerprint: string;
  mappingFingerprint: string;
  target: IntegrationTarget;
  consumerId: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
  dryRunReceiptId: string;
}) {
  return "live1-" + hash({
    ...input,
    idempotencyKeySource: "replayKey",
    duplicateBehavior: "return-original-ack"
  });
}

async function requireManager(
  client: import("pg").PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: WorkspaceRole }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id', true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("consumer_live_manager_required");
  }
  return role;
}

type ActivationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  activation_id: string;
  mapping_id: string;
  publication_id: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumer_id: string;
  publication_fingerprint: string;
  mapping_fingerprint: string;
  package_id: string;
  replay_key: string;
  package_fingerprint: string;
  dry_run_receipt_id: string;
  activation_fingerprint: string;
  activated_by: string;
  activated_at: Date;
  expires_at: Date;
  revoked_by: string | null;
  revoked_at: Date | null;
  revocation_note: string;
};

type DeliveryRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  delivery_id: string;
  activation_id: string;
  mapping_id: string;
  publication_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  publication_fingerprint: string;
  mapping_fingerprint: string;
  activation_fingerprint: string;
  package_id: string;
  replay_key: string;
  package_fingerprint: string;
  idempotency_key: string;
  status: "reserved" | "accepted" | "rejected" | "transport-error";
  attempt_count: string | number;
  validation_code: string;
  http_status: string | number | null;
  consumer_received_at: Date | null;
  acknowledgement: JsonRecord;
  created_by: string;
  created_at: Date;
  last_attempt_at: Date;
  updated_at: Date;
};

function activationFromRow(
  row: ActivationRow,
  role: WorkspaceRole
): ConsumerLiveActivation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    activationId: row.activation_id,
    mappingId: row.mapping_id,
    publicationId: row.publication_id,
    target: row.target,
    status: row.status,
    consumerId: row.consumer_id,
    publicationFingerprint: row.publication_fingerprint,
    mappingFingerprint: row.mapping_fingerprint,
    packageId: row.package_id,
    replayKey: row.replay_key,
    packageFingerprint: row.package_fingerprint,
    dryRunReceiptId: row.dry_run_receipt_id,
    activationFingerprint: row.activation_fingerprint,
    activatedBy: row.activated_by,
    activatedAt: row.activated_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    revokedBy: row.revoked_by,
    revokedAt: row.revoked_at?.toISOString() ?? null,
    revocationNote: row.revocation_note ?? "",
    expired: row.expires_at.getTime() <= Date.now(),
    canManage: role === "owner" || role === "admin"
  };
}

function deliveryFromRow(row: DeliveryRow): ControlledLiveDelivery {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    mappingId: row.mapping_id,
    publicationId: row.publication_id,
    target: row.target,
    consumerId: row.consumer_id,
    publicationFingerprint: row.publication_fingerprint,
    mappingFingerprint: row.mapping_fingerprint,
    activationFingerprint: row.activation_fingerprint,
    packageId: row.package_id,
    replayKey: row.replay_key,
    packageFingerprint: row.package_fingerprint,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    attemptCount: Number(row.attempt_count),
    validationCode: row.validation_code,
    httpStatus: row.http_status === null ? null : Number(row.http_status),
    consumerReceivedAt: row.consumer_received_at?.toISOString() ?? null,
    acknowledgement: row.acknowledgement ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    lastAttemptAt: row.last_attempt_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listControlledLiveDeliveryForUser(
  userId: string
): Promise<ControlledLiveDeliveryModel> {
  const bridge = await listPublicationDeliveryBridgeForUser(userId);
  const roles = new Map(
    bridge.workspaces.map((workspace) => [workspace.id, workspace.role])
  );

  const data = await withUserDatabase(userId, async (client) => {
    const activations = await client.query<ActivationRow>(
      `select a.*, w.name as workspace_name
       from app.workspace_consumer_live_activations a
       join app.workspaces w on w.id=a.workspace_id
       order by a.activated_at desc
       limit 200`
    );
    const deliveries = await client.query<DeliveryRow>(
      `select d.*, w.name as workspace_name
       from app.workspace_publication_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       order by d.created_at desc
       limit 250`
    );
    return {
      activations: activations.rows,
      deliveries: deliveries.rows
    };
  });

  const activations = data.activations.map((row) =>
    activationFromRow(
      row,
      (roles.get(row.workspace_id) ?? "member") as WorkspaceRole
    )
  );
  const deliveries = data.deliveries.map(deliveryFromRow);
  const now = Date.now();

  return {
    bridge,
    activations,
    deliveries,
    totals: {
      activeActivations: activations.filter(
        (activation) => activation.status === "active" && !activation.expired
      ).length,
      expiringActivations: activations.filter(
        (activation) =>
          activation.status === "active" &&
          !activation.expired &&
          new Date(activation.expiresAt).getTime() - now <= 60 * 60 * 1000
      ).length,
      acceptedLiveDeliveries: deliveries.filter(
        (delivery) => delivery.status === "accepted"
      ).length,
      retryableTransportErrors: deliveries.filter(
        (delivery) =>
          delivery.status === "transport-error" &&
          delivery.attemptCount < LIVE_DELIVERY_RETRY_LIMIT
      ).length
    }
  };
}

export async function createConsumerLiveActivation(
  userId: string,
  input: {
    workspaceId: string;
    mappingId: string;
    publicationId: string;
    target: IntegrationTarget;
    consumerId: string;
    publicationFingerprint: string;
    mappingFingerprint: string;
    package: IntegrationPackageV1;
    handshake: LiveConsumerHandshake;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const current = await client.query<{
      mapping_status: string;
      publication_status: string;
      mapping_fingerprint: string;
      publication_fingerprint: string;
      target: IntegrationTarget;
    }>(
      `select
        m.status as mapping_status,
        p.status as publication_status,
        m.mapping_fingerprint,
        p.publication_fingerprint,
        m.target
       from app.workspace_publication_delivery_mappings m
       join app.workspace_dataset_publications p
         on p.workspace_id=m.workspace_id and p.publication_id=m.publication_id
       where m.workspace_id=$1
         and m.mapping_id=$2
         and m.publication_id=$3
       limit 1`,
      [input.workspaceId, input.mappingId, input.publicationId]
    );
    const state = current.rows[0];
    if (!state) throw new Error("consumer_live_mapping_not_found");
    if (
      state.mapping_status !== "active" ||
      state.publication_status !== "published"
    ) {
      throw new Error("consumer_live_mapping_not_active");
    }
    if (
      state.target !== input.target ||
      state.mapping_fingerprint !== input.mappingFingerprint ||
      state.publication_fingerprint !== input.publicationFingerprint
    ) {
      throw new Error("consumer_live_mapping_identity_changed");
    }
    if (
      input.handshake.target !== input.target ||
      input.handshake.liveMutationEnabled !== true ||
      input.handshake.idempotency.keySource !== "replayKey" ||
      input.handshake.idempotency.duplicateBehavior !== "return-original-ack"
    ) {
      throw new Error("consumer_live_capability_invalid");
    }

    const dryRun = await client.query<{
      receipt_id: string;
      created_at: Date;
    }>(
      `select receipt_id,created_at
       from app.workspace_publication_delivery_receipts
       where workspace_id=$1
         and mapping_id=$2
         and publication_id=$3
         and target=$4
         and transport_mode='live'
         and consumer_id=$5
         and package_id=$6
         and package_fingerprint=$7
         and publication_fingerprint=$8
         and mapping_fingerprint=$9
         and receipt_status='accepted'
         and dry_run=true
         and created_at >= $10::timestamptz - interval '24 hours'
       order by created_at desc
       limit 1`,
      [
        input.workspaceId,
        input.mappingId,
        input.publicationId,
        input.target,
        input.consumerId,
        input.package.packageId,
        input.package.fingerprint,
        input.publicationFingerprint,
        input.mappingFingerprint,
        now.toISOString()
      ]
    );
    const receipt = dryRun.rows[0];
    if (!receipt) {
      throw new Error("consumer_live_recent_dry_run_required");
    }

    await client.query(
      `update app.workspace_consumer_live_activations
       set status='revoked',
           revoked_by=$3,
           revoked_at=$4::timestamptz,
           revocation_note='Expired before replacement activation.'
       where workspace_id=$1
         and mapping_id=$2
         and status='active'
         and expires_at <= $4::timestamptz`,
      [input.workspaceId, input.mappingId, userId, now.toISOString()]
    );

    const existing = await client.query<{
      activation_id: string;
      consumer_id: string;
      publication_fingerprint: string;
      mapping_fingerprint: string;
      package_id: string;
      package_fingerprint: string;
      replay_key: string;
      expires_at: Date;
    }>(
      `select
        activation_id,consumer_id,publication_fingerprint,mapping_fingerprint,
        package_id,package_fingerprint,replay_key,expires_at
       from app.workspace_consumer_live_activations
       where workspace_id=$1
         and mapping_id=$2
         and status='active'
         and expires_at > $3::timestamptz
       limit 1`,
      [input.workspaceId, input.mappingId, now.toISOString()]
    );
    const active = existing.rows[0];
    if (active) {
      if (
        active.consumer_id === input.consumerId &&
        active.publication_fingerprint === input.publicationFingerprint &&
        active.mapping_fingerprint === input.mappingFingerprint &&
        active.package_id === input.package.packageId &&
        active.package_fingerprint === input.package.fingerprint &&
        active.replay_key === input.package.replayKey
      ) {
        return active.activation_id;
      }
      throw new Error("consumer_live_activation_already_active");
    }

    const activationId = randomUUID();
    const activationFingerprint = consumerLiveActivationFingerprint({
      publicationFingerprint: input.publicationFingerprint,
      mappingFingerprint: input.mappingFingerprint,
      target: input.target,
      consumerId: input.consumerId,
      packageId: input.package.packageId,
      replayKey: input.package.replayKey,
      packageFingerprint: input.package.fingerprint,
      dryRunReceiptId: receipt.receipt_id
    });
    const expiresAt = new Date(now.getTime() + LIVE_ACTIVATION_WINDOW_MS);

    await client.query(
      `insert into app.workspace_consumer_live_activations (
        workspace_id,activation_id,mapping_id,publication_id,target,status,
        consumer_id,publication_fingerprint,mapping_fingerprint,
        package_id,replay_key,package_fingerprint,dry_run_receipt_id,
        idempotency_key_source,duplicate_behavior,activation_fingerprint,
        activated_by,activated_at,expires_at
      ) values (
        $1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,$11,$12,
        'replayKey','return-original-ack',$13,$14,$15::timestamptz,$16::timestamptz
      )`,
      [
        input.workspaceId,
        activationId,
        input.mappingId,
        input.publicationId,
        input.target,
        input.consumerId,
        input.publicationFingerprint,
        input.mappingFingerprint,
        input.package.packageId,
        input.package.replayKey,
        input.package.fingerprint,
        receipt.receipt_id,
        activationFingerprint,
        userId,
        now.toISOString(),
        expiresAt.toISOString()
      ]
    );
    return activationId;
  });
}

export async function revokeConsumerLiveActivation(
  userId: string,
  input: {
    workspaceId: string;
    activationId: string;
    note?: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_consumer_live_activations
       set status='revoked',
           revoked_by=$3,
           revoked_at=now(),
           revocation_note=$4
       where workspace_id=$1
         and activation_id=$2
         and status='active'`,
      [
        input.workspaceId,
        input.activationId,
        userId,
        (input.note ?? "").trim().slice(0, 4000)
      ]
    );
    if (!result.rowCount) throw new Error("consumer_live_activation_not_active");
  });
}

export async function getActiveConsumerLiveActivation(
  userId: string,
  input: {
    workspaceId: string;
    mappingId: string;
    consumerId: string;
    package: IntegrationPackageV1;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const result = await client.query<ActivationRow>(
      `select a.*, w.name as workspace_name
       from app.workspace_consumer_live_activations a
       join app.workspaces w on w.id=a.workspace_id
       where a.workspace_id=$1
         and a.mapping_id=$2
         and a.consumer_id=$3
         and a.package_id=$4
         and a.replay_key=$5
         and a.package_fingerprint=$6
         and a.status='active'
         and a.expires_at > now()
       limit 1`,
      [
        input.workspaceId,
        input.mappingId,
        input.consumerId,
        input.package.packageId,
        input.package.replayKey,
        input.package.fingerprint
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("consumer_live_activation_required");
    return activationFromRow(row, role);
  });
}

export async function reserveIdempotentLiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    activationId: string;
    mappingId: string;
    publicationId: string;
    target: IntegrationTarget;
    consumerId: string;
    publicationFingerprint: string;
    mappingFingerprint: string;
    activationFingerprint: string;
    package: IntegrationPackageV1;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const activation = await client.query<{ activation_id: string }>(
      `select activation_id
       from app.workspace_consumer_live_activations
       where workspace_id=$1
         and activation_id=$2
         and mapping_id=$3
         and publication_id=$4
         and target=$5
         and consumer_id=$6
         and publication_fingerprint=$7
         and mapping_fingerprint=$8
         and activation_fingerprint=$9
         and package_id=$10
         and replay_key=$11
         and package_fingerprint=$12
         and status='active'
         and expires_at > $13::timestamptz
       limit 1`,
      [
        input.workspaceId,
        input.activationId,
        input.mappingId,
        input.publicationId,
        input.target,
        input.consumerId,
        input.publicationFingerprint,
        input.mappingFingerprint,
        input.activationFingerprint,
        input.package.packageId,
        input.package.replayKey,
        input.package.fingerprint,
        now.toISOString()
      ]
    );
    if (!activation.rows[0]) throw new Error("consumer_live_activation_required");

    const existing = await client.query<DeliveryRow>(
      `select d.*, w.name as workspace_name
       from app.workspace_publication_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       where d.workspace_id=$1
         and d.consumer_id=$2
         and d.package_id=$3
       for update`,
      [input.workspaceId, input.consumerId, input.package.packageId]
    );
    const row = existing.rows[0];

    if (row) {
      if (
        row.activation_id !== input.activationId ||
        row.mapping_id !== input.mappingId ||
        row.publication_id !== input.publicationId ||
        row.replay_key !== input.package.replayKey ||
        row.package_fingerprint !== input.package.fingerprint
      ) {
        throw new Error("consumer_live_delivery_identity_conflict");
      }
      if (row.status === "accepted") {
        return {
          shouldSend: false,
          reason: "accepted" as const,
          delivery: deliveryFromRow(row)
        };
      }
      if (row.status === "rejected") {
        return {
          shouldSend: false,
          reason: "rejected" as const,
          delivery: deliveryFromRow(row)
        };
      }
      if (
        row.status === "reserved" &&
        now.getTime() - row.last_attempt_at.getTime() <
          LIVE_DELIVERY_RESERVATION_STALE_MS
      ) {
        throw new Error("consumer_live_delivery_in_progress");
      }
      if (Number(row.attempt_count) >= LIVE_DELIVERY_RETRY_LIMIT) {
        throw new Error("consumer_live_delivery_retry_limit");
      }

      const retried = await client.query<DeliveryRow>(
        `update app.workspace_publication_live_deliveries
         set status='reserved',
             attempt_count=attempt_count+1,
             validation_code='retry-reserved',
             http_status=null,
             consumer_received_at=null,
             acknowledgement='{}'::jsonb,
             last_attempt_at=$4::timestamptz,
             updated_at=$4::timestamptz
         where workspace_id=$1
           and delivery_id=$2
           and activation_id=$3
         returning *,
           (select name from app.workspaces w where w.id=workspace_id) as workspace_name`,
        [
          input.workspaceId,
          row.delivery_id,
          input.activationId,
          now.toISOString()
        ]
      );
      return {
        shouldSend: true,
        reason: "retry" as const,
        delivery: deliveryFromRow(retried.rows[0])
      };
    }

    const deliveryId = randomUUID();
    const inserted = await client.query<DeliveryRow>(
      `insert into app.workspace_publication_live_deliveries (
        workspace_id,delivery_id,activation_id,mapping_id,publication_id,target,
        consumer_id,publication_fingerprint,mapping_fingerprint,activation_fingerprint,
        package_id,replay_key,package_fingerprint,idempotency_key,status,
        attempt_count,validation_code,created_by,created_at,last_attempt_at,updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$12,'reserved',
        1,'reserved',$14,$15::timestamptz,$15::timestamptz,$15::timestamptz
      )
      returning *,
        (select name from app.workspaces w where w.id=workspace_id) as workspace_name`,
      [
        input.workspaceId,
        deliveryId,
        input.activationId,
        input.mappingId,
        input.publicationId,
        input.target,
        input.consumerId,
        input.publicationFingerprint,
        input.mappingFingerprint,
        input.activationFingerprint,
        input.package.packageId,
        input.package.replayKey,
        input.package.fingerprint,
        userId,
        now.toISOString()
      ]
    );
    return {
      shouldSend: true,
      reason: "first-attempt" as const,
      delivery: deliveryFromRow(inserted.rows[0])
    };
  });
}

export async function finalizeIdempotentLiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    deliveryId: string;
    status: "accepted" | "rejected" | "transport-error";
    validationCode: string;
    httpStatus?: number | null;
    consumerReceivedAt?: string | null;
    acknowledgement?: JsonRecord;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query<DeliveryRow>(
      `update app.workspace_publication_live_deliveries
       set status=$3,
           validation_code=$4,
           http_status=$5,
           consumer_received_at=$6::timestamptz,
           acknowledgement=$7::jsonb,
           updated_at=$8::timestamptz
       where workspace_id=$1
         and delivery_id=$2
         and status='reserved'
       returning *,
         (select name from app.workspaces w where w.id=workspace_id) as workspace_name`,
      [
        input.workspaceId,
        input.deliveryId,
        input.status,
        input.validationCode.slice(0, 96),
        input.httpStatus ?? null,
        input.consumerReceivedAt ?? null,
        JSON.stringify(input.acknowledgement ?? {}),
        now.toISOString()
      ]
    );
    if (!result.rows[0]) {
      const existing = await client.query<DeliveryRow>(
        `select d.*, w.name as workspace_name
         from app.workspace_publication_live_deliveries d
         join app.workspaces w on w.id=d.workspace_id
         where d.workspace_id=$1 and d.delivery_id=$2
         limit 1`,
        [input.workspaceId, input.deliveryId]
      );
      if (!existing.rows[0]) throw new Error("consumer_live_delivery_not_found");
      return deliveryFromRow(existing.rows[0]);
    }
    return deliveryFromRow(result.rows[0]);
  });
}
