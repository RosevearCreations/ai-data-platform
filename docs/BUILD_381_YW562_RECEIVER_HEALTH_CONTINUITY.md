# AI Data Platform Build 381 — Protected Receiver Health Continuity, Signed Runtime Renewal, Automatic Fail-Closed Rollback & Three-Master CONNECTED Revalidation

## Objective

Build 381 governs continuity **after** a genuine Build 380 general CONNECTED transition.

It does not create a connection from code GREEN, an isolated pilot, owner UI state or GitHub/Vercel success. A prior Build 380 activation must already have produced a verified receiver-ON ceremony, protected CONNECTED transition and closed three-Master synchronization receipt set.

Build 381 then requires a fresh signed renewal at least every five minutes. Missing, stale, mismatched or incomplete renewal evidence automatically changes the controller projection to `DISCONNECTED_HOLD`. Durable rollback closure additionally requires an independently signed receiver-OFF proof and a protected DISCONNECTED source-registry record.

## Current production baselines observed during implementation

- AI Data Platform Build 380 production: `ccd291f22e15750392fa3995dc3d5811c506cd05`
- Yard Workers production: YW562 `6e0b77eebcfc77aa7fc48dcc398da958af8df696`
- Rosevear AI Hub production: Build 321 `dbc3fd8ae7f8df3bfc85a402a00b0954648ec543`
- Rosevear Comms Hub production: QL-432 `f28f14f67d3ecd5fad9972d6f0500c14de0f89b7`
- original host: `DESKTOP-AE894KC`

AI Hub 321 can authenticate a supervised isolated QL-430 pilot only when genuine protected original-host evidence exists. Its source status remains HOLD otherwise. Comms QL-432 explicitly ends in signed receiver OFF and owner-gated recovery review; it never resumes a previous pilot and never promotes universal CONNECTED. Build 381 therefore treats both as current exact code revisions, not as operational connection evidence.

## Protected runtime renewal

Protected endpoint:

`POST /api/protected/build381-runtime-renewal`

There is no browser/admin renewal POST.

The endpoint requires these independently pinned Ed25519 public keys:

- `BUILD381_CONTINUITY_AUTHORITY_PUBLIC_KEY_PEM`
- `BUILD381_AI_HUB_RUNTIME_PUBLIC_KEY_PEM`
- `BUILD381_COMMS_RUNTIME_PUBLIC_KEY_PEM`
- `BUILD381_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM`

The signed renewal binds:

- exact Build 380 production controller revision;
- exact current YW562 revision;
- exact AI Hub 321 revision;
- exact Comms QL-432 revision;
- original host `DESKTOP-AE894KC`;
- exact Build 380 ceremony, CONNECTED transition and three-Master closure IDs;
- exact current YW registry evidence ID;
- receiver instance and boot identity;
- monotonic receiver health sequence;
- fresh signed receiver ON health proof;
- one independently signed `CONNECTED_HEALTHY` receipt from each Master;
- renewal digest, evidence URI, nonce and observation time.

The protected database transaction re-reads the latest Build 380 evidence and current YW registry before any write. It refuses renewal if the current registry has already expired or is no longer independently CONNECTED.

A successful renewal appends a new independent YW CONNECTED registry row with a five-minute expiry and appends a Build 381 renewal ledger event in the same transaction.

## Automatic fail-closed projection

The Build 381 state model automatically returns `DISCONNECTED_HOLD` when a genuine prior CONNECTED baseline exists but any of these become false:

- no current protected renewal;
- renewal expires;
- receiver ON proof is stale;
- exact Build 380 binding changes;
- current YW revision changes;
- AI Hub/Comms runtime revision binding changes;
- any Master renewal receipt is missing;
- three-Master CONNECTED revalidation is incomplete;
- a protected rollback event is newer than the renewal.

This fail-closed controller projection requires no browser action and does not wait for an owner click.

It does **not** claim that code running in Vercel can physically disable Ree's Windows receiver. Physical receiver shutdown remains an external protected runtime operation and must be proven separately.

## Durable signed rollback closure

Protected endpoint:

`POST /api/protected/build381-fail-closed-rollback`

The rollback path requires two separate Ed25519 authorities:

- `BUILD381_ROLLBACK_AUTHORITY_PUBLIC_KEY_PEM`
- `BUILD381_RECEIVER_OFF_PUBLIC_KEY_PEM`

The independently signed receiver-OFF proof binds the exact source/controller/AI Hub/Comms revisions, original host, current registry evidence, receiver instance/boot identity, rollback reason, OFF observation, proof URI and digest.

The outer rollback authority then signs an envelope that includes the receiver-OFF signer fingerprint and SHA-256 digest of that independent OFF signature.

A successful protected rollback transaction:

1. requires the latest YW registry state still be CONNECTED;
2. revalidates exact current Build 381 revision binding;
3. validates CONNECTED → DISCONNECTED as a permitted registry transition;
4. appends a YW `DISCONNECTED` independent source-registry record;
5. appends an immutable Build 381 rollback event;
6. re-loads the model and requires `ROLLED_BACK_VERIFIED`, `DISCONNECTED_HOLD`, `mastersSynced=false`.

## Three-Master CONNECTED revalidation

A valid renewal requires exactly three distinct signed Master receipts:

- `rosevear-ai-hub`
- `rosevear-comms-hub`
- `ai-data-platform`

Every receipt is individually verified under its own pinned Ed25519 key and must state `CONNECTED_HEALTHY`. The overall continuity authority signs the outer renewal only after those signature digests are bound.

Only a fresh verified renewal can produce:

- receiver health = `HEALTHY_RENEWED_CURRENT`;
- three-Master state = `CONNECTED_REVALIDATED`;
- connection = `CONNECTED`;
- mastersSynced = true.

## Persistence and RLS

Migration `0145_master_yw562_receiver_health_continuity.sql` adds:

- `app.master_build381_receiver_health_renewal_events`
- `app.master_build381_fail_closed_rollback_events`

Both are append-only, RLS-enabled and forced RLS.

The normal `ai_data_runtime` role is read-only for owner/admin status. Only `ai_data_protected_runtime` may insert Build 381 evidence.

A narrowly scoped Build 381 registry policy allows the protected role to append only YW production `CONNECTED` or `DISCONNECTED` evidence with independent-source authority and `metadata.build=381`.

## Truthful current operational state

Production code GREEN is separate from live runtime state.

At implementation time:

- AI Hub 321 source handoff remains operational HOLD without real original-host evidence;
- Comms QL-432 records signed OFF recovery review and requires a new ceremony for any future isolated pilot;
- no genuine Build 380 general CONNECTED ceremony has been established in this controller session.

Therefore Build 381 production may be GREEN while the truthful runtime remains:

- Build 380 connected baseline = HOLD;
- receiver health continuity = HOLD;
- three-Master revalidation = HOLD;
- rollback = no live rollback event unless genuine evidence arrives;
- connection = `DISCONNECTED_HOLD`;
- mastersSynced = false.

Build 381 never upgrades isolated pilot evidence into general CONNECTED.
