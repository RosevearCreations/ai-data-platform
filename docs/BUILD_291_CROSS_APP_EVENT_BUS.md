# Build 291 — Cross-App Event Bus & Subscription Manager

## Purpose

Build 291 turns reviewed Build 290 webhook receipts into governed internal publish/subscribe routing without creating direct point-to-point application wiring.

The event bus is workspace scoped. It supports explicit subscriptions, explicit publication of reviewed webhook receipts, deterministic matching, durable publication evidence and durable held routes.

## Subscription lifecycle

Owners/admins create subscriptions as **drafts**. A subscription records:

- workspace;
- optional source application filter;
- destination application;
- environment;
- optional tenant filter;
- exact allowed event types;
- delivery mode `internal-queue`;
- state `draft | active | paused`.

A draft does not match publications. Activation is a separate explicit owner/admin action.

## Publication source

Build 291 publishes only durable Build 290 rows from `app.webhook_receipts`.

Publishing is an authenticated owner/admin action. The event bus does not accept arbitrary browser payloads or create synthetic events.

Each webhook receipt can create at most one bus publication.

## Deterministic matching

An active subscription matches only when:

1. workspace is the same;
2. environment is identical;
3. source application is either unrestricted or an exact match;
4. tenant is either unrestricted or an exact match;
5. event type is an exact member of the subscription allowlist;
6. destination application is not the event source.

The shared matcher lives in `apps/web/lib/event-bus-core.ts` and is verified by the Build 291 acceptance gate.

## Durable held routes

Each matching subscription creates one durable route with unique key:

`(publication_id, subscription_id)`

Build 291 stores routes as:

- delivery mode: `internal-queue`;
- state: `held`;
- hold reason: `delivery-not-authorized`.

This means Build 291 proves publish/subscribe routing without implying external delivery authorization.

## Audit

`app.event_bus_audit` records:

- subscription creation;
- subscription state changes;
- receipt publication;
- route enqueue;
- publication with no matching subscription.

Runtime roles do not receive DELETE privileges for subscriptions, publications, routes or audit evidence. Publications, routes and audit rows are append-only to the application runtime.

## RLS

All Build 291 tables use workspace membership RLS.

Subscription creation/updates and publication/routing require owner/admin membership in the workspace.

## Operator center

`/event-bus` provides:

- subscription counts and active state;
- draft subscription creation;
- explicit activate/pause controls;
- unpublished Build 290 receipt review;
- explicit receipt publication;
- durable held route inspection.

## Safety boundary

Build 291 does not:

- send a network request to another Rosevear application;
- infer owner authorization;
- create a live connection;
- auto-activate subscriptions;
- publish arbitrary client-provided events;
- release held routes;
- resume QL-266.

QL-266 remains `UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED`.

## CI consolidation finding

The repository currently has one GitHub Actions workflow, but its verification commands have accumulated hundreds of historical build verifiers. That causes the same broad verification surface to run repeatedly across promotion steps.

Recommended near-term follow-up:

**Build 292A — CI Verification Consolidation & Promotion Run Reduction**

The intended outcome is a compact required-check matrix, reusable verifier groups, changed-surface targeting where safe, and one authoritative promotion gate instead of repeatedly invoking the entire historical verifier chain.

## Next build

**Build 292 — Event Replay, Dead-Letter Queue & Recovery Console** will add governed replay and failure recovery for durable event-bus routes while preserving the no-implicit-live-delivery boundary.
