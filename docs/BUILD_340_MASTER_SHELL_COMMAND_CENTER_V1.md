# Build 340 — Master Shell Command Center V1: Applications, IT, Management & Statistics

## Purpose

Build 340 turns the evidence foundations from Builds 335–339 into one read-only Rosevear Suite command centre.

The command centre answers four questions from the same underlying evidence:

1. **Applications** — what applications exist, what is their current evidence-backed source state, and what module/completion evidence is available?
2. **I.T. / Security** — what measured integration, queue, credential-reference, webhook, latency and degraded-service evidence needs attention?
3. **Management** — which applications and completion scopes are ready, incomplete, stale, held or unmeasured?
4. **Statistics** — what are the exact evidence-backed totals and percentages across current source/module evidence?

It creates no new operational source of truth.

## Inputs

### Build 339 application/module inventory

Build 340 consumes the exact six application read model from Build 339, including:

- Build 336 source registry state and freshness;
- Build 337 signed module-readiness and release evidence;
- Build 338 Master Completion scopes/evidence;
- Build 328 installed AI Data module evidence;
- Build 281 discovery-only capability metadata.

### Build 300 integration health

Build 340 reuses the existing authenticated Integration Health Command Center for:

- database latency;
- connector latency/outcomes;
- credential-reference risk state;
- webhook intake/denials;
- event queue counts;
- delivery failures;
- dead letters;
- degraded reliability signals.

It performs no extra external health probe.

## Application cards

Each of the six cards shows:

- exact source ID/display name/repository;
- effective source state;
- source freshness;
- latest release evidence if present;
- module totals;
- fresh/stale/unmeasured module readiness counts;
- approved/calculable module completion counts;
- source-wide Master Completion percentage/evidence coverage when available.

Application attention is derived without rewriting source truth:

- ERROR, REVOKED, DISCONNECTED or DEGRADED → critical attention;
- AUTHORIZATION_HELD → held;
- STALE or UNKNOWN → unmeasured attention;
- other non-CONNECTED positive states → attention;
- CONNECTED with current evidence → no application-state attention item.

This is prioritization only. It does not mutate the Build 336 state.

## I.T. / Security

The I.T. view preserves Build 300's measured evidence and safety boundaries.

Security indicators summarize:

- credential-reference records requiring attention;
- expired/revoked/rotation-due references;
- webhook denials;
- delivery failures;
- dead letters.

Credential values are never read.

Remote availability is not inferred.

No retry, recovery, connection activation or credential mutation is triggered.

## Management

Management reports:

- exact application count;
- CONNECTED application count;
- applications requiring attention;
- approved source-wide Master Completion scopes;
- calculable source-wide scopes;
- source-wide scope coverage;
- calculable coverage;
- attention counts by severity.

### Suite-wide completion rule

Build 340 does **not** average the applications that happen to have percentages.

A suite-wide portfolio completion percentage is shown only when:

- all six applications have an approved source-wide Master Completion scope; and
- all six source-wide scopes have calculable completion under Build 338 rules.

Only then are their requirement numerators and denominators aggregated into one portfolio numerator/denominator.

Otherwise the portfolio percentage remains **UNAVAILABLE** and the exact blocker is displayed.

## Statistics

Statistics are direct counts/ratios from the same current read models.

They include:

- source-state distribution;
- source freshness counts/percentages;
- module total;
- fresh/stale/unmeasured source-readiness counts;
- approved module completion-scope count/percentage;
- calculable module completion count/percentage;
- degraded services;
- queued events;
- delivery failures;
- webhook denials;
- credential references needing attention.

If a denominator is zero, its percentage is unavailable rather than fabricated.

## Attention queue

The command centre combines evidence-backed attention from:

- application/source state;
- source-wide completion scope/evidence;
- Build 300 I.T. signals.

The queue is sorted by:

1. critical;
2. held;
3. attention;
4. unmeasured.

Every item routes the operator to the authoritative underlying screen.

The command centre itself exposes no mutation action.

## Surfaces

- `/master-shell-command-center`;
- `/api/master-shell-command-center`.

The API is authenticated and GET-only.

## Persistence

Build 340 adds no database migration and no new command-centre table.

The view is derived at request time from existing RLS-scoped evidence.

## Safety boundaries

Build 340 does not:

- mutate a source application;
- change Build 336 source state;
- ingest a Build 337 source event;
- create or approve a Build 338 denominator;
- record Master Completion evidence;
- activate an integration;
- grant a capability;
- read credential values;
- perform an external health probe;
- infer remote availability;
- automatically retry or repair a queue;
- turn a GREEN deployment into functional acceptance;
- turn catalogue/discovery presence into acceptance;
- turn source-reported ACCEPTED into Master Completion acceptance;
- show a suite completion percentage from incomplete application coverage.

## Next queued build

**Build 341 — Outer Sysop Navigation, Ree/Jack Context Handoff, Role & Tenant Isolation.**
