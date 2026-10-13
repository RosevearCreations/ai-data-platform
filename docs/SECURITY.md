# Security

## Security goals

- isolate every workspace;
- keep secrets out of browser bundles and Git history;
- minimize Chrome extension permissions;
- treat scraped page content as hostile input;
- make integration writes explicit and auditable;
- use least privilege throughout.

## Secrets

Never commit:

- PostgreSQL connection strings and database passwords;
- AI provider keys;
- integration tokens;
- session cookies;
- database passwords.

Public/browser-safe configuration must be clearly separated from server secrets.

## PostgreSQL and authentication

- Better Auth owns authentication/session tables in the `auth` schema.
- Workspace data lives in the separate `app` schema.
- Workspace tables use PostgreSQL row-level security.
- User-scoped application queries run inside a transaction after `SET LOCAL ROLE ai_data_runtime`.
- The authenticated Better Auth user ID is supplied with transaction-local `set_config`, preventing pooled-connection identity leakage.
- The restricted runtime role is not the table owner, so RLS remains enforceable.
- Database owner credentials are server-only and must never reach the browser or extension.
- Sign-up is disabled by default after initial owner provisioning.

## Chrome extension

Manifest permissions must be narrow and justified.

Initial preference:

- `sidePanel`;
- `storage`;
- `activeTab`;
- `scripting` only where required.

Avoid broad persistent host permissions when an active-tab or user-approved permission can accomplish the task.

Build 003 enforcement:

- page inspection requires a user-invoked active-tab grant;
- `scripting` is used only to execute the bundled inspector in the selected tab;
- no `<all_urls>` host permission is requested;
- inspected data is capped before it returns to the side panel;
- input/textarea values, cookies, browser storage and host-page JavaScript state are not captured;
- Chrome-restricted pages such as browser settings are treated as non-inspectable.

## Untrusted page content

A webpage may contain malicious text intended to manipulate AI or code.

Rules:

- page text is data, never instruction authority;
- never expose secrets to page-derived prompts;
- sanitize data rendered back into the app;
- do not execute scraped scripts;
- separate extraction evidence from AI instructions;
- enforce output schemas.

## Integration writes

External data flows through:

discovered -> normalized -> matched -> review -> approved -> integration.

Direct write paths that skip approval must be explicitly designed, documented and constrained to deterministic high-confidence cases.

## Auditability

Record:

- actor;
- workspace;
- source;
- recipe version;
- run;
- proposed changes;
- approval;
- integration result.

## Dependency security

- pin package versions through the lockfile;
- review new dependencies;
- keep framework/runtime dependencies current;
- run automated dependency/security scanning in CI once executable code is introduced.

## Data minimization

Store only information needed for the legitimate platform use case. Competitive-intelligence modules must avoid personal customer data and unnecessary personal information.

## Logging

Never log secrets, authorization headers, full session tokens or sensitive request bodies.

## Backups and recovery

Before production integrations are enabled, define backup/restore procedures for canonical datasets and integration mappings.

### Visual picker boundary

Build 004 reuses the Build 003 temporary active-tab grant.

- hover highlighting uses extension-created overlays that do not receive pointer input;
- selecting an element prevents that one page interaction from navigating or submitting;
- Escape or the side-panel Cancel action exits without a selection;
- selector capture reads only the safe attributes already allowed by the DOM inspector;
- selectors and short visible-text samples return to the side panel;
- selector preview highlights at most 50 visible matches and removes those overlays automatically;
- preview does not activate matched elements.

### Repeating-record detection boundary

Build 005 reuses the temporary page access established in Build 003.

- detection reads visible DOM structure and the same bounded/safe page information already permitted;
- record detection does not click, navigate, submit forms or alter page data;
- field-guided detection uses the selector already chosen by the user;
- record preview creates pointer-events-disabled overlays and removes them automatically;
- preview highlights at most 60 visible record boundaries;
- candidate confidence is a structural heuristic, not a statement about the truth or meaning of the underlying content.

