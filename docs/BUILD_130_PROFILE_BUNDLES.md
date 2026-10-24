# Build 130 — Named Profile Rename/Duplicate, Portable Profile Bundles & Import Conflict Resolution

## Objective

Extend Build 129's browser-local named preference profiles with controlled rename/duplicate operations plus a portable multi-profile bundle format that resolves import conflicts explicitly before writing browser-local state.

## Functional scope

- rename a selected named local profile;
- reject blank or same-name conflicts case-insensitively;
- duplicate a selected profile with an operator-entered or generated copy name;
- preserve the duplicated profile's preferences and provenance while creating a new local ID;
- export all named profiles as one versioned JSON bundle;
- import a compatible bundle through a staged preview;
- show incoming count, same-name conflict count and available local profile slots;
- provide explicit **Skip**, **Replace** and **Keep both** conflict strategies;
- preserve the eight-profile local capacity limit without evicting existing profiles;
- add contextual help and responsive/forced-colors styling.

## Rename and duplicate governance

Rename preserves the selected profile's local ID, preference values and provenance.

A rename fails when the requested name is blank or another local profile already uses that name case-insensitively.

Duplicate creates a new local ID. If no duplicate name is entered, the interface generates a bounded copy name such as **Focus copy**.

Duplicate never bypasses the eight-profile browser limit.

## Portable bundle contract

Build 130 introduces:

`ai-data-platform-interface-preference-bundle`

Bundle schema version: **1**.

Each portable bundle profile contains only:

- profile name;
- navigation density;
- workspace layout;
- recommendation visibility.

Browser-local IDs are excluded.

Navigation insights, account information, workspace records, business data, connector grants, workflow evidence and server-side identifiers are excluded.

Bundles contain from one to eight profiles. Duplicate names inside a bundle are rejected case-insensitively.

## Staged bundle import

Bundle files are read locally in the browser and are limited to 64 KB.

A valid bundle is staged first. Nothing is imported until the operator chooses **Import bundle**.

The preview shows:

- source filename and bundle format/version;
- incoming profile count;
- same-name conflict count;
- available browser-local slots;
- each incoming profile and whether it conflicts.

## Conflict strategies

### Skip

Same-name incoming profiles are skipped. Existing local profiles remain unchanged. Non-conflicting incoming profiles are imported when capacity exists.

### Replace

A same-name incoming profile replaces the preference values in the existing local profile while retaining that local profile's ID. Its provenance becomes the imported bundle source.

### Keep both

The existing local profile is preserved. The incoming conflict is imported under a bounded **(Imported)** suffix when capacity exists.

If capacity is exhausted, remaining incoming profiles are skipped. Build 130 never evicts an existing local profile automatically.

## Import provenance

Profiles imported from a bundle record:

- source filename only;
- bundle format identifier;
- bundle format version 1.

No filesystem path, timestamp, account identity or analytics identifier is stored.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side bundle storage;
- no account/workspace synchronization;
- no business-data import/export;
- no navigation-history content in bundles;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All operations remain browser-local presentation/navigation convenience state. Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 130 verifier requires:

- rename success and conflict rejection;
- duplicate success with preserved preferences;
- strict bundle round-trip;
- no local IDs in exported bundles;
- rejection of case-insensitive duplicate names inside a bundle;
- conflict preview analysis;
- deterministic Skip behavior;
- deterministic Replace behavior;
- deterministic Keep both behavior with imported suffix;
- no local-profile eviction at capacity;
- staged 64 KB bundle import;
- explicit conflict strategy UI;
- help coverage;
- responsive and forced-colors-compatible bundle UI;
- Build 129 verifier forward compatibility;
- Build 130 registration in the test chain.

## Next roadmap item

**Build 131 — Named Profile Ordering, Selective Bundle Import & Local Recovery Snapshot.**
