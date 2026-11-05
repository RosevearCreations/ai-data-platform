# Build 289 — Rosevear Shared Connector SDK 2.0

## Purpose

Build 289 upgrades the original Build 029 Connector SDK into the shared server-side transport standard for the Rosevear application suite.

The SDK now standardizes authentication, HTTP requests, pagination, retry behavior, audit evidence, health checks and error normalization while preserving the existing workspace/capability authorization boundary.

## SDK generation

Package:

`@rosevear/ai-data-connector-sdk@2.0.0`

Primary manifest generation:

- `manifestVersion: 2`
- `sdkVersion: 2`

Legacy v1 manifest/type exports remain available so old connector source can be identified and migrated deliberately. Registered AI Data Platform connectors now use SDK v2.

## Authentication

HTTP connectors may declare exactly one authentication policy:

- none;
- bearer secret;
- API-key header secret.

Authentication references a manifest-declared secret key. The AI Data Platform execution boundary resolves the corresponding exact environment-variable reference server-side.

Secret values are never included in SDK audit events or durable connector audit evidence.

## Request policy

Every HTTP connector declares:

- required base-URL configuration key;
- exact HTTPS allowed origins;
- allowed HTTP methods;
- default request timeout;
- bounded retry policy;
- optional SDK user-agent.

Runtime requests:

- reject non-HTTPS destinations;
- reject inline URL credentials;
- reject redirects;
- omit browser credentials/cookies;
- reject caller-controlled authorization, cookie, host, forwarding and proxy-auth headers;
- reject destinations outside the exact manifest origin allowlist;
- enforce manifest input/output bounds.

## Retry

Retry behavior is bounded by the manifest:

- 1–5 total attempts;
- bounded exponential delay;
- optional jitter;
- explicit retryable HTTP status list;
- Retry-After support;
- GET/HEAD/PUT/DELETE may retry;
- POST/PATCH retry only when the connector supplies an idempotency key.

This prevents silent duplicate write behavior.

## Pagination

SDK v2 supports:

- cursor pagination;
- page-number pagination;
- declared item/cursor paths;
- optional page-size parameter;
- hard maximum page count.

Repeated cursors fail closed. Reaching the configured maximum returns a truncated result instead of continuing without bound.

## Health

HTTP manifests declare a bounded GET/HEAD health path and accepted status codes.

The health helper returns:

- healthy/unhealthy state;
- observed status;
- duration;
- checked timestamp;
- normalized error code.

Health checks do not activate or authorize a connector.

## Errors

`ConnectorSdkError` provides stable:

- code;
- category;
- retryable state;
- HTTP status when present;
- attempt when present.

Categories include configuration, authentication, authorization, timeout, network, rate-limit, remote, response, pagination, aborted and internal.

## Audit evidence

The SDK emits sanitized events for:

- request start;
- retry;
- request success;
- request failure;
- page receipt;
- health check.

Events contain method, origin, path, status, attempt, duration, retry delay, page/item count and normalized error code where applicable.

They do not contain request bodies, response bodies, raw headers or secret values.

Migration `0092_shared_connector_sdk_v2.sql` extends durable connector evidence with:

- SDK version;
- manifest version;
- transport type;
- request count;
- retry count;
- page count;
- health-check count;
- bounded transport evidence;
- up to 100 sanitized SDK audit events.

The existing append-only runtime policy remains unchanged.

## Execution boundary

`apps/web/lib/connectors/sandbox.ts` creates the v2 HTTP client. Individual connector implementations therefore do not implement their own secret loading, retry loops, pagination loops or provider health policy.

Failed executions preserve the sanitized SDK evidence so the durable audit record can show what happened without storing credentials or payloads.

## Operator surface

The Connectors screen now identifies Build 289 and displays:

- SDK generation;
- manifest generation;
- local/http/legacy transport;
- installed SDK generation;
- durable request/retry/page/health counts.

## Safety boundary

Build 289 does not:

- create a live connection;
- enable a connector automatically;
- grant a capability automatically;
- perform an external provider request during this build;
- persist raw credential values;
- infer owner authorization;
- resume QL-266.

QL-266 remains `UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED`.

## Next build

**Build 290 — Webhook Gateway & Event Intake Center** will add validated, signed and replay-safe inbound event intake with durable receipts using the standardized Build 289 connector/runtime conventions.