### Extraction recipe execution boundary

Build 006 executes recipes locally in the user-invoked active tab.

- field selectors are evaluated only inside each selected record element;
- recipe testing is capped at 500 records per run;
- extraction is read-only and does not click, submit, focus or mutate page content;
- link and image paths are normalized to absolute URLs using the current page URL;
- manual attribute extraction rejects the form `value` attribute, `srcdoc`, inline event-handler attributes and invalid attribute names;
- form control live values, cookies, browser storage and page JavaScript state remain outside the extraction model;
- page content is not sent to AI or another external service in Build 006;
- recipe JSON shown in the side panel contains selectors/configuration and the tested source URL, but is not persisted automatically.

### Spreadsheet review boundary

Build 007 reviews a local copy of Build 006 extraction results.

- edits do not mutate the webpage or the original extraction result;
- row exclusion and column dropping are review metadata, not destructive deletion;
- saved review snapshots use the extension page's own local storage, never the inspected site's local/session storage;
- at most 20 recent reviewed datasets are retained by the Build 007 local save helper;
- save failures, including browser storage quota errors, are surfaced to the user;
- no reviewed dataset is written to Rosie Dazzlers, Devil n Dove, PostgreSQL or an AI provider in Build 007;
- required-field warnings are recalculated from current reviewed values so manual corrections remove stale missing-value warnings.

### AI suggested-fields boundary

Build 008 introduces the first optional model call.

- the AI endpoint requires an authenticated Better Auth session;
- the AI Gateway key is server-only and is never placed in the Chrome extension or browser bundle;
- request parsing caps intent length, sample count, sample text length and existing-field count;
- only bounded record samples, source URL, record selector metadata and existing field definitions are eligible for the model request;
- the full DOM, cookies, browser storage, page JavaScript state and live form values are not included;
- AI output is constrained to a strict structured schema and sanitized again before use;
- AI output cannot directly create CSS selectors;
- gateway failures, timeouts, missing credentials and unusable structured output fall back to deterministic suggestions;
- cost telemetry records model, input/output/total tokens and estimated request cost when known;
- the default model is configurable with `AI_SUGGESTION_MODEL`;
- no AI suggestion is written automatically to Rosie Dazzlers, Devil n Dove or PostgreSQL.

### Pagination and infinite-scroll boundary

Build 009 adds controlled page traversal.

- next-button, numbered-page, load-more and infinite-scroll candidates are detected from visible page controls and DOM growth;
- cross-origin pagination targets are never followed;
- disabled controls are ignored;
- form submit buttons are refused as pagination controls;
- load-more/infinite-scroll stay under the temporary active-tab grant;
- navigational next/numbered pagination requires an optional host grant for the current origin only;
- optional host access is requested explicitly from the user and can be removed from the pagination UI;
- no host access is granted automatically at install time;
- runs are capped at 50 pages/steps and 5,000 records, with configurable lower limits;
- per-step wait time is bounded between 1 and 15 seconds;
- repeated URLs/page payloads, no new records, stalled growth, cancellation and origin changes terminate a run;
- paginated results retain page number and source URL evidence for every collected row;
- cumulative load-more/infinite-scroll runs skip already-seen DOM-index/value records so existing rows are not re-added on every growth step;
- Build 009 does not bypass robots controls, authentication barriers, CAPTCHAs or site access restrictions.

### Detail/subpage enrichment boundary

Build 010 enriches parent extraction rows from public detail pages.

