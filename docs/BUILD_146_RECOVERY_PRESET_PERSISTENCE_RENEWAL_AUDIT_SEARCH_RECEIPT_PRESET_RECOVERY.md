# Build 146 — Recovery Audit Recovery Search Preset Persistence, Renewal Search Preset Recovery Audit Search & Receipt Recovery Audit Search Preset Recovery

## Objective

Extend Build 145 by persisting the selected recovery-audit repair search preset, adding case-insensitive text search to renewal search preset recovery evidence, and making persisted receipt-recovery audit search presets recovery-aware when a saved preset ID is no longer supported.

## Functional scope

- persist the selected recovery-audit repair search preset ID in a dedicated browser-local namespace;
- restore that repair-ledger preset on application load;
- persist only a sanitized known repair preset ID;
- manually changing repair-ledger age or search clears the persisted preset and enters a temporary custom view;
- clearing the repair ledger clears its persisted search preset;
- full local reset clears the repair preset storage key;
- add case-insensitive text search across renewal search preset recovery audit evidence;
- search renewal recovery evidence by audit ID, requested preset ID, recovered preset ID and reason;
- compose renewal recovery audit search with Build 145 age filtering;
- keep renewal recovery search temporary and view-only;
- preserve complete renewal recovery audit export while searching;
- validate the saved receipt recovery audit search preset ID on load;
- repair unsupported saved receipt-recovery preset IDs to All recovery events;
- persist the repaired safe preset ID after recovery;
- show a browser-local recovery notice explaining the receipt preset repair;
- clear the recovery notice when a valid preset or manual custom view is selected;
- add contextual help and responsive/forced-colors styling.

## Recovery audit recovery search preset persistence

Build 145 introduced deterministic recovery-audit repair search presets. Build 146 persists only the selected preset ID.

Persistence rules:

- known preset IDs are stored in a dedicated browser-local key;
- unsupported values sanitize to All preset recoveries;
- arbitrary manual search text is never persisted;
- manually changing age or search clears the saved preset;
- clearing the repair ledger clears the saved preset;
- full local reset removes the saved preset.

Persistence changes only the repair-ledger view. It does not rewrite repair evidence.

## Renewal search preset recovery audit search

Build 145 added age filtering to the renewal search preset recovery audit.

Build 146 adds case-insensitive text search after that age filter. Search can match:

- audit ID;
- requested unsupported preset ID;
- recovered preset ID;
- recovery reason.

Search is temporary and browser-local. It does not alter ordering, retention, timestamps, reasons, or complete export.

## Receipt recovery audit search preset recovery

Build 145 persisted the selected receipt recovery audit search preset ID.

Build 146 validates that stored ID during application load. If it is unsupported:

- the selected view recovers to **All recovery events**;
- the safe preset ID is written back locally;
- the interface shows a recovery notice;
- stored recovery evidence remains unchanged.

Selecting a valid preset or manually changing age/search clears the notice.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side preset repair;
- no persistence of arbitrary manual search text;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 146 changes are browser-local view persistence, filtering, search, or safe recovery. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 146 verifier requires:

- dedicated recovery-audit repair search preset storage namespace;
- repair search preset sanitizer behavior;
- startup restoration and apply/clear wiring for persisted repair presets;
- manual repair age/search changes clearing persistence;
- renewal recovery audit search by audit ID, requested preset, recovered preset and reason;
- search composition with existing age filtering;
- receipt recovery audit preset recovery for unsupported saved IDs;
- repaired safe preset write-back and visible recovery notice;
- notice clearing on valid preset or manual custom view;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 145 verifier forward compatibility;
- Build 146 registration in the application test chain.

## Next roadmap item

**Build 147 — Recovery Audit Recovery Search Preset Recovery, Renewal Search Preset Recovery Audit Search Presets & Receipt Recovery Audit Search Preset Recovery Audit.**
