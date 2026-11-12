# AI Data Platform Build 380 — Protected External Runtime Activation Ceremony, Receiver-State Proof, Verified CONNECTED Transition & Three-Master Synchronization Closure

## Objective

Build 380 turns Build 379's owner-authorized pending state into a protected external runtime activation contract.

Build 380 does **not** treat code GREEN, an owner click, or a browser boolean as receiver activation. A CONNECTED transition exists only after a separately pinned Ed25519 activation authority submits a fresh runtime ceremony that proves receiver ON, preserves the exact Build 379 authorization and YW562 receipt/owner continuity, advances the independent YW source registry to CONNECTED, and closes three distinct Master runtime receipts in one protected transaction.

## Production baselines observed during implementation

- AI Data Platform Build 379 production: `ce4216c667b514f40e2fb6e506e5b62c222b1736`
- Yard Workers YW562 production: `6e0b77eebcfc77aa7fc48dcc398da958af8df696`
- Rosevear AI Hub Build 314 production: `124c78f0c15b054881c9b7f45c6d9b2f6d8eb88c`
- Rosevear Comms Hub QL-424 production: `5697d9e3e953e4f347ff811aaba1cf2824ee8f58`
- original host: `DESKTOP-AE894KC`

AI Hub 314 and Comms QL-424 are the current production handoffs. Their published handoffs do not themselves prove a live receiver. Build 380 therefore ships the controller-side ceremony and fail-closed transition contract while remaining operationally HOLD until genuine external evidence arrives.

## Protected external activation authority

The protected endpoint is:

`POST /api/protected/build380-runtime-activation`

There is no browser or owner POST route for activation.

The endpoint requires four independently pinned Ed25519 public keys:

- `BUILD380_EXTERNAL_ACTIVATION_PUBLIC_KEY_PEM` — overall protected activation authority;
- `BUILD380_AI_HUB_RUNTIME_PUBLIC_KEY_PEM` — Rosevear AI Hub runtime receipt signer;
- `BUILD380_COMMS_RUNTIME_PUBLIC_KEY_PEM` — Rosevear Comms Hub runtime receipt signer;
- `BUILD380_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM` — AI Data Platform runtime receipt signer.

Each receipt carries its signer fingerprint and signature. The controller verifies every Master receipt independently before verifying the overall activation envelope. The overall envelope then binds the SHA-256 digest of each already-verified Master signature, preventing a receipt signature from being swapped after activation authorization.

The envelope binds:

- exact Build 379 production controller revision;
- exact current YW562 production revision;
- exact current AI Hub 314 revision;
- exact current Comms QL-424 revision;
- original host `DESKTOP-AE894KC`;
- exact Build 379 protected admission;
- exact Build 379 owner activation decision;
- exact Build 379 decision execution;
- exact current YW562 receipt and SHA-256;
- exact current Master owner decision;
- exact prior independent YW registry evidence;
- receiver instance and boot identity;
- receiver start and probe timestamps;
- receiver proof URI and digest;
- source handshake receipt and digest;
- explicit AI Hub CONNECTED / SYNCED state;
- explicit Comms receiver ON / CONNECTED / owner ACCEPTED / slave gate OPEN state;
- controller gate OPEN;
- one distinct CONNECTED_SYNCED receipt from each of the three Masters;
- terminal synchronization digest;
- unique nonce and fresh observation timestamp.

The endpoint rejects stale, duplicate, forged, mismatched or incomplete evidence before entering the protected database transaction.

## Atomic protected activation transaction

Build 380 reuses the no-login `ai_data_protected_runtime` role introduced by Build 379.

The protected transaction acquires a controller advisory lock and then re-reads the current Build 379 state. Before any write it requires:

- Build 379 state = `ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME`;
- exact current YW562 source receipt = `ACTIVE_CURRENT`;
- exact current Master owner acceptance = `ACCEPTED_CURRENT`;
- exact protected admission, decision and execution IDs;
- exact current receipt ID and digest;
- exact current owner-decision ID;
- exact current external runtime revisions;
- latest YW registry evidence bound to current YW562;
- latest YW registry evidence independently verified and owner authorized;
- registry state = `TEST_VERIFIED` or a current `CONNECTED` refresh;
- fresh runtime receiver and three-Master proof.

