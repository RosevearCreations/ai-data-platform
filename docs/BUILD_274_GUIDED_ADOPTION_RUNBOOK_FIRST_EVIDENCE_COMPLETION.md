# Build 274 — Guided Adoption Runbook & First-Evidence Completion

## Purpose

Build 274 extends the existing Build 037 first-evidence guidance into the measured completion path defined by Build 273.

The build does **not** create activity merely to satisfy adoption metrics. It reads existing RLS-scoped evidence and guides real work through the existing governed path:

**Collect → Review → Approve → Publish → Deliver**

## Build 274 exit criterion

Build 274 is operationally satisfied only when:

1. at least one authorized workspace has genuine durable operating activity; and
2. every workspace still at measured zero has an explicit safe next action or explicit gate.

A full downstream delivery is **not** required merely to close first-evidence adoption. Provider and consumer-delivery work remain in Builds 275 and 276.

## Completion model

The `/first-evidence` surface now combines:

- profile-aware Build 037 first-evidence steps;
- Build 268 governed workflow-orchestration evidence;
- current durable adoption activity;
- explicit next-action selection;
- stage-by-stage Collect / Review / Approve / Publish / Deliver status;
- the Build 274 exit criterion.

## Safety boundaries

- No synthetic records are created.
- No fake source, barcode, receiver, provider run, review or delivery is generated.
- No approval or publication is automated.
- Browserless remains behind its existing operator gate.
- Integration delivery remains behind simulator/handshake/authorization/idempotency/acknowledgement controls.
- Existing workspace membership and RLS remain authoritative.
- No second evidence store or database migration is introduced.
- QL-266 remains **UNDER_REVIEW**, **REVIEW_DEFERRED**, and **DISCONNECTED**.

## Next build

Build 275 — Provider Pilot Baseline, Cost, Latency & Failure Evidence.
