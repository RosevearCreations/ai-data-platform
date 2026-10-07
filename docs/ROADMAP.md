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

## Build 025 — Remote Execution Provider Abstraction & Cloud Worker Readiness

Status: QUEUED — NOT STARTED.

Goal: prepare a provider-neutral remote execution architecture without immediately turning on unattended cloud crawling.

Deliverables:

- provider-neutral remote execution contract;
- job lease/claim/heartbeat model;
- workspace-scoped remote-run authorization;
- encrypted server-side execution configuration;
- bounded run/page/record/time budgets;
- source-policy approval copied into the remote job;
- same source-origin/access-control rules as local extraction;
- idempotent result ingestion;
- cancellation and timeout handling;
- worker health/readiness reporting;
- local mock worker for CI;
- feature flag that keeps production remote execution disabled by default.

Acceptance: the platform can prove the remote job lifecycle end-to-end with a mock/non-production worker while production remote crawling remains disabled until a provider is deliberately selected and configured.

Manual input gate:

No provider account is required to complete this readiness build. Provider selection is intentionally deferred to Build 026.

## Build 026 — Controlled Remote Browser Pilot & Egress Policy

Status: QUEUED — NOT STARTED.

Goal: enable the first deliberately scoped remote-browser pilot with explicit egress/proxy policy, cost limits and source restrictions.

Deliverables:

- selected remote-browser provider adapter;
- selected egress model: direct first, proxy only where lawful/necessary;
- encrypted provider credentials;
- workspace allowlist of approved remote sources;
- per-job spend/time/page/record budgets;
- concurrency limits;
- robots/terms/source-policy evidence attached to remote jobs;
- no CAPTCHA solving or authentication bypass;
- optional proxy configuration only for approved use cases;
- provider health/failure telemetry;
- kill switch;
- pilot limited to explicitly approved non-sensitive sources;
- cost and reliability report before broader enablement.

Acceptance: one approved source can complete a bounded remote run through the provider adapter, with cost/limits/audit evidence visible, and the kill switch can stop remote execution immediately.

Manual input gate:

This build requires the user's provider choice and one-time credential setup. Do not request credentials in chat. Follow the dashboard walkthrough in the detailed plan document.

## Build 027 — Configurable Workspace Types & Domain Profiles

Status: QUEUED — NOT STARTED.

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

Acceptance: an authorized owner can create a new workspace using a supported profile, extraction/review/history remain isolated, and existing three workspaces retain their current behavior.

Manual input gate:

No setup required. The user will choose the name/purpose of any first new workspace when they actually create one.

## Build 028 — Plugin & Connector SDK Foundation

Status: QUEUED — NOT STARTED.

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

Acceptance: a sample connector can be registered, configured, tested and disabled through the SDK without modifying extractor core code, and connectors cannot access workspaces/capabilities they were not granted.

Manual input gate:

No external account is required for the SDK foundation. Any future real connector that uses a third-party account will require explicit connection at the time that connector is added.

## Build 029 — Production Learning, Cost Review & Roadmap Renewal

Status: QUEUED — NOT STARTED.

Goal: measure the completed local/authenticated/remote-capable platform, close reliability gaps, and generate the next evidence-based roadmap instead of extending the queue indefinitely by assumption.

Deliverables:

- usage and outcome review across Builds 019–028;
- sync conflict/error analysis;
- recipe repair success/failure analysis;
- barcode workflow adoption review;
- remote pilot cost/reliability analysis;
- integration package/consumer readiness review;
- workspace/profile adoption review;
- connector SDK readiness review;
- storage/retention/cost review;
- security and permission review;
- documented unresolved evidence gaps;
- prioritized next roadmap based on measured need.

Acceptance: the platform has an evidence-backed operational review, known risks are documented with owners/actions, and the next numbered roadmap is generated from observed usage and reliability rather than speculation.

Manual input gate:

The user may be asked to confirm business priorities after the measured review is presented. No infrastructure setup is required.
