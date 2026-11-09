# Build 342 — Comms Hub Complementary Plane Integration & Incident/Follow-Up Read Models

## Purpose

Build 342 implements the AI Data Platform side of Stage D in the Rosevear Suite Master Shell plan.

Rosevear Comms Hub remains the complementary communications/control plane. It is **not** added as a seventh application or seventh Master Shell source.

AI Data Platform may display only read-only Comms evidence projections. Message delivery, incident ownership, acknowledgements, routing, operator assignment and follow-up task authority remain inside Rosevear Comms Hub.

## Source baseline

Build 342 is grounded in the current Comms Hub production baseline:

- repository: `RosevearCreations/rosevear-comms-hub`;
- source revision: `fa65f23d17b21c1764f6ba416a3433ff466f3882`;
- release: **QL-392 — Operator Incident Review Filters, Source Impact Summaries & Freshness-Aware Follow-Up Priorities**;
- QL-392 mode: `INERT_PREVIEW`.

QL-392 is production software, but its current incident examples are explicitly synthetic. It does not prove a live incident receiver, durable incident ledger, live source connection, operator task queue or authorized message route.

Build 342 therefore shows `PREVIEW_ONLY` when no independently verified Comms projection exists. It does not translate missing projection evidence into a zero incident/follow-up count.

## Read-model contract

Build 342 defines the AI Data Platform compatibility contract:

`rosevear.comms.master-shell-read-model.v1`

An accepted projection must:

- identify `rosevear-comms-hub` as its source;
- declare `AUTHORIZED_READ_MODEL`;
- be independently verified;
- carry a bounded source revision;
- carry exact observation and expiry timestamps;
- carry a source evidence URI;
- contain at most 50 opaque correlation groups;
- contain exactly six source-impact rows using the existing six Master Shell source IDs;
- preserve evidence freshness and deterministic priority labels;
- contain no customer/tenant record identity, message body or destination authorization.

The accepted priority vocabulary is:

- `REVIEW_NOW`;
- `VERIFY_EVIDENCE`;
- `MONITOR_ONLY`.

Follow-up rows in AI Data Platform are **suggestions only**. They never create tasks, send notifications, acknowledge incidents or change routes.

## Projection evidence persistence

Migration `0122_comms_complementary_plane_projection.sql` adds:

`app.comms_plane_projection_evidence`.

The table is:

- append-only from the AI Data application perspective;
- RLS-protected;
- readable only by active Master Sysop owner/operator sessions;
- restricted to independently verified Comms projections;
- restricted to `AUTHORIZED_READ_MODEL`;
- bounded to a maximum 30-minute evidence window.

The normal web runtime receives **SELECT only**. It receives no INSERT, UPDATE or DELETE permission.

This means the web UI/API cannot manufacture a verified Comms projection. A separately governed independent ingestion process must record accepted evidence.

## Integrity and freshness

Stored projection JSON carries a SHA-256 digest.

The application recomputes a canonical SHA-256 before displaying the row. A mismatch becomes `HOLD_INVALID`.

Projection states are:

- `PREVIEW_ONLY` — QL-392 software exists, but no accepted projection exists;
- `AUTHORIZED_READ_ONLY` — a fresh independently verified projection is available;
- `STALE` — the last accepted projection has expired;
- `HOLD_INVALID` — recorded projection evidence fails contract or integrity checks.

Expired evidence remains visible as stale evidence. It is not silently discarded, and stale counts are not presented as current counts.

## Incident read model

An authorized projection may expose:

- opaque correlation ID;
- source IDs from the fixed six-source registry;
- latest event time;
- timeline-entry count;
- evidence freshness;
- deterministic review priority;
- fixed-language review guidance.

The correlation ID does not imply common customer identity, common tenant, incident ownership or authorization to route between applications.

## Follow-up read model

Build 342 derives follow-up suggestions from accepted read-only groups.

Every suggestion explicitly records:

- `SUGGESTION_ONLY`;
- task created: false;
- notification sent: false;
- acknowledgement recorded: false;
- route changed: false.

This is evidence-aware guidance only.

## Master Command Center integration

Build 342 extends the existing Master Command Center with a separate Comms view.

The six application/source denominator remains exactly six.

Comms contributes:

- 0 applications;
- 0 Master Shell sources.

When no authorized projection exists, Comms appears in the attention queue as unmeasured/preview rather than as healthy or zero-incidents.

A stale projection remains an unmeasured attention item. An invalid projection becomes critical/held. A fresh projection with evidence concerns adds a Comms attention item without creating work in Comms Hub.

## Surfaces

- `/comms-complementary-plane`;
- `/api/comms-complementary-plane`;
- `/master-shell-command-center#comms`.

The API is authenticated and GET-only.

## Security boundaries

Build 342 does not:

- create a seventh application/source;
- ingest QL-392 synthetic examples as real incidents;
- claim a live Comms receiver;
- infer zero incidents from missing evidence;
- infer zero follow-ups from missing evidence;
- send or acknowledge messages;
- create or assign operator work;
- create follow-up tasks;
- change Comms routing;
- close incidents;
- grant tenant access;
- change six-source connection state;
- write to Comms Hub;
- expose message bodies, phone numbers, email addresses or customer records.

## Next queued build

**Build 343 — Cross-Application Interaction Trace, Dependency Graph & Failure Propagation.**
