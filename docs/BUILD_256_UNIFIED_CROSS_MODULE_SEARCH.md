# Build 256 — Unified Cross-Module Search, Results Explorer & Context Navigation

## Purpose

Build 256 adds one authenticated, read-only search workspace for finding records, evidence and application context without turning the existing Ctrl-K command palette into a business-data search surface.

## Search sources

The unified results explorer composes existing application read models for:
- Unified Data Library records;
- approved dataset candidates and publications;
- collection projects and run sources;
- visual extraction recipes;
- intelligence modules and append-only intelligence audit evidence;
- integration delivery acknowledgement evidence;
- authorized workspaces;
- registered application navigation;
- contextual help topics.

Search results route back into their existing governed source modules.

## Authorization boundary

Build 256 does **not** create a new search database, materialized search copy or privileged index.

Dynamic records are read through the same existing user-scoped services used by their source screens. Those services continue to use `withUserDatabase`, the `ai_data_runtime` role, `app.user_id` and PostgreSQL row-level security where applicable.

The results explorer cannot:
- broaden workspace membership;
- change roles or permissions;
- infer hidden workspace records;
- bypass source workflow eligibility;
- mutate records from search results;
- authorize integration or connector actions.

## Command palette boundary

Ctrl-K remains the Build 122/123 navigation-only command palette. Because Unified Search is now a registered application destination, the palette can navigate to it, but typed Ctrl-K terms still search only the in-memory navigation registry.

## Results explorer

The `/search` screen provides:
- bounded query input;
- All, Navigation, Data, Approved, Collection, Intelligence, Integrations, Workspaces and Help scopes;
- result counts by scope;
- source-context labels and workspace names where applicable;
- direct navigation back into the governed source screen;
- empty-state recovery without widening authorization.

## QL-266

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 256 does not start any QL-266 external, authentication or connection test.

Source A:
`417f1e305405cab245ead9b31ea5b0c2e3350efe`

Verified Build 255 CI:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41245345473`

## Next roadmap item

**Build 257 — Shared Saved Views, Filter Profiles & Operator Workspaces.** Allow saved combinations of filters, sort order, search, visible columns, date ranges and workspace context that can be reopened from Operations Command. QL-266 remains UNDER_REVIEW until explicitly resumed.
