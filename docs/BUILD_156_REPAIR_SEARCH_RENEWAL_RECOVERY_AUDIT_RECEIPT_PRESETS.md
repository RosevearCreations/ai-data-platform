# Build 156 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets

## Objective

Extend Build 155 by adding text search to the repair-preset search-preset recovery audit, retaining a bounded audit trail whenever the persisted renewal preset-recovery audit search preset is recovered, and adding deterministic search presets to the receipt preset-repair search-preset recovery audit.

## Functional scope

- add text search to repair-preset search-preset recovery audit evidence;
- search repair recovery audit ID, requested preset ID, recovered preset ID and recovery reason;
- run repair recovery search after the selected age filter;
- keep repair recovery search temporary and browser-local;
- reset repair recovery search when its ledger is cleared;
- create a dedicated browser-local renewal preset-recovery audit search preset recovery audit;
- record requested preset, recovered preset, reason and time whenever an unsupported renewal preset is recovered;
- retain at most ten newest renewal search-preset recovery events;
- export and clear that renewal recovery audit independently;
- keep renewal search-preset recovery audit visible independently from the parent renewal recovery ledger;
- add receipt search-preset recovery audit search presets for All recoveries, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- apply receipt recovery presets as deterministic age-filter plus search-query pairs;
- changing receipt recovery age or search manually leaves preset mode;
- keep receipt recovery search-preset selection temporary in Build 156;
- include the new renewal recovery audit in full local reset coverage;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit search

Build 155 added age filtering to the repair-preset search-preset recovery audit.

Build 156 adds text search across:

- audit ID;
- requested preset ID;
- recovered preset ID;
- recovery reason.

Search is applied after age filtering and preserves newest-first event order. Search text is not persisted.

## Renewal recovery audit search preset recovery audit search preset recovery audit

Build 155 made the persisted renewal preset-recovery audit search preset recovery-aware.

Build 156 records those automatic repairs in a dedicated bounded browser-local audit ledger.

Each entry contains:

- audit ID;
- recovery timestamp;
- requested unsupported preset ID;
- recovered safe preset ID;
- recovery reason.

The ledger is newest-first, deduplicated by audit ID, capped at ten entries, exportable, independently clearable, and remains available even when the parent renewal recovery evidence list is empty.

## Receipt recovery audit search preset recovery audit search preset recovery audit search presets

Build 155 added text search to the receipt preset-repair search-preset recovery audit.

Build 156 adds five deterministic quick views:

- **All recoveries** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual age or search changes leave preset mode. Build 156 does not persist this preset selection.

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

All Build 156 changes are browser-local search, bounded recovery evidence or deterministic view presets. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 156 verifier requires:

- repair search-preset recovery audit search across IDs and reasons;
- repair search composing after age filtering and resetting on ledger clear;
- renewal search-preset recovery audit construction and newest-first retention;
- startup recording, export and clear wiring for renewal recovery evidence;
- independent renewal recovery-audit visibility;
- deterministic receipt recovery search-preset mappings;
- manual receipt age/search changes leaving preset mode;
- complete export remaining independent from selected filters/search;
- full local reset coverage for new repair search, renewal audit and receipt preset state;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 155 verifier forward compatibility;
- Build 156 registration in the application test chain.

## Next roadmap item

**Build 157 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Presets, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Filtering & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Persistence.**
