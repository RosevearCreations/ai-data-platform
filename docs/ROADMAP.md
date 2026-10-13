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

## Build 002 — PostgreSQL Auth & Workspace Isolation

Status: COMPLETE. Promotion is performed through the Build 002 pull request.

- provider-portable PostgreSQL foundation;
- Better Auth email/password authentication;
- separate `auth` and `app` schemas;
- workspace membership model;
- PostgreSQL row-level security using a restricted runtime role;
- seed initial Rosie Dazzlers, Devil n Dove and Personal workspaces;
- first-user owner bootstrap;
- CI PostgreSQL integration test.

Acceptance: authenticated users only see permitted workspace data, verified against a real ephemeral PostgreSQL instance.

## Build 003 — Page DOM Inspector

Status: COMPLETE. Promotion is performed through the Build 003 pull request.

- temporary active-page inspection using `activeTab` + `scripting`;
- bounded DOM snapshot model;
- visible text/safe-attribute capture without form values;
- page metadata and structural counts;
- candidate repeating-container scoring;
- side-panel inspection results and diagnostics.

Acceptance: extension can inspect a user-selected public page and display ranked candidate record containers without persistent host permissions.

## Build 004 — Visual Element Picker

Status: COMPLETE. Promotion is performed through the Build 004 pull request.

- point-and-click field selection;
- hover highlight and tooltip overlays;
- Escape and side-panel cancellation;
- stable exact-selector generation;
- generalized repeated-field selector generation;
- match-count visibility;
- exact/generalized selector preview;
- temporary multi-match highlight overlays;
- safe attribute and visible-text summary.

Acceptance: a user can select a visible page element, receive exact and generalized selectors, and preview selector matches without activating the page element or requesting persistent host access.

## Build 005 — Repeating Record Detection

Status: COMPLETE. Promotion is performed through the Build 005 pull request.

- automatic repeated list/table/card/row detection;
- field-guided record-boundary inference from Build 004 selections;
- deterministic structural signatures;
- repeat-ratio and structural-consistency measurement;
- text/link/image coverage metrics;
- semantic bonuses and navigation penalties;
- ranked confidence scores and diagnostics;
- bounded record samples and field hints;
- record-selector generation;
- temporary record-boundary preview overlays.

Acceptance: the extension can rank plausible repeated-record groups automatically or infer them around a selected field, show why a group scored well, and preview the resulting record selector without activating page content.

## Build 006 — Extraction Recipe Engine

Status: COMPLETE. Promotion is performed through the Build 006 pull request.

- portable recipe schema version 1;
- selected record group -> recipe workflow;
- relative field-selector derivation from Build 004 picks;
- manual field authoring and editing;
- text, safe-attribute, link and image extraction;
- absolute URL normalization for links/images;
- deterministic trim/whitespace/case/number/currency transforms;
- required-field warnings and extraction statistics;
- bounded local recipe test runner;
- first-row preview and portable recipe JSON;
- no database persistence or AI dependency.

Acceptance: a user can choose a Build 005 record group, define multiple reusable field rules, execute the recipe across repeated records, inspect structured rows/warnings, and obtain portable versioned recipe JSON without writing to a backend.

## Build 007 — Spreadsheet Preview & Review

Status: COMPLETE. Promotion is performed through the Build 007 pull request.

- full spreadsheet-style extraction grid;
- editable reviewed cell values;
- row include/exclude controls;
- include-all, exclude-all and reset actions;
- column reorder controls;
- non-destructive column drop/restore;
- all/included/warnings row filters;
- current required-field warning recalculation after edits;
- edited-cell, excluded-row and warning-state presentation;
- review statistics;
- local reviewed-dataset snapshot save;
- retention of up to 20 recent local review snapshots;
- no business-system or backend writes.

Acceptance: a successful Build 006 extraction can be reviewed across all rows, corrected, filtered, column-curated and row-approved, then saved as a local reviewed dataset while preserving the original extraction result.

## Build 008 — AI Suggested Fields

Status: COMPLETE. Promotion is performed through the Build 008 pull request.

- authenticated natural-language extraction intent;
- bounded sample-record context instead of full-DOM upload;
- strict structured field-schema suggestions;
- field semantics, preferred sources and required-state guidance;
- deterministic transform recommendations;
- AI cannot create or approve CSS selectors;
- server-only Vercel AI Gateway integration;
- configurable model with `AI_SUGGESTION_MODEL`;
- token and estimated-cost telemetry;
- deterministic zero-cost fallback when AI is unavailable;
- extension-side bounded context handoff;
- automated suggestion parser/fallback/sanitizer verification;
- production-branch CI after merge.

Acceptance: an authenticated user can describe desired data, submit bounded record samples, receive sanitized structured field suggestions with telemetry, and continue safely when AI credentials or the provider are unavailable.

## Build 009 — Pagination & Infinite Scroll

Status: COMPLETE. Promotion is performed through the Build 009 pull request.

- visible next-button detection;
- numbered-page progression;
- load-more control detection;
- safe infinite-scroll progression;
- exact first-control selection with fresh per-page re-detection;
- same-origin enforcement;
- optional current-site host access for navigational pagination;
- removable site access;
- configurable page/step, record and wait limits;
- repeated-state, no-new-record, stalled-growth, cancellation and cross-origin stop conditions;
- multi-page recipe execution;
- cumulative-row protection for load-more/infinite-scroll;
- page/step summaries and per-row source-page evidence;
- direct handoff of paginated results to the Build 007 review grid.

Acceptance: a user can run a Build 006 recipe across bounded same-origin pagination, collect and review multi-page results, and stop safely on configured limits or lack of measurable progress.

## Build 010 — Detail/Subpage Enrichment

Status: COMPLETE. Promotion is performed through the Build 010 pull request.

- user-selected parent detail-URL field;
- same-origin public detail-page fetching without cookies;
- inert HTML parsing;
- H1 and meta-description field presets;
- custom detail-field CSS selectors;
- text, meta-content, link, image and safe-attribute extraction;
- deterministic transforms and required-field warnings;
- bounded unique-page count, delay and timeout controls;
- repeated-detail-URL fetch reuse;
- explicit opt-in parent-row deduplication by identical detail URL;
- cross-origin link/redirect blocking;
- parent/detail value merging;
- per-record detail fetch evidence;
- enrichment from both single-page and Build 009 paginated results;
- direct handoff to the Build 007 review grid.

Acceptance: a reviewed extraction can follow bounded same-origin public detail links, extract configured fields without target-site credentials, reuse duplicate detail fetches, merge results with parent rows and preserve fetch evidence for review.

## Build 011 — CSV/XLSX/JSON Export

Status: COMPLETE. Promotion is performed through the Build 011 pull request.

- local CSV export;
- real Office Open XML XLSX generation without a spreadsheet service;
- structured JSON export;
- reviewed/edited versus original raw value selection;
- included-row-only versus all-row selection;
- visible-column-only versus all-column selection;
- optional warning export;
- optional source-page/detail-page evidence export;
- preservation of numeric values in XLSX;
- sanitized filenames;
- UTF-8 CSV with BOM;
- CSV formula-like string neutralization;
- automatic availability for base, paginated and detail-enriched review datasets.

Acceptance: any Build 007 review workspace can export the intended reviewed or raw dataset as CSV, XLSX or JSON using explicit row/column/evidence options without a backend export dependency.

## Build 012 — Saved Scrapers & Templates

Status: COMPLETE (2026-10-05).

- local recipe library;
- built-in and user-saved site templates;
- bounded revision history;
- current-page selector breakage detection;
- same-site saved-item hints;
- load and restore prior revisions without silently overwriting the current saved version.

Acceptance: a user can save an extraction recipe, reopen it without rebuilding selectors, keep intentional revisions, load a starter template, and check whether its record/field selectors are healthy, degraded, or broken on the current page.

## Build 013 — Historical Change Detection

Status: COMPLETE (2026-10-05).

- explicit reviewed record versions;
- per-version field observations;
- added/removed/changed/unchanged summaries;
- pending/reviewed/dismissed change review queue;
- user-selected stable identity field;
- bounded local history retention.

Acceptance: after an initial reviewed baseline, a later capture can match stable record identities, preserve field observations for each retained version, summarize changes, and require explicit review of detected additions, removals and field changes.

## Build 014 — Rosie Dazzlers Competitive Intelligence

Status: COMPLETE (2026-10-06).

- detailing-domain normalization from reviewed extraction rows;
- packages/pricing/services/vehicle-size/mobile-mode/service-area model;
- operator-verified Ontario detailer dataset in extension-local storage;
- per-source and per-business competitor snapshots;
- added/removed/changed offering history;
- source URL and retrieval-time evidence retention;
- canonical package-content facts instead of copied marketing prose.

