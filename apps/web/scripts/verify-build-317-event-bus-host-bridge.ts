import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  EVENT_BUS_HOST_BRIDGE_VERSION,
  EventBusHostBridgeError,
  buildReplaySafeReceiptCorrelation,
  createExactEventTypeContractPack,
  createHostEventPublicationAdapter,
  createHostSubscriptionRegistration,
  eventBusHostBridgeDescriptor,
  hostEventSubscriptionMatches
} from "../lib/event-bus-host-bridge";

const root = path.resolve(process.cwd());
const fixedNow = Date.parse("2026-11-08T03:00:00.000Z");

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function authorization(
  capability: "event-bus.publish" | "event-bus.subscriptions.manage"
) {
  return {
    capability,
    granted: true,
    grantId: "grant-build317-" + capability.replace(/[^a-z]+/g, "-"),
    subjectId: "owner-build317",
    hostApplicationId: "rosevear.icamp",
    hostEnvironment: "production" as const,
    platformTenantId: "tenant-rosevear",
    workspaceId: "workspace-operations",
    expiresAt: "2026-11-09T03:00:00.000Z",
    reviewAt: "2026-11-09T02:00:00.000Z"
  };
}

async function main() {
  assert.equal(EVENT_BUS_HOST_BRIDGE_VERSION, "1.0.0");

  const contracts = createExactEventTypeContractPack([
    {
      eventType: "booking.created",
      schemaId: "rosevear.event.booking.created.v1",
      version: "1.0.0",
      description: "A new governed booking was created."
    },
    {
      eventType: "booking.updated",
      schemaId: "rosevear.event.booking.updated.v1",
      version: "1.0.0",
      description: "A governed booking changed."
    }
  ]);

  const publication = createHostEventPublicationAdapter(
    {
      hostApplicationId: "rosevear.icamp",
      hostEnvironment: "production",
      sourceApplicationId: "icamp",
      platformTenantId: "tenant-rosevear",
      workspaceId: "workspace-operations",
      tenantId: "camp-rosevear",
      eventId: "booking-317-001",
      eventType: "booking.created",
      bodySha256: "a".repeat(64),
      occurredAt: "2026-11-08T02:55:00.000Z",
      auditCorrelationId: "audit-build317-publication",
      authorization: authorization("event-bus.publish")
    },
    contracts,
    fixedNow
  );

  assert.equal(publication.state, "held");
  assert.equal(
    publication.holdReason,
    "host-event-publication-review-required"
  );
  assert.equal(publication.environment, "production");
  assert.equal(publication.security.rawPayloadAccepted, false);
  assert.equal(publication.security.downstreamApprovalBypassed, false);
  assert.equal(publication.security.networkDeliveryRequested, false);
  assert.match(publication.idempotencyKeySha256, /^[a-f0-9]{64}$/);

  const repeat = createHostEventPublicationAdapter(
    {
      hostApplicationId: "rosevear.icamp",
      hostEnvironment: "production",
      sourceApplicationId: "icamp",
      platformTenantId: "tenant-rosevear",
      workspaceId: "workspace-operations",
      tenantId: "camp-rosevear",
      eventId: "booking-317-001",
      eventType: "booking.created",
      bodySha256: "a".repeat(64),
      occurredAt: "2026-11-08T02:55:00.000Z",
      auditCorrelationId: "audit-build317-publication",
      authorization: authorization("event-bus.publish")
    },
    contracts,
    fixedNow
  );
  assert.equal(repeat.idempotencyKeySha256, publication.idempotencyKeySha256);

  const subscription = createHostSubscriptionRegistration(
    {
      hostApplicationId: "rosevear.icamp",
      hostEnvironment: "production",
      sourceApplicationId: "icamp",
      destinationApplicationId: "rosevear-ai-hub",
      platformTenantId: "tenant-rosevear",
      workspaceId: "workspace-operations",
      tenantId: "camp-rosevear",
      name: "Booking events to AI Hub",
      eventTypes: ["booking.created"],
      auditCorrelationId: "audit-build317-subscription",
      authorization: authorization("event-bus.subscriptions.manage")
    },
    contracts,
    fixedNow
  );

  assert.equal(subscription.state, "draft");
  assert.equal(subscription.requiresExplicitActivation, true);
  assert.equal(subscription.security.autoActivated, false);

  const activeSubscription = {
    ...subscription,
    subscription: {
      ...subscription.subscription,
      state: "active" as const
    }
  };
  assert.equal(hostEventSubscriptionMatches(activeSubscription, publication), true);
  assert.equal(hostEventSubscriptionMatches(subscription, publication), false);

  const correlation = buildReplaySafeReceiptCorrelation({
    workspaceId: "workspace-operations",
    publicationId: "publication-317",
    subscriptionId: "subscription-317",
    destinationApplicationId: "rosevear-ai-hub",
    idempotencyKeySha256: "b".repeat(64),
    routeId: "route-317",
    sourceReceiptId: "receipt-317",
    replayNumber: 2
  });
  assert.equal(correlation.replaySafe, true);
  assert.equal(correlation.replayNumber, 2);
  assert.match(correlation.correlationSha256, /^[a-f0-9]{64}$/);

  assert.throws(
    () =>
      createExactEventTypeContractPack([
        {
          eventType: "booking.*",
          schemaId: "rosevear.event.booking.v1",
          version: "1.0.0",
          description: "Wildcard must fail."
        }
      ]),
    EventBusHostBridgeError
  );

  assert.throws(
    () =>
      createHostEventPublicationAdapter(
        {
          hostApplicationId: "rosevear.icamp",
          hostEnvironment: "production",
          sourceApplicationId: "icamp",
          platformTenantId: "tenant-rosevear",
          workspaceId: "workspace-operations",
          tenantId: "camp-rosevear",
          eventId: "booking-317-002",
          eventType: "booking.unknown",
          bodySha256: "a".repeat(64),
          occurredAt: "2026-11-08T02:55:00.000Z",
          auditCorrelationId: "audit-build317-missing-contract",
          authorization: authorization("event-bus.publish")
        },
        contracts,
        fixedNow
      ),
    (error: unknown) =>
      error instanceof EventBusHostBridgeError &&
      error.code === "event_contract_missing"
  );

  assert.throws(
    () =>
      createHostSubscriptionRegistration(
        {
          hostApplicationId: "rosevear.icamp",
          hostEnvironment: "production",
          sourceApplicationId: "icamp",
          destinationApplicationId: "icamp",
          platformTenantId: "tenant-rosevear",
          workspaceId: "workspace-operations",
          tenantId: "camp-rosevear",
          name: "Self route",
          eventTypes: ["booking.created"],
          auditCorrelationId: "audit-build317-self-route",
          authorization: authorization("event-bus.subscriptions.manage")
        },
        contracts,
        fixedNow
      ),
    (error: unknown) =>
      error instanceof EventBusHostBridgeError &&
      error.code === "subscription_invalid"
  );

  assert.throws(
    () =>
      createHostEventPublicationAdapter(
        {
          hostApplicationId: "rosevear.icamp",
          hostEnvironment: "production",
          sourceApplicationId: "icamp",
          platformTenantId: "tenant-rosevear",
          workspaceId: "workspace-operations",
          tenantId: "camp-rosevear",
          eventId: "booking-317-003",
          eventType: "booking.created",
          bodySha256: "a".repeat(64),
          occurredAt: "2026-11-08T02:55:00.000Z",
          auditCorrelationId: "audit-build317-bad-scope",
          authorization: {
            ...authorization("event-bus.publish"),
            workspaceId: "workspace-other"
          }
        },
        contracts,
        fixedNow
      ),
    (error: unknown) =>
      error instanceof EventBusHostBridgeError &&
      error.code === "authorization_scope_mismatch"
  );

  const descriptor = eventBusHostBridgeDescriptor();
  assert.equal(descriptor.rawPayloadAcceptedByHostBridge, false);
  assert.equal(descriptor.downstreamApprovalBypassed, false);
  assert.equal(descriptor.subscriptionAutoActivation, false);
  assert.equal(descriptor.deterministicIdempotencyKeys, true);
  assert.equal(descriptor.replaySafeReceiptCorrelation, true);

  const [bridge, api, page, navigation, operatorTools, manifest, docs, review, roadmap, packageRaw] =
    await Promise.all([
      source("lib/event-bus-host-bridge.ts"),
      source("app/api/module-event-bus/route.ts"),
      source("app/event-bus/page.tsx"),
      source("lib/application-navigation.ts"),
      source("lib/module-operator-tools.ts"),
      source("lib/universal-module-contract.ts"),
      source("../../docs/BUILD_317_EVENT_BUS_HOST_BRIDGE_SUBSCRIPTION_PACK.md"),
      source("../../docs/integration/ai-data-platform-build317-review.json"),
      source("../../docs/NEXT_BUILDS_306_330.md"),
      source("package.json")
    ]);

  for (const token of [
    "eventBusSubscriptionMatches",
    "safeDeliveryIdempotencyKey",
    "host-event-publication-review-required",
    "downstreamApprovalBypassed: false",
    "networkDeliveryRequested: false",
    "autoActivated: false",
    "wildcardEventTypesAccepted: false",
    "replaySafe: true"
  ]) {
    assert.ok(bridge.includes(token), "Build 317 bridge missing " + token);
  }

  for (const token of [
    "publicationAdapterProducesHeldIntent: true",
    "subscriptionRegistrationProducesDraft: true",
    "existingGovernedServerFlowsRemainAuthoritative: true"
  ]) {
    assert.ok(api.includes(token), "Build 317 API missing " + token);
  }

  assert.ok(page.includes("Build 317 host/module pack"));
  assert.ok(page.includes("/api/module-event-bus"));
  assert.ok(
    navigation.includes("host/module event bridge") &&
      operatorTools.includes("host/module event bridge")
  );

  for (const token of [
    '"event-bus-host-bridge-v1"',
    '"event-subscription-pack-v1"',
    '"exact-event-type-contracts-v1"',
    '"replay-safe-event-receipt-correlation-v1"',
    "hostEventPublicationBypassesReview: false",
    "hostSubscriptionAutoActivates: false",
    "eventBridgeAcceptsRawPayloadBodies: false",
    "eventBridgeRequiresExactEventContracts: true"
  ]) {
    assert.ok(manifest.includes(token), "Build 317 manifest missing " + token);
  }

  for (const token of [
    "Build 317",
    "Host event publication adapter",
    "Subscription registration pack",
    "Exact event-type contracts",
    "Operator usability",
    "Build 318"
  ]) {
    assert.ok(docs.includes(token), "Build 317 docs missing " + token);
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 317);
  assert.equal(reviewJson.security.rawPayloadAcceptedByHostBridge, false);
  assert.equal(reviewJson.security.subscriptionAutoActivation, false);
  assert.equal(reviewJson.nextQueuedBuild, 318);

  assert.ok(
    roadmap.includes("Build 317 — Event Bus Host Bridge & Subscription Pack") &&
      roadmap.includes("Build 318 — Workflow Action Plug-In Interface")
  );

  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(JSON.parse(packageRaw).scripts[scriptName]).includes(
        "verify-build-317-event-bus-host-bridge.ts"
      ),
      "Build 317 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 317 Event Bus Host Bridge & Subscription Pack verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
