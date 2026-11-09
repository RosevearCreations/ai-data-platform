# Build 335 — Master Shell Contract V1, Correlation IDs & Standard Event Envelope

## Purpose

Build 335 begins the Master Shell implementation sequence at **Stage A — shared registry and schema alignment**.

It defines the common event and registry contracts that AI Data Platform and Rosevear Comms Hub can use without pretending that all six applications already publish or ingest the new contract.

## Exact six source identities

The Master Shell source IDs are:

- `yw` — Yard Workers platform shell;
- `icamp` — iCamp platform shell;
- `rosiedazzlers` — Rosie Dazzlers owned-business shell;
- `devilndove` — Devil n Dove owned-business shell;
- `ai-data-platform` — AI Data Platform support broker/module boundary;
- `rosevear-ai-hub` — original local Windows support server.

Rosevear Comms Hub is a complementary control-plane/audience identity and is **not** counted as a seventh child source.

The existing internal `yard-workers` identifier is retained only as compatibility metadata for the `yw` source mapping. A tenant such as Rosevear Landscaping or Camp Rosevear can never become a source ID.

## Event envelope

The standard event schema is:

`rosevear.master-shell.event.v1` / `1.0.0`

Required fields are:

- eventId;
- schema and schemaVersion;
- sourceId and sourceRevision;
- shellId and optional tenantId;
- eventType;
- occurredAt and publishedAt;
- monotonic sourceSequence;
- correlationId and nullable causationId;
- idempotencyKey;
- sensitivity;
- exact audience;
- evidenceURI;
- verificationState;
- payloadHash;
- payload.

The parser is fail-closed:

- unknown top-level fields fail;
- an unknown source fails;
- source/shell identity mismatch fails;
- invalid audience fails;
- invalid event family fails;
- published time before occurred time fails;
- invalid correlation/causation/idempotency values fail;
- payload hash mismatch fails.

## Required event families

V1 defines:

- `source.health.reported`;
- `release.promoted`;
- `module.readiness.changed`;
- `incident.opened`;
- `incident.updated`;
- `consent.changed`;
- `workflow.status.changed`;
- `audit.evidence.recorded`.

These are contract families, not proof that each source has implemented every family.

## Correlation and causation

A root event requires a correlation ID and may have a null causation ID. A downstream event keeps the incoming correlation ID and records a causation ID that identifies the immediate cause.

The AI Data helper can construct **AI Data Platform-owned** envelopes only. It does not synthesize another application's source authority.

Idempotency is deterministic over source ID, source revision, source sequence, event type and payload hash.

## Machine-readable contracts

- `docs/contracts/rosevear-master-shell-event-v1.schema.json`
- `docs/contracts/rosevear-master-shell-registry-v1.schema.json`

The registry schema carries the required source identity, repository, environment, shell boundary, owner, manifest, immutable revision, capability/contract versions, approved origin, signer metadata, status/freshness evidence, roles and tenancy model.

## Operator surfaces

- `/master-shell-contracts`
- `/api/master-shell-contract-v1`

The POST API performs bounded validation only. It does not persist, ingest or route the submitted event.

## Stage boundary

Build 335 does **not**:

- claim all six applications implement V1;
- ingest new source updates;
- retrofit historical webhook/event-bus receipts into V1 evidence;
- activate a source connection;
- upgrade UNKNOWN/HOLD to CONNECTED;
- change tenant or source authorization;
- release held routes or execute peer writes.

Read-only source-update ingestion remains Build 337 after the six-source registry/freshness work in Build 336.

## Next queued build

**Build 336 — Six-Source Registry, Freshness & Source State Machine.**
