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
