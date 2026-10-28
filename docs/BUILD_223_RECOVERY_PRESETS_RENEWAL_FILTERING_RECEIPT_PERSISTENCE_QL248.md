# Build 223 — Recovery Search Presets, Renewal Recovery Filtering, Receipt Preset Persistence & QL-248 Two-SHA Consumer Amendment

## Objective

Extend Build 222 by advancing the queued browser-local recovery cycle and adopting the QL-248 proof-commit clarification without starting Phase-B authenticated testing.

## Recovery scope

- deterministic newest repair recovery search presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- newest renewal recovery audit age filtering for All, Last 24 hours and Last 7 days;
- dedicated browser-local persistence for the selected newest receipt recovery search preset;
- safe restoration of known receipt presets and sanitization of unsupported IDs to All;
- manual repair/receipt age or search changes leave preset mode as applicable;
- no arbitrary manual search text persistence.

## QL-248 consumer clarification

Build 223 explicitly separates:

- `sourceRevision`: earlier audited/tested source commit signed inside the QL-246 payload;
- `proofCommitSha`: later immutable Git commit containing the public proof file;
- `proofSha256`: hash of exact raw public proof bytes at that later commit;
- `ciRunUrl`: CI belonging to the earlier source revision;
- `publicKeyFingerprintSha256`: independently authenticated Ed25519 public-key pin.

The v2 trusted row is used only to transport and verify this distinction. The signed QL-246 payload field order and canonical Ed25519 bytes do not change.

The consumer verifies proof bytes from the later proof-bearing SHA while requiring the signed `source_revision` and source CI to match the earlier audited source revision.

## Phase-A / Phase-B boundary

Build 223 does not start Phase-B testing and does not provision HMAC credentials.

- seven genuine denial observations: **PENDING**;
- durable audit/revocation/rollback witness: **PENDING**;
- owner pilot authorization: **NOT GIVEN**;
- actual connection: **DISCONNECTED / HOLD**.

## Safety boundaries

- no production credential creation;
- no direct database sharing;
- no customer/product/reference endpoint expansion;
- no writes, dispatch, calls, SMS, payments, bookings, reservations, payroll/job actions, device/vault actions or marketplace publication;
- no database migration for this recovery build;
- no schema or RLS change;
- no automatic workflow transition.

`main` Production GREEN means the safe Build 223 code is deployed; it does not mean integration acceptance.

## Next roadmap item

**Build 224 — Recovery Preset Persistence, Renewal Recovery Search & Receipt Recovery Repair, plus QL-248 v2 manifest fixture hardening and Phase-A source/CI provenance checks while authenticated testing remains HELD.**
