import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  parseWebhookEventEnvelope,
  signWebhookReceipt,
  validateWebhookEventAgainstEndpoint,
  validateWebhookTimestamp,
  verifyWebhookHmacSignature,
  WEBHOOK_CONTRACT,
  WEBHOOK_EVENT_SCHEMA,
  WEBHOOK_RECEIPT_SCHEMA,
  webhookBodySha256,
  webhookCanonicalRequest
} from "../lib/webhook-gateway-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 290 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const event = {
    schemaVersion: WEBHOOK_EVENT_SCHEMA,
    eventId: "evt_build290accept01",
    eventType: "booking.created",
    occurredAt: "2026-11-05T01:00:00.000Z",
    sourceApplicationId: "icamp",
    tenantId: "camp-rosevear",
    data: { bookingId: "sample-1", status: "held" }
  } as const;
  const body = new TextEncoder().encode(JSON.stringify(event));
  const bodyHash = webhookBodySha256(body);
  ensure(/^[a-f0-9]{64}$/.test(bodyHash), "body hash");

  const secret = Buffer.alloc(32, 7);
  const canonical = webhookCanonicalRequest({
    endpointKey: "whk_abcdefghijklmnopqrstuvwx",
    keyId: "whk-key-primary",
    eventId: event.eventId,
    timestampMs: 1793839200000,
    bodySha256: bodyHash
  });
  const signature = createHmac("sha256", secret)
    .update(canonical)
    .digest("base64url");
  ensure(
    verifyWebhookHmacSignature({ secret, signature, canonical }),
    "HMAC verification"
  );
  ensure(
    !verifyWebhookHmacSignature({
      secret,
      signature: createHmac("sha256", Buffer.alloc(32, 9))
        .update(canonical)
        .digest("base64url"),
      canonical
    }),
    "wrong secret fails"
  );

  const parsed = parseWebhookEventEnvelope(event);
  validateWebhookEventAgainstEndpoint(parsed, {
    sourceApplicationId: "icamp",
    tenantId: "camp-rosevear",
    allowedEventTypes: ["booking.created"]
  });
  let mismatchDenied = false;
  try {
    validateWebhookEventAgainstEndpoint(parsed, {
      sourceApplicationId: "icamp",
      tenantId: "camp-rosevear",
      allowedEventTypes: ["booking.updated"]
    });
  } catch {
    mismatchDenied = true;
  }
  ensure(mismatchDenied, "event-type allowlist");

  validateWebhookTimestamp(1793839200000, 1793839201000);
  let staleDenied = false;
  try {
    validateWebhookTimestamp(1793839200000, 1793839800001);
  } catch {
    staleDenied = true;
  }
  ensure(staleDenied, "stale timestamp");

  const receiptSignature = signWebhookReceipt(secret, {
    schema_version: WEBHOOK_RECEIPT_SCHEMA,
    gateway_id: "ai-data-platform",
    endpoint_key: "whk_abcdefghijklmnopqrstuvwx",
    source_application_id: "icamp",
    event_id: event.eventId,
    event_type: event.eventType,
    body_sha256: bodyHash,
    status: "accepted",
    key_id: "whk-key-primary",
    received_at: "2026-11-05T01:20:00.000Z"
  });
  ensure(/^[A-Za-z0-9_-]{43}$/.test(receiptSignature), "signed receipt");
  secret.fill(0);

  const [
    migration,
    core,
    database,
    publicRoute,
    adminRoute,
    page,
    client,
    navigation,
    tools,
    docs,
    statusRaw,
    roadmap
  ] = await Promise.all([
    source("../../db/migrations/0093_webhook_gateway_event_intake.sql"),
    source("lib/webhook-gateway-core.ts"),
    source("lib/webhook-gateway-database.ts"),
    source("app/api/webhooks/[endpointKey]/route.ts"),
    source("app/api/webhook-gateway/route.ts"),
    source("app/webhook-gateway/page.tsx"),
    source("app/webhook-gateway/WebhookGatewayCenter.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("../../docs/BUILD_290_WEBHOOK_GATEWAY_EVENT_INTAKE.md"),
    source("../../docs/integration/ql266-ai-data-platform-build290-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md")
  ]);

  for (const token of [
    "webhook_endpoints",
    "webhook_event_nonces",
    "webhook_receipts",
    "webhook_request_audit",
    "enable row level security",
    "app.webhook_endpoint_key",
    "on conflict do nothing"
  ]) ensure(migration.includes(token), "migration token " + token);
  ensure(!migration.includes("grant delete"), "no delete grants");
  ensure(!migration.includes("grant update on app.webhook_receipts"), "receipts immutable");

  for (const token of [
    "WEBHOOK_MAX_SKEW_MS = 300_000",
    "readBoundedWebhookBody",
    "verifyWebhookHmacSignature",
    "webhookCanonicalReceipt",
    "timingSafeEqual"
  ]) ensure(core.includes(token), "core token " + token);

  for (const token of [
    "enabled,allowed_event_types",
    "credentialChanged",
    "webhook_replay_denied",
    "webhook_event_accepted",
    "receiptSignature",
    "downstreamDispatch: false"
  ]) ensure(database.includes(token), "database token " + token);

  ensure(
    publicRoute.includes("X-Rosevear-Webhook-Signature") &&
      publicRoute.includes("readBoundedWebhookBody") &&
      publicRoute.includes("202"),
    "public signed intake route"
  );
  ensure(
    adminRoute.includes("createWebhookEndpoint") &&
      adminRoute.includes("updateWebhookEndpoint"),
    "admin API"
  );
  ensure(
    page.includes("Build 290") &&
      page.includes("Webhook Gateway &amp; Event Intake Center"),
    "operator page"
  );
  ensure(
    client.includes("Create disabled endpoint") &&
      client.includes("replays denied") &&
      client.includes("/api/webhooks/"),
    "operator controls"
  );
  ensure(
    navigation.includes("/webhook-gateway") &&
      tools.includes("/webhook-gateway"),
    "navigation"
  );
  ensure(
    docs.includes("Build 291 — Cross-App Event Bus & Subscription Manager") &&
      docs.includes("UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED"),
    "docs boundary and next build"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 290, "status build");
  ensure(status.webhook_gateway.signed_request_required === true, "signed requests");
  ensure(status.webhook_gateway.signed_receipt === true, "signed receipt status");
  ensure(status.webhook_gateway.atomic_event_id_replay_suppression === true, "replay suppression");
  ensure(status.webhook_gateway.raw_secret_values_stored === false, "no raw secret storage");
  ensure(status.webhook_gateway.downstream_dispatch === false, "no downstream dispatch");
  ensure(status.webhook_gateway.external_requests === 0, "no external build requests");
  ensure(status.webhook_gateway.live_exchanges === 0, "no live exchange");
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 291, "next build");
  ensure(
    roadmap.includes("Build 290 — Webhook Gateway & Event Intake Center") &&
      roadmap.includes("Build 291 — Cross-App Event Bus & Subscription Manager"),
    "roadmap continuity"
  );
  ensure(WEBHOOK_CONTRACT === "rosevear.webhook.v1", "contract version");

  console.log("Build 290 Webhook Gateway & Event Intake Center verification passed.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
