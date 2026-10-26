# Build 183 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit

## Objective

Extend Build 182 by making the persisted newest repair recovery search preset recovery-aware, adding deterministic search presets to the newest renewal recovery audit, and retaining a bounded audit trail whenever the persisted newest receipt recovery search preset is automatically repaired.

## Functional scope

- validate the persisted newest repair recovery preset ID on application load;
- recover unsupported repair preset IDs to All search preset recoveries;
- write the safe repair preset back locally;
- show a recovery notice explaining the repair;
- clear that notice when a valid repair preset or manual custom view is selected;
- add newest renewal recovery search presets for All preset recoveries, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- apply renewal presets as deterministic age-filter plus search-query pairs;
- manual renewal age or search changes leave preset mode;
- keep the Build 183 newest renewal preset selection temporary and browser-local;
- create a dedicated browser-local newest receipt recovery preset recovery audit;
- record requested preset, recovered preset, reason and time whenever an unsupported newest receipt preset is repaired;
- retain at most ten newest receipt recovery events;
- export and clear that recovery audit independently;
- keep the new receipt recovery audit visible independently from the parent receipt recovery ledger;
- include the new recovery audit in full local reset coverage;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery

Build 182 persisted the newest repair recovery search preset.

Build 183 validates the saved value on load. Unsupported values recover to **All search preset recoveries**, the safe ID is written back locally, a recovery notice explains the repair, and retained repair evidence is unchanged.

## Renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search presets

Build 182 added text search to the newest renewal recovery audit.

Build 183 adds five deterministic quick views:

- **All preset recoveries** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual age or search changes leave preset mode. Build 183 does not persist this newest renewal preset selection.

## Receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit

Build 182 made the persisted newest receipt recovery search preset recovery-aware.

Build 183 records those automatic repairs in a dedicated bounded browser-local audit ledger. Each entry retains audit ID, recovery timestamp, requested unsupported preset ID, recovered safe preset ID and recovery reason. The ledger is newest-first, deduplicated by audit ID, capped at ten entries, exportable and independently clearable.

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

All Build 183 changes are browser-local recovery, view presets or bounded recovery evidence. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 183 verifier requires repair preset recovery, deterministic newest renewal presets, bounded newest receipt recovery evidence, interface wiring, contextual help, responsive styling, Build 182 forward compatibility and application-test registration.

## Next roadmap item

**Build 184 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Persistence & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Filtering.**
