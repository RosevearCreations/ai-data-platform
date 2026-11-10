# Build 359 — Advanced Adaptive Controls, Dynamic Thresholds & Intelligent Resource Management

## Objective

Build 359 begins converging the three Master applications into one coordinated operating model without collapsing their repositories, credentials or authority boundaries.

The Master planes are:

- **AI Data Platform** — intelligence, monitoring, correlation, forecasting and evidence verification.
- **Rosevear Comms Hub** — communications, incident workflow, routing, acknowledgement and follow-up.
- **Rosevear AI Hub** — Windows/local automation and execution host on **Ree Windows Server**.

Cross-application scheduled automation belongs on Rosevear AI Hub. AI Data and Comms may run their own plane-internal cloud/server request handling, but they do not become the Windows automation scheduler.

## Adaptive thresholds

Build 359 derives advisory upper bands only when Build 358 has an **ESTABLISHED** behaviour baseline.

For the current performance metrics, where a higher value is worse:

- attention band = historical median + 2.5 robust sigma;
- critical band = historical median + 4 robust sigma;
- robust sigma = 1.4826 × median absolute deviation (MAD), with a minimum non-zero band.

Limited or insufficient history cannot claim an adaptive threshold.

The adaptive bands are a read model. They do not rewrite budgets, source truth, release policy or peer configuration.

## Intelligent resource management

Build 359 converts the Build 358 risk band into a supervised operating proposal:

- higher risk shortens the proposed monitoring cadence;
- higher risk prioritizes health/recovery work over nonessential automation;
- all cross-application automation proposals are placed on Rosevear AI Hub;
- no Windows task is created or changed automatically;
- no resource proposal is automatically applied.

## Master uptime monitoring

Uptime is based on **verified runtime samples**, not deployment status alone.

The three planes use different evidence paths:

1. AI Data Platform — current request/deployment observations.
2. Rosevear Comms Hub — protected runtime/health projection.
3. Rosevear AI Hub — protected outbound Windows heartbeat.

The existing QL-338 Windows heartbeat contract permits a maximum 120-second expiry. Build 359 therefore treats stale/missing AI Hub heartbeat evidence as a monitoring gap rather than healthy uptime.

A 24-hour uptime percentage is shown only after at least three verified samples exist in that window. Missing history is **unmeasured**, never 100%.

## Current convergence boundary

Build 359 does not activate the held QL-338/QL-409 protected connection path and does not claim the Windows server is remotely connected merely because source code exists.

Current source/deployment GREEN and live runtime health remain separate facts.

## Security and authority

Build 359 cannot:

- release HOLD or create acceptance;
- change source truth;
- create Comms incidents automatically;
- execute peer recovery automatically;
- create or modify Windows scheduled tasks;
- move cross-app automation from Rosevear AI Hub into AI Data or Comms;
- infer uptime from deployment GREEN.

## Next queued build

**Build 360 — Advanced Control Readiness, Supervised Self-Healing & Autonomous-Control Boundary Certification**.
