# Build 133 — Favorite Quick Filters, Recovery Restore Confirmation & Import Plan Outcome Reconciliation

## Objective

Extend Build 132's browser-local profile favorites, recovery diff and import capacity forecast with fast favorite-only views, an explicit two-step recovery restore boundary and planned-versus-actual reconciliation after each selected bundle import.

## Functional scope

- add **All profiles** and **Favorites** quick filters;
- preserve the explicit Build 131 named-profile order inside either view;
- keep the quick filter as temporary browser view state;
- keep the selected profile aligned with the currently visible favorite subset;
- require a two-step confirmation before a recovery snapshot can replace current local state;
- provide a cancel path for an armed recovery restore;
- automatically disarm recovery confirmation when relevant local preference/profile state changes;
- capture the active capacity plan immediately before selected bundle import;
- compare planned additions, replacements, conflict skips, capacity skips and final count with the actual resolver result;
- display a completed import outcome reconciliation;
- explicitly list any plan deviations;
- add contextual help and responsive/forced-colors styling.

## Favorite quick filters

Build 133 adds two view controls:

- **All profiles** — every named profile in its explicit saved order;
- **Favorites** — only profiles with the browser-local favorite marker.

Filtering does not reorder, rename, apply or modify a profile.

The quick filter itself is not persisted, exported or synchronized. It is temporary interface state.

When Favorites is active and the selected profile is unfavorited, selection moves to the next visible favorite when one exists; otherwise the filtered selection becomes empty.

## Recovery restore confirmation

Build 132 already provides a read-only recovery diff. Build 133 makes restore deliberately two-stage.

First action:

**Review & confirm restore**

This arms the restore but does not write any preferences, named profiles, favorites or ordering state.

Second action:

**Confirm restore**

Only this action applies the saved snapshot.

The operator can instead choose **Cancel confirmation**, which changes no local preference state.

Recovery confirmation is automatically disarmed when:

- a new recovery snapshot is saved;
- the recovery snapshot is cleared;
- local named-profile state changes;
- current interface preferences change;
- all local navigation data is reset.

This prevents a previously armed confirmation from silently applying after the reviewed state has changed.

## Import plan outcome reconciliation

Before selected bundle import runs, Build 133 uses the current Build 132 capacity plan as the forecast.

After the existing resolver completes, Build 133 reconciles:

- projected additions vs actual additions;
- projected replacements vs actual replacements;
- projected conflict skips vs actual conflict skips;
- projected capacity skips vs actual capacity skips;
- projected final profile count vs actual final profile count.

When all values match, the interface explicitly reports that the import outcome matched the capacity plan.

When any value differs, the interface lists every planned-versus-actual deviation.

Reconciliation reports the completed resolver result. It does not rewrite or replay the import.

Starting a new bundle staging flow clears the previous reconciliation so an old result is not presented as evidence for a new plan.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side quick-filter state;
- no server-side recovery confirmation;
- no server-side import reconciliation storage;
- no account/workspace synchronization;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All filtering, restore confirmation and import reconciliation remain browser-local presentation/navigation convenience state. Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 133 verifier requires:

- All/Favorites filtering while preserving explicit order;
- accessible pressed state for quick-filter controls;
- selected-profile handling for favorite-only views;
- two-step recovery restore confirmation;
- cancel confirmation path;
- confirmation disarm on local state change;
- exact plan/outcome reconciliation for a matching resolver result;
- explicit deviation reporting for a mismatched result;
- completed reconciliation UI;
- prior reconciliation clearing on a new staged bundle;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 132 verifier forward compatibility;
- Build 133 registration in the test chain.

## Next roadmap item

**Build 134 — Favorite View Persistence, Recovery Snapshot Freshness & Import Reconciliation Receipt.**
