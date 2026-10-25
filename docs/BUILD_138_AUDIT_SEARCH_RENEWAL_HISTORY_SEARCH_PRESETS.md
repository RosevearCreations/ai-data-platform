# Build 138 — Recovery Audit Search, Renewal Receipt History & Receipt Search Presets

## Objective

Extend Build 137's recovery-audit filtering, latest snapshot-renewal receipt and receipt-history search with text search across recovery-audit evidence, a bounded history of confirmed renewal receipts and deterministic receipt-search presets for common operator views.

## Functional scope

- search the favorite-view recovery audit by audit ID, trigger, requested/resolved filter and reason;
- compose recovery-audit search with the existing trigger filter;
- preserve the underlying twelve-entry recovery audit while searching;
- keep recovery-audit search temporary, case-insensitive and view-only;
- retain up to ten confirmed snapshot-renewal receipts;
- keep renewal receipts newest-first and deduplicated by receipt ID;
- migrate the Build 137 latest renewal receipt into history when no history exists yet;
- preserve the existing latest-renewal-receipt display/export behavior;
- clearing the latest renewal receipt advances the prior history receipt to latest;
- export complete renewal-receipt history as versioned JSON;
- clear renewal history and latest renewal receipt together;
- add receipt-search presets for All receipts, Deviations, Replacements, Keep both and Capacity;
- presets apply deterministic outcome/strategy/search combinations;
- manually changing outcome, strategy or search exits the active preset state;
- presets remain temporary view state and never rewrite receipt evidence;
- add contextual help and responsive/forced-colors styling.

## Recovery audit search

Build 138 adds case-insensitive text search after Build 137 trigger filtering.

Search can match:

- audit ID;
- recovery trigger;
- requested filter;
- resolved filter;
- recovery reason.

Search and trigger filtering compose while preserving the stored audit order.

Search is view-only. It does not:

- delete audit events;
- reorder audit events;
- rewrite reasons or timestamps;
- alter the twelve-entry cap;
- change complete audit export.

## Renewal receipt history

Build 137 retained only the latest confirmed snapshot-renewal receipt.

Build 138 introduces a versioned browser-local renewal-receipt history:

- newest-first;
- capped at ten receipts;
- deduplicated by receipt ID;
- strictly parsed using the existing Build 137 renewal-receipt parser.

If no history exists but the Build 137 latest receipt is present, that receipt is migrated into history on load.

Every newly confirmed renewal:

- remains the latest receipt;
- is prepended to history;
- preserves prior renewal receipts until the ten-entry cap is reached.

The operator can:

- export the latest renewal receipt;
- clear the latest receipt, advancing the previous history receipt to latest;
- export the complete renewal history;
- clear the complete renewal history.

Clearing receipt history never clears or rolls back the actual recovery snapshot.

## Receipt search presets

Build 138 adds deterministic quick presets over the existing receipt-history filters and search.

Presets are:

- **All receipts** — All outcomes, All strategies, blank search;
- **Deviations** — Deviated outcome, All strategies, blank search;
- **Replacements** — All outcomes, Replace strategy, blank search;
- **Keep both** — All outcomes, Keep both strategy, blank search;
- **Capacity** — All outcomes, All strategies, search for `capacity`.

A preset changes only the current view.

Manual changes to outcome, strategy or text search clear the active preset indicator but do not alter stored evidence.

Presets are not persisted or synchronized.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery-audit search;
- no server-side renewal-receipt history;
- no server-side receipt-search presets;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Recovery audit search and receipt search presets are view-only. Renewal receipt history is browser-local evidence created only from confirmed renewal receipts. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 138 verifier requires:

- recovery-audit search across IDs, triggers, filters and reasons;
- no-match audit search behavior;
- ten-entry newest-first renewal history;
- renewal receipt ID deduplication;
- versioned renewal-history round trip;
- dedicated renewal-history storage namespace;
- migration from Build 137 latest receipt into history;
- latest-receipt advancement when latest is cleared;
- complete history export/clear actions;
- deterministic All, Deviations, Replacements, Keep both and Capacity presets;
- manual filter/search changes clearing active preset state;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 137 verifier forward compatibility;
- Build 138 registration in the test chain.

## Next roadmap item

**Build 139 — Recovery Audit Search Presets, Renewal Receipt History Filtering & Receipt Search Preset Persistence.**
