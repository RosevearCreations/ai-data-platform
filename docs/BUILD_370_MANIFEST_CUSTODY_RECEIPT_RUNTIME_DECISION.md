# AI Data Platform Build 370 — Independent Deployed Manifest Observation, Source Signer Custody Evidence Correlation, Fresh Receipt Admission Closure & Three-Master Runtime Decision Recheck

## Objective

Build 370 independently observes the actual Yard Workers and iCamp production deployments, correlates source signer custody only against controller-owned trust records, closes fresh receipt admission only when current production, manifest, signer, custody and admission evidence all agree, and rechecks the current AI Hub 309 / Comms QL-417 Master runtime decision gate.

Repository code GREEN and deployment READY are not runtime acceptance.

## Independent deployed-manifest observation

On November 11, 2026, the Vercel account linked to the Rosevear Git projects independently reported the current production deployments and served their public discovery manifests.

### Yard Workers YW560

- production Git main: `2c7234c975528a3a3ab76ca22829c8b4a541de97`
- production Vercel deployment: `dpl_5GPLC36MjUc8KUsyNS2zqQu7Nc8d`
- deployed manifest revision: `2c7234c975528a3a3ab76ca22829c8b4a541de97`
- tenant boundary: `platform_shell`
- source role returned by deployed manifest: `business_shell`
- expected source role for the Master product source: `platform_shell`
- signature state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection state: `DISCONNECTED / HOLD`

The production SHA is independently confirmed exactly. The product-shell identity is **not** fully confirmed because the deployed manifest reports `business_shell`. Build 370 records `HOLD_ROLE_MISMATCH` instead of hiding that discrepancy.

### iCamp Build 244

- production Git main: `69d46513b45e340a4e295165abbd3d99b3a62274`
- production Vercel deployment: `dpl_48KWSeSdV6KhujxbUeSs8Ao7VMWM`
- deployed manifest revision: `69d46513b45e340a4e295165abbd3d99b3a62274`
- tenant boundary: `platform_shell`
- source role: `platform_shell`
- signature state: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection state: `DISCONNECTED / HOLD`

The previous Build 244 tracked-manifest baseline discrepancy is therefore resolved at the **deployed artifact** layer. Build 370 records the iCamp deployed manifest as `VERIFIED_EXACT`.

## Source signer custody correlation

Build 370 never trusts a source ACK to declare its own signer or custody state.

For each source the controller requires:

1. exactly one active `ENROLLED` event in `app.master_source_signer_registry_events`;
2. a matching Build 366 `ENROLLMENT_COMMITTED` intake for the same key ID;
3. controller-computed SPKI SHA-256 equal to the independently supplied SPKI pin and equal to the trusted registry fingerprint;
4. distinct pin, custody and witness evidence URIs.

Only that combination produces `VERIFIED_CORRELATED`.

Current YW560 and iCamp244 repository/runtime evidence still says no independent source signer is enrolled, so both custody correlations remain `HOLD_UNENROLLED`.

## Fresh receipt admission closure

A source receipt reaches `VERIFIED_CURRENT` only when:

- the deployed manifest identity is fully `VERIFIED_EXACT`;
- signer custody is `VERIFIED_CORRELATED`;
- the trusted receipt key ID matches that signer;
- source revision and manifest revision both equal the exact current production SHA;
- the receipt is still CURRENT;
- the existing controller health-admission ledger contains an `ADMITTED` event for the same receipt.

An old receipt, a self-asserted source receipt, or a receipt for the wrong key/revision cannot close Build 370.

Current YW560 and iCamp244 fresh signed HEALTHY receipt closure remains HOLD.

## Current Master runtime truth

### Rosevear AI Hub 309

- ACK: `MASTER360-AIHUB-309-ACK`
- main: `0a94c72ee4a1ded1babeac68deeb981ad33835ef`
- required installed Build 308 original-host process witness: HOLD
- original-host source one-TEST: HOLD
- independent receiver-signed ACK: HOLD
- sampled uptime: UNKNOWN
- AI Data owner decision: HOLD
- automation host remains `DESKTOP-AE894KC_ONLY`
- receiver: OFF
- connection: HOLD
- Masters synced: HOLD
- slave gate: HOLD

### Rosevear Comms Hub QL-417

- handoff: `MASTER360-COMMS-QL417-HANDOFF`
- main: `6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6`
- original Ree-host signed telemetry: HOLD
- durable replay admission: HOLD
- signed Comms ACK: HOLD
- owner-decision continuity: HOLD
- uptime: UNKNOWN
- receiver: OFF
- connection: HOLD
- slave gate: HOLD

QL-417 is a protected discrepancy worklist. Its existence is not evidence that the missing runtime artifacts have been received.

## Durable Build 370 evidence

Migration `0134_master_manifest_custody_receipt_runtime_decision.sql` adds four append-only, RLS-protected ledgers:

1. `app.master_deployed_manifest_observation_events`
2. `app.master_source_custody_correlation_events`
3. `app.master_fresh_receipt_admission_closure_events`
4. `app.master_three_master_runtime_decision_rechecks`

Runtime roles receive SELECT + INSERT only. UPDATE and DELETE remain revoked.

## Current Build 370 result

- exact production SHA observed in deployed manifests: **2/2**
- fully correct product-shell manifest identity: **1/2**
  - iCamp: VERIFIED_EXACT
  - Yard Workers: HOLD_ROLE_MISMATCH
- correlated independent source signer custody: **0/2**
- fresh current signed HEALTHY receipt closure: **0/2**
- AI Hub 309 / Comms QL-417 three-Master runtime gate: **HOLD**
- ready for owner decision: **0/2**
- CONNECTED: **not inferred**
- owner acceptance: **not inferred**

## Source follow-up

### Yard Workers

`MASTER370-YW-ROLE-CUSTODY-RECEIPT | controller=ai-data-platform | source=yw | production-main=2c7234c975528a3a3ab76ca22829c8b4a541de97 | deployed-manifest-revision=VERIFIED_EXACT | deployed-source-role=business_shell | required-source-role=platform_shell | correct/reconcile the product-shell source role without exposing child-company data, complete independent Ed25519 source-signer enrollment and custody evidence, produce a fresh source-bound signed HEALTHY receipt for the exact production revision, and return durable replay evidence. Do not mark CONNECTED or owner-accepted unless independently verified.`

### iCamp

`MASTER370-ICAMP-CUSTODY-RECEIPT | controller=ai-data-platform | source=icamp | production-main=69d46513b45e340a4e295165abbd3d99b3a62274 | deployed-manifest-revision=VERIFIED_EXACT | source-role=platform_shell | complete independent Ed25519 source-signer enrollment and custody evidence, produce a fresh source-bound signed HEALTHY receipt for the exact production revision, and return durable replay evidence. Do not mark CONNECTED or owner-accepted unless independently verified.`

No private keys, raw telemetry or owner secrets belong in GitHub or chat.
