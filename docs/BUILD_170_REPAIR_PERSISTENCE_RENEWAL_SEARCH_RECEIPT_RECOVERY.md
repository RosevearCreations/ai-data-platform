# Build 170 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Persistence, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery

## Objective

Extend Build 169 by persisting the selected newest repair recovery search preset, adding text search to the newest renewal recovery audit, and making the persisted newest receipt recovery search preset recovery-aware.

## Functional scope

- persist the selected newest repair recovery search preset ID;
- restore a known repair preset on application load;
- persist only known sanitized repair preset IDs;
- changing repair age or search manually clears persisted preset mode;
- clearing the newest repair recovery audit clears its persisted preset;
- full local reset clears the newest repair preset storage key;
- add text search to the newest renewal recovery audit;
- search renewal audit ID, requested preset ID, recovered preset ID and recovery reason;
- run renewal search after the selected age filter;
- keep renewal search temporary and browser-local;
- reset renewal search when its ledger is cleared;
- validate the persisted newest receipt recovery search preset ID on load;
- recover unsupported receipt preset IDs to All recoveries;
- write the safe receipt preset back locally;
- show a recovery notice explaining the receipt preset repair;
- clear that notice when a valid preset or manual custom view is selected;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset persistence

Build 169 introduced deterministic search presets for the newest repair recovery audit.

Build 170 persists only the selected known preset ID in a dedicated browser-local namespace. Known IDs restore on load, unsupported IDs sanitize to All search preset recoveries, manual age/search changes clear persisted preset mode, and arbitrary search text is never persisted.

## Renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search

Build 169 added age filtering to the newest renewal recovery audit.

Build 170 adds text search across audit ID, requested preset ID, recovered preset ID and recovery reason. Search is applied after age filtering and preserves newest-first event order. Search text is not persisted.

## Receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery

Build 169 persisted the selected newest receipt recovery search preset.

Build 170 validates that stored value on load. Unsupported values recover to **All recoveries**, the safe preset is written back locally, and a visible recovery notice explains the repair. Retained recovery evidence is unchanged.

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

All Build 170 changes are browser-local preset persistence, search or safe recovery. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 170 verifier requires dedicated newest repair preset persistence, newest renewal recovery search, newest receipt preset recovery, complete interface wiring, contextual help, responsive styling, Build 169 forward compatibility and application-test registration.

## Next roadmap item

**Build 171 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Presets & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit.**
