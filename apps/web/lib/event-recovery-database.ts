import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  eventBusFailureReplayable,
  nextReplayNumber,
  safeEventBusFailureCode,
  safeRecoveryReason,
  type EventBusFailureCategory
} from "./event-recovery-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";

export interface RecoveryRouteCandidate {
  routeId: string;
  workspaceId: string;
  publicationId: string;
  subscriptionId: string;
  subscriptionName: string;
  destinationApplicationId: string;
  eventType: string;
  eventId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  nextAttemptNumber: number;
  createdAt: Date;
}

export interface DeadLetterRecord {
  deadLetterId: string;
  workspaceId: string;
  failureId: string;
  routeId: string;
  publicationId: string;
  subscriptionId: string;
  subscriptionName: string;
  destinationApplicationId: string;
  eventType: string;
  eventId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  failureCategory: EventBusFailureCategory;
  failureCode: string;
  failureSummary: string;
  attemptNumber: number;
  replayable: boolean;
  replayCount: number;
  dismissed: boolean;
  enteredAt: Date;
}

export interface ReplayRouteRecord {
  replayRouteId: string;
  workspaceId: string;
  replayRequestId: string;
  deadLetterId: string;
  originalRouteId: string;
  publicationId: string;
  subscriptionId: string;
  destinationApplicationId: string;
  deliveryMode: "internal-queue";
  state: "held";
  holdReason: "recovery-replay-not-authorized";
  replayNumber: number;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
  createdAt: Date;
}

function numeric(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function nullableString(value: unknown) {
  return value === null || value === undefined
    ? null
    : String(value);
}

function routeCandidateRow(
  row: Record<string, unknown>
): RecoveryRouteCandidate {
  return {
    routeId: String(row.route_id),
    workspaceId: String(row.workspace_id),
    publicationId: String(row.publication_id),
    subscriptionId: String(row.subscription_id),
    subscriptionName: String(row.subscription_name),
    destinationApplicationId: String(
      row.destination_application_id
    ),
    eventType: String(row.event_type),
    eventId: String(row.event_id),
    sourceApplicationId: String(row.source_application_id),
    environment:
      row.environment === "production"
        ? "production"
        : "nonproduction",
    tenantId: nullableString(row.tenant_id),
    nextAttemptNumber: numeric(row.next_attempt_number),
    createdAt: new Date(String(row.created_at))
  };
}

function deadLetterRow(
  row: Record<string, unknown>
): DeadLetterRecord {
  const category = String(
    row.failure_category
  ) as EventBusFailureCategory;
  return {
    deadLetterId: String(row.dead_letter_id),
    workspaceId: String(row.workspace_id),
    failureId: String(row.failure_id),
    routeId: String(row.route_id),
    publicationId: String(row.publication_id),
    subscriptionId: String(row.subscription_id),
    subscriptionName: String(row.subscription_name),
    destinationApplicationId: String(
      row.destination_application_id
    ),
    eventType: String(row.event_type),
    eventId: String(row.event_id),
    sourceApplicationId: String(row.source_application_id),
    environment:
      row.environment === "production"
        ? "production"
        : "nonproduction",
    tenantId: nullableString(row.tenant_id),
    failureCategory: category,
    failureCode: String(row.failure_code),
    failureSummary: String(row.failure_summary),
    attemptNumber: numeric(row.attempt_number),
    replayable: eventBusFailureReplayable(category),
    replayCount: numeric(row.replay_count),
    dismissed: Boolean(row.dismissed),
    enteredAt: new Date(String(row.entered_at))
  };
}

function replayRouteRow(
  row: Record<string, unknown>
): ReplayRouteRecord {
  return {
    replayRouteId: String(row.replay_route_id),
    workspaceId: String(row.workspace_id),
    replayRequestId: String(row.replay_request_id),
    deadLetterId: String(row.dead_letter_id),
    originalRouteId: String(row.original_route_id),
    publicationId: String(row.publication_id),
    subscriptionId: String(row.subscription_id),
    destinationApplicationId: String(
      row.destination_application_id
    ),
    deliveryMode: "internal-queue",
    state: "held",
    holdReason: "recovery-replay-not-authorized",
    replayNumber: numeric(row.replay_number),
    reason: String(row.reason),
    requestedBy: String(row.requested_by),
    requestedAt: new Date(String(row.requested_at)),
    createdAt: new Date(String(row.created_at))
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

function normalizeFailureCategory(
  value: unknown
): EventBusFailureCategory {
  if (
    value === "transient" ||
    value === "permanent" ||
    value === "policy" ||
    value === "unknown"
  ) {
    return value;
  }
  throw new Error("event_bus_failure_category_invalid");
}

function normalizeFailureCode(value: unknown) {
  const code =
    typeof value === "string" ? value.trim() : "";
  if (!safeEventBusFailureCode(code)) {
    throw new Error("event_bus_failure_code_invalid");
  }
  return code;
}

function normalizeFailureSummary(value: unknown) {
  const summary =
    typeof value === "string" ? value.trim() : "";
  if (
    summary.length < 3 ||
    summary.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(summary)
  ) {
    throw new Error("event_bus_failure_summary_invalid");
  }
  return summary;
}

function normalizeDetails(value: unknown) {
  if (
    value === undefined ||
    value === null
  ) {
    return {};
  }
  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("event_bus_failure_details_invalid");
  }
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded, "utf8") > 16_384) {
    throw new Error("event_bus_failure_details_too_large");
  }
  return value as Record<string, unknown>;
}

