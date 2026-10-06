# Build Log

## Build 000 — Shared AI Data Platform Foundation & Source of Truth

Date: 2026-10-02

Status: COMPLETE. Promotion is performed through the Build 000 pull request.

### Goal

Create a durable source of truth before application code.

### Delivered

- repository README and development workflow;
- product definition;
- architecture;
- canonical data model;
- AI responsibilities and cost controls;
- scraping/source-use policy;
- security baseline;
- numbered roadmap;
- durable architectural decision record.

### Acceptance

- shared platform scope is explicit;
- Rosie Dazzlers, Devil n Dove and Personal are defined as separate workspaces;
- local-first Chrome extension architecture is established;
- AI is separated from deterministic bulk extraction;
- external observations require provenance;
- production integration writes require an approval boundary by default;
- Build 001 has a concrete executable target.

### Next

Build 001 — Monorepo, Web App & Chrome Extension Shell.

## Build 001 — Monorepo, Web App & Chrome Extension Shell

Date: 2026-10-02

Status: COMPLETE. Promotion is performed through the Build 001 pull request.

### Goal

Create the first executable platform baseline with independently buildable web and browser-extension applications.

### Delivered

- pnpm workspace monorepo;
- Node.js 24 baseline;
- Next.js 16.3.8 App Router web shell;
- React 19.3.0 UI baseline;
- Chrome Manifest V3 side-panel extension shell;
- least-privilege extension manifest using only the `sidePanel` permission;
- Vite-based extension production build;
- shared TypeScript contracts package;
- shared TypeScript compiler baseline;
- ESLint 10-compatible web lint configuration;
- exact direct dependency versions;
- committed `pnpm-lock.yaml`;
- CI verification using frozen-lockfile installation;
- development and Chrome extension loading documentation.

### Verification

The Build 001 `dev` workflow verified:

- dependency installation;
- TypeScript checks for web, extension and contracts;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- shared-contract smoke test.

### Security notes

- no Supabase keys or runtime secrets exist in Build 001;
- the extension has no host permissions, `activeTab`, or scripting permission;
- dependency lifecycle scripts are denied by default except the explicitly reviewed `unrs-resolver@1.12.2` build required by the lint toolchain.

### Next

Build 002 — Supabase Auth & Workspace Isolation.

## Build 002 — PostgreSQL Auth & Workspace Isolation

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 002 pull request.

### Goal

Replace the Supabase-specific persistence assumption with provider-portable PostgreSQL authentication and database-enforced workspace isolation.

### Delivered

- Better Auth 1.7.7 email/password authentication;
- standard PostgreSQL via node-postgres;
- separate `auth` and `app` schemas;
- portable SQL migrations;
- restricted `ai_data_runtime` database role;
- transaction-local authenticated-user context;
- PostgreSQL row-level-security policies;
- seeded Rosie Dazzlers, Devil n Dove and Personal workspaces;
- first-user owner bootstrap with advisory-lock protection;
- authenticated Next.js sign-in/sign-out and workspace UI;
- authenticated `/api/workspaces` endpoint;
- migration and isolation verification scripts;
- PostgreSQL 18 integration service in GitHub Actions;
- frozen-lockfile CI after dependency bootstrap;
- source-of-truth migration from Supabase to portable PostgreSQL.

### Acceptance evidence

GitHub Actions verified against a fresh PostgreSQL 18 instance:

- dependency install: PASS;
- Better Auth schema migration: PASS;
- application workspace migration: PASS;
- typecheck: PASS;
- lint/static checks: PASS;
- web production build: PASS;
- Chrome extension production build: PASS;
- shared-contract tests: PASS;
- first authenticated user receives owner access to all three initial workspaces: PASS;
- second authenticated user receives no workspace access: PASS;
- RLS-scoped workspace query after switching users: PASS.

### Hosted database status

No persistent hosted database is required to promote this build. Neon is the selected initial managed PostgreSQL provider and can be provisioned when the web application is ready for deployment. The repository remains portable to another PostgreSQL host.

### Next

Build 003 — Page DOM Inspector.

## Build 003 — Page DOM Inspector

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 003 pull request.

### Goal

Allow the Chrome side-panel extension to inspect the user-selected active page and return a bounded structural snapshot for later extraction builds.

### Delivered

- temporary `activeTab` + `scripting` page access;
- no persistent broad host permissions;
- bounded page-inspection contract;
- title, URL, language, meta description and canonical URL capture;
- structural counts for elements, links, images, headings, tables and forms;
- bounded visible-element summaries with safe attributes;
- explicit exclusion of form values and browser/page storage;
- repeating child-signature analysis;
- ranked candidate record-container scoring;
- sample text previews for candidate containers;
- Chrome-restricted-page error handling;
- side-panel metrics, candidate results and inspection diagnostics;
- source-of-truth security and architecture decision updates.

### Verification

GitHub Actions verified the complete repository on the Build 003 executable head:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- typecheck: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing database isolation acceptance: PASS.

### Security notes

- inspection happens only after user invocation of the extension;
- `activeTab` supplies temporary host access;
- `scripting` injects the bundled inspector into the selected tab;
- the extension does not request `<all_urls>`;
- snapshots are deliberately capped;
- input values, passwords, cookies, local/session storage and page JavaScript state are not collected.

### Next

Build 004 — Visual Element Picker.

## Build 004 — Visual Element Picker

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 004 pull request.

### Goal

Turn page inspection into an interactive field-selection workflow that can identify one chosen element and reveal repeated peer fields for later extraction recipes.

