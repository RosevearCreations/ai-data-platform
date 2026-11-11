# AI Data Platform Build 368 — Master Runtime Evidence Closure, iCamp Revision Re-Convergence, Source Receipt Refresh & Supervised Acceptance Recheck

## Objective

Build 368 refreshes the Master and source acceptance baseline after AI Hub 308, Comms QL-416, Yard Workers YW559 and iCamp 243.

It does not convert code GREEN into runtime acceptance. It records a fresh append-only runtime recheck, emits per-source receipt-refresh/re-convergence handoffs and records supervised acceptance recheck results.

## Current Master truth

### Rosevear AI Hub 308

- ACK: `MASTER360-AIHUB-308-ACK`
- main: `cefc2b8859e51ca29f0255f69f8361161f8a117d`
- dev: `4ab2284da9ad6644136d313d8760f0f8c7282a90`
- code: GREEN
- production CI: 6/6 SUCCESS
- automation host: `DESKTOP-AE894KC_ONLY`
- installed release: HOLD
- signed one-TEST: HOLD
- Comms receiver ACK: HOLD
- three-Master receipts: HOLD
- connection: HOLD
- Masters synced: HOLD
- slave gate: HOLD

### Rosevear Comms Hub QL-416

- ACK: `MASTER360-COMMS-QL416-ACK`
- main: `95d5780f377c7e2fd3c357789cbc2566fcf03b6c`
- code: GREEN
- production checks: 7/7 SUCCESS
- original-host telemetry: HOLD
- signed one-TEST: HOLD_RUNTIME_EVIDENCE
- signer custody: HOLD
- durable replay: CODE_READY_RUNTIME_HOLD
- uptime: UNKNOWN
- owner acceptance: HOLD
- receiver: OFF
- connection: HOLD
- slave gate: HOLD_NEXT_MASTER_INTEGRATION_STAGE

Therefore the Build 368 Master runtime gate remains **HOLD**.

## Current source truth

### Yard Workers

- production main: `443a4380fe3875cf632702474e94ce74309d3f14` (YW559)
- public manifest is deployment-bound to the Vercel production commit
- independent Ed25519 signer: not enrolled
- current admitted signed HEALTHY receipt: not received
- handoff: `MASTER368-YW-SOURCE-REFRESH`
- required action: `REFRESH_SIGNER_AND_RECEIPT`

### iCamp

- production main: `1f29c23f5fba7c2326e09873ebff42223622044b` (Build 243)
- checked-in manifest revision: `e2d343595363ca9106e7f1dbc60006e3a6c616aa`
- manifest state: `HOLD_MANIFEST_STALE`
- independent Ed25519 signer: not enrolled
- current admitted signed HEALTHY receipt: not received
- handoff: `MASTER368-ICAMP-RECONVERGE-REFRESH`
- required action: `RECONVERGE_MANIFEST_AND_REFRESH_RECEIPT`

AI Data Platform does not rewrite either source manifest and never creates or stores source private signing keys.

## Durable recheck evidence

Migration 0132 adds three append-only RLS-protected ledgers:

1. `app.master_runtime_evidence_rechecks`
   - exact AI Data controller revision
   - AI Hub ACK/main/runtime state
   - Comms ACK/main/runtime state
   - blocker list
   - OPEN/HOLD gate state

2. `app.master_source_receipt_refresh_requests`
   - source production revision
   - observed manifest revision/state
   - signer state
   - current receipt state
   - required refresh action
   - handoff token
   - blocker list

3. `app.master_supervised_acceptance_rechecks`
   - links the Master runtime recheck to the source refresh request
   - captures source evidence READY/HOLD
   - captures supervised acceptance READY_FOR_OWNER_REVIEW/HOLD
   - preserves blockers at the time of the recheck

Runtime roles have SELECT + INSERT only. UPDATE and DELETE are revoked.

## Acceptance conditions

A source reaches `READY_FOR_OWNER_REVIEW` only when:

- the current source revision is reconciled;
- exactly one independently enrolled trusted Ed25519 source signer is active;
- a fresh admitted signed HEALTHY receipt matches the exact current production and manifest revision;
- the AI Hub 308 / Comms QL-416 Master runtime gate is OPEN.

An older receipt, older production SHA, stale iCamp manifest or code-only Master proof cannot satisfy Build 368.

## Current result

- Master runtime gate: HOLD
- Yard Workers source evidence: HOLD
- iCamp source evidence: HOLD
- supervised acceptance closure: HOLD
- connection state: unchanged / HOLD
- no owner acceptance inferred
