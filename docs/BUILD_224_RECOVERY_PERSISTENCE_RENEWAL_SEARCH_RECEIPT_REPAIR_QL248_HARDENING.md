# Build 224 — Recovery Preset Persistence, Renewal Recovery Search, Receipt Recovery Repair & QL-248 v2 Provenance Hardening

## Objective

Extend Build 223 by advancing the queued browser-local recovery cycle and hardening the QL-248 v2 trusted-manifest path without starting authenticated Phase-B testing.

## Recovery scope

- persist the selected newest repair recovery search preset in a dedicated browser-local namespace;
- restore only known repair preset IDs and sanitize unsupported values;
- clear persisted repair preset mode when repair age/search changes manually or the ledger is cleared;
- add text search to the newest renewal recovery audit across audit ID, requested preset ID, recovered preset ID and reason;
- apply renewal search after age filtering while preserving newest-first order;
- keep renewal search temporary and browser-local;
- recover unsupported persisted receipt recovery preset IDs to the safe All preset;
- write the safe receipt preset back locally and expose the existing recovery notice;
- keep arbitrary manual search text out of persistence.

## QL-248 v2 manifest hardening

The AI Data Platform consumer now requires the manifest schema and row shape to agree:

- `trusted-pins.v1` accepts only the original v1 row shape;
- `trusted-pins.v2` accepts only the QL-248 v2 row shape;
- a v2 `sourceRevision` and `proofCommitSha` must be distinct;
- `proofCommitSha` is used only to locate the later immutable proof-bearing commit;
- the signed payload `source_revision` must still match the earlier audited `sourceRevision`;
- the exact signed payload `ci_run_url` must match the independently supplied `ciRunUrl`;
- exact raw proof bytes must hash to `proofSha256`;
- the independently pinned Ed25519 SPKI fingerprint remains mandatory.

The verification suite now contains a six-source v2 fixture that proves the separation and explicitly fails closed for same-SHA, mixed-version and wrong-source-CI cases.

## Phase-A provenance boundary

Build 224 performs only public/source provenance validation. It does not:

- provision HMAC credentials;
- call authenticated gateway endpoints;
- claim seven genuine denial observations;
- claim durable audit/revocation/rollback witness;
- approve a read-only pilot.

Owner pilot authorization remains **NOT GIVEN** and actual connection remains **DISCONNECTED / HOLD**.

## Safety boundaries

- no production credential creation or rotation;
- no direct database sharing;
- no new customer/product/reference data endpoint;
- no write, dispatch, call, SMS, payment, booking, reservation, payroll/job, marketplace or device/vault operation;
- no database migration for the recovery-preference work;
- no schema or RLS change;
- no automatic workflow transition.

`main` Production GREEN means the Build 224 application release deployed successfully. It does not mean integration acceptance or authenticated connectivity.

## Next roadmap item

**Build 225 — Repair Preset Recovery, Renewal Recovery Presets & Receipt Recovery Audit, plus QL-248 immutable proof-origin attestation scaffolding and Phase-A six-source completeness checks while connection testing remains HELD.**
