# Build 236 — Repair Preset Recovery, Renewal Recovery Presets, Receipt Recovery Audit & QL-258 Validation

## Recovery scope
Build 236 advances the browser-local recovery cycle with:
- repair preset recovery that safely falls back unsupported IDs to All;
- deterministic renewal recovery presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- newest-first receipt recovery audit evidence.

No database migration or server-side synchronization is introduced by this recovery cycle.

## Concurrent main preservation
Build 236 was based on the actual current `main` commit `fefb13e63487e6685555ed52fcdb4573838513e7`, which already contains the newer QL-265 Comms Hub source connection/local-check work. Build 236 preserves that work rather than reverting to the older Build 235 release tree.

## Source A and immutable proof refresh
The current audited source A is `fefb13e63487e6685555ed52fcdb4573838513e7`.

Its matching successful GitHub Actions run is:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/40996394692`

The run's `head_sha` equals source A. The exact immutable proof path `docs/integration/ql246-source-proof.json` was rechecked at that SHA and still returns HTTP 404.

## QL-258 sanitized owner-action packet validation
The QL-258 handoff says the operator worksheet has seven progress questions and an app-specific nonsecret JSON return. It also says a worksheet self-report can be marked `OWNER_REPORTS_DONE_NOT_VERIFIED`, but that does not authenticate identity, approve a signed proof, authorize a network test or connect the integration.

Build 236 therefore implements an app-side fail-closed validation contract:
- exactly seven progress values are required;
- only `NOT_ATTEMPTED`, `ATTEMPTED_NOT_VERIFIED` and `OWNER_REPORTS_DONE_NOT_VERIFIED` are accepted;
- unknown fields are rejected;
- owner authorization must remain `NOT_GIVEN`;
- connection must remain `DISCONNECTED`;
- all 12 live-pilot holds remain;
- no private names, key material, tokens, passwords, addresses, credential-store paths or customer records are accepted.

No completed sanitized AI Data Platform owner-action packet has been supplied to this build, so current packet state remains `NOT_RECEIVED`.

## Immutable proof refresh
Build 236 adds independent proof refresh handling:
- non-200 retrieval remains `QL258_IMMUTABLE_PROOF_NOT_PUBLISHED`;
- a future HTTP 200 proof must contain distinct source A and proof B SHAs, exact proof digest, public signer SPKI, verified A→B ancestry and GREEN source CI whose head SHA equals A.

Current result remains HTTP 404. No proof B SHA or raw digest is claimed.

## Custody-source activation readiness
Readiness requires:
- a valid sanitized owner report;
- exact GREEN source A / CI identity;
- separately authenticated custodian, witness and reviewer;
- distinct roles;
- approved restricted private-key host/store;
- public SPKI pin verified out of band;
- registry snapshot digest;
- three distinct opaque nonsecret receipts;
- fresh challenge no longer than five minutes.

The self-report alone is insufficient. Current roles remain unassigned, key host unapproved, pin unverified and receipts unavailable. Activation readiness therefore remains `HELD_NOT_READY`.

Even a future readiness PASS leaves proof publication and gateway execution separately held. Owner TEST-only authorization remains `NOT_GIVEN`, gateway GETs remain `NOT_RUN`, and connection remains `DISCONNECTED / HOLD`.

## Environment and binding boundary
No new environment variables or bindings were added for QL-258. Existing nonproduction Source-A metadata was refreshed to the current GREEN source commit and run.

## Next roadmap item
**Build 237 — Repair Recovery Audit, Renewal Preset Persistence & Receipt Recovery Filtering, plus QL-258 sanitized owner-action return reconciliation, immutable proof publication follow-up and custody-source activation evidence aging while authenticated gateway GETs remain HELD.**
