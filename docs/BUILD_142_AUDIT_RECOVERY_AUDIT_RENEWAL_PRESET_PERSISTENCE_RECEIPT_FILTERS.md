# Build 142 — Recovery Audit Recovery Audit, Renewal Search Preset Persistence & Receipt Recovery Audit Filtering

## Objective

Extend Build 141 with a bounded evidence ledger for recovery-audit preset repairs, browser-local persistence of the selected renewal-history search preset and view-only age filtering for receipt-preset recovery audit evidence.

## Functional scope

- record each actual invalid persisted recovery-audit preset repair in a browser-local recovery audit;
- retain recovery-audit recovery events newest-first and cap them at ten entries;
- deduplicate recovery-audit recovery events by audit ID;
- retain requested preset ID, recovered preset ID, timestamp and recovery reason;
- export recovery-audit recovery evidence as versioned JSON;
- clear recovery-audit recovery evidence independently from the favorite-view recovery audit;
- persist the selected renewal-history search preset ID;
- restore the persisted renewal preset's deterministic freshness-filter and query values on browser load;
- manually changing renewal freshness or search exits preset mode and clears the persisted renewal preset choice;
- clearing renewal history clears its persisted search preset;
- full local-navigation reset clears the persisted renewal preset;
- persist only the renewal preset ID, never arbitrary manual renewal search text;
- filter receipt-preset recovery audit by All recovery events, Last 24 hours or Last 7 days;
- preserve receipt-recovery audit order and complete export while filtering;
- show filtered-result counts and an empty state;
- clearing receipt-preset recovery audit resets its age filter;
- add contextual help and responsive/forced-colors styling.

## Recovery audit recovery audit

Build 141 made persisted recovery-audit presets recovery-aware.

Build 142 records each actual unsupported saved audit-preset repair as local evidence.

Each recovery event contains:

- audit ID;
- creation time;
- requested unsupported audit preset ID;
- recovered preset ID;
- recovery reason.

The recovery audit is:

- newest-first;
- capped at ten entries;
- deduplicated by audit ID;
- browser-local;
- exportable as versioned JSON;
- independently clearable.

Ordinary audit preset selections and manual audit-view changes are not recorded.

Clearing this evidence does not change the repaired audit preset, the favorite-view recovery audit or any workflow state.

## Renewal search preset persistence

Build 141 introduced renewal-history search presets as temporary view state.

Build 142 stores the active preset ID in a dedicated browser-local key.

On browser load:

- the stored ID is sanitized;
- unsupported values safely fall back to **All renewals**;
- the preset's deterministic prior-freshness filter and search query are restored.

Only the preset ID is stored.

Manual changes to:

- previous-freshness filter;
- renewal-history search text

clear the persisted preset and leave preset mode.

Clearing renewal history or performing the full local-navigation reset also clears renewal-preset persistence.

Arbitrary manual renewal-history search text is never persisted.

## Receipt recovery audit filtering

Build 142 adds age-based view filters to the bounded receipt-preset recovery audit:

- **All recovery events**
- **Last 24 hours**
- **Last 7 days**

Filtering uses each audit event's creation time.

Filtering is view-only. It does not:

- delete or rewrite audit events;
- change newest-first ordering;
- change the ten-entry cap;
- alter timestamps, requested IDs or reasons;
- affect complete recovery-audit export.

The selected age filter is temporary and is not persisted.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery-audit recovery ledger;
- no server-side renewal-search preset persistence;
- no server-side receipt-recovery audit filtering;
- no persistence of arbitrary manual search text;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Recovery audit recovery evidence is browser-local metadata only. Renewal preset persistence stores only a sanitized preset ID. Receipt recovery audit filtering is view-only. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 142 verifier requires:

- ten-entry newest-first recovery-audit recovery ledger;
- recovery-ledger audit-ID deduplication;
- versioned recovery-ledger serialization/parsing;
- dedicated recovery-ledger storage namespace;
- renewal-history preset ID sanitization and dedicated storage namespace;
- persisted renewal-preset restoration;
- manual renewal controls clearing persisted preset mode;
- clearing renewal history clearing persisted preset state;
- full-reset cleanup for both new storage keys;
- receipt-recovery audit All / 24-hour / seven-day age filtering;
- filter order preservation and empty-state UI;
- complete audit export remaining unfiltered;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 141 verifier forward compatibility;
- Build 142 registration in the test chain.

## Next roadmap item

**Build 143 — Recovery Audit Recovery Filtering, Renewal Search Preset Recovery & Receipt Recovery Audit Search.**
