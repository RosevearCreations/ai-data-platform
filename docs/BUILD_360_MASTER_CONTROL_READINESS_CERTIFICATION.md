# Build 360 — Advanced Control Readiness, Supervised Self-Healing & Autonomous-Control Boundary Certification

## Objective

Build 360 closes the first advanced-control roadmap and turns the three Master applications into a deliberately ordered activation sequence before any larger source/slave application moves forward.

The three Master planes remain separate security and release boundaries:

1. **AI Data Platform** — controller/intelligence/monitoring plane.
2. **Rosevear Comms Hub** — communications/incident/owner follow-up plane.
3. **Rosevear AI Hub** — Ree Windows Server monitoring, local recovery and approved automation execution plane.

## Production baselines reconciled for this build

At Build 360 authorization time:

- AI Data Platform: Build 359 production.
- Rosevear Comms Hub: **QL-410** production at `ccbeab4307ed6458399dcb0eb03324aeaf12f97f`.
- Rosevear AI Hub: **Build 303** production at `9df3130cbe87dd65a6a3da9c238a521f8fff38a5`.

These are observed baselines, not permanent pins. Each target must re-read its own current `main` before activation and reconcile drift rather than overwriting concurrent work.

## Autonomous-control certification

Build 360 distinguishes four classes.

### Autonomous read-only certified

Safe automatic work includes:

- recomputing Build 358/359 anomaly, risk and adaptive-threshold read models;
- reading/storing verified telemetry measurements;
- calculating freshness and measured uptime;
- detecting monitoring gaps.

These actions cannot change source truth, connection acceptance or peer state.

### Supervised only

The following remain supervised:

- Comms incident correlation and operator routing;
- AI Hub bounded local recovery using its existing approved recovery mechanisms;
- resource/workload changes;
- any future source-owned repair.

### Blocked until both Masters activate

Master uptime aggregation remains blocked until AI Hub supplies persistent, signed read-only telemetry and Comms supplies the protected projection/incident correlation path.

### Denied autonomy

The Master Shell is not certified to autonomously:

- release HOLD or create acceptance;
- restart/redeploy another app;
- run migrations/destructive repair;
- modify Windows scheduled tasks;
- rotate credentials or trust pins;
- send customer communications without Comms authority;
- mutate source/customer/device data.

## Master activation order

### 1. Rosevear Comms Hub

Next expected build:

**QL-411 — Original-Ree Host Telemetry Adapter, AI Data Platform Uptime Read Models & Comms Incident Correlation Pilot.**

Activation token: `MASTER360-COMMS-ACTIVATE`

The Comms agent must consume `docs/master-shell/MASTER_360_ACTIVATION_CONTRACT.json`, reconcile its current main first, then implement protected read-only telemetry projection and supervised incident correlation. Receiver/connection truth remains fail-closed.

### 2. Rosevear AI Hub

Next expected build:

**Build 304 — Ree Server Monitoring Persistence, Signed Read-Only Master Telemetry Contract & Comms Incident Handoff Acceptance.**

Activation token: `MASTER360-AIHUB-ACTIVATE`

The AI Hub agent must consume the same contract, reconcile current main first, keep automation on Ree's original Windows host, persist bounded monitoring history, prepare signed metadata-only telemetry and preserve existing Windows task/recovery authority.

## Larger applications remain gated

Yard Workers, iCamp, Rosie Dazzlers and Devil n Dove should not enter the next Master integration phase until both activation receipts are reconciled and Build 360 can truthfully mark the three Masters synchronized.

This is not a claim that all application feature development must stop. It is specifically a gate on the next Master-Shell integration stage.

## Self-healing boundary

“Supervised self-healing” means:

- AI Data detects and recommends;
- Comms routes/records incidents;
- AI Hub may run source-owned/local recovery only through its already approved mechanisms;
- consequential actions remain approval-gated and auditable.

Build 360 does not remotely execute local recovery.

## Next roadmap

After the three Masters are synchronized, the controller may open the next roadmap for the larger source applications in this order:

1. Yard Workers and iCamp at product-shell level.
2. Rosie Dazzlers and Devil n Dove at owned-business shell level.
3. Remaining cross-application workflows only after source-specific authority and telemetry are verified.
