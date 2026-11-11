# AI Data Platform Build 365 — Trusted Source Signer Registry, Durable Convergence Receipt Ledger, Replay/Aging Evidence & Owner Decision Audit Trail

## Objective

Build 365 makes the Build 364 receiving boundary durable without weakening the truth boundaries established by Builds 362–364.

It adds three append-only PostgreSQL evidence stores:

1. independently verified public Ed25519 signer-registry events;
2. verified source-bound convergence receipts with durable nonce uniqueness and aging evidence;
3. explicit owner decision events.

Private signing keys are never stored by AI Data.

## Reconciled source handoffs

### Yard Workers

- source: `yw` / `yard-workers`
- production main: `0010bbd5ae71cb025d77e613cce9bc6e3f064d34`
- revision: `VERIFIED`
- deployed manifest: `DEPLOYMENT_BOUND_UNSIGNED`
- tenant boundary: `PRESERVED`
- independent source signer: `HOLD_UNENROLLED`
- genuine signed HEALTHY receipt: `HOLD`
- source durable replay proof: `HOLD`
- connection: `HOLD`
- owner acceptance: `HOLD`
- credentials exposed: `NONE`

The prior Build 363 controller snapshot was stale and is updated to the current production revision. No receipt for the historic SHA may be accepted.

### iCamp

- source: `icamp`
- production main: `00112c6714ecdf4d49dc114d4b29a0a8b9a8bced`
- revision: `VERIFIED`
- deployed manifest: `MATCHED`
- tenant boundary: `PRESERVED`
- independent source signer: `HOLD_UNENROLLED`
- genuine signed HEALTHY receipt: `HOLD`
- source durable replay proof: `HOLD`
- connection: `HOLD`
- owner acceptance: `HOLD`
- credentials exposed: `NONE`

Build 241 confirms that the iCamp source-signer callbacks are not installed and no independent source signer currently exists.

## Trusted source signer registry

`app.master_source_signer_registry_events` is append-only.

Only a suite owner may insert enrollment or revocation events. Enrollment accepts a public Ed25519 key only after the application validates the key type and computes its SPKI SHA-256 fingerprint. A receipt cannot establish trust by supplying its own public key.

Private keys are never accepted or stored.

## Durable convergence receipt ledger

`app.master_convergence_receipt_ledger` stores only receipts that pass Build 364 source-bound verification against a separately enrolled trusted signer.

The durable ledger enforces:

- exact source identity and handoff token;
- exact current production source revision;
- exact manifest and health revision convergence;
- Ed25519 signature verification;
- fresh receipt and health timestamps;
- `HEALTHY` source-bound runtime evidence;
- unique `(source_id, nonce)` replay protection;
- unique receipt SHA-256.

Receipt age is projected as:

- `CURRENT`: at most 15 minutes old;
- `AGED`: over 15 minutes and at most 24 hours;
- `EXPIRED`: over 24 hours.

Aged or expired evidence cannot authorize owner acceptance.

## Owner decision audit trail

`app.master_owner_decision_audit` is append-only and owner-only for inserts.

Decisions are `HOLD`, `ACCEPT`, or `REJECT`.

An `ACCEPT` decision requires a verified durable receipt and remains fail-closed while the three-Master runtime gate is not synchronized. Build 365 cannot auto-accept an owner decision.

## Runtime authority

The runtime role receives `SELECT, INSERT` only on all three Build 365 evidence stores. `UPDATE` and `DELETE` are revoked.

Build 365 does not:

- create or host source private keys;
- infer signed health from Vercel/GitHub GREEN;
- infer connection acceptance from source health;
- treat a source-supplied public key as its own trust anchor;
- bypass Master synchronization;
- auto-accept an owner decision;
- elevate Camp Rosevear or Rosevear Landscaping into source identities.

## Current truthful state

Revision convergence is now current for Yard Workers and iCamp.

Both remain:

- trusted source signer: not enrolled;
- signed health receipt: not received;
- owner acceptance: HOLD;
- connection: HOLD.

Build 365 therefore remains a durable evidence-control improvement, not a connection-activation claim.
