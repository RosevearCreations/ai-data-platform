# Build 328 — Module Versioning, Safe Upgrade, Rollback & Migration Orchestration

## Purpose

Build 328 adds production lifecycle management on top of the Build 327 guided installer without weakening Build 327's core boundary: a generated package is preparation evidence, not proof that a host installed the module.

Installed-version inventory therefore requires explicit owner-observed host evidence.

## Delivered

- owner-scoped installed-version inventory tied to an approved Build 327 enrollment;
- current and last-known-good semantic versions;
- compatibility checks against the enrolled host contract and protocol;
- database, schema and rollback-backup prerequisite checks;
- staged upgrade planning with optional canary-host designation;
- explicit owner policy for breaking major compatibility boundaries;
- configurable policy requiring a canary for breaking upgrades;
- deterministic migration ordering and dependency validation;
- migration plan SHA-256 evidence;
- owner approval/rejection before any upgrade may be recorded as executed;
- append-only upgrade, failure, rollback and stability evidence;
- rollback planning in reverse migration order;
- manual-restore HOLD when a migration is declared irreversible;
- owner-recorded applied/failed host outcomes;
- explicit stability confirmation before the new current version replaces the prior last-known-good version.

## Safety model

Build 328 does not execute a host upgrade.

Planning is fail closed when:

- the target is not newer than the installed version;
- a breaking major compatibility boundary lacks owner policy;
- the enrolled host contract is below the target minimum;
- the enrolled module protocol is below the target minimum;
- database prerequisite evidence is missing;
- schema prerequisite evidence is missing;
- rollback-backup evidence is missing;
- migration IDs/orders are duplicated;
- a migration depends on a missing or later migration;
- owner policy requires a canary but the plan is not a canary.

Owner approval authorizes the exact staged plan only. It does not prove the host applied it.

## Last-known-good semantics

An installed host starts with:

- current version = observed installed version;
- last-known-good version = observed installed version.

After an approved upgrade is recorded as applied:

- current version advances to the target;
- last-known-good remains the prior stable version.

Only explicit stability evidence moves last-known-good forward to the current version.

## Rollback

Rollback plans:

- target the last-known-good version;
- reverse reversible migrations in descending order;
- never run automatically;
- remain HELD for automatic orchestration when any migration is irreversible, requiring manual restoration evidence instead.

## Persistence

Migration: `0111_module_versioning_upgrade_rollback.sql`

Tables:

- `app.module_host_instances`
- `app.module_upgrade_runs`
- `app.module_upgrade_events`

Upgrade events are append-only for the runtime role.

## API

`GET /api/module-lifecycle`

Returns lifecycle descriptor, eligible approved enrollments, installed hosts, upgrade runs and upgrade evidence.

`POST /api/module-lifecycle`

Supported actions:

- `register-installed`
- `prepare-upgrade`
- `owner-decision`
- `record-outcome`
- `prepare-rollback`
- `record-rollback`
- `confirm-stable`

## Operator surface

`/module-lifecycle`

The page exposes installed-version inventory, staged upgrade planning, owner decisions, failed-upgrade evidence, rollback preparation and last-known-good confirmation.

## Next queued build

**Build 329 — Cross-Host Observability, Compatibility Matrix & Universal Certification Suite** remains the next regular product roadmap item.
