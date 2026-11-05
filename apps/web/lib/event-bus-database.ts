import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { eventBusSubscriptionMatches } from "./event-bus-core";
import {
  safeWebhookEventType,
  safeWebhookTenantId,
  WEBHOOK_SOURCE_APPLICATIONS,
  type WebhookSourceApplication
} from "./webhook-gateway-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";

export type EventBusSubscriptionState =
  | "draft"
  | "active"
  | "paused";

export interface EventBusSubscriptionRecord {
  subscriptionId: string;
  workspaceId: string;
  name: string;
  sourceApplicationId: WebhookSourceApplication | null;
  destinationApplicationId: WebhookSourceApplication;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventTypes: string[];
  deliveryMode: "internal-queue";
  state: EventBusSubscriptionState;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventBusPublicationRecord {
  publicationId: string;
  workspaceId: string;
  webhookReceiptId: string;
  sourceApplicationId: WebhookSourceApplication;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventId: string;
  eventType: string;
  bodySha256: string;
  publishedBy: string;
  publishedAt: Date;
}

export interface EventBusRouteRecord {
  routeId: string;
  workspaceId: string;
  publicationId: string;
  subscriptionId: string;
  destinationApplicationId: WebhookSourceApplication;
  deliveryMode: "internal-queue";
  state: "pending" | "held";
  holdReason: string;
  createdAt: Date;
}

export interface EventBusReceiptCandidate {
  receiptId: string;
  workspaceId: string;
  sourceApplicationId: WebhookSourceApplication;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventId: string;
  eventType: string;
  bodySha256: string;
  receivedAt: Date;
}

function stringArray(value: unknown) {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string")
    ? value
    : [];
}

function subscriptionRow(
  row: Record<string, unknown>
): EventBusSubscriptionRecord {
  return {
    subscriptionId: String(row.subscription_id),
    workspaceId: String(row.workspace_id),
    name: String(row.name),
    sourceApplicationId:
      row.source_application_id === null ||
      row.source_application_id === undefined
        ? null
        : (String(row.source_application_id) as WebhookSourceApplication),
    destinationApplicationId: String(
      row.destination_application_id
    ) as WebhookSourceApplication,
    environment:
      row.environment === "production"
        ? "production"
        : "nonproduction",
    tenantId:
      row.tenant_id === null || row.tenant_id === undefined
        ? null
        : String(row.tenant_id),
    eventTypes: stringArray(row.event_types),
    deliveryMode: "internal-queue",
    state:
      row.state === "active"
        ? "active"
        : row.state === "paused"
          ? "paused"
          : "draft",
    createdBy: String(row.created_by),
    updatedBy: String(row.updated_by),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

function publicationRow(
  row: Record<string, unknown>
): EventBusPublicationRecord {
  return {
    publicationId: String(row.publication_id),
    workspaceId: String(row.workspace_id),
    webhookReceiptId: String(row.webhook_receipt_id),
    sourceApplicationId: String(
      row.source_application_id
    ) as WebhookSourceApplication,
    environment:
      row.environment === "production"
        ? "production"
        : "nonproduction",
    tenantId:
      row.tenant_id === null || row.tenant_id === undefined
        ? null
        : String(row.tenant_id),
    eventId: String(row.event_id),
    eventType: String(row.event_type),
    bodySha256: String(row.body_sha256),
    publishedBy: String(row.published_by),
    publishedAt: new Date(String(row.published_at))
  };
}

function routeRow(
  row: Record<string, unknown>
): EventBusRouteRecord {
  return {
    routeId: String(row.route_id),
    workspaceId: String(row.workspace_id),
    publicationId: String(row.publication_id),
    subscriptionId: String(row.subscription_id),
    destinationApplicationId: String(
      row.destination_application_id
    ) as WebhookSourceApplication,
    deliveryMode: "internal-queue",
    state: row.state === "pending" ? "pending" : "held",
    holdReason: String(row.hold_reason),
    createdAt: new Date(String(row.created_at))
  };
}

function receiptCandidateRow(
  row: Record<string, unknown>
): EventBusReceiptCandidate {
  return {
    receiptId: String(row.receipt_id),
    workspaceId: String(row.workspace_id),
    sourceApplicationId: String(
      row.source_application_id
    ) as WebhookSourceApplication,
    environment:
      row.environment === "production"
        ? "production"
        : "nonproduction",
    tenantId:
      row.tenant_id === null || row.tenant_id === undefined
        ? null
        : String(row.tenant_id),
    eventId: String(row.event_id),
    eventType: String(row.event_type),
    bodySha256: String(row.body_sha256),
    receivedAt: new Date(String(row.received_at))
  };
}

function normalizeEventTypes(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    throw new Error("event_bus_event_types_required");
  }
  const values = [
    ...new Set(
      value
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
  if (
    values.length !== value.length ||
    values.some((item) => !safeWebhookEventType(item))
  ) {
    throw new Error("event_bus_event_types_invalid");
  }
  return values.sort();
}

function normalizeTenantId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (
    typeof value !== "string" ||
    !safeWebhookTenantId(value)
  ) {
    throw new Error("event_bus_tenant_invalid");
  }
  return value;
}

function normalizeName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  if (
    name.length < 1 ||
    name.length > 160 ||
    /[\u0000-\u001f\u007f]/.test(name)
  ) {
    throw new Error("event_bus_subscription_name_invalid");
  }
  return name;
}

function normalizeApplication(
  value: unknown,
  field: string,
  nullable = false
): WebhookSourceApplication | null {
  if (
    nullable &&
    (value === null || value === undefined || value === "")
  ) {
    return null;
  }
  if (
    typeof value !== "string" ||
    !WEBHOOK_SOURCE_APPLICATIONS.includes(
      value as WebhookSourceApplication
    )
  ) {
    throw new Error(field + "_invalid");
  }
  return value as WebhookSourceApplication;
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

async function appendAudit(
  client: PoolClient,
  input: {
    workspaceId: string;
    userId: string;
    action:
      | "subscription-created"
      | "subscription-updated"
      | "receipt-published"
      | "route-enqueued"
      | "publication-no-match";
    subscriptionId?: string | null;
    publicationId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.event_bus_audit (
      audit_id,workspace_id,actor_user_id,action,
      subscription_id,publication_id,details
    ) values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [
      randomUUID(),
      input.workspaceId,
      input.userId,
      input.action,
      input.subscriptionId ?? null,
      input.publicationId ?? null,
      JSON.stringify(input.details ?? {})
    ]
  );
}

export async function listEventBusForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const state = await withUserDatabase(userId, async (client) => {
    const [subscriptions, publications, routes, receipts] =
      await Promise.all([
        client.query(
          `select *
           from app.event_bus_subscriptions
           order by updated_at desc,name`
        ),
        client.query(
          `select *
           from app.event_bus_publications
           order by published_at desc
           limit 200`
        ),
        client.query(
          `select *
           from app.event_bus_routes
           order by created_at desc
           limit 300`
        ),
        client.query(
          `select wr.receipt_id,wr.workspace_id,
                  wr.source_application_id,wr.environment,wr.tenant_id,
                  wr.event_id,wr.event_type,wr.body_sha256,wr.received_at
           from app.webhook_receipts wr
           left join app.event_bus_publications p
             on p.webhook_receipt_id=wr.receipt_id
           where p.publication_id is null
           order by wr.received_at desc
           limit 100`
        )
      ]);

    return {
      subscriptions: subscriptions.rows.map(subscriptionRow),
      publications: publications.rows.map(publicationRow),
      routes: routes.rows.map(routeRow),
      availableReceipts: receipts.rows.map(receiptCandidateRow)
    };
  });

  return {
    workspaces,
    sourceApplications: [...WEBHOOK_SOURCE_APPLICATIONS],
    ...state,
    summary: {
      subscriptions: state.subscriptions.length,
      activeSubscriptions: state.subscriptions.filter(
        (item) => item.state === "active"
      ).length,
      publications: state.publications.length,
      heldRoutes: state.routes.filter(
        (item) => item.state === "held"
      ).length,
      unpublishedReceipts: state.availableReceipts.length
    },
    policy: {
      reviewedReceiptPublicationOnly: true,
      explicitSubscriptionActivation: true,
      exactEventTypeMatching: true,
      workspaceEnvironmentTenantIsolation: true,
      directPointToPointWiring: false,
      outboundNetworkDelivery: false,
      routedEventsHeld: true,
      automaticConnectionActivation: false,
      ql266Resumed: false
    }
  };
}

export async function createEventBusSubscription(
  userId: string,
  input: {
    workspaceId: string;
    name: string;
    sourceApplicationId?: string | null;
    destinationApplicationId: string;
    environment: string;
    tenantId?: string | null;
    eventTypes: string[];
  }
) {
  const name = normalizeName(input.name);
  const sourceApplicationId = normalizeApplication(
    input.sourceApplicationId,
    "event_bus_source_application",
    true
  );
  const destinationApplicationId = normalizeApplication(
    input.destinationApplicationId,
    "event_bus_destination_application"
  );
  if (!destinationApplicationId) {
    throw new Error("event_bus_destination_application_invalid");
  }
  if (
    sourceApplicationId &&
    sourceApplicationId === destinationApplicationId
  ) {
    throw new Error("event_bus_self_route_denied");
  }
  if (
    input.environment !== "nonproduction" &&
    input.environment !== "production"
  ) {
    throw new Error("event_bus_environment_invalid");
  }
  const tenantId = normalizeTenantId(input.tenantId);
  const eventTypes = normalizeEventTypes(input.eventTypes);
  const subscriptionId = randomUUID();

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `insert into app.event_bus_subscriptions (
        subscription_id,workspace_id,name,source_application_id,
        destination_application_id,environment,tenant_id,event_types,
        delivery_mode,state,created_by,updated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8::jsonb,
        'internal-queue','draft',$9,$9
      )
      returning *`,
      [
        subscriptionId,
        input.workspaceId,
        name,
        sourceApplicationId,
        destinationApplicationId,
        input.environment,
        tenantId,
        JSON.stringify(eventTypes),
        userId
      ]
    );
    await appendAudit(client, {
      workspaceId: input.workspaceId,
      userId,
      action: "subscription-created",
      subscriptionId,
      details: {
        state: "draft",
        deliveryMode: "internal-queue"
      }
    });
    return subscriptionRow(result.rows[0]);
  });
}