- detail URLs are normalized from a user-selected parent field;
- only HTTP(S) detail URLs on the source origin are eligible;
- cross-origin detail links and cross-origin redirects are blocked;
- optional site access is requested explicitly through Chrome and can be removed from the enrichment panel;
- detail-page requests use `credentials: "omit"`, `cache: "no-store"`, bounded timeouts and a configurable inter-request delay;
- fetched responses must be successful HTML responses;
- HTML is parsed with `DOMParser` as inert `text/html`; fetched scripts are not executed;
- form `value`, `srcdoc`, inline event-handler attributes and invalid attribute names remain blocked;
- repeated detail URLs are fetched once and reused;
- row removal for duplicate detail URLs is opt-in rather than automatic;
- maximum unique detail pages are bounded to 500 per run;
- detail values are merged into review copies and do not write automatically into PostgreSQL, Rosie Dazzlers or Devil n Dove.

### CSV/XLSX/JSON export boundary

Build 011 generates export files locally from the extension review workspace.

- export generation does not upload dataset contents to a backend or third-party service;
- reviewed exports use the current working-copy edits, row inclusion state and column visibility/order;
- raw exports use the untouched extraction values and original extraction warnings;
- source/detail evidence is opt-in for tabular exports and structured separately in JSON;
- CSV is UTF-8 with a BOM for spreadsheet compatibility;
- string cells beginning with spreadsheet formula markers (`=`, `+`, `-`, `@`) are prefixed safely in CSV to reduce formula-injection risk;
- XLSX text cells are emitted explicitly as inline strings and are not interpreted as formulas;
- XLSX is generated as a valid Office Open XML ZIP package rather than by renaming another file type;
- filenames are sanitized before local download;
- Build 011 requires no download host permission, backend export service, AI provider or business-system write.


## Build 023 repair-workbench security

- repair candidate discovery runs locally in the active page;
- the workbench does not send the full DOM to the server or model;
- structural context is limited to tag/class summaries;
- candidate/sample counts and string lengths are bounded before optional AI use;
- optional AI is authenticated through the extension workspace session;
- AI receives only deterministic candidate IDs and cannot introduce a new selector;
- server sanitization rejects AI rankings for unknown candidate IDs;
- no repair is applied automatically;
- operator approval is required before a new recipe revision is created;
- repair revisions invalidate scheduled-job revision pins until explicit re-review;
- the workbench does not bypass login, paywall, CAPTCHA or technical access controls.


## Build 024 mobile camera and barcode security

- camera permission is requested only by the Start camera button;
- no camera permission is required for manual entry;
- camera tracks stop after successful scan, explicit Stop camera and component cleanup;
- no continuous background camera mode exists;
- no geolocation API is requested or stored;
- only barcode digits/format, target, method and timestamps are sent;
- offline captures stay in bounded local device storage until explicitly sent;
- barcode targets are restricted to the authorized Personal or Devil n Dove workspace slug/type;
- RLS prevents another account from reading or reviewing workspace captures;
- duplicate captures cannot be approved;
- match payloads exclude Personal ownership notes and Devil n Dove internal inventory fields;
- approval records a handoff and never directly mutates ownership/inventory data.


## Build 025 source policy security controls

- source policies are workspace-scoped and synchronized through existing authenticated/RLS-protected intelligence persistence;
- origins are normalized to HTTP/HTTPS origins before registry matching;
- public webpage automation requires resolved robots/crawl review; disallowed or unknown blocks execution;
- restricted/private sensitivity blocks crawler use;
- login, paywall, CAPTCHA, ban or technical access-control bypass is never an approvable mode;
- approved policies expire and require renewed review;
- a minimum request delay floor and bounded page/record budgets are stored with policy evidence;
- every material policy/status revision receives a new revision/fingerprint;
- scheduled jobs pin the exact policy ID/revision/fingerprint and fail closed after policy drift;
- re-enabling a paused job revalidates the current registry policy;
- future remote workers must inherit, not override, the approved source policy.


## Build 027 controlled Browserless pilot security

