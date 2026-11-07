# Build 308 — Embeddable Module Runtime Shell & Secure Mount Boundary

## Purpose

Build 308 adds the reusable embedded runtime boundary for mounting governed AI Data Platform surfaces inside a host application without turning a mount into trust, authorization or a peer connection.

It builds on:

- Build 306 universal module manifest and runtime identity;
- Build 307 headless SDK and independent capability authorization.

## Runtime pieces

### Framework-neutral runtime controller

`apps/web/lib/embedded-module-runtime.ts` provides:

- exact trusted-origin normalization;
- supported embedded surface resolution;
- deterministic iframe mount descriptors;
- mount / navigate / reload / unmount lifecycle;
- strict host-to-module and module-to-host message schemas;
- exact runtime instance and audit-correlation matching;
- deterministic frame-port abstraction for certification.

No message schema accepts an arbitrary data payload.

### Web Component / custom element

`apps/web/lib/embedded-module-element.ts` defines the registration function for:

`<rosevear-ai-data-module>`

The element:

- reads only `surface`, `module-origin` and `audit-correlation-id`;
- derives the current host origin from `window.location.origin`;
- generates a fresh runtime instance ID;
- creates the sandboxed iframe;
- checks `event.source` against the exact iframe window;
- checks `event.origin` against the exact configured module origin;
- sends messages with an exact `targetOrigin`, never `*`;
- supports navigation, reload and safe disconnect/unmount.

It never reads, copies or forwards unknown host attributes, cookies, passwords, bearer tokens or other raw secrets.

Build 309 will package framework-specific host adapters/scaffolds around this foundation.

## Embedded surface route

`/module-embed/[surface]` renders one of the five Build 306 module surfaces without the normal AI Data Platform application sidebar/top bar.

Supported surfaces:

- data-library;
- app-connections;
- integration-health;
- integration-certification;
- production-learning.

The route requires:

- a valid surface;
- runtime instance ID;
- audit correlation ID;
- exact host origin;
- host origin allowed by the server policy;
- referrer origin, when present, to match either the trusted host or module origin.

Unknown surfaces and unauthorized origins fail closed.

## Secure iframe fallback

The runtime descriptor requires:

- sandbox: `allow-forms allow-scripts allow-same-origin`;
- referrer policy: `origin`;
- exact module URL;
- exact host origin;
- exact runtime/correlation query identifiers;
- no iframe permissions allowlist;
- no wildcard target origin.

The iframe mount is therefore usable as the fallback even when a host does not directly integrate the custom-element wrapper.

## Message boundary

Host → module messages are limited to:

- `runtime.ping`;
- `runtime.reload`;
- `surface.navigate`.

Module → host messages are limited to:

- `runtime.ready`;
- `runtime.pong`;
- `runtime.error`;
- `runtime.unmounting`;
- `surface.changed`.

Every message must match:

- schema;
- runtime instance ID;
- audit correlation ID;
- exact origin;
- exact allowed field set.

The browser bridge also verifies the exact parent/iframe `Window` object before handling a message.

This channel does not carry credentials, auth assertions, arbitrary records or capability invocations. Authentication bridging is intentionally deferred to Build 310.

## CSP and frame ancestors

`apps/web/next.config.ts` applies a Content-Security-Policy to `/module-embed/*` with:

- `frame-ancestors 'self'` by default;
- `object-src 'none'`;
- `base-uri 'self'`;
- `form-action 'self'`.

Approved external hosts can be added only through:

`AI_DATA_EMBED_ALLOWED_HOST_ORIGINS`

Rules:

- comma-separated exact origins only;
- HTTPS required;
- HTTP allowed only for localhost development;
- wildcard `*` forbidden;
- usernames/passwords forbidden;
- path/query/fragment forbidden.

The same configured host-origin policy is checked by the embedded route before rendering.

## Live-safe runtime configuration

`GET /api/module-embed-config` publishes only non-secret runtime metadata:

- runtime schema/version;
- custom-element tag;
- supported surfaces;
- message types;
- iframe sandbox/referrer policy;
- whether an external frame-ancestor configuration exists;
- explicit security booleans.

It does not expose credentials or infer that any host is trusted.

## Recovery behavior

The runtime controller records explicit lifecycle state:

- idle;
- mounted;
- reloading;
- unmounted;
- failed.

Reload operates only on an already mounted descriptor.

Unmount removes the embedded frame and is safe when there is no active descriptor.

Browser disconnect removes the message listener before unmounting, preventing stale event handlers from surviving host DOM removal.

## Security and authority boundary

Build 308 does **not**:

- authorize a host because it can render a frame;
- activate a peer connection;
- grant a headless capability;
- inherit raw host secrets;
- accept wildcard origins;
- create auth/session assertions;
- enable consequential peer writes;
- resume QL-266.

A mounted UI is not permission.

QL-266 remains `DISCONNECTED / HOLD`.

## Verification

`apps/web/scripts/verify-build-308-embeddable-module-runtime.ts` verifies:

- exact HTTPS origin normalization and localhost exception;
- wildcard/path/userinfo origin rejection;
- supported surface routing;
- iframe sandbox/referrer metadata;
- mount/navigate/reload/unmount lifecycle;
- exact host/module message schemas;
- wrong-origin and unexpected-field rejection;
- custom-element exact iframe source check;
- module bridge exact parent source check;
- exact postMessage target origins;
- application-shell isolation for embed routes;
- CSP frame-ancestor policy and no wildcard;
- safe configuration endpoint;
- Build 308 manifest/review/build-gate wiring.

Inherited compact and exhaustive historical verification remain mandatory.

## Next queued build

**Build 309 — Host Adapter Pack & Module Scaffold Generator** — package first-party React, Next.js, Vite, vanilla browser and Electron adapters plus a credential-free starter scaffold generator around the Build 306–308 contracts.
