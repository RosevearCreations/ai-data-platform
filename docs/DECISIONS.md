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

## D0059 — Build 032 source eligibility is computed from current policy payloads

Decision: a Browserless pilot source is eligible only when the current Source Policy payload itself satisfies the public-webpage/public-facts approval, terms, robots, expiry and no-bypass gates. Summary counts do not authorize execution.

Reason: the live provider gate must be tied to the actual reviewed policy revision, not a stale or malformed summary.

## D0060 — Provider readiness is not a production baseline

Decision: token-configured, provider-enabled, allowlisted and armed states are prerequisites only. Build 032 remains pending until a real terminal Browserless provider event exists.

Reason: deployment configuration cannot prove network reliability, duration or provider consumption.

## D0061 — Build 032 go/no-go does not expand remote execution automatically

Decision: the first provider baseline can produce only pending, go-bounded or no-go. A go-bounded result preserves the existing one-page, two-unit and explicit-kill-window constraints.

Reason: one successful sample is sufficient to establish a baseline, not sufficient to justify unattended or broader crawling.

## D0062 — Conformance acceptance is not live consumer acceptance

Decision: Build 033 stores internal conformance acceptance and external business-consumer acceptance as separate transport modes. Production learning closes the Build 033 roadmap item only after a live external consumer returns an authenticated dry-run acknowledgement.

Reason: validating our own receiver semantics is valuable CI evidence, but it cannot prove that an independent business application has implemented the contract correctly.

## D0063 — Live integration delivery uses configured target endpoints only

Decision: the delivery API never accepts a destination URL or bearer credential from the browser. Each supported target has a dedicated server environment URL/secret pair.

Reason: allowing arbitrary client-selected destinations would turn the integration sender into an SSRF/credential-forwarding surface.

## D0064 — Build 033 transport is dry-run only

Decision: the sender sets `dryRun=true` and rejects a consumer acknowledgement that reports a live mutation. Enabling downstream mutation requires a later explicit consumer-side approval/build.

Reason: proving authenticated delivery and acknowledgement should not silently convert an evidence pipeline into an operational write path.

## D0065 — Retention cleanup is a narrow capability, not a DELETE grant

Decision: Build 034 keeps general runtime DELETE permissions unchanged and exposes one security-definer cleanup function limited to approved workspace owners/admins, two low-risk age-gated data families and a bounded row count.

Reason: storage management should not weaken the existing append-only/security audit model.

## D0066 — Production cleanup approval is separate from deployment approval

Decision: deploying Build 034 never sets `cleanup_approved=true` and never runs the cleanup function. An operator must review /retention, approve a workspace, and separately confirm one cleanup batch.

Reason: the roadmap explicitly requires approval before destructive production cleanup, and software release approval is not equivalent to data-deletion approval.

## D0067 — Archive candidates are preview-only in Build 034

Decision: synchronized tombstones older than 180 days are surfaced as manual-archive candidates but are not auto-deleted or moved by Build 034.

Reason: synchronized records can carry business/repair continuity semantics that should not be destroyed merely to satisfy storage pressure.

## D0068 — Adoption evidence is observational, never self-fulfilling

Decision: Build 035 measures capability use only from existing durable workspace evidence. It never creates synthetic jobs, captures, connector runs or integration events to make a feature appear adopted.

Reason: investment decisions must reflect actual operational behavior.

## D0069 — Connector grant use requires terminal execution evidence

Decision: a connector grant counts as used only when the same connector/capability has a succeeded or failed execution audit. Blocked attempts remain security evidence but do not count as grant adoption.

Reason: an attempted action outside a grant must not justify keeping or expanding that grant.

## D0070 — Least-privilege recommendations do not mutate permissions

Decision: Build 035 may recommend review of admins, high-risk unused profile capabilities or connector grants, but it cannot change workspace roles, profile capability flags or connector grants.

Reason: adoption analytics should inform an operator decision, not silently change authorization.