- Browserless is the only selected provider in this build;
- the pilot calls only the plain /content REST endpoint;
- proxy, external proxy, stealth, BrowserQL/unblock and CAPTCHA-solving parameters are never sent;
- target navigation is restricted to the exact allowlisted hostname and cross-origin final redirects fail closed;
- only HTTPS, public-facts, public-webpage policies with robots explicitly allowed may be allowlisted;
- allowlist rows pin the exact Build 025 policy ID/revision/fingerprint and drift invalidates authorization;
- global execution requires the Build 026 execution flag plus REMOTE_EXECUTION_KILL_SWITCH=false;
- every workspace defaults disabled with its own kill switch active;
- workspace concurrency is exactly one active pilot slot;
- the request is capped to one page, 60 seconds and two Browserless billing units;
- BROWSERLESS_API_TOKEN is read only from the server environment and is never stored in PostgreSQL, result payloads or audit details;
- rendered HTML is not persisted; evidence stores only bounded metadata and a SHA-256 hash;
- provider audit rows are append-only to the normal runtime role;
- an in-flight provider request is aborted if global/workspace kill state becomes active.


## Build 028 workspace profile security

- built-in profiles are immutable application definitions;
- custom profiles are visible only to their creator or members of workspaces already using them;
- custom profile create/edit/archive requires an owner/admin context and normal runtime RLS;
- generic/custom capabilities default fail-closed for scheduling, remote execution, barcode intake and business integrations;
- review policy requires human approval and disallows automatic downstream writes;
- provenance defaults require source URL and retrieval time;
- new workspace creation uses a SECURITY DEFINER function that re-checks current user identity, owner/admin eligibility and profile visibility before atomically assigning the creator as owner;
- the runtime role is not granted arbitrary INSERT access to workspace/member tables;
- archived workspaces leave the active workspace list while retained data remains protected by existing workspace RLS;
- barcode target authorization uses explicit personal-media/maker-commerce profile identity rather than assuming all future workspace slugs are known.


## Build 029 connector SDK security

- arbitrary uploaded connector code is not accepted or executed;
- only statically registered server connectors can run;
- manifest and SDK versions must be compatible;
- a workspace grant must be a subset of manifest capabilities;
- owner/admin authorization plus workspace RLS is required for configure/enable/disable/test actions;
- connectors receive cloned/frozen bounded input/config, workspace ID, one requested capability, AbortSignal and a narrow secret resolver only;
- database clients, auth cookies and the unrestricted process environment are not provided to connector executors;
- secret references bind to exact environment-variable names declared in the manifest and never contain the secret value;
- input/output size and runtime limits fail closed;
- connector audit stores bounded summaries/error codes, not secret values;
- runtime can SELECT/INSERT connector audit records but has no UPDATE/DELETE grant.

## Build 029 help-system security

Contextual help explicitly identifies actions that require manual external setup. Browserless instructions tell operators to store tokens only in encrypted production environment settings and never in ChatGPT, GitHub, source code or client storage. Future credentialed connectors must document the exact provider registration link/environment variable with their manifest before enablement.


## Build 030 production-learning security

- production-learning reads only workspaces already visible through normal authenticated membership and PostgreSQL RLS;
- no cross-workspace/global administrative query path is introduced for ordinary users;
- Browserless readiness exposes tokenConfigured as a boolean only and never returns BROWSERLESS_API_TOKEN;
- the review never stores or displays raw connector secrets, session tokens or Browserless credentials;
- cost reporting uses provider units/runtime and bounded payload-byte measurements rather than embedding external billing credentials;
- missing telemetry is labelled GAP rather than inferred from unrelated fields;
- workspace owner/admin/member counts are evidence for permission review, not authority to change membership automatically;
- the renewed roadmap does not enable remote execution, connectors or downstream writes;
- Browserless live execution remains controlled by the existing master flag, global kill switch, workspace kill/enable state, exact source-policy allowlist and one-page/unit limits.

## Build 031 operational telemetry security

