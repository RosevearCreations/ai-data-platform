# Build 277 — Retention Cleanup Readiness & Storage Budget Reconciliation

## Purpose

Build 277 reconciles the existing retention metrics, fixed per-class storage budgets, archive/delete eligibility, protected evidence, cleanup approval and bounded cleanup history into a safe operator queue.

The reconciliation is read-only. It does not run cleanup.

## Readiness queue

The queue distinguishes:

- storage-budget breaches that require review;
- latest failed cleanup runs with no later successful run;
- manual archive candidates, which remain review-only;
- bounded-delete candidates awaiting cleanup approval;
- bounded-delete candidates with approval already active, which still require the separate `RUN CLEANUP` confirmation;
- protected evidence excluded from Build 277 destructive cleanup;
- healthy workspaces that only require monitoring.

## Failed-run interpretation

A cleanup failure is unresolved when the most recent cleanup run for a workspace is failed. A later successful cleanup run resolves the historical failure for current readiness purposes without deleting the historical audit record.

## Build 277 exit criterion

The readiness criterion is met when:

1. no retention class currently exceeds its configured storage budget; and
2. no workspace's latest cleanup run is failed.

Delete-eligible rows do not by themselves fail Build 277. They must remain approval-gated until an authorized operator explicitly approves cleanup and separately confirms a bounded cleanup run.

## Safety boundaries

- Build 277 performs no cleanup network or database mutation.
- Archive candidates remain preview-only.
- Protected evidence remains excluded from destructive cleanup.
- Cleanup approval is not inferred from deployment approval.
- An existing approval does not remove the separate `RUN CLEANUP` confirmation.
- Existing RLS and workspace membership remain authoritative.
- No database migration is introduced.
- QL-266 remains **UNDER_REVIEW**, **REVIEW_DEFERRED**, and **DISCONNECTED**.

## Next build

Build 278 — Least-Privilege Adoption, Stale Grants & Capability Cleanup Review.