Acceptance: reviewed public Ontario auto-detailing facts can be mapped into a normalized local dataset, compared across competitors, and recaptured later to retain source-scoped price/service/package change history without writing into Rosie Dazzlers production records.

## Build 015 — Devil n Dove Supplier Intelligence

Status: COMPLETE (2026-10-06).

- reviewed supplier product model with source evidence;
- package quantity, stock-unit and usage-unit normalization;
- common compatible-unit conversion inference;
- cost-per-stock-unit and cost-per-usage-unit calculations;
- bounded supplier price observations;
- reviewed local inventory-integration staging with pending/approved/rejected states;
- approved records automatically return to pending when refreshed supplier facts change.

Acceptance: reviewed supplier rows can be normalized into Devil n Dove inventory economics, staged locally with source/price evidence, explicitly approved or rejected, and prepared for a later integration adapter without writing into production inventory.

## Build 016 — Movie Metadata Module

Status: COMPLETE (2026-10-06).

- local CSV/JSON import for the existing owned movie collection;
- permitted-source intake profiles for IMDb datasets, TMDb API/export, OMDb API/export and other operator-confirmed API/dataset sources;
- external-ID, UPC, title/year and title-similarity matching;
- exact/strong/ambiguous/unmatched confidence classification;
- manual owned-title assignment for ambiguous/unmatched candidates;
- explicit approve/reject/reopen metadata review;
- ownership-field preservation for format, shelf location, condition and personal notes;
- metadata enrichment limited to canonical metadata and missing external IDs.

Acceptance: an existing owned collection can be imported locally, reviewed metadata from a permitted API/dataset source can be mapped and matched, ambiguous results remain review-gated, and approving enrichment cannot overwrite ownership-specific fields.

## Build 017 — Scheduled & Repeatable Jobs

Status: COMPLETE (2026-10-06).

- explicit source-policy review gate before a saved scraper can be scheduled;
- local daily, weekly and bounded interval schedules;
- Chrome alarm-backed due-work state without unattended crawling;
- interactive same-origin execution only while the user is present;
- pinned saved-scraper revisions with stale-revision blocking;
- explicit refresh + source-policy re-review after scraper revision changes;
- per-run record limits;
- bounded retry counts and retry delays;
- bounded run history;
- deterministic local snapshot comparison;
- local unread/read change notifications and browser-action NEW/DUE badge;
- no remote browser workers, access-control bypass or business-system writes.

Acceptance: an approved saved scraper can be scheduled locally, becomes due through a Chrome alarm, executes only interactively on its approved source origin, respects record/retry limits, records failures, and produces local change notifications when a successful snapshot differs from its prior baseline.

## Build 018 — Business-System Integrations

Status: COMPLETE (2026-10-06).

- explicit Rosie Dazzlers competitive-intelligence adapter contract;
- explicit Devil n Dove approved supplier-inventory adapter contract;
- optional imported current-system snapshots;
- deterministic dry-run create/update/unchanged/blocked diffs;
- user-owned field protection;
- exact dry-run fingerprint approval;
- stale source-dataset approval blocking;
- versioned approved JSON integration packages;
- local immutable-style append-only audit history for dry-run, approval, export and cancellation;
- no shared database tables, invented credentials or unreviewed production writes.

Acceptance: reviewed platform outputs can be transformed through an explicit business-specific adapter, compared against imported current state, inspected as a dry run, explicitly approved against the same source dataset, and exported as a versioned package whose audit trail records the controlled handoff.

## Build 019 — Authenticated Workspace Binding & Extension Session Bridge

Status: COMPLETE (2026-10-06).

Goal: connect the Chrome extension to the authenticated AI Data Platform workspace model so Rosie Dazzlers, Devil n Dove and Personal are real isolated contexts instead of a disabled local selector.

Delivered:

- Chrome Identity web-auth bridge into the existing Better Auth session;
- short-lived 8-hour extension bearer session with only SHA-256 token hashes stored server-side;
- dedicated `app.extension_sessions` table with revocation/expiry tracking and no runtime-role grants;
- current authenticated user and workspace discovery through the existing RLS-safe membership query;
- active authorized workspace selection retained in extension-local storage;
- real Rosie Dazzlers, Devil n Dove and Personal workspace switching;
- explicit connected, signed-out, expired, unavailable and no-access UI states;
- session revocation on extension disconnect;
- extension source-host permission requested only for the configured AI Data Platform origin;
- no Better Auth cookie copied into extension storage;
- no target-site credentials exposed to page scripts;
- saved-scraper and reviewed-dataset workspace IDs on newly created records;
- older unscoped local records detected as Build 020 migration candidates and never silently assigned;
- CI verification for owner/restricted workspace isolation, extension-session expiry and revocation;
- callback-safe web sign-in return for the Chrome identity bridge;
- extension version 0.19.0.

Acceptance: a signed-in user can select only workspaces they are authorized to access, the extension retains the active workspace safely, signed-out/expired states fail closed for new workspace-scoped saves, and one workspace/user cannot read or select another user's unauthorized data.

Manual input gate:

No server trusted-origin change is required by this implementation because the extension does not depend on cross-site Better Auth cookies. On the first production-browser connection, enter the deployed AI Data Platform URL in the extension if the extension package was not built with `VITE_PLATFORM_ORIGIN`, click Connect / sign in, approve the one-site Chrome permission, sign in normally if prompted, and choose the authorized workspace.

## Build 020 — Workspace Persistence & Cross-Device Sync Foundation

Status: COMPLETE (2026-10-06).

Goal: move the durable source of truth for saved recipes, reviewed datasets and core provenance from extension-local storage into the authenticated workspace backend while retaining offline/local resilience.

Delivered:

- provider-portable PostgreSQL persistence for saved scrapers and templates;
- provider-portable PostgreSQL persistence for reviewed datasets;
- workspace ID on every synchronized record;
- versioned server records with optimistic concurrency;
- soft-delete tombstones for cross-device deletion continuity;
- reviewed-dataset server copies bounded to 500 rows while full local copies remain untouched;
- source URL and retrieval-time provenance persisted with reviewed datasets;
- RLS policies for read, insert, update and delete on every Build 020 table;
- authenticated extension sync GET/POST endpoint using the Build 019 bearer bridge;
- explicit unauthorized-workspace rejection;
- durable extension-local sync metadata;
- durable offline/deferred operation queue;
- automatic safe sync attempt after local saves;
- deterministic clean-cache server merge;
- create/update conflict detection through expected server versions;
- explicit Use server / Keep local conflict resolution;
- active-workspace local saved-scraper filtering;
- cross-device pull of saved scrapers/templates and reviewed datasets;
- explicit non-destructive legacy migration that copies unscoped records into the active workspace and retains the original local record;
- per-workspace reviewed-dataset local retention;
- versioned deletion/tombstone propagation;
- CI coverage for create, update, conflict, retrieval, deletion and unauthorized workspace denial;
- extension version 0.20.0.

Acceptance: a saved scraper/template or reviewed dataset created in one authenticated workspace can be synchronized and retrieved on another authorized device; local work remains available and queued during backend loss; stale concurrent writes become explicit conflicts rather than silent overwrites; and RLS prevents access outside membership.

Manual input gate:

None. Build 020 uses the existing Build 019 authenticated bridge and PostgreSQL connection. No new provider account, secret or dashboard configuration is required.

## Build 021 — Persistent Intelligence, History & Audit Continuity

Status: COMPLETE (2026-10-06).

Goal: synchronize higher-value local intelligence so history, schedules, approvals and audit evidence survive browser/device loss and remain reviewable from the web application.

Delivered:

- workspace persistence for Build 013 historical series/change queues;
- workspace persistence for Build 014 Rosie competitive intelligence;
- workspace persistence for Build 015 Devil n Dove supplier staging and price observations;
- Personal-workspace persistence for Build 016 movie metadata review state;
- workspace persistence for Build 017 scheduled jobs and run history;
- target/workspace persistence for Build 018 integration batches;
- append-only server audit rows for dry-run, approval, export and cancellation evidence;
- module-level optimistic concurrency and explicit conflict handling;
- fresh-device pull across every authorized workspace;
- automatic reconciliation after extension sign-in;
- server-side enforcement of the existing local retention caps;
- explicit adoption for pre-workspace historical series and scheduled jobs;
- authenticated read-only web view at /intelligence;
- RLS on module state and audit evidence;
- extension version 0.21.0.

Acceptance: critical intelligence survives device/browser loss, authorized fresh devices can restore it after sign-in, stale concurrent module writes become explicit conflicts, append-only approval evidence cannot be updated by the runtime role, and unauthorized users cannot read another workspace's intelligence.

Manual input gate:

None expected.

## Build 022 — Integration Contract Verification & Consumer Readiness

Status: COMPLETE (2026-10-07).

