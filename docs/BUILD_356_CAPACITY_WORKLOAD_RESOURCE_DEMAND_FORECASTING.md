# Build 356 — Moderate Capacity, Workload, Resource & Demand Forecasting

## Objective

Build 356 extends the existing Build 270 capacity-planning evidence into a moderate forecasting control layer.

It projects measured workload through the existing current-pace, moderate-growth and high-growth scenarios, then combines that demand with current API, database, dependency and connection-pool pressure.

## Forecast dimensions

- storage workload;
- operational record workload;
- provider demand;
- collection workload;
- integration workload;
- retention workload.

Each dimension reports current measured proxy, scenario demand, growth delta and pressure state.

## Hard capacity remains unknown

Build 356 does not invent infrastructure ceilings or headroom.

Until authoritative limit evidence is imported, these remain explicitly unknown:

- cloud/server hard capacity;
- provider quotas;
- staffing capacity;
- source-application capacity;
- actual billing constraints.

A demand forecast is therefore not a statement that the system can or cannot carry that load.

## Pressure model

Pressure is classified as:

- `NOMINAL` — measured current workload with no active performance pressure;
- `ATTENTION` — growth or measured performance pressure needs review;
- `CRITICAL` — poor service/dependency evidence, high pool waiting, or high-growth plus active pressure;
- `UNMEASURED` — no current workload evidence exists for that dimension.

Missing evidence is never converted into success.

## Safety boundaries

Build 356 performs **no automatic capacity action**.

It does not:

- scale infrastructure;
- purchase capacity;
- upgrade providers;
- change staffing;
- mutate schedules;
- delete retention records;
- change source-application state.

Any future capacity change remains owner/operator approved, evidence-backed, validated after the change and reversible.

## Next queued build

**Build 357 — Moderate Incident Automation, Runbooks & Supervised Recovery Orchestration**.