function normalizeAttemptNumber(value: unknown) {
  const number = Number(value);
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 1000
  ) {
    throw new Error("event_bus_attempt_number_invalid");
  }
  return number;
}

function normalizeReason(value: unknown) {
  const reason =
    typeof value === "string" ? value.trim() : "";
  if (!safeRecoveryReason(reason)) {
    throw new Error("event_bus_recovery_reason_invalid");
  }
  return reason;
}

async function appendRecoveryAudit(
  client: PoolClient,
  input: {
    workspaceId: string;
    userId: string;
    action:
      | "failure-recorded"
      | "dead-letter-created"
      | "replay-requested"
      | "replay-route-created"
      | "dead-letter-dismissed"
      | "recovery-note";
    routeId?: string | null;
    failureId?: string | null;
    deadLetterId?: string | null;
    replayRequestId?: string | null;
    replayRouteId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.event_bus_recovery_audit (
      audit_id,workspace_id,actor_user_id,action,route_id,
      failure_id,dead_letter_id,replay_request_id,replay_route_id,details
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      randomUUID(),
      input.workspaceId,
      input.userId,
      input.action,
      input.routeId ?? null,
      input.failureId ?? null,
      input.deadLetterId ?? null,
      input.replayRequestId ?? null,
      input.replayRouteId ?? null,
      JSON.stringify(input.details ?? {})
    ]
  );
}

