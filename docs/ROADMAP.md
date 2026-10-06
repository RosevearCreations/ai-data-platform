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

Status: COMPLETE. Promotion is performed through the Build 008 pull request.

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

Status: COMPLETE. Promotion is performed through the Build 009 pull request.

- visible next-button detection;
- numbered-page progression;
- load-more control detection;
- safe infinite-scroll progression;
- exact first-control selection with fresh per-page re-detection;
- same-origin enforcement;
- optional current-site host access for navigational pagination;
- removable site access;
- configurable page/step, record and wait limits;
- repeated-state, no-new-record, stalled-growth, cancellation and cross-origin stop conditions;
- multi-page recipe execution;
- cumulative-row protection for load-more/infinite-scroll;
- page/step summaries and per-row source-page evidence;
- direct handoff of paginated results to the Build 007 review grid.

Acceptance: a user can run a Build 006 recipe across bounded same-origin pagination, collect and review multi-page results, and stop safely on configured limits or lack of measurable progress.

## Build 010 — Detail/Subpage Enrichment

Status: COMPLETE. Promotion is performed through the Build 010 pull request.

- user-selected parent detail-URL field;
- same-origin public detail-page fetching without cookies;
- inert HTML parsing;
- H1 and meta-description field presets;
- custom detail-field CSS selectors;
- text, meta-content, link, image and safe-attribute extraction;
- deterministic transforms and required-field warnings;
- bounded unique-page count, delay and timeout controls;
- repeated-detail-URL fetch reuse;
- explicit opt-in parent-row deduplication by identical detail URL;
- cross-origin link/redirect blocking;
- parent/detail value merging;
- per-record detail fetch evidence;
- enrichment from both single-page and Build 009 paginated results;
- direct handoff to the Build 007 review grid.

Acceptance: a reviewed extraction can follow bounded same-origin public detail links, extract configured fields without target-site credentials, reuse duplicate detail fetches, merge results with parent rows and preserve fetch evidence for review.

## Build 011 — CSV/XLSX/JSON Export

Status: COMPLETE. Promotion is performed through the Build 011 pull request.

- local CSV export;
- real Office Open XML XLSX generation without a spreadsheet service;
- structured JSON export;
- reviewed/edited versus original raw value selection;
- included-row-only versus all-row selection;
- visible-column-only versus all-column selection;
- optional warning export;
- optional source-page/detail-page evidence export;
- preservation of numeric values in XLSX;
- sanitized filenames;
- UTF-8 CSV with BOM;
- CSV formula-like string neutralization;
- automatic availability for base, paginated and detail-enriched review datasets.

Acceptance: any Build 007 review workspace can export the intended reviewed or raw dataset as CSV, XLSX or JSON using explicit row/column/evidence options without a backend export dependency.

## Build 012 — Saved Scrapers & Templates

Status: COMPLETE (2026-10-05).

- local recipe library;
- built-in and user-saved site templates;
- bounded revision history;
- current-page selector breakage detection;
- same-site saved-item hints;
- load and restore prior revisions without silently overwriting the current saved version.

Acceptance: a user can save an extraction recipe, reopen it without rebuilding selectors, keep intentional revisions, load a starter template, and check whether its record/field selectors are healthy, degraded, or broken on the current page.

## Build 013 — Historical Change Detection

Status: COMPLETE (2026-10-05).

- explicit reviewed record versions;
- per-version field observations;
- added/removed/changed/unchanged summaries;
- pending/reviewed/dismissed change review queue;
- user-selected stable identity field;
- bounded local history retention.

Acceptance: after an initial reviewed baseline, a later capture can match stable record identities, preserve field observations for each retained version, summarize changes, and require explicit review of detected additions, removals and field changes.

## Build 014 — Rosie Dazzlers Competitive Intelligence

Status: COMPLETE (2026-10-06).

- detailing-domain normalization from reviewed extraction rows;
- packages/pricing/services/vehicle-size/mobile-mode/service-area model;
- operator-verified Ontario detailer dataset in extension-local storage;
- per-source and per-business competitor snapshots;
- added/removed/changed offering history;
- source URL and retrieval-time evidence retention;
- canonical package-content facts instead of copied marketing prose.

Acceptance: reviewed public Ontario auto-detailing facts can be mapped into a normalized local dataset, compared across competitors, and recaptured later to retain source-scoped price/service/package change history without writing into Rosie Dazzlers production records.

## Build 015 — Devil n Dove Supplier Intelligence

Status: COMPLETE (2026-10-06).

- reviewed supplier product model with source evidence;
- package quantity, stock-unit and usage-unit normalization;
- common compatible-unit conversion inference;
- cost-per-stock-unit and cost-per-usage-unit calculations;
- bounded supplier price observations;
- reviewed local inventory-integration staging with pending/approved/rejected states;
- approved records automatically return to pending when refreshed supplier facts change.

Acceptance: reviewed supplier rows can be normalized into Devil n Dove inventory economics, staged locally with source/price evidence, explicitly approved or rejected, and prepared for a later integration adapter without writing into production inventory.

## Build 016 — Movie Metadata Module

Status: COMPLETE (2026-10-06).

- local CSV/JSON import for the existing owned movie collection;
- permitted-source intake profiles for IMDb datasets, TMDb API/export, OMDb API/export and other operator-confirmed API/dataset sources;
- external-ID, UPC, title/year and title-similarity matching;
- exact/strong/ambiguous/unmatched confidence classification;
- manual owned-title assignment for ambiguous/unmatched candidates;
- explicit approve/reject/reopen metadata review;
- ownership-field preservation for format, shelf location, condition and personal notes;
- metadata enrichment limited to canonical metadata and missing external IDs.

Acceptance: an existing owned collection can be imported locally, reviewed metadata from a permitted API/dataset source can be mapped and matched, ambiguous results remain review-gated, and approving enrichment cannot overwrite ownership-specific fields.

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
