# Build 158 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Persistence, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery

## Objective

Extend Build 157 by persisting the selected repair search-preset recovery audit search preset, adding text search to the renewal preset-recovery audit search-preset recovery audit, and making the persisted receipt search-preset recovery audit search preset recovery-aware.

## Functional scope

- persist the selected repair search-preset recovery audit search preset ID;
- restore the known repair preset on application load;
- persist only known sanitized repair preset IDs;
- changing repair age or search manually clears the persisted preset and enters temporary custom mode;
- clearing the repair search-preset recovery audit clears the persisted preset;
- full local reset clears the repair preset storage key;
- add text search to renewal preset-recovery audit search-preset recovery audit evidence;
- search renewal repair audit ID, requested preset ID, recovered preset ID and recovery reason;
- run renewal search after the selected age filter;
- keep renewal search temporary and browser-local;
- reset renewal search when its ledger is cleared;
- validate the persisted receipt search-preset recovery audit search preset ID on load;
- recover unsupported receipt preset IDs to All recoveries;
- write the safe receipt preset back locally;
- show a recovery notice explaining the receipt preset recovery;
- clear that notice when a valid preset or manual custom view is selected;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit search preset persistence

Build 157 introduced deterministic search presets for the newest repair search-preset recovery audit.

Build 158 persists only the selected known preset ID in a dedicated browser-local namespace.

Persistence rules:

- known preset IDs are restored on application load;
- unsupported stored values sanitize to All search preset recoveries;
- manual age or search changes clear the persisted preset;
- arbitrary manual search text is never persisted;
- clearing the repair recovery audit clears the persisted preset;
- full local reset removes the preset key.

## Renewal recovery audit search preset recovery audit search preset recovery audit search

Build 157 added age filtering to the newest renewal preset-recovery audit search-preset recovery audit.

Build 158 adds text search across:

- audit ID;
- requested preset ID;
- recovered preset ID;
- recovery reason.

Search is applied after age filtering and preserves newest-first event order. Search text is not persisted.

## Receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery

Build 157 persisted the selected receipt search-preset recovery audit search preset ID.

Build 158 validates that persisted value on load. If it is unsupported:

- it recovers to **All recoveries**;
- the safe preset ID is written back to local storage;
- a recovery notice explains the repair;
- retained receipt recovery evidence is unchanged.

Selecting a valid preset or changing age/search manually clears the recovery notice.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side preset persistence, search or recovery;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 158 changes are browser-local preset persistence, search or safe recovery. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 158 verifier requires:

- dedicated repair preset storage namespace and sanitizer behavior;
- repair preset restore/apply/clear persistence wiring;
- manual repair age/search clearing persisted preset mode;
- renewal preset-recovery audit search across IDs and reasons;
- renewal search composing after age filtering and resetting on ledger clear;
- receipt search-preset recovery for unsupported stored IDs;
- safe receipt preset write-back and visible recovery notice;
- receipt recovery notice clearing on valid preset or manual custom view;
- full local reset coverage for the repair preset key;
- contextual help coverage;
- responsive and forced-colors-compatible styling;
- Build 157 verifier forward compatibility;
- Build 158 registration in the application test chain.

## Next roadmap item

**Build 159 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit.**