export async function updateEventBusSubscription(
  userId: string,
  input: {
    subscriptionId: string;
    name?: string;
    state?: EventBusSubscriptionState;
    eventTypes?: string[];
  }
) {
  return withUserDatabase(userId, async (client) => {
    const existing = await client.query(
      `select *
       from app.event_bus_subscriptions
       where subscription_id=$1
       for update`,
      [input.subscriptionId]
    );
    if (!existing.rows[0]) {
      throw new Error("event_bus_subscription_not_found");
    }
    const current = subscriptionRow(existing.rows[0]);
    await requireWorkspaceAdmin(client, current.workspaceId);

    const name =
      input.name === undefined
        ? current.name
        : normalizeName(input.name);
    const state =
      input.state === undefined
        ? current.state
        : input.state;
    if (!["draft", "active", "paused"].includes(state)) {
      throw new Error("event_bus_subscription_state_invalid");
    }
    const eventTypes =
      input.eventTypes === undefined
        ? current.eventTypes
        : normalizeEventTypes(input.eventTypes);

    const result = await client.query(
      `update app.event_bus_subscriptions
       set name=$2,
           state=$3,
           event_types=$4::jsonb,
           updated_by=$5,
           updated_at=now()
       where subscription_id=$1
       returning *`,
      [
        current.subscriptionId,
        name,
        state,
        JSON.stringify(eventTypes),
        userId
      ]
    );
    await appendAudit(client, {
      workspaceId: current.workspaceId,
      userId,
      action: "subscription-updated",
      subscriptionId: current.subscriptionId,
      details: {
        previousState: current.state,
        state,
        outboundNetworkDelivery: false
      }
    });
    return subscriptionRow(result.rows[0]);
  });
}

