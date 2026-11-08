# Build 319 — Shared Notification, Task, Follow-Up & Scheduling Module APIs

## Purpose

Build 319 unifies the existing governed coordination capabilities from Builds 297–299 into reusable host APIs.

It does not replace those systems. The new module layer reuses their normalizers, consent checks, held exchange envelopes and schedule overlap logic so hosts can prepare portable coordination packages without learning three different internal implementations.

## Notification request module

`prepareNotificationModuleRequest()` reuses Build 297:

- the shared notification contract;
- normalized consent evidence;
- channel-specific consent checking;
- the Rosevear Comms Hub preferred operator identity;
- a held notification state.

Missing, revoked, expired or scope-mismatched consent creates explicit local conflict evidence and makes the request ineligible for approval.

Even with granted consent, the request remains held with `notification-dispatch-not-authorized`.

## Task and follow-up module

`prepareTaskFollowUpModuleRequest()` reuses Build 298:

- task and follow-up kinds;
- priorities;
- source/destination application identity;
- customer/job links;
- due-date and assignee hints;
- the existing held task exchange envelope.

The module never requests a peer-application write.

## Appointment and scheduling module

`prepareScheduleModuleRequest()` reuses Build 299:

- the shared booking contract;
- appointments, bookings, jobs, maintenance, events and holds;
- local schedule overlap logic;
- the existing held calendar exchange envelope.

Hosts may supply up to 100 local candidate schedule items. The module records conflict evidence only for overlapping non-cancelled items in the same canonical tenant and destination application.

Conflict evidence is explicitly local-only. Build 319 does not query peer calendars.

A local schedule conflict makes the prepared package ineligible for approval until the conflict is resolved, matching the existing Build 299 review boundary.

## Host and source correlation

Every package receives a deterministic SHA-256 correlation binding:

- module kind;
- host application and environment;
- platform tenant and workspace;
- source application and source record;
- canonical tenant;
- destination application;
- audit correlation ID.

This allows a host and the AI Data Platform to refer to the same prepared work without guessing identity.

## Optional Comms Hub routing

Hosts may explicitly request `routePreference = "comms-hub"`.

For notifications, Rosevear Comms Hub remains the preferred operator already defined by Build 297.

For task/follow-up and schedule packages, the preference records Rosevear Comms Hub as the requested transport/operator hint while preserving the original destination application.

A routing preference is **not authorization**. Build 319 does not send to Comms Hub, release a held package, or create a destination-side record.

## Held exchange packages

All three module APIs return held packages:

- notifications: dispatch remains unauthorized;
- tasks/follow-ups: exchange remains unauthorized;
- schedules: calendar exchange remains unauthorized.

Outbound delivery and destination writes remain separately governed.

## Operator usability

Existing workbenches remain authoritative:

- `/notification-consent`;
- `/shared-task-exchange`;
- `/shared-scheduling`.

Each workbench now points operators to the unified Build 319 module descriptor:

`GET /api/module-shared-coordination`

The discovery route is read-only and does not perform outbound delivery.

## Security boundary

Build 319 does not:

- treat consent as dispatch authorization;
- bypass missing/revoked/expired consent;
- query peer calendars;
- auto-resolve schedule conflicts;
- write tasks or appointments into peer applications;
- send outbound notifications;
- authorize Comms Hub routing merely because it was requested;
- release any held exchange package.

## Next queued build

**Build 320 — Shared Media, File & Asset Host Bridge** remains the next regular product roadmap item.