## D0071 — Adoption trend snapshots are bounded and fingerprint-deduplicated

Decision: workspace adoption snapshots persist only compact counts/keys, deduplicate unchanged evidence by SHA-256 fingerprint, and retain at most 365 days / 60 snapshots per workspace.

Reason: Build 036 needs before/after continuity without turning adoption analytics into an unbounded data store.

## D0072 — Build 030 comparison must not invent historical numbers

Decision: Build 036 uses the earliest durable post-Build-030 sync/repair snapshot for numeric trend continuity. For provider cost, delivery, retention and adoption metrics that did not have an equivalent Build 030 durable snapshot, the report states that no numeric baseline existed.

Reason: a qualitative evidence gap is not a numeric zero and must not be rewritten as one.

## D0073 — Roadmap renewal is finite

Decision: after Build 036 persists renewal evidence, Build 036 removes itself from the active queue. The queue may retain unresolved Builds 032/033, conditionally add Build 037 for zero-adoption evidence, and add Build 038 as the next trend-validation checkpoint.

Reason: the platform should not grow through an indefinitely extended speculative queue.

## D0074 — Renewal snapshots are compact and append-only

Decision: Build 036 stores only bounded counts/flags, deduplicates unchanged evidence by fingerprint and grants the runtime no UPDATE/DELETE permission.

Reason: roadmap continuity requires durable evidence without creating another mutable or unbounded analytics store.

## D0075 — First-evidence guidance does not manufacture evidence

Decision: Build 037 is a derived runbook. It never inserts sync, barcode, provider, connector or integration activity on its own.

Reason: adoption must represent real operations rather than test artifacts created to satisfy a dashboard.

## D0076 — Profile capability flags define runbook applicability

Decision: a workflow disabled by the workspace profile is shown as not applicable and is never automatically enabled by the runbook.

Reason: guidance must preserve the Build 028 profile boundary.

## D0077 — Earlier high-risk gates remain authoritative

Decision: Build 037 may link to remote execution and integration delivery, but it keeps Build 032 and Build 033 approval gates explicit and never treats those actions as ordinary first-use steps.

Reason: a first-adoption goal cannot weaken provider, source-policy or downstream-write safety.

## D0078 — Same-runtime continuity is not a historical trend baseline

Decision: Build 038 tags new cycle rows with `observation_context='build-038-runtime'`. Only pre-existing `legacy` Build 036 cycle rows are eligible for Build 036 → 038 numeric comparison.

Reason: deploying or opening Build 038 must not manufacture its own historical baseline.

## D0079 — Build 038 closes itself without inventing Build 039

Decision: once at least one authorized Build 038 cycle snapshot is durable, Build 038 leaves the active roadmap. No new numbered feature build is created merely to keep the queue moving.

Reason: the roadmap remains evidence-driven and finite.

## D0080 — Trend absence is a valid result

Decision: when no eligible Build 036 baseline exists, Build 038 reports the baseline unavailable and preserves current metrics as a new checkpoint. It does not reinterpret unavailable history as zero.

Reason: a missing measurement is different from a measured zero.


## D0081 — Explicit operator priority may extend the finite roadmap

Decision: D0079 remains the default anti-speculation rule, but an explicit operator request may create a later numbered build when its scope is grounded in existing durable evidence or a clearly stated business priority. Build 039 therefore consolidates the already-open Build 032/033/037 production evidence gates rather than inventing an unrelated feature queue.

Reason: a finite evidence-driven roadmap should prevent automatic feature churn, not prevent an authorized operator from deliberately continuing work.

## D0082 — Build 039 coordinates evidence; it never manufactures closure

Decision: Build 039 marks Browserless, consumer delivery and operational adoption gates closed only from the same durable evidence that their originating builds already require. It never inserts synthetic events, changes profile capability flags, opens kill switches, approves Source Policies or enables downstream mutation.

Reason: a readiness dashboard is useful only if it preserves the authority and safety boundaries of the underlying evidence.


