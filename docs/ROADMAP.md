# Roadmap

## Build 000 — Foundation & Source of Truth

Status: COMPLETE on dev when all Build 000 documents are committed and reviewed.

Deliverables:

- product scope;
- architecture;
- data model;
- AI strategy;
- scraping policy;
- security baseline;
- build roadmap;
- decision record;
- build log.

## Build 001 — Monorepo, Web App & Chrome Extension Shell

Status: COMPLETE. Promotion is performed through the Build 001 pull request.

- initialize package manager/workspaces;
- create Next.js web app;
- create Chrome MV3 extension shell with side panel;
- shared TypeScript configuration;
- lint/typecheck/test/build commands;
- CI baseline.

Acceptance: both applications build from a clean checkout.

## Build 002 — PostgreSQL Auth & Workspace Isolation

Status: COMPLETE. Promotion is performed through the Build 002 pull request.

- provider-portable PostgreSQL foundation;
- Better Auth email/password authentication;
- separate `auth` and `app` schemas;
- workspace membership model;
- PostgreSQL row-level security using a restricted runtime role;
- seed initial Rosie Dazzlers, Devil n Dove and Personal workspaces;
- first-user owner bootstrap;
- CI PostgreSQL integration test.

Acceptance: authenticated users only see permitted workspace data, verified against a real ephemeral PostgreSQL instance.

## Build 003 — Page DOM Inspector

Status: COMPLETE. Promotion is performed through the Build 003 pull request.

- temporary active-page inspection using `activeTab` + `scripting`;
- bounded DOM snapshot model;
- visible text/safe-attribute capture without form values;
- page metadata and structural counts;
- candidate repeating-container scoring;
- side-panel inspection results and diagnostics.

Acceptance: extension can inspect a user-selected public page and display ranked candidate record containers without persistent host permissions.

## Build 004 — Visual Element Picker

Status: IN VERIFICATION on `dev`.

- point-and-click field selection;
- hover highlight and tooltip overlays;
- Escape and side-panel cancellation;
- stable exact-selector generation;
- generalized repeated-field selector generation;
- match-count visibility;
- exact/generalized selector preview;
- temporary multi-match highlight overlays;
- safe attribute and visible-text summary.

Acceptance: a user can select a visible page element, receive exact and generalized selectors, and preview selector matches without activating the page element or requesting persistent host access.

## Build 005 — Repeating Record Detection

- candidate list/table/card detection;
- record boundary inference;
- confidence and diagnostics.

## Build 006 — Extraction Recipe Engine

- versioned recipe schema;
- text/attribute/link/image extraction;
- deterministic transforms;
- recipe test runner.

## Build 007 — Spreadsheet Preview & Review

- preview grid;
- edit/drop/reorder fields;
- warnings;
- row exclusion;
- save dataset.

## Build 008 — AI Suggested Fields

- natural-language extraction intent;
- schema suggestion;
- field semantics;
- structured outputs;
- cost telemetry.

## Build 009 — Pagination & Infinite Scroll

- next-button;
- numbered pages;
- safe infinite scroll;
- limits and stop conditions.

## Build 010 — Detail/Subpage Enrichment

- follow record links;
- merge parent/detail fields;
- deduplication.

## Build 011 — CSV/XLSX/JSON Export

- exports;
- source/evidence options;
- normalized vs raw views.

## Build 012 — Saved Scrapers & Templates

- recipe library;
- site templates;
- versioning;
- breakage detection.

## Build 013 — Historical Change Detection

- record versions;
- field observations;
- change summaries;
- review queue.

## Build 014 — Rosie Dazzlers Competitive Intelligence

- detailing-domain normalization;
- packages/pricing/services/service-area model;
- Ontario detailer dataset;
- competitor change history.

## Build 015 — Devil n Dove Supplier Intelligence

- supplier product model;
- package/unit normalization;
- cost-per-usage-unit calculations;
- reviewed inventory integration staging.

## Build 016 — Movie Metadata Module

- import existing collection;
- permitted API/dataset connectors;
- title/year/UPC/external-ID matching;
- ownership-field preservation.

## Build 017 — Scheduled & Repeatable Jobs

- only after source-policy review;
- scheduling;
- run limits;
- failure/retry controls;
- change notifications.

## Build 018 — Business-System Integrations

- explicit Rosie Dazzlers adapters;
- explicit Devil n Dove adapters;
- dry-run/diff;
- approval;
- audit trail.

## Later candidates

- remote/cloud browser workers;
- proxy support where lawful and necessary;
- advanced anti-breakage recipe repair;
- mobile barcode capture;
- additional workspace types;
- plugin/connector SDK.

These are intentionally deferred until the local-first product proves the need.
