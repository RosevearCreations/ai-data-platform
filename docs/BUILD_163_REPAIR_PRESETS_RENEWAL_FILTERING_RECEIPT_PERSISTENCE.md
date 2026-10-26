# Build 163 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Filtering & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Persistence

## Objective

Extend Build 162 by adding deterministic search presets to the newest repair search-preset recovery audit, adding age filtering to the newest renewal search-preset recovery audit, and persisting the selected newest receipt recovery search preset.

## Functional scope

- add newest repair recovery search presets for All search preset recoveries, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- apply repair presets as deterministic age-filter plus search-query pairs;
- manual repair age or search changes leave preset mode;
- keep the newest repair preset selection temporary in Build 163;
- add All, Last 24 hours and Last 7 days filtering to the newest renewal recovery audit;
- preserve the complete renewal recovery ledger while filtering visible evidence;
- reset renewal filtering when that ledger is cleared;
- persist the selected newest receipt recovery search preset ID in a dedicated browser-local namespace;
- restore a known receipt preset on application load;
- sanitize unsupported receipt preset IDs to All recoveries;
- manual receipt age or search changes clear persisted preset mode;
- clearing the newest receipt recovery ledger clears its persisted preset;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search presets

Build 162 added text search to the newest repair recovery ledger.

Build 163 adds five deterministic quick views:

- **All search preset recoveries** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual age or search changes leave preset mode. The newest repair preset selection remains temporary.

## Renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit filtering

Build 162 created the newest bounded renewal recovery audit.

Build 163 adds age filtering for All, Last 24 hours and Last 7 days. Filtering preserves event order, timestamps, reasons, retention and complete export. Clearing the ledger resets the age filter to All.

## Receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset persistence

Build 162 introduced deterministic newest receipt recovery search presets.

Build 163 persists only the selected known preset ID in a dedicated browser-local namespace. Known IDs restore on load, unsupported values sanitize to All, and arbitrary manual search text is never persisted. Manual age/search changes or clearing the ledger removes persisted preset mode.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side preset persistence or recovery-audit filtering;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 163 changes are browser-local view presets, filtering or known-preset persistence. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 163 verifier requires deterministic newest repair preset mappings, newest renewal all/24h/7d filtering, dedicated newest receipt preset storage and sanitizer behavior, interface wiring, help coverage, responsive styling, Build 162 forward compatibility and application-test registration.

## Next roadmap item

**Build 164 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Persistence, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery.**
