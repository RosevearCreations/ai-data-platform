# Build 141 — Recovery Audit Preset Recovery, Renewal History Search Presets & Receipt Preset Recovery Audit

## Objective

Extend Build 140 with recovery-aware loading for persisted recovery-audit presets, quick search/filter presets for renewal receipt history and a bounded browser-local audit of actual receipt-search preset recovery events.

## Functional scope

- detect unsupported persisted recovery-audit preset IDs;
- recover unsupported audit preset state to All recoveries;
- write the repaired All recoveries preset ID back to browser-local storage;
- display a recovery notice explaining the audit-preset fallback;
- treat missing audit-preset state as the normal All recoveries default without a warning;
- applying a valid audit preset or manually changing audit trigger/search clears the recovery notice;
- add renewal-history search presets for All renewals, Expired prior, Stale prior, Legacy prior and Favorites count;
- presets apply deterministic freshness-filter and search combinations;
- manually changing renewal freshness or search exits preset mode;
- renewal-history presets remain temporary and are not persisted;
- record each actual invalid persisted receipt-search preset recovery in a browser-local audit;
- retain receipt-preset recovery audit newest-first and cap it at ten entries;
- deduplicate audit events by audit ID;
- retain requested preset ID, recovered preset ID, timestamp and recovery reason;
- export receipt-preset recovery audit as versioned JSON;
- clear receipt-preset recovery audit independently from receipt evidence;
- full local-navigation reset clears receipt-preset recovery audit;
- add contextual help and responsive/forced-colors styling.

## Recovery audit preset recovery

Build 140 persisted the selected recovery-audit preset.

Build 141 makes loading recovery-aware.

If browser storage contains an unsupported non-empty audit preset ID:

- it recovers to **All recoveries**;
- the All recoveries trigger/search values are applied;
- the repaired `all` preset ID is written back;
- a **Recovery audit preset recovered** notice explains the recovery.

Missing audit-preset state is not an error and defaults normally to All recoveries.

Recovery affects only local audit-view state and never changes recovery audit evidence.

## Renewal history search presets

Build 141 adds deterministic quick views over Build 140 freshness filtering and renewal-history search.

Presets are:

- **All renewals** — All prior freshness, blank search;
- **Expired prior** — Expired prior freshness, blank search;
- **Stale prior** — Stale prior freshness, blank search;
- **Legacy prior** — Unknown/legacy prior freshness, blank search;
- **Favorites count** — All prior freshness, search for `favorites`.

Manual freshness or search changes clear the active preset indicator.

Renewal-history presets are view-only, temporary and not persisted.

They do not:

- delete or rewrite renewal receipts;
- change newest-first ordering;
- change the ten-entry renewal-history cap;
- alter latest-receipt identity;
- affect complete renewal-history export.

## Receipt preset recovery audit

Build 140 made receipt-search preset loading recovery-aware.

Build 141 records each actual invalid persisted preset recovery as local evidence.

Each audit event contains:

- audit ID;
- creation time;
- requested unsupported preset ID;
- recovered preset ID;
- recovery reason.

The audit is:

- newest-first;
- capped at ten entries;
- deduplicated by audit ID;
- browser-local;
- exportable as versioned JSON;
- independently clearable.

Ordinary preset selections and manual receipt view changes are not audited.

Clearing recovery audit evidence never changes receipt history or the repaired receipt-search preset state.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side audit-preset recovery;
- no server-side renewal-history preset state;
- no server-side receipt-preset recovery audit;
- no persistence of arbitrary manual search text;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Recovery audit preset recovery and renewal search presets are view-only browser-local behavior. Receipt preset recovery audit is local evidence only. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 141 verifier requires:

- valid, invalid and missing recovery-audit preset recovery cases;
- repaired All recoveries reason;
- deterministic renewal-history preset mappings;
- ten-entry newest-first receipt-preset recovery audit cap;
- audit ID deduplication;
- versioned recovery-audit serialization/parsing;
- dedicated recovery-audit storage namespace;
- audit-preset recovery notice and repaired storage wiring;
- manual audit changes clearing recovery notice/persisted preset mode;
- renewal preset UI and manual preset exit;
- receipt-preset recovery audit creation, export, clear and full-reset cleanup;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 140 verifier forward compatibility;
- Build 141 registration in the test chain.

## Next roadmap item

**Build 142 — Recovery Audit Recovery Audit, Renewal Search Preset Persistence & Receipt Recovery Audit Filtering.**
