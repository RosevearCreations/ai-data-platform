# AI Data Platform Build 369 — Source Refresh Evidence Intake, iCamp Manifest Re-Convergence Confirmation, YW/iCamp Fresh Signed Health Admission & Three-Master Acceptance Recheck

## Purpose

Build 369 consumes the Build 368 source-refresh handoffs without allowing source ACK text to establish its own trust.

It refreshes the current production baselines to Yard Workers YW560 and iCamp 244, records sanitized source refresh evidence, independently confirms exact deployed manifest revisions, correlates only the controller's trusted signer and signed-health ledgers, and records a new three-Master acceptance recheck.

## Current source baselines

### Yard Workers — YW560

- production main: `2c7234c975528a3a3ab76ca22829c8b4a541de97`
- tracked discovery manifest revision: null by design
- deployment binding: exact `VERCEL_GIT_COMMIT_SHA` on production/main
- tenant boundary: `platform_shell`
- repository signature state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- Build 368 handoff: `MASTER368-YW-SOURCE-REFRESH`
- source signer: HOLD
- fresh signed HEALTHY receipt: HOLD
- durable replay evidence: HOLD

YW560 explicitly states that its deployment-bound unsigned manifest, code-ready receipt handling and provider receipt logic are not Master acceptance.

### iCamp — Build 244

- production main: `69d46513b45e340a4e295165abbd3d99b3a62274`
- tracked discovery manifest baseline: `1f29c23f5fba7c2326e09873ebff42223622044b` (last independently observed Build 243)
- deployment binding: Build 241 sync script replaces the deployed manifest revision with exact `VERCEL_GIT_COMMIT_SHA`
- tenant boundary: `platform_shell`
- repository signature state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- Build 368 handoff: `MASTER368-ICAMP-RECONVERGE-REFRESH`
- source signer: HOLD
- fresh signed HEALTHY receipt: HOLD
- durable replay evidence: HOLD

The tracked Build 243 baseline is not classified as the deployed Build 244 manifest. Build 369 requires independent deployed-manifest evidence for exact Build 244 revision confirmation.

## Source refresh evidence intake

Migration 0133 adds:

`app.master_source_refresh_evidence_events`

Each append-only event records:

- exact expected Build 368 handoff token;
- exact current source production SHA;
- tracked manifest baseline;
- independently observed deployed manifest SHA;
- manifest confirmation state;
- platform-shell tenant boundary;
- controller-derived signer state;
- controller-derived receipt state;
- durable replay evidence state;
- opaque evidence URI and optional SHA-256 digest;
- sanitized ACK text;
- blockers.

The controller rejects:

- wrong handoff tokens;
- old source production revisions;
- non-platform-shell tenant boundaries;
- malformed manifest revisions;
- secret-bearing ACK fields;
- a claim of VERIFIED durable replay without a digest.

The source does **not** get to submit a trusted signer state or receipt state. Those are derived from the Build 365/366 controller ledgers.

## Manifest re-convergence confirmation

A manifest becomes `CONFIRMED_EXACT` only when the independently received deployed manifest revision exactly equals the current production main SHA.

Repository build scripts and documentation demonstrate how the source intends to bind the revision, but they are not accepted as runtime confirmation.

## Fresh signed HEALTHY admission

Build 369 does not create another signature-verification path.

The current receipt must already exist in:

`app.master_convergence_receipt_ledger`

and its latest admission must already be `ADMITTED` in:

`app.master_source_health_admission_events`.

The receipt must:

- use a trusted independently enrolled source signer;
- match the exact current source production revision;
- match the exact deployed manifest revision;
- remain within the current freshness window;
- be HEALTHY;
- have passed nonce/replay checks.

Old YW559, iCamp243 or earlier receipts cannot satisfy Build 369.

## Three-Master acceptance recheck

Build 369 appends:

`app.master_three_master_acceptance_rechecks`

for each source.

The recheck records:

- exact source production revision;
- Build 368 AI Data controller base revision;
- AI Hub 308 ACK/main;
- Comms QL-416 ACK/main;
- Master gate OPEN/HOLD;
- source evidence READY/HOLD;
- signed-health state;
- supervised acceptance state;
- blocker snapshot.

Current AI Hub 308 and Comms QL-416 evidence leaves the Master gate **HOLD**.

Therefore even a future fully verified YW/iCamp source refresh cannot reach `READY_FOR_OWNER_REVIEW` until the three-Master runtime gate is independently closed.

## Current result

- YW560 deployed manifest: independent exact confirmation not yet received
- iCamp244 deployed manifest: independent exact confirmation not yet received
- YW source signer: HOLD
- iCamp source signer: HOLD
- YW fresh signed HEALTHY admission: HOLD
- iCamp fresh signed HEALTHY admission: HOLD
- YW durable replay: HOLD
- iCamp durable replay: HOLD
- AI Hub 308 / Comms QL-416 three-Master gate: HOLD
- supervised acceptance: HOLD
- CONNECTED: false / not inferred
- owner acceptance: not inferred

## Security boundary

Build 369 never:

- receives or stores source private signing keys;
- lets source ACK text self-enroll a signer;
- lets source ACK text self-admit a HEALTHY receipt;
- treats source repository documentation as runtime evidence;
- rewrites Yard Workers or iCamp manifests;
- treats code GREEN as runtime acceptance;
- elevates child tenant data into the platform-shell source identity;
- auto-accepts owner decisions.
