# Build 317 — Event Bus Host Bridge & Subscription Pack

## Purpose

Build 317 turns the existing governed event bus into a reusable host/module capability without changing the proven Build 291 routing rules or Build 293 delivery guarantees.

The bridge is designed for normal application use: a host can prepare an event publication intent, register an exact subscription pack and correlate delivery/replay receipts through one small contract instead of understanding the internal event-bus tables.

## Host event publication adapter

`createHostEventPublicationAdapter()` accepts metadata only:

- host and source application identity;
- host environment;
- exact platform tenant/workspace scope;
- optional event-bus tenant;
- event ID and exact event type;
- SHA-256 body fingerprint;
- occurrence time and audit correlation ID;
- an explicit owner-controlled `event-bus.publish` grant.

Raw event payloads are not accepted by this bridge.

The adapter produces a deterministic idempotency key and a **held** publication intent. It never requests network delivery and never releases routes.

## Subscription registration pack

`createHostSubscriptionRegistration()` prepares a Build 291-compatible subscription identity.

The registration:

- validates source and destination application IDs;
- rejects self-routing;
- preserves tenant/environment scope;
- accepts only exact registered event types;
- starts in `draft`;
- requires an explicit `event-bus.subscriptions.manage` grant;
- requires separate activation through the existing governed event-bus workflow.

There is no auto-activation.

## Exact event-type contracts

Hosts register a bounded contract pack containing an exact event type, schema ID, semantic version and short description.

Wildcards are rejected. Every publication and subscription event type must resolve to one exact registered contract.

## Tenant and environment isolation

Production host context maps only to the production event-bus environment. Development, test and staging map to nonproduction.

Host, platform tenant and workspace scope must match the authorization grant exactly. A mismatched grant fails closed.

## Idempotency and replay-safe receipt correlation

Host publication idempotency keys are deterministic SHA-256 values derived from the exact source/workspace/environment/tenant/event identity and payload fingerprint.

Build 293 remains authoritative for downstream delivery-intent idempotency.

`buildReplaySafeReceiptCorrelation()` binds publication, subscription, destination, route, delivery idempotency key, source receipt and replay number into a deterministic receipt-correlation fingerprint. Replay numbers remain bounded to 0–5.

## Operator usability

The existing `/event-bus` screen now explains the Build 317 host/module pack in plain language and links to the read-only module descriptor at `/api/module-event-bus`.

Operators continue using the same event-bus workbench for reviewed subscriptions, publications and held-route evidence.

## Security boundary

Build 317 does **not**:

- accept raw event payload bodies through the host bridge;
- infer authorization from host identity;
- accept wildcard event types;
- auto-activate subscriptions;
- bypass downstream approval;
- request outbound network delivery;
- release held routes automatically.

The bridge packages existing governed behavior; it does not replace it.

## Next queued build

**Build 318 — Workflow Action Plug-In Interface** remains the next regular product roadmap item.
