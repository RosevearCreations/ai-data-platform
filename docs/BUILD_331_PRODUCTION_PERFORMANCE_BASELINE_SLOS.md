# Build 331 — Production Performance Baseline, SLOs & Regression Budgets

## Purpose

Build 331 opens the owner-authorized 331–350 performance and interaction batch by establishing a truthful production-performance baseline before later optimization or automation.

The build measures only telemetry that the application can currently support with production evidence:

- authenticated database probe latency;
- connector execution latency over the latest 24-hour window;
- connector success/failure rate;
- webhook accepted/denied rate;
- event-bus delivery failures in the latest 24 hours.

## SLO budgets

Build 331 defines explicit warning and critical budgets for each measured metric. These thresholds are advisory evidence in this build. They do not automatically change configuration, optimize the application or block a release.

## Regression budgets

Each saved snapshot is compared with the immediately previous owner-scoped snapshot when one exists.

Latency regressions allow the larger of an absolute tolerance or a relative 25% increase. Error and denial rates use percentage-point tolerances. Event-delivery failures use a bounded absolute tolerance.

The first snapshot is an establishing baseline and cannot be called a regression comparison.

## Measurement gaps

Build 331 deliberately records these areas as not yet instrumented rather than inventing values:

- real browser page-load percentiles;
- real interaction and route-transition percentiles;
- full API endpoint percentiles;
- host CPU and memory telemetry.

Build 332 is expected to add real-user interaction timing. Later builds may add route/API and host-resource telemetry.

## Evidence storage

Migration `0114_production_performance_baseline_slos.sql` creates:

- `app.performance_baseline_snapshots`

The table is owner-scoped, RLS protected and append-only for the application runtime.

Each snapshot stores the measured metric set, SLO evaluation, regression comparison and known instrumentation gaps.

## Operator surface

- `/performance-baseline`
- `/api/performance-baseline`

The POST action is `capture-performance-baseline` and requires owner/admin access.

## Safety boundaries

Build 331:

- does not infer missing telemetry;
- does not count synthetic evidence as live production evidence;
- does not automatically optimize the application;
- does not automatically alter SLO budgets;
- does not automatically block a release;
- does not expose raw secrets;
- does not change connection authorization;
- does not resume QL-266.

## Next queued build

**Build 332 — Real User Monitoring, Interaction Timing & Experience Telemetry.**