### Delivered

- point-and-click element selection from the Chrome side panel;
- hover highlight overlays and live selector tooltip;
- Escape and side-panel cancellation;
- exact selector generation using stable IDs, semantic attributes, classes and structural fallback;
- generalized selector generation for repeated peer fields;
- exact and generalized match counts;
- safe visible-text and attribute summary;
- selector preview with temporary page highlights;
- preview sample texts;
- automatic preview overlay removal;
- selector-cardinality reporting instead of assuming uniqueness;
- extension version 0.4.0;
- source-of-truth decision and security updates.

### Verification

GitHub Actions verified the complete repository on the Build 004 executable head:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- typecheck: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- tests: PASS.

### Security notes

- no new persistent host permissions were added;
- Build 004 reuses temporary `activeTab` and `scripting` access;
- selected page clicks are intercepted so the picker does not accidentally navigate or submit;
- preview only highlights matches and does not activate them;
- safe-attribute rules from Build 003 remain in force.

### Next

Build 005 — Repeating Record Detection.

## Build 005 — Repeating Record Detection

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 005 pull request.

### Goal

Turn raw DOM structure and Build 004 field selections into ranked, explainable repeated-record groups that can become the row boundary for extraction recipes.

### Delivered

- automatic repeated list, table, row, article and card detection;
- field-guided record-boundary inference from a selected field;
- deterministic structural signatures that ignore record-identity test attributes;
- repeat-ratio scoring;
- structural-consistency scoring;
- text, link and image coverage metrics;
- descendant-richness measurement;
- semantic structure bonuses;
- navigation/header/footer penalties;
- bounded candidate ranking;
- confidence scores and human-readable diagnostics;
- record selector generation;
- sample record text, links, images and field hints;
- on-page record-boundary preview overlays;
- extension version 0.5.0;
- no additional Chrome permissions.

### Verification

GitHub Actions verified the complete repository on the Build 005 executable head:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- TypeScript checks: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing tests: PASS.

### Security notes

- detection remains local to the user-invoked active tab;
- no AI or external service receives page data in Build 005;
- record detection does not activate page elements;
- preview overlays ignore pointer input and remove themselves automatically;
- confidence reflects structural evidence only and is not treated as factual certainty.

### Next

Build 006 — Extraction Recipe Engine.

## Build 006 — Extraction Recipe Engine

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 006 pull request.

### Goal

Turn a detected repeated-record group into a portable, versioned recipe that extracts structured fields deterministically from every matched record.

### Delivered

- extraction recipe schema version 1;
- record-group-to-recipe workflow;
- field derivation from Build 004 visual selections;
- selector derivation tested across the complete record group;
- manual field authoring/editing;
- text extraction;
- safe arbitrary-attribute extraction;
- link href extraction;
- image src extraction;
- relative link/image normalization to absolute URLs;
- required-field validation warnings;
- deterministic trim, whitespace, lowercase, uppercase, number and currency transforms;
- per-run populated/empty/required-missing statistics;
- bounded local execution capped at 500 records;
- structured row preview;
- portable JSON recipe output including tested source URL;
- extension version 0.6.0;
- no database persistence or AI dependency.

### Verification

GitHub Actions verified the complete repository on the Build 006 final development head:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- TypeScript checks: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing tests: PASS.

### Security notes

- recipe execution is local to the user-invoked active tab;
- field queries are scoped to each repeated-record element;
- extraction is read-only and does not activate page controls;
- manual attribute extraction blocks form `value`, `srcdoc`, event-handler attributes and invalid attribute names;
- cookies, browser storage, live form values and page JavaScript state remain out of scope;
- no page content is sent to an AI provider or external extraction service;
- recipes are not automatically persisted.

### Next

Build 007 — Spreadsheet Preview & Review.

## Build 007 — Spreadsheet Preview & Review

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 007 pull request.

### Goal

Turn Build 006 extraction results into a reviewable working dataset where a human can correct values, exclude bad rows, curate columns and save an approved local snapshot without mutating source evidence or production business data.

### Delivered

- spreadsheet-style review grid across all extracted rows;
- editable reviewed cell values;
- edited-cell highlighting;
- row inclusion/exclusion controls;
- include-all and exclude-all actions;
- full review reset;
- all/included/warnings row filters;
- column move-left/move-right ordering;
- non-destructive column drop;
- individual/all dropped-column restore;
- current required-field warning recalculation after edits;
- excluded-row and warning-state presentation;
- included/excluded/edited/warning review statistics;
- reviewed-dataset schema version 1;
- extension-local reviewed dataset persistence;
- retention of up to 20 recent reviewed datasets;
- storage-quota/error reporting;
- extension version 0.7.0;
- no PostgreSQL, Rosie Dazzlers, Devil n Dove or AI writes.

### Verification

GitHub Actions verified the Build 007 implementation through the existing complete repository matrix:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- TypeScript checks: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing tests: PASS.

### Security notes

- the review grid works on a copy of extraction results;
- edits do not mutate the inspected webpage or original extraction run;
- saved snapshots use only the extension page's own local storage;
- inspected-site browser storage remains untouched;
- row exclusion and column dropping remain reversible review metadata;
- reviewed datasets do not write into business systems or backend persistence.

### Next

Build 008 — AI Suggested Fields.

## Build 008 — AI Suggested Fields

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 008 pull request.

### Goal

Add an optional, authenticated AI interpretation layer that turns natural-language extraction intent plus bounded record samples into useful field-schema suggestions without giving AI control over scraping selectors.

### Delivered

