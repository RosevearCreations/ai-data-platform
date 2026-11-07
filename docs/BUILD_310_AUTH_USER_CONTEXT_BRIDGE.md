# Build 310 — Authentication & User Context Bridge

## Purpose

Build 310 adds a signed host-session assertion boundary so supported host applications can establish authenticated user identity without forwarding raw passwords, cookies, bearer tokens, refresh tokens, API keys or private signing keys across the module boundary.

It builds on:

- Build 306 universal host identity and runtime contract;
- Build 307 independent capability authorization;
- Build 308 secure embedded boundary;
- Build 309 first-party host adapters and credential-free scaffolds.

A valid host session proves a bounded identity assertion. It does **not** grant AI Data Platform authorization.

## Signed host-session assertion

`apps/web/lib/host-session-context-bridge.ts` defines the assertion schema:

`rosevear.ai-data-platform.host-session-assertion.v1`

Required signed claims:

- issuer;
- AI Data Platform audience;
- one-time assertion ID;
- host application ID;
- host environment;
- host instance ID;
- host subject ID;
- host session ID;
- issued-at timestamp;
- expiry timestamp;
- audit correlation ID.

The detached signature is carried separately from the claims.

Supported signature identifiers:

- Ed25519;
- ES256.

The bridge does not accept a private key. Signature verification is injected through a verifier interface so signing custody remains outside the module process/browser boundary.

## Validation order

The bridge fails closed through these steps:

1. validate the exact assertion envelope and exact claim set;
2. reject unsupported algorithms or malformed signature metadata;
3. verify the detached signature;
4. require the AI Data Platform module audience;
5. bind the assertion to the expected host application/environment/instance;
6. reject an expected host-subject mismatch;
7. enforce issued-at, expiry and maximum lifetime;
8. return a host reauthentication handoff for expired/not-yet-valid sessions;
9. consume the one-time assertion ID through a replay guard;
10. resolve the host subject through the subject mapper;
11. reject missing or disabled mappings;
12. reject an expected module-subject mismatch;
13. emit accepted/rejected audit evidence;
14. return an authenticated session context with `authorizationGranted: false`.

Signature bytes, passwords, cookies and raw host tokens are never written to the audit event.

## Subject mapping

Build 310 resolves:

`issuer + hostApplicationId + hostSubjectId -> moduleSubjectId`

The mapper may return:

- active;
- disabled;
- no mapping.

A missing or disabled mapping is rejected.

Build 311 remains responsible for explicit tenant/workspace/organization resolution. Build 310 does not infer workspace access from a user mapping.

## Session expiry and reauthentication

Expired or materially future-dated assertions return a typed handoff:

`rosevear.ai-data-platform.host-reauthentication-handoff.v1`

The handoff contains only:

- host application/environment/instance;
- session ID;
- audit correlation ID;
- the reason reauthentication is required;
- an instruction to authenticate with the host and submit a **new signed assertion**.

It carries no password, cookie, bearer token or secret token.

## Replay protection

Every valid, current assertion must be consumed through a `HostSessionAssertionReplayGuard`.

A second use of the same signed assertion is rejected as `assertion_replayed`.

The replay-guard interface is storage-neutral so later host installations can back it with the appropriate durable store without weakening the contract.

## Binding to the universal host context

`bindAuthenticatedHostSessionToContext()` binds an accepted session into the Build 306 host context.

It requires the same:

- host application ID;
- host environment;
- host instance ID;
- audit correlation ID.

It then projects only the mapped module subject ID into `context.subject.id`.

This binding still does not authorize a module capability. Build 307's separate authorizer remains authoritative.

## Live-safe metadata

`GET /api/module-auth-bridge` publishes only non-secret protocol metadata:

- bridge/assertion schema and version;
- accepted algorithm identifiers;
- required claim names;
- replay/expiry/identity validation guarantees;
- reauthentication behavior;
- explicit non-authorization/security booleans.

It exposes no public/private key material, session assertion, signature or credential.

## Security boundary

Build 310 does **not**:

- accept raw passwords;
- accept raw cookies;
- accept bearer/refresh/API secret tokens as host context;
- accept private signing keys from a browser;
- grant capabilities from a valid host session;
- infer tenant/workspace access;
- activate a peer connection;
- resume QL-266.

QL-266 remains `DISCONNECTED / HOLD`.

## Verification

`apps/web/scripts/verify-build-310-auth-user-context-bridge.ts` performs deterministic certification with a real ephemeral Ed25519 key pair and verifies:

- valid detached signature acceptance;
- signature tamper rejection;
- audience mismatch rejection;
- host identity mismatch rejection;
- host-subject and mapped-subject mismatch rejection;
- missing/disabled subject mapping rejection;
- expiry and future-session reauthentication handoff;
- invalid lifetime rejection;
- one-time assertion replay rejection;
- accepted/rejected audit evidence without signature/credential material;
- Build 306 host-context binding;
- live-safe API/manifest/review/build-gate wiring.

## Next queued build

**Build 311 — Tenant, Workspace & Organization Context Resolution** — explicit environment-aware host tenant/org/business mappings, ambiguity blocking, disabled/deleted mapping handling and tenant-isolation certification without implicit cross-tenant fallback.
