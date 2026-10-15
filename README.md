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



## Build 057 application surface

The signed-in application now includes `/approved-data/reconciliation/reopened-planning`. Every governed Build 056 reopen may create one new re-triage cycle. Owners/admins classify the reopened regression, record investigation notes, choose a resolution intent, and—only for `plan-correction`—freeze a successor corrective plan from the exact fields proven regressed by Build 056 and the desired values already governed by the accepted predecessor corrective package. Build 057 performs no downstream consumer mutation. The legacy Build 053 corrective-plan insert path is denied once a case has Build 056 reopen evidence.

### Build 058 — Successor Corrective Delivery Activation & Idempotent Execution

Build 058 turns an approved Build 057 successor plan into a separate, short-lived corrective execution path. It reconstructs the accepted predecessor corrective package only as immutable evidence, derives a new successor package identity, requires a fresh consumer handshake and accepted dry-run, then performs live delivery with one deterministic replay/idempotency key and bounded same-key retries. Reopened exceptions cannot fall back to the legacy Build 054 activation/delivery write path.

Operator UI: `/approved-data/reconciliation/successor-delivery`.

### Build 059 — Successor Corrective Delivery Reconciliation & Re-Closure

Build 059 independently reads back an accepted Build 058 successor corrective package, preserves matched/drift/error evidence, and permits a reopened exception to close again only when the newest verification for that exact successor delivery is matched. Re-closure is recorded in a new immutable ledger; the original Build 055 closure, Build 056 reopen, Build 057 plan and Build 058 delivery remain historical evidence.

Operator UI: `/approved-data/reconciliation/successor-closure`.

### Build 060 — Post-Re-Closure Regression Monitoring & Recurrence Governance

Build 060 monitors the exact Build 058 successor package after a verified Build 059 re-closure. It records immutable stable/recurred/error read-back evidence and permits a second reopen only through a new recurrence ledger entry tied to the newest recurrent check. The prior closure, reopen, successor planning, execution, reconciliation and re-closure chain remains immutable.

Operator UI: `/approved-data/reconciliation/post-reclosure-regression`.

### Build 061 — Recurrent Exception Re-Triage & Next-Generation Corrective Planning

Build 061 consumes immutable Build 060 recurrence evidence and starts a distinct recurrence planning generation. It creates a new re-triage cycle and freezes a next-generation corrective plan only from fields proven recurrent by the latest post-re-closure read-back and values governed by the approved predecessor successor plan. Build 057 planning and the Build 058/059 execution chain remain historical evidence and cannot be reused after recurrence.

Operator UI: `/approved-data/reconciliation/recurrent-planning`.

### Build 062 — Next-Generation Corrective Delivery Activation & Idempotent Execution

Build 062 turns an approved Build 061 next-generation plan into a separate controlled execution generation. It reconstructs the accepted Build 058 successor package only as immutable predecessor evidence, derives a new next-generation package ID/replay key/fingerprint, requires a fresh authenticated live-capability handshake and accepted dry-run, then reserves one durable live-delivery row before transport. Retries reuse the exact replay/idempotency key and stop after five attempts; accepted/rejected results are terminal.

Operator UI: `/approved-data/reconciliation/next-generation-delivery`.

### Build 063 — Next-Generation Corrective Delivery Reconciliation & Re-Closure

Build 063 independently reads back an accepted Build 062 next-generation corrective package and records immutable matched/drift/error evidence. A recurrent exception may close again only when the newest verification for the exact Build 062 delivery is matched and the delivery/plan belongs to the newest recurrence generation. Re-closure is written to a distinct next-generation ledger that binds the predecessor Build 059 re-closure, Build 060 recurrence, Build 061 plan and Build 062 delivery.

Operator UI: `/approved-data/reconciliation/next-generation-closure`.

### Build 064 — Post-Next-Generation Re-Closure Regression Monitoring & Recurrence Governance

Build 064 monitors the exact Build 062 package after verified Build 063 re-closure. Stable, recurrent, rejected and transport-error read-backs are append-only evidence. Drift never reopens automatically: an owner/admin must explicitly govern recurrence from the newest recurrent check. The recurrence freezes the current Build 061–063 generation and direct closure is blocked until a later corrective generation creates fresh verified closure evidence.

Operator UI: `/approved-data/reconciliation/post-next-generation-reclosure`.


### Build 065 — Second-Recurrence Re-Triage & Successor-Generation Corrective Planning

Build 065 consumes immutable Build 064 second-recurrence evidence and starts a distinct successor-generation decision cycle. It re-triages only the newest governed second recurrence, limits correction scope to fields proven recurrent by the exact Build 064 read-back and already governed by the approved Build 061 plan, and freezes an independently reviewable successor-generation corrective plan without rewriting the Build 061–063 history.

Operator UI: `/approved-data/reconciliation/second-recurrence-planning`.


### Build 066 — Successor-Generation Corrective Delivery Activation & Idempotent Execution

