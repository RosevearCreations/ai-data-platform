# Development

## Requirements

- Node.js 24
- pnpm 12.8.1
- Chrome 114+ for the side-panel extension

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

Build 001 intentionally grants only the `sidePanel` extension permission. Page inspection permissions are introduced only when the corresponding feature is implemented and reviewed.

## Workspace package

`@rosevear/ai-data-contracts` holds shared platform contracts that can be consumed by the apps as the project grows.

## Branch flow

```text
dev -> Verify -> Pull Request -> main
```

Do not bypass verification for numbered builds.