Goal: make Build 018 handoffs independently machine-verifiable and prepare Rosie Dazzlers and Devil n Dove to consume only deliberately supported contracts without guessing endpoints.

Delivered:

- executable shared v1 contract definitions in @rosevear/ai-data-contracts;
- standalone JSON Schema files for Rosie Dazzlers and Devil n Dove;
- target-specific field allowlists and integration-key prefixes;
- canonical package fingerprint verification;
- deterministic packageId and replayKey metadata;
- 24-hour package handoff expiry;
- 30-day default source-data freshness policy;
- future-dated package rejection;
- duplicate/replay rejection support;
- unsupported-version rejection;
- schema/contract mismatch rejection;
- unexpected-field rejection;
- invalid source-evidence rejection;
- valid Rosie and Devil n Dove fixtures;
- invalid unsupported-version fixture;
- CI conformance tests for valid, tampered, duplicate, expired, stale and unexpected-field cases;
- extension package self-verification before export;
- non-production consumer simulator with local replay registry;
- exact Rosie Dazzlers consumer-readiness checklist;
- exact Devil n Dove consumer-readiness checklist;
- documented authenticated intake requirements and future activation walkthrough;
- no live receiver URL, credential or production write path enabled.

Acceptance: an approved integration package can be validated independently, duplicate/stale/tampered/unsupported packages are rejected deterministically, and each business app has an exact implementation checklist rather than an invented endpoint.

Manual input gate:

None for Build 022. User input is required only in a future consumer implementation when a real business-app receiver is deliberately enabled.

## Build 023 — Advanced Recipe Drift Detection & Repair Workbench

Status: COMPLETE (2026-10-07).

Goal: reduce scraper breakage by diagnosing DOM drift and proposing reviewable recipe repairs without allowing AI to silently change operational selectors.

Delivered:

- structural fingerprints persisted on compatibility reports and archived recipe revisions;
- bounded compatibility-check history for field health trends;
- per-field coverage trend labels: new, stable, improved, degraded and broken;
- broken/degraded cause classification;
- invalid record-selector and record-boundary drift detection;
- low-record-count and structural-drift detection;
- invalid/missing field-selector and coverage-drop detection;
- deterministic nearby record-selector candidates;
- deterministic nearby field-selector candidates;
- bounded structural context containing tag/class structure only;
- bounded current/candidate sample-value comparison;
- deterministic candidate scoring from coverage, structural evidence, selector-token retention and source-element fit;
- optional authenticated AI explanation/ranking of only the deterministic candidate IDs;
- deterministic fallback when AI Gateway is unavailable;
- server sanitizer that discards invented AI candidate IDs;
- side-by-side old/new selector evidence;
- explicit operator approval checkbox before any repair revision;
- repair revisions append history rather than rewriting an existing revision;
- historical revision metadata including archived compatibility/structural fingerprint when available;
- rollback of retained prior revisions as a new rollback revision;
- known-good revision labeling when archived compatibility was healthy;
- scheduled jobs remain pinned to their previous revision and blocked until Refresh + re-review;
- extension version 0.23.0;
- CI verification for bounded repair request parsing, deterministic ranking and AI candidate allowlisting.

Acceptance: when a saved scraper breaks, the workbench classifies the drift, proposes bounded deterministic candidates, presents structural/sample evidence, optionally explains candidate ranking without inventing selectors, and creates a new recipe revision only after explicit operator approval.

Manual input gate:

No setup expected. Human approval of each repaired selector remains intentionally required inside the application.

## Build 024 — Mobile Barcode & Camera Intake

Status: COMPLETE (2026-10-07).

Goal: add fast mobile capture for owned movies and supplier/inventory identifiers without weakening matching, workspace isolation or ownership/internal-field preservation.

Delivered:

- authenticated mobile-friendly web capture page at /capture;
- Personal movie and Devil n Dove supplier/inventory target selection limited to authorized workspaces;
- explicit camera capability detection;
- camera permission requested only after Start camera is pressed;
- BarcodeDetector-based camera scanning when supported;
- manual barcode entry fallback requiring no camera permission;
- explicit Stop camera control;
- automatic camera-track release after a successful detection;
- UPC-A, EAN-8, EAN-13 and GTIN-14 normalization to canonical GTIN identity;
- UPC-E provenance preservation when the detector reports UPC-E;
- checksum validation surfaced as review warning rather than silent correction;
- durable workspace-scoped barcode intake table protected by RLS;
- exact matching against synchronized Personal movie UPCs;
- exact matching against Devil n Dove supplier staging SKUs when they contain a barcode identifier;
- duplicate normalized-barcode detection inside active intake;
- duplicate approval blocking;
- exact/unmatched/duplicate review status;
- explicit approve/reject handoff review;
- approved Personal captures route to the existing movie lookup/review workflow without changing ownership fields;
- approved Devil n Dove captures route to supplier/inventory lookup staging without changing internal inventory fields;
- bounded match payloads that omit movie ownership notes and non-contract supplier fields;
- browser-local offline queue capped at 100 captures;
- manual Send offline queue action after connectivity returns;
- provenance labeling for camera/manual method, capture timestamp and offline queue timestamp;
- no geolocation request or storage;
- extension version 0.24.0;
- CI coverage for normalization, checksum behavior, privacy, matching, explicit camera acquisition path, RLS, target/workspace enforcement and duplicate approval blocking.

Acceptance: an authorized user can scan or type an 8/12/13/14-digit barcode on a supported mobile browser, route it to Personal movie or Devil n Dove supplier intake, review an exact/unmatched suggestion, approve/reject the handoff, recover temporarily offline captures, and preserve existing ownership/internal fields.

Manual input gate:

Camera scanning requires a one-time browser camera permission on each mobile device/site combination. Manual barcode entry requires no permission.

Camera walkthrough:

1. Open the deployed AI Data Platform and sign in.
2. Open **Scan / enter barcode**.
3. Choose **Personal movie library** or **Devil n Dove supplier / inventory**.
4. Tap **Start camera**.
5. When the browser asks for camera permission, choose **Allow while using this site** or the equivalent site/one-time permission.
6. Point the rear camera at the UPC/EAN barcode.
7. When detected, the application stops the camera automatically and submits the digits for review.
8. Review exact/unmatched/duplicate status and the proposed handoff.
9. Choose **Approve handoff** or **Reject**.
10. If you want to stop before detection, tap **Stop camera**; camera tracks are released.
11. If permission was denied accidentally, open the browser's site permissions for the AI Data Platform site, change **Camera** to **Allow**, reload, and try again.
12. If camera barcode detection is unsupported, use the manual numeric field instead.

## Build 025 — Source Policy Registry & Crawl Governance

Status: COMPLETE (2026-10-07).

Goal: replace one-off scheduling checkboxes with a durable, workspace-scoped governance record that can be reused by local jobs and future remote execution without weakening source restrictions.

Delivered:

- workspace-scoped source policy registry synchronized through the existing authenticated intelligence continuity layer;
- normalized HTTP/HTTPS source origins;
- explicit collection method: official API, official dataset/feed, user-authorized export/file or public webpage;
- documented collection purpose and source name;
- public-or-explicitly-authorized requirement;
- applicable terms/policy review evidence;
- robots/crawl decision and optional evidence URL;
- explicit prohibition on login, paywall, CAPTCHA, ban or technical access-control bypass;
- public-facts, user-authorized and restricted/private sensitivity classification;
- restricted/private crawler use blocked;
- minimum request delay with a 500 ms hard floor;
- bounded page and record budgets;
- time-limited policy review expiry;
- approved, review-required and blocked lifecycle states;
- monotonic policy revisions and stable governance fingerprints;
- policy status/revision changes invalidate older scheduled-job approvals;
- scheduled job create, refresh, re-enable and execution fail closed unless the exact current approved policy revision is pinned;
- scheduled max-record budget is capped by the stricter registry policy;
- cross-device source-policy persistence through Build 021 RLS-protected workspace intelligence;
- migration 0006_source_policy_registry.sql extends the permitted intelligence module set;
- authenticated intelligence overview visibility for source-policy state;
- pure governance acceptance verification for normalization, fingerprint drift, robots decisions, expiry, sensitivity and access-control rules;
- database acceptance coverage for source-policy persistence and workspace isolation;
- extension version 0.25.0.

Acceptance: an authorized workspace can register a recurring source, preserve review evidence and bounded crawl rules, and schedule/run a saved scraper only while the exact policy revision remains approved and unexpired. Blocking, expiring or materially revising the policy makes prior job approval stale and requires explicit re-review.

Manual input gate:

No external account, credential or environment variable is required. Human policy review remains intentional: before approving a real recurring source, review its applicable terms/API conditions and robots/crawl rules and enter the evidence in the registry.

## Build 026 — Remote Execution Provider Abstraction & Cloud Worker Readiness

