# Build 341 — Outer Sysop Navigation, Ree/Jack Context Handoff, Role & Tenant Isolation

## Purpose

Build 341 implements Stage B of the Rosevear Suite Master Shell plan.

It provides:

- a dedicated Master Sysop authority separate from tenant roles;
- separate authenticated-user sessions for Ree/Jack or any explicitly enrolled Sysop accounts;
- responsive desktop/tablet/mobile outer-shell navigation;
- bounded application context handoff;
- fail-closed tenant/workspace mapping;
- role preservation without elevation;
- destination reauthentication and destination-owned authorization;
- append-only handoff evidence.

Navigation never grants destination authority.

## Dedicated Master Sysop authority

Build 341 adds `app.master_sysop_members`.

Roles are:

- `owner`;
- `operator`.

This authority is separate from `app.workspace_members`.

A person being `owner` or `admin` of Rosie Dazzlers, Devil n Dove or any future tenant workspace does **not** automatically make that person a Master Sysop.

### Safe first Sysop bootstrap

For a fresh install, the existing first-owner bootstrap also creates the initial Master Sysop owner after migration 0121 exists.

For an already-running install, migration 0121 auto-seeds only when there is exactly one owner of the existing `personal` workspace.

If that condition is ambiguous, no Sysop is fabricated. An eligible authenticated Personal-workspace owner can use the one-time first-Sysop claim path only while there is no active Master Sysop.

### Separate Ree/Jack sessions

Build 341 does not create shared credentials.

Each Sysop must have an existing Better Auth account and use their own authenticated browser session.

A Master Sysop owner may enroll another **existing authenticated account** by exact email and assign `owner` or `operator`.

The system does not create a password, copy a session, share a cookie or impersonate the target user.

Revocation is explicit. The database prevents revoking/demoting the final active Master Sysop owner.

## Tenant/workspace context

Tenant context is derived only from the current authenticated user's RLS-visible `workspace_members` rows.

Build 341 never inserts a workspace membership as part of navigation.

### Rosie Dazzlers / Devil n Dove

These owned-business shells already have durable Build 282 workspace mappings.

A workspace hint is available only if:

1. the application has the existing exact workspace mapping; and
2. the current authenticated Sysop is actually a member of that workspace.

If the mapping exists but the user is not a member, handoff state is `TENANT_DENIED`.

The local workspace role is carried only as a **role hint**. It is never elevated and never authorizes the destination.

### Yard Workers / iCamp

These remain platform shells with child tenants.

Build 341 does not guess Rosevear Landscaping, Camp Rosevear or any other customer/business tenant mapping.

The destination shell may be opened only at shell level when source/origin evidence is sufficient. The destination must authenticate the person and select/authorize a child tenant itself.

### AI Data Platform / Rosevear AI Hub

AI Data Platform has no customer tenant in the Master Shell contract.

Rosevear AI Hub is a local support-server boundary.

No customer-tenant identity is invented for either.

### Rosevear Comms Hub

Comms Hub remains the complementary communications/control plane rather than a seventh child source.

Build 341 does not invent an approved Comms origin. Its handoff remains `ORIGIN_UNMEASURED` until separately authorized evidence exists.

Build 342 remains responsible for the Comms complementary-plane read integration.

## Source/origin gate

External handoff requires:

- active Master Sysop membership;
- current source evidence;
- source state `CONFIGURED`, `TEST_VERIFIED` or `CONNECTED`;
- fresh source evidence;
- an exact HTTPS approved origin;
- any required owned-business workspace mapping/membership.

`AUTHORIZATION_HELD`, stale evidence, missing origin, unmapped tenant or tenant denial remains fail-closed.

Opening an application does not change its Build 336 source state.

## Handoff context

Prepared external handoff context is deliberately non-authorizing.

It contains:

- handoff ID;
- destination key;
- optional mapped workspace slug;
- optional local workspace role hint;
- issue/expiry times;
- return path;
- `authority: none`;
- destination reauthentication required;
- destination authorization required;
- tenant role elevation forbidden.

It does **not** contain:

- user ID;
- email;
- password;
- Better Auth cookie/session;
- credential value;
- destination role grant;
- tenant membership grant.

The context is encoded only as a navigation hint. The destination must reauthenticate and independently authorize the user.

## Handoff audit

Migration 0121 adds `app.master_sysop_handoff_audit`.

The audit records:

- actor user ID internally;
- destination;
- mapped workspace ID/role if applicable;
- prepared/held/denied state;
- SHA-256 context hash;
- issue/expiry times;
- non-secret policy metadata.

Runtime access is SELECT/INSERT only. UPDATE/DELETE are denied.

## Responsive shell

`/master-sysop` provides a destination grid that renders:

- three columns on wider desktop screens;
- two columns at tablet widths;
- one column on mobile widths.

Status and denial text remains visible rather than being hidden on small screens.

## Surfaces

- `/master-sysop`;
- `/api/master-sysop`.

The API supports:

- GET current Sysop/tenant/destination model;
- POST initial claim;
- POST enroll existing account;
- POST revoke Sysop;
- POST prepare non-authorizing handoff.

## Safety boundaries

Build 341 does not:

- create shared Ree/Jack credentials;
- impersonate another user;
- grant Master Sysop from ordinary tenant admin status;
- create a tenant/workspace membership during navigation;
- guess Yard Workers or iCamp child tenant identity;
- elevate a local workspace role;
- transfer user ID/email/session credentials to a destination;
- bypass destination authentication;
- grant destination authorization;
- activate a source/integration;
- alter Build 336 source state;
- perform a peer write;
- treat navigation as acceptance.

## Next queued build

**Build 342 — Comms Hub Complementary Plane Integration & Incident/Follow-Up Read Models.**
