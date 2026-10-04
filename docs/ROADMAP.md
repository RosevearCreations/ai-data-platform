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

Status: COMPLETE. Promotion is performed through the Build 004 pull request.

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

Status: COMPLETE. Promotion is performed through the Build 005 pull request.

- automatic repeated list/table/card/row detection;
- field-guided record-boundary inference from Build 004 selections;
- deterministic structural signatures;
- repeat-ratio and structural-consistency measurement;
- text/link/image coverage metrics;
- semantic bonuses and navigation penalties;
- ranked confidence scores and diagnostics;
- bounded record samples and field hints;
- record-selector generation;
- temporary record-boundary preview overlays.

Acceptance: the extension can rank plausible repeated-record groups automatically or infer them around a selected field, show why a group scored well, and preview the resulting record selector without activating page content.

## Build 006 — Extraction Recipe Engine

Status: COMPLETE. Promotion is performed through the Build 006 pull request.

- portable recipe schema version 1;
- selected record group -> recipe workflow;
- relative field-selector derivation from Build 004 picks;
- manual field authoring and editing;
- text, safe-attribute, link and image extraction;
- absolute URL normalization for links/images;
- deterministic trim/whitespace/case/number/currency transforms;
- required-field warnings and extraction statistics;
- bounded local recipe test runner;
- first-row preview and portable recipe JSON;
- no database persistence or AI dependency.

Acceptance: a user can choose a Build 005 record group, define multiple reusable field rules, execute the recipe across repeated records, inspect structured rows/warnings, and obtain portable versioned recipe JSON without writing to a backend.

## Build 007 — Spreadsheet Preview & Review

Status: COMPLETE. Promotion is performed through the Build 007 pull request.

- full spreadsheet-style extraction grid;
- editable reviewed cell values;
- row include/exclude controls;
- include-all, exclude-all and reset actions;
- column reorder controls;
- non-destructive column drop/restore;
- all/included/warnings row filters;
- current required-field warning recalculation after edits;
- edited-cell, excluded-row and warning-state presentation;
- review statistics;
- local reviewed-dataset snapshot save;
- retention of up to 20 recent local review snapshots;
- no business-system or backend writes.

Acceptance: a successful Build 006 extraction can be reviewed across all rows, corrected, filtered, column-curated and row-approved, then saved as a local reviewed dataset while preserving the original extraction result.

## Build 008 — AI Suggested Fields

Status: IN VERIFICATION on `dev`.

- authenticated natural-language extraction intent;
- bounded sample-record context instead of full-DOM upload;
- strict structured field-schema suggestions;
- field semantics, preferred sources and required-state guidance;
- deterministic transform recommendations;
- AI cannot create or approve CSS selectors;
- server-only Vercel AI Gateway integration;
- configurable model with `AI_SUGGESTION_MODEL`;
- token and estimated-cost telemetry;
- deterministic zero-cost fallback when AI is unavailable;
- extension-side bounded context handoff;
- automated suggestion parser/fallback/sanitizer verification;
- production-branch CI after merge.

Acceptance: an authenticated user can describe desired data, submit bounded record samples, receive sanitized structured field suggestions with telemetry, and continue safely when AI credentials or the provider are unavailable.

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