If any check fails, no transition is committed.

## Independent CONNECTED source-registry transition

A successful ceremony appends a new `app.master_shell_source_registry_evidence` row for YW with:

- environment = production;
- declared status = `CONNECTED`;
- immutable revision = exact YW562 production;
- evidence authority = `independent-source-verification`;
- owner authorized = true;
- independent TEST verified = true;
- independent connection verified = true;
- the prior TEST evidence retained;
- the signed receiver proof URI as connection evidence;
- Build 380 protected ceremony metadata.

Build 380 never accepts an operator-recorded CONNECTED row.

The source registry row is part of the same database transaction as ceremony and synchronization closure. A failure after the registry INSERT rolls the entire transaction back.

## Receiver-state proof

The activation ceremony ledger requires:

- ceremony state = `VERIFIED_EXECUTED`;
- receiver state = `ON`;
- fresh receiver probe;
- exact current source / AI Hub / Comms / controller revisions;
- exact Build 379 authorization IDs.

The controller displays receiver proof as `ON_VERIFIED_CURRENT` only while the proof remains inside the ten-minute continuity window.

Stale receiver evidence returns the Build 380 model to `DISCONNECTED_HOLD`; code GREEN never substitutes for uptime.

## Verified CONNECTED transition

Migration 0144 creates:

`app.master_build380_verified_connected_transition_events`

A transition row is valid only when it references:

- the exact protected ceremony;
- the exact newly appended independent YW CONNECTED registry evidence;
- the exact current YW receipt;
- the exact current owner decision;
- the exact Build 379 activation decision;
- receiver state ON.

The model reports `CONNECTED_VERIFIED` only while that transition remains correlated to the current fresh CONNECTED registry row and current receiver proof.

## Three-Master synchronization closure

Migration 0144 also creates:

`app.master_build380_three_master_sync_closure_events`

The closure binds one exact runtime receipt from each of:

- `rosevear-ai-hub`;
- `rosevear-comms-hub`;
- `ai-data-platform`.

All three receipts must independently verify under their own server-pinned Ed25519 key with runtime state `CONNECTED_SYNCED`. The closure records their receipt IDs, runtime digests, signer fingerprints and signature SHA-256 digests plus the exact terminal synchronization digest. The separately pinned activation authority signs the outer envelope after those signature digests are bound.

Only `CLOSED_VERIFIED` sets `mastersSynced=true`.

## Persistence and RLS

Migration `0144_master_yw562_external_runtime_activation_closure.sql` adds three append-only RLS-protected ledgers:

- `app.master_build380_external_runtime_activation_ceremony_events`
- `app.master_build380_verified_connected_transition_events`
- `app.master_build380_three_master_sync_closure_events`

The normal `ai_data_runtime` role has read access for owner/admin status screens but no INSERT privilege on these tables.

The protected role receives the minimum additional read access required to re-check the Build 379 decision and execution, plus a narrowly constrained YW-only source-registry INSERT policy that permits only production CONNECTED evidence with independent authority and Build 380 metadata.

## Truthful production state

Build 380 production code can be GREEN while the live connection remains HOLD.

Comms QL-424 can authenticate an **isolated one-use connected pilot** only. Its own contract explicitly leaves general receiver mode, measured uptime and the slave gate unresolved. AI Hub 314 likewise remains review-only until real original-host evidence exists. Therefore a QL-424 `VERIFIED_CONNECTED_PILOT` is useful protected evidence but does **not** by itself satisfy Build 380's stronger general `CONNECTED` / three-Master closure criteria.

Until a genuine protected activation authority submits a valid external runtime ceremony against a current independent YW TEST registry row:

- activation ceremony = HOLD;
- receiver proof = HOLD;
- CONNECTED transition = HOLD;
- three-Master synchronization closure = HOLD;
- connection = `DISCONNECTED_HOLD`;
- mastersSynced = false.

If a valid ceremony is admitted, the protected transaction can truthfully produce:

- receiver proof = `ON_VERIFIED_CURRENT`;
- transition = `CONNECTED_VERIFIED`;
- closure = `CLOSED_VERIFIED`;
- connection = `CONNECTED`;
- mastersSynced = true.

Those states expire fail-closed when the receiver/registry evidence ages out or exact receipt/owner continuity changes.
