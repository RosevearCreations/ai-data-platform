# Build 316 — Cross-App Search & Linked Record Explorer

## Purpose

Build 316 implements the deferred cross-application search capability as a server-side, read-only federation layer.

The module can search multiple mapped applications only when every participating source has an explicit `cross-app-search.read` authorization bound to the active subject, tenant and workspace.

## Authorized federated search

`executeAuthorizedFederatedSearch()` accepts a bounded search request and a set of server-side source adapters.

Every selected adapter must provide:

- a stable source application ID;
- an HTTPS source origin;
- explicit mapped-application status;
- a positive read authorization;
- authorization evidence ID;
- the exact subject, tenant and workspace covered by that authorization.

An unmapped, ungranted or scope-mismatched source fails closed.

## Tenant-safe result isolation

Every returned source record must carry the exact tenant and workspace requested by the active host context.

A source record from another tenant or workspace is rejected instead of being silently mixed into the result set.

## Linked-record graph

Search results may carry explicit canonical links for:

- customer;
- contact;
- product;
- service;
- job;
- booking.

The explorer builds edges only when two returned records share the same explicit canonical kind and canonical ID. Build 316 does not infer identity from similar names, email addresses, phone numbers or other fuzzy content.

## Source provenance

Every normalized result records:

- source application ID;
- source record ID and optional version;
- canonical contract ID when supplied;
- source update timestamp;
- authorization evidence ID;
- authorization subject ID;
- mapped-source state.

## Host-context filters

Build 316 supports bounded filters for:

- source application IDs;
- canonical record kinds;
- records updated after a supplied timestamp.

The total result limit is capped at 100 and a single source may not return more than 500 candidate rows to the federation layer.

## Safe deep links

Each source adapter supplies an HTTPS application origin and each record supplies an application-relative path.

Absolute paths that could change origin, protocol-relative URLs, credentials and malformed paths are rejected.

A source deep link is navigation only. It does not grant authorization in the source application.

## Read-only boundary

Build 316 does not expose a write callback to source adapters.

Search therefore:

- does not alter source records;
- does not request peer writes;
- does not activate a connection;
- does not approve mappings;
- does not bypass source authorization;
- does not resume QL-266.

`GET /api/module-cross-app-search` is discovery metadata only. Live federation requires server-side authorized adapters and is not accepted by that public discovery route.

QL-266 remains `DISCONNECTED / HOLD`.

## Next queued build

**Build 317 — Event Bus Host Bridge & Subscription Pack** remains the next queued product roadmap item.
