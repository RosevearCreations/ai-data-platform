# Build 238 — Repair Recovery Filtering, Renewal Preset Recovery, Receipt Recovery Search & QL-259

## Recovery scope
Build 238 advances the browser-local recovery cycle with:
- repair recovery filtering for All, Recent 24 hours and Recent 7 days;
- renewal preset recovery that safely repairs unsupported persisted IDs to All;
- receipt recovery search across audit ID, requested/recovered preset IDs and reason.

No database migration or server-side synchronization is introduced.

## Current source A
The current audited source A is `5b03307cb366e74af01fb54d2385096996772b5c`.

Its matching successful GitHub Actions run is:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41070310506`

The run's `head_sha` equals source A. Existing QL-265 source connection/interface work remains preserved.

## QL-259 owner-status refresh
Build 238 adds a fail-closed owner-status refresh layer.

A refresh may only acknowledge an existing sanitized self-report when:
- owner report state is `OWNER_REPORTS_DONE_NOT_VERIFIED`;
- owner authorization remains `NOT_GIVEN`;
- connection remains `DISCONNECTED`;
- all 12 live-pilot holds remain;
- identity remains explicitly unauthenticated;
- the reported timestamp is not in the future.

A refreshed self-report never becomes authenticated identity or custody proof.

No QL-259 owner-status packet is currently available. Current refresh state is `QL259_OWNER_STATUS_NOT_AVAILABLE`.

## Custody-source evidence renewal
Build 238 adds renewal handling for future custody-source evidence.

Renewal requires:
- a previously verified registry snapshot and signer SPKI;
- the renewed signer SPKI to match the prior signer SPKI;
- privately authenticated custodian, witness and reviewer;
- distinct roles;
- approved restricted private-key host/store;
- public SPKI independently verified out of band;
- three distinct opaque nonsecret receipt IDs;
- a fresh challenge no longer than five minutes;
- renewal timestamp after both the prior verification and new challenge issuance.

No real custody-source evidence exists to renew. Current status is `QL259_CUSTODY_SOURCE_EVIDENCE_NOT_AVAILABLE`.

Even a verified renewal leaves activation, proof publication, owner TEST authorization and gateway execution separately held.

## Immutable proof publication exception review
The immutable path `docs/integration/ql246-source-proof.json` was rechecked at exact source A and still returns HTTP 404.

Build 238 classifies that condition as:
`QL259_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED`.

The exception is a review record only. It cannot waive publication, source/proof ancestry, custody, owner authorization or authenticated gateway requirements. `exceptionWaiverAllowed` is always false.

A future HTTP 200 proof must still pass the existing distinct A/B SHA, raw digest, public signer SPKI, A→B ancestry and exact GREEN source-CI verification before the exception can be resolved.

## Current boundary
- signer: `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`;
- custodian/witness/reviewer: `NOT_ASSIGNED`;
- restricted signer store: `NOT_APPROVED`;
- independent SPKI pin: `NOT_VERIFIED`;
- proof B: not published;
- owner TEST-only authorization: `NOT_GIVEN`;
- authenticated gateway GETs: `NOT_RUN`;
- connection: `DISCONNECTED / HOLD`.

## Next roadmap item
**Build 239 — Repair Recovery Search, Renewal Recovery Audit & Receipt Recovery Presets, plus QL-260 authenticated owner-status receipt intake, custody-source evidence renewal verification and immutable proof publication exception disposition while authenticated gateway GETs remain HELD.**
