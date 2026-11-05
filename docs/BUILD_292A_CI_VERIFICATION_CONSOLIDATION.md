# Build 292A — CI Verification Consolidation & Promotion Run Reduction

## Purpose

Build 292A removes the accumulated historical verifier chain from the normal promotion path without deleting it.

Before this build, the web package contained:

- 268 application verifier invocations in `test`;
- 75 database verifier invocations in `db:verify`;
- 343 historical verifier invocations before typecheck, lint, build, QL gates and migration work were counted.

The GitHub workflow also ran the broad verification path on:

1. push to `dev`;
2. pull request to `main`;
3. push to `main`.

That produced three GitHub verification runs in the normal feature → dev → main promotion cycle.

## Consolidated promotion model

### Authoritative GitHub gate

The authoritative GitHub Actions promotion gate now runs once on a pull request into `main`.

The compact promotion suite contains six grouped commands:

1. workspace typecheck;
2. workspace lint;
3. connector SDK build and tests;
4. current integration spine verification;
5. core database/isolation verification;
6. production-equivalent web build.

The current integration spine verifies the production migration gate, Builds 281–292, QL-246 and QL-253.

The database gate runs the established workspace isolation verification plus a compact schema/RLS/grant verification covering the current integration tables introduced through Build 292.

### Production remains fail-closed

The Vercel production build does not rely solely on GitHub Actions.

The web production build must still pass, in order:

1. Build 292 functional/recovery boundary verifier;
2. Build 292A CI-policy verifier;
3. production database migrations;
4. Next.js production build and TypeScript checks.

A failed policy verifier, migration or application build prevents the Vercel deployment from reaching READY.

## Historical audit preservation

The existing 268-script `test` chain and 75-script `db:verify` chain remain intact.

They are now grouped behind `pnpm ci:legacy` and run when:

- the weekly scheduled audit executes;
- an owner explicitly requests the legacy audit through workflow dispatch;
- impact detection finds that a previously committed migration or historical verifier has changed;
- impact detection itself cannot determine safety, in which case it fails closed and requires the legacy audit.

The legacy audit is no longer repeated on every normal promotion.

## Changed-surface targeting

`ci-detect-legacy-impact.mjs` compares the pull-request branch with the `main` base.

It forces the exhaustive historical audit when an older build verifier, generic historical verifier, or previously committed migration is modified. Current integration-spine additions do not automatically trigger the 343-script audit because they are covered by the compact promotion suite.

## Metrics

Expected GitHub workflow runs for a standard feature → dev → main release:

- before Build 292A: **3**;
- after Build 292A: **1**;
- reduction: **67%**.

Normal promotion removes the **343 historical verifier invocations** from the repeated path. The legacy audit remains available and scheduled.

The suite runner records per-group duration and pass/fail metrics in `.ci-metrics/<suite>.json` and in the GitHub Actions step summary.

## Security and integration boundary

Build 292A changes CI orchestration only. It does not authorize live exchange or alter the Build 292 event-recovery safety model.

QL-266 remains:

- `UNDER_REVIEW`;
- external test `REVIEW_DEFERRED`;
- connection `DISCONNECTED`.

No external request, live exchange, owner authorization inference, route release or automatic connection activation is introduced.

## Next build

**Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees**.
