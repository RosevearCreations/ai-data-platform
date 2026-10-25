# Build 144 — Recovery Audit Recovery Search, Renewal Search Preset Recovery Audit & Receipt Recovery Audit Search Presets

## Objective

Extend Build 143 with case-insensitive search across recovery-audit preset repair evidence, a bounded browser-local audit of actual renewal-history search preset recoveries and deterministic quick presets for receipt-preset recovery audit search views.

## Functional scope

- search the recovery-audit preset repair ledger by audit ID, requested preset ID, recovered preset ID and reason;
- compose recovery-audit repair search with Build 143 age filtering;
- preserve repair-ledger order and complete export while searching;
- clearing the repair ledger clears its temporary search and age filter;
- record each actual invalid persisted renewal-history search preset repair in a browser-local audit;
- retain renewal-preset recovery audit newest-first and cap it at ten entries;
- deduplicate renewal-preset recovery events by audit ID;
- retain requested preset ID, recovered preset ID, timestamp and recovery reason;
- export renewal-preset recovery audit as versioned JSON;
- clear renewal-preset recovery audit independently from renewal receipt history and persisted preset state;
- full local-navigation reset clears the renewal-preset recovery audit;
- add receipt-recovery audit search presets for All recovery events, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- presets apply deterministic age-filter and search combinations;
- manually changing receipt-recovery age or search exits preset mode;
- receipt-recovery search presets remain temporary and are not persisted;
- add contextual help and responsive/forced-colors styling.

## Recovery audit recovery search

Build 143 added age filtering to the bounded recovery-audit preset repair ledger.

Build 144 adds case-insensitive text search after that age filter.

Search can match:

- audit ID;
- requested unsupported preset ID;
- recovered preset ID;
- recovery reason.

Search is view-only. It does not:

- delete or rewrite repair events;
- change newest-first ordering;
- change the ten-entry cap;
- alter timestamps or reasons;
- affect complete repair-ledger export.

The search query is temporary and is not persisted.

## Renewal search preset recovery audit

Build 143 made persisted renewal-history search preset loading recovery-aware.

Build 144 records each actual invalid saved-preset recovery as local evidence.

Each audit event contains:

- audit ID;
- creation time;
- requested unsupported renewal preset ID;
- recovered preset ID;
- recovery reason.

The renewal-preset recovery audit is:

- newest-first;
- capped at ten entries;
- deduplicated by audit ID;
- browser-local;
- exportable as versioned JSON;
- independently clearable.

Ordinary renewal preset selections and manual renewal-history view changes are not audited.

Clearing this audit does not change renewal receipt history or the repaired renewal preset state.

## Receipt recovery audit search presets

Build 143 added age filtering and text search to receipt-preset recovery audit evidence.

Build 144 adds deterministic quick presets:

- **All recovery events** — all ages, blank search;
- **Recent 24 hours** — last 24 hours, blank search;
- **Recent 7 days** — last 7 days, blank search;
- **Recovered to All** — all ages, search for `all`;
- **Recovery reasons** — all ages, search for `recovered`.

Manual changes to age or search clear the active preset indicator.

Receipt-recovery audit search presets are view-only, temporary and not persisted.

They do not change stored recovery evidence or complete audit export.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery-audit repair search;
- no server-side renewal-preset recovery audit;
- no server-side receipt-recovery search presets;
- no persistence of arbitrary manual search text;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Recovery-audit search and receipt-recovery search presets are view-only. Renewal-preset recovery audit is browser-local evidence only. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 144 verifier requires:

- recovery-audit repair search by audit ID;
- requested-preset search;
- recovered-preset search;
- reason search;
- no-match search;
- ten-entry newest-first renewal-preset recovery audit;
- renewal-preset recovery audit ID deduplication;
- versioned renewal-recovery audit serialization/parsing;
- dedicated renewal-recovery audit storage namespace;
- renewal-recovery audit creation, export, clear and full-reset cleanup;
- deterministic receipt-recovery audit search preset mappings;
- manual receipt-recovery age/search changes clearing active preset mode;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 143 verifier forward compatibility;
- Build 144 registration in the test chain.

## Next roadmap item

**Build 145 — Recovery Audit Recovery Search Presets, Renewal Search Preset Recovery Audit Filtering & Receipt Recovery Audit Search Preset Persistence.**
