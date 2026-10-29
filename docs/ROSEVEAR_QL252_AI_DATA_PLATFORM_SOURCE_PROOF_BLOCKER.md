# Rosevear QL-252 — AI Data Platform Source-Proof Publication Blocker Action

## Verified blocker state

At the QL-252 source snapshot, AI Data Platform source commit A is:

`037b18247e59cb68d1f7ca5d7149595bd7487957`

The immutable proof path `docs/integration/ql246-source-proof.json` at that SHA returns **404**.

The available commit-run lookup returned no GitHub Actions workflow run for that exact SHA. The combined commit status contains a successful Vercel deployment status, but QL-252 requires a GitHub Actions source CI run URL whose head SHA is exactly A. Therefore the source CI field is **NOT_AVAILABLE** for this handoff.

No genuine Ed25519 signing private key, independently authenticated custody receipt, distinct witness receipt, or separately authenticated owner TEST-only decision is available in this build context. Build 227 does **not** fabricate any of those artifacts.

## Public return fields

The canonical public blocker status is stored at:

`docs/integration/ql252-ai-data-platform-public-proof-status.json`

It truthfully reports:

- source SHA A: the observed QL-252 source commit;
- source CI run URL: `NOT_AVAILABLE`;
- proof commit SHA B: `NOT_AVAILABLE`;
- immutable public proof URL: `404`;
- exact proof bytes SHA-256: `NOT_AVAILABLE`;
- public SPKI SHA-256: `NOT_AVAILABLE`;
- custody/witness/owner receipts: `NOT_AVAILABLE`;
- owner test decision: `NOT_GIVEN`;
- actual gateway test: `NOT_RUN`;
- connection state: `DISCONNECTED`.

## Publication rule

A future genuine QL-246 proof may be published only when all of the following exist as original evidence:

1. a tested source commit A;
2. a GREEN GitHub Actions run URL whose `head_sha` is exactly A;
3. a short-lived nonproduction challenge;
4. an authentic Ed25519 signature from a securely held private key;
5. a later proof commit B, descendant of A, containing exactly `docs/integration/ql246-source-proof.json`;
6. a public immutable B URL returning 200;
7. the SHA-256 of the exact raw proof bytes;
8. independently authenticated custody and witness evidence obtained outside GitHub;
9. a separate authenticated owner TEST-only decision before any real gateway GET is executed.

Normal application CI, Vercel deployment GREEN, synthetic fixtures, or source-only verification must never be substituted for those original artifacts.

## Build 227 scope

Build 227 also adds:

- repair recovery audit age filtering;
- renewal persisted preset recovery;
- receipt recovery audit search;
- QL-248 exported-origin digest reconciliation;
- immutable six-source origin drift detection;
- fail-closed HOLD on any digest or origin drift.

Authenticated Phase-B testing remains **HELD**. Owner authorization remains **NOT_GIVEN**. Actual gateway testing remains **NOT_RUN**. Connection remains **DISCONNECTED**.

## Next roadmap item

**Build 228 — Recovery Search Presets, Renewal Recovery Filtering & Receipt Preset Persistence, plus QL-253 immutable-proof retry readiness, source-CI/proof ancestry reconciliation and custody-pin exception renewal while owner TEST-only authorization remains HELD.**
