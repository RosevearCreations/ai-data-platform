# Build 140 — Recovery Audit Preset Persistence, Renewal Receipt History Search & Receipt Preset Recovery

## Objective

Extend Build 139 with browser-local persistence of the selected recovery-audit preset, temporary search across renewal receipt history and explicit self-recovery for unsupported persisted import receipt-search preset IDs.

## Functional scope

- persist the selected recovery-audit preset ID in a dedicated browser-local key;
- restore the audit preset's deterministic trigger and search values on browser load;
- manually changing audit trigger/search exits preset mode and clears persisted audit preset state;
- full local-navigation reset clears the persisted audit preset;
- persist only the audit preset ID, never arbitrary manual audit search text;
- search renewal receipt history by receipt ID, prior freshness, legacy/unknown wording, profile count and favorite count;
- compose renewal-history search with the Build 139 prior-freshness filter;
- preserve renewal receipt order and complete-history export while searching;
- show combined filter/search result counts and an empty state;
- detect unsupported persisted receipt-search preset IDs;
- recover unsupported receipt preset state to All receipts;
- write the repaired All receipts preset ID back to browser-local storage;
- display a recovery notice explaining the fallback;
- treat missing receipt-preset state as the normal All receipts default without a recovery warning;
- applying a valid preset or manually changing receipt view controls clears the recovery notice;
- add contextual help and responsive/forced-colors styling.

## Recovery audit preset persistence

Build 139 introduced recovery-audit search presets as temporary view state.

Build 140 stores the selected audit preset ID in browser-local storage.

On load:

- the stored ID is sanitized;
- unsupported IDs fall back safely to **All recoveries**;
- the corresponding trigger filter and query are restored.

Manual changes to:

- recovery trigger;
- recovery audit search text

clear the persisted audit preset and leave preset mode.

Only the preset ID is persisted. Arbitrary manual audit search text is never stored.

## Renewal receipt history search

Build 140 adds case-insensitive text search after Build 139 prior-freshness filtering.

Search can match:

- renewal receipt ID;
- previous freshness state;
- **legacy / unknown** wording for unknown freshness;
- profile count;
- favorite count.

Search composes with the freshness filter while preserving the existing newest-first history order.

Search is view-only. It does not:

- delete or rewrite receipts;
- change the ten-entry cap;
- change latest-receipt identity;
- affect complete renewal-history export.

## Receipt preset recovery

Build 139 persisted the active import receipt-search preset ID.

Build 140 makes persisted preset loading recovery-aware.

If the browser contains an unsupported non-empty preset ID:

- it is recovered to **All receipts**;
- the deterministic All receipts values are applied;
- the repaired `all` preset ID is written back;
- a **Receipt preset recovered** notice explains the recovery.

Missing preset state is not considered corruption and defaults normally to All receipts.

Recovery changes only local view state and never receipt evidence.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side audit-preset persistence;
- no server-side renewal-history search;
- no server-side receipt-preset recovery;
- no persistence of arbitrary manual search text;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Recovery audit preset persistence stores only a sanitized preset ID. Renewal receipt history search and receipt preset recovery are view-only/browser-local operations. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 140 verifier requires:

- recovery-audit preset ID sanitization and dedicated storage namespace;
- audit preset restoration wiring;
- manual audit changes clearing persisted preset state;
- full-reset audit-preset cleanup;
- renewal-history search by receipt ID;
- renewal-history search by freshness;
- legacy/unknown search;
- profile/favorite-count search;
- receipt preset recovery for unsupported stored IDs;
- no recovery warning for missing preset state;
- repaired preset persistence;
- visible recovery notice;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 139 verifier forward compatibility;
- Build 140 registration in the test chain.

## Next roadmap item

**Build 141 — Recovery Audit Preset Recovery, Renewal History Search Presets & Receipt Preset Recovery Audit.**
