# Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring

## Purpose

Build 338 implements the evidence model required for Rosevear Suite Master Completion.

It does **not** pre-populate or invent a complete requirement inventory for the six source applications. A requirement, denominator or percentage exists only after explicit registry and evidence records exist.

## Seven independent evidence axes

The exact evidence axes are:

1. design;
2. implementation;
3. automated testing;
4. integration verification;
5. security;
6. accessibility/device acceptance;
7. production/user acceptance.

Implementation evidence never implies testing, integration, security, accessibility/device acceptance or production/user acceptance.

Each requirement revision declares which axes are actually required. Axes not required for that requirement are explicitly represented as NOT_APPLICABLE and are excluded from that requirement's axis denominator.

## Stable requirement identity

Requirement IDs are deterministically derived from:

- source ID;
- optional module ID;
- stable requirement key.

Changing title, description, weight, criticality or required axes creates a new immutable revision under the same requirement ID.

Changing source, module or stable requirement key creates a different requirement identity.

Evidence is pinned to one exact requirement revision. Evidence from an older revision does not silently carry forward.

## Applicability

A requirement revision is one of:

- `required`;
- `not-applicable`;
- `unscoped`.

Only `required` requirements may enter an approved denominator.

NOT_APPLICABLE and UNSCOPED remain visible registry states and are not converted into 0% or 100%.

## Explicit approved denominators

A completion denominator is never inferred from catalogue presence, module discovery, source reporting or software release state.

An owner/admin explicitly approves a scope containing exact requirement IDs and revisions.

Every denominator approval records:

- scope key;
- source ID;
- optional module ID;
- scope version;
- scope date;
- branch;
- commit SHA;
- exact requirement revisions;
- exact weights;
- denominator SHA-256;
- approver;
- approval time.

Source-wide denominators may explicitly include source-level and module-level requirements for that source. A module-scoped denominator may include only that exact module.

## Evidence

Evidence records are append-only and versioned per:

`requirement revision × evidence axis`

Every evidence record contains:

- state: SATISFIED, PARTIAL or FAILED;
- evidence URI;
- reviewer;
- confidence from 0 through 1;
- observed timestamp;
- expiry timestamp;
- branch;
- commit SHA;
- optional notes.

Missing evidence is derived as UNKNOWN.

Expired evidence is derived as STALE.

## Percentage rules

Build 338 exposes:

- unweighted completion;
- weighted completion;
- evidence coverage;
- per-axis completion.

A completion percentage is **unavailable** whenever an approved denominator contains UNKNOWN or STALE required evidence.

This avoids converting missing or expired evidence into a synthetic 0%.

Evidence coverage remains calculable and shows how much required-axis evidence is currently fresh.

Every percentage object retains:

- numerator;
- denominator;
- scope key;
- scope date;
- branch;
- commit SHA;
- evidence references;
- reviewers;
- minimum confidence;
- average confidence;
- UNKNOWN blockers;
- STALE blockers.

PARTIAL and FAILED are evidence-backed non-complete states and may participate in a calculated completion percentage once evidence coverage is complete.

## Database

Migration `0120_master_completion_requirements_scoring.sql` adds:

- `app.master_completion_requirement_revisions`;
- `app.master_completion_denominator_approvals`;
- `app.master_completion_evidence`.

All three tables are:

- suite-admin RLS protected;
- runtime SELECT/INSERT only;
- UPDATE/DELETE denied;
- append-only.

## Surfaces

- `/master-completion`;
- `/api/master-completion`.

Owner/admin actions are separated into:

- record requirement revision;
- approve denominator;
- record evidence.

## Safety boundaries

Build 338 does not:

- mutate any source application;
- infer a denominator from source data;
- mark missing evidence as failure or success;
- treat a GREEN software deployment as production/user acceptance;
- copy evidence from an old requirement revision into a new one;
- treat implementation as proof of other axes;
- create six-source completion percentages without approved inventories;
- execute a peer write or outbound command.

## Next queued build

**Build 339 — Application & Module Inventory, Capability and Readiness Read Models.**