- authenticated `POST /api/ai/suggest-fields` endpoint;
- bounded request parser for extraction intent, source URL, record selector metadata, record samples and existing fields;
- strict structured-output schema for suggested fields;
- semantic types including name, price, URL, image, SKU, category, location, year, description, quantity, rating, phone and email;
- preferred extraction-source guidance;
- required-field guidance;
- deterministic transform recommendations;
- per-field confidence and rationale;
- selector-strategy guidance without AI-generated CSS selectors;
- Vercel AI Gateway integration using a server-only key;
- configurable `AI_SUGGESTION_MODEL`;
- default model `openai/gpt-5.4-mini`;
- input/output/total-token telemetry;
- cost estimate for the default model using the current AI Gateway catalog rate captured on 2026-10-03;
- deterministic zero-cost fallback when the Gateway key is missing, the provider fails, the request times out or structured output is unusable;
- authenticated web UI for extraction intent and suggestion review;
- extension-side bounded AI context JSON handoff;
- automated parser, fallback, structured-output sanitizer and cost-estimate verification;
- extension version 0.8.0;
- GitHub verification now runs on merged `main` pushes as well as `dev` and pull requests.

### Verification

GitHub Actions verified the complete Build 008 executable implementation using the normal repository matrix without a live AI key:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- TypeScript checks: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing tests: PASS;
- AI suggestion parser/fallback/sanitizer/cost checks: PASS.

### Security notes

- AI Gateway credentials never enter the browser bundle or Chrome extension;
- the AI route requires an authenticated session;
- page context is deliberately bounded and excludes the full DOM;
- cookies, inspected-site storage, live form values and page JavaScript state are excluded;
- AI output is schema-constrained and sanitized again server-side;
- AI cannot create or approve CSS selectors;
- failed or unavailable AI degrades to deterministic field suggestions rather than failing Production;
- no AI suggestion writes directly into PostgreSQL, Rosie Dazzlers or Devil n Dove.

### External setup

The platform is fully buildable and usable without AI credentials through deterministic fallback. Live model-backed suggestions require a server deployment with an `AI_GATEWAY_API_KEY`. The connected Vercel app currently exposes no Vercel team/project to this conversation, so deployment/key provisioning cannot be completed autonomously in Build 008.

### Next

Build 009 — Pagination & Infinite Scroll.

## Build 009 — Pagination & Infinite Scroll

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 009 pull request.

### Goal

Run a deterministic extraction recipe across bounded pagination patterns while preserving same-origin safety, source-page evidence and explicit stop conditions.

### Delivered

- next-button detection;
- numbered-page progression;
- load-more detection;
- safe infinite-scroll progression;
- candidate confidence and diagnostics;
- exact first-control selection with fresh control detection after each successful step;
- same-origin pagination enforcement;
- optional current-site host permission for page-navigation modes;
- built-in grant and remove-site-access controls;
- refusal to follow cross-origin pagination;
- refusal to click disabled controls or form submit buttons as pagination;
- configurable maximum pages/steps (1–50);
- configurable maximum records (1–5,000);
- configurable per-step wait window (1–15 seconds);
- cancellation;
- repeated-page/state detection;
- no-new-record and stalled-growth stop conditions;
- multi-page execution of Build 006 recipes;
- cumulative load-more/infinite-scroll row protection;
- per-step URL/extraction/addition summaries;
- per-row page number and source URL evidence;
- paginated result handoff to the Build 007 review grid;
- extension version 0.9.0;
- no new automatically granted broad host permission.

### Verification

The Build 009 executable implementation passed the complete repository verification matrix after the pagination selector typing correction and optional-site-access integration:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- TypeScript checks: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing tests including AI suggestion checks: PASS.

### Security notes

- load-more/infinite-scroll use the existing temporary page grant;
- Chrome navigation revokes temporary active-tab access, so next/numbered modes request an optional grant only for the current origin;
- the optional site grant is user-approved and removable;
- navigation never follows a different origin;
- hard limits and progress checks prevent unbounded page traversal;
- Build 009 does not attempt CAPTCHA bypass, authentication bypass or anti-bot evasion.

### Manual browser action

For next-button or numbered-page pagination, click **Allow this site for pagination** and approve Chrome's site permission prompt. No other application, service or command-line setup is required.

### Next

Build 010 — Detail/Subpage Enrichment.

## Build 010 — Detail/Subpage Enrichment

Date: 2026-10-04

Status: COMPLETE. Promotion is performed through the Build 010 pull request.

### Goal

Enrich extracted parent rows from public detail/subpages while keeping requests same-origin, bounded, credential-free and reviewable.

### Delivered

- parent detail-URL field selection;
- optional current-site host permission request and removal;
- same-origin detail URL normalization;
- credential-free public HTML fetches with `credentials: "omit"`;
- cross-origin detail-link and redirect blocking;
- successful-HTML response validation;
- inert `DOMParser` parsing without fetched script execution;
- H1 title and meta-description presets;
- custom detail CSS selectors;
- text, meta-content, link, image and safe-attribute extraction;
- trim, whitespace, case, number and currency transforms;
- required-field validation warnings;
- duplicate parent/detail field-key validation;
- configurable 1–500 unique detail-page cap;
- configurable 0–5,000 ms inter-request delay;
- configurable 2–30 second per-page timeout;
- repeated detail URLs fetched once and reused;
- optional parent-row deduplication by identical detail URL;
- parent/detail field merging;
- per-row requested/final URL, status, reuse and error evidence;
- enrichment from ordinary Build 006 runs and Build 009 paginated results;
- merged-result handoff to the Build 007 spreadsheet review grid;
- extension version 0.10.0.

