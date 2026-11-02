# Build 269 — Reporting Studio, KPI Dashboards & Evidence-Based Exports

## Purpose

Build 269 adds configurable reporting over existing governed platform evidence without creating a separate analytics truth store.

## KPI coverage

The reporting model covers:

- collection success;
- approval throughput;
- exception rates;
- integration outcomes;
- data quality;
- workspace activity;
- adoption / permission standing;
- retention footprint;
- provider usage.

Percentage KPIs retain their measured numerator and denominator.

## Configurable views

The Reporting Studio includes reusable presets:

- Operations
- Governance
- Delivery
- Executive

Reports can be scoped to all authorized workspaces or a single authorized workspace.

## Evidence-based exports

Authenticated exports are available as:

- CSV
- JSON

Exports use the same scoped reporting model rendered by the Reporting Studio. They do not query a separate reporting database and do not expose unauthorized workspace data.

## Measurement boundaries

- retention bytes are the existing measured retention/storage proxy;
- provider units are existing remote-provider telemetry;
- rates are calculated only from the evidence currently available to the authenticated user;
- zero denominators produce a zero rate instead of an invented percentage;
- these reports are operational evidence, not billing statements.

## QL-266 boundary

The unrelated owner-deferred QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 269 does not resume QL-266.

## Next build

**Build 270 — Capacity, Cost & Usage Planning.**
