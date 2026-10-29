# QL-253 — Six-app owner return, immutable proof recheck & independent custody exception review (HELD)

**28 October 2026, Eastern.** Companion-app replies were supplied by the owner. The six repositories were also rechecked through **public GitHub GETs only**. This supplement follows the already-promoted AI Data Platform Build 228 QL-253 readiness work; it does not perform an authenticated Phase-B connection test.

## What the owner-supplied responses actually establish

| App | Supplied source A | Supplied exact source CI | Proof commit B / SPKI pin / custody / witness | Owner TEST / gateway |
| --- | --- | --- | --- | --- |
| AI Data Platform | `037b18247e59cb68d1f7ca5d7149595bd7487957` | Not available | Not available | NOT_GIVEN / NOT_RUN |
| Devil n Dove | `340d6da39abed229094527dfc91a7fd423fabd02` | [Run 40794862120](https://github.com/RosevearCreations/devilndove-site/actions/runs/40794862120) (supplied claim) | Not available | NOT_GIVEN / NOT_RUN |
| Rosie Dazzlers | `62e4c4cf8faa6e2856e6a3e9e14d54385bb38020` | [Run 40800885136](https://github.com/RosevearCreations/rosiedazzlers/actions/runs/40800885136) (supplied claim) | Not available | NOT_GIVEN / NOT_RUN |
| Yard Workers | Not supplied | Not supplied | Not available | NOT_GIVEN / NOT_RUN |
| iCamp | `5f7caaef37a2f8ec8ba2eb2913564e1a3b3c62c9` | [Run 40794126949](https://github.com/RosevearCreations/iCamp/actions/runs/40794126949) (supplied claim) | Not available | NOT_GIVEN / NOT_RUN |
| Rosevear AI Hub | Must refresh after Build 179 | Must match newly tested source | Not available | NOT_GIVEN / NOT_RUN |

The supplied actions URLs have **not** been adopted as independently proven source-CI matches. The source and owner-return metadata are sanitized in `docs/integration/ql253-six-app-owner-source-returns.json`. They contain no credential values or hidden endpoints.

## Independently checked public GitHub `main` revisions

| Application | Current `main` revision observed at QL-253 public-only check | `docs/integration/ql246-source-proof.json` at that exact SHA |
| --- | --- | --- |
| AI Data Platform | `9f4f790dab0c52fc4c4fe42bfa85a8a3b5eeea2e` | **404** |
| Devil n Dove | `26433e69e5bb9b89987950c24ea9896e99610714` | **404** |
| Rosie Dazzlers | `62e4c4cf8faa6e2856e6a3e9e14d54385bb38020` | **404** |
| Yard Workers | `65068a739e5b28894b00226d4967a0dac241407c` | **404** |
| iCamp | `92316c576f8031ffb4889565f0421a5bd6aa138b` | **404** |
| Rosevear AI Hub | `031a0f0cbc834f002664e08d8c331711f2ad3337` | **404** |

These are dated observations; each companion repository may advance independently. A 404 at one observed SHA does not prove a permanent absence at all possible commits.

## QL-253 follow-up verification implementation

- `scripts/ql253-six-app-origin-pin-test-review.mjs` reconciles **exactly six ordered, non-secret owner returns** to the expected repositories, validates a candidate proof A/B + exact Actions URL structure and offers a separate **public GitHub origin/CI/ancestry/raw-byte digest review**. Even a fully matching mocked/public origin yields **PIN / SIGNATURE / INDEPENDENT IDENTITY STILL HELD**; it cannot grant authorization.
- A fresh five-minute `inspectQl253PinRenewal` metadata challenge rejects replay, cross-app keys, expired windows, reused custody/witness receipt IDs and self-reported GitHub custody channels. A syntactically consistent out-of-band claim is **not itself real independent custody evidence**.
- `inspectQl253OwnerTestReview` recognizes only unapproved review requests limited to a nonproduction GET pair and a 30-minute-or-shorter UTC window. `APPROVED`, `POST`, hidden routes and fabricated owner receipt IDs fail closed. There is **no owner test approval in the supplied materials**.
- `scripts/ql253-public-github-proof-recheck.mjs` makes **zero network requests by default**. Explicit `--public-get` uses only exact public GitHub `main` reference and immutable proof paths. It cannot call gateway endpoints or read secrets.
- `verify:ql253` tests six source claims, malformed/forged scope, source/CI ancestry and digest drift, pin replay and false approval, and public-only URL restrictions; it is wired into CI.

## Remaining actions for the six applications

1. Publish a **genuine** QL-246 signed JSON in proof commit B after a tested source A; provide an exact GREEN Actions run for A, raw proof SHA-256, valid signature, B descendant ancestry and immutable GitHub proof URL. Do **not** manufacture signatures or negative-case receipts to satisfy the checklist.
2. Verify signing-key fingerprints out-of-band with independent custody and witness evidence. Keep the key values private; publish public fingerprints and opaque reference IDs only after independent authentication.
3. Obtain an authenticated owner **TEST-only** decision scoped to a named application, approved test tenant and future limited nonproduction GET window. This has **not** been given. Actual test-only credentials belong in private server storage, not this repo.
4. Only after that separate authorization may a qualified operator run the real health/capabilities GET pair and independently witness the original seven denials, durability, revocation and rollback. A later separate owner pilot decision is needed to release any actual connection.

**Operational status:** all six applications `DISCONNECTED / HELD`; owner test `NOT_GIVEN`; real gateway tests `NOT_RUN`; Phase-B `HELD`; 12/12 live communications prerequisites `HELD`; 0 writes, calls, SMS or dispatch.

**Next queued AI Data Platform build: Build 229 — Recovery Preset Persistence, Renewal Recovery Search & Receipt Preset Recovery, plus QL-253 public-proof retry result reconciliation, ancestry-drift exception handling and owner TEST-only decision intake while authenticated requests remain HELD.**