## D0083 — Priority never overrides prerequisite safety

Decision: Build 040 applies P0/P1/P2 ordering only among gates already classified ACTIONABLE. A higher-priority gate that lacks prerequisites remains BLOCKED and cannot suppress a lower-priority safe action or justify bypassing its original control boundary.

Reason: roadmap priority expresses business urgency, not authorization to weaken Source Policy, kill-switch, contract or identity controls.

## D0084 — Intervention sequencing is read-only

Decision: Build 040 derives COMPLETE/ACTIONABLE/BLOCKED state from existing authenticated evidence and configuration-presence signals only. The sequencing layer performs no external call and mutates no operational gate.

Reason: deciding what is safe to do next should remain separate from performing the consequential action.


## D0085 — Preflight guidance is not execution authorization

Decision: Build 041 may explain prerequisites, stop conditions and completion evidence for the Build 040-selected intervention, but it cannot execute or authorize the consequential action itself.

Reason: operational readiness and operational execution must remain separate so Source Policy, kill-switch, receiver-authentication and workspace-approval boundaries stay explicit.

## D0086 — Gate completion must be proven by originating durable evidence

Decision: Build 041 considers an intervention complete only when the existing Build 032, 033 or 037 durable evidence already used by Production Learning proves closure. A checklist completion or page view is never sufficient.

Reason: operator guidance must not become a second, weaker source of truth.


## D0087 — Reconciliation cannot create closure evidence

Decision: Build 042 may classify existing intervention evidence, but it cannot create, repair, retry or substitute for the Build 032, 033 or 037 evidence that closes a gate.

Reason: outcome review must remain observational or it could manufacture the success it is supposed to verify.

## D0088 — Restored safety state is part of operational reconciliation

Decision: durable action evidence can close an originating evidence gate while Build 042 still reports the operational outcome INCONCLUSIVE when required post-action safety state is not restored, such as a Browserless global kill switch left open.

Reason: completing an experiment and leaving its temporary control window open are separate facts; the latter must remain visible.


## D0089 — The application home composes existing evidence instead of creating dashboard telemetry

Decision: Build 043 derives the command center from the existing adoption, remote-execution, retention and integration-delivery query layers. It does not add a dashboard event table or persist page-view state.

Reason: the workspace home should summarize sources of truth rather than become another source of truth that can drift from operational evidence.

## D0090 — The command center is navigation and review, not an execution boundary

Decision: Build 043 may surface attention conditions and direct links, but it performs no provider call, downstream delivery, cleanup, permission/profile change or other consequential action from the home page.

Reason: centralizing visibility should not centralize or weaken the explicit confirmation and safety boundaries already enforced by the underlying workflows.


## D0091 — The Unified Data Library is a read model, not a new source of truth

Decision: Build 044 queries existing RLS-scoped durable tables directly and does not persist a copied library/index table.

Reason: a unified explorer is valuable only if records cannot drift from their originating scraper, reviewed dataset, intelligence or barcode sources of truth.

## D0092 — Record quality indicators must be durable facts, not inferred confidence

Decision: Build 044 may display tombstone, duplicate and explicit review-state flags already present in the originating record, but it does not manufacture confidence, verification or quality scores from payload shape.

Reason: the record explorer must preserve evidence semantics rather than turn UI heuristics into trusted data.

## D0093 — Saved library views are local navigation state

Decision: named Build 044 saved views store only the bounded query string in browser localStorage and never persist workspace data or authorization state.

Reason: reusable navigation should not create another backend state model or cross workspace security boundary.


## D0094 — Collection projects organize intent but do not authorize collection

Decision: Build 045 stores durable project/source organization and derives readiness, but it cannot approve Source Policy, create/enable a schedule, open remote execution gates or run collection.

Reason: project-management convenience must not become a parallel execution or governance authority.

## D0095 — Source readiness is derived from current originating evidence

Decision: Build 045 does not persist a trusted readiness flag. It recomputes readiness from the linked current Source Policy and active saved scraper/template evidence every time projects are listed.

