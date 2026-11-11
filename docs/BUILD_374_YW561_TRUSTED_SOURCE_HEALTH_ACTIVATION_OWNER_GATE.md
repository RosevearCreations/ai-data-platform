# AI Data Platform Build 374 — YW561 Trusted Source-Health Signer Admission, Current Receipt/Replay Evidence Activation, Three-Master Runtime Evidence Correlation & Explicit Owner Acceptance Gate

## Objective

Build 374 converts the Build 373 recheck into an explicit activation chain without weakening any trust boundary. Four independent gates remain visible:

1. trusted YW561 source-health signer admission;
2. exact current signed HEALTHY receipt and durable replay activation;
3. AI Hub 309 / Comms QL-417 three-Master runtime evidence correlation;
4. explicit owner acceptance for the exact current receipt.

No gate is opened by code GREEN, Vercel READY, provider-delivery proof, a historical receipt, or a historical owner decision.

## Current source identity

The independently observed YW561 production identity remains:

- Yard Workers production main: `3ac1bbce127a011af7830ad88da020112d132122`
- deployed manifest revision: `3ac1bbce127a011af7830ad88da020112d132122`
- `source_role=platform_shell`
- `tenant_boundary=platform_shell`
- live signature state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection state: `DISCONNECTED / HOLD`

## Trusted signer admission

Migration `0138_master_yw561_trusted_source_health_activation_owner_gate.sql` adds `app.master_yw561_trusted_signer_admission_events`.

Admission becomes `ADMITTED` only when Build 373 can independently correlate:

- the exact current YW561 production identity;
- an active controller-trusted source-health signer;
- committed independent enrollment/custody intake;
- matching Build 372 custody evidence;
- the same key ID and public SPKI SHA-256.

No private source signing key is accepted or stored.

Current state: **HOLD**.

## Current receipt/replay activation

Build 374 adds `app.master_yw561_current_receipt_replay_activation_events`.

The receipt becomes `ACTIVE_CURRENT` only when it is the exact current YW561 source-health receipt already verified and ADMITTED by the controller and signed by the admitted source-health signer.

Replay becomes `ACTIVE_CURRENT` only when the durable Build 372 replay evidence is correlated to that same exact receipt.

Provider-delivery proof from YW561 remains a separate trust domain and cannot activate source-health.

Current states:

- current receipt activation: **HOLD**
- current replay activation: **HOLD**
- source-health activation: **HOLD**

## Three-Master runtime correlation

Build 374 adds `app.master_yw561_three_master_runtime_correlation_events`.

The current baselines remain:

- Rosevear AI Hub 309 main: `0a94c72ee4a1ded1babeac68deeb981ad33835ef`
- Rosevear Comms Hub QL-417 main: `6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6`

Both repositories still document runtime HOLD pending authenticated original-host / signed receiver ACK / durable replay / owner-review evidence. Therefore the three-Master runtime correlation remains **HOLD**.

## Explicit owner acceptance gate

Build 374 adds `app.master_yw561_owner_acceptance_gate_events`.

The gate can become `READY_FOR_EXPLICIT_OWNER_ACCEPTANCE` only after:

- trusted signer admission = ADMITTED;
- exact current receipt = ACTIVE_CURRENT;
- exact durable replay = ACTIVE_CURRENT;
- source-health activation = ACTIVE;
- three-Master runtime evidence = CORRELATED_OPEN.

Even then, Build 374 does not create an owner ACCEPT. It recognizes only an existing owner decision in `app.master_owner_decision_audit` that references the exact current admitted YW561 receipt.

A stale ACCEPT for an older receipt is ignored.

Current gate: **HOLD**.

## Connection semantics

Build 374 always reports `connectionState=NOT_INFERRED`. Owner acceptance is an evidence decision, not permission for this build to manufacture CONNECTED, receiver ON, MASTERS_SYNCED or slave-gate OPEN.

## Security boundary

All Build 374 tables are append-only, RLS-protected and owner-recorded. Runtime roles receive SELECT/INSERT only and UPDATE/DELETE remain revoked.

Build 374 does not store private keys, receiver credentials or customer payloads; does not accept browser assertions as authority; does not substitute provider-delivery evidence for source-health evidence; does not reuse stale receipts or stale owner decisions; and does not infer runtime acceptance from deployment success.