- operational outcomes remain workspace-scoped under the existing `ai_data_runtime` / `app.user_id` RLS boundary;
- runtime grants on outcome and snapshot tables are SELECT/INSERT only;
- repair proposal/rejection intake accepts only bounded primitive metadata and rejects raw object/array payload expansion;
- sync approval/rollback and post-repair compatibility outcomes are derived from successfully synchronized saved-scraper state;
- telemetry rows do not store raw DOM, candidate selector values, session tokens, connector secrets or Browserless credentials;
- event details are capped at 4 KiB;
- retention is bounded by both age and per-workspace/event-family row count;
- production-learning snapshots are fingerprint-deduplicated and bounded by age/count;
- telemetry write failure never changes the underlying sync success/conflict/error semantics;
- cross-account isolation and append-only runtime behavior are covered by database acceptance verification.

## Build 032 Browserless live-baseline security

- `BROWSERLESS_API_TOKEN` is verified by configuration presence only; its value is never read into application UI, source control, build logs or ChatGPT;
- the provider master flag may be enabled while the global kill switch remains active, preserving a fail-closed production state;
- no remote run is eligible without an approved and unexpired public-webpage/public-facts Source Policy with robots allowed and no access-control bypass;
- exact policy ID/revision/fingerprint must be copied into the remote allowlist before execution;
- a workspace must be explicitly armed and still remains subordinate to the global kill switch;
- Build 032 does not introduce an authentication bypass, service credential, backdoor pilot endpoint or privileged cross-workspace runner;
- terminal provider evidence excludes raw rendered HTML and stores only bounded metadata/hash evidence;
- provider cost reporting remains units/runtime rather than a hard-coded currency price;
- a live baseline is not synthesized from CI fixtures or readiness booleans;
- the production kill switch must be restored after the explicitly approved one-page run unless continued live testing is separately approved.

## Build 033 integration delivery security

- external receiver URLs are never accepted from client requests; they come only from target-specific server environment configuration;
- configured receiver URLs must be HTTPS and cannot contain embedded username/password credentials;
- dedicated bearer credentials remain server-only and are never returned in readiness or operator responses;
- every live delivery route requires a normal authenticated AI Data Platform session and workspace owner/admin authorization;
- packages are rebuilt from persisted approved/exported integration batches rather than trusting an arbitrary browser package for live transport;
- the sender independently verifies target, schema, adapter contract, version, fingerprint, packageId, replayKey, fields, source evidence, expiry and source freshness;
- the conformance receiver persists accepted package IDs and rejects replay;
- delivery/receipt tables are append-only to the runtime role and protected by workspace RLS;
- delivery detail JSON is bounded to 4 KiB and excludes package bodies, bearer tokens and consumer response secrets;
- external requests use one configured endpoint, no redirect following, a 15-second timeout and no automatic retry;
- Build 033 external delivery is always `dryRun=true`; acknowledgements claiming a live mutation are rejected;
- no Build 033 path writes into Rosie Dazzlers or Devil n Dove operational databases.

## Build 034 retention security

- deployment never implies destructive-cleanup approval;
- cleanup defaults fail closed for every workspace;
- only owner/admin sessions can approve, revoke or execute cleanup;
- approval and execution require separate explicit confirmations in the operator UI/API;
- browser requests cannot choose tables, SQL predicates or retention ages;
- each run is capped by the workspace policy and a hard 250-row ceiling;
- only reviewed barcode rows older than 90 days and terminal remote jobs older than 30 days are delete-eligible;
- pending barcode intake and non-terminal remote jobs are never eligible;
- synchronized tombstones are previewed for manual archive only, not auto-deleted;
- intelligence audit, provider audit, connector audit, operational outcomes, production-learning snapshots, integration delivery/replay evidence, and retention-control evidence are protected from Build 034 destructive cleanup;
- cleanup-run evidence is append-only to the runtime role and stores bounded counts/bytes rather than deleted payload bodies;
- the metrics view uses security-invoker semantics so normal workspace RLS remains authoritative.

## Build 035 adoption security

