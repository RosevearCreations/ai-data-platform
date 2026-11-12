# AI Data Platform Build 376 — YW561 Independent Connection Evidence Intake, Verified CONNECTED Transition, Exact-Receipt Owner Acceptance Continuity Recheck & Three-Master Synchronization Closure

## Objective

Build 376 completes the controller-side path that Build 375 deliberately left unimplemented: consuming independently verified connection evidence without allowing an operator or browser to manufacture that authority.

The release keeps four boundaries separate:

1. the YW source registry must already contain a current production `CONNECTED` record created through the signed source-ingestion path with `independent-source-verification`;
2. Build 376 correlates that existing trusted record into an append-only YW561 connection-intake ledger;
3. the exact current YW561 receipt must still have active owner-acceptance continuity and the three-Master runtime gate must remain OPEN before the controller can record `CONNECTED_VERIFIED`;
4. three-Master synchronization closes only after the verified connection transition is complete.

## Production baselines observed for Build 376

- AI Data Platform Build 375 main: `83fa0b23af4c6ce59209efa324685eda6b80a546`
- Yard Workers YW561 main: `3ac1bbce127a011af7830ad88da020112d132122`
- Rosevear AI Hub production: Build 309, main `0a94c72ee4a1ded1babeac68deeb981ad33835ef`
- Rosevear Comms Hub production: QL-418, main `0cd042d044226848ab50da25a5cc0efc14577e39`

AI Hub 309 and Comms QL-418 still report runtime/receiver/connection evidence as HOLD/OFF. Code GREEN is not runtime authority.

## Trusted connection evidence intake

Build 376 does **not** accept raw booleans such as `independentConnectionVerified=true` from the browser.

Instead, the intake action accepts only a `registryEvidenceId` and re-loads the latest YW record from `app.master_shell_source_registry_evidence`.

The record is eligible only when all of these are true:

- source is exactly `yw`;
- environment is `production`;
- declared status is `CONNECTED`;
- evidence authority is `independent-source-verification`;
- owner authorization is true;
- independent TEST verification is true;
- independent connection verification is true;
- TEST and connection evidence URIs are present;
- signer key ID and fingerprint are present;
- immutable revision exactly matches YW561 production main;
- observation/expiry timestamps are valid and still fresh;
- the supplied registry evidence ID is the **latest** YW registry record.

The existing Build 337 signed source-ingestion workflow is therefore the authority that can create the registry record. Build 376 only correlates an already trusted record.

## Build 376 ledgers

Migration `0140_master_yw561_independent_connection_three_master_sync.sql` adds four append-only ledgers:

- `app.master_yw561_independent_connection_evidence_intake_events`
- `app.master_yw561_acceptance_continuity_connection_recheck_events`
- `app.master_yw561_verified_connection_transition_events`
- `app.master_yw561_three_master_sync_closure_events`

All four tables use RLS and forced RLS. Runtime access is SELECT/INSERT only for authorized suite users; UPDATE and DELETE remain revoked.

## Exact-receipt owner acceptance continuity recheck

The connection evidence is source/revision evidence, not an owner-decision substitute.

After trusted intake, Build 376 rechecks the current Build 375 owner state. The recheck reaches `ACTIVE_CURRENT` only when:

- an exact current YW561 source-health receipt exists;
- Build 375 acceptance continuity is still `ACTIVE`;
- the current trusted connection intake still applies;
- if the intake recorded a receipt present at intake time, that receipt has not changed.

A historical ACCEPT never transfers automatically to a replacement receipt.

## Verified CONNECTED transition

`CONNECTED_VERIFIED` is recorded only when:

- trusted independent connection intake = `VERIFIED_CURRENT`;
- exact-receipt acceptance continuity recheck = `ACTIVE_CURRENT`;
- three-Master runtime gate = `OPEN`;
- Build 375 connection reconciliation independently resolves to `CONNECTED_VERIFIED`.

Otherwise the transition remains one of the explicit HOLD states:

- `HOLD_CONNECTION_EVIDENCE`
- `HOLD_ACCEPTANCE_CONTINUITY`
- `HOLD_MASTER_GATE`
- `HOLD_CONNECTION_RECONCILIATION`

## Three-Master synchronization closure

The closure ledger records `CLOSED` / `masters_synced=true` only when the verified connection transition is `CONNECTED_VERIFIED`, exact-receipt owner acceptance remains current, and the runtime gate is OPEN.

Production deployment success, Vercel READY, code GREEN, a historical owner ACCEPT, or a source-reported CONNECTED string cannot independently close synchronization.

## Current Build 376 truth

At the current production baselines:

- latest trusted YW CONNECTED registry evidence for Build 376 intake: **not present**
- exact current authenticated YW561 source-health receipt: **not active**
- exact-receipt owner acceptance continuity: **HOLD**
- AI Hub 309 / Comms QL-418 runtime gate: **HOLD**
- verified connection transition: **HOLD**
- connection state: **DISCONNECTED_HOLD**
- three-Master synchronization closure: **HOLD**
- masters synced: **false**

This is expected. Build 376 implements the trusted transition path; it does not manufacture the evidence required to use it.

## Security boundary

Build 376 stores references, hashes/fingerprints already present in trusted registry evidence, revisions, state transitions and audit metadata. It does not store source private keys, webhook transport secrets, receiver credentials, service-role secrets or raw signed source payloads.