Reason: policy expiry, revision or scraper retirement must immediately block the project instead of leaving a stale green state.

## D0096 — Collection project lifecycle is non-destructive

Decision: projects are archived and project sources are retired rather than deleted through the application runtime.

Reason: collection planning and source history are operational evidence and should remain reviewable after work stops.


## D0097 — Build 046 reuses the version-1 extraction recipe contract

Decision: the web Visual Extraction Recipe Builder authors the same record-selector/field/source/transform recipe shape already used by the Chrome extension and synchronized saved scraper records.

Reason: a second web-only recipe schema would fragment compatibility with live-page picking, scheduling, repair history and later collection execution.

## D0098 — Web preview is supplied-HTML only

Decision: Build 046 preview parses only HTML pasted into the user's browser and never fetches the configured source URL.

Reason: recipe authoring must not become an implicit crawler or bypass Source Policy and controlled execution boundaries.

## D0099 — Recipe save uses synchronized optimistic concurrency

Decision: web-authored recipes save through the existing workspace sync mutation boundary and preserve stale-edit conflicts plus revision history.

Reason: web and extension editing must share one durable source of truth and must never silently overwrite each other.

## D0099 — Build 047 orchestrates existing execution authorities

Decision: the Collection Run Console may observe synchronized local Chrome evidence and invoke the existing controlled Browserless pilot, but it does not introduce another execution engine or another approval state.

Reason: Build 017 already owns operator-present Chrome extraction, while Builds 026/027 own remote lifecycle, exact Source Policy pins, allowlists, kill switches and bounded Browserless execution. Reusing those authorities prevents a web-console convenience layer from weakening governance.

## D0100 — Active console cancellation is durable and worker-observed

Decision: Stop / cancel writes the existing `cancel_requested_at` lifecycle signal. The active Browserless route polls that durable signal alongside global/workspace kill switches and refuses to commit success after cancellation is observed.

Reason: changing only a browser button state would not stop provider work and would not be auditable.

## D0101 — Failed-page retry never treats success as retryable

Decision: Build 047 exposes Retry failed page only when the latest terminal Browserless one-page job failed, timed out or was cancelled and all current gates remain valid.

Reason: the controlled Browserless boundary is currently one page. A successful page is durable terminal evidence and must not be silently repeated under the semantics of failure recovery.


## D0100 — Build 048 snapshots review evidence instead of mutating source datasets

Decision: the Data Review workbench copies the exact source dataset payload/version/fingerprint into a durable review batch and performs cleanup on a separate working-row representation.

Reason: cleanup must remain auditable against original evidence, and approval must not silently rewrite the synchronized source dataset.

Consequence: source data changes create a new review candidate; approved/rejected review batches are terminal for the pinned version/fingerprint.

## D0101 — Build 048 approval is a handoff, not a downstream write

Decision: owner/admin approval records durable review evidence and a portable decision snapshot but does not automatically publish into Rosie Dazzlers, Devil n Dove or another business system.

Reason: review quality and downstream mutation authority are separate control boundaries.

Consequence: Build 049 can implement explicit approved-dataset publishing/export handoff without weakening Build 048 traceability.


## D0102 — Build 049 publishes one immutable snapshot per approval

Decision: one exact terminal Build 048 review may create only one canonical `workspace_dataset_publications` row, containing the included approved cleaned rows and publication fingerprint.

Reason: export handoffs need a stable referent. Regenerating from later source or review state would make the same publication identity mean different data.

Consequence: corrected data requires a new reviewed/approved source version rather than editing or republishing the existing snapshot.

## D0103 — Build 049 exports files but does not deliver them to consumers

Decision: Build 049 generates audited JSON/CSV files and provenance manifests only. It does not call Rosie Dazzlers, Devil n Dove or another receiver.

Reason: publication authority and downstream mutation/delivery authority remain separate safety boundaries.

