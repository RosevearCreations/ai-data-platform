# Build 136 — Favorite View Recovery Audit, Recovery Snapshot Renewal Workflow & Receipt History Filtering

## Objective

Extend Build 135's self-healing favorite view, snapshot expiry guidance and bounded receipt history with an auditable record of actual view recoveries, a deliberate two-step recovery-point renewal workflow and view-only receipt-history filtering.

## Functional scope

- record actual automatic Favorites-to-All recoveries in a dedicated browser-local audit;
- distinguish initial-load, explicit-filter and last-favorite-removal recovery triggers;
- retain at most twelve audit entries, newest first;
- export the recovery audit as versioned JSON;
- clear the recovery audit independently from profiles and preferences;
- assess whether the current recovery snapshot should be renewed;
- recommend renewal for legacy and 30-day-expired snapshots;
- suggest renewal for stale snapshots;
- keep fresh snapshots as no-renewal-needed guidance;
- require a two-step renewal review/confirmation before replacing an existing recovery point;
- cancel renewal without changing the existing snapshot;
- disarm an armed renewal if current preferences or named-profile state changes;
- filter the existing receipt history by matched/deviated outcome;
- filter receipt history by Skip, Replace or Keep both strategy;
- combine outcome and strategy filters while preserving original receipt order;
- keep filters temporary and view-only;
- preserve export/clear behavior for the underlying full history;
- add contextual help and responsive/forced-colors styling.

## Favorite view recovery audit

Build 136 records only actual automatic favorite-view recoveries.

Each audit entry contains:

- audit ID;
- creation time;
- trigger;
- requested filter;
- resolved filter;
- recovery reason.

Supported triggers are:

- **initial-load** — a persisted Favorites view is unusable when browser state loads;
- **filter-selection** — Favorites is requested while no favorite profile exists;
- **last-favorite-removed** — the last favorite is removed while Favorites is active.

Ordinary All/Favorites changes that do not require recovery are not audited.

The audit is newest-first and capped at twelve entries. It is browser-local, exportable, independently clearable and removed by the full local-navigation reset.

## Recovery snapshot renewal workflow

Build 136 adds a renewal assessment on top of the Build 134/135 freshness model.

Renewal guidance is:

- **Fresh** — no renewal needed;
- **Aging** — consider age, but renewal is not yet recommended;
- **Stale** — renewal is recommended for consideration;
- **Expired guidance window** — renewal is recommended;
- **Legacy** — renewal is recommended so a timestamped recovery point exists.

Renewal is deliberately two-step.

First action:

**Review renewal**

This arms renewal but writes nothing.

Second action:

**Confirm renewal**

This replaces the existing recovery snapshot with the current browser's:

- interface preferences;
- named profiles;
- favorite flags;
- explicit profile order;
- current timestamp.

The operator can choose **Cancel renewal** and preserve the old recovery point.

An armed renewal is disarmed when current interface preferences or named-profile state changes so approval cannot be reused against a different state.

Renewal does not restore old state. It captures the current state as the new recovery point.

## Receipt history filtering

Build 136 adds view-only filters to the bounded Build 135 receipt history.

Outcome filter:

- **All outcomes**
- **Matched**
- **Deviated**

Strategy filter:

- **All strategies**
- **Skip**
- **Replace**
- **Keep both**

The two filters can be combined.

Filtering:

- preserves receipt order;
- does not alter the latest-receipt identity;
- does not delete receipts;
- does not rewrite receipt evidence;
- does not change the ten-entry history cap;
- is not synchronized or persisted.

If no entries match, the UI reports that no receipts match the selected filters.

Export history still exports the complete stored history rather than only the filtered view.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery audit;
- no automatic recovery-snapshot replacement;
- no forced snapshot expiry or deletion;
- no server-side receipt-history filtering;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

The recovery audit is local evidence, the renewal workflow requires explicit confirmation, and receipt history filtering is view-only. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 136 verifier requires:

- twelve-entry newest-first recovery-audit cap;
- versioned recovery-audit round trip;
- dedicated recovery-audit storage namespace;
- trigger coverage for initial load, filter selection and last-favorite removal;
- fresh/stale/expired/legacy renewal assessments;
- two-step renewal UI with cancel path;
- renewal disarm when browser state changes;
- matched/deviated receipt filtering;
- strategy receipt filtering;
- combined filters preserving receipt order;
- filter empty-state messaging;
- audit export and clear controls;
- full-reset audit and receipt-history cleanup;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 135 verifier forward compatibility;
- Build 136 registration in the test chain.

## Next roadmap item

**Build 137 — Recovery Audit Filtering, Snapshot Renewal Receipt & Receipt History Search.**