Status: COMPLETE. Promotion uses the protected exact-tree path.

Goal: prepare a provider-neutral remote execution architecture without immediately turning on unattended cloud crawling.

Deliverables:

- provider-neutral remote execution contract;
- job lease/claim/heartbeat model;
- workspace-scoped remote-run authorization;
- encrypted server-side execution configuration;
- bounded run/page/record/time budgets;
- exact Build 025 source-policy revision/fingerprint copied into each remote job;
- same source-origin/access-control rules as local extraction;
- idempotent result ingestion;
- cancellation and timeout handling;
- worker health/readiness reporting;
- local mock worker for CI;
- feature flag that keeps production remote execution disabled by default.

Acceptance: PASSED when the provider-neutral lifecycle, exact source-policy copy, bounded budgets, lease/heartbeat/cancellation/timeout behavior, append-only idempotent result evidence, RLS isolation and no-network mock worker pass CI while production remote execution remains disabled by default.

Manual input gate:

No provider account is required to complete this readiness build. Provider selection is intentionally deferred to Build 027.

## Build 027 — Controlled Remote Browser Pilot & Egress Policy

Status: COMPLETE. Promotion uses the protected exact-tree path.

Goal: enable the first deliberately scoped remote-browser pilot with explicit egress/proxy policy, cost limits and source restrictions.

Deliverables:

- selected remote-browser provider adapter;
- selected egress model: direct first, proxy only where lawful/necessary;
- encrypted provider credentials;
- workspace allowlist of approved remote sources;
- per-job spend/time/page/record budgets;
- concurrency limits;
- exact Build 025 robots/terms/source-policy evidence attached to remote jobs;
- no CAPTCHA solving or authentication bypass;
- optional proxy configuration only for approved use cases;
- provider health/failure telemetry;
- kill switch;
- pilot limited to explicitly approved non-sensitive sources;
- cost and reliability report before broader enablement.

Acceptance: PASSED in CI and database acceptance with the Browserless adapter, exact source allowlist/policy pins, direct-egress request shape, one-page/60-second/2-unit envelope, provider telemetry and immediate global/workspace kill gates. The live production provider call remains fail-closed until the Browserless token and execution flags are configured in the hosting environment.

Manual input gate:

Browserless was selected after current-provider review. Never paste the token into chat or commit it. Configure BROWSERLESS_API_TOKEN as an encrypted hosting secret, set REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true, and only after review set REMOTE_EXECUTION_KILL_SWITCH=false. Workspace controls still default killed.

## Build 028 — Configurable Workspace Types & Domain Profiles

Status: COMPLETE. Promotion uses the protected exact-tree path.

Goal: generalize the platform beyond the three seeded workspaces without turning every new domain into custom code.

Deliverables:

- workspace-type/profile schema;
- configurable normalization fields and review dimensions;
- reusable provenance/history/review policies;
- profile-scoped templates;
- profile-specific integration capability flags;
- admin create/edit/archive workspace-type flow;
- safe defaults for unknown/custom domains;
- migration of Rosie Dazzlers, Devil n Dove and Personal into explicit built-in profiles;
- no cross-profile data leakage;
- documentation for adding a new domain profile without changing extractor core logic.

Acceptance: PASSED when built-in/custom profile configuration, owner/admin profile lifecycle, profiled workspace create/edit/archive, seeded-profile migration, fail-closed capability defaults and cross-account RLS isolation pass CI/database verification while Rosie Dazzlers, Devil n Dove and Personal retain their specialized behavior through explicit built-in profiles.

Manual input gate:

No setup required. The user will choose the name/purpose of any first new workspace when they actually create one.

## Build 029 — Plugin & Connector SDK Foundation

Status: COMPLETE. Promotion uses the protected exact-tree path.

Goal: provide a versioned extension point so new import, enrichment and approved-export connectors can be added without modifying core extraction logic.

Deliverables:

- connector manifest schema;
- capability model for import/enrichment/export;
- versioned connector contract;
- workspace permission/capability declaration;
- connector configuration schema;
- secret-reference model that keeps credentials out of client storage;
- sandboxed/isolated server execution boundary for connectors;
- test harness and example no-secret connector;
- compatibility/version checks;
- connector enable/disable controls;
- audit events for connector execution;
- documentation and starter template.

Acceptance: PASSED when the no-secret sample connector registers through SDK v1, persists workspace-scoped configuration/grants, runs through the bounded server execution boundary, records append-only audit evidence, fails closed on ungranted capabilities/disabled state, remains RLS isolated, and the website-wide contextual help coverage test confirms detailed ⓘ guidance on every major section.

Manual input gate:

No external account is required for the SDK foundation. Any future real connector that uses a third-party account will require explicit connection at the time that connector is added.

## Build 030 — Production Learning, Cost Review & Roadmap Renewal

Status: COMPLETE. Promotion uses the protected exact-tree path.

Goal: measure the completed local/authenticated/remote-capable platform, close reliability gaps, and generate the next evidence-based roadmap instead of extending the queue indefinitely by assumption.

Deliverables:

- usage and outcome review across Builds 019–029;
- sync conflict/error analysis;
- recipe repair success/failure analysis;
- barcode workflow adoption review;
- source-policy registry adoption, stale-policy and blocked-run review;
- remote pilot cost/reliability analysis;
- integration package/consumer readiness review;
- workspace/profile adoption review;
- connector SDK readiness review;
- storage/retention/cost review;
- security and permission review;
- documented unresolved evidence gaps;
- prioritized next roadmap based on measured need.

Acceptance: PASSED when authenticated /production-learning and /api/production-learning derive RLS-scoped evidence from Builds 019–029, distinguish measured zero from missing telemetry, expose Browserless readiness without secret values, classify risks with owners/actions, pass cross-account database acceptance, and generate the evidence-driven Builds 031–036 queue.

Manual input gate:

No infrastructure setup is required to complete Build 030. A real Browserless production-cost baseline remains an explicit next-step gate: the user now has a Browserless API key, but it must be entered only in the production host's encrypted environment settings before the controlled pilot.


## Build 031 — Operational Outcome Telemetry & Review Snapshot Continuity

Status: COMPLETE. Append-only operational telemetry, revision-linked repair outcomes, RLS/retention and persisted changed-evidence review snapshots are implemented.

Goal: close the two Build 030 P0 evidence gaps so synchronization and recipe-repair reliability can be measured rather than inferred.

Deliverables:

- append-only workspace sync outcome events for applied/conflict/noop/deleted/error;
- bounded recipe-repair attempt/approval/rollback/outcome telemetry;
- post-repair compatibility outcome linkage;
- review snapshot persistence for production-learning comparisons;
- workspace/RLS isolation and retention limits;
- production-learning trend cards for sync conflict and repair success/rollback rates.

Acceptance: PASSED when sync/repair GAP findings are replaced by durable measured rates, operational rows remain append-only under runtime permissions, review snapshots persist only changed evidence, and cross-account RLS isolation passes.

Manual input gate:

No external account or secret is required.

## Build 032 — Browserless Live Pilot & Provider Cost Baseline

Status: IMPLEMENTED — PRODUCTION PILOT GATED. The code, safe Vercel readiness state and baseline/go-no-go evidence layer are complete; the single live run is blocked until an operator approves and synchronizes one eligible Source Policy.

Goal: establish the first real controlled Browserless production baseline now that the user has obtained an API key.

Deliverables:

- safe production secret/readiness verification;
- one approved public-source pilot under existing Build 025/027 gates;
- provider units, duration, success/failure and response evidence;
- explicit post-pilot kill-switch restoration;
- first cost/reliability baseline in /production-learning;
- go/no-go evidence for any broader remote usage.

Acceptance: implementation/CI is complete when the provider prerequisite states and go/no-go logic pass; live acceptance remains open until one deliberately approved one-page production pilot produces a durable terminal provider event. The token must never be exposed and global/workspace kill gates must remain controllable.

Manual input gate:

BROWSERLESS_API_TOKEN already exists as an encrypted Vercel secret. REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED is set true and REMOTE_EXECUTION_KILL_SWITCH is intentionally true. Manual intervention is now limited to approving/synchronizing one eligible Source Policy and authorizing the exact one-run kill-switch window. The token must never be pasted into chat or GitHub.

## Build 033 — Integration Consumer Acceptance & Delivery Observability

Status: IMPLEMENTED — LIVE BUSINESS-CONSUMER ACKNOWLEDGEMENT GATED. Conformance receiver, authenticated sender handshake, dry-run transport and durable acknowledgement evidence are implemented; no supported business repository currently exposes the v1 receiver endpoint.

Goal: prove one real consumer-side handoff instead of treating package-contract conformance as delivery success.

Deliverables:

- authenticated consumer acceptance handshake;
- replay/staleness rejection evidence;
- delivery attempt/status audit;
- explicit accepted/rejected consumer acknowledgement;
- dashboard visibility without automatic operational writes.

