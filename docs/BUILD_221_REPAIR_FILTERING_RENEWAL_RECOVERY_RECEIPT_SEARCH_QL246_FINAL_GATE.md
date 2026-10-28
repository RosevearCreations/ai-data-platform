# Build 221 — Repair Recovery Filtering, Renewal Preset Recovery, Receipt Recovery Search & QL-246 Final Source-Proof Gate

## Objective

Extend Build 220 by completing the queued browser-local recovery cycle and reconciling the final six-application QL-246 source-proof/trusted-pin handoff without converting source proof into connection authorization.

## Functional scope

- add All, Last 24 hours and Last 7 days filtering to the newest repair recovery audit;
- preserve complete repair evidence while filtering the visible ledger;
- recover unsupported persisted newest renewal search-preset IDs to the safe All preset recoveries view;
- write the recovered safe renewal preset back locally and surface a recovery notice;
- add text search across newest receipt recovery audit ID, requested preset ID, recovered preset ID and recovery reason;
- keep repair filtering, renewal recovery and receipt search browser-local and temporary where applicable;
- retain the existing QL-246 public-only verifier for all six applications;
- require immutable commit-SHA proof locations, independently supplied Ed25519 SPKI pins, exact raw-JSON SHA-256 digests and one-hour trusted challenges;
- keep the QL-246 result fail-closed when any source, signature, pin, tenant, challenge, expiry or scope assertion does not match;
- preserve the explicit separation between public signed source proof and later authenticated gateway testing.

## QL-246 final source-proof gate

The Build 221 handoff follows the supplied QL-246 contract:

- each of AI Data Platform, Devil n Dove, Rosie Dazzlers, Yard Workers, iCamp and Rosevear AI Hub publishes exactly one nonsecret signed metadata envelope at an immutable Git commit;
- source proofs are limited to nonproduction GET health/capabilities scope;
- owner authorization remains `NOT_GIVEN`;
- connection state remains `DISCONNECTED`;
- `external_gateway_get_verified`, `durable_audit_verified` and `owner_identity_verified` remain `false` for source-only review;
- a successful public proof is not an authenticated gateway test and does not authorize a pilot, production connection, write, dispatch, message, payment, booking, reservation, device action or customer-data flow;
- any unavailable or unverified proof returns PENDING/BLOCKED/HOLD rather than invented evidence.

## Safety boundaries

- no production credential creation or rotation;
- no live provider connection;
- no customer/product/reference data endpoint expansion;
- no database migration for the browser-local recovery work;
- no schema or RLS change;
- no automatic workflow transition;
- no owner authorization inferred from CI, deployment, signature verification or metadata publication.

`main` Production GREEN means the safe Build 221 code is deployed successfully. It does not change the QL-246 connection decision from HOLD/DISCONNECTED.

## Verification

Build 221 verifies:

- newest repair recovery audit age filtering;
- newest renewal persisted preset recovery;
- newest receipt recovery audit search;
- Build 220 forward compatibility;
- registration in the application test chain;
- QL-246 six-app names and immutable source-proof path;
- exact nonproduction GET-only scope;
- owner authorization `NOT_GIVEN`;
- connection state `DISCONNECTED`;
- public-source verification remaining distinct from authenticated gateway testing.

## Next roadmap item

**Build 222 — Recovery Audit Search, Renewal Recovery Audit & Receipt Recovery Presets, with continued QL-246 HOLD reconciliation until independently witnessed authenticated gateway acceptance and explicit owner authorization exist.**
