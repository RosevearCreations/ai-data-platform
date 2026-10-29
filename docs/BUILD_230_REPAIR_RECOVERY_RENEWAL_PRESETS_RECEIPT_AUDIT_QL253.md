# Build 230 — Repair Preset Recovery, Renewal Recovery Presets, Receipt Recovery Audit & QL-253 Continuity

## Objective
Advance the queued browser-local recovery cycle and add QL-253 retry-evidence renewal, ancestry-exception aging and privately verified owner TEST-decision continuity while authenticated request execution remains HELD.

## Recovery scope
- recover unsupported persisted repair recovery preset IDs safely to All;
- retain deterministic renewal recovery presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- retain newest-first bounded receipt recovery audit evidence;
- keep recovery UI state browser-local and non-authoritative.

## QL-253 retry-evidence renewal
Retry evidence renews only when all source/proof facts are fresh and independently coherent: exact source SHA, exact GitHub Actions run URL with head SHA equal to source A, distinct proof B, HTTP 200 immutable proof, exact raw proof SHA-256, verified A→B ancestry and verification age no older than one hour.

Any missing or stale fact returns `HOLD_RETRY_EVIDENCE_RENEWAL_INCOMPLETE`.

Current public-only state at observed main `76f73363a9a29a34ed8bf09b6b4ff58a0dc77482` remains:
- source CI: NOT_AVAILABLE;
- proof B: NOT_AVAILABLE;
- immutable proof: HTTP 404;
- proof digest: NOT_AVAILABLE;
- pin/registry/custody/witness evidence: NOT_AVAILABLE.

## Ancestry-exception aging
Unresolved ancestry exceptions remain active. They become `HOLD_ANCESTRY_EXCEPTION_OVERDUE` after 24 hours. Resolution does not authorize testing; it returns a resolved state with owner TEST authorization still separately held.

## Owner TEST-decision continuity
A previously independently verified owner decision can continue only when the current decision is independently verified again, private identity verification remains true, business/tenant/environment and exact GET-only health/capabilities scope are unchanged, a non-secret owner receipt remains present, and the current window is future-dated and no longer than 30 minutes.

Even successful continuity returns `OWNER_TEST_DECISION_CONTINUITY_VERIFIED_REQUEST_EXECUTION_HELD`. It does not run the GETs.

## Safety boundaries
- no signer private keys or registry contents committed;
- no invented source CI, proof B, proof digest, registry snapshot, custody/witness receipt or owner receipt;
- no gateway GETs while HELD;
- no seven-denial receipt claims;
- no production connection;
- connection remains DISCONNECTED unless a later separately authorized process changes it.

## Next roadmap item
**Build 231 — Repair Recovery Audit, Renewal Preset Persistence & Receipt Recovery Filtering, plus QL-254 original signed-proof retrieval follow-up, independent private pin-registry witness evidence and reversible 24/7 relay readiness while connection remains HELD.**
