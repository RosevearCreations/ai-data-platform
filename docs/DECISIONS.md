# Decisions

This file records durable architectural/product decisions. New decisions should be appended rather than silently changing history.

## D0001 — Dedicated repository

Decision: The shared platform lives in `RosevearCreations/ai-data-platform`, not inside Rosie Dazzlers, Devil n Dove or YW.

Reason: no business application should own infrastructure shared by the others.

## D0002 — One platform, multiple workspaces

Decision: Rosie Dazzlers, Devil n Dove and Personal are separate workspaces in one platform.

Reason: extraction, provenance, matching and review logic should be built once while data access remains isolated.

## D0003 — Local-first extraction

Decision: interactive extraction initially runs in the Chrome extension.

Reason: it provides a useful product before building costly remote browser infrastructure.

## D0004 — AI interprets; deterministic code repeats

Decision: AI is used for semantic work and recipe assistance. Normal code performs bulk extraction and arithmetic whenever possible.

Reason: lower cost, higher predictability, easier testing.

## D0005 — Evidence is canonical provenance

Decision: every external fact should be traceable to a URL/dataset and retrieval time.

Reason: comparisons and updates must be auditable.

## D0006 — Review before production writes

Decision: scraped/enriched data does not automatically overwrite Rosie Dazzlers or Devil n Dove production data by default.

Reason: prevent incorrect extraction or AI interpretation from corrupting business records.

## D0007 — Provider-neutral AI

Decision: core application logic calls internal AI tasks rather than vendor-specific APIs directly.

Reason: providers, models and pricing change.

## D0008 — Supabase persistence baseline — SUPERSEDED

Decision: use Supabase Postgres/Auth/Storage initially, with RLS-based workspace isolation.

Reason: strong relational model, auth and existing project familiarity.

Status: Superseded by D0011 after storage-capacity constraints were identified.

## D0009 — Prefer APIs/datasets over scraping

Decision: where a suitable official API or dataset exists, prefer it over page scraping.

Reason: reliability, policy compliance and lower maintenance.

## D0010 — Shared platform does not share business databases directly

Decision: integrations occur through explicit adapters and approved jobs.

Reason: preserve application boundaries and reduce blast radius.


## D0011 — Portable PostgreSQL + Better Auth

Decision: use provider-portable PostgreSQL for persistence and Better Auth for authentication. Neon is the initial managed PostgreSQL host.

Reason: the platform needs more independent storage capacity without coupling authentication, authorization or migrations to a single hosted database product.

## D0012 — Runtime-role RLS boundary

Decision: user-scoped application queries switch transaction-locally to the non-owner `ai_data_runtime` role and set the Better Auth user ID only for that transaction.

Reason: PostgreSQL table owners normally bypass RLS. Using a restricted runtime role preserves database-level workspace isolation while allowing migrations and owner bootstrap tasks to use the administrative connection deliberately.

## D0013 — Temporary active-tab DOM inspection

Decision: Build 003 inspects pages with Chrome's `activeTab` and `scripting` permissions after a user invokes the extension. The extension does not request persistent broad host permissions.

Reason: the Page DOM Inspector only needs temporary access to the page the user explicitly chooses. This reduces permission scope and avoids continuous background access to browsing content.

The inspector captures bounded structural/text/attribute summaries and does not collect form values, passwords, cookies, local/session storage, or page JavaScript state.

## D0014 — Exact and generalized selector capture

Decision: the visual picker returns both an exact selector for the chosen element and a generalized selector intended to reveal repeated peer fields.

Reason: exact selectors support verification and one-off targets, while generalized selectors support later multi-record extraction. Build 004 reports match counts and previews selector matches before later recipe-building features consume them.

Selector generation prefers stable IDs and semantic attributes, then stable class combinations, and falls back to structural position only when uniqueness requires it.

## D0015 — Repeating-record detection is deterministic and confidence-scored

Decision: Build 005 detects repeated record boundaries with deterministic DOM heuristics before any AI involvement.

The detector scores candidates using repeat ratio, structural consistency, record count, text richness, descendant richness, link/image coverage and semantic structures such as tables, lists and articles. Navigation/header/footer structures are penalized.

