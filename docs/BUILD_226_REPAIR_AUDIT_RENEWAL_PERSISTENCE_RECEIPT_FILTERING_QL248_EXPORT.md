# Build 226 — Repair Recovery Audit, Renewal Preset Persistence, Receipt Recovery Filtering & QL-248 Proof-Origin Export Verification

## Objective
Advance the queued browser-local recovery cycle and add deterministic QL-248 Phase-A proof-origin scaffold export plus immutable six-source origin consistency verification while Phase-B authenticated testing remains HELD.

## Recovery scope
- retain bounded newest repair preset recovery audit evidence;
- persist selected newest renewal recovery preset using the existing sanitized browser-local namespace;
- restore only known renewal preset IDs and clear persisted preset mode on manual age/search changes;
- add All, Last 24 hours and Last 7 days filtering to the newest receipt preset recovery audit;
- preserve complete retained receipt recovery evidence and full export independently of visible age filtering.

## QL-248 proof-origin export
Build 226 can export a complete six-source Phase-A proof-origin scaffold as deterministic JSON. The export contains no credentials and preserves source revision, source CI, proof-bearing commit, proof digest, SPKI pin, business/tenant mapping and immutable raw proof URL for all six systems.

The verifier checks:
- exactly six systems in canonical order;
- unique repositories, proof URLs and public-key pins;
- sourceRevision and proofCommitSha are distinct;
- each raw proof URL exactly matches its repository and proofCommitSha;
- each source CI URL belongs to the same repository;
- deterministic export bytes can be SHA-256 fingerprinted;
- any origin mismatch fails closed.

A successful export verification returns `SIX_SOURCE_IMMUTABLE_ORIGIN_CONSISTENT_AUTH_TESTING_HELD`.

## Safety boundaries
- Phase-B authenticated testing remains **HELD**;
- owner authorization remains **NOT GIVEN**;
- connection state remains **DISCONNECTED**;
- no HMAC credential provisioning;
- no seven-denial claim;
- no durable audit/revocation/rollback claim;
- no writes, calls, SMS, dispatch, payments, bookings, marketplace publication or direct database sharing;
- no database migration, schema or RLS change for this recovery-preference work.

## Next roadmap item
**Build 227 — Repair Recovery Filtering, Renewal Preset Recovery & Receipt Recovery Search, plus QL-248 exported-origin digest reconciliation and six-source immutable-origin drift detection while authenticated testing remains HELD.**
