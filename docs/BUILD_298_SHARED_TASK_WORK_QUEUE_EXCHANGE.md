# Build 298 — Shared Tasks, Follow-Ups & Work Queue Exchange

## Purpose

Build 298 lets governed exceptions, reviews and follow-ups become linked cross-application work items without bypassing application ownership or creating unapproved peer-side records.

Supported peer applications:

- Devil n Dove;
- Rosie Dazzlers;
- Yard Workers;
- iCamp;
- Rosevear Comms Hub;
- Rosevear AI Hub.

## Shared work items

Workspace owners/admins may create append-only work items containing:

- source and destination application;
- canonical tenant;
- source record type and ID;
- task kind;
- priority;
- title and bounded summary;
- optional due time;
- optional assignee hint;
- optional linked customer/job record IDs.

Task kinds are:

- `exception`;
- `follow-up`;
- `review`;
- `maintenance`;
- `customer-action`;
- `internal-action`.

Priorities are `low`, `normal`, `high`, and `urgent`.

Every work item is created in `held` state with `task-exchange-not-authorized`.

## Linked work

Existing shared tasks can be linked using:

- `follow-up`;
- `blocks`;
- `relates-to`;
- `derived-from`.

Links are immutable evidence and do not alter either task.

## Exchange packages

An owner/admin may prepare a held package for the destination application and destination tenant.

The package contains deterministic task identity and remains:

- `state = held`;
- `hold_reason = task-exchange-not-authorized`;
- `peer_application_write_requested = false`.

Approval means only that the package is suitable for a future governed handoff.

## Database evidence

Migration `0101_shared_task_work_queue_exchange.sql` adds:

- `app.shared_task_work_items`;
- `app.shared_task_links`;
- `app.shared_task_exchange_packages`;
- `app.shared_task_exchange_reviews`;
- `app.shared_task_exchange_audit`.

All tables use RLS. Runtime access is SELECT/INSERT only. UPDATE and DELETE are revoked.

## Operator surface

The authenticated `/shared-task-exchange` console provides:

- shared task creation;
- source/destination routing;
- queue visibility;
- destination package preparation;
- owner/admin review;
- explicit held/no-peer-write readback.

API: `/api/shared-task-exchange`.

## Authorization boundary

Build 298 performs:

- no peer-application write;
- no automatic task creation in another app;
- no outbound network request;
- no task status mutation after creation;
- no package release;
- no QL-266 resumption.

## Next build

**Build 299 — Shared Scheduling, Appointments & Calendar Exchange**.
