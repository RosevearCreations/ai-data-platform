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

Build 052 — Post-Delivery Reconciliation & Consumer State Verification.


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


## Build 052 application surface

The signed-in application now includes `/approved-data/reconciliation`, a read-only post-delivery verification workbench for accepted Build 051 live deliveries. The platform reconstructs the exact historical package from immutable publication/mapping evidence, requires the currently configured consumer origin to match the origin that accepted the live delivery, obtains a fresh `stateVerificationSupported=true` capability handshake, requests current values for only the delivered integration keys and governed fields, compares them server-side, and stores append-only matched/mismatched/missing fingerprints and field names. Build 052 never automatically repairs, rolls back, retries or sends a new mutation when drift is found.


## Build 053 application surface

The signed-in application now includes `/approved-data/reconciliation/triage`, where Build 052 drift becomes an explicit exception case and, when appropriate, an immutable corrective delivery plan. Owners/admins classify severity and resolution intent, investigate without changing reconciliation evidence, freeze exact affected keys/fields plus desired governed values from the original accepted package, and approve/reject/withdraw the planning artifact. Build 053 has no downstream consumer call, live activation or corrective execution endpoint.


## Build 054 application surface

The signed-in application now includes `/approved-data/reconciliation/corrective-delivery`. An approved Build 053 plan is reconstructed server-side into a new deterministic corrective package with its own package ID and replay key. Activation requires the exact original consumer origin, a fresh live/idempotency handshake, an accepted external dry-run and a target-specific typed confirmation. Live execution requires a second confirmation, durable reservation before the network call, `Idempotency-Key=<corrective replay key>`, terminal no-resend behavior for accepted/rejected outcomes and bounded same-key retries for transport uncertainty.


## Build 055 application surface

The signed-in application now includes `/approved-data/reconciliation/corrective-closure`. Accepted Build 054 corrective delivery is not considered resolved until the consumer independently returns current values for the exact corrective package scope. Build 055 withholds expected values from the verify request, stores append-only matched/drift/error evidence, requires the latest verification to be matched, then records an immutable closure row before the Build 053 case may transition to `closed`.

## Build 056 application surface

The signed-in application now includes `/approved-data/reconciliation/post-closure-regression`. A verified Build 055 closure can be read back again without sending expected values or performing a downstream mutation. Stable, regressed and error outcomes are retained as append-only post-closure evidence. Only the newest regressed check can support an explicit owner/admin reopen, and an immutable reopen row must exist before the closed Build 053 case may return to `open`. A reopened case cannot reuse its older Build 055 closure as proof for a later silent re-close.

