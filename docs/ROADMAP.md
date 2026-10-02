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

## Build 002 — Supabase Auth & Workspace Isolation

- Supabase project integration;
- authentication;
- workspace schema;
- membership model;
- RLS;
- seed initial Rosie Dazzlers, Devil n Dove and Personal workspaces.

Acceptance: authenticated users only see permitted workspace data.

## Build 003 — Page DOM Inspector

- active-page inspection;
- DOM snapshot model;
- visible text/attribute capture;
- candidate container scoring.

Acceptance: extension can inspect a public test page and display candidate records.

## Build 004 — Visual Element Picker

- point-and-click field selection;
- highlight overlays;
- robust selector generation;
- selector preview.

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