- adoption evidence is read through existing workspace RLS boundaries;
- the /adoption page and /api/adoption require an authenticated session;
- adoption snapshots contain counts and capability/grant identifiers only, not connector secrets or raw extracted payloads;
- snapshots are append-only to the runtime role and bounded to 365 days / 60 rows per workspace;
- a blocked connector attempt does not count as legitimate use of a grant;
- observed activity for a disabled profile capability is surfaced as an ACTION mismatch rather than silently changing the profile;
- ownerless workspaces are an ACTION condition;
- excess admins, unused high-risk capability slots and unused connector grants are review recommendations only;
- Build 035 never adds/removes members, promotes/demotes roles, enables/disables profile capabilities, or changes connector grants automatically;
- investment recommendations follow durable usage and never create synthetic activity.

## Build 036 renewal security

- Build 036 reads only workspaces authorized by normal membership/RLS;
- renewal snapshots contain compact counts/flags only, never raw business payloads, secrets or credentials;
- runtime access to renewal snapshots is SELECT/INSERT only; UPDATE/DELETE are not granted;
- unchanged evidence is fingerprint-deduplicated;
- retention is capped at 365 days / 30 snapshots per workspace;
- missing Build 030 measurements remain explicitly unmeasured instead of being backfilled or inferred;
- roadmap recommendations never mutate roles, profile capabilities, connector grants, remote gates or integration receiver settings;
- no synthetic provider run, barcode capture, sync outcome or business delivery event is created to improve a metric.

## Build 037 first-evidence security

- the runbook is authenticated and inherits workspace membership/RLS from Build 035 adoption evidence;
- no new secrets, credentials, provider configuration or cross-workspace data paths are introduced;
- profile-disabled workflows remain not applicable;
- scheduled workflows cannot be recommended as ready before the source-policy prerequisite is present;
- remote execution stays Build 032 operator-gated;
- integration delivery stays Build 033 receiver/operator-gated;
- the runbook itself writes no operational evidence and cannot change workspace roles, profile capabilities or connector grants;
- synthetic records, fake sources and fake receivers are explicitly prohibited as adoption shortcuts.

## Build 038 trend-validation security

- trend snapshots reuse the existing authenticated workspace/RLS boundary;
- runtime permissions remain SELECT/INSERT only; UPDATE/DELETE remain denied;
- Build 038 adds no secret-bearing fields and stores counts/flags only;
- historical Build 036 eligibility is explicit and cannot be satisfied by a same-runtime Build 038 continuity write;
- missing historical values remain unavailable rather than being inferred;
- provider, Source Policy, integration receiver, connector and role/capability gates are not changed by trend validation;
- no synthetic sync, barcode, provider, connector or delivery activity is generated to create a trend.


## Build 049 approved publication boundary

A Build 049 publication can be created only from a persisted Build 048 batch whose status is `approved` and whose approval timestamp exists. Workspace owner/admin authority is checked both in application logic and publication-table RLS for creation/withdrawal. Authorized members may inspect and export active publications.

The publication copies only included cleaned rows from the exact approved review into an immutable snapshot. It pins the review ID, source dataset ID/server version/fingerprint, approval actor/time and a separate publication fingerprint. Neither the original reviewed dataset nor the Build 048 review is modified.

JSON and CSV are generated on demand from the publication snapshot. Each platform export appends a bounded audit event; raw export payloads are not copied into the event ledger. CSV encodes nested values as canonical JSON text. No export is uploaded to a third party by Build 049.

Withdrawal is non-destructive and owner/admin-only. It blocks future platform exports while preserving publication/audit evidence. The interface explicitly does not claim that a previously downloaded file can be recalled. Downstream delivery remains outside Build 049.


## Build 050 publication delivery bridge security

A Build 050 mapping can reference only a Build 049 publication visible through normal workspace RLS. Creation, retirement, conformance and external delivery require workspace owner/admin authority. Mapping content is immutable after insert because the runtime role has UPDATE permission only on status/retirement columns.