Acceptance: implementation/CI passes when valid acceptance plus replay/stale/wrong-contract/wrong-target rejection, append-only delivery evidence and workspace isolation are proven. Live acceptance remains open until Rosie Dazzlers or Devil n Dove exposes the documented receiver and returns one authenticated dry-run acknowledgement.

Manual input gate:

No business receiver exists yet. When one target application implements the documented v1 receiver, configure only its HTTPS endpoint and dedicated encrypted bearer credential in Vercel, run conformance, test the handshake, then send exactly one dry-run package. Build 033 does not authorize live downstream mutation.

## Build 034 — Retention, Storage Budgets & Cleanup Automation

Status: IMPLEMENTED — PRODUCTION DESTRUCTIVE CLEANUP REMAINS EXPLICITLY APPROVAL-GATED.

Goal: convert Build 030's storage proxy into enforceable retention and cleanup outcomes.

Deliverables:

- per-module retention budgets;
- archive/delete eligibility preview;
- explicit cleanup policy;
- bounded automated cleanup for eligible evidence;
- before/after storage measurement;
- retention exceptions for append-only/security-critical evidence.

Acceptance: class budgets, archive/delete eligibility, fail-closed approval, bounded cleanup execution, before/after measurements, failure evidence and protected-evidence exclusions pass CI/database isolation. Production deployment itself does not authorize or run destructive cleanup.

Manual input gate:

No external account is required. The /retention page must show candidate rows first. A workspace owner/admin must explicitly approve bounded cleanup and separately confirm a cleanup run. Build 034 deployment alone never performs destructive production cleanup.

## Build 035 — Workspace, Profile & Connector Adoption / Permission Outcomes

Status: IMPLEMENTED — DURABLE ADOPTION / LEAST-PRIVILEGE REVIEW ACTIVE.

Goal: determine which generalized features are actually used and whether privileges remain proportionate.

Deliverables:

- profile/workspace adoption trends;
- feature-capability usage by profile;
- connector installation/grant/use outcomes;
- owner/admin/member permission review;
- stale/unused capability recommendations;
- barcode and scheduled-job adoption comparison.

Acceptance: per-workspace/profile capability use, connector grants/executions, owner/admin/member distribution and barcode/scheduled/remote/integration adoption are derived from durable evidence, fingerprint-snapshotted for trend continuity, and produce advisory least-privilege recommendations without mutating permissions.

Manual input gate:

No infrastructure setup is required. The /adoption review presents evidence and recommendations only; the user may choose which domains/connectors deserve further investment. Roles, profile capabilities and connector grants are never changed automatically.

## Build 036 — Production Learning II & Roadmap Renewal

Status: IMPLEMENTED — DURABLE RENEWAL CYCLE / FINITE ROADMAP ACTIVE.

Goal: repeat the Build 030 review after Builds 031–035 and renew the roadmap only from measured reliability, cost, adoption and unresolved gaps.

Deliverables:

- before/after comparison against Build 030;
- sync/repair trend review;
- Browserless cost/reliability review;
- integration delivery outcomes;
- retention/storage outcomes;
- adoption/permission outcomes;
- new evidence gaps;
- next prioritized roadmap.

Acceptance: PASSED when the authenticated review records bounded Build 036 cycle snapshots, compares sync/repair against the earliest durable post-Build-030 baseline without fabricating missing historical numbers, reports current Browserless/delivery/retention/adoption outcomes, names unresolved evidence gaps explicitly and replaces Build 036 with a finite evidence-driven queue.

Manual input gate:

No infrastructure setup is required. Business priorities may be adjusted after reviewing /production-learning, but the default queue remains finite and evidence-driven.


## Build 037 — Guided Production Adoption & First-Evidence Runbook

Status: IMPLEMENTED — EVIDENCE-CONDITIONAL RUNBOOK ACTIVE while any workspace remains at measured zero adoption.

Goal: use existing safe workflows to generate real production evidence before adding more platform features.

Priority: P1 when no workspace has durable activity.

Scope: guided first-use sequences for sync, source-policy, barcode/scheduled workflows where profile-appropriate, with explicit review gates and no synthetic activity.

Deliverables:

- authenticated /first-evidence workspace runbook and /api/first-evidence evidence view;
- profile-aware sync, source-policy, barcode and scheduled first-use sequencing;
- explicit Build 032 remote-execution and Build 033 integration-delivery gates;
- connector execution guidance only for already-installed/granted connectors;
- durable-evidence completion derived from existing RLS-scoped Build 035 adoption outcomes;
- Production Learning finding that becomes healthy when real operational adoption exists;
- no synthetic activity, no automatic capability enabling and no permission changes.

Acceptance: PASSED when profile-disabled workflows are not recommended, source-policy prerequisites gate scheduling, remote/integration operator gates remain intact, cross-account runbook isolation passes, and Build 037 leaves the active roadmap once durable operational adoption exists.

Manual input gate:

No new infrastructure is required. Use the runbook only for genuine work; the Chrome extension remains the operator surface for workspace sync, Source Policy Registry and local scheduling.

## Build 038 — Production Learning III & Trend Validation

Status: IMPLEMENTED — DURABLE TREND CHECKPOINT / ACTIVE QUEUE REDUCTION.

Goal: repeat the finite review after real operating activity or after unresolved Browserless/integration gates materially change.

Priority: P2.

Scope: persist a Build 038 cycle checkpoint, compare current sync/repair/provider/integration/retention/adoption outcomes with a genuinely historical Build 036 cycle when one exists, preserve unavailable history explicitly, close Build 038 itself after durable evidence, and leave only unresolved evidence gates active.


Delivered:

- migration `0016_production_learning_trend_validation.sql`;
- Build 038 cycle support in the existing bounded append-only cycle table;
- explicit `observation_context` so same-runtime Build 036 continuity rows cannot become false historical baselines;
- six-part Build 036 → Build 038 trend comparison;
- unavailable-baseline handling without synthetic zeros;
- durable Production Learning III finding;
- Build 038 removal from the active roadmap once its checkpoint is durable;
- no automatic Build 039 or speculative feature queue.

Acceptance: PASSED when Build 038 persists changed current evidence, eligible historical Build 036 rows are distinguished from same-runtime continuity rows, trend cards show numeric deltas only when a real baseline exists, Build 032/033/037 gates remain independently evidence-driven, and Build 038 removes itself after durable trend evidence.

Manual input gate:

No infrastructure setup is required. Future trend movement must come from normal real operations.


## Build 039 — Production Evidence Gate Closure & Operator Readiness

Status: IMPLEMENTED on dev; promotion follows the normal dev → main release path.

Goal: provide one production-learning readiness surface for the remaining evidence gates already created by Builds 032, 033 and 037, after the operator explicitly requested continued numbered development beyond Build 038.

Delivered:

- a Build 039 gate-closure model derived only from durable production evidence;
- OPEN/CLOSED status for the Browserless terminal provider baseline, supported business-consumer live dry-run acknowledgement and genuine operational adoption;
- exact next actions that reuse the original Build 032/033/037 controls rather than bypassing them;
- an authenticated Production Learning gate-closure section and contextual help;
- a healthy readiness state only when all three tracked gates have durable closure evidence;
- no synthetic provider runs, consumer acknowledgements or adoption events;
- no automatic permission, kill-switch, Source Policy or downstream mutation changes;
- extension version 0.39.0.

Acceptance: the production-learning review shows the three tracked evidence gates, reports only durable evidence as closure, remains fail-closed for incomplete gates, and reports normal-operations readiness only when all three are genuinely closed.


## Build 040 — Gate Closure Progress & Safe Intervention Sequencing

Status: IMPLEMENTED on dev; promotion follows the normal dev → main release path.

Goal: convert Build 039's OPEN/CLOSED gate visibility into a prerequisite-aware operator sequence without automatically changing production state.

Delivered:

- COMPLETE / ACTIONABLE / BLOCKED classification for the Build 032, Build 033 and Build 037 evidence gates;
- Browserless readiness derived from token presence, provider flag, approved Source Policy, allowlist and intended workspace-arm prerequisites;
- adoption actionability only for authorized visible workspaces and genuine profile-appropriate work;
- consumer-delivery actionability only after an approved/exported package and conformance acceptance exist;
- priority ordering applied only among ACTIONABLE gates so a blocked P0 item never authorizes bypass;
- an explicit next safe intervention or a prerequisite-only blocked state;
- contextual help and extension version 0.40.0;
- no provider call, receiver call, permission mutation, environment-variable change, Source Policy approval or synthetic evidence creation.

Acceptance: Build 040 recommends only a safe actionable stage, exposes exact prerequisite blockers for blocked stages, preserves originating Build 032/033/037 controls, and stops recommending interventions when all tracked gates are durably complete.


