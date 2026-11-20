# AI Data Platform Build 429

## Remaining Five-Source Signer Enrollment, Cloudflare Telemetry Activation, Original-Host AI Hub Relay & Seven-Source Continuous Health Completion

Build 429 uses the November 20, 2026 Three Master Application Review as a goal framework, not as proof that every recommendation already works.

## Reconciled starting point

Build 428 proved genuine signed production heartbeats for Yard Workers and iCamp. Current repository review also found telemetry source code for AI Data Platform, Rosevear AI Hub, Rosevear Comms Hub, Devil n Dove and Rosie Dazzlers. The remaining gap is authority/evidence, not merely missing source files.

- AI Data Platform: route present. The connected provider interface does not permit writing the private Ed25519 production signer, so self-signing remains HOLD.
- Rosevear AI Hub: original-host FastAPI telemetry source exists and deliberately requires the original Windows host, a local key path, read token and exact source commit. No original-host signer/HTTPS relay evidence is manufactured.
- Rosevear Comms Hub: private loopback telemetry source exists, but the current Cloudflare Worker is an assets deployment and does not expose the private loopback source as a public fleet endpoint. Cloudflare secret authority is not connected.
- Devil n Dove: canonical Pages Function telemetry route exists in current main. Provider secret authority is not connected.
- Rosie Dazzlers: canonical Pages Function telemetry route exists in current main. Provider secret authority is not connected.

## What Build 429 actually closes

### Receipt-bound sweep correlation

Build 428 could select the latest activation and latest receipt since a sweep began. Build 429 supersedes that acceptance pattern for health monitoring: every sweep receives a unique sweep ID, every source gets one observation per sweep, and a verified observation stores the exact receipt ID returned by that probe. The database enforces both unique(sweep_id, app_id) and unique(source_receipt_id). An overlapping sweep therefore cannot satisfy another sweep by borrowing its receipt.

This fixes the practical convergence risk without falsely claiming that a signed source challenge has already been added to protocol v1.1. Source-signed challenge propagation remains a future protocol goal.

### Seven-source catalog and explicit HOLDs

The owner screen identifies all seven production sources, owner, provider, reviewed revision where known, route implementation, dependencies, last verified receipt, current observation and proposed goal. Every unverified source must have a named HOLD rather than becoming CONNECTED because its origin answers HTTP.

### Metric dictionary

Build 429 publishes definitions for fleet coverage, freshness and convergence delay. It separates verified-source coverage from classification coverage and states that the proposed five-minute hosted cadence is a pilot target, not current measured uptime.

### Protected continuous-health floor

The existing protected daily Vercel cron keeps Build 427 compatibility and adds a correlated Build 429 sweep. Build 429 does not label a daily platform floor as a five-minute heartbeat service.

## Production gate

Production succeeds only when:
1. all seven sources are observed and classified;
2. Yard Workers and iCamp remain genuinely signed and receipt-linked;
3. every non-active source has an explicit HOLD state;
4. migrations, verifier and Next.js production build pass.

Seven-source CONNECTED is not required for Build 429 Production GREEN. It remains a separate runtime truth.

## Recommendation goals carried forward

The following remain proposed goals: provider-side AIDP self-signer custody and outside-in witness, Cloudflare secret enrollment and controlled rotation, original-host AI Hub relay activation, full source-signed sweep challenge propagation, and higher-frequency autonomous hosted cadence where the provider plan supports it.
