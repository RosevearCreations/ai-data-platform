# Build 228 — Recovery Search Presets, Renewal Recovery Filtering, Receipt Preset Persistence & QL-253 Retry Readiness

## Objective

Advance the queued browser-local recovery cycle and prepare QL-253 immutable-proof retry, exact source-CI/proof ancestry reconciliation and custody-pin exception renewal without treating unavailable proof or private owner evidence as present.

## Recovery scope

- retain deterministic repair recovery search presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- retain newest renewal recovery age filtering for All / 24h / 7d;
- retain sanitized browser-local receipt preset persistence;
- never persist arbitrary manual receipt search text;
- preserve existing bounded recovery evidence and workflow authority.

## QL-253 immutable-proof retry readiness

The retry gate requires all of the following before it can report public-proof retry readiness:

1. a full 40-character source revision;
2. a GitHub Actions source CI URL whose head SHA exactly equals the source revision;
3. a distinct full 40-character proof commit SHA;
4. independently verified source-A to proof-B ancestry;
5. immutable proof fetch HTTP 200;
6. exact raw proof SHA-256.

Any mismatch fails closed.

Successful readiness status is:

`QL253_PUBLIC_PROOF_RETRY_READY_OWNER_TEST_AUTH_HELD`

This means public-proof retry prerequisites are coherent only. It does not authorize a gateway request.

## Custody-pin exception renewal

Build 228 adds a five-minute maximum custody-pin exception renewal gate. Renewal requires:

- a non-secret custody receipt ID;
- a distinct non-secret witness receipt ID;
- a 64-hex public SPKI SHA-256;
- separate out-of-band verification of both custody and witness;
- a valid renewal window no longer than five minutes.

Without all of those, renewal remains:

`HOLD_CUSTODY_PIN_EXCEPTION_RENEWAL_PENDING_INDEPENDENT_VERIFICATION`

Even a successful renewal returns:

`CUSTODY_PIN_EXCEPTION_RENEWED_OWNER_TEST_AUTH_HELD`

and still leaves owner authorization NOT_GIVEN and actual gateway testing NOT_RUN.

## Current truthful QL-253 state

Pre-Build-228 main source SHA:
`691017754d7e2bfa91ee880079e41f3d89c5a105`

At that SHA:

- exact GitHub Actions source CI URL: **NOT_AVAILABLE**;
- immutable QL-246 proof path: **404**;
- proof commit B: **NOT_AVAILABLE**;
- proof ancestry: **NOT_AVAILABLE**;
- proof digest: **NOT_AVAILABLE**;
- custody/witness receipts: **NOT_AVAILABLE**;
- owner TEST decision: **NOT_GIVEN**;
- actual gateway test: **NOT_RUN**;
- connection: **DISCONNECTED**.

This follows QL-252/253 guidance: retry proof publication and ancestry only from genuine evidence; never substitute deployment success or synthetic fixtures.

## Safety boundaries

- no signing private key created or committed;
- no fabricated GitHub Actions run;
- no fabricated proof B or ancestry result;
- no fabricated custody/witness receipt;
- no owner identity inference;
- no gateway request;
- no seven-denial claim;
- no pilot release;
- owner TEST-only authorization remains HELD.

## Next roadmap item

**Build 229 — Recovery Preset Persistence, Renewal Recovery Search & Receipt Preset Recovery, plus QL-253 public-proof retry result reconciliation, ancestry-drift exception handling and owner TEST-only decision intake while authenticated requests remain HELD.**
