# Build 309 — Host Adapter Pack & Module Scaffold Generator

## Purpose

Build 309 packages the Build 306–308 universal module contracts into first-party host integration starters for common application stacks.

Supported adapter targets:

- React;
- Next.js;
- Vite;
- vanilla browser JavaScript;
- Electron / desktop web shell.

The generated starters intentionally use the Build 308 secure iframe boundary directly so they remain usable without assuming that a separate custom-element package has already been published. The adapter catalog still advertises the Build 308 custom-element tag for hosts that bundle the runtime themselves.

## Adapter pack

`apps/web/lib/module-host-adapter-pack.ts` defines:

- adapter pack schema/version;
- five first-party adapter descriptors;
- module-origin configuration source per stack;
- credential-free host-context starter generation;
- deterministic scaffold generation;
- Build 308 iframe mount configuration;
- runtime module-origin validation;
- explicit security metadata.

All adapters declare:

- iframe fallback support;
- custom-element compatibility;
- no source-code credentials;
- no authorization from adapter presence;
- no authorization from UI mount.

## Scaffold generator

`apps/web/scripts/generate-module-host-scaffold.ts` creates a minimal integration directory.

Required arguments:

- `--adapter`;
- `--app-id`;
- `--environment`;
- `--surface`;
- `--out`.

The CLI deliberately has no password, cookie, token, bearer credential, API-key, client-secret or private-key argument.

Existing output directories are rejected so generation does not overwrite an existing application tree.

## Runtime configuration

Generated scaffolds get the AI Data Platform module origin from runtime configuration:

- React: `VITE_AI_DATA_MODULE_ORIGIN`;
- Next.js: `NEXT_PUBLIC_AI_DATA_MODULE_ORIGIN`;
- Vite: `VITE_AI_DATA_MODULE_ORIGIN`;
- vanilla browser: `window.AI_DATA_MODULE_CONFIG.moduleOrigin`;
- Electron: preload `contextBridge` from `AI_DATA_MODULE_ORIGIN`.

The module origin is not an authentication credential.

Generated iframe integrations use:

- exact module origin;
- current `window.location.origin` as the host origin;
- generated runtime instance ID;
- supplied audit correlation ID;
- Build 308 sandbox `allow-forms allow-scripts allow-same-origin`;
- `Referrer-Policy: origin`;
- no iframe permissions allowlist.

The AI Data Platform still requires the external host origin to be explicitly enrolled in `AI_DATA_EMBED_ALLOWED_HOST_ORIGINS` before cross-origin framing is allowed.

## Electron boundary

The Electron starter enables:

- `contextIsolation: true`;
- `nodeIntegration: false`;
- `sandbox: true`;
- preload-only exposure of the non-secret module origin.

The renderer does not receive arbitrary process environment values.

## Host context starter

Generated host-context helpers include only the universal contract fields:

- host application ID;
- environment;
- host instance ID;
- subject ID;
- tenant ID;
- workspace ID;
- requested capabilities;
- audit correlation ID.

This context is input for Build 307 validation. It is not a permission grant.

Build 310 remains responsible for authenticated user-context bridging. Build 309 must not forward raw host cookies, passwords or secret tokens.

## Live-safe catalog

`GET /api/module-host-adapters` exposes:

- adapter pack schema/version;
- supported adapter metadata;
- custom-element compatibility;
- iframe fallback support;
- runtime module-origin source;
- generator safety flags;
- non-authorizing security flags.

It exposes no credentials and does not create a connection.

## Security boundary

Build 309 does **not**:

- create credentials;
- embed credentials in generated source;
- accept secret arguments in the scaffold CLI;
- create an authentication bridge;
- grant capabilities;
- activate a peer application connection;
- mark synthetic scaffolds as live certification;
- resume QL-266.

QL-266 remains `DISCONNECTED / HOLD`.

## Verification

`apps/web/scripts/verify-build-309-host-adapter-pack.ts` verifies:

- all five adapter kinds;
- deterministic credential-free scaffold generation;
- correct runtime configuration source by adapter;
- valid plain JavaScript for the vanilla starter;
- Electron context isolation;
- Build 308 iframe safety attributes;
- universal host-context compatibility;
- malformed module-origin rejection;
- safe catalog endpoint;
- manifest/review/build-gate wiring.

## Next queued build

**Build 310 — Authentication & User Context Bridge** — signed/validated host session assertions, subject mapping, expiry and reauthentication handoff without sharing raw passwords, cookies or secret tokens across unsafe boundaries.
