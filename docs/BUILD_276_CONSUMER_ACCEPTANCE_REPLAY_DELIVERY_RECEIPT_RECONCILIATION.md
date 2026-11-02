# Build 276 — Consumer Acceptance, Replay & Delivery Receipt Reconciliation

## Purpose

Build 276 reconciles the existing integration simulator, delivery-event history, publication delivery receipts and controlled-live delivery ledger without creating or sending a synthetic package.

## Evidence classes

The reconciliation keeps three classes separate:

1. **Conformance acceptance** — local receiver-contract evidence only.
2. **Live dry-run acceptance** — an authenticated external consumer acknowledgement where `dryRun=true`; still not a live mutation.
3. **Controlled-live acceptance** — accepted evidence from `workspace_publication_live_deliveries`, gated by the existing live activation, dry-run receipt and idempotency requirements.

Conformance success and live dry-run success are never counted as controlled-live acceptance.

## Replay and receipt evidence

Build 276 retains:

- conformance duplicate rejection evidence;
- live replay-key / idempotency-key equality;
- repeated controlled-live attempt counts;
- append-only publication delivery receipts;
- controlled-live acknowledgement payload presence;
- delivery rejection and transport-error evidence.

The controlled-live contract remains:

- idempotency key source = `replayKey`;
- duplicate behavior = `return-original-ack`.

## Build 276 exit criterion

The evidence criterion is met only when at least one supported consumer has accepted controlled-live delivery evidence and every accepted controlled-live row has a durable acknowledgement payload.

A conformance-only or dry-run-only system remains visibly open rather than being promoted as live consumer acceptance.

## Safety boundaries

- The reconciliation reader performs no network request.
- No delivery is initiated by Build 276.
- No consumer configuration is changed.
- No live activation is created or extended.
- No replay key is regenerated.
- No receipt is manufactured.
- Existing RLS/workspace membership remains authoritative.
- QL-266 remains **UNDER_REVIEW**, **REVIEW_DEFERRED**, and **DISCONNECTED**.

## Next build

Build 277 — Retention Cleanup Readiness & Storage Budget Reconciliation.
