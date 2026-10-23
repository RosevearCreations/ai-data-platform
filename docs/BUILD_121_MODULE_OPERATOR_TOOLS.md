# Build 121 — In-Module Task Panels, Search & Operator Shortcuts

## Objective

Make the Build 120 module hubs faster to operate without turning them into execution surfaces.

## Functional scope

- explicit task panels for every current module;
- every registered module sub-screen is covered by at least one task panel;
- client-side module search across task labels, sub-screen names and descriptions;
- live matching-result count and a clear-search recovery path;
- curated operator shortcuts for common destinations inside each module;
- Build 117 contextual help on search, shortcuts, task panels and sub-screen cards;
- Build 118 Marble Standard styling retained;
- Build 120 module hubs and breadcrumbs retained.

## Search contract

Module search is intentionally local and client-side.

It filters only the already-registered module task panels and sub-screens. It does not query PostgreSQL, call an API, contact an external service, or search data records.

## Operator shortcut contract

Shortcuts are navigation-only links into existing governed workflows.

They do not:

- grant permission;
- bypass RLS;
- skip approvals or confirmations;
- create operational evidence;
- change workflow state;
- execute a remote or integration action.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no new mutation endpoint;
- no automatic state transition;
- no permission, role, profile or connector-grant change;
- no historical workflow deletion;
- no server-side search service;
- all Build 121 hub behavior is navigation-only.

## Verification

The Build 121 verifier requires:

- an operator-tool registry entry for every module;
- valid task-panel and shortcut links;
- complete task-panel coverage of every current module sub-screen;
- local-search UI and empty-state recovery;
- centralized contextual help coverage;
- continued Build 120 progressive-navigation compatibility.

## Next roadmap item

**Build 122 — Cross-Module Command Palette & Recent Operator Destinations.**
