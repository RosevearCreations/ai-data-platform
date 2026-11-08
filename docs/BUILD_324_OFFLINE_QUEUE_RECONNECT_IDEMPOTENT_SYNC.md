# Build 324 — Offline Queue, Reconnect & Idempotent Synchronization

## Purpose

Build 324 lets host/module integrations survive temporary connectivity loss without duplicating consequential work or inventing remote success.

It builds on:

- Build 293 deterministic idempotency guarantees;
- Build 323 secure transport selection.

The Build 324 queue is host-local and migration-free. It is not a second platform connection database.

## Bounded offline queue

`apps/web/lib/offline-sync-queue.ts` provides a host-neutral queue with:

- maximum 200 pending items;
- default 24-hour expiry;
- maximum seven-day expiry;
- maximum five attempts;
- deterministic logical idempotency keys;
- duplicate enqueue suppression.

Every item stores only reference metadata:

- destination application;
- logical operation ID;
- operation name;
- payload reference;
- payload SHA-256;
- optional remote-version precondition SHA-256;
- idempotency key;
- timestamps/state/attempt evidence.

Raw payload bodies are not stored by the queue.

## Encrypted-at-rest local metadata

Storage is supplied through `OfflineQueueStorageAdapter`.

Adapters declare whether encryption at rest is supported.

When supported, every save is requested with:

`requireEncryptionAtRest: true`

When unsupported, the queue remains reference-only and explicitly reports:

`unsupported-reference-only`

Build 324 does not silently label unencrypted storage as encrypted.

## Reconnect detection

`OfflineReconnectDetector` records:

- initial online/offline state;
- unchanged observations;
- went-offline;
- reconnected.

Reconnect transitions queued-offline items to `ready` only.

It does **not** send them.

Going offline moves ready work back to `queued-offline`.

## Idempotency keys

Each logical queue item gets one deterministic SHA-256 idempotency key based on:

- host application/instance;
- environment;
- workspace/tenant;
- destination application;
- logical operation ID;
- operation;
- payload SHA-256.

The key is preserved unchanged across retry preparation and manual retry.

A duplicate enqueue returns the existing queue item instead of creating a second intent.

## Synchronization handoff

`prepareNextSynchronization()` requires:

- current online state;
- a selected Build 323 secure transport;
- fresh, non-expired work;
- remote-version evidence when the queue item carries a precondition.

It returns a handoff containing:

- item ID;
- operation;
- payload reference/hash;
- exact idempotency key;
- chosen transport and selection evidence;
- next attempt ordinal;
- expiry.

The handoff explicitly says:

- independent authorization is required;
- the queue performed no network request;
- remote success is not assumed.

## Conflict detection

When an item contains `preconditionVersionSha256`, reconnect synchronization requires a remote-version SHA-256.

A mismatch moves the item to `conflict` for manual review.

Missing precondition evidence holds the item without sending.

## Ambiguous outcomes

After an attempt begins, outcomes are explicit:

- acknowledged success;
- remote rejected;
- transport definitely not started;
- remote outcome unknown.

Only acknowledged success with:

- a remote receipt ID; and
- the exact echoed idempotency key

can mark an item `confirmed`.

If a process restarts while an item is `syncing`, initialization converts it to `review-required` with `interrupted-attempt-outcome-unknown`.

Unknown remote outcomes never auto-retry.

## Manual review

Manual review may:

- retry with the **same** idempotency key;
- cancel/expire the work;
- mark confirmed only when a genuine remote receipt plus exact idempotency-key echo is supplied.

Attempt limits remain enforced.

## Stale item expiry

Expired work is marked `expired` and cannot be prepared for synchronization.

Offline mode never refreshes expiry automatically.

## Queue health metrics

The queue reports:

- total/pending counts;
- offline/ready/syncing/review/conflict/expired/confirmed counts;
- capacity usage;
- oldest pending age;
- online state;
- reconnect count and latest reconnect;
- storage-encryption state.

Metrics explicitly report that raw payloads are not stored and ambiguous outcomes are not auto-retried.

## Discovery API

`GET /api/module-offline-sync`

publishes non-secret module metadata and safety rules.

It does not create a queue, send work, select a transport or grant authorization.

## Security boundary

Build 324 does not:

- store raw payload bodies;
- invent successful remote execution while offline;
- treat reconnect as authorization;
- perform network requests from the queue;
- retry an ambiguous remote outcome automatically;
- change the idempotency key on retry;
- bypass Build 323 transport selection;
- bypass independent operation authorization;
- confirm success without a remote receipt and exact idempotency-key echo.

## Next queued build

**Build 325 — Autonomous Module Supervisor V1** remains the next regular product roadmap item.