export async function publishWebhookReceiptToEventBus(
  userId: string,
  receiptId: string
) {
  return withUserDatabase(userId, async (client) => {
    const receiptResult = await client.query(
      `select receipt_id,workspace_id,source_application_id,
              environment,tenant_id,event_id,event_type,
              body_sha256,received_at
       from app.webhook_receipts
       where receipt_id=$1
       limit 1
       for share`,
      [receiptId]
    );
    if (!receiptResult.rows[0]) {
      throw new Error("event_bus_receipt_not_found");
    }
    const receipt = receiptCandidateRow(receiptResult.rows[0]);
    await requireWorkspaceAdmin(client, receipt.workspaceId);

    const existing = await client.query(
      `select *
       from app.event_bus_publications
       where webhook_receipt_id=$1
       limit 1`,
      [receipt.receiptId]
    );
    if (existing.rows[0]) {
      const publication = publicationRow(existing.rows[0]);
      const routes = await client.query(
        `select *
         from app.event_bus_routes
         where publication_id=$1
         order by created_at,route_id`,
        [publication.publicationId]
      );
      return {
        publication,
        routes: routes.rows.map(routeRow),
        alreadyPublished: true
      };
    }

    const publicationId = randomUUID();
    const publicationResult = await client.query(
      `insert into app.event_bus_publications (
        publication_id,workspace_id,webhook_receipt_id,
        source_application_id,environment,tenant_id,event_id,event_type,
        body_sha256,published_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      returning *`,
      [
        publicationId,
        receipt.workspaceId,
        receipt.receiptId,
        receipt.sourceApplicationId,
        receipt.environment,
        receipt.tenantId,
        receipt.eventId,
        receipt.eventType,
        receipt.bodySha256,
        userId
      ]
    );

    await appendAudit(client, {
      workspaceId: receipt.workspaceId,
      userId,
      action: "receipt-published",
      publicationId,
      details: {
        receiptId: receipt.receiptId,
        eventType: receipt.eventType
      }
    });

    const candidateSubscriptions = await client.query(
      `select *
       from app.event_bus_subscriptions
       where workspace_id=$1
         and state='active'
       order by created_at,subscription_id`,
      [receipt.workspaceId]
    );
    const matches = candidateSubscriptions.rows
      .map(subscriptionRow)
      .filter((subscription) =>
        eventBusSubscriptionMatches(subscription, receipt)
      );

    const routes: EventBusRouteRecord[] = [];
    for (const subscription of matches) {
      const routeResult = await client.query(
        `insert into app.event_bus_routes (
          route_id,workspace_id,publication_id,subscription_id,
          destination_application_id,delivery_mode,state,hold_reason
        ) values (
          $1,$2,$3,$4,$5,'internal-queue','held','delivery-not-authorized'
        )
        on conflict (publication_id,subscription_id) do nothing
        returning *`,
        [
          randomUUID(),
          receipt.workspaceId,
          publicationId,
          subscription.subscriptionId,
          subscription.destinationApplicationId
        ]
      );
      if (routeResult.rows[0]) {
        const route = routeRow(routeResult.rows[0]);
        routes.push(route);
        await appendAudit(client, {
          workspaceId: receipt.workspaceId,
          userId,
          action: "route-enqueued",
          subscriptionId: subscription.subscriptionId,
          publicationId,
          details: {
            destinationApplicationId:
              subscription.destinationApplicationId,
            state: "held",
            holdReason: "delivery-not-authorized"
          }
        });
      }
    }

    if (routes.length === 0) {
      await appendAudit(client, {
        workspaceId: receipt.workspaceId,
        userId,
        action: "publication-no-match",
        publicationId,
        details: {
          eventType: receipt.eventType,
          sourceApplicationId: receipt.sourceApplicationId
        }
      });
    }

    return {
      publication: publicationRow(publicationResult.rows[0]),
      routes,
      alreadyPublished: false
    };
  });
}
