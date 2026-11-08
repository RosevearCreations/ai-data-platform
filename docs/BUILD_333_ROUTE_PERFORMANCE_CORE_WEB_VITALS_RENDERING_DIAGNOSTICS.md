# Build 333 — Route Performance, Core Web Vitals & Rendering Diagnostics

## Purpose

Build 333 turns Build 332 real-user telemetry into route-level rendering diagnostics.

The seven-day route view analyzes:

- Largest Contentful Paint (LCP) P75;
- Cumulative Layout Shift (CLS) P75;
- Interaction to Next Paint-style interaction duration (INP) P75 from supported Performance Event Timing;
- internal route-transition P75;
- hydration-ready P75, defined as the first client effect after React hydration;
- long-task P95.

LCP, CLS and INP are the Core Web Vitals in this build. Hydration-ready is explicitly an application-specific rendering diagnostic, not a Core Web Vital.

## Data source

Build 333 reuses the authenticated, append-only, RLS-protected `app.experience_telemetry_events` evidence created by Build 332.

Migration `0116_route_performance_rendering_diagnostics.sql` extends the reviewed metric vocabulary with `hydration_ready_ms` and sample kind `hydration`. It adds no customer-content, URL, DOM, form, credential or secret fields.

## Operator surfaces

- `/route-performance`
- `/api/route-performance`

The route screen reports `good`, `needs-attention`, `poor` or `unmeasured` from measured route-family evidence. Missing evidence never becomes success.

## Thresholds

Core Web Vital route classification follows the existing Build 332 thresholds:

- LCP good at or below 2,500 ms; poor above 4,000 ms;
- CLS good at or below 0.10; poor above 0.25;
- INP good at or below 200 ms; poor above 500 ms.

Additional diagnostics:

- route transition good at or below 500 ms; poor above 1,500 ms;
- hydration-ready good at or below 1,000 ms; poor above 2,500 ms;
- long-task P95 good at or below 100 ms; poor above 250 ms.

The additional thresholds are diagnostic budgets, not web-standard Core Web Vital thresholds.

## Privacy and safety

Build 333 does not:

- store raw URLs or query strings;
- store DOM text, form values or customer records;
- store cookies, tokens, passwords or credential material;
- automatically change application code or configuration;
- automatically change SLO budgets;
- automatically block a release;
- infer production success from synthetic or missing evidence;
- change connection authority or consequential peer-write authorization.

## Next queued build

**Build 334 — API, Database Query & Dependency Performance Observatory.**
