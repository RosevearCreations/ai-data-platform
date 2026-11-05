# Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees

## Purpose

Build 293 prevents duplicate internal cross-app delivery intent across retries and preserves exactly-once intent without claiming exactly-once external side effects.

## Delivery identity

Each logical delivery is identified by a deterministic SHA-256 key derived from workspace, publication, subscription, and destination application.

The key deliberately excludes the route or replay identifier. An original route and all reviewed replay routes therefore resolve to the same logical delivery intent.

The database enforces one intent for the logical tuple and one unique idempotency key.

## Attempt reservations

Each source route receives one deterministic attempt-reservation key.

- original route = attempt ordinal 1;
- replay 1–5 = attempt ordinals 2–6;
- each original route can have at most one reservation;
- each replay route can have at most one reservation;
- repeated reservation requests return the existing reservation and create immutable duplicate-suppression evidence.

This gives **at-most-once reservation per source route** while preserving **exactly-once internal logical intent** across retries.

## Transaction boundary

New Build 291 routes call the Build 293 guarantee service before the event-bus transaction commits.

New Build 292 replay routes call the same service before the replay transaction commits.

A route or replay therefore cannot be committed successfully through those application paths without its idempotency intent and attempt reservation also succeeding.

## Existing route reconciliation

The /delivery-guarantees console provides an owner/admin action to reconcile held routes created before Build 293.

Reconciliation scans held original and replay routes, creates missing intents and reservations, suppresses repeated reservations deterministically, and records immutable reconciliation evidence.

It performs no external request and releases no route.

## Database evidence

Migration 0096_event_idempotency_delivery_guarantees.sql adds:

- app.event_bus_delivery_intents;
- app.event_bus_delivery_attempt_reservations;
- app.event_bus_duplicate_decisions;
- app.event_bus_delivery_guarantee_audit.

All four tables use RLS. Runtime access is SELECT/INSERT only; no UPDATE or DELETE grant is introduced.

## Guarantee boundary

Build 293 guarantees deterministic logical-delivery identity, exactly-once **internal intent**, at-most-once attempt reservation per original/replay route, duplicate-attempt suppression, and immutable audit evidence.

Build 293 explicitly does **not** guarantee exactly-once external side effects. It has no outbound delivery worker and does not release held routes.

QL-266 remains UNDER_REVIEW; external test REVIEW_DEFERRED; connection DISCONNECTED. External requests remain 0 and live exchanges remain 0.

## CI

Build 293 is added to the compact Build 292A integration spine and the production build gate. The compact database verifier now includes the four Build 293 tables and requires migration 0096.

## Next build

**Build 294 — Shared Customer & Contact Identity Resolution**.
