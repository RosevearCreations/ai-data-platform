# Build 346 — One-to-One, One-to-Many, Many-to-One & Many-to-Many Integration Certification

## Purpose

Build 346 adds evidence-backed certification for the four supported Master Shell relationship patterns:

- one-to-one;
- one-to-many;
- many-to-one;
- many-to-many.

Each certification run evaluates exactly six dimensions:

1. contract;
2. identity;
3. replay;
4. expiry;
5. audience;
6. tenant isolation.

A relationship is PASS only when all six dimensions are fresh PASS evidence. Any FAIL fails the relationship. Any BLOCKED dimension keeps the relationship BLOCKED. An expired run is STALE.

## Relationship cardinality

The Build 346 core validates cardinality against the declared pattern:

- one-to-one = exactly one source and one destination;
- one-to-many = exactly one source and two or more destinations;
- many-to-one = two or more sources and exactly one destination;
- many-to-many = two or more sources and two or more destinations.

Only exact Build 335 Master Shell source IDs are accepted. Duplicate source IDs, duplicate destination IDs and self-overlap between source and destination sets fail closed.

## Evidence storage

Migration `0124_master_relationship_integration_certification.sql` creates:

- `app.master_relationship_certification_runs`;
- `app.master_relationship_certification_assertions`.

Both tables are RLS-protected and append-only to the runtime role. A certification run is written atomically with six assertion rows. Runtime UPDATE and DELETE remain revoked.

Every run retains:

- stable relationship ID;
- certification version;
- relationship pattern;
- source and destination source IDs;
- reviewer;
- observed and expiry timestamps;
- branch and commit SHA;
- optional notes;
- computed overall outcome.

Every assertion retains its dimension, PASS/FAIL/BLOCKED outcome, evidence URI and evidence detail.

## Relationship to Build 304

Build 304 remains the six-application operational integration certification across authentication, approved exchange, event handling, failure recovery and tenant isolation.

**A Build 304 PASS does not automatically certify a relationship pattern.** Build 346 requires cardinality-specific evidence for contract, identity, replay, expiry, audience and tenant isolation.

Likewise, Build 346 does not rewrite or supersede Build 304 evidence.

## Operator surfaces

- `/relationship-certification`;
- `/api/relationship-certification`.

The recorder deliberately defaults each dimension to BLOCKED so an operator must explicitly select PASS or FAIL and provide evidence.

## Authority boundary

Build 346:

- records certification evidence only;
- does not activate a connection;
- does not execute a replay;
- does not mutate a source application;
- does not write to a peer application;
- does not run an external probe;
- does not infer certification from deployment GREEN;
- does not infer production acceptance.

## Next queued build

**Build 347 — Master Security, Authorization, Consent & Evidence Certification.**
