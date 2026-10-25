# Build 147 — Recovery Audit Recovery Search Preset Recovery, Renewal Search Preset Recovery Audit Search Presets & Receipt Recovery Audit Search Preset Recovery Audit

## Objective

Extend Build 146 by making the persisted recovery-audit repair search preset recovery-aware, adding deterministic search presets to renewal search preset recovery evidence, and retaining a bounded browser-local audit trail whenever an unsupported receipt-recovery audit search preset is repaired.

## Functional scope

- validate the persisted recovery-audit repair search preset ID on application load;
- recover unsupported repair-ledger preset IDs to All preset recoveries;
- write the repaired safe repair preset back locally;
- show a recovery notice explaining the repair;
- clear the repair notice when a valid preset or manual custom view is selected;
- add renewal recovery audit search presets for All recovery events, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- apply renewal audit search presets as age-filter plus query pairs;
- leave renewal audit preset mode when age or search is changed manually;
- keep renewal recovery audit search presets temporary in Build 147;
- create a new browser-local receipt recovery audit search preset recovery audit;
- record requested preset, recovered preset, reason and recovery time;
- retain at most ten newest receipt-recovery preset repair events;
- export and clear that recovery audit independently;
- preserve stored receipt recovery evidence while recording repair evidence;
- add contextual help and forced-colors-safe styling.

## Recovery audit recovery search preset recovery

Build 146 persisted the selected recovery-audit repair search preset ID.

Build 147 validates that value on load. If the saved ID is unsupported:

- it recovers to **All preset recoveries**;
- the safe value is written back to local storage;
- a recovery notice is shown;
- stored repair-ledger evidence is unchanged.

Selecting a supported preset or manually changing age/search clears the recovery notice.

## Renewal search preset recovery audit search presets

Build 146 added text search to the renewal search preset recovery audit.

Build 147 adds five deterministic quick views:

- **All recovery events** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual age or search changes leave preset mode. These preset selections remain temporary and browser-local in Build 147.

## Receipt recovery audit search preset recovery audit

Build 146 repaired unsupported saved receipt-recovery audit search preset IDs.

Build 147 records those automatic repairs in a dedicated bounded audit ledger.

Each entry contains:

- audit ID;
- recovery timestamp;
- requested unsupported preset ID;
- recovered safe preset ID;
- recovery reason.

The ledger:

- is newest-first;
- is deduplicated by audit ID;
- retains at most ten events;
- can be exported independently;
- can be cleared independently;
- does not rewrite receipt recovery evidence.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side preset recovery or audit ledger;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 147 changes are browser-local recovery, view presets, or bounded evidence. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 147 verifier requires:

- repair-ledger preset recovery for unsupported persisted IDs;
- safe write-back and visible repair notice;
- notice clearing on valid preset or manual custom view;
- deterministic renewal recovery-audit search preset mappings;
- manual renewal age/search changes leaving preset mode;
- receipt recovery audit search preset recovery audit entry construction;
- newest-first bounded receipt recovery audit behavior;
- export and clear wiring for the new recovery ledger;
- help coverage;
- forced-colors-compatible styling;
- Build 146 verifier forward compatibility;
- Build 147 registration in the application test chain.

## Next roadmap item

**Build 148 — Recovery Audit Recovery Search Preset Recovery Audit, Renewal Recovery Audit Search Preset Persistence & Receipt Recovery Audit Search Preset Recovery Audit Filtering.**
