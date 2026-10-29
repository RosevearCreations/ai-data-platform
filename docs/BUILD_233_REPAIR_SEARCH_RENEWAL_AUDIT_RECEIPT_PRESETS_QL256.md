# Build 233 — Repair Recovery Search, Renewal Recovery Audit, Receipt Recovery Presets & QL-256 Evidence Intake

## Recovery scope

Build 233 advances the browser-local recovery cycle with:

- repair recovery audit search across audit ID, requested/recovered preset IDs and reason;
- newest-first renewal recovery audit evidence;
- deterministic receipt recovery presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons.

These recovery views remain browser-local and non-authoritative. No database migration or server-side synchronization is introduced.

## QL-256 source and signer facts

The current audited source A is `15ccd72f098b6238d4b1d357a97676d6a2836df2`.

Its matching GitHub Actions run is:

`https://github.com/RosevearCreations/ai-data-platform/actions/runs/40915219544`

The run completed successfully and its `head_sha` equals source A.

The nonproduction signer remains genuinely provisioned with:

- key ID `ql256-ai-data-platform-d16f21ab82c12760`;
- public SPKI SHA-256 `d16f21ab82c12760c88b1cdaa7d2fe7491148e9efd4a8762c4a0e9be137311c6`;
- signer state `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`.

The private signing key remains only in Vercel Preview sensitive environment storage and is not committed or exported.

## Independent signer-custody evidence intake

Build 233 adds a fail-closed intake contract for the real private custody return. Acceptance requires all of the following:

- registry snapshot SHA-256;
- observed signer SPKI matching the expected public fingerprint exactly;
- three distinct opaque receipt references for custodian, witness and reviewer;
- separately authenticated custodian, witness and reviewer;
- distinct roles and distinct witness key;
- independent reviewer;
- fresh challenge issued no earlier than the current review and expiring within five minutes.

No such independently authenticated receipt package is presently available. The intake status is therefore `PENDING_INDEPENDENT_EVIDENCE`.

## Proof-B publication readiness

Build 233 adds a publication-readiness evaluator. It requires accepted custody evidence, exact source-A / GREEN-CI identity, the app-specific signer metadata, canonical proof payload preparation, the immutable proof path, and confirmation that the private key is not exported.

Because custody evidence is not yet accepted, proof-B readiness is currently `HELD_CUSTODY_NOT_VERIFIED`.

The current immutable proof path at Source A remains HTTP 404. Build 233 does **not** sign or publish proof B and does not invent a proof SHA or raw digest.

## Authenticated owner TEST-only decision preparation

The owner-decision preparation gate requires accepted custody evidence, verified proof publication, separately authenticated owner identity, exact nonproduction business scope, GET only, exactly the health and capabilities endpoints, and a future window no longer than 30 minutes.

Even when those prerequisites are synthetically tested, the preparation helper returns gateway execution disabled until explicit owner approval is separately recorded.

Current real state:

- owner TEST authorization: `NOT_GIVEN`;
- actual gateway GETs: `NOT_RUN`;
- connection: `DISCONNECTED`.

## Safety boundaries

- no fabricated custodian/witness/reviewer identities or receipts;
- no private key material in GitHub or documentation;
- no proof-B publication while custody is unverified;
- no owner authorization inferred from repository ownership;
- no gateway GETs while HELD;
- no production companion-database access;
- no seven-denial receipt claims.

## Next roadmap item

**Build 234 — Repair Recovery Presets, Renewal Recovery Filtering & Receipt Preset Persistence, plus QL-256 custody-challenge reconciliation, proof-B signed publication execution readiness and owner TEST-only authorization evidence intake while authenticated gateway GETs remain HELD.**
