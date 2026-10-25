# Build 137 — Recovery Audit Filtering, Snapshot Renewal Receipt & Receipt History Search

## Objective

Extend Build 136's recovery audit, confirmed snapshot renewal and receipt-history filters with trigger-based recovery-audit filtering, a versioned local receipt for confirmed recovery-point renewal and text search across the bounded import reconciliation receipt history.

## Functional scope

- filter the favorite-view recovery audit by recovery trigger;
- preserve the underlying twelve-entry audit order and contents while filtering;
- keep audit filtering temporary and view-only;
- create a renewal receipt only after the two-step renewal workflow is confirmed;
- record previous snapshot capture time, renewed capture time and prior freshness;
- record profile and favorite counts for the renewed recovery point;
- retain only the latest renewal receipt in the current browser;
- export the renewal receipt as versioned JSON;
- clear the renewal receipt without clearing the recovery snapshot;
- search import receipt history by receipt ID;
- search by source filename;
- search by selected profile names;
- search by Skip, Replace or Keep both strategy;
- search by matched/deviated outcome text;
- search by deviation text;
- compose receipt search with the existing outcome and strategy filters;
- keep search temporary, case-insensitive and view-only;
- preserve full-history export regardless of current filters/search;
- add contextual help and responsive/forced-colors styling.

## Recovery audit filtering

The Build 136 recovery audit remains the source of truth.

Build 137 adds these view options:

- **All recovery triggers**
- **Initial load**
- **Filter selection**
- **Last favorite removed**

Filtering does not:

- delete audit events;
- reorder audit events;
- rewrite timestamps or reasons;
- change the twelve-entry audit cap;
- change audit export contents.

Audit export continues to export the complete stored audit.

## Snapshot renewal receipt

A renewal receipt is created only when the operator completes the Build 136 two-step renewal workflow.

Ordinary **Save snapshot** operations do not create a renewal receipt.

The receipt records:

- receipt ID;
- receipt creation time;
- previous recovery snapshot capture time;
- renewed recovery snapshot capture time;
- freshness state of the previous snapshot;
- named-profile count in the renewed snapshot;
- favorite count in the renewed snapshot.

Only the latest renewal receipt is retained in this browser.

The operator can:

- export the latest renewal receipt as JSON;
- clear the renewal receipt independently.

Clearing the renewal receipt does not clear or roll back the renewed recovery snapshot.

The full local-navigation reset clears both the renewal receipt and recovery snapshot.

## Receipt history search

Build 137 adds case-insensitive text search after the Build 136 outcome/strategy filtering stage.

Search can match:

- receipt ID;
- source filename;
- selected profile names;
- strategy;
- matched/deviated outcome;
- deviation text.

Search composes with:

- All outcomes / Matched / Deviated;
- All strategies / Skip / Replace / Keep both.

Search is view-only.

It does not:

- change receipt order;
- alter latest-receipt identity;
- delete or rewrite receipts;
- change the ten-entry cap;
- affect complete-history export.

If nothing matches the active filters and search, the UI reports an empty result.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side audit filtering;
- no automatic snapshot renewal;
- no server-side renewal receipt storage;
- no server-side receipt-history search;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Audit filtering and receipt-history search are view-only. The renewal receipt is browser-local evidence created only after explicit confirmed renewal. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 137 verifier requires:

- filtering each recovery-audit trigger while preserving order;
- versioned renewal-receipt creation and round trip;
- invalid renewal-receipt rejection;
- dedicated renewal-receipt storage namespace;
- previous and renewed capture-time evidence;
- profile and favorite counts;
- search by source;
- search by selected profile;
- search by strategy;
- search by outcome;
- search by deviation text;
- no-match search result;
- browser-local renewal receipt load/write/clear wiring;
- full-reset renewal-receipt cleanup;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 136 verifier forward compatibility;
- Build 137 registration in the test chain.

## Next roadmap item

**Build 138 — Recovery Audit Search, Renewal Receipt History & Receipt Search Presets.**
