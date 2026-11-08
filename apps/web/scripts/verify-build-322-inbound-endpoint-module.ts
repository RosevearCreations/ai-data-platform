import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildInboundCallbackRoute,
  buildInboundEndpointEvidence,
  inboundEndpointModuleDescriptor,
  translateWebhookReceiptToHostEvent,
  validateInboundCallbackRegistration
} from "../lib/inbound-endpoint-module";
import type {
  WebhookEndpointRecord,
  WebhookReceiptRecord
} from "../lib/webhook-gateway-database";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function endpoint(
  overrides: Partial<WebhookEndpointRecord> = {}
): WebhookEndpointRecord {
  return {
    endpointId: "11111111-1111-4111-8111-111111111111",
    endpointKey: "whk_abcdefghijklmnopqrstuvwx",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    sourceApplicationId: "icamp",
    environment: "production",
    tenantId: "camp-rosevear",
    displayName: "iCamp host inbound",
    keyId: "whk-key-primary",
    secretEnvVar: "ICAMP_WEBHOOK_SECRET",
    callbackApplicationId: "rosevear.icamp",
    callbackPath: "/api/module-events/inbound",
    enabled: true,
    revokedAt: null,
    revokedBy: null,
    allowedEventTypes: ["booking.created"],
    maxBodyBytes: 262144,
    createdBy: "owner-ree",
    updatedBy: "owner-ree",
    createdAt: new Date("2026-11-08T04:30:00.000Z"),
    updatedAt: new Date("2026-11-08T04:31:00.000Z"),
    ...overrides
  };
}

function receipt(): WebhookReceiptRecord {
  return {
    receiptId: "whr_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    endpointId: "11111111-1111-4111-8111-111111111111",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    sourceApplicationId: "icamp",
    environment: "production",
    tenantId: "camp-rosevear",
    eventId: "evt_build322accept01",
    eventType: "booking.created",
    eventOccurredAt: new Date("2026-11-08T04:20:00.000Z"),
    requestTimestampMs: 1794102000000,
    bodySha256: "a".repeat(64),
    payloadSizeBytes: 512,
    eventEnvelope: {
      schemaVersion: "rosevear.webhook.event.v1",
      eventId: "evt_build322accept01",
      eventType: "booking.created",
      occurredAt: "2026-11-08T04:20:00.000Z",
      sourceApplicationId: "icamp",
      tenantId: "camp-rosevear",
      data: { bookingId: "booking-322" }
    },
    receiptPayload: {
      schema_version: "rosevear.webhook.receipt.v1"
    },
    receiptSignature:
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    receivedAt: new Date("2026-11-08T04:21:00.000Z")
  };
}

