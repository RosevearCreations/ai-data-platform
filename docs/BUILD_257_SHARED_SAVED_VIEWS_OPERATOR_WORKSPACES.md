# Build 257 — Shared Saved Views, Filter Profiles & Operator Workspaces

## Purpose

Build 257 turns isolated screen-specific saved views into one reusable browser-local Operator Workspace system.

Operators can save and reopen working combinations of:
- filters;
- sort order;
- search;
- visible metadata columns;
- date range;
- workspace context;
- destination/query state.

Saved workspaces can be reopened from the Operations Command top bar or reviewed from the dedicated Operator Workspaces screen.

## Shared local profile contract

Build 257 adds a versioned `OperatorWorkspaceProfile` contract with bounded:
- profile ID and name;
- governed relative destination;
- query parameters;
- workspace context;
- search text;
- sort selection;
- visible column identifiers;
- from/to date range.

The store is capped at 16 profiles and uses browser `localStorage` only.

No account preference table, workspace preference table, PostgreSQL migration or external persistence service is added.

## Data Library integration

The Unified Data Library now supports profileable:
- authorized workspace filter;
- record-type filter;
- bounded search;
- deterministic sort;
- page size;
- updated-from / updated-to date range;
- visible metadata fields: workspace, type, status, observed, updated and source.

Existing Build 044 Data Library saved views migrate into the shared Build 257 Operator Workspace store on first use, then the legacy storage key is removed.

## Unified Search integration

Unified Search can save its current query and result scope into the same Operator Workspace store. Reopening a saved search returns to the authenticated Build 256 results explorer.

## Operations Command integration

The top bar now exposes an Operator Workspaces menu. Saved profiles can be reopened from anywhere in the application.

The dedicated `/operator-workspaces` screen shows the saved destination plus workspace, search, sort, visible-column and date-range context.

## Authorization boundary

Operator Workspaces are navigation/view state only.

They cannot:
- grant workspace membership;
- change roles, capabilities or connector grants;
- bypass PostgreSQL RLS;
- make hidden workspaces visible;
- perform workflow mutations;
- create approval or integration evidence;
- change QL-266 state.

Every reopened destination still performs its normal authentication, membership, RLS, role and workflow checks.

## QL-266

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 257 does not start any QL-266 external, authentication or connection test.

Source A:
`37697a9712df87677c4beb2ec38f7493a1c7b8d0`

Verified Build 256 CI:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41249471654`

## Next roadmap item

**Build 258 — Operator Attention Center, Exception Inbox & Follow-Up Queue.** Create one action-oriented surface for failed runs, configuration gaps, integration exceptions, pending reviews, stale approvals, connector problems, retention decisions and other items requiring follow-up. QL-266 remains UNDER_REVIEW until explicitly resumed.