Consequence: Build 050 may map an approved publication into an explicitly controlled consumer-delivery package and receipt flow while preserving the Build 049 fingerprint as source evidence.


## D0104 — Build 050 reuses the Build 033 consumer protocol

Decision: an approved publication is mapped into the existing version-1 Rosie Dazzlers / Devil n Dove consumer package rather than introducing a Build 050-specific transport schema.

Reason: receiver validation, HTTPS/bearer transport, dry-run semantics, replay behavior and acknowledgement validation were already hardened in Build 033.

Consequence: Build 050 adds publication/mapping provenance around that protocol but cannot weaken its transport gates.

## D0105 — Publication delivery mappings are immutable

Decision: target, create/update intent, key field, evidence fields and field map are immutable after mapping creation. Runtime UPDATE is limited to non-destructive retirement state.

Reason: a receipt must identify one stable transformation from one immutable publication to one consumer package.

Consequence: corrections create a new mapping and new mapping fingerprint; earlier receipts remain interpretable.

## D0106 — Build 050 remains dry-run only

Decision: external package delivery still forces `dryRun=true`, even though Build 050 now has a complete publication→mapping→package→receipt evidence chain.

Reason: proving receipt continuity is different from authorizing business-system mutation.

Consequence: Build 051 is the earliest build that may consider controlled live activation, with consumer-side idempotency and explicit enablement required first.


## D0107 — Live authority is temporary and evidence-pinned

Decision: Build 051 live mutation requires a 24-hour activation tied to one immutable publication/mapping/package identity, one configured consumer origin and one recent accepted external dry-run receipt.

Reason: a configured credential or earlier conformance result is not sufficient evidence that the current consumer/package is safe to mutate.

Consequence: activation expiry, revocation, mapping retirement, publication withdrawal or consumer-origin change blocks new live sends.

## D0108 — Consumer-side idempotency is mandatory before live mutation

Decision: live activation and every live attempt require a consumer handshake with `liveMutationEnabled=true`, `idempotency.keySource=replayKey` and `duplicateBehavior=return-original-ack`.

Reason: after a transport timeout the sender may not know whether mutation occurred. Safe retry requires the receiver to recognize the same replay key and return the original result instead of mutating again.

Consequence: consumers that support Build 050 dry-run but do not advertise this idempotency capability remain live-disabled.

## D0109 — Sender reserves canonical delivery identity before the network call

Decision: Build 051 creates one durable live-delivery identity per workspace + consumer origin + package ID before sending `dryRun=false`.

Reason: sender-side concurrency/replay protection must exist before the consequential action, not only after an acknowledgement.

Consequence: accepted/rejected rows are terminal; transport-error rows may retry only with the same activation/package/replay key and within the bounded retry count.

## D0110 — Live delivery still requires per-send operator confirmation

Decision: activation does not authorize unattended mutation. Every Build 051 live send requires a separate typed target-specific confirmation.

Reason: temporary live capability and intent to execute a particular consequential delivery are different decisions.

Consequence: scheduling or unattended live delivery requires a later explicit build and may not reuse Build 051 activation as implicit authorization.


## D0111 — Reconciliation is read-only and independent of live activation

Decision: Build 052 verification never reuses Build 051 live activation and never sends a mutation request.

Reason: proving current downstream state and authorizing a consequential write are different security decisions.

Consequence: an expired/revoked activation does not block historical verification, while reconciliation can never become implicit authorization for correction.

## D0112 — Historical delivery remains verifiable after publication or mapping closure

Decision: Build 052 reconstructs the accepted package from immutable publication/mapping fields even if the publication is later withdrawn or mapping retired, then requires exact identity equality with the accepted live-delivery row.

Reason: withdrawal/retirement should stop future handoff, not destroy the ability to audit an already executed delivery.

Consequence: historical verification is possible without reopening the publication or mapping.

## D0113 — Consumer verification request withholds expected values

Decision: the verify-state request supplies package identity, integration keys and governed field names but not expected values.

