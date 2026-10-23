# Build 122 — Cross-Module Command Palette & Recent Operator Destinations

## Objective

Reduce navigation friction across modules without turning the application shell into an execution or authorization surface.

## Functional scope

- global **Operator command palette** available from the persistent top bar;
- keyboard shortcut: **Ctrl+K** on Windows/Linux and **Command+K** on macOS;
- cross-module search over every registered module hub and application navigation screen;
- keyboard navigation with Arrow Up, Arrow Down, Enter and Escape;
- browser-local recent operator destinations;
- recent-destination sanitization, deduplication and bounded retention;
- clear-recent control;
- centralized contextual help for both command search and recent destinations;
- Build 118 Marble Standard presentation retained;
- Build 120 module hubs and Build 121 in-module tools retained.

## Command search contract

The command palette searches only the static in-memory application navigation registry.

It does not:

- query PostgreSQL;
- call an application API;
- call an external search service;
- search business records or evidence;
- infer workflow eligibility.

Search results are navigation destinations only.

## Recent destination contract

Recent operator destinations are stored in browser `localStorage` under a versioned key.

Only registered destinations are accepted. Unknown values are discarded, duplicates are removed and the list is bounded to six entries.

Recent destination history is:

- local to the current browser;
- not synchronized across devices;
- not written to the user account or workspace;
- not stored in PostgreSQL;
- not business evidence or audit history.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no new mutation endpoint;
- no permission, role, profile or connector-grant change;
- no automatic workflow transition;
- no workflow execution from the command palette;
- no business-data search;
- all Build 122 command results and recent destinations are navigation-only.

Destination workflows keep their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 122 verifier requires:

- unique command-target hrefs;
- command coverage for every registered module hub and navigation screen;
- deterministic cross-module search;
- longest-match route resolution;
- recent-history sanitization and deduplication;
- keyboard shortcut and keyboard-navigation support;
- browser-local storage only;
- contextual help coverage;
- continued forward compatibility of the Build 121 verifier.

## Next roadmap item

**Build 123 — Pinned Operator Favorites, Saved Navigation Sets & Workspace Shortcuts.**
