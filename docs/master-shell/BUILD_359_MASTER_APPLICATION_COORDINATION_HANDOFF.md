# Build 359 — Master Application Coordination Handoff

## Coordination baseline

Build 359 was designed against the current production Master-plane baseline observed at authorization:

- AI Data Platform — Build 358 production.
- Rosevear Comms Hub — **QL-409** production, source-scoped protected audit timeline and receiver-OFF review.
- Rosevear AI Hub — **Build 302** production, protected intake operator workflow and signed-receipt requirements.

These revision/build references are a historical coordination baseline only. They are not live uptime evidence.

## Master-plane responsibilities

| Plane | Primary responsibility | Cross-app automation execution |
| --- | --- | --- |
| AI Data Platform | Intelligence, monitoring, anomaly/risk, adaptive recommendations | No |
| Rosevear Comms Hub | Incidents, communications, routing, acknowledgement, follow-up | No |
| Rosevear AI Hub | Windows/local execution, recovery and approved automation | **Yes — Ree Windows Server** |

## Uptime and health flow

The target flow is deliberately outbound/fail-closed:

1. Rosevear AI Hub observes the local Windows services and existing scheduled recovery state.
2. Rosevear AI Hub emits a protected metadata-only outbound heartbeat under the existing QL-338 contract once that path is genuinely activated and authorized.
3. Rosevear Comms Hub receives/validates the protected receipt and may expose a redacted projection.
4. AI Data Platform consumes verified runtime samples to calculate freshness and measured uptime.
5. Stale/missing heartbeat evidence becomes a monitoring gap and may prepare a Comms escalation request; it does not prove the server is down and does not auto-restart it.

## Automation placement

All new cross-application schedulers, recurring probes and local recovery automation should be designed to execute on **Ree Windows Server through Rosevear AI Hub**, not in AI Data Platform or Rosevear Comms Hub.

Build 359 intentionally creates **no new Windows scheduled task**. The existing Rosevear AI Hub recovery mechanism remains source-owned and must not be silently replaced.

## Merge direction

“Merge the Master applications” means a progressively unified operator experience and shared contracts while preserving:

- separate repositories and release gates;
- separate credentials and signer custody;
- AI Data intelligence authority;
- Comms communications authority;
- AI Hub Windows execution authority.

Build 360 can certify which bounded controls are safe for supervised self-healing after fresh field evidence exists.