### Verification

GitHub Actions verified the complete Build 010 executable implementation after the detail-transform typing correction:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- TypeScript checks: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing tests including AI suggestion checks: PASS.

### Security notes

- detail requests stay on the source origin;
- target-site cookies and credentials are omitted;
- cross-origin redirects are rejected;
- fetched HTML is parsed inertly and scripts are not executed;
- unsafe form/event attributes remain blocked;
- network fetch reuse does not silently delete parent rows;
- duplicate parent-row removal is an explicit user option;
- no enriched result writes automatically to business systems or PostgreSQL.

### Manual browser action

Click **Allow this site for detail enrichment** and approve Chrome's current-site permission prompt before running detail-page fetches. Existing permission from Build 009 may already satisfy this requirement on the same origin.

### Next

Build 011 — CSV/XLSX/JSON Export.

## Build 011 — CSV/XLSX/JSON Export

Date: 2026-10-05

Status: COMPLETE. Promotion is performed through the Build 011 pull request.

### Goal

Export reviewed or raw datasets from the local review workspace in portable formats without introducing a backend export service.

### Delivered

- CSV export;
- real XLSX generation as an Office Open XML workbook;
- structured JSON export;
- reviewed/edited value view;
- original raw extraction value view;
- included-row-only or all-row export;
- visible-column-only or all-column export;
- optional row warnings;
- optional source URL, pagination page/step, detail URL, detail fetch index, HTTP status, fetch reuse and detail error evidence;
- structured JSON source evidence;
- automatic availability for ordinary extraction, paginated extraction and detail-enriched review grids;
- preservation of numeric values in XLSX;
- sanitized local filenames;
- UTF-8 CSV BOM for spreadsheet compatibility;
- CSV formula-like string neutralization;
- raw exports retain original extraction warnings;
- extension version 0.11.0;
- no backend, AI-provider or business-system dependency for file generation.

### Verification

GitHub Actions verified the complete Build 011 executable implementation before source-of-truth finalization:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- TypeScript checks: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing tests including AI suggestion checks: PASS.

### Security notes

- export files are created locally in the extension;
- no dataset is uploaded for export generation;
- CSV formula-like strings are neutralized;
- XLSX string cells are emitted explicitly as strings, not formulas;
- raw/reviewed export choices remain explicit;
- source/detail evidence is optional;
- export does not write to Rosie Dazzlers, Devil n Dove or PostgreSQL.

### Manual setup

No manual application, service, API, database or command-line setup is required for Build 011.

### Next

Build 012 — Saved Scrapers & Templates.

## Build 011 — CSV/XLSX/JSON Export

Date: 2026-10-05

Status: COMPLETE. Promotion is performed through the Build 011 pull request.

### Goal

Export reviewed, paginated and detail-enriched datasets as portable local files while preserving the user's review decisions and source evidence options.

### Delivered

- CSV export;
- real Office Open XML XLSX export;
- structured JSON export;
- reviewed/edited versus original raw value selection;
- included-row-only versus all-row selection;
- visible-column-only versus all-column selection;
- optional row warning export;
- optional source-page/detail-page evidence export;
- source URL, pagination step, detail URL, detail fetch index/status/reuse/error evidence columns where applicable;
- structured JSON evidence metadata;
- sanitized filenames with generation date;
- UTF-8 CSV with BOM for spreadsheet compatibility;
- CSV formula-like string neutralization for values beginning with =, +, - or @;
- XLSX numeric values preserved as numeric cells;
- XLSX string values emitted explicitly as inline strings;
- XLSX workbook generated locally as a ZIP-based Office Open XML package;
- export controls available automatically in every Build 007 review workspace, including Build 009 paginated and Build 010 detail-enriched datasets;
- extension version 0.11.0;
- no backend export service, AI dependency or new Chrome permission.

### Verification

GitHub Actions verified the exact Build 011 executable head after the raw-warning alignment correction:

- PostgreSQL 18 service initialization: PASS;
- Better Auth and application migrations: PASS;
- workspace RLS acceptance: PASS;
- TypeScript checks: PASS;
- lint/static checks: PASS;
- Next.js production build: PASS;
- Chrome extension production build: PASS;
- existing tests including AI suggestion checks: PASS.

### Security notes

- files are generated entirely in the extension;
- no dataset content is uploaded for export;
- raw export warnings remain tied to raw extraction values;
- reviewed export warnings remain tied to current reviewed values;
- CSV formula-like strings are neutralized;
- filenames are sanitized;
- XLSX is a real workbook package rather than a renamed CSV;
- exports do not write into PostgreSQL, Rosie Dazzlers or Devil n Dove.

### Manual setup

None. Build 011 requires no additional browser permission, external application, service account or command-line action.

### Next

Build 012 — Saved Scrapers & Templates.


## Build 012 — Saved Scrapers & Templates

Date: 2026-10-05

Status: COMPLETE. Promotion is performed through the Build 012 pull request.

### Goal

Turn one-off extraction recipes into a reusable local scraper library with site templates, explicit revision history and a pre-run breakage check.

### Delivered

