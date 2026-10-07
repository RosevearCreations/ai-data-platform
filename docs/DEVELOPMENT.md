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
