# Build 239 — Repair Recovery Search, Renewal Recovery Audit, Receipt Recovery Presets & QL-260

## Recovery scope

Build 239 advances the browser-local recovery cycle with:

- repair recovery search across audit ID, requested/recovered preset IDs and reason;
- newest-first renewal recovery audit evidence;
- deterministic receipt recovery presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons.

No database migration or server-side synchronization is introduced.

## Current source A

The current audited source A is `ad958eee57fc02a1cd6753126e29e7e9a650fda2`.

Its matching successful GitHub Actions run is:

`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41072292854`

The run's `head_sha` equals source A. Existing QL-265 source connection/interface work remains preserved.

The immutable path `docs/integration/ql246-source-proof.json` was rechecked at exact source A and still returns HTTP 404.

## QL-260 authenticated owner-status receipt intake

Build 239 adds a separate authenticated receipt gate for owner-status returns.

A receipt can be accepted only when:

- a nonsecret opaque receipt ID is present;
- owner identity was separately authenticated privately;
- receipt scope is exactly `OWNER_STATUS_ONLY`;
- owner report state remains `OWNER_REPORTS_DONE_NOT_VERIFIED`;
- owner authorization remains `NOT_GIVEN`;
- connection remains `DISCONNECTED`;
- all 12 live-pilot holds remain;
- receipt is already issued, not expired, and has a maximum lifetime of 30 minutes.

An accepted owner-status receipt authenticates only the source of the status return. It does not verify custody, approve a proof publication, grant TEST authorization, or authorize a gateway request.

No authenticated owner-status receipt currently exists. Current intake state is `QL260_AUTHENTICATED_OWNER_STATUS_RECEIPT_NOT_AVAILABLE`.

## Custody-source evidence renewal verification

Build 239 adds verification for a future custody-source renewal package.

Verification requires:

- prior and current public signer SPKI digests, with exact signer continuity;
- prior and current registry snapshot digests;
- privately authenticated custodian, witness and reviewer;
- distinct roles;
- approved restricted private-key host/store;
- public SPKI verified out of band;
- four distinct opaque receipt IDs: custodian, witness, reviewer and renewal;
- a fresh challenge no longer than five minutes;
- renewal time later than the prior verification and after challenge issuance.

No custody-source renewal package currently exists. Current state is `QL260_CUSTODY_SOURCE_RENEWAL_NOT_AVAILABLE`.

Even a verified renewal leaves activation, public proof publication, owner TEST authorization and gateway execution separately held.

## Immutable proof publication exception disposition

Build 238 opened the missing-proof condition as:

`QL259_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED`.

Build 239 adds a disposition layer. Because the exact immutable proof path still returns HTTP 404, the current disposition is:

`KEEP_OPEN_PUBLICATION_REQUIRED`

with status:

`QL260_PROOF_PUBLICATION_EXCEPTION_DISPOSITION_OPEN_PUBLICATION_REQUIRED`.

The disposition cannot waive the proof requirement. `exceptionWaiverAllowed` remains false.

A future HTTP 200 proof can resolve the exception only after the existing distinct source-A/proof-B SHA, raw proof digest, public signer SPKI, A→B ancestry and exact GREEN source-CI checks pass.

## Current boundary

- signer: `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`;
- owner-status receipt: `NOT_AVAILABLE`;
- custodian/witness/reviewer: `NOT_ASSIGNED`;
- restricted signer store: `NOT_APPROVED`;
- independent SPKI pin: `NOT_VERIFIED`;
- custody renewal receipt: `NOT_AVAILABLE`;
- proof B: not published;
- owner TEST-only authorization: `NOT_GIVEN`;
- authenticated gateway GETs: `NOT_RUN`;
- connection: `DISCONNECTED / HOLD`.

## Next roadmap item

**Build 240 — Repair Recovery Presets, Renewal Recovery Filtering & Receipt Preset Persistence, plus QL-260 authenticated owner-status receipt reconciliation, custody-source renewal freshness enforcement and immutable proof publication exception closure readiness while authenticated gateway GETs remain HELD.**
