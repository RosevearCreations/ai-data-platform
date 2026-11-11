# Build 363 — Yard Workers & iCamp Source Revision Convergence, Independent Signer Readiness, Verified Health Intake & Supervised Acceptance Closure

## Objective

Build 363 turns the remaining Yard Workers/iCamp source blockers into four explicit gates:

1. current source revision convergence;
2. independent source signer verification;
3. fresh source-bound health receipt verification;
4. supervised owner acceptance.

A GREEN source deployment is not accepted as proof for any of these gates.

## Reconciled source state

### Yard Workers

- source ID: `yw`
- source app: `yard-workers`
- current production main: `cdc368e2f2773863595ff9cf6f35c1f02773eeaf`
- discovery manifest revision: `028aee250857415b9b9035aaec50060757e377a5`
- signer: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection: `DISCONNECTED / HOLD`
- required source handoff: `MASTER363-YW-SOURCE-CONVERGE`

### iCamp

- source ID: `icamp`
- current production main: `e2d343595363ca9106e7f1dbc60006e3a6c616aa`
- discovery manifest revision: `dc1369338a4b191fc72031b7e62f7e48fd805bcd`
- signer: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection: `DISCONNECTED / HOLD`
- required source handoff: `MASTER363-ICAMP-SOURCE-CONVERGE`

Both manifests are therefore stale relative to their current production source revisions.

## Source-side evidence required

Each source must provide, from its own repository/runtime boundary:

- an updated discovery manifest whose `source_revision` matches current production `main`;
- an independently enrolled Ed25519 public signer identity without exposing its private key;
- a fresh source-bound health receipt tied to that exact production revision;
- an explicit connection/owner-acceptance result.

AI Data does not rewrite source manifests or create source private keys.

## Master dependency

Even after both source evidence sets become ready, supervised acceptance cannot close while the three-Master runtime synchronization gate remains unresolved.

Build 363 therefore distinguishes:

- **source evidence ready** from
- **supervised closure eligible**.

## Production CI

Build 363 remains inside both `ci:spine` and the Vercel production `build` command, before production migrations and `next build`.

This preserves the Build 362 CI correction and extends it to Build 363.