## Build 041 — Operator Intervention Preflight & Completion Evidence

Status: IMPLEMENTED on dev; promotion follows the normal dev → main release path.

Goal: turn Build 040's next-safe-intervention selection into an operator-readable preflight/completion packet without executing the consequential action.

Delivered:

- preflight checks for the selected Build 032, Build 033 or Build 037 intervention;
- explicit stop conditions that preserve Source Policy, kill-switch, contract, dry-run and adoption-integrity boundaries;
- durable completion-evidence requirements for each intervention;
- Browserless preflight includes token, provider flag, approved Source Policy, allowlist, workspace arm and fail-closed kill-switch state;
- operational-adoption preflight explicitly forbids synthetic activity and profile-capability bypass;
- consumer-delivery preflight requires exported package/conformance and preserves dry-run-only downstream behavior;
- no packet after all tracked evidence gates are durably complete;
- contextual help and extension version 0.41.0;
- no provider execution, receiver delivery, environment change, permission mutation or synthetic evidence creation.

Acceptance: Build 041 produces a read-only preflight for only the currently selected safe intervention, exposes stop conditions and durable completion evidence, and removes the packet when all tracked gates are complete.


## Build 042 — Intervention Outcome Reconciliation & Closure Verification

Status: IMPLEMENTED on dev; promotion follows the normal dev → main release path.

Goal: reconcile the outcome of Build 032, Build 033 and Build 037 interventions from originating durable evidence after Build 041 preflight, without allowing checklist state to become proof.

Delivered:

- VERIFIED / INCONCLUSIVE / NOT COMPLETE reconciliation for each tracked intervention;
- Browserless verification requires terminal provider evidence plus restored fail-closed global kill-switch state;
- operational-adoption verification requires genuine durable activity without observed use of disabled profile capabilities;
- consumer-delivery verification requires a durable accepted supported-consumer live dry-run acknowledgement;
- durable rejection/transport failure without acceptance is surfaced as INCONCLUSIVE instead of silently retried;
- per-intervention durable evidence, reconciliation explanation and bounded follow-up;
- all-verified aggregate only when all three originating evidence paths reconcile cleanly;
- contextual help and extension version 0.42.0;
- no provider retry, receiver retry, permission/profile mutation or synthetic evidence creation.

Acceptance: Build 042 never derives closure from a checklist or page view, reports incomplete and inconclusive outcomes explicitly, and reports all outcomes VERIFIED only when the originating durable evidence and required safety state support that conclusion.


## Build 043 — Application Command Center & Workspace Home

Status: **PRODUCTION GREEN — promoted to main via PR #52 after dev and PR verification.**

Goal: move the application from infrastructure/readiness-first landing content to a practical signed-in workspace home without creating a second telemetry source.

Delivered:

- authenticated Application Command Center on the root page;
- authorized workspace cards using existing adoption evidence and profile/role identity;
- top-level counts for active workspaces, measured attention conditions, durable activity and managed storage footprint;
- operational pulse for sync, barcode capture, scheduled attempts, remote runs and integration events;
- attention chips derived from existing permission-review, profile-mismatch, storage-budget, remote-failure and delivery-transport evidence;
- latest remote-provider and integration-delivery evidence sorted by durable timestamps;
- direct launch links to the major working surfaces;
- contextual help and responsive command-center styling;
- extension version 0.43.0;
- no new database table, migration, automatic execution, permission/profile mutation or synthetic activity.

Acceptance: a signed-in user sees only authorized workspaces, command-center totals are derived from existing RLS-scoped evidence, measured attention conditions surface without changing state, recent evidence is timestamp ordered, signed-out visitors see no private workspace evidence, and all existing workflow safety boundaries remain authoritative.


## Rejected build record — Build 048 Performance and Resource-Budget Review

Status: **REJECTED — DO NOT PROMOTE / DO NOT TREAT AS QUEUED WORK.**

The experimental Build 048 scope was explicitly rejected by the operator on 2026-10-11 and reverted before production promotion. Its rejected implementation was never promoted to `main`. Future application builds must follow the approved product roadmap rather than reviving this rejected scope without a new explicit operator request.


## Build 044 — Unified Data Library & Record Explorer

Status: **PRODUCTION GREEN — promoted to main via PR #55 after dev and PR verification.**

Goal: give authorized users one searchable, paginated workspace library for durable records without duplicating those records into another persistence layer.

Delivered:

- authenticated `/data-library` route and Command Center navigation;
- one RLS-scoped union across saved scrapers, saved templates, reviewed datasets, intelligence modules and barcode captures;
- workspace and record-type filters, bounded full-text-style search, deterministic sorting and server-side pagination;
- browser-local named saved views that preserve query filters without writing workspace data;
- record explorer showing workspace/profile identity, record/version status, observed/updated timestamps and originating source reference;
- side-by-side normalized/summary, raw durable payload and provenance inspection;
- visible tombstone, duplicate, pending-review and rejected-review flags derived only from durable source state;
- safe http/https source links with non-web references rendered as text;
- responsive library UI, contextual help and Build 044 verification;
- extension version 0.44.0;
- no migration, library-copy table, record mutation, inferred confidence score or synthetic data.

Acceptance: only authorized workspace records are visible; supported record types can be searched, filtered, sorted and paginated; out-of-range pagination clamps safely; raw and normalized representations remain distinguishable; provenance and durable quality flags remain visible; saved views are local-only; and the explorer cannot mutate originating records.


## Build 045 — Source & Collection Project Manager

Status: **PRODUCTION GREEN — promoted to main via PR #58 after dev and PR verification.**

Goal: add a durable project-management layer for real source collection work without weakening Source Policy, scraper, scheduling or remote-execution controls.

Delivered:

- migration `0017_collection_projects.sql`;
- RLS-scoped `workspace_collection_projects` and `workspace_collection_project_sources`;
- owner/admin-only project/source mutation with member read visibility;
- project name, factual purpose, lifecycle, cadence, responsible-person label and notes;
- source URL/origin, collection method, lifecycle, cadence and notes;
- optional exact Source Policy ID and saved scraper/template linkage;
- dynamic READY / BLOCKED / INCOMPLETE evaluation from current Source Policy approval/expiry/origin/method and active linked scraper evidence;
- non-destructive project archive and source retirement;
- authenticated `/collection-projects` manager plus API;
- Command Center navigation, responsive UI and contextual help;
- pure validation/readiness verification plus PostgreSQL persistence/RLS cross-account verification;
- extension version 0.45.0;
- no automatic Source Policy approval, scraper creation, scheduled job creation, remote execution or collection launch.

Acceptance: authorized members can read only their workspace projects; only owners/admins can mutate; URLs/origins/methods are normalized and bounded; current governance/scraper mismatches fail closed as blockers; cross-account project data remains invisible; lifecycle changes are non-destructive; and project readiness never substitutes for execution authorization.


## Build 046 — Visual Extraction Recipe Builder

Status: **PRODUCTION GREEN — promoted to main via PR #61 after dev and PR verification.**

Goal: turn the existing extension-only version-1 extraction recipe workflow into a durable product-level authoring surface without creating a competing recipe format or weakening collection controls.

Delivered:

- authenticated `/recipe-builder` workspace authoring surface;
- exact reuse of the existing version-1 recipe contract (record selector, fields, extraction source, attribute, required flag and transforms);
- synchronized read/write through the existing `workspace_saved_scrapers` source of truth;
- optimistic concurrency with stale-edit conflict behavior and retained recipe revision history;
- Build 045 collection-project source presets;
- field cards with add, duplicate, reorder, remove and bounded 20-field editing;
- deterministic recipe validation for record selector, duplicate keys, field selectors and attribute requirements;
- source-safe http/https URL normalization;
- template vs scraper save modes, with source URL required for scraper mode;
- portable JSON import/export;
- browser-local sample-HTML preview capped at 100 matched records / 20 displayed rows;
- deterministic text/link/image/attribute extraction plus existing transform semantics;
- extension live-page recipe picker relabeled as the Build 046 live-page companion;
- Command Center navigation, contextual help and responsive UI;
- pure recipe validation tests and PostgreSQL synchronized-revision/conflict/RLS verification;
- extension version 0.46.0;
- no remote source fetch, Source Policy approval, schedule creation, remote execution or downstream business write.

Acceptance: users can author or revise the same recipe format used by the extension, preview it safely against supplied HTML, save synchronized revisions without lost updates, and retain workspace isolation; live-page selection stays in the extension and all collection authorization remains outside the builder.

## Build 047 — Collection Run Console & Live Evidence

Status: **PRODUCTION GREEN — promoted to main via PR #64 after dev/main verification; Vercel production deployment `dpl_6KqrG9RajGf8xAWqhYBhz836d8CK` is READY for release SHA `40bb1e3f7e4e8bb50f0e29c453f9df2e68219065`.**