export async function listEventRecoveryForUser(
  userId: string
) {
  const workspaces = await listWorkspacesForUser(userId);

  const state = await withUserDatabase(
    userId,
    async (client) => {
      const [routeCandidates, deadLetters, replayRoutes] =
        await Promise.all([
          client.query(
            `select
               r.route_id,
               r.workspace_id,
               r.publication_id,
               r.subscription_id,
               s.name as subscription_name,
               r.destination_application_id,
               p.event_type,
               p.event_id,
               p.source_application_id,
               p.environment,
               p.tenant_id,
               r.created_at,
               coalesce((
                 select max(f.attempt_number)
                 from app.event_bus_delivery_failures f
                 where f.route_id=r.route_id
               ),0)+1 as next_attempt_number
             from app.event_bus_routes r
             inner join app.event_bus_publications p
               on p.publication_id=r.publication_id
             inner join app.event_bus_subscriptions s
               on s.subscription_id=r.subscription_id
             where not exists (
               select 1
               from app.event_bus_dead_letters dl
               where dl.route_id=r.route_id
                 and not exists (
                   select 1
                   from app.event_bus_recovery_audit ra
                   where ra.dead_letter_id=dl.dead_letter_id
                     and ra.action='dead-letter-dismissed'
                 )
             )
             order by r.created_at desc
             limit 150`
          ),
          client.query(
            `select
               dl.dead_letter_id,
               dl.workspace_id,
               dl.failure_id,
               dl.route_id,
               dl.publication_id,
               dl.subscription_id,
               s.name as subscription_name,
               r.destination_application_id,
               p.event_type,
               p.event_id,
               p.source_application_id,
               p.environment,
               p.tenant_id,
               f.failure_category,
               f.failure_code,
               f.failure_summary,
               f.attempt_number,
               dl.entered_at,
               (
                 select count(*)::int
                 from app.event_bus_replay_requests rr
                 where rr.dead_letter_id=dl.dead_letter_id
               ) as replay_count,
               exists (
                 select 1
                 from app.event_bus_recovery_audit ra
                 where ra.dead_letter_id=dl.dead_letter_id
                   and ra.action='dead-letter-dismissed'
               ) as dismissed
             from app.event_bus_dead_letters dl
             inner join app.event_bus_delivery_failures f
               on f.failure_id=dl.failure_id
             inner join app.event_bus_routes r
               on r.route_id=dl.route_id
             inner join app.event_bus_publications p
               on p.publication_id=dl.publication_id
             inner join app.event_bus_subscriptions s
               on s.subscription_id=dl.subscription_id
             order by dl.entered_at desc
             limit 250`
          ),
          client.query(
            `select
               rr.replay_route_id,
               rr.workspace_id,
               rr.replay_request_id,
               rr.dead_letter_id,
               rr.original_route_id,
               rr.publication_id,
               rr.subscription_id,
               rr.destination_application_id,
               rr.delivery_mode,
               rr.state,
               rr.hold_reason,
               rq.replay_number,
               rq.reason,
               rq.requested_by,
               rq.requested_at,
               rr.created_at
             from app.event_bus_replay_routes rr
             inner join app.event_bus_replay_requests rq
               on rq.replay_request_id=rr.replay_request_id
             order by rr.created_at desc
             limit 250`
          )
        ]);

      return {
        routeCandidates:
          routeCandidates.rows.map(routeCandidateRow),
        deadLetters: deadLetters.rows.map(deadLetterRow),
        replayRoutes:
          replayRoutes.rows.map(replayRouteRow)
      };
    }
  );

  const activeDeadLetters = state.deadLetters.filter(
    (item) => !item.dismissed
  );
  return {
    workspaces,
    ...state,
    summary: {
      recoverableRoutes: state.routeCandidates.length,
      deadLetters: state.deadLetters.length,
      openDeadLetters: activeDeadLetters.length,
      replayableDeadLetters: activeDeadLetters.filter(
        (item) =>
          item.replayable &&
          item.replayCount < 5
      ).length,
      replayRoutes: state.replayRoutes.length,
      heldReplayRoutes: state.replayRoutes.filter(
        (item) => item.state === "held"
      ).length
    },
    policy: {
      appendOnlyFailureEvidence: true,
      reviewedReplayOnly: true,
      replayLimitPerDeadLetter: 5,
      replayableCategories: ["transient", "unknown"],
      permanentAndPolicyRequireDisposition: true,
      replayRoutesHeld: true,
      outboundNetworkDelivery: false,
      automaticRetry: false,
      automaticConnectionActivation: false,
      ql266Resumed: false
    }
  };
}

