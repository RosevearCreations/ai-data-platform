# Build 129 — Named Local Preference Profiles, Quick Switcher & Import Provenance

## Objective

Extend the Build 126–128 browser-local preference system with reusable named profiles, a compact quick switcher and bounded provenance for profiles created from imported preference files.

## Functional scope

- save the current interface preference combination under a local name;
- store up to eight named profiles per browser;
- names are normalized and limited to 40 characters;
- saving the same name again updates that local profile rather than creating another named duplicate;
- quick switcher for applying a selected saved profile;
- exact-current-match indication;
- local deletion of a named profile;
- imported preference preview now shows provenance;
- imported profiles can be saved directly as named local profiles;
- the broad local reset clears named profiles along with current preferences and navigation insights;
- contextual help for named profiles, switching and provenance.

## Named local profile contract

Each stored named profile contains only:

- schema version 1;
- browser-local profile ID;
- operator-entered local name;
- the existing interface preferences:
  - navigation density;
  - workspace layout;
  - recommendation visibility;
- bounded provenance.

Named profiles use browser localStorage only.

They are not account profiles, workspace profiles or server records.

## Quick switcher

The quick switcher reads only the saved named-profile list in the current browser.

Applying a named profile writes the same Build 126 interface preference object and uses the existing Build 127 accessibility reconciliation layer.

The switcher cannot:

- change roles or permissions;
- change RLS;
- write business data;
- modify workflow evidence;
- trigger connector actions;
- alter server-side state.

## Import provenance

A profile saved from an imported preference file records:

- provenance kind: imported;
- the source file name only;
- AI Data Platform preference-profile format identifier;
- format version 1.

The source file name is bounded to 80 characters and has control characters removed.

Build 129 stores no filesystem path, no import timestamp, no account identity, no analytics identifier and no additional file contents beyond the already validated preference values.

A profile created directly from the current browser preferences records only that it was created in this browser.

## Local storage governance

Build 129 uses a dedicated browser key:

`ai-data-platform:named-interface-profiles:v1`

The existing **Interface only** reset preserves named profiles so reusable profiles remain available after returning current preferences to defaults.

The broad **All local navigation data** reset now clears:

- current interface preferences;
- Build 125 navigation insights;
- Build 129 named local preference profiles.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side named profile table;
- no account or workspace synchronization;
- no business-data export or import;
- no navigation-history content added to profiles;
- no role-based personalization;
- no permission, role, account profile or connector-grant change;
- no automatic workflow transition;
- all named profiles and provenance remain presentation/navigation convenience state.

Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 129 verifier requires:

- normalized 40-character names;
- eight-profile storage bound;
- duplicate-ID rejection during storage sanitization;
- same-ID upsert behavior;
- exact profile preference matching;
- local deletion;
- imported provenance preservation;
- source filename normalization without filesystem path storage;
- quick switcher, save, delete and current-match UI;
- save-imported-as-named-profile path;
- dedicated named-profile localStorage key;
- broad reset clearing named profiles;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 128 verifier forward compatibility;
- Build 129 registration in the test chain.

## Next roadmap item

**Build 130 — Named Profile Rename/Duplicate, Portable Profile Bundles & Import Conflict Resolution.**
