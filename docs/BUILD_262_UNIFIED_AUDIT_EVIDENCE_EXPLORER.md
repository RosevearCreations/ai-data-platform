# Build 262 — Unified Audit & Evidence Explorer

## Purpose

Build 262 provides one read-only, searchable surface over existing append-only operational evidence.

## Evidence sources

The explorer reads authorized evidence from existing RLS-scoped tables, including:

- Data Review events;
- Approved Data publication events;
- Publication delivery receipts;
- Integration delivery events;
- Operational outcome telemetry;
- Controlled remote-execution provider events.

No second audit database is introduced.

## Filters

The explorer supports filtering by:

- workspace;
- user/actor;
- module;
- operation;
- result;
- date range;
- source;
- consumer/provider;
- collection-run or job reference;
- record/dataset/publication reference;
- full-text matching across visible evidence and details.

## Safety boundary

The route is read-only. It does not modify, merge, infer or manufacture evidence. Existing row-level security remains authoritative. The explorer returns a bounded recent evidence window for interactive review.

## QL-266

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 262 does not reactivate external connection testing.

## Next roadmap item

**Build 263 — System Health, Observability & Reliability Dashboard.**
