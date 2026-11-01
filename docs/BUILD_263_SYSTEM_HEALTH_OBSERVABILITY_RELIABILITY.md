# Build 263 — System Health, Observability & Reliability Dashboard

## Purpose

Build 263 adds one authenticated, evidence-based health surface for operators.

## Health sources

The dashboard combines measured evidence from:

- the current authenticated application request;
- a live RLS-scoped database probe and measured query latency;
- collection runtime readiness and collection-run outcomes;
- connector installation compatibility and latest connector audit outcomes;
- integration delivery events and transport failures;
- remote-execution readiness and failed/timed-out attempts;
- open bulk-review exceptions and in-review queues;
- Operator Attention Center critical and attention items.

No second observability database is introduced.

## Reliability states

Signals are derived from measured current conditions:

- **Healthy** — probe or operational evidence is currently successful;
- **Attention** — a blocked, deferred, fail-closed, or review-required condition exists;
- **Critical** — current failure evidence exists;
- **Inactive** — no active evidence exists for that optional subsystem.

The dashboard does not claim unsupported uptime percentages or SLAs.

## QL-266 boundary

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 263 does not restart external connection testing.

## Next build

**Build 264 — Connector Diagnostics, Configuration Validation & Recovery Assistant.**
