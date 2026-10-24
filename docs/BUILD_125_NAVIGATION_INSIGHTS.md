# Build 125 — Navigation Usage Insights, Shortcut Discoverability Metrics & Personalized Interface Recommendations

## Objective
Use small, explainable browser-local navigation counts to help operators discover faster interface paths without creating server-side behavioral profiles or changing workflow authority.

## Functional scope
- browser-local aggregate registered-destination visit counts;
- browser-local command-palette open count;
- browser-local keyboard-action-map open count;
- bounded shortcut discoverability levels;
- local navigation usage summary;
- ranked previously visited registered destinations;
- recommendations for navigation shortcuts that have not yet been tried locally;
- one-click reset of all Build 125 local insight data;
- contextual help for insights, metrics and recommendations;
- Build 122–124 navigation features retained.

## Local data contract
Build 125 stores one versioned object in browser `localStorage` containing only registered destination href → bounded visit count, command-palette open count, and keyboard-action-map open count.

Build 125 stores **no timestamps**, search terms, typed text, selected command-palette result history, business data, customer data, approvals, workflow outcomes, evidence, account identifiers or workspace identifiers.

Unknown destination keys are discarded. Invalid, negative or nonnumeric counters are normalized. Counters are capped at 999. The user can remove the entire snapshot with **Reset local insights**.

## Shortcut discoverability contract
The interface reports each measured navigation shortcut as:
- **not tried** — zero recorded opens;
- **exploring** — one or two opens;
- **established** — three or more opens.

These labels describe local interface usage only. They are not employee ratings, productivity scores, compliance evidence or operational KPIs.

## Recommendation contract
Destination recommendations rank previously visited registered destinations by bounded local visit count, excluding the current destination. Shortcut recommendations appear only after at least two registered visits and when the corresponding navigation shortcut has zero recorded opens. With no useful history, recommendations may fall back to a registered destination in the current navigation group.

Recommendations never inspect PostgreSQL, application business records, permissions, external services, analytics platforms or cross-device history.

## Safety boundaries
- no database migration;
- no schema or RLS change;
- no API endpoint;
- no analytics provider;
- no server-side behavioral profile;
- no account or workspace synchronization;
- no permission, role, profile or connector-grant change;
- no automatic workflow transition;
- no business-data search;
- all Build 125 recommendations are navigation-only.

Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification
The Build 125 verifier requires registered-destination sanitization, bounded aggregate counters, deterministic visit totals, deterministic shortcut discoverability levels, frequent-destination recommendations, unused-shortcut recommendations, browser-local storage only, explicit command-palette and keyboard-map open measurement, local reset controls, contextual help coverage, and continued Build 124 compatibility.

## Next roadmap item
**Build 126 — Adaptive Navigation Density, Role-Neutral Workspace Layout Preferences & Interface Recommendation Controls.**