Mapping validation executes against every frozen publication row before persistence. The integration-key source must be scalar and unique, mapped consumer values must be scalar, target fields must be permitted by the existing Build 033 contract, and source evidence must contain a valid HTTP(S) URL and date timestamp. Withdrawn publications and retired mappings cannot generate packages.

The Build 033 protocol remains authoritative for package validation and external transport. Browser input cannot specify an endpoint or credential. External delivery uses only configured HTTPS targets and server-only bearer tokens, follows no redirects, has a bounded timeout, sends `dryRun=true`, and rejects acknowledgements claiming a live mutation.

Bridge receipts store fingerprints, identities, status codes and bounded details only. They do not store bearer credentials or full package bodies and are SELECT/INSERT only for the runtime role. Build 050 therefore proves publication-to-consumer handoff without enabling production mutation.


## Build 051 controlled live mutation boundary

Build 051 is the first application path authorized to request a downstream mutation with `dryRun=false`. It therefore adds controls beyond the existing Build 033/050 transport gates.

Live activation requires all of the following simultaneously: workspace owner/admin authority, active Build 050 mapping, published Build 049 snapshot, configured HTTPS consumer endpoint plus server-only bearer token, an accepted external Build 050 dry-run receipt from the exact current consumer/package within 24 hours, and a fresh handshake that explicitly advertises `liveMutationEnabled=true` plus replay-key / return-original-ack idempotency. The operator must then type the target-specific activation phrase. Activations expire after 24 hours and can be revoked sooner.

Every live send performs a second fresh live-capability handshake and requires a separate target-specific typed confirmation. Before network mutation the platform reserves one canonical `workspace_publication_live_deliveries` row. The immutable package replay key is sent in the Idempotency-Key header and may not be changed through the runtime role.

Accepted and rejected outcomes are terminal and never resent. A transport-error represents an uncertain result and may retry only with the same package/replay key while the same activation is active, capped by the retry limit. This depends on the consumer's explicit promise to return the original acknowledgement for duplicate replay keys.

Browser requests cannot supply the endpoint, bearer credential, package ID, replay key or idempotency key. Identity columns in both activation and live-delivery tables are not runtime-updatable. Workspace RLS applies to all live state.


## Build 052 read-only reconciliation boundary

Build 052 can inspect only an accepted Build 051 delivery visible through workspace RLS and only an owner/admin may initiate consumer verification. Historical package reconstruction is validated against the exact package ID, replay key and fingerprint recorded by the accepted live-delivery row before any outbound read.

The outbound endpoint and bearer credential still come only from existing server configuration. The configured endpoint origin must equal the original consumer origin stored with the accepted delivery; changing configuration cannot silently redirect historical reconciliation to another consumer.

A fresh handshake must explicitly advertise `stateVerificationSupported=true`. The verify-state request sends only package identity, expected integration keys and governed field names. Expected values are withheld from the consumer request so state verification cannot be satisfied by simply echoing the desired state.

The response must identify the same package/replay/fingerprint and cover every expected key exactly once. Duplicate, omitted or unexpected keys fail closed. Only scalar returned values are accepted. Full consumer values are compared in memory and are not stored in durable reconciliation rows; persisted evidence contains value fingerprints and differing field names.

Reconciliation rows are SELECT/INSERT only for the runtime role. Build 052 has no automatic mutation, rollback or retry path when drift is detected.


## Build 053 corrective planning boundary

Build 053 does not inherit Build 051 live-mutation authority. It has no consumer endpoint call, no bearer-token use, no activation creation and no `dryRun=false` request.

Only workspace owners/admins may create or update exception cases or create/review corrective plans. Cases may change operational triage fields, but source reconciliation fingerprint, delivery/package identity and affected-key/field snapshots are not runtime-updatable. Corrective plans are immutable except for review status/audit fields.

Desired plan values are derived server-side from the exact accepted package; browser input supplies rationale and triage metadata, not arbitrary corrective values. Missing records from original update operations are marked manual-review instead of inferring a create mutation.

