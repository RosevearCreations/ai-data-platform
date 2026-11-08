# Build 332 — Real User Monitoring, Interaction Timing & Experience Telemetry

## Purpose

Build 332 converts the Build 331 performance baseline into real browser evidence.

The browser collector records only bounded performance measurements from authenticated application use:

- navigation load timing;
- First Contentful Paint (FCP);
- Largest Contentful Paint (LCP);
- Cumulative Layout Shift (CLS);
- interaction responsiveness using supported Performance Event Timing entries;
- internal route-transition timing;
- long-task duration.

## Privacy boundary

Build 332 does **not** persist:

- query strings;
- raw URLs;
- DOM text;
- form values;
- customer records;
- exact viewport dimensions;
- cookies, tokens or credentials.

Route paths are reduced to route families before persistence. UUIDs, long hexadecimal identifiers and long numeric identifiers are replaced with `:id`.

The collector is capped at 30 events per rendered application page and batches at most 12 events per request. The server accepts at most 20 events per API call.

## Storage

Migration `0115_real_user_experience_telemetry.sql` creates `app.experience_telemetry_events`.

The table is:

- authenticated-user scoped by RLS;
- append-only for the runtime role;
- idempotent by event UUID;
- bounded to a reviewed metric vocabulary.

## Operator surface

- `/experience-telemetry`
- `/api/experience-telemetry`

The dashboard reports P50/P75/P95 evidence for 24-hour and seven-day windows plus route-family experience summaries.

## I.T. truth cleanup included in Build 332

The current operator UI no longer treats the old QL-266 review hold as a global prerequisite.

Build 332:

- removes Build 280 Owner Acceptance and Build 273 Evidence Baseline from current navigation while preserving the historical pages;
- routes the top-bar System Status action to the current Integration Health command center instead of the older Build 276 acceptance page;
- retires stale QL-266 UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED task wording on current I.T. surfaces;
- changes the static peer registry from a hard-coded DISCONNECTED claim to UNMEASURED until current evidence establishes a state;
- keeps genuine authorization, tenant/workspace, credential, transport, certification and write-safety controls intact.

Historical QL-266 and QL-365D records remain evidence of what was true at the time. They are not current prerequisite tasks.

## Safety boundaries

Build 332 does not:

- automatically optimize the application;
- automatically change SLO thresholds;
- automatically block a release;
- infer a live peer connection from the absence of an error;
- weaken authentication or tenant isolation;
- expose raw secrets;
- authorize consequential peer writes.

## Next queued build

**Build 333 — Route Performance, Core Web Vitals & Rendering Diagnostics.**
