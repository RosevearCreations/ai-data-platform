# Build 134 — Favorite View Persistence, Recovery Snapshot Freshness & Import Reconciliation Receipt

## Objective

Extend Build 133's favorite quick filters, guarded recovery restore and import outcome reconciliation with browser-local view persistence, timestamp-aware recovery freshness and a durable latest-import reconciliation receipt.

## Functional scope

- persist the selected **All profiles** or **Favorites** view in the current browser;
- restore that favorite view after reload without changing named-profile order or favorite flags;
- clear the persisted favorite view during **All local navigation data** reset;
- timestamp new recovery snapshots at capture time;
- keep older pre-Build-134 recovery snapshots readable as legacy snapshots with unknown age;
- classify timestamped recovery snapshots as Fresh, Aging or Stale;
- surface stale-snapshot context before the existing two-step restore confirmation;
- create a reconciliation receipt after every completed selected bundle import;
- retain the latest receipt in browser-local storage;
- include source, conflict strategy, selected profile names, capacity plan and actual reconciliation outcome;
- allow receipt export as JSON;
- allow explicit receipt clearing;
- clear the receipt during full local navigation reset;
- add contextual help and responsive/forced-colors styling.

## Favorite view persistence

The favorite view persists in this browser using a dedicated browser-local key.

Only two values are accepted:

- `all`
- `favorites`

Any missing or invalid stored value resolves safely to `all`.

The persisted choice changes only which named profiles are visible. It does not:

- reorder profiles;
- change favorite flags;
- apply interface preferences;
- enter portable profile bundles;
- synchronize to an account or workspace.

The **All local navigation data** reset removes the persisted favorite view.

## Recovery snapshot freshness

New Build 134 recovery snapshots include a `capturedAt` timestamp.

Freshness is derived from that timestamp:

- **Fresh** — less than 24 hours old;
- **Aging** — at least 24 hours but less than seven days old;
- **Stale** — seven days old or older;
- **Legacy** — no reliable capture timestamp is present.

A legacy snapshot remains readable. Build 134 does not invalidate recovery snapshots produced by Build 131–133.

Freshness is advisory. A stale snapshot can still be restored, but the operator receives stale-snapshot context before the Build 133 two-step confirmation.

The recovery diff and explicit confirmation remain the authority for the local restore action.

## Import reconciliation receipt

After the existing bundle resolver completes, Build 134 creates one local reconciliation receipt for the latest completed import.

The receipt records:

- receipt ID;
- creation timestamp;
- imported source filename;
- Skip, Replace or Keep both strategy;
- selected incoming profile names;
- capacity forecast;
- actual reconciliation result;
- whether the actual result matched the forecast;
- any deviations.

The receipt format is versioned and strictly parsed before reuse.

Only the latest receipt is retained in this browser. Starting a new bundle preview may clear the transient on-screen outcome, but it does not erase the latest saved receipt.

The operator can:

- **Export receipt** as JSON;
- **Clear receipt** explicitly.

The full local reset also clears the saved receipt.

The receipt contains interface-profile import evidence only. It excludes navigation insights, account information, workspace data, business records, permissions and credentials.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side favorite-view storage;
- no server-side recovery freshness calculation;
- no server-side receipt storage;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

Favorite view persistence, freshness assessment and reconciliation receipts remain browser-local operator convenience and evidence state. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 134 verifier requires:

- strict favorite-view value sanitization;
- a dedicated favorite-view storage namespace;
- exact recovery capture timestamps;
- Fresh, Aging and Stale classifications at the defined age boundaries;
- backward-compatible parsing of legacy snapshots with unknown freshness;
- import receipt creation;
- import receipt serialization/parsing round trip;
- rejection of invalid receipts;
- dedicated receipt storage namespace;
- persisted-view read/write UI wiring;
- full-reset cleanup for view and receipt state;
- freshness labels and stale presentation;
- persisted latest-receipt UI;
- receipt export and clear actions;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 133 verifier forward compatibility;
- Build 134 registration in the test chain.

## Next roadmap item

**Build 135 — Favorite View Recovery, Snapshot Expiry Guidance & Import Receipt History.**
