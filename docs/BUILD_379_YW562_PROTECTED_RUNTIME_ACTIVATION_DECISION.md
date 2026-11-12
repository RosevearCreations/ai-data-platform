# AI Data Platform Build 379 — YW562 Protected Runtime Evidence Admission, Exact Receipt/Owner Continuity, QL-422 Protected Correlation Closure & Supervised Activation Decision Execution

## Objective

Build 379 turns Build 378's protected activation readiness into a real, separated evidence-and-owner workflow without manufacturing operational connectivity.

The controller now has two independent authorities:

1. a machine-only protected Ed25519 intake that can admit fresh runtime evidence and close the historical QL-422 correlation lineage; and
2. the authenticated AI Data owner, who may execute an explicit approve/reject activation decision only while the exact protected evidence, YW562 receipt, Build 378 receipt admission and Master owner ACCEPT remain current.

Approval is an authorization record, not a receiver activation command.

## Production baselines observed during implementation

- AI Data Platform Build 378 main: `a0eea834c7e8d62232a70b13b06688c6b9b4babc`
- Yard Workers YW562 main: `6e0b77eebcfc77aa7fc48dcc398da958af8df696`
- Rosevear AI Hub Build 313 main: `b790adf2e19343d1132fad0eef8107c21e3e560d`
- Rosevear Comms Hub QL-423 main: `2adc527a88adb790f0edc5192df62f03be8c397c`
- Build 378 historical Comms correlation baseline: QL-422 `5f360821b361b43dd28aa5b2ca4c147565a84f0a`
- Build 378 historical AI Hub correlation baseline: Build 312 `e64e4b2e79e7c07bbd077284c298207414b149ad`
- original host: `DESKTOP-AE894KC`

QL-423 is deliberately treated as the current protected-runtime software baseline while the signed envelope separately binds the historical QL-422/Build 378 correlation lineage. This prevents a current QL-423 package from silently rewriting Build 378 history.

AI Hub Build 313 reached production during Build 379 implementation and was reconciled before preview. The signed envelope therefore binds current Build 313 separately from the Build 378 historical Build 312 correlation dependency.

## Protected runtime authority

Migration `0143_master_yw562_protected_runtime_activation_decision.sql` introduces the no-login PostgreSQL role:

`ai_data_protected_runtime`

The migration runner creates the role and grants it only to the server database owner. Normal application transactions continue to use `ai_data_runtime`. Protected transactions use `SET LOCAL ROLE ai_data_protected_runtime`.

The protected role receives only the evidence SELECT permissions and append-only INSERT permissions needed by Build 379. It has no browser user identity and cannot write owner decision tables.

## Signed protected intake

The protected endpoint is:

`POST /api/protected/build379-runtime-evidence`

There is no evidence GET endpoint. The route does not use a browser session or owner cookie.

The route requires the server-only environment pin:

`BUILD379_PROTECTED_INGEST_PUBLIC_KEY_PEM`

The supplied key must be Ed25519. The envelope's `authorityKeyId` must equal the SHA-256 SPKI fingerprint of that pinned public key.

The signature covers the canonical schema:

`rosevear.ai-data-platform.build379.protected-runtime-evidence.v1`

It binds:

- Build 379 controller base revision;
- historical Build 378 / QL-422 controller revision;
- Build 378 historical AI Hub and Comms correlation revisions;
- current YW562 production revision;
- current AI Hub production revision;
- current Comms production revision;
- original host `DESKTOP-AE894KC`;
- exact Build 378 runtime-prerequisite evidence ID;
- exact Build 378 fresh receipt-admission ID;
- exact current YW562 receipt ID and SHA-256;
- exact Master owner decision ID;
- source episode;
- source receipt, receiver ACK, historical closure, witness and terminal ledger digests;
- three distinct Master receipt digests;
- evidence reference;
- unique nonce;
- five-minute observation freshness.

The controller rejects a stale, replayed, mismatched or invalidly signed package.

## QL-422 protected correlation closure under current QL-423

After signature verification the protected database transaction first re-reads Build 378 evidence under the protected role.

Before admission, Build 379 requires:

- Build 378 runtime prerequisite state = `VERIFIED_CURRENT`;
- exact YW562 source receipt = `ACTIVE_CURRENT`;
- Build 378 fresh receipt binding = `ADMITTED_CURRENT`;
- exact Master owner acceptance = `ACCEPTED_CURRENT`.

The protected transaction then appends a `VERIFIED_CORRELATED` record to the existing QL-422 ledger using the separately signed historical Build 378 correlation revisions. It re-computes Build 378 readiness and requires `READY_FOR_PROTECTED_ACTIVATION` before committing the Build 379 protected admission.

The protected admission stores only bounded metadata and digests. It does not store private keys, raw source telemetry, cookies, credentials or transport secrets.

## Exact receipt / owner continuity

Build 379 continuously re-checks that the current protected admission still references:

- the latest Build 378 runtime-prerequisite evidence;
- the latest Build 378 fresh receipt-admission event;
- the exact current YW562 receipt;
- the exact current Master owner ACCEPT;
- the exact latest protected QL-422 correlation.

Any drift returns HOLD and blocks owner approval.

Protected evidence is intentionally short-lived for authorization: the protected package must remain within the five-minute freshness window when the owner executes the decision.

## Supervised activation decision execution

The owner API is:

`POST /api/yw562-protected-activation`

with action:

`execute-supervised-activation-decision`

Only an authenticated suite owner may write the decision.

The owner must provide:

- `APPROVE_ACTIVATION` or `REJECT_ACTIVATION`;
- an explicit attestation;
- a 15–500 character owner note.

Approval is permitted only in `READY_FOR_OWNER_DECISION`.

An approval appends both:

- `ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME`; and
- `SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED`.

A rejection appends:

- `REJECTED_HOLD`; and
- `SUPERVISED_ACTIVATION_REJECTED_HOLD`.

The execution ledger is constrained to:

- receiver = `OFF`;
- connection = `DISCONNECTED_HOLD`;
- mastersSynced = false.

Build 379 therefore executes the owner decision but **does not execute external runtime activation**.

## Persistence

Migration 0143 adds three append-only RLS-protected ledgers:

- `app.master_build379_protected_runtime_admission_events`
- `app.master_build379_supervised_activation_decision_events`
- `app.master_build379_activation_decision_execution_events`

It also adds the protected-role INSERT policy required to append independently verified rows to the existing:

- `app.master_ql422_original_host_three_master_correlation_events`

The normal `ai_data_runtime` role cannot insert Build 379 protected admissions.

## Current truthful operational state

Production code can be GREEN while protected evidence remains absent.

Until a real pinned protected authority submits a valid current package and an owner executes a fresh decision:

- protected runtime evidence = HOLD;
- exact receipt/owner continuity = HOLD;
- QL-422 protected correlation closure = HOLD;
- supervised activation decision = HOLD;
- receiver = OFF;
- connection = `DISCONNECTED_HOLD`;
- Masters synchronized = false.

Even after owner approval, Build 379 remains `DISCONNECTED_HOLD` until a separate external runtime activation implementation produces genuine operational proof.
