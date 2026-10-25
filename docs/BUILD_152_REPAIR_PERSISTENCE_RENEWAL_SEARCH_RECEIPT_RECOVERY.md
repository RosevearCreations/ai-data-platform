# Build 152 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Persistence, Renewal Recovery Audit Search Preset Recovery Audit Search & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery

## Objective

Extend Build 151 by persisting the selected repair-preset recovery audit search preset, adding text search to the renewal recovery-audit search preset recovery audit, and making the persisted receipt preset-repair audit search preset recovery-aware.

## Functional scope

- persist the selected repair-preset recovery audit search preset ID;
- restore the known repair preset on application load;
- persist only known sanitized repair preset IDs;
- changing repair age or search manually clears the persisted preset and enters temporary custom mode;
- clearing the repair-preset recovery audit clears the persisted preset;
- full local reset clears the repair preset storage key;
- add text search to renewal recovery-audit search preset recovery audit evidence;
- search renewal repair audit ID, requested preset ID, recovered preset ID and recovery reason;
- run renewal repair search after the selected age filter;
- keep renewal repair search temporary and browser-local;
- reset renewal repair search when its ledger is cleared;
- validate the persisted receipt preset-repair audit search preset ID on load;
- recover unsupported receipt repair preset IDs to All preset repairs;
- write the safe receipt repair preset back locally;
- show a recovery notice explaining the receipt repair preset recovery;
- clear that notice when a valid preset or manual custom view is selected;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset persistence

Build 151 introduced deterministic repair-preset recovery audit search presets.

Build 152 persists only the selected known preset ID in a dedicated browser-local namespace.

Persistence rules:

- known preset IDs are restored on application load;
- unsupported stored values sanitize to All repair-preset recoveries;
- manual age or search changes clear the persisted preset;
- arbitrary manual search text is never persisted;
- clearing the repair-preset recovery audit clears the persisted preset;
- full local reset removes the preset key.

## Renewal recovery audit search preset recovery audit search

Build 151 added age filtering to the renewal recovery-audit search preset recovery audit.

Build 152 adds text search across:

- audit ID;
- requested preset ID;
- recovered preset ID;
- recovery reason.

Search is applied after age filtering and preserves newest-first event order. Search text is not persisted.

## Receipt recovery audit search preset recovery audit search preset recovery

Build 151 persisted the selected receipt preset-repair audit search preset ID.

Build 152 validates that persisted value on load. If it is unsupported:

- it recovers to **All preset repairs**;
- the safe preset ID is written back to local storage;
- a recovery notice explains the repair;
- stored receipt preset-repair evidence is unchanged.

Selecting a valid preset or changing age/search manually clears the recovery notice.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side preset persistence, recovery or recovery-audit search;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 152 changes are browser-local preset persistence, search or safe recovery. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 152 verifier requires:

- dedicated repair preset storage namespace and sanitizer behavior;
- repair preset restore/apply/clear persistence wiring;
- manual repair age/search clearing persisted preset mode;
- renewal preset-recovery audit search across IDs and reasons;
- renewal repair search composing after age filtering and resetting on ledger clear;
- receipt preset-repair search preset recovery for unsupported stored IDs;
- safe receipt preset write-back and visible recovery notice;
- receipt recovery notice clearing on valid preset or manual custom view;
- full local reset coverage for the repair preset key;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 151 verifier forward compatibility;
- Build 152 registration in the application test chain.

## Next roadmap item

**Build 153 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery, Renewal Recovery Audit Search Preset Recovery Audit Search Presets & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit.**
