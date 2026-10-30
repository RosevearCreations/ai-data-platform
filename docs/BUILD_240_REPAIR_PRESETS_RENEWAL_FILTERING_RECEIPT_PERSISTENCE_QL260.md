# Build 240 — Repair Recovery Presets, Renewal Recovery Filtering, Receipt Preset Persistence & QL-260

## Recovery scope

Build 240 advances the browser-local recovery cycle with:

- deterministic repair recovery presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- renewal recovery filtering for All, Recent 24 hours and Recent 7 days;
- receipt preset persistence with unsupported persisted IDs safely sanitized to All.

No database migration or server-side synchronization is introduced.

## Current source A

The current audited source A is `71c94f351366d9ab2df1e3e5ba372830c6821ddd`.

Its matching successful GitHub Actions run is:

`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41074503478`

The run's `head_sha` equals source A. Existing QL-265 source connection/interface work remains preserved.

The immutable path `docs/integration/ql246-source-proof.json` was rechecked at exact source A and still returns HTTP 404.

## QL-260 authenticated owner-status receipt reconciliation

Build 240 adds reconciliation on top of the Build 239 authenticated owner-status receipt intake.

Reconciliation requires:

- the underlying authenticated receipt intake to PASS;
- the status return receipt ID to equal the authenticated owner-status receipt ID;
- status return state to remain `OWNER_REPORTS_DONE_NOT_VERIFIED`;
- status return scope to remain `OWNER_STATUS_ONLY`;
- status return timestamp to fall after receipt issuance and before receipt expiry;
- owner authorization to remain `NOT_GIVEN`;
- connection to remain `DISCONNECTED`;
- all 12 live-pilot holds to remain active.

A reconciled receipt authenticates the source of the owner-status return only. It does not verify custody and it does not authorize a network test.

No authenticated owner-status receipt exists to reconcile. Current state is `QL260_OWNER_RECEIPT_RECONCILIATION_NOT_AVAILABLE`.

## Custody-source renewal freshness enforcement

Build 240 adds freshness enforcement after the Build 239 custody renewal verification.

A renewal must first pass the full custody renewal verification. It must then also:

- remain within a bounded freshness window;
- use a challenge that is still unexpired;
- default to a maximum renewal age of 30 minutes;
- optionally use an explicit maximum renewal age bounded from one minute to 24 hours.

No custody renewal package exists. Current freshness state is `QL260_CUSTODY_RENEWAL_FRESHNESS_NOT_AVAILABLE`.

Even a fresh verified renewal leaves activation, proof exception closure, owner TEST authorization and gateway execution separately held.

## Immutable proof publication exception closure readiness

Build 239 kept the missing-proof exception open as `KEEP_OPEN_PUBLICATION_REQUIRED`.

Build 240 adds closure-readiness evaluation. Closure can become ready only when:

- the immutable proof path returns HTTP 200;
- the existing proof verifier accepts distinct source A and proof B commits, raw proof digest, public signer SPKI, A→B ancestry and exact GREEN source CI;
- prior disposition is `KEEP_OPEN_PUBLICATION_REQUIRED`;
- the authenticated owner-status receipt is reconciled;
- custody renewal is verified and still fresh;
- a separate opaque closure-review receipt is present;
- closure review status is exactly `APPROVED_TO_CLOSE_EXCEPTION_ONLY`.

Closure readiness cannot waive proof publication. `exceptionWaiverAllowed` remains false.

Because the exact immutable proof path still returns HTTP 404, current closure state is:

`QL260_PROOF_EXCEPTION_CLOSURE_NOT_READY_PUBLICATION_MISSING`.

No proof B SHA or raw digest is claimed.

## Current boundary

- signer: `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`;
- owner-status receipt: `NOT_AVAILABLE`;
- owner-status receipt reconciliation: `NOT_AVAILABLE`;
- custodian/witness/reviewer: `NOT_ASSIGNED`;
- restricted signer store: `NOT_APPROVED`;
- independent SPKI pin: `NOT_VERIFIED`;
- custody renewal: `NOT_AVAILABLE`;
- proof B: not published;
- owner TEST-only authorization: `NOT_GIVEN`;
- authenticated gateway GETs: `NOT_RUN`;
- connection: `DISCONNECTED / HOLD`.

## Next roadmap item

**Build 241 — Repair Preset Persistence, Renewal Recovery Search & Receipt Preset Recovery, plus QL-261 actual owner packet receipt reconciliation, independent signer-custody evidence gate and source-proof A→B publication readiness while authenticated gateway GETs remain HELD.**
