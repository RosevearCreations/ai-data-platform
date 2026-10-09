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


## Build 024 mobile barcode intake boundary

The /capture web route is the mobile entrypoint. It uses authenticated Better Auth session cookies and workspace RLS. The browser performs camera detection locally through BarcodeDetector when the API exists; only detected/typed digits, format hint, capture method and timestamps are sent to the server.

The server normalizes the identifier and compares it against the latest synchronized intelligence snapshot for that target workspace. Personal matching reads only movie collection UPC values. Devil n Dove matching reads only supplier staging supplierSku values that normalize as barcode identifiers.

Barcode intake is persisted separately from mutable movie/supplier intelligence. Approving a capture marks a reviewed downstream handoff; it does not rewrite the module payload. This avoids cross-device last-write conflicts and preserves movie ownership / Devil n Dove internal fields.

Offline captures are stored in localStorage on the device with a 100-item bound and are not treated as matched/reviewed until explicitly sent to the authenticated server.


## Build 025 source policy governance boundary

Build 025 turns source review into a durable workspace-scoped control plane. A registry entry is keyed by authorized workspace plus normalized HTTP/HTTPS origin and records collection method, purpose, terms/robots evidence, access-control rule, sensitivity, bounded delay/page/record budgets, expiry and lifecycle status.

Each saved recurring source is matched by exact workspace and origin. Approved policy state is converted into a scheduled-job review carrying the registry policy ID, revision and stable fingerprint. Job creation, refresh, re-enable and execution compare that pin against the current registry record and fail closed on drift, expiry or blocking.

Registry state synchronizes through the existing authenticated Build 021 intelligence endpoint as the source-policy module. PostgreSQL RLS remains the durable workspace boundary; Build 025 does not create a second authorization system.

This registry is also the governance contract for future remote execution. Build 026 may copy an exact approved policy revision into a remote job, but it may not weaken or infer around the Build 025 restrictions.


## Build 026 remote execution boundary

Build 026 adds a provider-neutral remote execution control plane without selecting a live crawling provider. Every job is workspace-scoped, begins in prepared state and copies the exact approved Build 025 source-policy ID, revision, fingerprint, expiry, evidence and budgets.

The lifecycle is prepared -> queued -> leased -> running -> terminal. Queueing and leasing require REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true; the default/unset production posture is disabled. Leases are bounded, heartbeats establish active ownership, cancellation is durable, timeout transitions close stale work, and result ingestion is append-only/idempotent by job plus idempotency key with a canonical result fingerprint.

Jobs never store raw provider secrets. They may carry only an enc-config://remote-execution/... reference to encrypted server configuration. Provider selection, credential storage and real egress are deliberately deferred to Build 027. The Build 026 mock provider performs no network access.


## Build 027 controlled remote-browser boundary

Build 027 selects Browserless Cloud for the first provider-specific pilot. The adapter uses only the Browserless /content REST endpoint to obtain fully rendered HTML from a real remote browser. The application does not call BrowserQL, unblock, stealth, CAPTCHA-solving, authenticated-profile or proxy features.

Pilot egress is direct only. The request is restricted to the approved source hostname, rejects heavy image/media/font resources, caps the browser session to 60 seconds and permits exactly one page. The response body is never persisted; only a SHA-256 content hash, byte count, title, final URL, target response code, duration and estimated Browserless billing units are retained as evidence.

Three independent execution gates apply: the Build 026 REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED flag, the global REMOTE_EXECUTION_KILL_SWITCH (active unless explicitly false), and a workspace control row whose kill_switch defaults true. Workspace concurrency is one active slot. Polling during the provider request aborts the live HTTP request if the workspace or global kill gate becomes active.

Allowlist rows pin the exact Build 025 policy ID/revision/fingerprint and accept only approved public-webpage, public-facts sources with robots allowed. Any policy drift, expiry, sensitivity change or workspace kill state fails closed.


## Build 028 configurable workspace profile boundary

Workspace identity and domain behavior are now separate concepts. app.workspaces retains stable IDs/slugs and the compatibility business/personal class, while profile_key references app.workspace_profiles for normalization fields, review dimensions, provenance/history/review policies, extraction templates and capability flags.

Rosie Dazzlers maps to rosie-detailing, Devil n Dove maps to maker-commerce and Personal maps to personal-media. Existing specialized modules continue to use those explicit profile identities. generic-business and generic-personal provide conservative starting points for new workspaces without changing extractor core code.

Custom profiles are RLS-scoped: built-ins are readable to authenticated runtime users, while custom profiles are visible to their creator and members of workspaces already using them. Built-ins are immutable. Custom profiles are edit/archive only by their authorized creator while they retain an owner/admin context.

New workspace creation uses app.create_profiled_workspace, a SECURITY DEFINER boundary that explicitly re-checks the current authenticated user, owner/admin eligibility and profile visibility before atomically creating the workspace and owner membership. The runtime role therefore does not receive broad INSERT rights on workspace/member tables.


## Build 029 connector SDK boundary

The connector SDK lives in packages/connector-sdk and defines manifest/SDK version 1, import/enrichment/export capabilities, bounded configuration fields, exact environment-variable secret declarations, and execution size/time limits.

Connectors are statically registered server code in apps/web/lib/connectors/registry.ts. Build 029 does not execute user-uploaded JavaScript. The web runtime resolves an installation only after the authenticated actor passes workspace owner/admin checks and RLS. The requested capability must be supported by the manifest and present in the workspace grant.