async function main() {
  const callback = validateInboundCallbackRegistration({
    callbackApplicationId: "rosevear.icamp",
    callbackPath: "/api/module-events/inbound"
  });
  assert.equal(callback.callbackApplicationId, "rosevear.icamp");
  assert.equal(callback.callbackPath, "/api/module-events/inbound");

  assert.throws(
    () =>
      validateInboundCallbackRegistration({
        callbackApplicationId: "rosevear.icamp"
      }),
    /webhook_callback_pair_required/
  );

  const active = endpoint();
  const activeRoute = buildInboundCallbackRoute(active);
  assert.equal(activeRoute?.state, "ready");
  assert.equal(activeRoute?.dispatchRequested, false);
  assert.equal(activeRoute?.externalRequestPerformed, false);

  const disabledRoute = buildInboundCallbackRoute(
    endpoint({ enabled: false })
  );
  assert.equal(disabledRoute?.state, "disabled");

  const revoked = endpoint({
    enabled: false,
    revokedAt: new Date("2026-11-08T04:40:00.000Z"),
    revokedBy: "owner-ree"
  });
  assert.equal(buildInboundCallbackRoute(revoked)?.state, "revoked");

  const evidence = buildInboundEndpointEvidence(active);
  assert.equal(evidence.environment, "production");
  assert.equal(evidence.verification.rawSecretIncluded, false);
  assert.equal(
    evidence.verification.secretReference.environmentVariable,
    "ICAMP_WEBHOOK_SECRET"
  );
  assert.equal(
    evidence.security.endpointPresenceActivatesConnection,
    false
  );
  assert.match(evidence.evidenceSha256, /^[a-f0-9]{64}$/);

  const hostEvent = translateWebhookReceiptToHostEvent({
    receipt: receipt(),
    endpoint: active
  });
  assert.equal(hostEvent.schema, "rosevear.ai-data-platform.host-inbound-event.v1");
  assert.equal(hostEvent.deliveryState, "held-callback-route-ready");
  assert.equal(hostEvent.data.bookingId, "booking-322");
  assert.equal(hostEvent.callbackDispatchPerformed, false);
  assert.equal(hostEvent.eventBusPublishPerformed, false);

  const descriptor = inboundEndpointModuleDescriptor();
  assert.equal(descriptor.sourceBuild, 290);
  assert.equal(descriptor.endpointRegistration, true);
  assert.equal(descriptor.nonceReplayProtection.atomic, true);
  assert.equal(descriptor.endpointRevoke, true);
  assert.equal(descriptor.security.rawSecretsAccepted, false);
  assert.equal(
    descriptor.security.revokedEndpointCanBeReenabled,
    false
  );

  const [
    migration,
    moduleSource,
    database,
    publicRoute,
    discoveryApi,
    manageApi,
    page,
    navigation,
    operatorTools,
    manifest,
    docs,
    review,
    roadmap,
    packageRaw
  ] = await Promise.all([
    source("../../db/migrations/0108_webhook_callback_inbound_endpoint_module.sql"),
    source("lib/inbound-endpoint-module.ts"),
    source("lib/webhook-gateway-database.ts"),
    source("app/api/webhooks/[endpointKey]/route.ts"),
    source("app/api/module-inbound-endpoints/route.ts"),
    source("app/api/module-inbound-endpoints/manage/route.ts"),
    source("app/webhook-gateway/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_322_WEBHOOK_CALLBACK_INBOUND_ENDPOINT_MODULE.md"),
    source("../../docs/integration/ai-data-platform-build322-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "callback_application_id",
    "callback_path",
    "revoked_at",
    "revoked_by",
    "webhook_endpoint_revoked_disabled_check",
    "No DELETE privilege is introduced"
  ]) {
    assert.ok(migration.includes(token), "Build 322 migration missing " + token);
  }

  for (const token of [
    "buildInboundEndpointEvidence",
    "translateWebhookReceiptToHostEvent",
    "callbackDispatchPerformed: false",
    "eventBusPublishPerformed: false",
    "revokedEndpointCanBeReenabled: false"
  ]) {
    assert.ok(moduleSource.includes(token), "Build 322 module missing " + token);
  }

  for (const token of [
    "revokeWebhookEndpoint",
    "searchWebhookReceiptsForUser",
    "event_envelope",
    "webhook_endpoint_revoked",
    "latest.revokedAt !== null",
    "irreversibleRevocation: true"
  ]) {
    assert.ok(database.includes(token), "Build 322 database missing " + token);
  }

  assert.ok(
    publicRoute.includes("!endpoint.enabled") &&
      publicRoute.includes("loadWebhookEndpointForIntake")
  );

  for (const token of [
    "build290IntakeRemainsAuthoritative: true",
    "secretsRemainReferenceOnly: true",
    "callbackRoutesAreHeldMetadataOnly: true",
    "hostEventTranslationDoesNotDispatch: true"
  ]) {
    assert.ok(discoveryApi.includes(token), "Build 322 discovery missing " + token);
  }

  for (const token of [
    "createWebhookEndpoint",
    "revokeWebhookEndpoint",
    "searchWebhookReceiptsForUser",
    "translateWebhookReceiptToHostEvent",
    'action === "revoke"',
    "connectionActivated: false",
    "callbackDispatchPerformed: false"
  ]) {
    assert.ok(manageApi.includes(token), "Build 322 management API missing " + token);
  }

  assert.ok(page.includes("Build 322 inbound endpoint module"));
  assert.ok(page.includes("/api/module-inbound-endpoints"));
  assert.ok(
    navigation.includes("inbound endpoint module") &&
      operatorTools.includes("inbound endpoint module")
  );

  for (const token of [
    '"inbound-endpoint-module-v1"',
    '"webhook-callback-routing-v1"',
    '"host-inbound-event-translation-v1"',
    '"webhook-receipt-search-v1"',
    "inboundEndpointDiscoveryActivatesConnection: false",
    "inboundEndpointModuleReadsRawSecrets: false",
    "inboundEndpointCallbackDispatchesAutomatically: false",
    "inboundEndpointRevokedCanReenable: false"
  ]) {
    assert.ok(manifest.includes(token), "Build 322 manifest missing " + token);
  }

  for (const token of [
    "Build 322",
    "Endpoint registration",
    "Nonce and replay protection",
    "Callback routing",
    "Host event translation",
    "Receipt search",
    "Disable and revoke",
    "Build 323"
  ]) {
    assert.ok(docs.includes(token), "Build 322 docs missing " + token);
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 322);
  assert.equal(reviewJson.security.rawSecretsStoredOrReturned, false);
  assert.equal(reviewJson.security.revokedEndpointCanReenable, false);
  assert.equal(reviewJson.nextQueuedBuild, 323);

  assert.ok(
    roadmap.includes(
      "Build 322 — Webhook, Callback & Inbound Endpoint Module"
    ) &&
      roadmap.includes(
        "Build 323 — Secure Local/Cloud Relay & Transport Selection"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-322-inbound-endpoint-module.ts"
      ),
      "Build 322 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 322 Webhook, Callback & Inbound Endpoint Module verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
