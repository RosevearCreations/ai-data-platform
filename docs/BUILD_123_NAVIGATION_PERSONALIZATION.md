# Build 123 — Pinned Operator Favorites, Saved Navigation Sets & Workspace Shortcuts

## Objective

Let operators personalize routine navigation without creating new server-side preference state or weakening workflow authority.

## Functional scope

- pin and unpin registered command-palette destinations;
- browser-local Favorites collection;
- snapshot current favorites into named saved navigation sets;
- remove saved navigation sets;
- bounded and sanitized favorite/set storage;
- dedicated Workspace shortcut collection derived from the existing Workspace & Administration navigation registry;
- Build 122 cross-module search, recent destinations and keyboard navigation retained;
- centralized contextual help for favorites, saved sets and workspace shortcuts;
- Marble Standard presentation retained.

## Favorites contract

Favorites are stored in browser `localStorage` under a versioned key.

Only registered command targets are retained. Unknown destinations and duplicate values are discarded. Favorites are bounded to eight destinations.

Pinning is a navigation preference only.

## Saved navigation set contract

A saved navigation set is a browser-local snapshot of the current favorites.

Each set has:

- a bounded local identifier;
- a trimmed display name of at most 40 characters;
- up to eight registered destination hrefs.

The browser keeps at most six sets. Empty or invalid sets are discarded during loading.

Saved sets are not:

- account preferences;
- team-shared configuration;
- workspace database records;
- authorization evidence;
- workflow state.

## Workspace shortcut contract

The Workspace collection is derived from registered command targets whose navigation group is `workspace`.

That means the collection stays aligned with the existing Workspace & Administration module rather than maintaining a second hard-coded route list.

Workspace shortcuts remain navigation-only and cannot modify:

- roles or permissions;
- workspace profiles;
- connector grants;
- adoption state;
- retention state;
- production evidence.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no new mutation endpoint;
- no server-side preference table;
- no permission, role, profile or connector-grant change;
- no automatic workflow transition;
- no business-data search;
- all Build 123 favorites, sets and workspace shortcuts are navigation-only.

Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 123 verifier requires:

- favorite sanitization and deduplication;
- saved-set identifier, name and destination sanitization;
- bounded registered workspace shortcuts;
- favorites/set controls in the command palette;
- browser-local storage keys only;
- contextual help coverage;
- continued Build 122 command-palette compatibility.

## Next roadmap item

**Build 124 — Keyboard Action Map, Context-Aware Jump Suggestions & Navigation Accessibility Audit.**
