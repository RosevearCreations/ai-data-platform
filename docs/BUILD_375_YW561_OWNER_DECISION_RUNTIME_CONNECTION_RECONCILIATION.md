# AI Data Platform Build 375 — YW561 Explicit Owner Acceptance Decision Execution, Exact-Receipt Acceptance Continuity, Three-Master Runtime Gate Transition & Connection-State Reconciliation

## Objective

Build 375 turns the Build 374 owner gate into an executable, append-only controller workflow while preserving four independent trust boundaries:

1. an owner decision is executed only against the controller-resolved exact current YW561 receipt;
2. an ACCEPT remains authoritative only while that same receipt, source-health activation and three-Master runtime gate remain current;
3. runtime OPEN/HOLD transitions are recorded chronologically;
4. connection state is reconciled separately and cannot become CONNECTED from code GREEN or owner ACCEPT alone.

## Current production baselines

### Yard Workers YW561

- production main: `3ac1bbce127a011af7830ad88da020112d132122`
- source role: `platform_shell`
- tenant boundary: `platform_shell`
- live source-health signer state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- source connection: `DISCONNECTED / HOLD`

### Rosevear AI Hub

Build 310 is not production at this Build 375 observation. The current production baseline remains Build 309:

- main: `0a94c72ee4a1ded1babeac68deeb981ad33835ef`
- installed release: HOLD
- original-host source one-TEST: HOLD
- signed receiver ACK: HOLD
- sampled uptime: UNKNOWN
- owner decision: HOLD
- receiver: OFF
- connection: HOLD

### Rosevear Comms Hub

The production baseline has advanced to QL-418:

- main: `0cd042d044226848ab50da25a5cc0efc14577e39`
- protected owner/SLA audit: metadata-only
- original-host sample: HOLD
- durable replay admission: HOLD
- independently signed receiver ACK: HOLD
- owner acceptance: HOLD
- runtime uptime: UNKNOWN
- receiver: OFF
- connection: HOLD

QL-418 explicitly says code GREEN is not proof of CONNECTED or owner acceptance.

## Explicit owner decision execution

Build 375 adds:

`app.master_yw561_owner_decision_execution_events`

The owner API action `execute-owner-decision` accepts only `ACCEPT` or `REJECT`.

The client does not select a receipt ID. The controller resolves the exact current receipt from the trusted source-health ledger at decision time.

An ACCEPT is rejected unless all of these are true at execution time:

- an exact current YW561 receipt exists;
- source-health activation is `ACTIVE`;
- the three-Master runtime gate is `OPEN`;
- the receipt remains the exact controller-current receipt;
- the exact receipt is not already the latest accepted receipt.

The decision is written both to the existing `app.master_owner_decision_audit` and the Build 375 execution ledger in the same database transaction.

REJECT is also receipt-bound. It requires an exact current receipt but does not pretend the technical gates are open.

## Exact-receipt acceptance continuity

Build 375 adds:

`app.master_yw561_acceptance_continuity_events`

Continuity can be:

- `ACTIVE`
- `REJECTED`
- `HOLD_NO_CURRENT_RECEIPT`
- `HOLD_SOURCE_HEALTH`
- `HOLD_MASTER_GATE`
- `HOLD_RECEIPT_CHANGED`
- `HOLD_NO_ACCEPT`

A historical ACCEPT for a different receipt is never carried forward. If the current receipt changes, the new receipt requires its own explicit owner decision.

If source-health activation falls back to HOLD or the three-Master runtime gate closes, acceptance continuity stops even though the historical audit record remains intact.

## Three-Master runtime gate transition

Build 375 adds:

`app.master_yw561_runtime_gate_transition_events`

Each reconciliation records the previous and current gate and one of:

- `INITIAL_OPEN`
- `INITIAL_HOLD`
- `HOLD_TO_OPEN`
- `OPEN_TO_HOLD`
- `UNCHANGED_OPEN`
- `UNCHANGED_HOLD`

The current live gate remains **HOLD** because AI Hub 309 and Comms QL-418 still lack the required authenticated original-host/runtime closure evidence.

## Connection-state reconciliation

Build 375 adds:

`app.master_yw561_connection_reconciliation_events`

Connection state is distinct from owner acceptance.

Possible controller states are:

- `DISCONNECTED_HOLD`
- `READY_FOR_VERIFIED_CONNECTION`
- `CONNECTED_VERIFIED`

`CONNECTED_VERIFIED` requires all of the following:

- exact-receipt acceptance continuity = `ACTIVE`;
- current three-Master runtime gate = `OPEN`;
- source reports a non-HOLD, non-DISCONNECTED current connection state;
- independent current connection evidence is verified.

Build 375 does not expose a browser action that can simply set independent connection evidence to true. The current database reconciliation therefore records that evidence as false unless a future trusted ingestion path supplies independently authenticated proof.

## Current Build 375 result

- exact current source-health receipt: **NONE**
- owner decision execution: **HOLD_NO_CURRENT_RECEIPT**
- acceptance continuity: **HOLD_NO_CURRENT_RECEIPT**
- three-Master runtime gate: **HOLD**
- runtime transition: **INITIAL_HOLD** before the first persisted Build 375 reconciliation
- observed source connection: **DISCONNECTED / HOLD**
- connection reconciliation: **DISCONNECTED_HOLD**
- CONNECTED: **false**

## Security boundary

All Build 375 tables are append-only, RLS-protected and owner-recorded. Runtime roles receive SELECT/INSERT only; UPDATE/DELETE remain revoked.

Build 375 does not store source private keys, receiver credentials or customer payloads; does not accept a browser-supplied receipt ID for owner acceptance; does not carry ACCEPT to a replacement receipt; does not allow code GREEN to open the runtime gate; and does not infer CONNECTED from owner ACCEPT.
