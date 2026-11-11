# AI Data Platform Build 367 — Verified Source Signer Evidence Reception, Signed Health Admission Reconciliation, Master-Gate Owner Review Packet & Explicit Acceptance Decision

## Purpose

Build 367 is the supervised decision layer above Builds 365 and 366. It does not manufacture trust. It consumes already recorded signer and signed-health evidence, reconciles that evidence against the **current** source revisions and the newest Master acknowledgements, prepares an append-only owner review packet, and records an explicit owner HOLD / ACCEPT / REJECT decision.

## Current Master acknowledgements

### Rosevear AI Hub

`MASTER360-AIHUB-307-ACK`

- source main: `34e017dcf0586a7281d8726d5e8fb4a4a7054526`
- source dev: `bf784820d454be4f59f7b731450101353045d347`
- code: GREEN
- installed release: HOLD
- durable monitoring: CODE_READY_RUNTIME_HOLD
- source/Comms chain: CODE_READY_QL414_NOT_INSTALLED
- AI Data receipt: CODE_READY_RUNTIME_HOLD
- Comms ACK: HOLD
- automation host: `DESKTOP-AE894KC_ONLY`
- receiver: OFF
- connection: HOLD
- Master sync: HOLD

### Rosevear Comms Hub

`MASTER360-COMMS-QL415-ACK`

- main: `8c2d488582801e8abc5ca718b4719c615863274c`
- code: GREEN
- runtime telemetry: HOLD_NO_ORIGINAL_HOST_OBSERVATION
- installed release: HOLD
- signer custody: HOLD_NOT_INDEPENDENTLY_WITNESSED
- receiver-signed ACK: HOLD
- durable replay: CODE_READY_RUNTIME_HOLD
- uptime: UNKNOWN
- owner decision: HOLD
- receiver: OFF
- connection: HOLD

Therefore Build 367's current three-Master gate is **HOLD**.

## Current source reconciliation

### Yard Workers

- production main: `0010bbd5ae71cb025d77e613cce9bc6e3f064d34`
- manifest mode: deployment-bound
- signer: HOLD / not independently enrolled
- current admitted signed HEALTHY receipt: not received
- connection: DISCONNECTED / HOLD

### iCamp

- production main: `7408a66dfa2c70e1de6b358356b7f9e9dc6cb13b` (Build 242)
- checked-in manifest revision: `e2d343595363ca9106e7f1dbc60006e3a6c616aa`
- manifest convergence: HOLD_MANIFEST_STALE
- signer: HOLD / not independently enrolled
- current admitted signed HEALTHY receipt: not received
- connection: DISCONNECTED / HOLD

The Build 367 model intentionally supersedes the older Build 365 iCamp production snapshot for **current decision-making only**. Historical Build 363–366 evidence remains historical and is not rewritten.

## Owner review packet

`app.master_source_owner_review_packets` stores append-only snapshots containing:

- current source production revision;
- current manifest revision state;
- enrolled signer key ID/state;
- admitted receipt ID/state;
- health admission event;
- Master gate state;
- exact Master snapshot;
- blockers;
- packet state: `HOLD` or `READY_FOR_OWNER_DECISION`.

A packet is READY only when:

1. source revision is current;
2. exactly one trusted source signer is enrolled;
3. a current admitted signed HEALTHY receipt matches the exact current production revision;
4. the three-Master gate is OPEN.

## Explicit decision

`app.master_source_acceptance_decision_events` stores append-only owner decisions.

- HOLD may be recorded while blockers remain.
- REJECT may be recorded while blockers remain.
- ACCEPT is rejected unless the packet was READY **and is still current at decision time**.

For ACCEPT, Build 367 re-reads all live database evidence and verifies:

- packet source revision still equals current source production;
- packet receipt is still the newest verified current receipt;
- source signer remains trusted and unambiguous;
- signed health admission remains current;
- Master gate is still OPEN.

Only then does it append both the Build 367 decision event and the existing Build 365 owner-decision audit record.

## Security boundaries

Build 367:

- does not accept or store source private keys;
- does not treat Vercel/GitHub GREEN as runtime evidence;
- does not auto-release HOLD;
- does not infer connection from source health;
- does not allow an aged or old-revision receipt to authorize ACCEPT;
- does not allow an old READY packet to authorize ACCEPT after evidence changes;
- does not allow child tenants to become Master source identities;
- preserves owner-only packet creation and decision authority.
