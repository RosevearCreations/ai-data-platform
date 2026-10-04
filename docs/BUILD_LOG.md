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
