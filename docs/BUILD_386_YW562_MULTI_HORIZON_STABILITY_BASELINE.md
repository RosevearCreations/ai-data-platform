# AI Data Platform Build 386

Build 386 extends Build 385 with multi-horizon stability baselines, preventive-control degradation detection, and three-master early-warning escalation auditing.

- Evaluates 6-hour, 24-hour, and 72-hour stability horizons.
- Requires minimum evidence counts of 3, 6, and 12 samples respectively.
- Requires 95% stability at 6h and 24h, and 98% at 72h.
- Detects preventive-control score degradation greater than five percentage points.
- Degradation activates early warning and forces DISCONNECTED_HOLD.
- AI Hub, Comms Hub, and AI Data Platform must all acknowledge degradation.
- Repository/deployment GREEN cannot override degraded runtime baseline evidence.

Migration 0150 adds append-only multi-horizon sample, degradation-event, and early-warning audit tables with RLS.