export async function recordEventBusFailure(
  userId: string,
  input: {
    routeId: string;
    category: EventBusFailureCategory | string;
    code: string;
    summary: string;
    details?: Record<string, unknown>;
    attemptNumber: number;
  }
) {
  const category = normalizeFailureCategory(input.category);
  const code = normalizeFailureCode(input.code);
  const summary = normalizeFailureSummary(input.summary);
  const details = normalizeDetails(input.details);
  const attemptNumber = normalizeAttemptNumber(
    input.attemptNumber
  );

  return withUserDatabase(userId, async (client) => {
    const routeResult = await client.query(
      `select
         r.route_id,r.workspace_id,r.publication_id,r.subscription_id,
         r.destination_application_id,r.state,r.hold_reason,
         p.event_id,p.event_type
       from app.event_bus_routes r
       inner join app.event_bus_publications p
         on p.publication_id=r.publication_id
       where r.route_id=$1
       limit 1
       for share of r`,
      [input.routeId]
    );
    const route = routeResult.rows[0];
    if (!route) {
      throw new Error("event_bus_route_not_found");
    }
    await requireWorkspaceAdmin(
      client,
      String(route.workspace_id)
    );

    const activeDeadLetter = await client.query(
      `select dl.dead_letter_id
       from app.event_bus_dead_letters dl
       where dl.route_id=$1
         and not exists (
           select 1
           from app.event_bus_recovery_audit ra
           where ra.dead_letter_id=dl.dead_letter_id
             and ra.action='dead-letter-dismissed'
         )
       limit 1`,
      [input.routeId]
    );
    if (activeDeadLetter.rows[0]) {
      throw new Error("event_bus_dead_letter_already_open");
    }

    const failureId = randomUUID();
    const deadLetterId = randomUUID();

    await client.query(
      `insert into app.event_bus_delivery_failures (
        failure_id,workspace_id,route_id,publication_id,subscription_id,
        failure_category,failure_code,failure_summary,failure_details,
        attempt_number,recorded_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
      [
        failureId,
        route.workspace_id,
        route.route_id,
        route.publication_id,
        route.subscription_id,
        category,
        code,
        summary,
        JSON.stringify(details),
        attemptNumber,
        userId
      ]
    );

    await appendRecoveryAudit(client, {
      workspaceId: String(route.workspace_id),
      userId,
      action: "failure-recorded",
      routeId: String(route.route_id),
      failureId,
      details: {
        category,
        code,
        attemptNumber,
        outboundNetworkDelivery: false
      }
    });

    await client.query(
      `insert into app.event_bus_dead_letters (
        dead_letter_id,workspace_id,failure_id,route_id,
        publication_id,subscription_id,entered_by
      ) values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        deadLetterId,
        route.workspace_id,
        failureId,
        route.route_id,
        route.publication_id,
        route.subscription_id,
        userId
      ]
    );

    await appendRecoveryAudit(client, {
      workspaceId: String(route.workspace_id),
      userId,
      action: "dead-letter-created",
      routeId: String(route.route_id),
      failureId,
      deadLetterId,
      details: {
        eventId: String(route.event_id),
        eventType: String(route.event_type),
        replayable:
          eventBusFailureReplayable(category)
      }
    });

    return {
      failureId,
      deadLetterId,
      replayable:
        eventBusFailureReplayable(category)
    };
  });
}

