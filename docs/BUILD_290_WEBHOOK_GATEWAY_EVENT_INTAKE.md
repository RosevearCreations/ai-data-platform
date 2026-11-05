# Build 290 — Webhook Gateway & Event Intake Center

## Purpose

Build 290 adds a workspace-scoped inbound event boundary for the Rosevear application suite. It accepts only explicitly configured HMAC-signed POST requests, validates an exact event envelope, suppresses replay atomically, persists the accepted envelope and creates a signed durable receipt.

Build 290 does not publish accepted events downstream. Build 291 owns the event-bus and subscription layer.

## Endpoint lifecycle

Owners/admins create endpoints in the Webhook Gateway & Event Intake Center.

New endpoints are always created **disabled**. An endpoint records:

- workspace;
- source application;
- environment;
- optional tenant;
- opaque endpoint key;
- key ID;
- environment-variable secret reference;
- exact allowed event types;
- maximum accepted body size.

Raw HMAC secret values are never stored in PostgreSQL, browser-visible models or repository evidence.

Changing the key ID or secret reference automatically disables the endpoint so the new credential cannot become active accidentally.

## Public intake route

Each configured endpoint receives POST requests at:

`/api/webhooks/{endpointKey}`

Required headers:

- `X-Rosevear-Webhook-Contract: rosevear.webhook.v1`
- `X-Rosevear-Webhook-Key-Id`
- `X-Rosevear-Webhook-Event-Id`
- `X-Rosevear-Webhook-Timestamp` — integer milliseconds
- `X-Rosevear-Webhook-Signature` — base64url HMAC-SHA256
- `Content-Type: application/json`

The request signature covers the contract, method, endpoint key, key ID, event ID, timestamp and SHA-256 body hash.

## Event envelope

The JSON body is an exact `rosevear.webhook.event.v1` envelope:

- `schemaVersion`
- `eventId`
- `eventType`
- `occurredAt`
- `sourceApplicationId`
- `tenantId`
- `data`

The event ID in the envelope must exactly match the signed event-ID header.

The source application and tenant must exactly match the configured endpoint. The event type must be in the endpoint's explicit allowlist.

## Replay protection

Build 290 uses `app.webhook_event_nonces` with primary key:

`(endpoint_id, event_id)`

The nonce/event-ID reservation and durable receipt insertion occur in the same database transaction. The reservation uses `ON CONFLICT DO NOTHING`; a repeated event ID is rejected with HTTP 409 and an immutable `webhook_replay_denied` audit row.

The accepted request freshness window is five minutes.

## Bounded request body

The public route streams the request body with a configured per-endpoint bound. The hard platform limit is 262,144 bytes.

Oversize bodies are rejected before JSON parsing.

## Durable receipts

Accepted events create an immutable row in `app.webhook_receipts` containing:

- receipt ID;
- endpoint/workspace identity;
- source/environment/tenant identity;
- event ID/type/time;
- request timestamp;
- body SHA-256;
- payload byte count;
- validated event envelope;
- receipt payload;
- receipt HMAC signature;
- receive timestamp.

The signed receipt returned to the sender is `rosevear.webhook.receipt.v1`.

Receipt signatures use the same configured HMAC key reference as inbound request verification. The key itself is never persisted.

## Audit

`app.webhook_request_audit` preserves accepted and denied decisions for registered endpoints, including:

- event ID/type where known;
- accepted/denied outcome;
- normalized reason code;
- whether identity was cryptographically verified;
- HTTP status;
- timestamp/body hash where available.

No UPDATE or DELETE privilege is granted on receipt, replay or audit evidence.

## RLS

Webhook endpoints, receipts, replay reservations and audit rows use workspace-aware RLS.

The public intake path receives only the exact endpoint row selected by a transaction-local `app.webhook_endpoint_key` setting. Browser/user reads remain bounded by workspace membership.

## Operator center

`/webhook-gateway` shows:

- enabled/disabled endpoint counts;
- endpoint configuration;
- intake URL;
- event allowlist;
- secret reference name;
- recent durable receipts;
- recent accepted/denied intake decisions;
- replay denials.

## Safety boundary

Build 290 does not:

- create endpoints automatically;
- enable endpoints automatically;
- store raw secret values;
- dispatch or fan out accepted events;
- infer owner authorization;
- authorize a cross-app connection;
- resume QL-266.

QL-266 remains `UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED`.

## Next build

**Build 291 — Cross-App Event Bus & Subscription Manager** will turn reviewed Build 290 intake events into governed publish/subscribe flows without direct point-to-point wiring.
