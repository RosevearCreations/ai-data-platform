# Build 270 — Capacity, Cost & Usage Planning

## Purpose

Build 270 turns existing Production Learning cost proxies into operational planning forecasts without creating billing truth, importing invoices or hard-coding provider prices.

## Planning coverage

The Capacity Planning workspace forecasts:

- measured storage footprint;
- operational record volume;
- provider units;
- collection frequency;
- integration volume;
- retention workload.

Each forecast starts from evidence already visible through the authenticated Production Learning model and applies one explicit scenario multiplier.

## Scenarios

- **Current pace** — 1.0× measured usage.
- **Moderate growth** — 1.5× measured usage.
- **High growth** — 2.0× measured usage.

Scenario selection changes planning estimates only. It does not modify schedules, providers, retention policy, database state or external integrations.

## Cost boundary

Provider units and measured payload bytes remain cost proxies.

Build 270 does **not**:

- import actual invoices or subscription charges;
- apply provider currency pricing;
- claim an estimated proxy is an actual bill;
- authorize purchases, provider upgrades or retention cleanup.

Actual billing remains external evidence and may change independently from application code.

## Workspace safety

All source evidence remains inside the existing authenticated/RLS-scoped Production Learning path. Capacity Planning creates no separate analytics or billing truth store and introduces no new database migration.

## QL-266 boundary

The unrelated owner-deferred QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 270 does not resume QL-266.

## Next build

**Build 271 — Accessibility, Mobile, Performance & Failure-Recovery Hardening.**
