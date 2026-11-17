# AI Data Platform Build 415

**Live Evidence Freshness, Expiry SLA & Cross-Application Renewal Control**

Build 415 adds a fail-closed evidence-aging layer across all seven applications without changing the authority of any source application.

## Freshness matrix

The system tracks seven evidence domains for each of the seven applications, producing 49 required freshness slots:

- SOURCE_RUNTIME
- COMPLETION
- SECURITY
- COMMUNICATIONS
- ACCESSIBILITY_DEVICE
- PERFORMANCE_UX
- PRIVILEGED_RECOVERY

Each domain has a bounded maximum freshness window, a renewal lead window and an urgent renewal window.

The deterministic states are:

- FRESH
- DUE_SOON
- DUE_NOW
- EXPIRED
- MISSING
- INVALID

A receipt whose expiry exceeds the allowed SLA is INVALID rather than artificially extended.

## Renewal control

Owner and operator Sysops may queue a renewal request. The request stores only a SHA-256 reason digest and is append-only.

A renewal request is an intent, not evidence. The source application retains evidence authority and must produce a new independently verified receipt before freshness can improve.

Rosevear Comms Hub remains the delivery authority for governed cross-application handoff. No direct peer database write is introduced.

## Durable evidence

Migration 0178 adds forced-RLS ledgers for:

- freshness observations
- renewal requests
- renewal receipts
- expiry alerts

Normal runtime can read the ledgers and queue renewal requests. Protected runtime admits source/worker observations, receipts and alerts. Update/delete remains revoked.

## Release boundary

Production GREEN means the Build 415 software and migration are released successfully. It does not mean all 49 slots are fresh, all renewal work completed, or any peer/source physically performed an action.

Missing, stale, expired or invalid evidence remains visibly unresolved.
