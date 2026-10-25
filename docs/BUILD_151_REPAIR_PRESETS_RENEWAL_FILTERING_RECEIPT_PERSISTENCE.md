# Build 151 — Recovery Audit Recovery Search Preset Recovery Audit Search Presets, Renewal Recovery Audit Search Preset Recovery Audit Filtering & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Persistence

## Objective

Extend Build 150 by adding deterministic search presets to the repair-search-preset recovery audit, adding age filtering to the renewal recovery-audit search preset recovery audit, and persisting the selected receipt preset-repair audit search preset.

## Functional scope

- add repair-preset recovery audit search presets for All repair-preset recoveries, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- apply repair presets as deterministic age-filter plus search-query pairs;
- changing repair age or search manually leaves preset mode;
- keep repair-preset recovery audit search preset selection temporary in Build 151;
- add All, Last 24 hours and Last 7 days filtering to renewal recovery-audit search preset recovery audit evidence;
- preserve complete renewal preset-repair evidence while filtering the visible ledger;
- reset renewal preset-repair filtering when that ledger is cleared;
- persist the selected receipt preset-repair audit search preset ID;
- restore that known receipt repair preset on application load;
- persist only known sanitized receipt repair preset IDs;
- changing receipt repair age or search manually clears the persisted preset and enters temporary custom mode;
- clearing the receipt preset-repair audit clears the persisted search preset;
- full local reset clears the receipt repair preset storage key;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search presets

Build 150 added text search to the repair-search-preset recovery audit.

Build 151 adds five deterministic quick views:

- **All repair-preset recoveries** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual age or search changes leave preset mode. Build 151 does not persist this repair-audit preset selection.

## Renewal recovery audit search preset recovery audit filtering

Build 150 created a dedicated bounded audit ledger for renewal recovery-audit search preset repairs.

Build 151 adds age filtering:

- **All preset recoveries**;
- **Last 24 hours**;
- **Last 7 days**.

Filtering preserves event order, timestamps, reasons, retention and complete export.

## Receipt recovery audit search preset recovery audit search preset persistence

Build 150 introduced deterministic receipt preset-repair audit search presets.

Build 151 persists only the selected known preset ID in a dedicated browser-local namespace.

Persistence rules:

- known preset IDs are restored on application load;
- unsupported stored values sanitize to All preset repairs;
- manual age or search changes clear the persisted preset;
- arbitrary manual search text is never persisted;
- clearing the receipt preset-repair audit clears the persisted preset;
- full local reset removes the preset key.

This persistence changes only the visible receipt repair-evidence view.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side preset persistence or recovery audit filtering;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 151 changes are browser-local view presets, filtering or preset persistence. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 151 verifier requires:

- deterministic repair-preset recovery audit search preset mappings;
- manual repair age/search changes leaving preset mode;
- renewal preset-recovery audit all/24h/7d filtering;
- renewal repair filter reset on ledger clear;
- dedicated receipt repair search preset storage namespace and sanitizer behavior;
- receipt repair preset restoration and apply/clear persistence wiring;
- manual receipt age/search changes clearing persisted preset mode;
- full local reset coverage for the receipt repair preset key;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 150 verifier forward compatibility;
- Build 151 registration in the application test chain.

## Next roadmap item

**Build 152 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Persistence, Renewal Recovery Audit Search Preset Recovery Audit Search & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery.**
