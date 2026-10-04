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

Build 007 — Spreadsheet Preview & Review.


## Persistence and authentication

The platform uses provider-portable PostgreSQL with Better Auth. Neon is the initial managed PostgreSQL host, while migrations and workspace isolation remain standard PostgreSQL.
