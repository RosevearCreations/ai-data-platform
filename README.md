# AI Data Platform

Shared AI-assisted web extraction, data intelligence and automation platform for Rosevear Creations applications.

## Workspaces

- Rosie Dazzlers — Ontario detailer intelligence, competitor pricing, supplier/service research, SEO evidence.
- Devil n Dove — supplier pricing, raw-material and tool enrichment, product research, inventory intelligence.
- Personal — movie library metadata enrichment and other private datasets.

## Core principle

The platform is local-first where practical: the browser extension inspects and extracts page data, AI helps interpret structure and meaning, and ordinary deterministic code performs bulk extraction, comparison, calculation, storage and export.

## Development workflow

- `dev` — active development and validation.
- `main` — promoted, reviewed baseline.
- Every build updates `docs/BUILD_LOG.md`.
- Architectural decisions are recorded in `docs/DECISIONS.md`.

## Source of truth

Start with:

- [Product](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [AI Strategy](docs/AI_STRATEGY.md)
- [Scraping Policy](docs/SCRAPING_POLICY.md)
- [Security](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Build Log](docs/BUILD_LOG.md)
- [Decisions](docs/DECISIONS.md)

## Build 000

Build 000 establishes the shared platform foundation and source-of-truth documentation. No production scraping automation is enabled by Build 000.

## Executable applications

- `apps/web` — Next.js dashboard shell.
- `apps/extension` — Chrome Manifest V3 side panel with temporary active-tab DOM inspection.
- `packages/contracts` — shared TypeScript platform contracts.

See [Development](docs/DEVELOPMENT.md) for install, build, verification and extension-loading instructions.

## Current build

Build 051 — Controlled Consumer Activation & Idempotent Live Delivery.


## Persistence and authentication

The platform uses provider-portable PostgreSQL with Better Auth. Neon is the initial managed PostgreSQL host, while migrations and workspace isolation remain standard PostgreSQL.


## Build 044 application surface

The signed-in web application now includes `/data-library`, a read-only unified explorer over authorized durable workspace records. It supports workspace/type filtering, search, sorting, pagination, browser-local saved views, provenance inspection and raw-vs-normalized comparison without creating a duplicate library table.


## Build 045 application surface

The signed-in web application now includes `/collection-projects`, a durable workspace manager for named collection projects and their source bindings. It links project sources to current Source Policy and saved scraper/template evidence and reports readiness blockers without approving or executing collection.


## Build 046 application surface

The signed-in application now includes `/recipe-builder`, a durable visual authoring surface for the same version-1 extraction recipes used by the Chrome extension. It supports synchronized revisions, project-source presets, visual field editing, deterministic validation, portable JSON and bounded supplied-HTML preview without performing remote collection.


## Build 048 application surface

The signed-in application now includes `/data-review`, a durable workspace-scoped cleanup and approval workbench over existing reviewed-dataset versions. It snapshots the original payload, applies deterministic whitespace cleanup only to a working copy, identifies duplicate-cleaned rows, supports row exclusion/manual JSON correction, records append-only review events, and requires workspace owner/admin authority for terminal approval or rejection. Build 048 does not overwrite the source dataset or automatically write into downstream business systems.


## Build 049 application surface

The signed-in application now includes `/approved-data`, an approved-only publishing and export handoff workbench. A workspace owner/admin can turn one terminal Build 048 approval into one immutable publication snapshot, preserve source/review provenance and a publication fingerprint, export that exact snapshot as JSON or CSV, copy a compact handoff manifest, and withdraw future exports without rewriting the approved review or automatically mutating a downstream business system.


## Build 050 application surface

The signed-in application now includes `/approved-data/delivery`, which maps an immutable Build 049 publication into the existing Build 033 consumer contracts. Owner/admin users can create an immutable field mapping, prove the generated package through local conformance, test a configured consumer handshake, send an authenticated external dry-run, and inspect append-only receipt evidence that links the publication fingerprint, mapping fingerprint and package fingerprint. Build 050 does not enable live business-system mutation.


## Build 051 application surface

The signed-in application now includes `/approved-data/live-delivery`, the first controlled live-mutation path in the AI Data Platform. A workspace owner/admin can activate one exact Build 050 mapping for 24 hours only after a recent accepted external dry-run and a fresh consumer handshake proving both live mutation support and replay-key idempotency. Each live send requires a separate typed confirmation, reserves one canonical consumer/package delivery identity before the network call, sends the replay key as the Idempotency-Key, allows only bounded retry of transport-error outcomes with that same key, and never resends an accepted or rejected terminal delivery.
