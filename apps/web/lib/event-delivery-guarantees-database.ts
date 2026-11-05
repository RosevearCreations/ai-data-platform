import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  deliveryAttemptOrdinal,
  deliveryAttemptReservationKey,
  deliveryIntentIdempotencyKey,
  type DeliveryGuaranteeSourceKind
} from "./event-delivery-guarantees-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";

export interface DeliveryIntentRecord {
  intentId: string;
  workspaceId: string;
  publicationId: string;
  subscriptionId: string;
  destinationApplicationId: string;
  idempotencyKeySha256: string;
  state: "held";
  holdReason: "delivery-not-authorized";
  createdAt: Date;
}

export interface DeliveryAttemptReservationRecord {
  reservationId: string;
  workspaceId: string;
  intentId: string;
  sourceKind: DeliveryGuaranteeSourceKind;
  routeId: string | null;
  replayRouteId: string | null;
  attemptOrdinal: number;
  idempotencyKeySha256: string;
  attemptKeySha256: string;
  state: "held";
  holdReason:
    | "delivery-not-authorized"
    | "recovery-replay-not-authorized";
  reservedAt: Date;
}

function intentRow(row: Record<string, unknown>): DeliveryIntentRecord {
  return {
    intentId: String(row.intent_id),
    workspaceId: String(row.workspace_id),
    publicationId: String(row.publication_id),
    subscriptionId: String(row.subscription_id),
    destinationApplicationId: String(row.destination_application_id),
    idempotencyKeySha256: String(row.idempotency_key_sha256),
    state: "held",
    holdReason: "delivery-not-authorized",
    createdAt: new Date(String(row.created_at))
  };
}

function reservationRow(
  row: Record<string, unknown>
): DeliveryAttemptReservationRecord {
  return {
    reservationId: String(row.reservation_id),
    workspaceId: String(row.workspace_id),
    intentId: String(row.intent_id),
    sourceKind:
      row.source_kind === "replay" ? "replay" : "original",
    routeId:
      row.route_id === null || row.route_id === undefined
        ? null
        : String(row.route_id),
    replayRouteId:
      row.replay_route_id === null ||
      row.replay_route_id === undefined
        ? null
        : String(row.replay_route_id),
    attemptOrdinal: Number(row.attempt_ordinal),
    idempotencyKeySha256: String(row.idempotency_key_sha256),
    attemptKeySha256: String(row.attempt_key_sha256),
    state: "held",
    holdReason:
      row.hold_reason === "recovery-replay-not-authorized"
        ? "recovery-replay-not-authorized"
        : "delivery-not-authorized",
    reservedAt: new Date(String(row.reserved_at))
  };
}

async function requireWorkspaceAdmin(
  client: PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("workspace_admin_required");
  }
}

async function appendGuaranteeAudit(
  client: PoolClient,
  input: {
    workspaceId: string;
    userId: string;
    action:
      | "intent-created"
      | "intent-reused"
      | "attempt-reserved"
      | "duplicate-suppressed"
      | "legacy-route-reconciled";
    intentId?: string | null;
    reservationId?: string | null;
    duplicateDecisionId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.event_bus_delivery_guarantee_audit (
      audit_id,workspace_id,actor_user_id,action,
      intent_id,reservation_id,duplicate_decision_id,details
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      randomUUID(),
      input.workspaceId,
      input.userId,
      input.action,
      input.intentId ?? null,
      input.reservationId ?? null,
      input.duplicateDecisionId ?? null,
      JSON.stringify(input.details ?? {})
    ]
  );
}

