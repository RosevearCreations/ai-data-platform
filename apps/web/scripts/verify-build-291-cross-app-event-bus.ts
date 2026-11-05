import { readFile } from "node:fs/promises";
import path from "node:path";

import { eventBusSubscriptionMatches } from "../lib/event-bus-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error("Build 291 verification failed: " + message);
  }
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const publication = {
    sourceApplicationId: "icamp" as const,
    environment: "nonproduction" as const,
    tenantId: "camp-rosevear",
    eventType: "booking.created"
  };

  ensure(
    eventBusSubscriptionMatches(
      {
        sourceApplicationId: "icamp",
        destinationApplicationId: "rosevear-comms-hub",
        environment: "nonproduction",
        tenantId: "camp-rosevear",
        eventTypes: ["booking.created"],
        state: "active"
      },
      publication
    ),
    "exact active subscription matches"
  );

  ensure(
    !eventBusSubscriptionMatches(
      {
        sourceApplicationId: "icamp",
        destinationApplicationId: "rosevear-comms-hub",
        environment: "production",
        tenantId: "camp-rosevear",
        eventTypes: ["booking.created"],
        state: "active"
      },
      publication
    ),
    "environment mismatch denied"
  );

  ensure(
    !eventBusSubscriptionMatches(
      {
        sourceApplicationId: "icamp",
        destinationApplicationId: "rosevear-comms-hub",
        environment: "nonproduction",
        tenantId: "camp-rosevear",
        eventTypes: ["booking.updated"],
        state: "active"
      },
      publication
    ),
    "event type mismatch denied"
  );

  ensure(
    !eventBusSubscriptionMatches(
      {
        sourceApplicationId: null,
        destinationApplicationId: "icamp",
        environment: "nonproduction",
        tenantId: null,
        eventTypes: ["booking.created"],
        state: "active"
      },
      publication
    ),
    "self route denied"
  );

  ensure(
    !eventBusSubscriptionMatches(
      {
        sourceApplicationId: "icamp",
        destinationApplicationId: "rosevear-comms-hub",
        environment: "nonproduction",
        tenantId: "camp-rosevear",
        eventTypes: ["booking.created"],
        state: "draft"
      },
      publication
    ),
    "draft subscription denied"
  );

  const [
    migration,
    core,
    database,
    api,
    page,
    client,
    navigation,
    operatorTools,
    docs,
    statusRaw,
    roadmap,
    packageRaw,
    workflow
  ] = await Promise.all([
    source("../../db/migrations/0094_cross_app_event_bus.sql"),
    source("lib/event-bus-core.ts"),
    source("lib/event-bus-database.ts"),
    source("app/api/event-bus/route.ts"),
    source("app/event-bus/page.tsx"),
    source("app/event-bus/EventBusManager.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("../../docs/BUILD_291_CROSS_APP_EVENT_BUS.md"),
    source("../../docs/integration/ql266-ai-data-platform-build291-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md"),
    source("package.json"),
    source("../../.github/workflows/verify.yml")
  ]);

  for (const token of [
    "event_bus_subscriptions",
    "event_bus_publications",
    "event_bus_routes",
    "event_bus_audit",
    "enable row level security",
    "delivery-not-authorized"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }
  ensure(!migration.includes("grant delete"), "no delete grants");
  ensure(
    !migration.includes("grant update on app.event_bus_publications"),
    "publications append-only"
  );
  ensure(
    !migration.includes("grant update on app.event_bus_routes"),
    "routes append-only in Build 291"
  );

  for (const token of [
    "eventBusSubscriptionMatches",
    "subscription.state !== \"active\"",
    "subscription.destinationApplicationId ==="
  ]) {
    ensure(core.includes(token), "matcher token " + token);
  }

  for (const token of [
    "webhook_receipts",
    "alreadyPublished",
    "eventBusSubscriptionMatches",
    "state: \"held\"",
    "delivery-not-authorized",
    "publication-no-match",
    "outboundNetworkDelivery: false"
  ]) {
    ensure(database.includes(token), "database token " + token);
  }

  ensure(
    api.includes("create-subscription") &&
      api.includes("publish-receipt") &&
      api.includes("updateEventBusSubscription"),
    "event bus API"
  );
  ensure(
    page.includes("Build 291") &&
      page.includes("Cross-App Event Bus &amp; Subscription Manager"),
    "operator page"
  );
  ensure(
    client.includes("Create draft subscription") &&
      client.includes("Publish reviewed receipt") &&
      client.includes("held routes"),
    "operator controls"
  );
  ensure(
    navigation.includes("/event-bus") &&
      operatorTools.includes("/event-bus"),
    "navigation"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 291, "status build");
  ensure(
    status.event_bus.reviewed_build290_receipts_only === true,
    "reviewed Build 290 receipts only"
  );
  ensure(
    status.event_bus.subscriptions_default_draft === true,
    "subscriptions default draft"
  );
  ensure(
    status.event_bus.matched_routes_state === "held" &&
      status.event_bus.hold_reason === "delivery-not-authorized",
    "routes remain held"
  );
  ensure(
    status.event_bus.outbound_network_delivery === false &&
      status.event_bus.external_requests === 0 &&
      status.event_bus.live_exchanges === 0,
    "no outbound/live exchange"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 292, "next build");

  ensure(
    docs.includes(
      "Build 292 — Event Replay, Dead-Letter Queue & Recovery Console"
    ) &&
      docs.includes(
        "Build 292A — CI Verification Consolidation & Promotion Run Reduction"
      ),
    "next build and CI consolidation recommendation"
  );
  ensure(
    roadmap.includes(
      "Build 291 — Cross-App Event Bus & Subscription Manager"
    ) &&
      roadmap.includes(
        "Build 292 — Event Replay, Dead-Letter Queue & Recovery Console"
      ),
    "roadmap continuity"
  );

  const pkg = JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts["ci:spine"]).includes(
      "tsx scripts/verify-build-291-cross-app-event-bus.ts"
    ),
    "Build 291 verifier remains in the authoritative current integration spine"
  );
  ensure(
    workflow.includes("pnpm ci:promotion") &&
      workflow.includes("pnpm ci:legacy"),
    "consolidated CI preserves compact promotion and exhaustive legacy audit"
  );

  console.log(
    "Build 291 Cross-App Event Bus & Subscription Manager verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