- Chrome-local saved scraper library;
- saved scraper and reusable site-template item types;
- built-in HTML table, schema.org product-card and semantic article starter templates;
- direct loading of saved scrapers from the main side panel without repeating record detection;
- save-current-recipe flow from the recipe builder;
- save-as-site-template flow;
- editable loaded record selectors;
- same-site library hints based on the saved source origin;
- explicit revision numbers;
- up to 12 prior recipe revisions retained per saved item;
- prior revision loading without silently overwriting the current saved revision;
- current-page breakage detection for the record selector and every saved field selector;
- healthy, degraded and broken compatibility outcomes;
- per-field selector coverage percentages across up to 100 sampled records;
- required-field coverage warnings;
- invalid-selector detection;
- zero-record breakage detection;
- compatibility-check history on the saved item;
- deletion of obsolete saved scrapers/templates;
- extension version 0.12.0;
- Chrome local-storage permission only; no new host permission and no backend dependency.

### Verification target

The Build 012 promotion gate must pass the complete repository verification matrix:

- PostgreSQL 18 service initialization;
- Better Auth and application migrations;
- workspace RLS acceptance;
- TypeScript checks;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- existing tests including AI suggestion checks.

### Security notes

- saved recipes remain in Chrome local storage;
- no extracted dataset is persisted by the scraper library;
- no new broad host permission is granted automatically;
- compatibility checks execute only against the current tab under the existing active-tab model;
- the breakage check evaluates CSS selector coverage only and does not bypass authentication, CAPTCHAs or anti-bot controls;
- revision restoration is explicit and does not silently overwrite a newer saved recipe.

### Manual setup

None. Chrome grants the extension-local storage capability from the updated manifest when Build 012 is installed or reloaded.

### Next

Build 013 — Historical Change Detection.


## Build 013 — Historical Change Detection

Date: 2026-10-05

Status: COMPLETE. Promotion is performed through the Build 013 exact-tree production path.

### Goal

Compare reviewed extraction results over time without silently treating every new scrape as authoritative.

### Delivered

- historical change detection embedded in the Build 007 reviewed spreadsheet workflow;
- explicit identity-field selection from currently visible reviewed columns;
- validation that every included row has a non-empty unique identity;
- explicit baseline capture;
- explicit subsequent version capture;
- local historical series keyed by source scope, recipe name and identity field;
- record-version snapshots;
- per-record field observations for every retained visible field;
- added record detection;
- removed record detection;
- changed-field detection for records with stable identities;
- unchanged record counting without review-queue noise;
- per-capture added/removed/changed/unchanged summary;
- pending change review queue;
- mark-reviewed, dismiss and reopen queue actions;
- per-change before/after field observations;
- retained version list with record counts and timestamps;
- clear-history control scoped to the selected identity field;
- maximum 500 included records per snapshot;
- maximum 20 retained snapshots per historical series;
- maximum 1,000 retained change events per series;
- maximum 30 historical series in extension-local storage;
- extension version 0.13.0;
- no backend historical database or scheduled job dependency.

### Verification target

The Build 013 promotion gate must pass the complete repository verification matrix:

- PostgreSQL 18 service initialization;
- Better Auth and application migrations;
- workspace RLS acceptance;
- TypeScript checks;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- existing tests including AI suggestion checks.

### Security and data-handling notes

- historical captures are user-triggered, never automatic;
- only included reviewed rows and visible reviewed fields are captured;
- history remains in Chrome extension-local storage;
- no historical observation is written to Rosie Dazzlers, Devil n Dove or PostgreSQL;
- source query strings and fragments are excluded from the history series scope;
- detected changes remain pending until the user reviews or dismisses them;
- Build 013 introduces no new Chrome host permission.

### Manual setup

None. Build 013 reuses the Chrome local-storage permission already introduced by Build 012.

### Next

Build 014 — Rosie Dazzlers Competitive Intelligence.


## Build 014 — Rosie Dazzlers Competitive Intelligence

Date: 2026-10-06

Status: COMPLETE. Promotion is performed through the protected Build 014 pull-request path.

### Goal

Turn reviewed public Ontario auto-detailing facts into a reusable, evidence-preserving competitive-intelligence dataset for Rosie Dazzlers.

### Delivered

- Rosie Dazzlers competitive-intelligence panel inside the reviewed spreadsheet workflow;
- automatic field-mapping suggestions with operator overrides;
- explicit Ontario-detailer verification gate before dataset writes;
- business-name normalization with source-hostname fallback;
- service/package/add-on/promotion classification;
- detailing category normalization;
- CAD price and price-range normalization;
- starting-at price detection;
- vehicle-size normalization;
- mobile/fixed-location/both normalization;
- Ontario service-area normalization;
- package-content conversion to canonical detailing facts rather than retained marketing prose;
- source URL, source scope, source row and retrieval-time evidence on normalized offerings;
- local Ontario detailer dataset;
- latest dataset statistics for detailers, source series, offerings and changes;
- source-scoped competitor snapshot series;
- added offering detection;
- removed offering detection;
- changed normalized-field detection;
- recent competitor change-history review;
- maximum 300 included reviewed rows per capture;
- maximum 75 retained source/business series;
- maximum 12 snapshots per source/business series;
- maximum 500 change events per source/business series;
- extension version 0.14.0;
- no new Chrome permission, backend service or Rosie Dazzlers production write path.

### Data-handling rules

- only included reviewed rows can enter the Ontario dataset;
- the operator must explicitly verify the businesses are Ontario auto detailers;
- the dataset contains public business facts for internal research and comparison only;
- package-content prose is converted to canonical detailing features;
- customer or personal information is outside this model and must not be mapped;
- every normalized offering retains its public source URL and retrieval time;
- query strings and URL fragments are removed from comparison scope;
- repeated captures compare only the same source scope and business identity, preventing unrelated competitors from being marked removed;
- nothing writes directly into rosiedazzlers.ca, its production database, or another business system.

