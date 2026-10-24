# Build 128 — Preference Profile Export/Import, Reconciliation Preview & Local Portability

## Objective

Make the Build 126–127 interface preference system portable between browsers without creating account synchronization, server-side profiles or a new business-data channel.

## Functional scope

- export the current interface preferences as a small versioned JSON file;
- import an exported JSON preference profile from another browser;
- strict format, schema-version and preference-value validation;
- a 32 KB local file-size boundary;
- stage imported preferences without applying them;
- show stored imported values beside accessibility-reconciled effective values;
- require an explicit **Apply imported profile** action after preview;
- allow cancel without changing current preferences;
- contextual help for portability and reconciliation preview;
- retain Build 127 preset, accessibility and reset behavior.

## Portable profile contract

The exported profile contains only:

- format identifier;
- schema version 1;
- navigation density preference;
- workspace layout preference;
- recommendation visibility preference.

Navigation insights are excluded. Account identity, workspace records, scraper data, business records, workflow evidence, permissions and connector information are excluded.

The portable profile is deliberately separate from the Build 125 navigation-usage snapshot.

## Import validation

Imports fail closed when:

- the file is not valid JSON;
- the format identifier is not the AI Data Platform interface preference format;
- the profile version is unsupported;
- any required preference value is missing or outside the supported enum;
- the local file is larger than 32 KB.

Invalid fields are not silently replaced with defaults during import.

## Reconciliation preview

A valid import is staged first.

Before apply, the operator sees:

- imported stored navigation density and effective navigation density;
- imported stored workspace layout and effective workspace layout;
- imported stored recommendation visibility and effective recommendation visibility;
- any active high-contrast, narrow-viewport or reduced-motion reconciliation messages.

Accessibility reconciliation remains non-destructive. It never rewrites the imported stored values.

## Local portability behavior

Export creates a local JSON download in the browser.

Import reads a user-selected local JSON file using browser APIs. No upload endpoint or background sync is introduced.

Applying an imported profile writes the existing browser-local interface preference storage key and broadcasts the existing interface-preference event so the shell updates immediately.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side preference profile;
- no account or workspace synchronization;
- no export of navigation insights;
- no business-data export or import;
- no role-based personalization;
- no permission, role, profile or connector-grant change;
- no automatic workflow transition;
- imported preferences remain presentation and navigation-only.

Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 128 verifier requires:

- deterministic versioned profile creation and JSON serialization;
- successful export/import round-trip;
- rejection of foreign formats;
- rejection of invalid preference enum values;
- accessibility reconciliation preview without stored-value mutation;
- export and import controls in Insights;
- staged preview before apply;
- explicit excluded-data wording;
- bounded file-size handling;
- portability and preview help topics;
- responsive and forced-colors-compatible portability UI;
- Build 127 verifier forward compatibility;
- Build 128 registration in the application test chain.

## Next roadmap item

**Build 129 — Named Local Preference Profiles, Quick Switcher & Import Provenance.**
