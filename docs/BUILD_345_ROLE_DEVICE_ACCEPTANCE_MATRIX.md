# Build 345 — Role/Device Acceptance Matrix: Customer, Worker & Admin / Mobile, Tablet, Desktop

## Purpose

Build 345 adds explicit evidence-backed role/device acceptance to the Rosevear Suite Master Shell.

Each application and discovered module receives a nine-cell matrix:

- Customer × Mobile, Tablet, Desktop;
- Worker × Mobile, Tablet, Desktop;
- Admin × Mobile, Tablet, Desktop.

**Implementation and automated testing do not satisfy a role/device cell.** Source readiness, catalogue presence and deployment GREEN also do not satisfy acceptance.

## Evidence model

Migration `0123_master_role_device_acceptance_matrix.sql` creates the append-only `app.master_role_device_acceptance_evidence` ledger.

Each record retains:

- exact six-source identity;
- optional module scope;
- role and device class;
- ACCEPTED, PARTIAL or FAILED state;
- evidence URI;
- reviewer;
- confidence;
- observed/expiry timestamps;
- branch and commit;
- optional notes;
- monotonically increasing record version.

Runtime access is suite-admin scoped through RLS. Runtime receives SELECT/INSERT only. UPDATE/DELETE remain revoked.

## Effective matrix states

The latest record for a cell is composed as:

- `ACCEPTED`, `PARTIAL` or `FAILED` while fresh;
- `STALE` after expiry;
- `UNKNOWN` when no evidence exists.

A scope-level accepted percentage is withheld until all nine cells have fresh measured evidence. Missing or stale evidence never becomes zero and never becomes acceptance.

## Surfaces

- `/role-device-acceptance`;
- `/api/role-device-acceptance`.

The API supports authenticated GET and bounded POST recording. POST validates exact source identity and rejects module IDs not present in the current application/module inventory.

## Master Completion relationship

Build 338 already separates `accessibility-device-acceptance` from implementation and automated testing. Build 345 adds the role/device evidence needed to inspect that acceptance dimension at operational resolution.

Build 345 does not silently write or satisfy Build 338 evidence-axis records. Any future reconciliation must remain explicit and evidence-backed.

## Authority boundary

Build 345:

- records append-only acceptance evidence only;
- performs no peer application write;
- performs no external device probe;
- performs no source-state mutation;
- performs no automatic acceptance;
- does not infer acceptance from implementation, automated tests, source readiness or deployment GREEN.

## Next queued build

**Build 346 — One-to-One, One-to-Many, Many-to-One & Many-to-Many Integration Certification.**
