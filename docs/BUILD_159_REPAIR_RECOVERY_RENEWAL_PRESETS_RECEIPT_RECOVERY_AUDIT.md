# Build 159 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit

## Objective

Extend Build 158 by making the persisted repair search-preset recovery audit search preset recovery-aware, adding deterministic search presets to the newest renewal recovery audit, and retaining a bounded audit trail whenever the persisted receipt search-preset recovery audit search preset is recovered.

## Functional scope

- validate the persisted repair search-preset recovery audit search preset ID on application load;
- recover unsupported repair preset IDs to All search preset recoveries;
- write the safe repair preset back locally;
- show a recovery notice explaining the repair;
- clear the repair recovery notice when a valid preset or manual custom view is selected;
- add renewal search-preset recovery audit search presets for All preset recoveries, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- apply renewal presets as deterministic age-filter plus search-query pairs;
- changing renewal age or search manually leaves preset mode;
- keep the Build 159 renewal preset selection temporary and browser-local;
- create a dedicated browser-local receipt search-preset recovery audit search preset recovery audit;
- record requested preset, recovered preset, reason and time whenever an unsupported receipt preset is recovered;
- retain at most ten newest receipt recovery events;
- export and clear that recovery audit independently;
- keep receipt recovery audit visible independently from the parent receipt recovery ledger;
- include the new recovery audit in full local reset coverage;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery

Build 158 persisted the newest repair search-preset recovery audit search preset.

Build 159 validates that persisted value on load. If it is unsupported:

- it recovers to **All search preset recoveries**;
- the safe preset ID is written back to local storage;
- a recovery notice explains the repair;
- retained repair recovery evidence is unchanged.

Selecting a valid preset or changing age/search manually clears the recovery notice.

## Renewal recovery audit search preset recovery audit search preset recovery audit search presets

Build 158 added text search to the newest renewal preset-recovery audit search-preset recovery audit.

Build 159 adds five deterministic quick views:

- **All preset recoveries** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual age or search changes leave preset mode. Build 159 does not persist this preset selection.

## Receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit

Build 158 made the persisted receipt search-preset recovery audit search preset recovery-aware.

Build 159 records those automatic repairs in a dedicated bounded local audit ledger.

Each entry contains:

- audit ID;
- recovery timestamp;
- requested unsupported preset ID;
- recovered safe preset ID;
- recovery reason.

The ledger is newest-first, deduplicated by audit ID, capped at ten entries, exportable, independently clearable, and remains available even when the parent receipt recovery evidence list is empty.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side preset recovery audit;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 159 changes are browser-local recovery, view presets or bounded recovery evidence. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 159 verifier requires:

- repair search-preset recovery for unsupported persisted IDs;
- safe repair preset write-back and visible recovery notice;
- repair recovery notice clearing on valid preset or manual custom view;
- deterministic renewal search-preset mappings;
- manual renewal age/search changes leaving preset mode;
- receipt search-preset recovery audit construction and newest-first retention;
- startup recording, export and clear wiring for receipt recovery evidence;
- full local reset coverage for the new receipt recovery audit;
- independent receipt recovery-audit visibility;
- contextual help coverage;
- responsive and forced-colors-compatible styling;
- Build 158 verifier forward compatibility;
- Build 159 registration in the application test chain.

## Next roadmap item

**Build 160 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Persistence & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Filtering.**
