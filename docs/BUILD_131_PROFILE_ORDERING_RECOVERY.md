# Build 131 — Named Profile Ordering, Selective Bundle Import & Local Recovery Snapshot

## Objective

Extend Build 130's browser-local named preference system with persistent profile order, selective multi-profile bundle import and one browser-local recovery snapshot for safely restoring preference state after experiments or destructive local changes.

## Functional scope

- preserve named-profile order in browser storage;
- move the selected named profile up or down;
- preserve ID, preferences and provenance during reordering;
- exported named bundles follow the current local profile order;
- stage a bundle and select only the incoming profiles that should participate in import;
- Select all and Clear selection controls;
- conflict analysis applies only to selected incoming profiles;
- existing Skip, Replace and Keep both policies apply only to the selected subset;
- unselected incoming profiles are ignored and consume no local capacity;
- retain one local recovery snapshot containing current interface preferences and the complete ordered named-profile list;
- manual Save, Restore and Clear recovery controls;
- automatically refresh the recovery snapshot before bundle import and named-profile deletion;
- full local reset also clears the recovery snapshot.

## Named profile ordering

The named-profile array order is the canonical local ordering.

Move up/down changes array position only. It does not change:

- browser-local profile ID;
- profile name;
- preference values;
- import provenance.

The Quick switcher and exported bundle use the stored local order.

## Selective bundle import

After a valid bundle is staged, every incoming profile is selected by default.

The operator can:

- deselect individual incoming profiles;
- select all;
- clear the selection;
- review selected count and selected conflict count;
- apply Skip, Replace or Keep both only to the selected subset.

Unselected bundle profiles are ignored entirely. They do not trigger conflicts, do not consume local slots and are not written to browser storage.

At least one incoming profile must be selected before import can run.

## Local recovery snapshot

Build 131 introduces one browser-local recovery slot:

`ai-data-platform:interface-preference-recovery-snapshot:v1`

The snapshot contains:

- current interface preferences;
- the complete named-profile list;
- named-profile order;
- each named profile's existing local ID and provenance.

The snapshot does not include navigation insights, account data, workspace records or business records.

Saving a new snapshot replaces the previous snapshot. Build 131 intentionally keeps only one recovery snapshot.

A snapshot is refreshed automatically immediately before:

- deleting a named profile;
- applying a selected bundle import.

Restore writes the saved current interface preferences and ordered named-profile list back to the existing local storage keys and dispatches the existing preference event so the shell updates immediately.

The broad **All local navigation data** reset also clears the recovery snapshot.

## Recovery validation

Recovery snapshots are versioned and fail closed when:

- JSON is malformed;
- the format identifier is incorrect;
- the snapshot version is unsupported;
- current interface preferences are invalid;
- named profile records are invalid or duplicated.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery storage;
- no account/workspace synchronization;
- no navigation insights in recovery snapshots;
- no business-data import/export;
- no permission, role or connector-grant changes;
- no automatic workflow transition.

All ordering, selection and recovery behavior remains browser-local presentation/navigation convenience state. Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 131 verifier requires:

- deterministic up/down/top ordering primitives;
- boundary-stable ordering;
- selected bundle filtering that preserves incoming order;
- conflict analysis only on the selected subset;
- unselected bundle profiles ignored during resolution;
- recovery snapshot creation and round-trip parsing;
- preservation of named-profile order in recovery;
- malformed/duplicate recovery rejection;
- ordering UI;
- selective checkboxes plus Select all/Clear selection;
- disabled import with no selected profiles;
- manual Save/Restore/Clear recovery controls;
- automatic snapshot before delete/import;
- dedicated recovery localStorage key;
- full reset clearing recovery state;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 130 verifier forward compatibility;
- Build 131 registration in the test chain.

## Next roadmap item

**Build 132 — Profile Favorites, Recovery Diff Preview & Bundle Import Capacity Planning.**
