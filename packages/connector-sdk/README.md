# Rosevear Shared Connector SDK 2.0

Build 289 upgrades the AI Data Platform connector contract into the shared server-side transport standard for the Rosevear application suite.

SDK v2 keeps the original bounded connector model and adds a governed HTTP runtime:

- manifest-managed authentication: none, bearer token, or API-key header;
- exact HTTPS origin allowlists and allowed HTTP methods;
- bounded request timeouts and response sizes;
- bounded retry with Retry-After support and idempotency-aware write retries;
- cursor and page-number pagination;
- normalized error categories and stable error codes;
- sanitized request/retry/page/health audit events;
- provider health checks;
- source secret references only — raw secret values are never returned in audit evidence.

## Safety boundary

Connector code still receives no database handle, user session, cookie jar, or unrestricted process environment. HTTP redirects are rejected, credentials are omitted, inline URL credentials are prohibited, and callers cannot override authentication, cookie, host, forwarding or proxy-authorization headers.

A connector must declare every permitted HTTPS origin. Requests outside those origins fail closed.

SDK v1 manifest/type exports remain available so old source code can be identified and migrated deliberately. Registered production connectors should use manifestVersion 2 / sdkVersion 2.

## Local connector example

See `examples/no-secret-connector.ts`. Local connectors use SDK v2 while declaring `transport: { kind: "local" }`.

## HTTP connector outline

An HTTP connector declares a required string config field for its base URL, a transport authentication policy, allowed origins/methods, retry limits, pagination policy and health path. The AI Data Platform execution boundary resolves declared secret references and creates the HTTP client; connector code receives that client as `context.http`.

SDK v2 standardizes transport behavior. It does **not** activate a connection, grant a capability, infer owner authorization, or resume QL-266.
