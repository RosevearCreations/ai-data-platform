# Build 322 — Webhook, Callback & Inbound Endpoint Module

## Purpose

Build 322 packages Build 290 webhook intake as a host-installable AI Data Platform module capability.

Build 290 remains authoritative for HMAC verification, bounded request bodies, freshness, event validation, atomic replay suppression and immutable receipts. Build 322 adds portable registration/evidence contracts, durable callback-route metadata, receipt search, host event translation and irreversible endpoint revocation.

## Endpoint registration

Authenticated workspace owners/admins can register a host endpoint through:

`POST /api/module-inbound-endpoints/manage`

Registration reuses Build 290 and still creates the endpoint disabled.

The module may additionally bind:

- callback application ID;
- relative callback path.

Callback metadata is routing evidence only. It does not cause an outbound request.

## Signing and verification references

Endpoint evidence exposes:

- `rosevear.webhook.v1`;
- HMAC-SHA256;
- key ID;
- environment-variable secret reference;
- five-minute timestamp skew;
- endpoint body-size limit.

Raw secret values are never returned or accepted by the module registry/management response.

## Nonce and replay protection

Build 322 preserves Build 290's authoritative replay boundary:

- endpoint ID + event ID reservation;
- atomic `ON CONFLICT DO NOTHING`;
- HTTP 409 replay denial;
- immutable replay audit evidence.

The module does not create a weaker parallel replay store.

## Callback routing

Callback routing is stored on the endpoint as:

- destination host application ID;
- relative callback path;
- environment;
- tenant.

Routes are reported as ready, disabled or revoked.

A ready route is still **held metadata**. Build 322 performs no callback network request. Build 323 owns transport selection.

## Host event translation

`translateWebhookReceiptToHostEvent()` translates an accepted Build 290 receipt and its validated event envelope into:

`rosevear.ai-data-platform.host-inbound-event.v1`

The translation preserves:

- receipt and endpoint identity;
- source application;
- environment and tenant;
- event ID/type/time;
- body SHA-256;
- validated event data;
- callback-route evidence.

Translation does not publish to the event bus and does not call the host callback.

## Receipt search

Authenticated members may search workspace-scoped durable receipts by bounded filters including:

- workspace;
- endpoint;
- receipt ID;
- event ID;
- event type;
- source application;
- environment;
- tenant.

Results remain subject to existing workspace RLS.

## Disable and revoke

Disable is reversible and uses the existing Build 290 enabled flag.

Revocation is a distinct durable state added by migration `0108_webhook_callback_inbound_endpoint_module.sql`.

Revocation:

- forces `enabled=false`;
- records revocation time and actor;
- preserves endpoint/receipt/audit evidence;
- prevents the endpoint from being enabled or edited again;
- requires a new endpoint registration for future intake.

No DELETE privilege is introduced.

## Environment-specific endpoint evidence

Every module endpoint evidence package includes:

- Build 290 environment;
- source application and tenant;
- enabled/revoked state;
- key ID and secret reference name;
- callback route;
- allowlisted event types;
- timestamps;
- deterministic SHA-256 evidence fingerprint.

Environment evidence never proves remote connection availability.

## Discovery and management APIs

Read-only descriptor:

`GET /api/module-inbound-endpoints`

Authenticated management:

`GET /api/module-inbound-endpoints/manage`

`POST /api/module-inbound-endpoints/manage`

`PATCH /api/module-inbound-endpoints/manage`

The public signed intake remains:

`POST /api/webhooks/{endpointKey}`

## Security boundary

Build 322 does not:

- store or return raw HMAC secrets;
- weaken Build 290 replay/freshness validation;
- automatically enable a registered endpoint;
- reactivate a revoked endpoint;
- delete endpoint or receipt evidence;
- dispatch callbacks;
- publish host translations to the event bus;
- treat endpoint presence as connection activation;
- infer owner authorization from endpoint state.

## Next queued build

**Build 323 — Secure Local/Cloud Relay & Transport Selection** remains the next regular product roadmap item.