An approved plan is evidence for a future controlled-execution workflow only. Build 053 cannot execute it.


## Build 054 corrective mutation boundary

Build 054 never treats a Build 053 approval as standing mutation authority. The approved plan must still point to the newest reconciliation, contain no unresolved manual-review item and reconstruct to the same original accepted package identity.

Corrective values are derived server-side from frozen plan scope. Browser input may provide only action IDs and exact confirmation text; it cannot supply a corrective value, endpoint, bearer token, package identity, replay key or idempotency key.

Activation requires the same configured consumer origin that accepted the original Build 051 delivery, a fresh `liveMutationEnabled=true` handshake, `idempotency.keySource=replayKey`, `duplicateBehavior=return-original-ack` and an accepted external dry-run of the exact corrective package. Authority lasts at most one hour.

The sender reserves the canonical corrective delivery row before any live network mutation. The corrective replay key is the immutable `Idempotency-Key`. Accepted/rejected are terminal. Only transport-error may retry, with the same identity and a five-attempt cap.

Runtime UPDATE grants cannot alter activation plan/package identity or corrective delivery plan/package/replay/idempotency identity.


## Build 055 verified closure boundary

Build 055 treats downstream transport acceptance as receipt evidence, not state proof. Only an independently read current consumer state can support closure.

The verify-state request never sends the expected corrective values. It sends only the exact corrective package identity, governed integration keys and governed field names. Comparison occurs server-side.

Corrective reconciliation rows and closure rows are append-only for `ai_data_runtime`; the runtime role receives no UPDATE or DELETE privileges on either table. RLS restricts visibility to workspace members and INSERT to workspace owners/admins with matching accepted-delivery/approved-plan/approved-case evidence.

Closure requires the latest corrective reconciliation to be `matched`. A database trigger blocks any case status transition to `closed` unless an immutable Build 055 closure row already exists, preventing the older generic triage path from bypassing verified closure.

## Build 056 post-closure regression and reopen boundary

Post-closure monitoring is read-only. The request sends corrective package identity, governed integration keys and governed field names but never expected values. Full returned consumer values are compared in memory and are not persisted; durable evidence stores fingerprints and differing field names.

Regression checks and reopen rows are append-only for `ai_data_runtime`; no runtime UPDATE or DELETE privilege is granted. Workspace RLS limits visibility to members and creation to owners/admins with matching closure, accepted corrective-delivery and approved-plan evidence.

No check can mutate the consumer, resend a corrective package or automatically reopen an exception. Reopening requires the newest check for the closure to be `regressed`, a non-empty operator reason and a target-specific typed confirmation. The database requires immutable reopen evidence before a case may transition away from `closed`, and a reopened closure cannot later satisfy the verified-close guard.



## Build 057 successor planning boundary

Only workspace owners/admins may create or update a reopened re-triage cycle or successor plan. RLS requires an exact Build 056 reopen → regressed-check → open-case chain before a re-triage row may be inserted. Successor-plan insertion additionally requires `plan-correction`, an approved predecessor plan, an accepted predecessor corrective delivery and exact package identity.

The legacy Build 053 plan-insert policy now explicitly rejects cases with Build 056 reopen evidence. A database trigger also blocks generic `open → planned/approved/dismissed` transitions on the original case after reopen, so the successor lifecycle cannot be bypassed through the old case workflow. Build 057 has no consumer endpoint and grants no runtime DELETE on its evidence tables.

## Build 058 successor corrective write controls

Build 058 requires owner/admin role, an approved Build 057 successor plan, approved re-triage, an open reopened case, unchanged regressed evidence, an accepted predecessor corrective delivery, current consumer identity, fresh live-capability handshake, accepted dry-run and typed activation/execution confirmations. Successor package identity is distinct from the predecessor package. Runtime grants do not include DELETE or unrestricted table UPDATE. The old Build 054 activation/delivery policies reject new writes for cases with reopen evidence, closing the legacy-path bypass.
