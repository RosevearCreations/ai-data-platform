# Build 132 — Profile Favorites, Recovery Diff Preview & Bundle Import Capacity Planning

## Objective

Extend Build 131's browser-local preference tools with favorite markers for named profiles, a read-only diff before recovery restore, and a capacity forecast for the selected bundle subset under the active conflict strategy.

## Functional scope

- mark or unmark a selected named profile as a favorite;
- show favorite stars in the quick switcher and named-profile list;
- preserve explicit named-profile ordering independently from favorite state;
- preserve favorite metadata in the browser-local recovery snapshot;
- keep favorite metadata out of portable bundle export;
- compare current state with the saved recovery snapshot before restore;
- preview interface preference, profile membership, profile-detail, favorite and ordering differences;
- calculate selected bundle slot demand before import;
- forecast additions, replacements, conflict skips, capacity skips and final profile count;
- update the capacity plan immediately when selection or conflict strategy changes;
- add contextual help and responsive/forced-colors styling.

## Profile favorites

Build 132 adds one browser-local boolean to each named profile:

`favorite`

Existing Build 129–131 profiles without that field sanitize safely to `false`.

Favorite state does not automatically reorder the profile list. This preserves Build 131's explicit ordering contract.

The quick switcher and profile list display a star for favorites, while Move up / Move down remains the only ordering control.

Favorites are not exported in the portable named-profile bundle. This prevents local convenience metadata from silently becoming cross-browser policy.

Favorites are included in the local recovery snapshot so a local restore can recover the exact browser-local profile state.

## Recovery diff preview

When a recovery snapshot exists, Build 132 computes a read-only diff against the current browser state.

The preview can report:

- interface preference changes;
- current-only named profiles that restore would remove;
- snapshot-only named profiles that restore would bring back;
- profile name, preference or provenance changes;
- favorite-state changes;
- named-profile order changes.

The read-only diff does not alter current preferences, named profiles or the recovery snapshot.

When current state already matches the snapshot, the preview explicitly reports no detected differences.

## Bundle import capacity planning

Capacity planning runs over the selected incoming bundle subset from Build 131 and the currently selected conflict strategy.

The plan reports:

- current named-profile count;
- selected incoming count;
- available local slots;
- same-name conflict count;
- new-slot demand;
- projected additions;
- projected replacements;
- projected conflict skips;
- projected capacity skips;
- projected final profile count;
- whether all selected additions fit without capacity skips.

### Skip strategy

Same-name conflicts consume no slot and are forecast as conflict skips.

### Replace strategy

Same-name conflicts reuse the existing local slot and are forecast as replacements.

### Keep both strategy

Same-name conflicts require a new slot because the incoming profile is retained under a unique Imported suffix.

The capacity forecast is advisory and read-only. The existing import resolver remains authoritative and continues to enforce the eight-profile browser limit.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side favorite storage;
- no server-side recovery diff;
- no account/workspace synchronization;
- no portable favorite transfer;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All favorites, diffing and capacity planning remain browser-local presentation/navigation convenience state. Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 132 verifier requires:

- favorite toggle without profile reordering;
- favorite-list filtering;
- favorite preservation in recovery snapshots;
- favorite exclusion from portable bundles;
- recovery diff detection across preferences, membership, details, favorites and ordering;
- no-change recovery diff behavior;
- Skip, Replace and Keep both capacity forecasts;
- capacity-risk detection at the eight-profile limit;
- accessible favorite control state;
- favorite indicators in switcher/list;
- recovery diff UI;
- capacity forecast UI;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 131 verifier forward compatibility;
- Build 132 registration in the test chain.

## Next roadmap item

**Build 133 — Favorite Quick Filters, Recovery Restore Confirmation & Import Plan Outcome Reconciliation.**