export async function ensureDeliveryGuaranteeForSource(
  client: PoolClient,
  userId: string,
  input: {
    workspaceId: string;
    publicationId: string;
    subscriptionId: string;
    destinationApplicationId: string;
    sourceKind: DeliveryGuaranteeSourceKind;
    routeId?: string | null;
    replayRouteId?: string | null;
    replayNumber?: number;
    reconcile?: boolean;
  }
) {
  const sourceReferenceId =
    input.sourceKind === "original"
      ? input.routeId
      : input.replayRouteId;
  if (!sourceReferenceId) {
    throw new Error("event_bus_delivery_source_reference_required");
  }

  const idempotencyKeySha256 = deliveryIntentIdempotencyKey({
    workspaceId: input.workspaceId,
    publicationId: input.publicationId,
    subscriptionId: input.subscriptionId,
    destinationApplicationId: input.destinationApplicationId
  });

  const insertedIntent = await client.query(
    `insert into app.event_bus_delivery_intents (
      intent_id,workspace_id,publication_id,subscription_id,
      destination_application_id,idempotency_key_sha256,
      state,hold_reason,created_by
    ) values (
      $1,$2,$3,$4,$5,$6,'held','delivery-not-authorized',$7
    )
    on conflict (
      workspace_id,publication_id,subscription_id,
      destination_application_id
    ) do nothing
    returning *`,
    [
      randomUUID(),
      input.workspaceId,
      input.publicationId,
      input.subscriptionId,
      input.destinationApplicationId,
      idempotencyKeySha256,
      userId
    ]
  );

  let intent = insertedIntent.rows[0]
    ? intentRow(insertedIntent.rows[0])
    : null;

  if (!intent) {
    const existingIntent = await client.query(
      `select *
       from app.event_bus_delivery_intents
       where workspace_id=$1
         and publication_id=$2
         and subscription_id=$3
         and destination_application_id=$4
       limit 1`,
      [
        input.workspaceId,
        input.publicationId,
        input.subscriptionId,
        input.destinationApplicationId
      ]
    );
    if (!existingIntent.rows[0]) {
      throw new Error("event_bus_delivery_intent_conflict");
    }
    intent = intentRow(existingIntent.rows[0]);
    if (intent.idempotencyKeySha256 !== idempotencyKeySha256) {
      throw new Error("event_bus_idempotency_conflict");
    }
  }

  await appendGuaranteeAudit(client, {
    workspaceId: input.workspaceId,
    userId,
    action: insertedIntent.rows[0] ? "intent-created" : "intent-reused",
    intentId: intent.intentId,
    details: {
      sourceKind: input.sourceKind,
      idempotencyKeySha256,
      exactlyOnceInternalIntent: true,
      exactlyOnceExternalSideEffect: false,
      outboundNetworkDelivery: false
    }
  });

  const attemptOrdinal = deliveryAttemptOrdinal(
    input.sourceKind,
    input.replayNumber
  );
  const attemptKeySha256 = deliveryAttemptReservationKey({
    idempotencyKeySha256,
    sourceKind: input.sourceKind,
    sourceReferenceId
  });
  const holdReason =
    input.sourceKind === "replay"
      ? "recovery-replay-not-authorized"
      : "delivery-not-authorized";

  const insertedReservation = await client.query(
    `insert into app.event_bus_delivery_attempt_reservations (
      reservation_id,workspace_id,intent_id,source_kind,
      route_id,replay_route_id,attempt_ordinal,
      idempotency_key_sha256,attempt_key_sha256,
      state,hold_reason,reserved_by
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,'held',$10,$11
    )
    on conflict (attempt_key_sha256) do nothing
    returning *`,
    [
      randomUUID(),
      input.workspaceId,
      intent.intentId,
      input.sourceKind,
      input.sourceKind === "original" ? input.routeId : null,
      input.sourceKind === "replay" ? input.replayRouteId : null,
      attemptOrdinal,
      idempotencyKeySha256,
      attemptKeySha256,
      holdReason,
      userId
    ]
  );

  let reservation = insertedReservation.rows[0]
    ? reservationRow(insertedReservation.rows[0])
    : null;

  if (!reservation) {
    const existingReservation = await client.query(
      `select *
       from app.event_bus_delivery_attempt_reservations
       where attempt_key_sha256=$1
       limit 1`,
      [attemptKeySha256]
    );
    if (!existingReservation.rows[0]) {
      throw new Error("event_bus_attempt_reservation_conflict");
    }
    reservation = reservationRow(existingReservation.rows[0]);

    const decisionId = randomUUID();
    const decision = await client.query(
      `insert into app.event_bus_duplicate_decisions (
        decision_id,workspace_id,intent_id,source_kind,
        duplicate_scope,duplicate_key_sha256,reason,observed_by
      ) values (
        $1,$2,$3,$4,'attempt-reservation',$5,
        'existing-attempt-reservation',$6
      )
      on conflict (
        duplicate_scope,duplicate_key_sha256,reason
      ) do nothing
      returning decision_id`,
      [
        decisionId,
        input.workspaceId,
        intent.intentId,
        input.sourceKind,
        attemptKeySha256,
        userId
      ]
    );
    const recordedDecisionId = decision.rows[0]
      ? String(decision.rows[0].decision_id)
      : null;

    if (recordedDecisionId) {
      await appendGuaranteeAudit(client, {
        workspaceId: input.workspaceId,
        userId,
        action: "duplicate-suppressed",
        intentId: intent.intentId,
        reservationId: reservation.reservationId,
        duplicateDecisionId: recordedDecisionId,
        details: {
          duplicateScope: "attempt-reservation",
          attemptKeySha256,
          sourceKind: input.sourceKind,
          outboundNetworkDelivery: false
        }
      });
    }
  } else {
    await appendGuaranteeAudit(client, {
      workspaceId: input.workspaceId,
      userId,
      action: "attempt-reserved",
      intentId: intent.intentId,
      reservationId: reservation.reservationId,
      details: {
        sourceKind: input.sourceKind,
        attemptOrdinal,
        attemptKeySha256,
        state: "held",
        holdReason,
        outboundNetworkDelivery: false
      }
    });
  }

  if (input.reconcile) {
    await appendGuaranteeAudit(client, {
      workspaceId: input.workspaceId,
      userId,
      action: "legacy-route-reconciled",
      intentId: intent.intentId,
      reservationId: reservation.reservationId,
      details: {
        sourceKind: input.sourceKind,
        sourceReferenceId
      }
    });
  }

  return {
    intent,
    reservation,
    intentCreated: Boolean(insertedIntent.rows[0]),
    reservationCreated: Boolean(insertedReservation.rows[0]),
    duplicateSuppressed: !insertedReservation.rows[0],
    exactlyOnceInternalIntent: true,
    exactlyOnceExternalSideEffect: false,
    outboundNetworkDelivery: false
  };
}

export async function listDeliveryGuaranteesForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const state = await withUserDatabase(userId, async (client) => {
    const [intents, reservations, duplicates] = await Promise.all([
      client.query(
        `select *
         from app.event_bus_delivery_intents
         order by created_at desc
         limit 300`
      ),
      client.query(
        `select *
         from app.event_bus_delivery_attempt_reservations
         order by reserved_at desc
         limit 500`
      ),
      client.query(
        `select
           decision_id,workspace_id,intent_id,source_kind,
           duplicate_scope,duplicate_key_sha256,reason,observed_at
         from app.event_bus_duplicate_decisions
         order by observed_at desc
         limit 300`
      )
    ]);

    return {
      intents: intents.rows.map(intentRow),
      reservations: reservations.rows.map(reservationRow),
      duplicateDecisions: duplicates.rows.map((row) => ({
        decisionId: String(row.decision_id),
        workspaceId: String(row.workspace_id),
        intentId: String(row.intent_id),
        sourceKind:
          (row.source_kind === "replay" ? "replay" : "original") as
            | "original"
            | "replay",
        duplicateScope: "attempt-reservation" as const,
        duplicateKeySha256: String(row.duplicate_key_sha256),
        reason: "existing-attempt-reservation" as const,
        observedAt: new Date(String(row.observed_at))
      }))
    };
  });

  return {
    workspaces,
    ...state,
    summary: {
      intents: state.intents.length,
      attemptReservations: state.reservations.length,
      duplicateSuppressions: state.duplicateDecisions.length,
      heldReservations: state.reservations.filter(
        (item) => item.state === "held"
      ).length
    },
    policy: {
      deterministicIdempotencyKey: true,
      exactlyOnceInternalIntent: true,
      atMostOnceReservationPerSourceRoute: true,
      duplicateAttemptSuppression: true,
      immutableEvidence: true,
      outboundNetworkDelivery: false,
      exactlyOnceExternalSideEffect: false,
      automaticRouteRelease: false,
      automaticConnectionActivation: false,
      ql266Resumed: false
    }
  };
}

export async function reconcileDeliveryGuaranteesForUser(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, workspaceId);

    const originals = await client.query(
      `select
         r.route_id,r.workspace_id,r.publication_id,r.subscription_id,
         r.destination_application_id
       from app.event_bus_routes r
       where r.workspace_id=$1
         and r.state='held'
       order by r.created_at,r.route_id
       limit 500`,
      [workspaceId]
    );

    const replays = await client.query(
      `select
         rr.replay_route_id,rr.workspace_id,rr.publication_id,
         rr.subscription_id,rr.destination_application_id,
         rq.replay_number
       from app.event_bus_replay_routes rr
       inner join app.event_bus_replay_requests rq
         on rq.replay_request_id=rr.replay_request_id
       where rr.workspace_id=$1
         and rr.state='held'
       order by rr.created_at,rr.replay_route_id
       limit 500`,
      [workspaceId]
    );

    let intentsCreated = 0;
    let reservationsCreated = 0;
    let duplicatesSuppressed = 0;

    for (const row of originals.rows) {
      const result = await ensureDeliveryGuaranteeForSource(
        client,
        userId,
        {
          workspaceId: String(row.workspace_id),
          publicationId: String(row.publication_id),
          subscriptionId: String(row.subscription_id),
          destinationApplicationId: String(
            row.destination_application_id
          ),
          sourceKind: "original",
          routeId: String(row.route_id),
          reconcile: true
        }
      );
      intentsCreated += result.intentCreated ? 1 : 0;
      reservationsCreated += result.reservationCreated ? 1 : 0;
      duplicatesSuppressed += result.duplicateSuppressed ? 1 : 0;
    }

    for (const row of replays.rows) {
      const result = await ensureDeliveryGuaranteeForSource(
        client,
        userId,
        {
          workspaceId: String(row.workspace_id),
          publicationId: String(row.publication_id),
          subscriptionId: String(row.subscription_id),
          destinationApplicationId: String(
            row.destination_application_id
          ),
          sourceKind: "replay",
          replayRouteId: String(row.replay_route_id),
          replayNumber: Number(row.replay_number),
          reconcile: true
        }
      );
      intentsCreated += result.intentCreated ? 1 : 0;
      reservationsCreated += result.reservationCreated ? 1 : 0;
      duplicatesSuppressed += result.duplicateSuppressed ? 1 : 0;
    }

    return {
      workspaceId,
      originalRoutesReviewed: originals.rowCount ?? 0,
      replayRoutesReviewed: replays.rowCount ?? 0,
      intentsCreated,
      reservationsCreated,
      duplicatesSuppressed,
      outboundNetworkDelivery: false,
      exactlyOnceExternalSideEffect: false
    };
  });
}
