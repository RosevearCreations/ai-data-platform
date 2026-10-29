# Build 225 — Repair Preset Recovery, Renewal Recovery Presets, Receipt Recovery Audit & QL-248 Phase-A Proof-Origin Completeness

## Objective

Extend Build 224 by advancing the queued browser-local recovery cycle and adding immutable proof-origin attestation scaffolding for QL-248 Phase-A six-source completeness while authenticated connection testing remains HELD.

## Recovery scope

- validate the persisted newest repair recovery preset on load;
- recover unsupported repair preset IDs safely to All;
- write the repaired preset back locally and expose the existing recovery notice;
- add deterministic newest renewal recovery presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- leave renewal preset mode when age/search is changed manually;
- keep renewal preset selection temporary and browser-local;
- retain a bounded newest receipt preset-recovery audit with requested preset, recovered preset, reason and timestamp;
- keep receipt recovery evidence newest-first, independently exportable/clearable and browser-local.

## QL-248 immutable proof-origin scaffolding

Build 225 adds a public-metadata-only Phase-A proof-origin scaffold derived from a valid QL-248 v2 trusted manifest.

The scaffold records, for each of exactly six systems:

- system and repository;
- earlier audited `sourceRevision`;
- corresponding source CI URL;
- later immutable `proofCommitSha`;
- exact raw proof `proofSha256`;
- independently supplied Ed25519 public-key SPKI SHA-256 pin;
- business/tenant mapping;
- immutable raw public proof URL.

The scaffold is not an owner attestation, gateway receipt or authentication result. It exists to make the six-source provenance set explicit and reviewable.

## Six-source completeness gate

The Phase-A scaffold is complete only when the manifest is a valid QL-248 v2 manifest containing all six systems in the required order and every existing v2 source/proof provenance invariant passes.

Successful Phase-A completeness returns:

`SIX_SOURCE_PHASE_A_PROVENANCE_COMPLETE_AUTH_TESTING_HELD`

It still reports:

- owner authorization: **NOT GIVEN**;
- connection state: **DISCONNECTED**.

Incomplete or invalid provenance returns:

`HOLD_PHASE_A_MANIFEST_INCOMPLETE`

No partial six-source set is promoted as complete.

## Safety boundaries

- no authenticated Phase-B gateway test;
- no HMAC secret provisioning;
- no seven-denial evidence claim;
- no durable audit/revocation/rollback claim;
- no read-only pilot approval;
- no production credential creation or rotation;
- no direct database sharing;
- no write, dispatch, phone/SMS, payment, booking, reservation, payroll/job, marketplace or device/vault operation;
- no database migration for the recovery-preference work;
- no schema or RLS change;
- no automatic workflow transition.

`main` Production GREEN means Build 225 deployed successfully. It does not mean the six applications are connected.

## Next roadmap item

**Build 226 — Repair Recovery Audit, Renewal Preset Persistence & Receipt Recovery Filtering, plus QL-248 proof-origin scaffold export/verification fixtures and immutable six-source origin consistency checks while Phase-B remains HELD.**