### Verification target

The Build 014 promotion gate must pass the complete repository verification matrix:

- PostgreSQL 18 service initialization;
- Better Auth and application migrations;
- workspace RLS acceptance;
- TypeScript checks;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- existing tests including AI suggestion checks.

### Manual setup

None. Build 014 reuses the Chrome local-storage permission already granted for saved scraper and history features.

### Next

Build 015 — Devil n Dove Supplier Intelligence.


## Build 015 — Devil n Dove Supplier Intelligence

Date: 2026-10-06

Status: COMPLETE. Promotion is performed through the protected Build 015 pull-request path.

### Goal

Turn reviewed public supplier product facts into normalized Devil n Dove package and usage economics while preserving a hard review boundary before any inventory integration.

### Delivered

- Devil n Dove supplier-intelligence panel inside the reviewed spreadsheet workflow;
- automatic field-mapping suggestions with operator overrides;
- supplier-name normalization with source-hostname fallback;
- required product-name mapping;
- supplier SKU capture and stable SKU-first staging identity;
- supplier image URL capture with HTTP/HTTPS validation;
- CAD package-price normalization;
- stock-units-per-package normalization;
- stock-unit and usage-unit normalization;
- operator defaults when supplier pages omit package or unit metadata;
- common conversion inference for litre→millilitre, kilogram→gram, metre→centimetre and pound→ounce;
- explicit usage-units-per-stock-unit mapping when supplier/catalog data provides it;
- total usage-unit calculation;
- cost-per-stock-unit calculation;
- cost-per-usage-unit calculation;
- normalization warnings for incomplete supplier economics;
- source URL, source scope, source row and retrieval timestamp evidence;
- local supplier inventory-integration staging dataset;
- pending, approved and rejected staging review states;
- approved items automatically return to pending when refreshed material supplier facts change;
- bounded price-observation history for refreshed staged products;
- local removal and review reopening controls;
- maximum 300 included reviewed supplier rows per staging capture;
- maximum 500 staged supplier items;
- maximum 24 retained price observations per staged item;
- extension version 0.15.0;
- no new Chrome permission, backend service or Devil n Dove production write path.

### Data-handling and integration rules

- only included reviewed spreadsheet rows can be staged;
- external supplier facts retain source URL and retrieval time;
- internal/user-owned Devil n Dove fields are not overwritten by this build;
- approval marks a record ready only for future integration staging;
- approval never performs a Devil n Dove API/database write;
- materially changed supplier facts invalidate prior approval and return the item to pending review;
- missing or ambiguous unit information is surfaced as a warning instead of silently inventing a conversion;
- package quantity defaults can be supplied by the operator and mapped supplier values take precedence;
- repeated observations retain bounded supplier price history;
- Build 018 remains the explicit business-system adapter boundary.

### Verification target

The Build 015 promotion gate must pass the complete repository verification matrix:

- PostgreSQL 18 service initialization;
- Better Auth and application migrations;
- workspace RLS acceptance;
- TypeScript checks;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- existing tests including AI suggestion checks.

### Manual setup

None. Build 015 reuses Chrome extension-local storage and requires no Devil n Dove API key or production credential.

### Next

Build 016 — Movie Metadata Module.


## Build 016 — Movie Metadata Module

Date: 2026-10-06

Status: COMPLETE. Promotion is performed through the protected Build 016 pull-request path.

### Goal

Enrich a personal owned movie collection from permitted metadata sources without losing ownership-specific information or auto-accepting ambiguous matches.

### Delivered

- local movie metadata module embedded in the reviewed spreadsheet workflow;
- existing owned-collection import from CSV;
- existing owned-collection import from JSON arrays or JSON records arrays;
- automatic collection-field mapping suggestions with operator overrides;
- append-import mode with duplicate identity protection;
- explicit replace-existing collection mode;
- append imports preserve existing ownership fields and previously approved metadata;
- owned movie identity support through IMDb ID, TMDb ID, UPC and title/year fallback;
- owned format preservation;
- shelf-location preservation;
- condition preservation;
- personal-notes preservation;
- permitted metadata-source profiles for IMDb datasets, TMDb API/export, OMDb API/export and other operator-confirmed API/dataset sources;
- reviewed metadata field mapping with provider-aware record-ID handling;
- metadata candidate title/year/UPC/external-ID normalization;
- genre, runtime, poster URL and overview normalization;
- source URL, source row and retrieval-time evidence;
- exact external-ID matching;
- exact UPC matching;
- title/year matching;
- token-based title similarity fallback;
- match scoring and reasons;
- exact, strong, ambiguous and unmatched classifications;
- competing-match detection when top owned candidates are too close;
- local match review queue;
- owned-title search and manual assignment for ambiguous/unmatched candidates;
- explicit approve, reject, reopen and remove actions;
- metadata approval may enrich canonical title, release year, genres, runtime, poster, overview, provider/source evidence and missing external IDs;
- metadata approval never replaces owned title, owned year, owned UPC, format, shelf location, condition or notes;
- maximum 5,000 imported collection rows per file;
- maximum 7,500 locally retained owned movies;
- maximum 500 reviewed metadata candidates per matching batch;
- maximum 1,000 retained match-review items;
- extension version 0.16.0;
- no new Chrome permission, backend dependency or external API credential requirement.

### Source and review rules

