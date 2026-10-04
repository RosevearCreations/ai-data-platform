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
