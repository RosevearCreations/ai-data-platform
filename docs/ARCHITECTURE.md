# Architecture

## Architectural goals

- one shared platform, multiple isolated workspaces;
- local-first extraction where practical;
- AI for interpretation, not repetitive row-by-row work;
- auditable provenance for collected data;
- review-before-write for business integrations;
- provider-neutral AI layer;
- independently testable extraction engine.

## Proposed monorepo

```text
apps/
  web/            Next.js dashboard and API surface
  extension/      Chrome MV3 side-panel extension

packages/
  extractor/      DOM inspection and deterministic extraction
  recipes/        portable extraction recipe schema and execution
  pagination/     next-button, numbered-page and infinite-scroll logic
  ai/             provider-neutral AI interpretation layer
  normalization/  value cleanup, units, currency, categories
  matching/       record/entity matching and confidence scoring
  schema/         shared TypeScript schemas
  shared-ui/      shared UI primitives where appropriate

db/
  migrations/

docs/
```

## Technology baseline

- TypeScript
- Next.js App Router for the web application
- React for UI surfaces
- Chrome Manifest V3 with Side Panel API for browser interaction
- standard PostgreSQL as the persistence layer, initially hosted on Neon
- Better Auth for application authentication and session management
- a provider-neutral AI adapter; model/provider choice is configuration rather than business logic
- standard browser APIs and deterministic JavaScript/TypeScript for bulk extraction

## Runtime split

### Browser extension

Responsible for:

- reading the current page DOM with approved extension permissions;
- visual element picking;
- identifying candidate record containers;
- executing extraction recipes against the page;
- pagination/infinite-scroll actions while the user is present;
- previewing data before upload to the platform.

### Web application

Responsible for:

- workspace management;
- scraper/recipe management;
- dataset browsing;
- run history;
- review queues;
- historical comparisons;
- integration configuration;
- export and audit views.

### Backend/database

Responsible for:

- authenticated persistence;
- workspace isolation;
- versioned recipes;
- source evidence;
- datasets and records;
- change history;
- approval state;
- integration jobs.

## Data flow

```text
Web page
  -> DOM inspector
  -> candidate record/field detection
  -> optional AI interpretation
  -> extraction recipe
  -> deterministic extraction
  -> preview
  -> normalization
  -> matching/confidence
  -> review/approval
  -> dataset
  -> optional approved integration
```

## Local-first principle

The first useful version does not require a large remote scraping cluster. The browser extension performs interactive extraction in the user's own browser. Cloud crawling, proxies and remote scheduled browsers are deferred until a demonstrated need exists.

Build 017 scheduling remains local-first: Chrome alarms mark reviewed saved-scraper jobs due, but the service worker never performs unattended DOM extraction. The user must be present on the approved source origin to execute a due job. Scheduled jobs pin a saved scraper revision, require a new source-policy review after recipe revision changes, enforce bounded record/retry limits, and compare successful local snapshots to create local change notifications.

## AI boundary

AI may propose a schema, interpret ambiguous labels, normalize free text, help repair a recipe and classify/match records. It should not be invoked for every row when a deterministic selector or transform can do the same work.

## Integration boundary

Rosie Dazzlers and Devil n Dove remain independent applications. This repository owns shared acquisition/intelligence logic. Business applications consume approved outputs through explicit integration adapters rather than by sharing database tables directly.

Build 018 implements that boundary as versioned adapter contracts and controlled integration packages. Each adapter transforms only reviewed domain records, can compare them with an imported current-system snapshot, strips fields marked user-owned from updates, requires approval of the exact dry-run fingerprint, and records dry-run/approval/export/cancellation audit events. No dedicated Rosie Dazzlers competitive-intelligence intake endpoint or Devil n Dove supplier-inventory intake contract is assumed by this repository; until a business app deliberately exposes the matching authenticated contract, the transport is an approved JSON package rather than an invented HTTP write.

## Deployment baseline

The web application may be deployed independently of the two business sites. The extension and web app version together through this repository.

The database design remains provider-portable PostgreSQL. Neon is the initial managed host, but application schemas, migrations and authentication do not depend on Neon-specific database features.


## Build 019 authenticated extension boundary

The Chrome extension does not copy or reuse Better Auth session cookies. A user-initiated Chrome Identity web-auth flow opens the AI Data Platform's authenticated `/api/extension/connect` endpoint. Once the ordinary web session is authenticated, the server issues a random short-lived bearer token and stores only its SHA-256 hash in `app.extension_sessions`.

The extension stores that bearer token in extension-local storage, never in page-accessible DOM state. Bearer-session resolution returns the authenticated user identity, then workspace membership is loaded through the same `listWorkspacesForUser` transaction-local runtime-role/RLS boundary used by the web application.