A selected field can also guide boundary inference by finding repeated sibling ancestors around all matching field elements.

Reason: record boundaries are foundational extraction logic. Deterministic evidence is cheaper, testable and explainable, while AI can later assist only when these signals are ambiguous.

## D0016 — Versioned portable extraction recipes

Decision: Build 006 introduces extraction recipe schema version 1. A recipe contains one repeated-record selector plus ordered field rules with a relative selector, extraction source, optional attribute, required flag and deterministic transforms.

Supported extraction sources are text, link URL, image URL and safe attributes. Supported transforms are trim, whitespace collapse, lowercase, uppercase, number and currency.

Reason: recipes must be portable, inspectable and executable without AI. Versioning gives future builds a stable compatibility boundary as recipe capabilities grow.

Build 006 only drafts and tests recipes locally in the active tab. Persistent recipe storage is intentionally deferred to the Saved Scrapers and Templates milestone.

## D0017 — Review datasets are explicit working copies

Decision: Build 007 creates a separate reviewed-dataset working copy from a successful extraction run.

Cell edits, row inclusion/exclusion, column ordering and dropped columns modify only that review copy. The original extraction result and extraction recipe remain unchanged for traceability.

Reviewed datasets are saved locally in the extension origin in Build 007. Backend persistence and business-system integration remain deferred.

Reason: human review must be reversible and must never silently mutate source evidence or production business data.

## D0018 — AI suggests semantics; deterministic tools own selectors

Decision: Build 008 uses AI only to suggest extraction fields, semantics, preferred extraction sources, required-state guidance and deterministic transforms.

AI output does not create or approve CSS selectors. Selector selection remains the responsibility of the deterministic visual picker, repeating-record detector and recipe engine from Builds 004–006.

The server uses bounded sample records rather than the full page DOM. If AI Gateway is not configured or fails, the endpoint returns deterministic suggestions instead of failing the platform.

Reason: AI is useful for interpreting extraction intent, but selectors are operational scraping instructions and must remain inspectable, testable and user-verifiable.

## D0019 — Pagination uses bounded traversal and optional per-site navigation access

Decision: Build 009 supports four pagination modes: next-button, numbered pages, load-more and infinite scroll.

Load-more and infinite-scroll runs stay within the existing user-invoked page grant. Next-button and numbered-page runs require an optional host permission scoped to the current HTTP(S) origin because Chrome revokes temporary active-tab access when the tab navigates.

The extension declares optional HTTP(S) host patterns but requests only the current origin at runtime after the user chooses navigational pagination. The user can remove that site access from the pagination panel.

Every pagination run has hard page/step, record and wait limits plus progress/stall, repeated-state and cross-origin stop conditions.

Reason: multi-page extraction must remain bounded and reviewable without granting silent permanent access to every website.

## D0020 — Detail enrichment fetches public same-origin HTML without credentials

Decision: Build 010 follows detail/subpage URLs by making bounded extension-origin fetches after the user grants optional access to the current site.

Detail requests use `credentials: "omit"`, accept HTML, enforce the original origin after redirects, parse responses as inert `text/html`, and never execute fetched scripts.

Repeated detail URLs are fetched once and their extracted values are reused. Removing duplicate parent rows is a separate explicit opt-in choice.

Reason: subpage enrichment should add public record detail without navigating the user's tab, reusing logged-in target-site sessions, or silently deleting parent records.

## D0021 — Exports are generated locally from explicit review state

Decision: Build 011 exports datasets directly from the extension review workspace without a backend export service.

Users choose reviewed versus original extracted values, included versus all rows, visible versus all columns, and whether warnings/source evidence are included. CSV and XLSX are tabular exports; JSON preserves structured record metadata.

XLSX is generated as a real Office Open XML workbook. CSV formula-like string values are neutralized before download to reduce spreadsheet formula-injection risk.

Reason: export should preserve the user's explicit review decisions, remain portable/offline, and avoid unnecessary upload or server processing of scraped datasets.


## D0022 — Finish authenticated continuity before remote execution

Decision: after Build 018, the roadmap prioritizes authenticated workspace binding, durable cross-device persistence and persistent audit continuity before enabling remote/cloud browser execution.