Build 066 turns an approved Build 065 successor-generation plan into a separate controlled execution generation. It reconstructs the accepted Build 062 next-generation package only as immutable predecessor evidence, derives a fresh successor-generation package ID/replay key/fingerprint, requires a fresh authenticated live-capability handshake and accepted dry-run, then reserves one durable live-delivery row before transport. Retries reuse the exact replay/idempotency key, stop after five attempts, and accepted/rejected outcomes remain terminal.

Operator UI: `/approved-data/reconciliation/successor-generation-delivery`.


### Build 067 — Successor-Generation Corrective Delivery Reconciliation & Re-Closure

Build 067 independently reads back an accepted Build 066 successor-generation package and records immutable matched/drift/error evidence. The second-recurrence case may close again only when the newest verification for the exact Build 066 delivery is matched and the delivery/plan still belongs to the newest Build 064 recurrence generation. Re-closure is written to a distinct successor-generation ledger that binds the Build 063 re-closure, Build 064 recurrence, Build 065 plan and Build 066 delivery.

Operator UI: `/approved-data/reconciliation/successor-generation-closure`.


### Build 068 — Post-Successor-Generation Re-Closure Regression Monitoring & Recurrence Governance

Build 068 independently monitors the exact Build 066 successor-generation package after a verified Build 067 re-closure. Stable and recurrent read-backs are append-only evidence. Drift does not reopen a case automatically: owner/admin recurrence governance requires the newest recurrent check for the newest Build 067 re-closure, a reason and typed confirmation. Once recurrence is recorded, the Build 065–067 generation is frozen and stale/direct closure is blocked until a later corrective generation creates fresh verified closure evidence.

Operator UI: `/approved-data/reconciliation/post-successor-generation-reclosure`.


### Build 069 — Successor-Generation Recurrence Re-Triage & Subsequent-Generation Corrective Planning

Build 069 consumes the newest governed Build 068 successor-generation recurrence and starts a distinct subsequent-generation decision cycle. It re-triages only current recurrence evidence, narrows correction scope to fields still recurrent in the exact Build 068 read-back and already governed by the approved Build 065 plan, and freezes an independently reviewable subsequent-generation corrective plan bound to the exact accepted Build 066 package and Build 067 re-closure lineage.

Operator UI: `/approved-data/reconciliation/successor-generation-recurrence-planning`.


### Build 070 — Subsequent-Generation Corrective Delivery Activation & Idempotent Execution

Build 070 executes only an approved Build 069 subsequent-generation plan. It reconstructs and verifies the exact accepted Build 066 successor-generation predecessor package, derives a distinct deterministic subsequent-generation package/replay identity, requires a fresh authenticated live capability handshake plus accepted dry-run, opens a short activation window, reserves delivery evidence before the live request, reuses the exact replay/idempotency key for bounded retries, and treats accepted/rejected outcomes as terminal. Once execution begins, Build 069 re-triage and planning are frozen.

Operator UI: `/approved-data/reconciliation/subsequent-generation-delivery`.


### Build 071 — Subsequent-Generation Corrective Delivery Reconciliation & Re-Closure

Build 071 independently reconstructs the exact accepted Build 070 subsequent-generation package and performs read-only consumer state verification. It records immutable matched, drift, rejected and transport-error evidence, permits re-closure only from the newest matched verification for the newest governed Build 068 successor-generation recurrence, binds the new re-closure to Build 067 predecessor re-closure, Build 068 recurrence, Build 069 plan and Build 070 delivery/package identities, and strengthens the case-close guard without weakening earlier-generation fallbacks.

Operator UI: `/approved-data/reconciliation/subsequent-generation-closure`.


### Build 072 — Post-Subsequent-Generation Re-Closure Regression Monitoring & Recurrence Governance

Build 072 independently reads back the exact accepted Build 070 subsequent-generation package after verified Build 071 re-closure, preserves immutable stable, recurrent, rejected and transport-error monitoring evidence, and permits recurrence governance only from the newest recurrent check for the newest Build 071 re-closure. Governed recurrence reopens the case explicitly, records a distinct subsequent-generation recurrence without rewriting Build 068 evidence, freezes Build 069–071 mutation paths, extends governed reopen across every recurrence generation, and blocks direct stale closure until a future corrective generation produces fresh verified evidence.

Operator UI: `/approved-data/reconciliation/post-subsequent-generation-reclosure`.


### Build 073 — Subsequent-Generation Recurrence Re-Triage & Successive-Generation Corrective Planning

Build 073 consumes only the newest governed Build 072 subsequent-generation recurrence for an open case, creates an explicit owner/admin re-triage cycle, and derives a distinct successive-generation corrective plan whose scope is limited to fields proven recurrent by the newest Build 072 read-back and already governed by the approved Build 069 predecessor plan. The plan binds the exact Build 070 accepted delivery/package identity and Build 071 re-closure lineage, preserves deterministic fingerprints and narrow review mutation grants, and does not reuse or rewrite any prior plan or delivery evidence.

Operator UI: `/approved-data/reconciliation/subsequent-generation-recurrence-planning`.
