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
