# Build 145 — Recovery Audit Recovery Search Presets, Renewal Search Preset Recovery Audit Filtering & Receipt Recovery Audit Search Preset Persistence

## Objective

Extend Build 144 with deterministic quick views for the recovery-audit preset repair ledger, age filtering for renewal-history search preset recovery evidence, and browser-local persistence of the selected receipt-recovery audit search preset.

## Functional scope

- add recovery audit recovery search presets for All preset recoveries, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- compose those presets from the existing repair-ledger age filter and case-insensitive search;
- manually changing repair-ledger age or search exits preset mode;
- keep repair search presets temporary and view-only;
- add All, 24-hour and 7-day age filtering to the renewal search preset recovery audit;
- preserve newest-first renewal recovery evidence and the existing ten-entry cap;
- keep complete renewal recovery audit export independent from the filtered view;
- persist the selected receipt recovery audit search preset ID in a dedicated browser-local namespace;
- restore the saved receipt recovery preset on application load;
- persist only a sanitized known preset ID, never arbitrary manual search text;
- manually changing receipt-recovery age or search clears the saved preset and enters a temporary custom view;
- clearing the receipt recovery audit clears the saved search preset;
- full local reset clears the saved receipt-recovery audit preset;
- add contextual help and responsive/forced-colors styling.

## Recovery audit recovery search presets

Build 144 added text search to the recovery-audit preset repair ledger. Build 145 adds five deterministic quick views:

- **All preset recoveries** — all ages, blank search;
- **Recent 24 hours** — 24-hour age window, blank search;
- **Recent 7 days** — seven-day age window, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

The preset selection is view-only and temporary. Manual age/search changes leave preset mode.

## Renewal search preset recovery audit filtering

The renewal search preset recovery audit remains browser-local, newest-first, deduplicated and capped at ten retained events.

Build 145 adds temporary age filtering:

- all retained recovery events;
- last 24 hours;
- last 7 days.

Filtering does not rewrite, delete, reorder or truncate retained evidence. Export continues to use the complete retained audit.

## Receipt recovery audit search preset persistence

Build 144 introduced receipt recovery audit search presets. Build 145 persists the selected preset ID locally so the same quick view can be restored after reload.

Persistence rules:

- only a known sanitized preset ID is stored;
- arbitrary manual query text is not persisted;
- manual age or search changes clear the saved preset;
- clearing the receipt recovery audit clears the saved preset;
- full local reset removes the preset storage key;
- an unsupported stored value sanitizes to **All recovery events**.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery preset state;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 145 changes are browser-local view controls or evidence filtering. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 145 verifier requires:

- deterministic recovery-audit repair search preset mappings;
- manual repair age/search changes exiting preset mode;
- renewal recovery audit 24-hour and seven-day filtering;
- preservation of audit order while filtering;
- dedicated receipt-recovery search preset storage namespace;
- sanitizer fallback for unsupported persisted preset IDs;
- application startup restoration of the persisted receipt-recovery preset;
- manual receipt age/search changes clearing persisted preset state;
- audit clear and full-reset cleanup;
- contextual help coverage;
- responsive and forced-colors-compatible styling;
- Build 144 verifier forward compatibility;
- Build 145 registration in the application test chain.

## Next roadmap item

**Build 146 — Recovery Audit Recovery Search Preset Persistence, Renewal Search Preset Recovery Audit Search & Receipt Recovery Audit Search Preset Recovery.**
