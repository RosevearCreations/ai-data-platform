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


## D0032 — Repair candidates are deterministic; AI may explain but never create selectors

Decision: Build 023 generates selector candidates entirely in the page-local deterministic drift engine. Optional AI receives only bounded issue metadata, bounded structural context, bounded samples and the existing candidate IDs. Server sanitization discards any AI ranking that references a candidate ID not generated by the deterministic engine.

Reason: AI can improve explanation and prioritization without becoming an authority that silently changes operational CSS selectors.

## D0033 — Recipe repair and rollback always create new revisions

Decision: approved repair and rollback operations append a new saved-scraper revision. Existing revision history is not rewritten. The previous revision archives its last compatibility report and structural fingerprint when available.

Reason: drift repair needs auditable provenance and a reversible path. Appending a revision also preserves Build 017's scheduled-job revision pinning so repaired recipes cannot enter scheduled execution without explicit re-review.


## D0034 — Mobile camera capture belongs to the authenticated web app

Decision: Build 024 camera/manual capture is implemented at /capture in the web application rather than relying on the Chrome extension.

Reason: mobile Chrome environments do not provide the same desktop extension surface. The authenticated web app gives the phone a first-class capture path while reusing workspace membership, PostgreSQL RLS and cross-device durable intelligence.

## D0035 — Barcode approval is a reviewed handoff, not a direct inventory/ownership mutation

Decision: a barcode capture may propose an exact existing movie/supplier match, but approval records a reviewed handoff only. It does not update movie ownership fields or Devil n Dove internal inventory fields.

Reason: scanning an identifier is evidence, not authorization to overwrite user-owned operational data. Existing Build 015/016 review rules remain authoritative.

## D0036 — Camera access is explicit and non-continuous

Decision: getUserMedia is called only from the Start camera user action. Camera tracks are stopped on successful detection, explicit Stop camera and component cleanup. No geolocation API is used.

Reason: barcode capture needs a narrow camera capability, not persistent device surveillance or location data.


## D0037 — Recurring-source approval is a durable registry record

Decision: Build 025 replaces reusable scheduling-only source checkboxes with a workspace-scoped source policy registry keyed by normalized origin.

Reason: terms, robots/crawl decisions, authorization, sensitivity and crawl budgets are properties of a reviewed source relationship, not ephemeral form state. A durable registry makes the same evidence available to local jobs, cross-device recovery and future remote workers.

## D0038 — Scheduled jobs pin an exact policy revision and fingerprint

Decision: scheduled job approval stores the Build 025 registry policy ID, revision and fingerprint. Create, refresh, re-enable and run paths fail closed if the current policy is missing, blocked, expired or different.

Reason: silently inheriting a later policy edit would let operational permission change without explicit job review. Exact pinning keeps governance auditable and makes policy changes intentionally invalidate prior approval.

## D0039 — Public webpage crawling requires resolved robots/crawl review

Decision: public-webpage policy entries cannot become runnable while robots/crawl status is unknown or disallowed. Official API/dataset and user-export methods may mark robots as not applicable while remaining subject to their own terms and authorization.

Reason: governance should prefer permitted structured sources and must not treat technical accessibility as blanket permission to automate collection.


## D0043 — Browserless Cloud is the first controlled remote-browser provider

Decision: Build 027 selects Browserless Cloud and uses only its plain /content REST endpoint for the pilot.

Reason: current provider review showed a low-friction free entry tier, regional service and a rendered-browser REST call that requires no new browser SDK dependency. This lets the pilot prove real remote rendering while keeping Browserless proxy, stealth, CAPTCHA and authentication-bypass capabilities outside the code path.

## D0044 — The first provider pilot is direct egress only

Decision: no Browserless proxy, external proxy, BrowserQL, unblock, stealth or CAPTCHA feature is enabled in Build 027.

Reason: the first remote run should validate the execution boundary, policy evidence, costs and kill controls rather than add evasion complexity. Proxy use remains a future explicit review if a lawful business need exists.

## D0045 — Remote pilot activation requires three independent gates

Decision: live execution requires the Build 026 execution flag, a global kill switch explicitly set false, and an enabled workspace whose kill switch is false.

Reason: provider credentials or a single UI toggle must never be sufficient to start remote browsing. Layered kill gates make accidental activation and emergency shutdown predictable.


