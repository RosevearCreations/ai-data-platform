# Build 312 — Capability Negotiation, Permission Projection & Least-Privilege Grants

## Purpose

Build 312 determines which discovered module capabilities are actually callable for the authenticated user and resolved tenant/workspace context.

Discovery is informational. A host request is informational. Neither grants authority.

## Least-privilege rule

A capability becomes callable only when all of these are true:

1. the capability is in the module registry;
2. the host explicitly requested it;
3. exactly one owner-controlled grant exists for the exact host application, environment, host instance, authenticated subject, platform tenant and workspace;
4. the grant classification matches the discovered capability classification;
5. the owner decision is `approved`;
6. the grant has started;
7. the grant has not expired;
8. the grant is not yet due for review.

The resulting effective set is therefore the strict intersection of requested, discovered and valid owner-granted capabilities.

Unrequested discovered capabilities remain visible but non-callable.

## Capability classification

The registry supports:

- `read` — non-mutating retrieval;
- `write` — mutating data operation;
- `action` — governed operation/action execution.

The current live Build 312 registry truthfully advertises the existing Build 306 headless capabilities, which are all read-only.

The engine supports future explicitly registered write/action descriptors without advertising them before they exist.

## Owner-controlled grants

A grant is scoped to:

- host application;
- environment;
- host instance;
- authenticated module subject;
- platform tenant;
- workspace;
- capability.

Each grant includes:

- classification;
- owner decision status;
- owner decision subject and timestamp;
- issued-at timestamp;
- expiry timestamp;
- review timestamp.

Statuses are:

- approved;
- denied;
- revoked.

Two current grant records for the same capability/scope are treated as ambiguous and fail closed.

## Expiry and review state

Approved grants still become non-callable when:

- they have not started;
- they have expired;
- the review date has been reached.

A review-due grant must be explicitly reviewed before reuse.

## Denial explanations

Denied projections provide a stable reason and human-readable explanation, including:

- capability not discovered;
- owner grant missing;
- ambiguous grant state;
- owner denied;
- grant revoked;
- grant expired;
- review required;
- grant not yet valid;
- grant classification mismatch.

## Headless SDK authorization bridge

`createLeastPrivilegeHeadlessAuthorizer()` adapts Build 312 into the Build 307 headless SDK authorization interface.

Every authorization request re-reads and validates the current host context, verifies that the SDK runtime identity still matches the authenticated tenant/workspace scope, reruns negotiation, and allows the request only when the capability remains in the effective set.

This avoids treating an old discovery result as permanent authorization.

## Live-safe capability catalog

`GET /api/module-capabilities` exposes:

- the live registered capability descriptors;
- read/write/action classification support;
- grant lifecycle rules;
- explicit non-authorization security flags.

It exposes no owner grant records.

## Security boundary

Build 312 does **not**:

- grant authority from discovery;
- grant authority merely because the host requested a capability;
- grant unrequested capabilities;
- inherit capability authority from tenant resolution;
- accept ambiguous grants;
- preserve expired/review-due/revoked grants as callable;
- activate a peer connection;
- resume QL-266.

QL-266 remains `DISCONNECTED / HOLD`.

## Next queued build

**Build 313 — Host Navigation, Deep Links & Command Palette Bridge** — host navigation registration, governed deep links, back-stack/breadcrumb integration, command-palette registration, contextual launch parameters, safe return-to-host handling and route compatibility fallback.
