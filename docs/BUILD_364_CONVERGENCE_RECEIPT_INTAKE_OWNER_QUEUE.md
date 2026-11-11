# Build 364 — Yard Workers & iCamp Convergence Receipt Intake, Source-Bound Signature Verification, Health Evidence Correlation & Owner Acceptance Decision Queue

## Objective

Build 364 provides the AI Data receiving side for the Build 363 source handoffs:

- `MASTER363-YW-SOURCE-CONVERGE`
- `MASTER363-ICAMP-SOURCE-CONVERGE`

It does not manufacture or infer source evidence. Until Yard Workers and iCamp return their own convergence receipts, the queue remains `WAIT_FOR_SOURCE_RECEIPT`.

## Receipt verification contract

A receipt is eligible only when all of the following are true:

1. source ID, source app, repository and Build 363 handoff token match exactly;
2. source, manifest and health revisions all equal the current production source revision;
3. an independent signer key ID and public Ed25519 verification key are present;
4. the Ed25519 signature verifies over the canonical source-bound receipt payload;
5. the receipt nonce has not already been seen;
6. receipt and health timestamps are fresh;
7. health state is `HEALTHY` and is bound to the exact production revision.

Build 364 stores/verifies only public signing material. Source private keys must never enter AI Data.

## Current source state

### Yard Workers

- current production main: `cdc368e2f2773863595ff9cf6f35c1f02773eeaf`
- current discovery manifest revision: `028aee250857415b9b9035aaec50060757e377a5`
- signer: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection: `DISCONNECTED / HOLD`
- Build 364 receipt state: `NOT_RECEIVED`

### iCamp

- current production main: `e2d343595363ca9106e7f1dbc60006e3a6c616aa`
- current discovery manifest revision: `dc1369338a4b191fc72031b7e62f7e48fd805bcd`
- signer: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection: `DISCONNECTED / HOLD`
- Build 364 receipt state: `NOT_RECEIVED`

## Owner acceptance decision queue

Receipt verification and health correlation do not automatically create connection acceptance.

The queue state progresses only through independently evidenced stages:

- `WAIT_FOR_SOURCE_RECEIPT`
- `EVIDENCE_HOLD`
- `WAIT_FOR_MASTER_RUNTIME_CLOSURE`
- `READY_FOR_OWNER_DECISION`
- `OWNER_ACCEPTED` or `OWNER_REJECTED`

The controller cannot auto-accept the owner decision.

## Master dependency

Even two cryptographically verified, fresh, source-bound receipts remain blocked at `WAIT_FOR_MASTER_RUNTIME_CLOSURE` while the three-Master runtime state is not `MASTERS_SYNCED`.

## Production CI

Build 364 is included in both `ci:spine` and the Vercel production `build` command before production migrations and the Next.js production build.