Goal: make real collection execution observable and controllable from one authenticated product surface while preserving the existing local-Chrome and Browserless authorization boundaries.

Delivered:

- authenticated `/collection-runs` operational console;
- Build 045 project/source context and current readiness on every run card;
- local Chrome mode backed by synchronized Build 017 scheduled-job attempts;
- Browserless mode backed by existing Build 026/027 remote jobs, results, workspace controls and allowlists;
- exact Source Policy ID/revision/fingerprint carried from current project evidence;
- fail-closed Browserless launch unless project/source lifecycle, linked scraper, HTTPS, public-web policy, provider runtime, workspace arm and exact allowlist pin are all current;
- live polling only while remote jobs are active;
- prepared/queued/leased/running/succeeded/failed/cancelled/timed-out evidence;
- pages attempted/succeeded/failed/cancelled, recorded rows, errors and Browserless provider units;
- durable Stop / cancel requests observed by the active Browserless worker;
- failed/timed-out/cancelled one-page retry without presenting successful pages as retry candidates;
- browser-generated JSON run report containing current project/source/policy/local/remote evidence;
- Command Center navigation, contextual help and responsive styling;
- extension continuity version 0.47.0;
- no new database table, migration, Source Policy approval path, workspace-arm bypass or unattended local Chrome execution.

Acceptance: authorized users see only RLS-scoped project/run evidence; local Chrome remains operator-present and extension-owned; Browserless remains behind all existing provider/policy/allowlist/kill-switch gates; active cancellation is observed during provider work; retry is offered only for failed terminal one-page attempts; and run reports contain recorded evidence rather than fabricated progress or cost.

## Build 048 — Data Review, Cleanup & Approval Workbench

Status: **PRODUCTION GREEN — promoted through dev/main verification on 2026-10-12; GitHub Actions release verification and main push verification passed; Neon migrations 0017/0018 are applied; Vercel production is READY.**

Goal: turn durable collected datasets into an explicit cleanup and approval workflow before later publishing/export handoff, while preserving the source payload as immutable review evidence.

Delivered:

- migration `0018_data_review_workbench.sql`;
- RLS-scoped `workspace_data_review_batches` plus append-only `workspace_data_review_events`;
- exact source dataset ID, server version and canonical payload fingerprint pinned into each review snapshot;
- deterministic string whitespace cleanup on a working copy only;
- duplicate-cleaned-row identification with duplicate rows defaulted excluded rather than deleted;
- side-by-side original evidence and editable cleaned-row JSON;
- explicit row inclusion/exclusion and bounded cleanup-draft saves;
- owner/admin-only terminal approval or rejection;
- terminal decisions for an exact source version/fingerprint, with a changed source version returning as a new candidate;
- portable approved/rejected decision snapshot download;
- authenticated `/data-review` workbench, API, Command Center navigation, contextual help and responsive UI;
- deterministic cleanup/edit validation plus PostgreSQL persistence/RLS/audit verification;
- no overwrite of `workspace_reviewed_datasets`, no automatic downstream business write, no new external service and no paid dependency.

Acceptance: **PASSED.** Only authorized workspace datasets/review batches are visible; review creation pins the current durable source version/fingerprint; automatic cleanup never mutates original evidence; fabricated row IDs, oversized edits and all-row exclusion fail closed; terminal approval/rejection requires owner/admin authority; review events remain append-only through the runtime role; approved/rejected batches reject later cleanup edits; and downstream business systems remain unchanged. Release evidence: PR #66 → dev, PR #67 → main, verification runs 38208624258 and 38208730424 GREEN, production Neon migration ledger includes 0017/0018, and Vercel deployment dpl_4omoR13yvArkxeqh7E7KfAmRoYAi is READY for main SHA 1e2b63b4a1418a3e07302eeb1f40b6d8ee5fd987.

This Build 048 is the approved application-roadmap build and is separate from the rejected Performance and Resource-Budget Review experiment retained above.

## Build 049 — Approved Dataset Publishing & Export Handoff

Status: **PRODUCTION GREEN — promoted through dev/main verification on 2026-10-12; migration 0019 is applied and verified in production Neon; Vercel production is READY.**

Goal: convert a terminal Build 048 approval into one canonical, immutable and auditable publication snapshot that can be handed off as JSON or CSV without mutating the approved review or silently writing into a business system.

Delivered:

- migration `0019_approved_dataset_publishing.sql`;
- RLS-scoped `workspace_dataset_publications` and append-only `workspace_dataset_publication_events`;
- approved-review-only publication creation with owner/admin authority;
- one canonical publication per exact approved review;
- immutable included cleaned-row snapshot, stable field order and publication fingerprint;
- exact source dataset ID/version/fingerprint plus Build 048 approval provenance;
- self-describing JSON export with manifest and rows;
- stable CSV export with nested values encoded as canonical JSON text;
- export audit events for JSON and CSV generation;
- copyable handoff manifest for provenance-only transfer;
- non-destructive publication withdrawal that blocks future platform exports;
- authenticated `/approved-data` workbench, API/export endpoints, Command Center link, responsive styling and contextual help;
- deterministic export/fingerprint tests plus PostgreSQL approval/RLS/audit/withdrawal verification;
- no overwrite of Build 048 review evidence, no unapproved publishing, no automatic downstream business write and no new paid service.

Acceptance: **PASSED.** Only authorized workspace members can inspect/export publication evidence; only owners/admins can publish or withdraw; a publication can originate only from a terminal approved Build 048 review; excluded rows never enter the snapshot; published cleaned values remain frozen; one approved review cannot create competing publications; cross-account access fails closed; export events are append-only; withdrawal prevents future platform exports; and previously downloaded files are explicitly treated as non-recallable copies. Release evidence: implementation PR #70 → dev; release PR #71 → main; PR Verify run 38246794390 GREEN; production Neon migration ledger includes 0019 with publication RLS and withdrawal-only UPDATE grants verified; and Vercel deployment dpl_3JWkL88WBjQ1QfdEivPMzVJTtxJQ is READY for main SHA dd6b79af163ae6091cb8daead8d981ddfbc4bdfb.

## Build 050 — Approved Publication Delivery Mapping & Consumer Receipt Bridge

Status: **PRODUCTION GREEN — promoted through dev/main verification on 2026-10-12; migration 0020 is applied and verified in production Neon; Vercel production is READY.**

Goal: bridge an immutable Build 049 publication into the existing Build 033 consumer protocol with explicit field mapping, conformance-first validation and an append-only receipt chain that proves exactly which publication and mapping produced a consumer acknowledgement.

Delivered:

- migration `0020_publication_delivery_bridge.sql`;
- RLS-scoped immutable `workspace_publication_delivery_mappings`;
- append-only `workspace_publication_delivery_receipts`;
- owner/admin-only mapping creation and retirement;
- explicit Rosie Dazzlers / Devil n Dove target selection;
- explicit create/update intent rather than inferred consumer state;
- explicit integration-key, source-evidence URL/timestamp and target-field mapping;
- mapping validation against every frozen publication row;
- duplicate-key, non-scalar-value, invalid URL/timestamp and unsupported-contract-field rejection;
- generated Build 033 v1 package identity bound to publication ID/fingerprint and mapping ID/fingerprint;
- local conformance consumer with replay rejection;
- reuse of existing configured HTTPS consumer endpoint and server-only bearer credential for external handshake/dry-run;
- append-only receipts for accepted, rejected and transport-error outcomes;
- authenticated `/approved-data/delivery` workbench, API, Command Center/publishing links, contextual help and responsive UI;
- pure deterministic mapping/package tests plus PostgreSQL mapping/RLS/immutability/receipt verification;
- no arbitrary outbound endpoint, no new credential, no automatic mapping inference and no live downstream mutation.

Acceptance: **PASSED.** Only authorized workspace data is visible; only owners/admins can create/retire mappings or execute bridge actions; withdrawn publications and retired mappings fail closed; mapping content cannot be mutated by the runtime role; package identity binds publication and mapping fingerprints; conformance replay is rejected; external transport stays Build 033 authenticated HTTPS dry-run; receipt evidence is append-only; and cross-account mapping/package access remains denied. Release evidence: implementation PR #74 → dev; syntax correction PR #75 → dev; joined-row typing correction PR #76 → dev; release PR #77 → main; dev Verify run 38269492737 (#569) GREEN; release PR Verify run 38269686730 (#570) GREEN; main Verify run 38269844795 (#571) GREEN; production Neon migration ledger includes 0020 with mapping/receipt RLS and retirement-only mapping UPDATE grants verified; and Vercel deployment dpl_63Ty5GiRHnVARZY7fp8mkRYyZ3k3 is READY for main SHA a7bebaf5551369d6386bcf949560f251de422e93.

