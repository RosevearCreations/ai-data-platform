# AI Data Platform Build 371 — Yard Workers Product-Shell Identity Reconciliation, Independent Source Signer Enrollment Closure, Fresh Signed Health Receipt Admission & Three-Master Runtime Discrepancy Resolution

## Objective

Build 371 consumes the newly promoted Yard Workers YW371 production state and updates AI Data's controller truth without converting deployment success into runtime trust.

It closes the Build 370 Yard Workers product-shell identity discrepancy, then independently rechecks:

- controller-trusted YW Ed25519 signer enrollment;
- source signer custody/pin/witness correlation;
- exact current signed HEALTHY receipt admission;
- AI Hub 309 / Comms QL-417 three-Master runtime evidence;
- explicit owner-decision readiness.

## Yard Workers YW371 production observation

AI Data independently observed the exact YW371 production deployment:

- YW production main: `fee921c01a1bcbcb4679ef9a0f6b36d0f29aeaea`
- Vercel deployment: `dpl_Hkpr2tgGBEBHRCz5YZiaRuChY9jH`
- deployed manifest revision: `fee921c01a1bcbcb4679ef9a0f6b36d0f29aeaea`
- `source_id=yw`
- `source_app_id=yard-workers`
- `source_role=platform_shell`
- `tenant_boundary=platform_shell`
- signature state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection state: `DISCONNECTED / HOLD`

This resolves the Build 370 `business_shell` vs `platform_shell` discrepancy.

The Yard Workers product source is now independently verified as the platform shell and does not use the Rosevear Landscaping child workspace as the Master source identity.

## Independent signer enrollment closure

Build 371 reads only controller-owned trust ledgers:

- `app.master_source_signer_registry_events`
- `app.master_source_signer_enrollment_intake_events`

A YW signer is `VERIFIED_CORRELATED` only if:

1. exactly one active YW signer is enrolled;
2. a matching `ENROLLMENT_COMMITTED` intake exists;
3. computed SPKI SHA-256 equals the independent pin and registry fingerprint;
4. pin, custody and witness evidence references are present and distinct.

The live YW371 manifest still reports `AWAITING_INDEPENDENT_SOURCE_SIGNER`, and no independently enrolled controller signer/custody chain is currently present. Therefore the current signer state remains `HOLD_UNENROLLED`.

No private source signing key is accepted, generated, copied or stored by AI Data.

## Fresh signed HEALTHY admission

Build 371 accepts a current YW receipt only from the existing trusted controller ledgers.

The latest receipt must:

- use the exact YW371 production revision;
- use the exact deployed manifest revision;
- use the independently enrolled trusted YW signer;
- remain within the freshness window;
- be HEALTHY;
- have a matching `ADMITTED` health-admission event for the exact receipt.

Current state: `HOLD_NOT_RECEIVED`.

Repository GREEN, Vercel READY and the public discovery manifest do not substitute for a source-bound signed runtime receipt.

## Three-Master runtime discrepancy recheck

Current Master baselines remain:

### Rosevear AI Hub 309
- ACK: `MASTER360-AIHUB-309-ACK`
- main: `0a94c72ee4a1ded1babeac68deeb981ad33835ef`
- installed original-host process witness: HOLD
- source one-TEST: HOLD
- receiver-signed ACK: HOLD
- sampled uptime: UNKNOWN
- AI Data owner decision: HOLD
- receiver: OFF
- connection: HOLD
- Masters synced: HOLD
- slave gate: HOLD

### Rosevear Comms Hub QL-417
- handoff: `MASTER360-COMMS-QL417-HANDOFF`
- main: `6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6`
- original-host telemetry: HOLD
- durable replay admission: HOLD
- signed Comms ACK: HOLD
- owner-decision continuity: HOLD
- uptime: UNKNOWN
- receiver: OFF
- connection: HOLD
- slave gate: HOLD

Therefore Build 371 resolves the Yard Workers **source-identity discrepancy**, but the three-Master runtime discrepancy remains HOLD until genuine original-host/runtime evidence arrives.

## Durable Build 371 evidence

Migration `0135_master_yw_source_resolution.sql` adds:

`app.master_yw_source_resolution_events`

The append-only event links the Build 371 result to the existing Build 370 ledgers:

- deployed manifest observation;
- signer custody correlation;
- fresh receipt admission closure;
- three-Master runtime decision recheck.

Each event stores the exact YW371 production revision, source role, tenant boundary, signer state, receipt state, Master gate state, resolution state and blocker snapshot.

RLS is enabled and forced. Runtime roles have SELECT/INSERT only. UPDATE/DELETE remain revoked.

## Current Build 371 result

- YW product-shell identity: **VERIFIED_EXACT**
- old Build 370 role mismatch: **RESOLVED**
- YW independent signer enrollment/custody: **HOLD_UNENROLLED**
- YW current admitted signed HEALTHY receipt: **HOLD_NOT_RECEIVED**
- YW source closure: **HOLD**
- AI Hub 309 / Comms QL-417 three-Master runtime gate: **HOLD**
- Build 371 resolution: **SOURCE_IDENTITY_RESOLVED_RUNTIME_HOLD**
- CONNECTED: **not inferred**
- owner acceptance: **not inferred**

## Next source handoff

After a real independently controlled YW source signer is enrolled and a genuine current source-bound HEALTHY receipt is produced, return only sanitized public evidence to AI Data. Never send the private signing key or passphrase.

Build 371 remains fail-closed until controller-owned signer/custody evidence, exact receipt admission, and the three-Master runtime gate are independently verified.
