# Build 135 — Favorite View Recovery, Snapshot Expiry Guidance & Import Receipt History

## Objective

Extend Build 134's persisted favorite view, recovery freshness and latest import receipt with automatic favorite-view recovery, a clear 30-day recovery-snapshot guidance window and a bounded browser-local history of recent import reconciliation receipts.

## Functional scope

- recover a persisted Favorites-only view to All profiles when no favorite profiles remain;
- apply the same recovery when the last favorite is removed while Favorites is active;
- persist the recovered All profiles state so reload does not return to an unusable empty view;
- keep favorite view recovery separate from profile ordering and preference values;
- extend recovery freshness with an **Expired guidance window** state at 30 days or older;
- keep expired snapshots readable and restorable behind the existing recovery diff and two-step confirmation;
- recommend capturing a newer recovery point rather than deleting the older one;
- retain up to ten recent import reconciliation receipts;
- keep history newest-first and deduplicate receipt IDs;
- migrate the existing Build 134 latest receipt into history when no history exists yet;
- export the full bounded receipt history as versioned JSON;
- clear the full receipt history and latest receipt together;
- preserve the existing latest-receipt display and export behavior;
- add contextual help and responsive/forced-colors styling.

## Favorite view recovery

Build 134 persists the All profiles or Favorites view. Build 135 makes that persisted choice self-healing.

When Favorites is requested but no named profile is currently marked favorite, the application resolves the view to All profiles and records a recovery notice.

This recovery runs:

- during initial browser-state load;
- when the operator explicitly selects Favorites with no favorites available;
- when the last favorite is removed while Favorites is active.

The recovered All profiles state is written back to the dedicated favorite-view key.

Favorite view recovery changes only the filter. It does not:

- add or remove favorites;
- reorder profiles;
- apply interface preferences;
- modify provenance;
- alter roles, permissions or workflow state.

## Snapshot expiry guidance

Build 135 extends the Build 134 freshness model:

- **Fresh** — less than 24 hours old;
- **Aging** — at least 24 hours but less than seven days old;
- **Stale** — at least seven days but less than 30 days old;
- **Expired guidance window** — 30 days old or older;
- **Legacy** — capture time is unavailable.

The 30-day boundary is guidance, not deletion.

An expired-guidance snapshot remains:

- readable;
- visible in the recovery diff;
- available for the Build 133 two-step restore confirmation.

The interface recommends capturing a newer recovery point before restore when practical. It never silently deletes or blocks the older local snapshot.

## Import receipt history

Build 135 introduces a versioned browser-local receipt-history format and dedicated storage namespace.

History is:

- newest-first;
- capped at ten receipts;
- deduplicated by receipt ID;
- strictly parsed through the existing individual receipt parser.

Each history entry preserves the Build 134 receipt evidence:

- receipt ID;
- creation time;
- source filename;
- conflict strategy;
- selected incoming profile names;
- capacity forecast;
- actual reconciliation outcome;
- matched/deviated status;
- deviations.

If no history exists but the Build 134 latest receipt is present, that receipt is migrated into history automatically on load.

After every completed named-bundle import, the new receipt is prepended and the oldest entry falls off when the ten-receipt limit is exceeded.

The operator can:

- export the latest receipt;
- clear the latest receipt, which advances the previous history entry to latest;
- export the full receipt history;
- clear the complete receipt history.

Full local navigation reset also clears receipt history.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side favorite-view recovery;
- no forced snapshot expiry or deletion;
- no server-side receipt-history storage;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Favorite view recovery, snapshot expiry guidance and receipt history remain browser-local operator convenience and evidence state. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 135 verifier requires:

- Favorites-to-All recovery when no favorites remain;
- no recovery when Favorites still has visible entries;
- 29-day stale and 30-day expired-guidance boundary behavior;
- ten-entry newest-first receipt-history cap;
- receipt-ID deduplication;
- versioned receipt-history round trip;
- dedicated receipt-history storage namespace;
- persisted-view recovery wiring;
- last-favorite recovery wiring;
- expired-guidance UI and restore messaging;
- Build 134 latest-receipt migration into history;
- history export and clear actions;
- full-reset history cleanup;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 134 verifier forward compatibility;
- Build 135 registration in the test chain.

## Next roadmap item

**Build 136 — Favorite View Recovery Audit, Recovery Snapshot Renewal Workflow & Receipt History Filtering.**