export async function requestEventBusReplay(
  userId: string,
  input: {
    deadLetterId: string;
    reason: string;
  }
) {
  const reason = normalizeReason(input.reason);

  return withUserDatabase(userId, async (client) => {
    const result = await client.query(
      `select
         dl.dead_letter_id,
         dl.workspace_id,
         dl.failure_id,
         dl.route_id,
         dl.publication_id,
         dl.subscription_id,
         f.failure_category,
         r.destination_application_id,
         s.state as subscription_state,
         exists (
           select 1
           from app.event_bus_recovery_audit ra
           where ra.dead_letter_id=dl.dead_letter_id
             and ra.action='dead-letter-dismissed'
         ) as dismissed,
         (
           select count(*)::int
           from app.event_bus_replay_requests rq
           where rq.dead_letter_id=dl.dead_letter_id
         ) as replay_count
       from app.event_bus_dead_letters dl
       inner join app.event_bus_delivery_failures f
         on f.failure_id=dl.failure_id
       inner join app.event_bus_routes r
         on r.route_id=dl.route_id
       inner join app.event_bus_subscriptions s
         on s.subscription_id=dl.subscription_id
       where dl.dead_letter_id=$1
       limit 1
       for share of dl`,
      [input.deadLetterId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("event_bus_dead_letter_not_found");
    }

    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    if (row.dismissed) {
      throw new Error("event_bus_dead_letter_dismissed");
    }

    const category = String(
      row.failure_category
    ) as EventBusFailureCategory;
    if (!eventBusFailureReplayable(category)) {
      throw new Error(
        "event_bus_failure_not_replayable"
      );
    }
    if (String(row.subscription_state) !== "active") {
      throw new Error(
        "event_bus_subscription_not_active"
      );
    }

    const replayNumber = nextReplayNumber(
      numeric(row.replay_count)
    );
    const replayRequestId = randomUUID();
    const replayRouteId = randomUUID();

    await client.query(
      `insert into app.event_bus_replay_requests (
        replay_request_id,workspace_id,dead_letter_id,original_route_id,
        publication_id,subscription_id,replay_number,reason,requested_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        replayRequestId,
        workspaceId,
        row.dead_letter_id,
        row.route_id,
        row.publication_id,
        row.subscription_id,
        replayNumber,
        reason,
        userId
      ]
    );

    await appendRecoveryAudit(client, {
      workspaceId,
      userId,
      action: "replay-requested",
      routeId: String(row.route_id),
      failureId: String(row.failure_id),
      deadLetterId: String(row.dead_letter_id),
      replayRequestId,
      details: {
        replayNumber,
        reviewed: true
      }
    });

    await client.query(
      `insert into app.event_bus_replay_routes (
        replay_route_id,workspace_id,replay_request_id,dead_letter_id,
        original_route_id,publication_id,subscription_id,
        destination_application_id,delivery_mode,state,hold_reason
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,
        'internal-queue','held','recovery-replay-not-authorized'
      )`,
      [
        replayRouteId,
        workspaceId,
        replayRequestId,
        row.dead_letter_id,
        row.route_id,
        row.publication_id,
        row.subscription_id,
        row.destination_application_id
      ]
    );

    await appendRecoveryAudit(client, {
      workspaceId,
      userId,
      action: "replay-route-created",
      routeId: String(row.route_id),
      failureId: String(row.failure_id),
      deadLetterId: String(row.dead_letter_id),
      replayRequestId,
      replayRouteId,
      details: {
        replayNumber,
        state: "held",
        holdReason:
          "recovery-replay-not-authorized",
        outboundNetworkDelivery: false
      }
    });

    return {
      replayRequestId,
      replayRouteId,
      replayNumber,
      state: "held" as const,
      holdReason:
        "recovery-replay-not-authorized" as const
    };
  });
}

export async function dismissEventBusDeadLetter(
  userId: string,
  input: {
    deadLetterId: string;
    reason: string;
  }
) {
  const reason = normalizeReason(input.reason);

  return withUserDatabase(userId, async (client) => {
    const result = await client.query(
      `select
         dl.dead_letter_id,dl.workspace_id,dl.failure_id,dl.route_id,
         exists (
           select 1
           from app.event_bus_recovery_audit ra
           where ra.dead_letter_id=dl.dead_letter_id
             and ra.action='dead-letter-dismissed'
         ) as dismissed
       from app.event_bus_dead_letters dl
       where dl.dead_letter_id=$1
       limit 1
       for share of dl`,
      [input.deadLetterId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("event_bus_dead_letter_not_found");
    }

    const workspaceId = String(row.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);
    if (row.dismissed) {
      return { alreadyDismissed: true };
    }

    await appendRecoveryAudit(client, {
      workspaceId,
      userId,
      action: "dead-letter-dismissed",
      routeId: String(row.route_id),
      failureId: String(row.failure_id),
      deadLetterId: String(row.dead_letter_id),
      details: {
        reason,
        outboundNetworkDelivery: false
      }
    });

    return { alreadyDismissed: false };
  });
}