- Build 016 does not silently call third-party movie APIs;
- provider profiles identify metadata already obtained through permitted API/export/dataset workflows;
- source terms and API/dataset permission remain an operator responsibility;
- IMDb/TMDb/OMDb provider record IDs can populate the corresponding missing external ID for matching;
- ambiguous candidates are never auto-approved;
- unmatched candidates require manual owned-title assignment before approval;
- user-owned fields remain authoritative under every enrichment path;
- the module remains extension-local and does not modify an external movie library system.

### Verification target

The Build 016 promotion gate must pass the complete repository verification matrix:

- PostgreSQL 18 service initialization;
- Better Auth and application migrations;
- workspace RLS acceptance;
- TypeScript checks;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- existing tests including AI suggestion checks.

### Manual setup

None. CSV/JSON collection import and metadata review use existing Chrome extension-local storage. Live third-party API credentials are intentionally not required or stored by Build 016.

### Next

Build 017 — Scheduled & Repeatable Jobs.


## Build 017 — Scheduled & Repeatable Jobs

Date: 2026-10-06

Status: COMPLETE. Promotion is performed through the protected Build 017 pull-request path.

### Goal

Make saved extraction recipes repeatable on a schedule without turning the local-first extension into an unattended crawler or weakening source-policy and access-control boundaries.

### Delivered

- scheduled-jobs panel beside the saved scraper library;
- scheduling only for saved scraper items, not unconfigured templates;
- explicit source-policy review gate before job creation;
- source must be public or explicitly authorized;
- operator confirmation that applicable source terms and robots/crawl directives were reviewed where relevant;
- operator confirmation that the job does not require bypassing login, paywall, CAPTCHA or technical access controls;
- optional source-policy notes and review timestamp;
- daily scheduling by local hour;
- weekly scheduling by local weekday and hour;
- bounded interval scheduling from 1 hour to 30 days;
- one-shot Chrome alarms for due-work state;
- alarm reconciliation after extension install/update and browser startup;
- browser-action DUE badge when scheduled work is due;
- interactive same-origin execution only while the user is present;
- saved source-origin validation before execution;
- pinned saved-scraper revision on every job;
- stale-revision blocking when a saved scraper has changed;
- explicit Refresh + re-review flow to adopt a newer scraper revision;
- maximum 500 records per scheduled run;
- configurable per-job record cap;
- maximum 3 retries;
- configurable retry delay from 5 minutes to 24 hours;
- retry alarms without immediate false-due state;
- successful-run baseline snapshots;
- deterministic row fingerprints and dataset signature;
- duplicate-aware added/removed row counts between successful snapshots;
- local change notification when a subsequent snapshot differs;
- browser-action NEW badge for unread change notifications;
- unread/read notification state;
- bounded 30-attempt run history per job;
- bounded 100 retained change notifications;
- maximum 50 local scheduled jobs;
- pause/enable/delete controls;
- manual Run now support for testing a scheduled job under the same policy and source-origin boundary;
- local run outcome recording for success, detected change and failure;
- extension version 0.17.0;
- Chrome alarms permission added;
- no remote scheduled browser, cloud crawling worker, proxy, automatic CAPTCHA handling or business-system integration.

### Scheduling and safety rules

- Chrome alarms only mark a job due; they do not scrape pages in the background;
- extraction requires an active user-visible source page on the job's approved origin;
- jobs remain pinned to the reviewed scraper revision;
- a newer scraper revision must be explicitly adopted with a fresh source-policy review;
- no job can be created until every source-policy gate passes;
- failed extraction attempts never cause access-control workarounds;
- retries are bounded by both count and delay;
- the first successful run is a baseline and does not generate a false change notification;
- change notifications compare deterministic local snapshots and stay local;
- no scheduled result writes directly into Rosie Dazzlers, Devil n Dove or another external system;
- Build 018 remains the explicit integration-adapter boundary.

### Verification target

The Build 017 promotion gate must pass the complete repository verification matrix:

- PostgreSQL 18 service initialization;
- Better Auth and application migrations;
- workspace RLS acceptance;
- TypeScript checks;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- existing tests including AI suggestion checks.

### Manual setup

None. Build 017 uses extension-local storage plus the Chrome alarms permission declared by extension version 0.17.0. No external scheduler, API key or server-side cron service is required.

### Next

Build 018 — Business-System Integrations.


## Build 018 — Business-System Integrations

Date: 2026-10-06

Status: COMPLETE. Promotion is performed through the protected Build 018 pull-request path.

### Goal

Complete the business-system boundary with explicit, review-first adapters for Rosie Dazzlers and Devil n Dove while preventing shared-table coupling, silent overwrites and invented production credentials/endpoints.

### Delivered

- Business-System Integrations panel in the extension;
- explicit adapter target selection for Rosie Dazzlers and Devil n Dove;
- Rosie Dazzlers adapter contract `rosie-dazzlers.competitive-intelligence.v1`;
- Devil n Dove adapter contract `devil-n-dove.supplier-inventory.v1`;
- Rosie adapter consumes only the latest normalized Ontario competitor offerings from Build 014;
- Devil n Dove adapter consumes only supplier staging items explicitly approved in Build 015;
- target-specific safe payload fields;
- source URL and retrieval-time evidence retained on every adapter operation;
- optional current-business-system snapshot import from JSON;
- snapshot target validation;
- snapshot current values by stable integration key;
- snapshot-declared `userOwnedKeys` protection;
- deterministic dry-run create/update/unchanged/blocked classification;
- field-level before/after diff for updates;
- user-owned changed fields excluded from adapter payloads;
- blocked-only records produce no exportable write;
- dry-run fingerprint generated from target, source dataset revision, snapshot timestamp and safe payload diff;
- local persisted integration batches;
- explicit checkbox approval of the exact dry-run fingerprint;
- approval rejected if the source dataset changed after dry-run generation;
- approval rejected when the batch contains no exportable operations;
- draft batch cancellation;
- exported batches cannot be retroactively cancelled;
- approved package export as formatted JSON;
- package includes target, adapter contract, contract version, batch ID, approval timestamp, generated timestamp and package fingerprint;
- package includes only create/update operations;
- unchanged and blocked records never enter an approved package;
- local append-style audit entries for dry-run creation, approval, export and cancellation;
- maximum 30 retained integration batches;
- maximum 250 retained audit entries;
- extension version 0.18.0;
- no new browser permission;
- no business credentials stored;
- no shared business database tables;
- no direct production writes.

