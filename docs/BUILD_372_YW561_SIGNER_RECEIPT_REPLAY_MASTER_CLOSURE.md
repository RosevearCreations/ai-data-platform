# AI Data Platform Build 372 — Yard Workers Independent Signer Custody Evidence Intake, Exact YW561 Signed Health Receipt Admission, Durable Replay Correlation & Three-Master Runtime Closure Recheck

## Objective

Build 372 refreshes the controller baseline from the earlier YW371 source revision to the newly promoted Yard Workers YW561 production release, then keeps source-health trust, provider-delivery trust, and Master runtime trust separate.

The Build 372 path is:

1. independently observe the exact YW561 deployed platform-shell manifest;
2. correlate only the independently enrolled AI Data source-health signer and custody chain;
3. require an exact current YW561 source-bound signed HEALTHY receipt already admitted by the controller;
4. correlate durable source-health replay evidence to that exact receipt and its controller nonce ledger;
5. recheck the current AI Hub 309 / Comms QL-417 three-Master runtime closure gate.

No source private key, provider receiver token, Supabase service key, customer record, raw telemetry or owner secret is accepted by Build 372.

## YW561 production baseline

Current Yard Workers production:

- main: `3ac1bbce127a011af7830ad88da020112d132122`
- Vercel deployment: `dpl_5775v27Ginzas21xz8dP8PT1MUbv`
- exact deployed manifest revision: `3ac1bbce127a011af7830ad88da020112d132122`
- `source_id=yw`
- `source_app_id=yard-workers`
- `source_role=platform_shell`
- `tenant_boundary=platform_shell`
- signature state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection state: `DISCONNECTED / HOLD`

The production manifest is therefore independently current and still fail-closed.

## YW561 provider-delivery proof is not source-health proof

YW561 added a protected provider receiver for the separate contract:

`rosevear.yw.provider-delivery-receipt.v1`

That path validates a Comms provider Ed25519 signature and durable provider nonce/replay state, but the YW561 source documentation explicitly states that a provider `delivered` report is not:

- recipient delivery proof;
- an AI Data source-health signature;
- AI Data Master owner acceptance;
- CONNECTED evidence.

Build 372 therefore records the YW561 provider path as a separate trust domain:

- provider receiver: `CODE_READY_RUNTIME_HOLD`
- provider signer pin: `HOLD_UNTIL_INDEPENDENTLY_ENROLLED`
- signed provider receipt: `HOLD_UNTIL_PROTECTED_RUNTIME_PROOF`
- provider replay: `HOLD_UNTIL_DATABASE_COMMIT_PROOF`
- source-health signer: `SEPARATE_MASTER_TRUST_DOMAIN`

Provider signer or provider replay evidence can never satisfy the Build 372 source-health signer or source-health replay gate.

## Independent source-health signer custody evidence intake

Migration `0136_master_yw561_signer_receipt_replay_runtime_closure.sql` adds:

`app.master_yw561_custody_evidence_intake_events`

The Build 372 owner-only intake accepts only public/sanitized evidence:

- exact YW561 production revision;
- source-health key ID;
- public SPKI SHA-256 fingerprint;
- pin evidence URI;
- custody evidence URI;
- witness evidence URI.

It does not enroll a key by itself.

For `VERIFIED_CORRELATED`, the submitted values must match:

1. exactly one active YW source-health signer in `app.master_source_signer_registry_events`;
2. the matching committed Build 366 enrollment/custody event;
3. the same controller-computed and independently pinned SPKI SHA-256;
4. the same three distinct pin/custody/witness evidence references.

Current live manifest state remains `AWAITING_INDEPENDENT_SOURCE_SIGNER`, so Build 372 remains HOLD until genuine controller-owned signer evidence exists.

## Exact YW561 signed HEALTHY admission

Build 372 reuses the existing trusted ledgers:

- `app.master_convergence_receipt_ledger`
- `app.master_source_health_admission_events`

A current receipt is `VERIFIED_CURRENT` only if:

- source revision = exact YW561 production main;
- manifest revision = exact YW561 deployed manifest;
- key ID = independently trusted YW source-health signer;
- signer custody evidence is Build 372 correlated;
- health state = HEALTHY;
- receipt is still within the current freshness window;
- the controller has a matching `ADMITTED` event for that exact receipt.

Current state: `HOLD_NOT_RECEIVED`.

## Durable source-health replay correlation

Build 365 already guarantees a unique durable `(source_id, nonce)` for admitted convergence receipts.

Build 372 adds:

`app.master_yw561_replay_correlation_events`

A replay correlation event links:

- exact YW561 source/manifest revision;
- exact trusted receipt ID and receipt SHA-256;
- SHA-256 of the controller ledger nonce;
- independent replay evidence URI;
- independent replay evidence SHA-256 digest.

The owner-only correlation is `VERIFIED_CORRELATED` only when the exact current YW561 receipt is already source-bound, signer/custody verified and controller-admitted.

YW561 provider-delivery replay does not satisfy this source-health replay correlation.

Current state: `HOLD_NOT_RECEIVED`.

## Three-Master runtime closure recheck

Build 372 adds:

`app.master_yw561_runtime_closure_rechecks`

Current Master baselines remain:

### Rosevear AI Hub 309
- ACK: `MASTER360-AIHUB-309-ACK`
- main: `0a94c72ee4a1ded1babeac68deeb981ad33835ef`
- original Ree-host installed process witness: HOLD
- original-host source one-TEST: HOLD
- independent receiver-signed ACK: HOLD
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

The three-Master runtime gate therefore remains HOLD.

## Current Build 372 result

- YW561 exact production identity: **VERIFIED_EXACT**
- trusted source-health signer: **HOLD_UNENROLLED**
- Build 372 custody evidence intake: **HOLD_NOT_RECEIVED**
- exact YW561 signed HEALTHY admission: **HOLD_NOT_RECEIVED**
- source-health durable replay correlation: **HOLD_NOT_RECEIVED**
- source evidence ready: **NO**
- AI Hub 309 / Comms QL-417 runtime closure: **HOLD**
- Build 372 closure: **YW561_CURRENT_EVIDENCE_HOLD**
- CONNECTED: **not inferred**
- owner acceptance: **not inferred**

## Durable security boundary

All Build 372 tables are append-only with RLS enabled and forced. Runtime roles have SELECT/INSERT only; UPDATE/DELETE remain revoked.

Build 372 never:

- stores a source private signing key;
- stores YW561 receiver bearer credentials;
- treats a provider signer as the source-health signer;
- treats provider replay as source-health replay;
- treats Vercel READY or code GREEN as runtime acceptance;
- marks CONNECTED automatically;
- marks owner acceptance automatically.