apps/web/lib/connectors/sandbox.ts is the capability-limited execution boundary. It structured-clones/freezes input/config, enforces input/output byte bounds, supplies an AbortSignal/timeout, and exposes only a secret(key) resolver. No database client, session cookie or unrestricted process.env object enters connector context.

Secret declarations bind each logical secret key to one exact environment-variable name. workspace_connector_installations stores only a reference object; secret values remain in the server environment. The resolver refuses undeclared keys, mismatched environment names and missing values.

The included example.no-secret-normalizer connector requires no service or credentials and exercises configuration, grants, enable/disable, execution and audit end to end.

## Contextual help architecture

apps/web/app/help/help-content.ts is the central section-help registry. HelpInfo renders an accessible native details/summary control styled as the requested circled i. Every major page and interactive section uses a topic-specific control, and /help renders the consolidated help center.

Manual-intervention instructions live with the relevant topic. Browserless help preserves exact Build 027 variables and fail-closed sequencing; connector help distinguishes the no-setup sample from future credentialed connectors. CI verifies coverage and required manual-intervention language.


## Build 030 production-learning boundary

Build 030 is a read/assessment layer over the existing Builds 019–029 evidence stores. It does not create a privileged analytics database or bypass workspace authorization. /production-learning and /api/production-learning authenticate normally, call listWorkspacesForUser, and execute each workspace aggregate through withUserDatabase so the ai_data_runtime role and app.user_id RLS boundary remain authoritative.

The review separates evidence into three classes:

1. durable measured outcomes already available from PostgreSQL;
2. runtime readiness signals such as Browserless token-configured/execution/kill booleans;
3. explicit evidence gaps where no durable outcome event exists.

A missing measurement is never converted to zero. Build 031 now records synchronization and recipe-repair outcomes as bounded append-only workspace events, allowing production learning to report measured rates while still distinguishing a true zero from no observed attempts.

Cost review uses durable provider units/duration and measured PostgreSQL JSON payload bytes as proxies. It does not hard-code a dollar price because provider pricing and database billing can change independently of application code.

The renewed roadmap is generated deterministically from current evidence and known gaps. Build 031 closed the measurement gaps; Build 032 establishes the controlled Browserless production baseline, and later builds address consumer delivery, retention and adoption before the next production-learning renewal.

## Build 031 operational-outcome boundary

Build 031 adds a narrow evidence layer rather than a general event bus. Workspace synchronization emits terminal applied/conflict/noop/deleted/error outcomes after the existing optimistic-concurrency operation. Telemetry failure never changes the original synchronization result.

Recipe-repair proposal/rejection intake accepts only bounded primitive metadata. Approved repair and rollback events are derived server-side from the synchronized saved-scraper revision kind, and a later compatibility check is linked to that revision. Raw DOM, candidate selectors and page payloads are not copied into operational telemetry.

Production-learning snapshots are persisted only when the outcome-count fingerprint changes. This preserves before/after continuity without turning each dashboard read into unbounded history. All event/snapshot reads and inserts use the normal `ai_data_runtime` + `app.user_id` RLS boundary.

## Build 032 Browserless production-baseline boundary

Build 032 does not create a second remote-execution mechanism. It promotes the existing Build 027 one-page Browserless boundary into an evidence-driven production gate. The production-learning layer independently measures: encrypted-token readiness, provider master flag, global kill state, eligible approved Source Policies, exact remote allowlists, armed workspaces and terminal provider evidence.

An eligible Build 032 source is counted from the actual Source Policy payload only when it is approved, public-webpage/public-facts, explicitly public-or-authorized, terms-reviewed, robots allowed, access-control-bypass prohibited and unexpired. Summary counters alone cannot make a source eligible.

The latest terminal Browserless event contributes only bounded evidence already permitted by Build 027: succeeded/failed state, estimated provider units, duration, target response code, final URL and content SHA-256. Raw HTML and the Browserless credential are never copied into production learning.

The Build 032 go/no-go result is deterministic. With no real terminal provider run it remains pending. A bounded go requires all observed terminal runs to succeed and average estimated provider units to remain within the existing two-unit envelope; otherwise the result is no-go. This decision does not automatically expand remote execution.

The global kill switch remains active outside an explicitly authorized one-run production window. Build 032 intentionally fails closed when no approved source policy exists.

## Build 033 consumer-delivery boundary

Build 033 keeps the business applications independent. AI Data Platform reconstructs a v1 package only from a persisted approved/exported business-integration batch, validates it again with an independent server-side validator, and never accepts an arbitrary browser-supplied delivery URL.

The internal conformance receiver is authenticated through the normal AI Data Platform session and exists to prove receiver semantics without touching a business application. It persists an accepted package ID in a scoped replay registry so the same package is rejected on a later submission. Conformance acceptance is not treated as live business-consumer acceptance.

External delivery is server-to-server only. The target endpoint and bearer credential come from target-specific server environment variables. The handshake must return the exact protocol, target, schema, contract version, bearer-authentication declaration and dry-run support. Package acknowledgements must echo packageId, replayKey and fingerprint. Build 033 forces dry-run transport and rejects acknowledgements that claim a live mutation.

Every handshake/delivery terminal outcome is appended to workspace-scoped delivery evidence. Production learning reports conformance and live acceptance separately; Build 033 remains open until one supported business application returns a real authenticated dry-run acknowledgement.