Reason: the platform already has a provider-portable PostgreSQL/Better Auth foundation, while many valuable extension workflows remain browser-local. Moving directly to remote crawling would add operational cost and complexity before the core workspace/session/persistence boundary is complete.

## D0023 — Remote execution remains provider-neutral and disabled until a bounded pilot

Decision: remote execution is split into a provider-neutral readiness build and a later controlled provider pilot. Production remote crawling remains feature-flagged off until the provider, source allowlist, budgets, credentials and egress policy are explicitly approved.

Reason: this preserves the local-first architecture, avoids premature vendor lock-in and makes cost/access-policy controls testable before unattended execution exists.

## D0024 — Integration consumers must implement the contract deliberately

Decision: Build 018 JSON packages are not upgraded into guessed HTTP writes. A business application must explicitly implement, authenticate and validate the shared adapter contract before live ingestion is enabled.

Reason: independent applications should not inherit hidden coupling or accidental write semantics. Contract verification and replay/staleness rules must exist before transport activation.


## D0025 — Extension auth uses a short-lived bearer bridge, not shared browser cookies

Decision: the Chrome extension authenticates through a user-initiated Chrome Identity web flow. The existing Better Auth web session authorizes issuance of a random short-lived extension token; only its hash is stored server-side. The extension then presents that bearer token to a narrow session/workspace endpoint.

Reason: relying on cross-site Better Auth cookies from a `chrome-extension://` context is fragile under SameSite/third-party-cookie policy and would blur the boundary between the web session and extension. The bearer bridge keeps ordinary web credentials in the web app, gives the extension an explicit revocable lifetime, and preserves RLS-based workspace authorization.


## D0026 — Local-first cache with optimistic workspace synchronization

Decision: saved scrapers/templates and reviewed datasets remain available in the extension's local cache while PostgreSQL becomes their durable authenticated cross-device store. Each server record has a monotonically increasing version and deletions use tombstones. Concurrent stale writes are surfaced as conflicts rather than merged silently.

Reason: the extension must remain usable during temporary network loss, but cross-device continuity requires a server source of truth. Queue-before-network plus optimistic versions preserves offline operation without adopting last-write-wins data loss.

## D0027 — Legacy local records migrate by explicit copy, never implicit reassignment

Decision: existing local records with no workspace ID are not automatically attributed to the currently active workspace. The user must explicitly copy them into a selected authenticated workspace; the original unscoped local record remains retained.

Reason: Build 019 could not prove which historical workspace owned an unscoped record. Silent assignment would create a cross-workspace provenance risk.


## D0028 — Persist stable intelligence modules as versioned workspace snapshots

Decision: Builds 013–018 use a shared workspace intelligence snapshot boundary rather than six separate backend persistence implementations. Module payload contracts remain domain-specific and bounded; server versions provide optimistic concurrency.

Reason: the existing modules already have explicit local schemas and retention limits. A shared durable envelope minimizes schema duplication while preserving workspace isolation and conflict visibility.

## D0029 — Business approval audit is append-only outside mutable module state

Decision: integration audit entries are persisted both inside the bounded local module snapshot and in a dedicated append-only server table. Runtime code has no update/delete privilege on the append-only table.

Reason: approval, export and cancellation evidence must survive browser loss and must not be erasable by replacing the latest module snapshot.


## D0030 — Integration package identity excludes transport time

Decision: package fingerprint/packageId are derived from approved business content and approval/source timestamps, not generatedAt/expiresAt. Re-exporting the same approved batch therefore keeps the same package identity and replay key.

Reason: a repeated export of the same approved decision is a replay from the consumer's perspective and must not gain a new identity merely because it was downloaded again.

## D0031 — Consumer contracts are fail-closed and allowlist-only

Decision: v1 receivers must reject unknown versions, wrong schema IDs/contracts, unexpected fields, invalid evidence, stale/expired packages, fingerprint mismatch and duplicate package IDs. Unknown fields are never ignored into a write path.

Reason: consumer readiness requires deterministic compatibility and prevents future platform fields from silently changing an older business application's mutation semantics.