Reason: a consumer should return independently read current state rather than being handed the answer it is expected to prove.

Consequence: comparison remains server-side and a consumer cannot satisfy verification by blindly echoing requested expected values.

## D0114 — Drift evidence is append-only and non-remediating

Decision: Build 052 persists matched/mismatched/missing fingerprints and differing governed field names but performs no automatic repair, rollback, retry or corrective delivery.

Reason: discrepancy detection is evidence; corrective action requires a separate intent and safety review.

Consequence: Build 053 may triage reconciliation exceptions and prepare corrective plans, but Build 052 itself cannot mutate either side.


## D0115 — One canonical triage case per reconciliation

Decision: Build 053 permits one exception case for each exact Build 052 drift reconciliation.

Reason: duplicate cases could create competing interpretations and corrective plans for the same immutable evidence.

Consequence: repeated case creation returns the existing canonical case.

## D0116 — Corrective values come only from the accepted package

Decision: Build 053 derives desired values server-side from the original accepted package and includes only fields proven mismatched/missing by Build 052.

Reason: planning must not turn free-form browser input into unreviewed business data.

Consequence: changing desired data requires a new upstream publication/mapping path rather than editing a corrective plan.

## D0117 — Missing update targets remain manual-review

Decision: when Build 052 says a record is missing but the original package operation was `update`, Build 053 marks the plan item `manual-review` instead of changing it to create.

Reason: existence semantics may carry business meaning and cannot be inferred safely from absence.

Consequence: a later execution build must resolve this condition explicitly before mutation.

## D0118 — Plan approval is not execution authority

Decision: Build 053 approval records review of the immutable planning artifact but has no downstream transport or mutation capability.

Reason: exception analysis and consequential execution require separate control boundaries.

Consequence: Build 054 must establish fresh activation/idempotency/execution gates rather than treating Build 053 approval alone as permission to write.


## D0119 — Corrective execution gets a new package and replay identity

Decision: Build 054 derives a new integration package from the approved Build 053 plan instead of resending the original Build 051 package.

Reason: the original replay key already identifies the original accepted mutation. Reusing it could cause the consumer to return the original acknowledgement instead of applying the reviewed correction.

Consequence: corrective package ID, replay key and fingerprint are deterministically bound to the approved plan ID/review evidence.

## D0120 — New reconciliation evidence supersedes an unexecuted corrective plan

Decision: Build 054 requires the Build 053 plan's reconciliation to remain the newest reconciliation for the original accepted delivery.

Reason: a later read-back may show that the consumer state changed after triage.

Consequence: stale plans fail closed and require fresh triage/planning from the newer reconciliation.

## D0121 — Corrective activation requires an accepted dry-run and expires quickly

Decision: approved plans receive at most a one-hour activation only after fresh live/idempotency capability and an accepted dry-run of the exact corrective package.

Reason: reviewed intent should not become durable standing write authority.

Consequence: activation is plan/package/consumer-specific and expires no later than the package's 24-hour approval window.

## D0122 — Corrective mutation uses sender reservation and replay-key idempotency

Decision: the sender persists the canonical corrective delivery identity before contacting the consumer and uses the corrective replay key as `Idempotency-Key`.

Reason: network uncertainty must not create duplicate downstream mutation.

Consequence: accepted/rejected results are terminal; transport-error alone may retry with unchanged identity and a bounded attempt count.

## D0123 — Accepted transport is not exception closure

Decision: Build 054 leaves the Build 053 case/plan approval state intact after an accepted corrective delivery.

Reason: transport acknowledgement proves receipt, not current downstream state.

Consequence: Build 055 must independently reconcile the corrective outcome before exception closure.


## D0124 — Corrective transport acceptance is not resolution

Decision: Build 055 requires an independent read-back after an accepted Build 054 corrective delivery.

Reason: an acknowledgement proves delivery handling, not the consumer's resulting current state.

Consequence: no exception may close from Build 054 transport evidence alone.

## D0125 — Corrective read-back withholds expected values

