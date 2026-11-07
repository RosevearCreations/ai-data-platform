# Build 311 — Tenant, Workspace & Organization Context Resolution

## Purpose

Build 311 maps authenticated host tenant, organization and business context to exactly one AI Data Platform tenant/workspace boundary.

It builds on Build 310 authentication but does not turn authentication into authorization.

## Exact mapping key

Resolution uses the full explicit key:

- host application ID;
- host environment;
- host tenant ID;
- host organization ID or explicit null;
- host business ID or explicit null.

No default tenant, global workspace or nearest-match fallback is allowed.

## Mapping states

A mapping is one of:

- active;
- disabled;
- deleted.

Exactly one active mapping is required.

Resolution fails closed when:

- no exact mapping exists;
- more than one active exact mapping exists;
- only disabled mappings exist;
- only deleted mappings exist;
- a mapping record is malformed;
- the authenticated host/session identity does not match;
- RLS verification does not prove isolation.

## RLS verification

The resolver requires a `WorkspaceRlsVerifier` result proving all of:

- the selected tenant/workspace is readable;
- another workspace in the same tenant is denied;
- a workspace in another tenant is denied.

The resolver refuses to return a resolved context without this evidence.

The repository's PostgreSQL row-level-security policies remain authoritative for real persistence. Build 311 provides the resolver contract and deterministic isolation fixtures that production adapters can bind to real RLS probes.

## Tenant-isolation certification fixtures

`createTenantIsolationFixtureRlsVerifier()` provides deterministic certification rows representing:

- the selected workspace;
- a different workspace under the same platform tenant;
- a workspace under another platform tenant.

The Build 311 verifier proves only the selected row scope is visible to the resolved context.

Synthetic fixture success is not live database or peer certification.

## Host-context binding

`bindResolvedTenantWorkspaceToHostContext()` replaces only the Build 306 tenancy fields after verifying:

- host application;
- environment;
- host instance;
- authenticated module subject;
- audit correlation ID.

The resolved context still declares `authorizationGranted: false`.

Build 312 remains responsible for capability negotiation and least-privilege grants.

## Live-safe metadata

`GET /api/module-tenant-context` exposes only protocol metadata:

- resolver/mapping schemas;
- exact mapping-key fields;
- mapping-state rules;
- RLS evidence requirements;
- explicit non-authorization and no-fallback flags.

It exposes no tenant records or mappings.

## Security boundary

Build 311 does **not**:

- infer a workspace from authentication alone;
- fall back to another tenant/workspace;
- accept ambiguity;
- reactivate disabled/deleted mappings;
- grant module capabilities;
- activate a peer connection;
- resume QL-266.

QL-266 remains `DISCONNECTED / HOLD`.

## Next queued build

**Build 312 — Capability Negotiation, Permission Projection & Least-Privilege Grants** — compare host-requested capabilities with platform grants, classify read/write/action authority, enforce owner-controlled expiry/review state and explain denied capabilities without treating discovery as authorization.
