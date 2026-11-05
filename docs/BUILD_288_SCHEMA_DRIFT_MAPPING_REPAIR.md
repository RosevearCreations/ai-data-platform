# Build 288 — Schema Drift Detection & Mapping Repair Assistant

## Purpose

Build 288 adds a pre-delivery integrity gate on top of Build 287 mapping profiles. It detects source-schema and canonical-contract drift, identifies exactly which mappings are affected, and prepares bounded repair drafts without silently restoring reviewed status.

## Drift sources

Build 288 evaluates two independent schema surfaces.

### Source application schema

An owner/admin records a schema descriptor for a mapped Rosevear application:

- API/schema version label;
- field path;
- field type;
- required/optional state;
- enum values when applicable.

The source descriptor contains schema metadata only. It must not contain customer records, product values, tokens, passwords or other source data.

A deterministic SHA-256 fingerprint is calculated from the normalized descriptor.

### Canonical contract schema

The assistant reads the Build 286 canonical contract registry directly and compares the mapping profile's pinned contract fingerprint with the current contract.

Build 288 also stores the current canonical field snapshot on each drift scan so subsequent scans can report exact field/type/required/enum changes.

## Detected changes

The assistant detects:

- source field additions;
- source field removals;
- source type changes;
- source required/optional changes;
- source enum changes;
- source API/schema version changes;
- canonical field additions/removals;
- canonical type changes;
- canonical required/optional changes;
- canonical enum changes;
- canonical fingerprint drift.

Mapped fields affected by these changes are called out separately.

## Repair suggestions

Suggestions are deliberately bounded.

A suggestion is marked **deterministic** only when Build 288 can prove a unique safe structural action, such as:

- removing a mapping whose canonical target no longer exists;
- replacing a removed source field when exactly one current source field has the same normalized leaf name;
- mapping a newly required canonical target when exactly one source field has the exact normalized field name.

Type, enum, API-version and ambiguous rename changes remain **review required**.

Build 288 never uses fuzzy similarity to silently change mappings.

## Repair sessions

An owner/admin can prepare a repair session from a current drift scan.

The session stores:

- source profile revision;
- drift scan reference;
- proposed mapping entries;
- current source version/fingerprint/field snapshot;
- current canonical fingerprint;
- operator note.

A repair session becomes stale if the mapping profile revision or canonical fingerprint changes before application.

Applying a repair session:

1. applies deterministic changes only;
2. pins the current source schema snapshot and fingerprint;
3. pins the current canonical contract fingerprint;
4. increments the mapping profile revision;
5. changes the mapping profile to **draft**;
6. clears prior reviewed-by/reviewed-at state;
7. writes append-only Build 287 and Build 288 evidence.

The repaired mapping must then be reviewed again in the Build 287 Visual Field Mapping Studio.

## Mapping-edit invalidation

After Build 288, editing a mapping profile's application, contract, canonical fingerprint, source schema label or mapping entries invalidates its source-schema pin.

Re-reviewing an otherwise unchanged repaired draft preserves its source-schema pin.

This prevents old schema evidence from remaining attached to a materially changed mapping.

## Persistence

Migration `0091_schema_drift_mapping_repair.sql`:

- extends `app.workspace_field_mapping_profiles` with source schema version, fingerprint, field snapshot and review timestamp;
- creates `app.workspace_field_mapping_drift_scans`;
- creates `app.workspace_field_mapping_repair_sessions`;
- creates `app.workspace_field_mapping_drift_events`.

The new tables are workspace scoped and protected by row-level security.

Workspace members may read drift evidence. Only workspace owners/admins may create scans, prepare/apply/cancel repairs or append drift events.

No delete grant is provided to the runtime role.

## Delivery readiness

Build 288 exposes a mapping standing that distinguishes:

- mapping review required;
- source baseline required;
- canonical drift;
- fresh drift scan required;
- baseline required;
- drift detected;
- drift clear.

**Drift clear is a prerequisite signal for later delivery work. It is not itself delivery authorization.**

## API and UI

Authenticated surfaces:

- `/schema-drift` — operator drift and repair assistant;
- `GET /api/schema-drift` — current model/evidence;
- `POST action=scan` — record a source/canonical drift scan;
- `POST action=prepare-repair` — persist a bounded repair proposal;
- `POST action=apply-repair-to-draft` — reopen the mapping as a repaired draft;
- `POST action=cancel-repair` — cancel a prepared repair.

All API responses are no-store.

## Safety boundary

Build 288:

- stores schema descriptors, not source record values;
- stores no raw secrets;
- makes no external requests;
- performs no cross-app delivery;
- never auto-approves a repaired mapping;
- never activates a connector;
- never infers owner authorization;
- does not resume QL-266;
- keeps QL-266 `UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED`.

## Next build

**Build 289 — Rosevear Shared Connector SDK 2.0** will standardize authenticated requests, pagination, bounded retry, audit evidence, health and error handling across the Rosevear applications while preserving the same authorization boundary.
