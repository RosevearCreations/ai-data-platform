# Build 143 — Recovery Audit Recovery Filtering, Renewal Search Preset Recovery & Receipt Recovery Audit Search

## Objective

Extend Build 142 with view-only age filtering for recovery-audit preset repair evidence, recovery-aware loading for persisted renewal-history search presets and case-insensitive search across receipt-preset recovery audit evidence.

## Functional scope

- filter the recovery-audit preset repair ledger by All audit recoveries, Last 24 hours or Last 7 days;
- preserve recovery-ledger order and complete export while filtering;
- show filtered-result counts and an empty state;
- clearing the recovery-audit repair ledger resets its age filter;
- detect unsupported persisted renewal-history search preset IDs;
- recover unsupported renewal preset state to All renewals;
- write the repaired All renewals preset ID back to browser-local storage;
- display a recovery notice explaining the renewal-preset fallback;
- treat missing renewal-preset state as the normal All renewals default without a warning;
- applying a valid renewal preset or manually changing freshness/search clears the recovery notice;
- search receipt-preset recovery audit by audit ID, requested preset ID, recovered preset ID and reason;
- compose receipt recovery audit search with the Build 142 age filter;
- preserve recovery-audit order and complete export while searching;
- clearing receipt-preset recovery audit clears its temporary search and age filter;
- correct receipt-preset recovery audit independent clear so it removes only its own evidence;
- add contextual help and responsive/forced-colors styling.

## Recovery audit recovery filtering

Build 142 introduced a bounded recovery-audit preset repair ledger.

Build 143 adds temporary age views:

- **All audit recoveries**
- **Last 24 hours**
- **Last 7 days**

Filtering uses each repair event's creation time.

Filtering is view-only. It does not:

- delete or rewrite repair events;
- change newest-first ordering;
- change the ten-entry cap;
- alter requested IDs, recovered IDs, reasons or timestamps;
- affect complete recovery-ledger export.

The selected filter is temporary and is not persisted.

## Renewal search preset recovery

Build 142 persisted the selected renewal-history search preset.

Build 143 makes loading recovery-aware.

If browser storage contains an unsupported non-empty renewal preset ID:

- it recovers to **All renewals**;
- the All renewals freshness/search values are applied;
- the repaired `all` preset ID is written back;
- a **Renewal history preset recovered** notice explains the recovery.

Missing renewal-preset state is not an error and defaults normally to All renewals.

Applying a valid renewal preset or manually changing the prior-freshness filter or renewal-history search clears the recovery notice.

Recovery changes only local view state and never renewal receipt evidence.

## Receipt recovery audit search

Build 143 adds case-insensitive search after Build 142 receipt-recovery age filtering.

Search can match:

- recovery audit ID;
- requested unsupported preset ID;
- recovered preset ID;
- recovery reason.

Search is view-only and preserves the filtered audit order.

It does not:

- delete or rewrite recovery events;
- change the ten-entry cap;
- change timestamps or recovery reasons;
- affect complete recovery-audit export.

The search query is temporary and is not persisted.

## Independent clear correction

The receipt-preset recovery audit clear action is explicitly scoped to:

- remove the receipt-preset recovery audit storage key;
- clear receipt-preset recovery audit state;
- reset its age filter and search.

It does **not** clear:

- recovery-audit preset repair evidence;
- persisted renewal-history search preset state;
- receipt history;
- renewal receipt history.

This restores the independent clear boundary documented by Build 141 and Build 142.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery-audit filtering;
- no server-side renewal-preset recovery;
- no server-side receipt-recovery audit search;
- no persistence of arbitrary manual search text;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Recovery-audit filtering and receipt-recovery audit search are view-only. Renewal preset recovery changes only a sanitized browser-local preset ID. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 143 verifier requires:

- recovery-audit repair All / 24-hour / seven-day filtering;
- filter order preservation;
- valid, invalid and missing renewal-preset recovery cases;
- repaired All renewals recovery reason;
- receipt-recovery audit search by audit ID;
- requested-preset search;
- recovered-preset search;
- reason search;
- no-match search;
- combined age-filter/search UI;
- renewal recovery notice and repaired persistence wiring;
- manual renewal controls clearing recovery notice and persisted preset mode;
- receipt-preset recovery independent clear staying scoped to its own evidence;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 142 verifier forward compatibility;
- Build 143 registration in the test chain.

## Next roadmap item

**Build 144 — Recovery Audit Recovery Search, Renewal Search Preset Recovery Audit & Receipt Recovery Audit Search Presets.**
