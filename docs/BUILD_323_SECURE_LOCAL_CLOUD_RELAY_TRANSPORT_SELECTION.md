# Build 323 — Secure Local/Cloud Relay & Transport Selection

## Purpose

Build 323 adds a host-neutral transport abstraction for AI Data Platform module communication.

It does not replace the existing authorization, connector, webhook, event-bus or workflow gates. It answers one narrower question: **which already-approved transport is safe and healthy enough to use for this host operation?**

## Transport manifest

`apps/web/lib/secure-transport-selection.ts` defines versioned manifests for:

- `direct-https`;
- `trusted-local-relay`;
- `approved-cloud-relay`.

Each manifest declares:

- stable transport ID/version;
- display name;
- host environment;
- exact destination origin;
- exact origin allowlist;
- priority;
- enabled state;
- failover eligibility;
- security level;
- health contract;
- optional trusted-local-relay registration metadata.

Transport presence is configuration evidence, not authorization.

## Origin allowlist

Build 323 reuses the exact-origin normalization from the secure Build 308 embed boundary.

Rules:

- wildcard origins are rejected;
- credentials, paths, queries and fragments are rejected;
- direct and cloud transports require HTTPS;
- local relay may use HTTPS;
- HTTP local relay is allowed only for loopback hosts and only outside production;
- the destination origin must be present in the exact allowlist.

## Trusted local relay registration

`registerTrustedLocalRelay()` creates a local relay transport manifest from:

- relay ID;
- exact relay origin;
- configured trust-reference ID;
- environment;
- health contract;
- security level.

The trust reference is metadata only. Raw relay trust material, keys or credentials are not accepted.

## Cloud/direct mode

Direct HTTPS and approved cloud relay are explicit transport kinds.

Both require exact HTTPS origins and use the same selection/audit contract as local relay. This prevents host code from inventing separate security behavior for each mode.

## Transport health

Every transport declares a bounded GET/HEAD health contract.

Health observations are represented by `rosevear.ai-data-platform.transport-health.v1` evidence containing:

- transport ID;
- probe ID;
- healthy/degraded/unhealthy/unknown status;
- checked timestamp;
- optional latency;
- exact observed origin.

The selector does **not** perform the health request itself. It only evaluates supplied health evidence, so discovery and selection cannot silently create network traffic.

Health evidence older than five minutes is not eligible for selection.

## Failover eligibility

Failover requires all of the following:

- caller explicitly allows failover;
- candidate is enabled;
- candidate environment matches;
- candidate has fresh acceptable health evidence;
- candidate declares itself failover-eligible;
- candidate meets the requested minimum security level;
- candidate security strength is equal to or stronger than the failed requested transport.

A weaker candidate is held with `security-downgrade-denied`.

There is no silent downgrade flag.

## Audit evidence

Every selection returns immutable selection evidence:

- deterministic SHA-256 selection ID;
- audit correlation ID;
- environment;
- requested transport;
- chosen transport;
- failover source when applicable;
- selected/held outcome;
- normalized reason code;
- chosen/minimum security level;
- health evidence IDs;
- timestamp.

The evidence explicitly records:

- selector network request performed: false;
- authorization granted by selection: false;
- silent downgrade performed: false.

## Operator usability

The App Connection Registry now links to:

`GET /api/module-transports`

This discovery route describes supported transport kinds, allowlist policy, health evidence rules, failover rules and security boundaries without registering or activating any connection.

## Security boundary

Build 323 does not:

- create credentials;
- accept raw credentials or relay trust material;
- authorize a host because a transport exists;
- perform a network request during discovery or selection;
- treat health as authorization;
- automatically fail over unless explicitly allowed;
- fail over to a weaker security level;
- accept wildcard origins;
- allow production direct/cloud HTTP;
- allow production loopback HTTP relay;
- activate a peer application connection.

## Next queued build

**Build 324 — Offline Queue, Reconnect & Idempotent Synchronization** remains the next regular product roadmap item.
