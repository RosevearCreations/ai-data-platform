# Build 287 — Visual Field Mapping Studio

## Purpose

Build 287 turns the Build 286 canonical data-contract registry into a reviewed mapping workspace. Operators can select any of the six Rosevear peer applications, choose one of the 11 canonical contracts and map source field paths into the canonical target fields.

The result is a durable, reviewed mapping profile. A mapping profile is configuration evidence only. It does not activate a connector or authorize live exchange.

## Source applications

The studio supports the six applications already registered by Build 281:

- Devil n Dove;
- Rosie Dazzlers;
- Yard Workers;
- iCamp;
- Rosevear Comms Hub;
- Rosevear AI Hub.

Build 287 does not claim that every application currently exposes every canonical contract. The operator selects the application and records the source field paths that have actually been reviewed.

## Canonical targets

All targets come directly from the Build 286 registry:

- customer;
- product;
- service;
- booking;
- job;
- staff;
- equipment;
- invoice;
- media;
- inventory;
- notification.

Every profile pins the current contract semantic version and SHA-256 schema fingerprint.

## Visual mapping model

The authenticated `/field-mappings` studio presents source and canonical fields side by side.

For each canonical target field, an operator can enter a source field path and select a bounded transform:

- copy;
- trim;
- lowercase;
- uppercase;
- number;
- boolean;
- ISO date-time;
- split comma-separated text;
- join arrays with commas.

Only field paths and mapping instructions are stored. Source record values are not copied into the mapping profile.

Unknown canonical targets, duplicate target mappings, unsupported transforms and invalid source paths fail closed.

## Draft and reviewed profiles

A profile can be saved as a draft before all required fields are mapped.

A profile can be marked reviewed only when every required canonical field has a source mapping. The server repeats this validation; the browser button is not the authorization boundary.

If a reviewed profile is later edited and saved as a draft, it returns to a reopened review state. Every save/review/reopen action increments the profile revision and writes append-only evidence.

## Schema drift readiness

Each profile stores:

- contract ID;
- semantic contract version;
- schema fingerprint.

The studio reports whether the stored fingerprint still matches the current Build 286 registry. This is the foundation for Build 288 drift detection and mapping repair.

## Persistence

Migration `0090_visual_field_mapping_studio.sql` adds:

- `app.workspace_field_mapping_profiles`;
- `app.workspace_field_mapping_profile_events`.

Both tables are workspace scoped and protected by row-level security.

Workspace members may read mapping profiles and evidence. Only workspace owners/admins may create or modify profiles or append review events. Event rows are append-only to the runtime role.

## API

Authenticated `/api/field-mappings` provides:

- `GET` — current mapping-studio model, profiles and review evidence;
- `POST action=save` — persist a draft profile;
- `POST action=review` — persist and mark a profile reviewed after required-field validation passes.

Responses are no-store. There is no delivery, export, remote-write or connector-activation action.

## Safety boundary

Build 287:

- stores no raw secrets;
- stores no source record values;
- performs no external requests;
- sends no cross-app records;
- activates no connector;
- infers no owner authorization;
- does not resume QL-266;
- keeps QL-266 `UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED`.

Reviewed mappings are prerequisites for later governed exchange, not evidence that exchange is already live.

## Next build

**Build 288 — Schema Drift Detection & Mapping Repair Assistant** will detect canonical/source schema drift, identify affected mapping profiles and guide reviewed repairs before delivery.