Decision: the verify request sends the corrective package identity, integration keys and governed field names, but not the expected values.

Reason: the consumer must report independently read state rather than echoing the answer supplied by the sender.

Consequence: comparison remains server-side against the frozen corrective package.

## D0126 — Only the latest corrective verification can support closure

Decision: an older matched read-back becomes ineligible if a newer verification exists.

Reason: later evidence is the best available representation of current downstream state.

Consequence: newer drift/rejected/transport-error evidence fails closure closed even if historical matched evidence exists.

## D0127 — Verified closure is immutable evidence before mutable case state

Decision: Build 055 inserts an immutable closure row before changing the Build 053 case status to closed, and a database trigger enforces that prerequisite.

Reason: the mutable case lifecycle must never be the only proof that closure was warranted.

Consequence: generic triage cannot close a case, and runtime code cannot edit or delete the reconciliation/closure evidence supporting closure.

## D0128 — Post-closure regression is a separate governance problem

Decision: Build 055 terminates at verified closure and does not automatically reopen a case later.

Reason: reopening needs explicit rules for regression evidence, duplicate cases and operator accountability.

Consequence: Build 056 is queued as Post-Closure Regression Monitoring & Exception Reopen Governance.

## D0129 — Verified closure remains observable, not permanently assumed

Decision: Build 056 permits repeated independent read-back of the exact corrective scope after Build 055 closure.

Reason: a downstream consumer may regress after a correctly verified closure.

Consequence: closed exceptions can accumulate append-only stable/regressed/error evidence without reopening automatically or sending a mutation.

## D0130 — Only the newest post-closure check can support reopen

Decision: a reopen may use only the newest check for the exact Build 055 closure, and that check must be `regressed`.

Reason: older regression evidence must not outrank newer evidence showing the consumer recovered or became unverifiable.

Consequence: stale regression fails closed; a fresh read-back is required before reopen when newer evidence exists.

## D0131 — Reopen evidence precedes mutable case state

Decision: Build 056 inserts one immutable reopen row before changing the original case from `closed` to `open`, and a database trigger enforces that prerequisite.

Reason: mutable case status must not be the only evidence that a verified closure was later superseded.

Consequence: generic case updates cannot reopen a closed exception, duplicate reopen requests canonicalize to the one closure-bound reopen event, and operator identity/reason remain durable.

## D0132 — Reopened closures cannot be reused as closure authority

Decision: after a Build 055 closure is superseded by a Build 056 reopen, that historical closure cannot authorize another transition to `closed`.

Reason: the old matched read-back predates the regression that justified reopening.

Consequence: a successor resolution cycle must establish fresh closure authority rather than silently reusing stale evidence.



## D0133 — A governed reopen starts a new triage generation

Decision: Build 057 creates one `workspace_reopened_exception_triage_cycles` row per Build 056 reopen instead of reusing the mutable fields of the original Build 053 case as the canonical successor-cycle record.

Consequence: the original case remains the durable incident identity, while every reopened resolution generation is independently attributable to the reopen and regression evidence that caused it.

## D0134 — Successor correction scope is constrained by both regression evidence and predecessor governance

Decision: a successor plan may include only Build 056 mismatched/missing records, and only fields whose desired values were already frozen in the accepted predecessor corrective-plan scope.

Consequence: Build 057 cannot expand correction authority based on newly observed consumer values or operator input.

## D0135 — Reopened cases cannot return to the legacy Build 053 planning path

Decision: the legacy `workspace_corrective_delivery_plans_manager_insert` RLS policy rejects any case with Build 056 reopen evidence, and a database trigger blocks generic planned/approved/dismissed status transitions on the original reopened case.

Consequence: all post-reopen planning must use the successor-cycle tables.

## D0136 — Build 057 is planning-only

Decision: Build 057 does not activate, deliver, resend or otherwise mutate a downstream consumer.

Consequence: an approved successor plan is evidence for a later controlled execution build, not permission to write by itself.