### Rosie Dazzlers adapter fields

The v1 Rosie contract can hand off only competitive-intelligence fields:

- competitor business name;
- offering name/type/category;
- minimum and maximum CAD price;
- starting-at-price flag;
- vehicle size;
- service areas;
- mobile/fixed/both delivery mode;
- canonical package-content facts;
- source URL/scope;
- retrieval timestamp.

Customer, booking, quote, payment, staff, internal-note and other operational records are not part of this adapter.

### Devil n Dove adapter fields

The v1 Devil n Dove contract can hand off only approved supplier/inventory-economics fields:

- supplier name;
- product name;
- supplier SKU;
- supplier image URL;
- package price and quantity;
- stock and usage units;
- usage units per stock unit;
- total usage units;
- cost per stock unit;
- cost per usage unit;
- source URL/scope;
- retrieval timestamp.

Unapproved supplier staging rows never enter the adapter.

### Transport decision

Repository and business-app review did not identify a dedicated authenticated intake endpoint for these exact new contracts. Build 018 therefore does not guess an unrelated admin endpoint, authentication model or database write. The approved transport is a versioned JSON integration package that the corresponding business application can consume once it deliberately implements the matching contract. This preserves the architecture rule that business systems remain independent and consume approved outputs through explicit adapters.

### Dry-run snapshot contract

An optional current-state snapshot contains:

- `target`;
- `capturedAt`;
- `records[]`;
- per-record stable `integrationKey`;
- current external-field `values`;
- `userOwnedKeys` that the adapter must never replace.

Without a snapshot, candidates are deliberately classified as creates rather than pretending the platform knows current production state.

### Audit and approval rules

- every persisted dry run records an audit entry;
- approval applies only to the exact batch/fingerprint;
- approval verifies the source dataset has not changed;
- user-owned fields remain excluded even after approval;
- export records the controlled handoff in the audit trail;
- cancellation is recorded before export;
- no audit action performs a network write.

### Verification target

The Build 018 promotion gate must pass the complete repository verification matrix:

- PostgreSQL 18 service initialization;
- Better Auth and application migrations;
- workspace RLS acceptance;
- TypeScript checks;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- existing tests including AI suggestion checks.

### Manual setup

None is required to use dry-run, approval, audit and package export. Live ingestion remains intentionally unavailable until Rosie Dazzlers or Devil n Dove exposes and documents the matching authenticated v1 intake contract.

### Roadmap state

Build 018 completes the currently numbered roadmap. Later candidates remain explicitly deferred until the local-first product demonstrates the need.


## Roadmap Planning — Builds 019–029

Date: 2026-10-06

Status: PLANNED — QUEUED.

Build 018 completed the original numbered roadmap. The next execution sequence is now deliberately defined rather than leaving the deferred-candidate list unordered.

### Ordered queue

1. Build 019 — Authenticated Workspace Binding & Extension Session Bridge
2. Build 020 — Workspace Persistence & Cross-Device Sync Foundation
3. Build 021 — Persistent Intelligence, History & Audit Continuity
4. Build 022 — Integration Contract Verification & Consumer Readiness
5. Build 023 — Advanced Recipe Drift Detection & Repair Workbench
6. Build 024 — Mobile Barcode & Camera Intake
7. Build 025 — Remote Execution Provider Abstraction & Cloud Worker Readiness
8. Build 026 — Controlled Remote Browser Pilot & Egress Policy
9. Build 027 — Configurable Workspace Types & Domain Profiles
10. Build 028 — Plugin & Connector SDK Foundation
11. Build 029 — Production Learning, Cost Review & Roadmap Renewal

### Sequencing decision

Authenticated workspace/session binding and durable persistence come before remote browser infrastructure because the platform already has Better Auth/PostgreSQL/RLS while many extension workflows remain browser-local. Remote execution is split into provider-neutral readiness and a later controlled provider pilot so cost, credentials, egress and source policy are explicit before unattended execution exists.

### Manual-input gates

- Build 019: possible one-time extension origin/trusted-origin and production sign-in proof;
- Build 022: no live business-app intake activation until the consuming app implements the exact shared contract;
- Build 024: one-time mobile camera permission only when barcode scanning is used;
- Build 026: explicit remote-browser provider selection and encrypted credential setup; secrets must never be pasted into chat or committed to GitHub.

Detailed implementation order, acceptance criteria and manual walkthroughs are maintained in `docs/NEXT_BUILDS_019_029.md`.

### Promotion rule

Every numbered build remains subject to the established exact-tree path: dev implementation → full Verify GREEN → protected dev→main PR → PR-context Verify GREEN → SHA-pinned merge → exact dev/main tree confirmation → main Production Verify GREEN.
