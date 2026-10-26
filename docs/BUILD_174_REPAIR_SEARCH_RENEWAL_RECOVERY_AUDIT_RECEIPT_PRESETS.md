# Build 174 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets

## Objective

Extend Build 173 by adding text search to the newest repair search-preset recovery audit, retaining a bounded audit trail whenever the persisted newest renewal recovery search preset is recovered, and adding deterministic search presets to the newest receipt search-preset recovery audit.

## Functional scope

- add text search to newest repair recovery audit evidence;
- search repair audit ID, requested preset ID, recovered preset ID and recovery reason;
- run repair recovery search after the selected age filter;
- keep repair recovery search temporary and browser-local;
- reset repair recovery search when its ledger is cleared;
- create a dedicated browser-local newest renewal search-preset recovery audit;
- record requested preset, recovered preset, reason and time whenever an unsupported newest renewal preset is recovered;
- retain at most ten newest renewal search-preset recovery events;
- export and clear that renewal recovery audit independently;
- keep renewal recovery audit visible independently from the parent renewal recovery ledger;
- add newest receipt recovery search presets for All recoveries, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- apply receipt presets as deterministic age-filter plus search-query pairs;
- changing receipt age or search manually leaves preset mode;
- keep newest receipt preset selection temporary in Build 174;
- include the new renewal recovery audit in full local reset coverage;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search

Build 173 added age filtering to the newest repair search-preset recovery audit.

Build 174 adds text search across audit ID, requested preset ID, recovered preset ID and recovery reason. Search is applied after age filtering, preserves newest-first order and is not persisted.

## Renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit

Build 173 made the persisted newest renewal search preset recovery-aware.

Build 174 records those automatic repairs in a dedicated bounded browser-local audit ledger. Each entry contains audit ID, recovery timestamp, requested unsupported preset ID, recovered safe preset ID and recovery reason. The ledger is newest-first, deduplicated by audit ID, capped at ten entries, exportable, independently clearable, and remains available independently of the parent renewal recovery ledger.

## Receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search presets

Build 173 added text search to the newest receipt recovery audit.

Build 174 adds five deterministic quick views:

- **All recoveries** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual age or search changes leave preset mode. Build 174 does not persist this newest receipt preset selection.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery-audit search, recovery audit or search-preset state;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 174 changes are browser-local search, bounded recovery evidence or deterministic view presets. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 174 verifier requires newest repair recovery audit search across IDs and reasons, newest renewal search-preset recovery audit construction and newest-first retention, startup recording/export/clear wiring, independent renewal audit visibility, deterministic newest receipt search-preset mappings, manual receipt age/search changes leaving preset mode, full local reset coverage, contextual help, responsive styling, Build 173 forward compatibility and application-test registration.

## Next roadmap item

**Build 175 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Filtering & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Persistence.**
