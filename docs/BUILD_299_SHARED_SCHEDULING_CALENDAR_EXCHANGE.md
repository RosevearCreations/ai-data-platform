# Build 299 — Shared Scheduling, Appointments & Calendar Exchange

## Purpose

Build 299 creates a governed shared scheduling layer for appointments, bookings, jobs, maintenance windows, events and calendar holds across the Rosevear application suite.

This build follows the explicit owner-selected Build 299 scope. The older roadmap entry named **Cross-App Search & Linked Record Explorer** remains deferred for a later roadmap slot; it is not silently discarded.

## Reused shared contract

Build 299 reuses the Build 286 booking contract:

- `rosevear.shared.booking.v1`
- version `1.0.0`

Portable booking fields include source application/record identity, tenant key, start/end time, status, customer/service references, location and bounded operational notes.

## Shared schedule items

Workspace owners/admins can create append-only held schedule items with:

- source and destination application;
- canonical tenant key;
- source record ID;
- item type;
- title/status;
- start/end timestamps;
- explicit timezone;
- optional location;
- optional customer/service references;
- optional staff/equipment record references;
- bounded notes.

Supported item types:

- `appointment`
- `booking`
- `job`
- `maintenance`
- `event`
- `hold`

All items remain `held` with `schedule-exchange-not-authorized`.

## Local overlap evidence

Build 299 records overlaps between held schedule items for the same destination application.

This evidence is intentionally scoped as:

`local-held-items-only`

It does **not** claim that the destination application's real calendar is available or unavailable.

## Exchange packages

Owners/admins can prepare a held destination package. Each package records:

- destination application and tenant;
- deterministic payload digest;
- local overlap count;
- `peer_calendar_write_requested = false`.

A package with local overlap evidence cannot be approved for future handoff until that conflict is resolved outside this append-only build.

Approval still leaves the package held and does not write to a peer calendar.

## Database evidence

Migration `0102_shared_scheduling_calendar_exchange.sql` adds:

- `app.shared_schedule_items`
- `app.shared_schedule_conflict_evidence`
- `app.shared_schedule_exchange_packages`
- `app.shared_schedule_exchange_reviews`
- `app.shared_schedule_exchange_audit`

All tables use RLS. Runtime access is SELECT/INSERT only. UPDATE and DELETE are revoked.

## Operator surface

The authenticated `/shared-scheduling` console provides:

- held schedule-item creation;
- source/destination routing;
- booking-contract readback;
- local overlap evidence;
- held destination package preparation;
- owner/admin review;
- explicit no-peer-write policy readback.

API: `/api/shared-scheduling`.

## Authorization boundary

Build 299 performs:

- no peer-calendar write;
- no automatic appointment creation in another application;
- no remote availability query;
- no outbound network request;
- no package release;
- no QL-266 resumption.

## Next queued build

**Build 300 — Unified Integration Health Command Center**.