## Build 051 — Controlled Consumer Activation & Idempotent Live Delivery

Status: **PRODUCTION GREEN — promoted through dev/main verification on 2026-10-12; migration 0021 is applied and verified in production Neon; Vercel production is READY.**

Goal: permit live business-consumer mutation only after the Build 049 publication and Build 050 mapping/receipt chain is complete, with temporary explicit activation, consumer-proven replay-key idempotency, sender-side durable reservation and terminal no-resend behavior.

Delivered:

- migration `0021_controlled_live_delivery.sql`;
- RLS-scoped `workspace_consumer_live_activations`;
- RLS-scoped canonical `workspace_publication_live_deliveries`;
- owner/admin-only live activation and revocation;
- 24-hour activation window pinned to publication fingerprint, mapping fingerprint, package ID/replay key/fingerprint, consumer origin and accepted external dry-run receipt;
- activation requires an accepted Build 050 external dry-run from the exact consumer/package within the preceding 24 hours;
- fresh live-capability handshake requires `liveMutationEnabled=true`;
- fresh live-capability handshake also requires `idempotency.keySource=replayKey` and `duplicateBehavior=return-original-ack`;
- target-specific typed activation confirmation and a separate typed confirmation for every live send;
- canonical sender-side delivery reservation unique by workspace + consumer origin + package ID before outbound mutation;
- `Idempotency-Key` and replay-key headers bound to the immutable package replay key;
- accepted and rejected live results become terminal and are never automatically resent;
- transport-error outcomes may retry only with the same activation/package identity and same idempotency key, with a bounded retry count;
- fresh live/idempotency handshake revalidation before every live mutation attempt;
- reuse of Build 033 configured HTTPS endpoint/bearer transport, no redirects and bounded timeout;
- Build 050 publication-linked receipt plus Build 033 integration event/consumer-receipt continuity for accepted live delivery;
- authenticated `/approved-data/live-delivery` workbench, API, navigation, contextual help and responsive UI;
- deterministic live-capability/fingerprint tests plus PostgreSQL activation/RLS/immutable-identity/idempotent-retry verification;
- no arbitrary endpoint, no browser credential, no activation inferred from configuration, and no unbounded retry.

Acceptance: **PASSED.** Only owners/admins may activate, revoke or send live; an active Build 050 mapping and published Build 049 snapshot are required; the configured consumer origin must match the recent accepted dry-run; live/idempotency capability is revalidated; activation expires after 24 hours; publication/mapping/package/activation identity columns cannot be mutated by the runtime role; a live delivery is reserved before network mutation; accepted/rejected outcomes are terminal; transport-error retry reuses the exact replay key and is bounded; cross-account activation/delivery state remains invisible; and revocation/expiry prevents new live sends. Release evidence: implementation PR #80 → dev; help-verifier correction PR #82 → dev; release PR #81 → main; corrected dev Verify run 38274901441 (#577) GREEN; main-target PR Verify run 38274909528 (#578) GREEN; independent main Verify run 38275448570 (#579) GREEN; production Neon migration ledger includes 0021 with activation/live-delivery RLS and identity-protecting column grants verified; and Vercel deployment dpl_6E89KWnUpRkqZx9kRBP9APbHSrBq is READY for main SHA 35402017499888cea186b15ae33c11679e590b72.

## Build 052 — Post-Delivery Reconciliation & Consumer State Verification

Status: **PRODUCTION GREEN — promoted through corrected dev/main verification on 2026-10-12; migration 0022 is applied and verified in production Neon; Vercel production is READY.**

Goal: prove what the downstream consumer currently holds after an accepted Build 051 live delivery by reconstructing the exact historical package, performing a read-only consumer state query, comparing only package-governed fields and preserving immutable drift evidence without automatic correction.

Delivered:

- migration `0022_post_delivery_reconciliation.sql`;
- RLS-scoped append-only `workspace_live_delivery_reconciliations`;
- reconciliation eligibility restricted to accepted Build 051 live deliveries;
- exact historical package reconstruction from immutable Build 049 publication + Build 050 mapping evidence;
- package ID, replay key and package fingerprint must match the accepted live-delivery row before consumer verification;
- historical reconciliation remains possible after publication withdrawal or mapping retirement;
- current configured consumer origin must match the origin that accepted the live delivery;
- fresh read-only capability handshake requires `stateVerificationSupported=true`;
- verification request sends package identity plus expected integration keys/field names, not expected field values;
- consumer response must cover every expected integration key exactly once and may report found or missing;
- server-side comparison covers only the fields governed by the delivered package;
- consumer-managed fields outside the package are ignored;
- matched, mismatched and missing counts;
- per-record expected/observed fingerprints plus differing governed field names;
- rejected and transport-error verification outcomes retained distinctly from actual drift;
- repeated verification creates additional evidence so later drift can be observed over time;
- authenticated `/approved-data/reconciliation` workbench, API, navigation, contextual help and responsive UI;
- deterministic capability/response/comparison tests plus PostgreSQL historical-reconstruction/RLS/append-only verification;
- no automatic repair, rollback, delivery retry or corrective mutation.

Acceptance: **PASSED.** Only authorized workspace evidence is visible; only owners/admins may run verification; only accepted live deliveries are eligible; historical package reconstruction reproduces the exact accepted package identity even after publication/mapping closure; changed consumer origin fails closed; state-verification capability and complete unique-key response are mandatory; matched/drift outcomes are derived from server-side comparison of package-governed fields; full observed records are not copied into the ledger; reconciliation rows cannot be updated or deleted by the runtime role; and no discrepancy causes an automatic downstream write. Release evidence: implementation PR #86 → dev; typing correction PR #88 → dev; GET auth correction PR #89 → dev; release PR #87 → main; corrected dev Verify run 38320041104 (#587) GREEN; corrected main-target PR Verify run 38320046984 (#588) GREEN; independent main Verify run 38320247702 (#589) GREEN; production Neon migration ledger includes 0022 with reconciliation RLS and SELECT/INSERT-only runtime grants verified; and Vercel deployment dpl_HzqxevLb6Ecp8D2hUWZ2QSn6oVXq is READY for main SHA 426537771df15e9d30277db799d0aae5e04faf3d.

## Build 053 — Reconciliation Exception Triage & Corrective Delivery Planning

Status: **PRODUCTION GREEN — promoted through corrected dev/main verification on 2026-10-12; migration 0023 is applied and verified in production Neon; Vercel production is READY.**

Goal: turn immutable Build 052 drift into a controlled exception case and, only when explicitly intended, a frozen corrective delivery plan that can be reviewed without performing any downstream mutation.

Delivered:

- migration `0023_reconciliation_exception_triage.sql`;
- RLS-scoped reconciliation exception cases with controlled triage-field updates;
- one canonical exception case per exact drift reconciliation;
- classification, severity, resolution intent, summary and investigation notes;
- immutable pinned reconciliation fingerprint, package ID/fingerprint, affected integration keys and affected-field snapshot;
- RLS-scoped corrective delivery plans with immutable package/replay/reconciliation identity and immutable correction scope;
- plan scope generated only from mismatched/missing Build 052 records and original accepted-package governed values;
- mismatched records scope only differing governed fields;
- missing records originally created are marked restore-missing;
- missing records originally updated are marked manual-review rather than assuming creation is safe;
- deterministic plan fingerprint and duplicate-plan canonicalization;
- proposed → approved/rejected/withdrawn review lifecycle with terminal review evidence;
- authenticated `/approved-data/reconciliation/triage` workbench, API, navigation, contextual help and responsive UI;
- deterministic scope/fingerprint tests plus PostgreSQL canonical-case/plan/RLS/immutability/review verification;
- no consumer call, no new live activation, no dryRun=false request and no corrective execution.

Acceptance: **PASSED.** Only Build 052 drift may open a case; one reconciliation cannot create competing cases; source reconciliation/package identity remains immutable; only owners/admins may triage or create/review plans; plan scope comes only from original governed values and proven mismatch/missing evidence; runtime cannot mutate frozen plan scope or pinned evidence; terminal review status cannot be overwritten; and plan approval does not execute or authorize a downstream write inside Build 053. Release evidence: implementation PR #92 → dev; lint correction PR #93 → dev; release PR #94 → main; corrected dev Verify run 38329354571 (#594) GREEN; main-target PR Verify run 38329505465 (#595) GREEN; independent main Verify run 38329665022 (#596) GREEN; production Neon migration ledger includes 0023 with case/plan RLS and identity-protecting column grants verified; and Vercel deployment dpl_3yxtDxdy984MKX4ACtXCFqvNWyzE is READY for main SHA 5d5ae2273d8c37538ae4b5473377270e979d78d4.

Next queued: **Build 054 — Approved Corrective Delivery Activation & Idempotent Execution.**
