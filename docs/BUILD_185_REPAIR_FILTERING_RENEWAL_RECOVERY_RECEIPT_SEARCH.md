# Build 185 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Filtering, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search

## Objective

Extend Build 184 by adding age filtering to the newest repair search-preset recovery audit, making the persisted newest renewal recovery search preset recovery-aware, and adding text search to the newest receipt search-preset recovery audit.

## Functional scope

- add All, Last 24 hours and Last 7 days filtering to newest repair recovery evidence;
- preserve complete repair recovery evidence while filtering the visible ledger;
- reset repair recovery filtering when that ledger is cleared;
- validate the persisted newest renewal search preset ID on application load;
- recover unsupported renewal preset IDs to All preset recoveries;
- write the safe renewal preset back locally;
- show a visible recovery notice explaining the renewal preset repair;
- clear the renewal recovery notice when a valid preset or manual custom view is selected;
- add text search to newest receipt recovery evidence;
- search receipt audit ID, requested preset ID, recovered preset ID and recovery reason;
- run receipt recovery search after the selected age filter;
- keep receipt recovery search temporary and browser-local;
- reset receipt recovery search when its ledger is cleared;
- preserve complete export independently from repair filtering and receipt search;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit filtering

Build 184 created the dedicated bounded audit ledger for automatic newest repair preset repairs.

Build 185 adds age filtering:

- **All search preset recoveries**;
- **Last 24 hours**;
- **Last 7 days**.

Filtering preserves event order, timestamps, reasons, retention and complete export.

## Renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery

Build 184 persisted the selected newest renewal search preset.

Build 185 validates that persisted value on load. If it is unsupported:

- it recovers to **All preset recoveries**;
- the safe preset ID is written back to local storage;
- a recovery notice explains the repair;
- stored renewal recovery evidence is unchanged.

Selecting a valid preset or changing age/search manually clears the recovery notice.

## Receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search

Build 184 added age filtering to the newest receipt recovery audit.

Build 185 adds text search across:

- audit ID;
- requested preset ID;
- recovered preset ID;
- recovery reason.

Search is applied after age filtering and preserves newest-first event order. Search text is not persisted.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery-audit filtering, preset recovery or recovery-audit search;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 185 changes are browser-local filtering, safe preset recovery or search. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 185 verifier requires newest repair recovery audit age filtering, renewal persisted preset recovery, receipt recovery audit search, full-reset coverage, contextual help, responsive styling, Build 184 forward compatibility and application-test registration.

## Next roadmap item

**Build 186 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets.**