## D0046 — Workspace slugs are identity; profiles are behavior

Decision: Build 028 keeps stable workspace IDs/slugs but moves configurable domain behavior into reusable workspace_profiles.

Reason: adding a new domain must not require another branch of slug-specific extractor code. Profiles provide normalization, review, provenance/history policy, templates and capabilities while RLS continues to isolate workspace data.

## D0047 — Custom profiles begin conservative

Decision: generic/custom profiles enable history and source-policy governance but keep scheduling, remote execution, barcode intake and business-integration writes disabled until explicitly configured.

Reason: an unknown domain should inherit evidence/review protections without silently inheriting higher-risk automation.

## D0048 — Built-in specialized behavior keys from profile identity

Decision: existing Personal barcode behavior is tied to personal-media and Devil n Dove barcode behavior to maker-commerce rather than merely checking legacy slugs.

Reason: workspace slugs can now expand freely. Specialized workflows need an explicit capability/domain contract instead of accidental string identity.


## D0049 — Connector code is statically registered, not uploaded

Decision: SDK v1 accepts code changes through the repository/release process rather than arbitrary runtime JavaScript uploads.

Reason: workspace capability grants are useful only if the executable itself has passed repository review and CI. This also prevents an SDK feature from becoming a general remote-code-execution path.

## D0050 — Connector secrets are references to exact manifest-declared environment variables

Decision: workspace configuration may store a secret reference but never a credential value or arbitrary environment-variable name.

Reason: credentials must remain in encrypted server environment storage, and a connector must not be able to request unrelated application secrets such as DATABASE_URL.

## D0051 — Contextual help is a required website contract

Decision: every major website section exposes a circled ⓘ with detailed operating guidance; external setup appears as ordered Manual intervention instructions.

Reason: operational safety depends on explaining workspace selection, review gates, kill switches, credentials and variables at the point of use rather than only in developer documentation.


## D0052 — Missing production telemetry is an evidence gap, not zero

Decision: Build 030 labels an operational outcome GAP when the platform does not durably record the event required to calculate it.

Reason: a zero conflict rate or zero repair failure rate would be misleading when conflicts/repair outcomes are not stored as durable production events. This directly prioritizes Build 031.

## D0053 — Cost review uses durable units and storage proxies, not hard-coded prices

Decision: remote cost evidence records Browserless estimated units/duration and storage review uses measured bounded payload bytes. The application does not convert these into a permanent dollar price.

Reason: external provider/database pricing changes independently of release code. Durable usage units can be combined with current billing data operationally without making stale pricing part of the evidence model.

## D0054 — Production-learning queries remain inside the normal RLS boundary

Decision: /production-learning is a normal authenticated workspace view, not a privileged cross-account analytics console.

Reason: learning/metrics must not weaken the same workspace isolation that protects the operational data being measured.

## D0055 — Roadmap renewal is evidence-driven and finite

Decision: Build 030 renews the queue only through Build 036. Build 036 must repeat production learning before another long roadmap is created.

Reason: the platform should close observed reliability/cost/adoption gaps before adding speculative feature depth.

## D0056 — Operational outcome telemetry is bounded and append-only

Decision: Build 031 records only terminal synchronization outcomes and bounded recipe-repair lifecycle metadata in a workspace-scoped append-only table. Runtime code can SELECT and INSERT but cannot UPDATE or DELETE these events.

Reason: reliability rates need durable event counts, but copying full synchronized payloads, DOM evidence or selector content would unnecessarily increase storage and privacy risk.

## D0057 — Repair approval and compatibility evidence are derived from synchronized revision state

Decision: repair approval/rollback events are inferred server-side from saved-scraper revision kinds after successful synchronization, while proposal/rejection events may be submitted through the bounded extension endpoint.

Reason: the server already receives the durable revision state. Deriving material terminal outcomes there reduces client spoofing and avoids a second source of truth.

## D0058 — Production-learning snapshots persist only changed evidence

Decision: Build 031 fingerprints the outcome counts used for trend comparison and stores a new review snapshot only when that fingerprint changes.

Reason: dashboard refreshes are not operational events. Deduplicating unchanged reviews preserves useful before/after continuity without unbounded read-generated history.
