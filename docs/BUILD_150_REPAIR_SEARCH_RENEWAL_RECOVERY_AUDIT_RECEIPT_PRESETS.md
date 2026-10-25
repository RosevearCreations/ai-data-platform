# Build 150 — Recovery Audit Recovery Search Preset Recovery Audit Search, Renewal Recovery Audit Search Preset Recovery Audit & Receipt Recovery Audit Search Preset Recovery Audit Search Presets

## Objective

Extend Build 149 by adding text search to the repair-search-preset recovery audit, retaining a bounded audit trail whenever the renewal recovery-audit search preset is itself recovered, and adding deterministic search presets to receipt recovery-audit search preset repair evidence.

## Functional scope

- add text search to recovery-audit repair search preset recovery audit evidence;
- search repair audit ID, requested preset ID, recovered preset ID and recovery reason;
- run repair-audit search after the selected age filter;
- keep repair-audit search temporary and browser-local;
- reset repair-audit search when its ledger is cleared;
- create a dedicated browser-local renewal recovery-audit search preset recovery audit;
- record requested preset, recovered preset, reason and time whenever an unsupported renewal recovery-audit preset is repaired;
- retain at most ten newest renewal recovery-audit preset repair events;
- export and clear that recovery audit independently;
- add receipt preset-repair audit search presets for All preset repairs, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- apply receipt repair search presets as age-filter plus query pairs;
- changing receipt repair age or search manually leaves preset mode;
- keep receipt repair search preset selections temporary in Build 150;
- include all new local keys/evidence in full reset coverage;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search

Build 149 added age filtering to the repair-search-preset recovery audit.

Build 150 adds text search across:

- audit ID;
- requested preset ID;
- recovered preset ID;
- recovery reason.

Search is applied after age filtering and preserves newest-first event order. Search text is not persisted.

## Renewal recovery audit search preset recovery audit

Build 149 made the persisted renewal recovery-audit search preset recovery-aware.

Build 150 records those automatic repairs in a dedicated bounded local audit ledger.

Each entry contains:

- audit ID;
- recovery timestamp;
- requested unsupported preset ID;
- recovered safe preset ID;
- recovery reason.

The ledger is newest-first, deduplicated by audit ID, capped at ten entries, exportable, and independently clearable.

## Receipt recovery audit search preset recovery audit search presets

Build 149 added text search to receipt recovery-audit search preset repair evidence.

Build 150 adds five deterministic quick views:

- **All preset repairs** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual age or search changes leave preset mode. These preset selections remain temporary and browser-local in Build 150.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery audit search or preset repair ledger;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 150 changes are browser-local search, bounded evidence, or view presets. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 150 verifier requires:

- repair-preset recovery audit search across IDs and reasons;
- search composing after age filtering and resetting on ledger clear;
- renewal recovery-audit search preset recovery audit construction and newest-first retention;
- startup recording, export and clear wiring for renewal preset-recovery audit evidence;
- deterministic receipt preset-repair audit search preset mappings;
- manual receipt age/search changes leaving preset mode;
- full local reset coverage for the new evidence;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 149 verifier forward compatibility;
- Build 150 registration in the application test chain.

## Next roadmap item

**Build 151 — Recovery Audit Recovery Search Preset Recovery Audit Search Presets, Renewal Recovery Audit Search Preset Recovery Audit Filtering & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Persistence.**
