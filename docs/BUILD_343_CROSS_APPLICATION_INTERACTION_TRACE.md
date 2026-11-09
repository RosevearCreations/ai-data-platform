# Build 343 — Cross-Application Interaction Trace, Dependency Graph & Failure Propagation

## Purpose

Build 343 adds a read-only Master Shell view of governed interactions across the exact six application/source identities.

It uses the correlation and causation fields already carried by the Build 335 contract and the signed, normalized Build 337 source-ingestion evidence. The build does not invent a second interaction ledger and does not rewrite source evidence.

## Interaction trace

The model groups accepted source updates by correlation ID and preserves, for every event:

- source ID;
- event ID and event type;
- source revision and source sequence;
- sequence state;
- causation ID when present;
- evidence URI;
- verification state;
- freshness;
- event time.

A correlation group may span one or more applications. A shared correlation ID establishes membership in the same governed flow only. **Correlation does not prove causation.**

## Dependency graph

Cross-application correlation groups create evidence-backed source-to-source edges.

Edges are deliberately recorded as:

- `CORRELATED_FLOW`;
- `UNDIRECTED`.

Build 343 does not infer a write direction, ownership relationship, tenant relationship or permission boundary from event order alone.

## Failure propagation review

Build 343 identifies adverse evidence inside a cross-application group when an event is:

- stale;
- out of source-sequence order; or
- not independently verified.

The earliest adverse event may be shown as a **candidate upstream source for review**. This is explicitly inference-only. It is not source truth, does not alter the source record, and does not authorize recovery or routing.

When there is not enough evidence, the model reports `INSUFFICIENT_EVIDENCE` rather than inventing a root cause.

## Missing evidence

Missing trace evidence does not mean no interaction occurred.

A source with no accepted Build 337 event is shown as unmeasured. Build 343 does not convert missing evidence into healthy, disconnected, failed or unused status.

## Security and authority

Build 343 is read-only.

It does not:

- mutate a source;
- perform a peer write;
- probe an external application;
- activate a connection;
- release a route;
- send a message;
- create a task;
- trigger automatic recovery;
- infer tenant identity from correlation;
- infer customer identity from correlation;
- convert a likely upstream cause into authoritative source state.

The six-source Master Shell boundary is unchanged. Rosevear Comms Hub remains the complementary communications/control plane.

## Surfaces

- `/cross-application-interaction-trace`;
- `/api/cross-application-interaction-trace`.

The API is authenticated and GET-only.

## Next queued build

**Build 344 — Module Health, Stuck-State, Staleness, HOLD & Blocker Intelligence.**
