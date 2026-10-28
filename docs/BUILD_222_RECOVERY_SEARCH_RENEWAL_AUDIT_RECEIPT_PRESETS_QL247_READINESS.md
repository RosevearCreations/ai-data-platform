# Build 222 — Recovery Audit Search, Renewal Recovery Audit, Receipt Recovery Presets & QL-247 Connection-Test Readiness

## Objective

Extend Build 221 by advancing the queued browser-local recovery cycle and reconciling the QL-247 six-application connection-test readiness handoff without fabricating QL-246 source proof or treating shared GitHub ownership as authentication.

## Recovery scope

- search newest repair recovery audit evidence by audit ID, requested preset ID, recovered preset ID and recovery reason;
- apply repair search after the selected age filter;
- keep repair search temporary and browser-local;
- retain a bounded newest renewal preset-recovery audit, newest-first and independently exportable/clearable;
- expose deterministic receipt recovery presets for All recoveries, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- keep manual receipt age/search changes outside preset mode;
- preserve all existing RLS, role checks, confirmations and destination-workflow authority.

## QL-247 readiness reconciliation

Build 222 records the supplied QL-247 handoff and a truthful AI Data Platform owner-safe readiness return.

The gateway remains nonproduction-only. Build 222 does not claim that Phase B has occurred and does not create a final signed QL-246 acceptance envelope unless all seven denial cases were actually observed by an independent reviewer.

The allowed connection-test scope remains only:

- `GET /api/integration/v1/health`;
- `GET /api/integration/v1/capabilities`.

The following remain separate required evidence:

- distinct per-source/tenant/environment HMAC credentials stored only in approved secret stores;
- independent reviewer observation of replay, stale, cross-business, cross-tenant, revoked-key, write and dispatch denials;
- durable audit re-read after restart/redeploy;
- pinned public signing keys and deployed source SHA verification;
- rotation/revocation and rollback witness;
- a fresh one-hour QL-246 challenge after genuine Phase-B observations;
- a later, separate owner pilot decision.

## Truthful current state

- final QL-246 signed proof: **BLOCKED pending genuine Phase-B observations**;
- HMAC test credential provisioning: **NOT PROVISIONED by this build**;
- authenticated health/capabilities receipts: **UNVERIFIED**;
- seven genuine denial traces: **UNVERIFIED**;
- durable post-restart audit: **UNVERIFIED**;
- owner pilot approval: **NOT GIVEN**;
- actual connection: **DISCONNECTED / HOLD**.

## Safety boundaries

- no credentials committed or placed in public docs;
- no production integration;
- no customer/product/reference data endpoint expansion;
- no writes, dispatches, messages, payments, bookings, reservations, payroll/job actions, device/vault actions or phone/SMS operations;
- no database migration for the recovery-cycle work;
- no schema or RLS change;
- no automatic workflow transition.

`main` Production GREEN means Build 222 code deployed successfully. It does not mean the six applications are authenticated to one another.

## Verification

Build 222 verifies the queued recovery search/audit/preset behavior, QL-247 handoff presence, exact GET-only scope, the seven-denial requirement, explicit NOT GIVEN / DISCONNECTED / HOLD state, and the prohibition on interpreting GitHub identity as service authentication.

## Next roadmap item

**Build 223 — Recovery Search Presets, Renewal Recovery Filtering & Receipt Preset Persistence, plus QL-247 Phase-A source/trust readiness reconciliation without starting Phase-B authenticated testing.**