The active workspace ID can only be selected from the returned authorized memberships. New saved scrapers and reviewed datasets are tagged with that workspace ID. Existing records with no workspace ID remain unassigned migration candidates for Build 020.

The bridge deliberately has explicit signed-out, expired, unavailable-backend and authenticated-no-workspace states. Revoked/expired bearer sessions resolve as unauthorized. Extension-session rows are not granted to `ai_data_runtime`; only the narrowly scoped server bridge resolves them.


## Build 020 workspace persistence and sync boundary

Build 020 keeps extension-local storage as the offline working cache while introducing PostgreSQL as the durable cross-device source of truth for saved scrapers/templates and reviewed datasets.

Every synchronized object is scoped by `workspace_id` and protected by PostgreSQL RLS for read, insert, update and delete. The extension uses the Build 019 short-lived bearer session; the sync endpoint resolves the authenticated principal and performs all database work through the existing transaction-local runtime role.

Server rows carry a monotonically increasing `server_version`. Local sync metadata records the last server version seen. Updates and deletes include an expected server version. If it no longer matches, the server returns a conflict and the extension preserves both local and server evidence until the operator explicitly chooses **Use server** or **Keep local**.

The local queue is written before a network attempt. Temporary backend loss therefore does not discard local work. Successful pulls update only records that are not locally queued/conflicted. Server tombstones prevent deleted records from reappearing on another device.

Legacy Build 019 unscoped records are never silently claimed. Build 020 provides an explicit migration action that creates a workspace-scoped copy and leaves the original local record intact.

Reviewed datasets remain full fidelity locally. Their synchronized server representation is bounded to 500 rows per dataset to keep early cross-device persistence predictable and economical; the UI reports when the server copy is bounded.


## Build 021 intelligence continuity boundary

Build 021 adds one versioned workspace module-state table for the stable bounded dataset contracts created in Builds 013–018. This avoids duplicating six persistence stacks while preserving module-specific payloads and summaries.

Module state uses optimistic server versions. Local module writes remain authoritative in the extension cache first, then are queued for authenticated synchronization. Fresh-device recovery enumerates all authorized workspaces after Build 019 sign-in and restores newer server module state when no local queue/conflict blocks it.

Rosie competitive intelligence maps to the rosiedazzlers workspace, Devil n Dove supplier intelligence maps to devilndove, movie metadata maps to personal, and business integration state is split by target before persistence. Historical series and scheduled jobs are stamped with their active/source workspace. Older unscoped history/jobs are never silently assigned.

Business-integration audit evidence is duplicated into a separate append-only table. The runtime database role has SELECT/INSERT only on that table; it has no UPDATE/DELETE grant. Duplicate audit IDs are idempotent via the workspace/audit primary key.


## Build 022 integration contract boundary

The shared contracts package is the machine-readable source of truth for integration package shape and consumer validation behavior. The extension mirrors the same deterministic canonicalization so package generation can self-verify before export without adding a runtime dependency between the Chrome bundle and server package.

A v1 package has stable approved-content identity: fingerprint -> packageId -> replayKey. generatedAt/expiresAt are transport metadata and deliberately do not change package identity. Consumers must persist consumed package IDs to enforce replay protection.

Build 022 remains transport-neutral and no-write. A business application's future authenticated receiver is responsible for authn/authz, transaction/idempotency, its own audit log, dry-run support and a disabled-by-default live mutation gate.


## Build 023 recipe drift and repair boundary

Build 023 extends saved-scraper compatibility checks into a page-local repair workbench. The injected compatibility function is self-contained and operates only on the active page. It samples at most 100 matched records, bounds candidate discovery, captures structural tag/class summaries rather than full DOM HTML, and returns at most five candidates per issue.

Field repair ranking uses deterministic coverage, overlap with prior selector tokens, required-field coverage and source-element fit. Record-boundary ranking uses repeated-element count, retained selector tokens and support from existing recipe fields.

Compatibility reports carry a structural fingerprint and per-field coverage trend. Saved scrapers retain a bounded check history. When a recipe revision is replaced, the previous revision archives the last compatibility report/fingerprint when available.

Optional AI ranking is server-side and authenticated through the Build 019 extension bearer session. The model receives only bounded repair evidence and deterministic candidate IDs. It cannot create or approve selectors; sanitization removes unknown candidate IDs and deterministic fallback remains available without AI credentials.

Approved repair and rollback operations always create a new revision. Scheduled jobs remain pinned to their prior saved-scraper revision, so Build 017's existing Refresh + re-review flow is required before a repaired recipe can run.
