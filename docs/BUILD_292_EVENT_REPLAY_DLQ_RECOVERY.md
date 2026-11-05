# Build 292 — Event Replay, Dead-Letter Queue & Recovery Console

## Purpose

Build 292 adds durable failure recovery to the internal Build 291 event bus without introducing outbound delivery.

The recovery model is append-only. A reviewed internal route failure creates immutable failure evidence and a dead-letter case. A reviewed replay request creates a new internal replay route while preserving the original route, publication, subscription and failure record.

## Failure intake

Owner/admin operators can record a failure against an existing Build 291 event-bus route.

Each failure records:

- original route, publication and subscription;
- category: `transient | permanent | policy | unknown`;
- bounded machine-readable failure code;
- reviewed summary and optional bounded details;
- attempt number;
- actor and timestamp.

A route can have only one open dead-letter case at a time. Attempt numbers are unique per original route.

## Dead-letter queue

Every recorded failure creates a durable `app.event_bus_dead_letters` row.

Dead-letter rows are not updated or deleted by the runtime. Disposition is represented by append-only recovery audit evidence.

## Replay policy

Build 292 deliberately distinguishes retryable failures from failures that require disposition:

- `transient` — replay eligible;
- `unknown` — replay eligible after review;
- `permanent` — not replayable by default;
- `policy` — not replayable by default.

Replay requires:

1. workspace owner/admin authority;
2. an open, non-dismissed dead-letter case;
3. replayable failure category;
4. the original subscription still being active;
5. a reviewed reason;
6. fewer than five prior replays for that dead-letter case.

## Replay behavior

A replay creates:

- an append-only replay request;
- an append-only replay route;
- append-only recovery audit evidence.

Replay routes use `internal-queue`, state `held`, and hold reason:

`recovery-replay-not-authorized`

No replay route is sent over the network in Build 292.

## Recovery console

`/event-recovery` provides:

- recoverable event-bus route inventory;
- reviewed failure intake;
- dead-letter queue;
- replay eligibility and replay-count visibility;
- reviewed replay request controls;
- explicit dead-letter disposition controls;
- held replay-route ledger.

## Security and isolation

All Build 292 tables use workspace RLS. Mutating recovery actions require workspace owner/admin membership.

Runtime roles receive SELECT/INSERT only on failure, dead-letter, replay and recovery-audit evidence. No UPDATE or DELETE grant is introduced on these tables.

## Safety boundary

Build 292 does not:

- run an automatic retry loop;
- send replay traffic to another Rosevear application;
- release held Build 291 routes;
- infer owner authorization;
- create or activate connections;
- resume QL-266.

QL-266 remains `UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED`.

## Next build priority

Per owner direction, the immediate next build is:

**Build 292A — CI Verification Consolidation & Promotion Run Reduction**

Issue: #587.

Build 292A will reduce repeated historical verifier execution while keeping security, migration, integration-boundary and production release checks fail-closed.

After 292A, the connectivity roadmap resumes with:

**Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees**.
