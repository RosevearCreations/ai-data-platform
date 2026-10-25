# Build 139 — Recovery Audit Search Presets, Renewal Receipt History Filtering & Receipt Search Preset Persistence

## Objective

Extend Build 138 with quick recovery-audit search presets, view-only filtering of renewal-receipt history by prior snapshot freshness, and browser-local persistence of the active import receipt-search preset.

## Functional scope

- add recovery audit presets for All recoveries, Initial load, Filter selection, Last favorite removed and Favorites mentions;
- presets apply deterministic trigger-filter and audit-search combinations;
- manual trigger/search changes leave audit preset mode;
- audit presets remain temporary and are not persisted;
- filter renewal receipt history by previous freshness: All, Fresh, Aging, Stale, Expired or Legacy/unknown;
- preserve renewal receipt order and full-history export while filtering;
- show filtered-result counts and an empty state;
- persist the active import receipt-search preset ID in browser-local storage;
- restore the persisted preset's deterministic outcome, strategy and query values on reload;
- manually changing outcome, strategy or search clears persisted preset mode;
- full local-navigation reset clears the persisted receipt-search preset;
- persist only the preset ID, never arbitrary manual search text;
- add contextual help and responsive/forced-colors styling.

## Recovery audit search presets

Build 139 adds view-only quick presets on top of Build 138's audit trigger filter and search:

- **All recoveries** — All triggers, blank search;
- **Initial load** — Initial-load trigger, blank search;
- **Filter selection** — Filter-selection trigger, blank search;
- **Last favorite removed** — Last-favorite-removed trigger, blank search;
- **Favorites mentions** — All triggers, search for `favorites`.

Manual trigger or audit-search changes clear the active audit preset indicator.

Audit presets do not modify, delete, reorder or persist audit evidence.

## Renewal receipt history filtering

Build 139 filters the bounded Build 138 renewal history using the `previousFreshness` value already captured in each confirmed renewal receipt.

Available views:

- **All prior freshness**
- **Fresh**
- **Aging**
- **Stale**
- **Expired**
- **Legacy / unknown**

Filtering is view-only. It does not:

- delete or rewrite renewal receipts;
- change newest-first ordering;
- change the ten-entry cap;
- change the latest-renewal-receipt identity;
- affect complete renewal-history export.

## Receipt search preset persistence

Build 138 receipt-search presets were temporary. Build 139 remembers the active preset ID in a dedicated browser-local storage key.

On load:

- the persisted preset ID is sanitized;
- invalid or unsupported values safely fall back to **All receipts**;
- the preset's deterministic outcome, strategy and query values are restored.

Only the preset ID is stored.

Manual changes to:

- outcome filter;
- strategy filter;
- receipt search text

clear the persisted preset and return the operator to custom view state.

The full local-navigation reset clears the persisted preset key.

Persistence is browser-local only and is not account/workspace synchronization.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side audit preset state;
- no server-side renewal-history filtering;
- no server-side receipt-preset persistence;
- no persistence of arbitrary manual receipt search text;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Recovery audit presets and renewal receipt filtering are view-only. Receipt search preset persistence stores only a sanitized preset ID. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 139 verifier requires:

- deterministic recovery-audit preset mappings;
- each prior-freshness renewal filter;
- safe receipt-search preset-ID sanitization;
- dedicated preset storage namespace;
- persisted preset restoration on browser load;
- manual receipt filter/search changes clearing persisted preset mode;
- full-reset preset cleanup;
- audit preset exit on manual trigger/search changes;
- filtered renewal-history UI and empty state;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 138 verifier forward compatibility;
- Build 139 registration in the test chain.

## Next roadmap item

**Build 140 — Recovery Audit Preset Persistence, Renewal Receipt History Search & Receipt Preset Recovery.**
