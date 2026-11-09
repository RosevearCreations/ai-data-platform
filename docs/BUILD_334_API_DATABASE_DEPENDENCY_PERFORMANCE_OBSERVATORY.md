# Build 334 — API, Database Query & Dependency Performance Observatory

## Purpose

Build 334 adds measured server-side performance evidence after the browser and route diagnostics introduced by Builds 332–333.

It correlates:

- authenticated API operation latency;
- an authorized database probe;
- PostgreSQL application/authentication pool counts;
- observed application-pool waiting pressure;
- existing connector dependency latency and failures.

## Evidence storage

Migration `0117_service_performance_observatory.sql` creates `app.service_performance_events`.

The table is:

- authenticated-actor scoped with RLS;
- append-only for the runtime role;
- bounded to API and database sample kinds;
- keyed by fixed sanitized operation names rather than raw URLs;
- limited to duration, outcome, status code and count-only pool evidence.

Dependency evidence is not duplicated. Build 334 reads the existing authorized `app.workspace_connector_audit` records and preserves workspace/connector provenance.

## Instrumented API operations

The initial measured server API set is deliberately bounded:

- `api.performance-baseline.get`;
- `api.performance-baseline.post`;
- `api.experience-telemetry.get`;
- `api.experience-telemetry.post`;
- `api.route-performance.get`.

Additional API instrumentation must use the same bounded helper rather than raw request logging.

## Operator surfaces

- `/performance-observatory`
- `/api/performance-observatory`

The seven-day read model reports P50/P75/P95 timing and failure rates for measured server operations, dependency timing and current pool counts.

Missing API or dependency evidence remains explicitly unmeasured.

## Privacy and safety

Build 334 does not persist:

- raw URLs or query strings;
- SQL text;
- request or response bodies;
- customer records;
- credential values or connection strings.

Build 334 does not automatically optimize queries, resize pools, change configuration, block releases, activate connectors, alter trust or authorize consequential peer writes.

## Master Shell alignment

The accompanying `MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md` accepts AI Data Platform's target role as the evidence/calculation half of the Master Shell while distinguishing implemented runtime capability from proposed or unverified integration work.

## Next queued build

**Build 335 — Cross-Application Interaction Trace & Correlation IDs.**
