# Development

## Requirements

- Node.js 24
- pnpm 12.8.1
- Chrome 114+ for the side-panel extension
- PostgreSQL 16+ for local/runtime database use

For our normal workflow, local command-line access is not required. GitHub Actions performs clean installs, builds and database acceptance tests remotely.

## Install

```bash
corepack enable
pnpm install
```

The committed `pnpm-lock.yaml` is generated from exact direct dependency versions and must be kept current.

## Verify everything

```bash
pnpm verify
```

This runs:

1. type checking;
2. lint/static checks;
3. production builds;
4. tests.

## Web application

```bash
pnpm --filter @rosevear/ai-data-web dev
```

The Next.js development server uses the App Router.

## Chrome extension

Build:

```bash
pnpm --filter @rosevear/ai-data-extension build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `apps/extension/dist`.
5. Click the extension action to open its side panel.

The extension currently uses `sidePanel`, `activeTab` and `scripting`. Build 009 also declares optional HTTP(S) host patterns so Chrome can grant a specific site only when navigational pagination requires it. No optional host is granted automatically at install time.

## Workspace package

`@rosevear/ai-data-contracts` holds shared platform contracts that can be consumed by the apps as the project grows.

## Branch flow

```text
dev -> Verify -> Pull Request -> main
```

Do not bypass verification for numbered builds.


## PostgreSQL authentication setup

The platform uses Better Auth with standard PostgreSQL.

Required server environment variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `AUTH_ALLOW_SIGN_UP`

Use `apps/web/.env.example` as the reference. Never commit real values.

The migration command is:

```bash
pnpm --filter @rosevear/ai-data-web db:migrate
```

The isolation acceptance command is:

```bash
pnpm --filter @rosevear/ai-data-web db:verify
```

GitHub CI runs both against an ephemeral PostgreSQL service, so these commands do not need to be run manually for normal remote GitHub development.


## Build 009 pagination permission

Load-more and infinite-scroll runs do not need an additional site grant.

For **Next button** or **Numbered pages** pagination:

1. Open the target website in Chrome.
2. Open the AI Data Platform extension side panel from the extension action.
3. Detect the repeating records and create/run the extraction recipe.
4. In **Pagination & infinite scroll**, choose **Inspect pagination**.
5. Select the detected **next-button** or **numbered-pages** candidate if needed.
6. Click **Allow this site for pagination**.
7. Chrome will show a permission prompt for the current site. Choose **Allow**.
8. Set the page/step, record and wait limits.
9. Click **Run bounded pagination**.
10. When that site should no longer have the optional grant, click **Remove site access** in the same pagination panel.

This is a browser permission prompt only. No GitHub, database, Vercel or command-line setup is required for Build 009.

## Build 010 detail-page permission

Detail enrichment fetches public same-origin HTML from the extension side panel instead of navigating the active tab. Chrome therefore requires optional access to the target site.

To use it:

1. Open the source/list page in Chrome and open the AI Data Platform side panel.
2. Detect records, define fields and run the extraction recipe. You may also run Build 009 pagination first.
3. Open **Detail / subpage enrichment**.
4. Choose the parent field containing the detail-page URL, such as **Product URL** or **Record URL**.
5. Click **Allow this site for detail enrichment**.
6. When Chrome displays the current-site permission prompt, choose **Allow**.
7. Add **H1 title**, **Meta description**, or one or more custom detail fields.
8. Set the maximum unique detail pages, delay and timeout.
9. Leave duplicate-row removal off unless you explicitly want only the first parent row for each identical detail URL.
10. Click **Run bounded detail enrichment**.
11. Review the merged rows in the spreadsheet grid.
12. Click **Remove site access** when you no longer want the optional grant retained.

Detail fetches omit target-site cookies and credentials. No GitHub, database, Vercel, AI-provider or command-line setup is required for Build 010.


## Build 019 authenticated workspace bridge

Extension development can optionally define:

```text
VITE_PLATFORM_ORIGIN=http://localhost:3000
```

Use `apps/extension/.env.example` as the reference. Production extension packaging should set this to the deployed AI Data Platform origin when that origin is known. If it is omitted, the side panel provides a local Platform URL field and stores the chosen origin in extension-local storage.

First production-browser connection:

1. Open the AI Data Platform extension side panel.
2. Under **Authenticated workspace**, confirm the **AI Data Platform URL** is the deployed web-app origin. Enter it and choose **Save URL** if necessary.
3. Choose **Connect / sign in**.
4. Chrome asks for access only to that platform host. Choose **Allow**.
5. The Chrome Identity window opens the platform. If already signed in, it completes automatically; otherwise sign in with the normal AI Data Platform form.
6. The extension receives a short-lived bridge token through Chrome's `chromiumapp.org` redirect. Do not copy or manually handle this token.
7. Confirm the workspace selector lists only authorized workspaces.
8. Select Rosie Dazzlers, Devil n Dove or Personal as required.
9. To test fail-closed behavior, choose **Disconnect** and confirm workspace-scoped saves require reconnection.
10. Reconnect. Older local records shown as migration candidates remain untouched until Build 020.

No `BETTER_AUTH_TRUSTED_ORIGINS` change is required for the Build 019 bridge. The web session is used only inside the user-visible identity flow; subsequent extension requests use the short-lived bearer token.


## Build 020 workspace synchronization

Build 020 requires no new environment variables. It reuses:

- `DATABASE_URL`;
- the Build 019 extension bearer-session bridge;
- the configured extension `VITE_PLATFORM_ORIGIN` or locally selected platform URL.

The migration adds `app.workspace_saved_scrapers` and `app.workspace_reviewed_datasets`. GitHub CI verifies the migration, optimistic concurrency, tombstones and RLS denial against ephemeral PostgreSQL.

Normal extension behavior:

1. Local save completes first.
2. The operation is placed in the extension sync queue.
3. The extension attempts authenticated synchronization.
4. If the backend is unavailable, the queue remains and can be retried with **Sync workspace now**.
5. A stale server version becomes an explicit conflict.
6. **Use server** replaces the local cache for that record.
7. **Keep local** retries the current local value against the latest server version.
8. Existing unscoped pre-Build-019 records are migrated only through **Copy legacy records into this workspace**; originals remain local.

No manual database/dashboard setup is expected.


## Build 021 persistent intelligence

No new environment variables are required. Migration 0004_intelligence_continuity.sql creates the module-state and append-only audit tables.

The extension automatically attempts intelligence synchronization after local module writes and after authenticated connection. The Build 021 panel provides a manual retry, conflict resolution and explicit adoption of legacy unscoped history/scheduled jobs.

The web application exposes /intelligence for authenticated read-only review of module summaries, pending-review counts and recent append-only integration audit evidence.


## Build 022 integration contract conformance

No new environment variables or external accounts are required.

Shared contract implementation:

- `packages/contracts/src/index.ts`;
- `packages/contracts/schemas/rosie-dazzlers.competitive-intelligence.v1.schema.json`;
- `packages/contracts/schemas/devil-n-dove.supplier-inventory.v1.schema.json`;
- `packages/contracts/fixtures/*.json`;
- `packages/contracts/tests/contracts.test.mjs`.

The extension's Business-system integrations panel can run the same validation rules against an exported JSON package using **Build 022 consumer simulation**. Accepted package IDs are stored only in a local test replay registry so a second submission proves duplicate rejection. **Clear simulation replay registry** resets that test state.

A production business-app receiver must not reuse the simulation registry. It must maintain its own durable consumed-package registry and audit log.

No live business-system receiver should be configured until the consuming repository implements the checklist in `docs/INTEGRATION_CONSUMER_READINESS.md`.


## Build 023 recipe repair verification

No new environment variables are required.

The workbench uses the existing optional `AI_GATEWAY_API_KEY` / `AI_SUGGESTION_MODEL` configuration when available. If no AI key is configured, deterministic repair ranking and explanation remain fully usable.

CI now runs `apps/web/scripts/verify-recipe-repair.ts` in addition to the existing AI-suggestion verification. The script verifies bounded repair request parsing, deterministic score ordering, unknown/invented AI candidate IDs being discarded, rejection of AI output containing no allowed candidate IDs, and rejection of empty deterministic candidate sets before any AI request.

Manual browser acceptance for a repair:

1. open the source page for a saved scraper;
2. run **Check on this page**;
3. inspect each drift cause, current selector, structural context and sample evidence;
4. select one or more deterministic candidates;
5. optionally request **Explain / rank (optional AI)**;
6. verify AI output only references already displayed candidate IDs;
7. review the proposed old → new selector list;
8. tick the explicit approval checkbox;
9. click **Approve repair revision**;
10. confirm the saved scraper revision increments;
11. confirm any scheduled job pinned to the previous revision shows blocked/stale status;
12. complete **Refresh + re-review** only after reviewing the repaired recipe/source policy.


## Build 024 mobile barcode intake

Migration:

- db/migrations/0005_mobile_barcode_intake.sql

Web entrypoint:

- /capture
- /api/barcode-captures

No new environment variables are required.

CI runs apps/web/scripts/verify-barcode-intake.ts. It verifies UPC/EAN canonical equivalence, valid/invalid GTIN checksums, input bounds, provenance privacy, exact Personal movie matching, exact Devil n Dove supplier-SKU matching, exclusion of user-owned/internal fields from match payloads, one explicit getUserMedia acquisition path, camera track stop behavior and absence of geolocation calls.

The database isolation suite also verifies exact movie barcode matching, approval, duplicate detection, duplicate approval blocking, durable retrieval, RLS denial and target/workspace mismatch rejection.

Camera permission walkthrough:

1. Sign in to the deployed AI Data Platform from the phone.
2. Open /capture.
3. Select the intended target.
4. Press Start camera.
5. Allow camera access when the browser prompts.
6. Scan the barcode.
7. Review the result and approve/reject.
8. Press Stop camera if ending before a scan.
9. If permission was denied, use browser Site settings > Camera > Allow for the AI Data Platform site, reload, and try again.

Manual entry requires no camera permission.


## Build 025 source policy registry and crawl governance

Migration:

- db/migrations/0006_source_policy_registry.sql

Extension modules:

- src/source-policy-governance.ts — pure deterministic governance rules;
- src/source-policy-registry.ts — workspace-local persistence, synchronization and exact policy pin checks;
- src/SourcePolicyRegistryPanel.tsx — review/evidence UI.

No new environment variables or third-party accounts are required.

Acceptance verification:

- apps/web/scripts/verify-source-policy-governance.ts verifies origin normalization, stable fingerprints, fingerprint drift on revision/material changes, robots decisions, expiry, restricted sensitivity and access-control fail-closed behavior;
- apps/web/scripts/verify-isolation.ts verifies the source-policy intelligence module is accepted by PostgreSQL after migration, persists durably and remains protected by workspace RLS;
- the normal root pnpm verify gate still runs typecheck, lint, production builds and tests.

Operator workflow for a real recurring source:

1. connect the extension and select the intended workspace;
2. open the source and choose Use active tab, or enter its URL/origin;
3. select the actual collection method;
4. describe the factual collection purpose;
5. review applicable source terms/API conditions and record evidence;
6. for public webpage extraction, resolve applicable robots/crawl directives and record the decision/evidence;
7. confirm the source is public or explicitly authorized;
8. confirm no login, paywall, CAPTCHA, ban or technical access control must be bypassed;
9. choose the sensitivity and conservative delay/page/record budgets;
10. choose a review-validity period and Approved only if every requirement is satisfied;
11. save the policy revision;
12. create or Refresh + re-review the scheduled job. It pins that exact policy fingerprint.

Changing, blocking or allowing a policy to expire intentionally invalidates older scheduled-job approval.


## Build 027 Browserless controlled pilot

Migration:

- db/migrations/0008_controlled_remote_pilot.sql

Server modules:

- apps/web/lib/browserless-provider.ts — Browserless /content adapter, regional endpoints, kill-gate readiness, direct-egress enforcement, unit accounting and response redaction;
- apps/web/lib/remote-pilot-database.ts — workspace controls, exact source allowlist, one-slot concurrency reservation and append-only provider telemetry;
- /api/remote-execution/control — admin workspace enable/kill controls;
- /api/remote-execution/allowlist — admin exact Build 025 source allowlisting;
- /api/remote-execution/pilot — synchronous one-page controlled pilot;
- /remote-execution — authenticated readiness, control, allowlist, run and evidence view.

Production secret/setup:

1. Create/sign in to a Browserless account. A free plan is sufficient for the initial pilot.
2. In the Browserless account dashboard, copy/create the API token.
3. Do not paste that token into ChatGPT, GitHub, source files or screenshots.
4. In the production hosting environment, add BROWSERLESS_API_TOKEN as an encrypted secret.
5. Set REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true.
6. Leave REMOTE_EXECUTION_KILL_SWITCH=true until the source policy and workspace allowlist are reviewed.
7. Open /remote-execution, choose the intended workspace, and allowlist only an existing Build 025 approved public-facts/public-webpage source.
8. Arm the workspace pilot. This changes only the workspace kill gate; the global kill switch still wins.
9. Set REMOTE_EXECUTION_KILL_SWITCH=false in production only for the controlled pilot window.
10. Run one allowlisted one-page pilot and review provider units, duration, response code, final URL/hash and audit events.
11. Use Kill remote execution immediately after the pilot or whenever behavior is unexpected.
12. Do not enable proxy, CAPTCHA, stealth or authenticated-profile Browserless features for Build 027.

CI does not require a real Browserless token. apps/web/scripts/verify-controlled-remote-pilot.ts uses an injected fetch implementation to prove endpoint, region, host restriction, no-proxy request shape, unit limits, redirect blocking and secret/raw-HTML redaction.


## Build 028 configurable workspace profiles

Migration:

- db/migrations/0009_workspace_profiles.sql

Server modules:

- apps/web/lib/workspace-profiles.ts — deterministic safe defaults, normalization/review configuration and capability rules;
- apps/web/lib/workspace-profile-database.ts — profile CRUD, profiled workspace lifecycle and authorization;
- /api/workspace-profiles — authenticated profile list/create/edit/archive;
- /api/workspaces — existing list plus profiled create/edit/archive;
- /workspace-profiles — owner/admin profile/workspace management UI.

Built-in profile keys are rosie-detailing, maker-commerce, personal-media, generic-business and generic-personal.

To add a new domain, use a conservative generic profile or create a custom profile, define normalization fields/review dimensions, leave unnecessary capabilities disabled, and create the workspace from that profile. New domains do not require extractor-core changes or new slug conditionals.

No environment variables or third-party setup are required.


## Build 029 connector SDK development

Package:

- packages/connector-sdk — SDK v1 contracts, validation, tests and starter template.

Server:

- apps/web/lib/connectors/registry.ts — static trusted connector registration;
- apps/web/lib/connectors/sandbox.ts — bounded capability-limited execution;
- apps/web/lib/connector-database.ts — workspace configuration/grants/audit;
- /api/connectors — list/configure/enable-disable/test;
- /connectors — management and evidence UI;
- db/migrations/0010_connector_sdk_foundation.sql — installations/audit/RLS.

### Add a new no-secret connector

1. Copy packages/connector-sdk/examples/no-secret-connector.ts into a server connector module.
2. Give the manifest a stable lowercase key and semantic version.
3. Declare only required import/enrichment/export capabilities.
4. Define bounded config fields and execution/input/output limits.
5. Keep secrets as an empty array.
6. Register the definition in apps/web/lib/connectors/registry.ts.
7. Add SDK/unit tests and an end-to-end workspace-grant acceptance case.
8. Verify on dev before enabling it in any workspace.

### Add a future credentialed connector

1. Register/create the required account or developer application with the external provider using that connector's documented provider link.
2. Declare each logical secret in the connector manifest with one exact uppercase environmentVariable name.
3. In the production hosting provider, create that exact environment variable as an encrypted secret.
4. Paste the provider credential only into the hosting secret field. Never paste it into ChatGPT, GitHub, source files, browser/client storage or connector config JSON.
5. Configure the workspace installation with the manifest-approved secret reference; the stored reference contains the variable name, not the value.
6. Grant only required capabilities and keep the connector disabled.
7. Run validation/bounded test in a safe environment.
8. Enable only after successful evidence is reviewed.
9. Disable immediately if audit evidence is unexpected.

Build 029's included example connector requires none of these external steps.

### Website contextual help

Help topics live in apps/web/app/help/help-content.ts and render through HelpInfo. New major website sections must add a circled ⓘ topic and, when external setup is required, a Manual intervention block with exact variable names, service/application links in documentation, and ordered steps. scripts/verify-help-system.ts protects coverage.


## Build 030 production learning

Server modules:

- apps/web/lib/production-learning.ts — pure totals, finding classification and evidence-driven roadmap logic;
- apps/web/lib/production-learning-database.ts — RLS-scoped aggregation from Builds 019–029 durable tables;
- /api/production-learning — authenticated machine-readable evidence;
- /production-learning — operational baseline, Browserless readiness, findings/gaps, workspace footprint and Builds 031–036 roadmap;
- apps/web/scripts/verify-production-learning.ts — deterministic classification/roadmap test.

Build 030 introduces no database migration.

### Browserless production setup after obtaining the API key

The Browserless API key must not be pasted into ChatGPT, GitHub, source files, screenshots or browser/client configuration.

1. Open the production hosting provider for the deployed AI Data Platform project.
2. Create/update encrypted server secret BROWSERLESS_API_TOKEN with the key.
3. Set REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true for the intended production environment.
4. Set REMOTE_EXECUTION_KILL_SWITCH=true initially.
5. Redeploy/restart the production application if the hosting platform requires environment changes to trigger a deployment.
6. Open /remote-execution and verify Token configured = yes and execution enabled = yes while the global kill switch remains active.
7. Review/create an approved Build 025 public-webpage/public-facts source policy with robots allowed.
8. Allowlist that exact source for the intended workspace and arm only that workspace.
9. Set REMOTE_EXECUTION_KILL_SWITCH=false only for the bounded one-page pilot.
10. Run one pilot and review provider units, duration, status, response evidence and /production-learning.
11. Restore REMOTE_EXECUTION_KILL_SWITCH=true after the pilot unless continued live testing is deliberately approved.

The GitHub/CI verification does not need the Browserless secret. Build 032 verified the connected Vercel project and Neon production project directly; secret values remain redacted and no live source approval is fabricated.

## Build 031 operational telemetry and snapshot continuity

Server/database components:

- `db/migrations/0011_operational_outcome_telemetry.sql` — append-only outcome and review-snapshot tables, RLS and bounded retention;
- `apps/web/lib/database.ts` — sync outcome recording and server-derived repair approval/rollback/compatibility linkage;
- `/api/extension/operational-outcomes` — authenticated bounded repair proposal/rejection intake;
- `apps/web/lib/production-learning-database.ts` — outcome aggregation and changed-evidence snapshot persistence;
- `apps/web/lib/production-learning.ts` — conflict/error, repair-health and rollback-rate assessment;
- `apps/extension/src/operational-outcomes.ts` — best-effort extension telemetry client.

Normal development verification must prove migrations, typecheck/lint/build/tests, workspace RLS isolation, append-only runtime behavior and snapshot persistence. Build 031 requires no external account or secret.

## Build 032 Browserless production baseline workflow

Current production-safe configuration:

1. `BROWSERLESS_API_TOKEN` exists as a Vercel secret; never copy its value into logs, source control or chat.
2. `REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true`.
3. `REMOTE_EXECUTION_KILL_SWITCH=true` until the exact one-page run window.
4. Production learning computes eligible Source Policy entries from their current payloads and reports approved / allowlisted / armed prerequisite counts.
5. The live route still requires a normal authenticated owner/admin session; there is no automation bypass endpoint.

Live acceptance sequence once an eligible Source Policy has been reviewed:

1. in the Chrome extension, connect/select the target workspace, open Source Policy Registry & crawl governance, review the intended public source and save the approved policy revision;
2. synchronize that approved Source Policy into the workspace;
3. open `/remote-execution`;
4. allowlist the exact policy ID/revision/fingerprint;
5. arm that workspace;
6. confirm the global kill switch is still active;
7. change the production global kill switch to false for the approved one-run window and deploy the environment change if required;
8. run exactly one page;
9. restore the global kill switch to true;
10. review `/production-learning` for status, units/run, duration, HTTP response, final URL/hash evidence and the pending/go-bounded/no-go result.

CI uses deterministic provider fixtures and never spends Browserless units.

## Build 033 integration consumer acceptance

Local/CI verification:

1. apply `0012_integration_delivery_observability.sql`;
2. run `verify-integration-delivery.ts` for valid acceptance plus duplicate, stale, wrong-contract and wrong-target rejection;
3. run database isolation verification for append-only delivery events, idempotent replay receipts and cross-account denial;
4. confirm Production learning keeps Build 033 active for conformance-only evidence and closes it only for live consumer acknowledgement;
5. verify the website/operator/help surfaces compile without exposing receiver secrets.

External activation remains fail-closed because neither supported business repository currently exposes the exact v1 receiver.

When a receiver is implemented:

- Rosie Dazzlers: set `INTEGRATION_CONSUMER_ROSIE_DAZZLERS_URL` and encrypted `INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN`;
- Devil n Dove: set `INTEGRATION_CONSUMER_DEVIL_N_DOVE_URL` and encrypted `INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN`.

Configure only one deliberately selected receiver first. Never copy bearer credentials into source, browser fields, logs or chat. Use `/integration-delivery` in this order: Run conformance → Test handshake → Send dry-run. Build 033 does not enable consumer-side live mutation.

## Build 034 retention verification

CI/database acceptance must:

1. apply `0013_retention_storage_cleanup.sql`;
2. validate positive class budgets and protected-evidence exclusions;
3. seed disposable reviewed-barcode and terminal-remote fixtures beyond the age gates;
4. prove the default policy is fail closed;
5. prove a non-member cannot approve cleanup;
6. explicitly approve cleanup in the disposable CI workspace;
7. execute one bounded batch and verify the disposable candidates are removed;
8. verify append-only cleanup-run evidence cannot be updated by the runtime role;
9. revoke cleanup approval again;
10. verify Production learning reports the run and removes Build 034 from the active roadmap once no delete candidate/budget breach/failure remains.

Production differs from CI: deployment applies the schema/control plane only. Never approve or execute destructive production cleanup automatically.
