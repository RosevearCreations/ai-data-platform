# Build 358 — Advanced Anomaly Detection, Behaviour Baselines & Predictive Risk Intelligence

## Objective

Build 358 adds an advanced intelligence layer over existing measured production evidence.

It combines:

- historical performance baseline snapshots;
- current performance budgets and regression evidence;
- API, database and dependency observatory evidence;
- Build 356 demand-pressure forecasts;
- Build 357 incident/runbook pressure.

The result is anomaly detection plus a bounded predictive-risk review index.

## Behaviour baseline method

For each measured performance metric, Build 358 derives a historical median and median absolute deviation (MAD) from stored performance snapshots.

A robust deviation score is calculated when enough comparable historical evidence exists.

Baseline quality is explicit:

- `INSUFFICIENT` — fewer than three historical observations;
- `LIMITED` — three or four observations;
- `ESTABLISHED` — five or more observations.

An insufficient baseline cannot manufacture an anomaly claim.

## Anomaly classification

A metric may be:

- `NORMAL`;
- `ATTENTION`;
- `ANOMALOUS`;
- `UNMEASURED`.

Current budget status and confirmed regression evidence are considered alongside robust historical deviation.

Missing evidence is not treated as normal.

## Predictive risk intelligence

Build 358 calculates a deterministic 0–100 **review-priority index** from:

- anomalous and attention-level behaviour deviations;
- poor/degraded service operations;
- demand-pressure forecasts;
- critical/blocked incident plans;
- observed database-pool waiting.

The index is **not a probability** of failure and is not a statement of future fact.

The projection assumes current measured conditions and the selected demand scenario continue until the next observation window. External events are not predicted.

## Authority boundaries

Advanced intelligence does not create autonomous authority.

Build 358 cannot:

- change source truth;
- release HOLD;
- create acceptance;
- trigger peer recovery;
- scale infrastructure;
- create a Comms Hub incident;
- write to a source application.

Consequential response remains within Build 357 supervised recovery and existing Comms/source authority boundaries.

## Next queued build

**Build 359 — Advanced Adaptive Controls, Dynamic Thresholds & Intelligent Resource Management**.

## Promotion verification

Production promotion remains gated by the repository's authoritative compact promotion gate and exhaustive historical audit when required. A missing workflow run is not treated as a pass.
