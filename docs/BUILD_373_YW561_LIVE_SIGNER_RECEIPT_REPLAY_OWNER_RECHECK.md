# AI Data Platform Build 373 — YW561 Live Source-Health Signer Enrollment Correlation, Exact Signed HEALTHY Receipt Closure, Durable Replay Acceptance & Three-Master Owner Decision Recheck

## Objective

Build 373 turns the Build 372 YW561 evidence intake into a durable controller recheck that answers four separate questions without conflating them:

1. Is a genuine YW561 source-health signer independently enrolled and custody-correlated?
2. Is there an exact current YW561 source-bound signed HEALTHY receipt that AI Data has admitted?
3. Is the durable replay evidence for that exact receipt accepted?
4. Are the AI Hub 309 / Comms QL-417 three-Master runtime gate and an explicit owner decision both satisfied?

The answers remain independent. Code GREEN, Vercel READY and YW561 provider-delivery evidence cannot substitute for any missing source-health or Master runtime evidence.

## Live YW561 observation

Build 373 independently re-observed the existing YW561 production artifact:

- Yard Workers production main: `3ac1bbce127a011af7830ad88da020112d132122`
- Vercel deployment: `dpl_5775v27Ginzas21xz8dP8PT1MUbv`
- deployed manifest revision: `3ac1bbce127a011af7830ad88da020112d132122`
- `source_role=platform_shell`
- `tenant_boundary=platform_shell`
- signature state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection state: `DISCONNECTED / HOLD`

The production artifact is exact, but the live source-health signer still is not present in the controller trust chain.

## Live signer enrollment correlation

Migration `0137_master_yw561_live_signer_receipt_replay_owner_recheck.sql` adds:

`app.master_yw561_live_signer_correlation_events`

A correlation becomes `VERIFIED_CORRELATED` only when the existing controller ledgers contain:

- exactly one active YW source-health signer;
- matching Build 366 committed enrollment/custody intake;
- matching Build 372 custody evidence event;
- identical trusted public SPKI SHA-256 and key ID;
- exact YW561 production revision.

Current state: `HOLD_UNENROLLED`.

No private source signing key is accepted or stored.

## Exact signed HEALTHY receipt closure

Build 373 adds:

`app.master_yw561_exact_health_receipt_closure_events`

The closure points only to an already verified source-health receipt in:

- `app.master_convergence_receipt_ledger`;
- `app.master_source_health_admission_events`.

The receipt must bind both source revision and manifest revision to exact YW561 production main, use the correlated source-health signer, remain current, be HEALTHY, and have a controller `ADMITTED` event.

Current state: `HOLD_NOT_RECEIVED`.

## Durable replay acceptance

Build 373 adds:

`app.master_yw561_durable_replay_acceptance_events`

Replay becomes `ACCEPTED` only when:

- the exact receipt closure is `VERIFIED_CURRENT`;
- a Build 372 replay-correlation event exists for that same exact receipt;
- the Build 372 replay correlation is `VERIFIED_CORRELATED`.

YW561 provider-delivery nonce/replay evidence remains a separate trust domain and cannot satisfy this gate.

Current state: `HOLD_NOT_RECEIVED`.

## Three-Master owner decision recheck

Build 373 adds:

`app.master_yw561_three_master_owner_decision_rechecks`

The source evidence state becomes `READY` only when:

- live YW561 identity = `VERIFIED_EXACT`;
- signer correlation = `VERIFIED_CORRELATED`;
- exact receipt closure = `VERIFIED_CURRENT`;
- durable replay acceptance = `ACCEPTED`.

The owner decision can become `READY_FOR_OWNER_DECISION` only when the three-Master runtime gate is also OPEN.

An owner `ACCEPT` is recognized only when it is already recorded in the owner decision audit for the **exact current YW561 admitted receipt**. An ACCEPT for an older receipt cannot authorize the current receipt.

Build 373 never auto-creates an owner ACCEPT.

## Current Master runtime truth

### Rosevear AI Hub 309

- main: `0a94c72ee4a1ded1babeac68deeb981ad33835ef`
- original Ree-host process witness: HOLD
- source one-TEST: HOLD
- independent receiver-signed ACK: HOLD
- sampled uptime: UNKNOWN
- AI Data owner decision: HOLD
- receiver: OFF
- connection: HOLD
- Masters synced: HOLD
- slave gate: HOLD

### Rosevear Comms Hub QL-417

- main: `6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6`
- original-host telemetry: HOLD
- durable replay admission: HOLD
- signed Comms ACK: HOLD
- owner-decision continuity: HOLD
- uptime: UNKNOWN
- receiver: OFF
- connection: HOLD
- slave gate: HOLD

Therefore the current three-Master runtime gate remains HOLD.

## Current Build 373 result

- live YW561 identity: **VERIFIED_EXACT**
- live source-health signer enrollment correlation: **HOLD_UNENROLLED**
- exact signed HEALTHY receipt closure: **HOLD_NOT_RECEIVED**
- durable source-health replay acceptance: **HOLD_NOT_RECEIVED**
- source evidence state: **HOLD**
- three-Master runtime gate: **HOLD**
- exact-receipt owner decision: **PENDING**
- Build 373 owner-decision state: **HOLD**
- CONNECTED: **not inferred**
- owner acceptance: **not inferred**

## Security boundary

All Build 373 tables are append-only, RLS-protected and owner-recorded. Runtime roles receive SELECT/INSERT only; UPDATE/DELETE remain revoked.

Build 373 does not:

- store source private keys;
- store receiver credentials;
- accept provider-delivery proof as source-health proof;
- accept stale or wrong-revision receipts;
- accept replay for a different receipt;
- reuse an owner ACCEPT from an older receipt;
- infer CONNECTED from deployment state;
- auto-create owner acceptance.
