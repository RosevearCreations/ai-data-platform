# Build 304 — Six-App End-to-End Integration Certification Suite

## Purpose

Build 304 adds a repeatable, append-only certification suite across the six registered Rosevear peer applications:

- Devil n Dove;
- Rosie Dazzlers;
- Yard Workers;
- iCamp;
- Rosevear Comms Hub;
- Rosevear AI Hub.

Each application receives exactly five evidence checks:

1. authentication;
2. approved exchange;
3. event handling;
4. failure recovery;
5. tenant isolation.

The complete matrix is therefore **6 applications × 5 dimensions = 30 assertions**.

## Evidence rules

Build 304 never treats missing evidence as success.

Each assertion is one of:

- **PASS** — positive evidence proves the required behavior;
- **FAIL** — contradictory evidence proves a certification invariant was violated;
- **BLOCKED** — the required evidence has not been observed in the certification window.

The evidence window is 30 days.

## Authentication

PASS requires an accepted request with verified application identity from either:

- Build 290 signed webhook intake; or
- the existing Integration v1 request-audit evidence for applications that have a registered gateway business identity.

Examples of contradictory evidence that fail closed:

- an accepted request marked as identity-unverified.

Authentication denials are retained as supporting evidence but do not create a PASS by themselves.

## Approved exchange

PASS requires a Build 302 action intent created from an explicitly approved workflow rule.

The intent must still be:

- `state='held'`;
- `hold_reason='workflow-action-not-authorized'`.

This proves that reviewed event-to-action policy reached the governed exchange boundary without bypassing the destination action gate.

Build 304 does not release the intent.

## Event handling

PASS requires a Build 291 event publication joined to the authenticated Build 290 webhook receipt that created it.

The following must match:

- source application;
- event ID;
- body SHA-256;
- tenant ID.

A mismatch is FAIL, not a warning.

Event bodies are not copied into certification evidence.

## Failure recovery

PASS requires at least one of:

- a Build 292 replay route retained in the required `held / recovery-replay-not-authorized` state; or
- a successful Build 301 bounded safe recovery attempt for an evidence-mapped workspace.

A replay route outside its required hold is FAIL.

The certification suite does not execute a replay or consequential recovery action.

## Tenant isolation

Every registered application must retain a unique canonical tenant key.

Runtime PASS additionally requires both:

- at least one accepted request/receipt whose tenant matches the configured tenant boundary; and
- at least one explicit wrong-tenant denial:
  - `webhook_tenant_mismatch`; or
  - `cross_tenant_denied`.

An accepted tenant mismatch is an immediate FAIL.

A unique canonical tenant key alone is not enough for runtime PASS; missing positive/negative runtime evidence remains BLOCKED.

## Persistence

Migration:

`0105_six_app_integration_certification.sql`

Tables:

- `app.integration_certification_runs`;
- `app.integration_certification_assertions`.

Both are append-only to the runtime role.

The stored evidence contains:

- outcome;
- bounded detail;
- evidence codes;
- source evidence IDs.

It does not persist:

- event bodies;
- customer/source record values;
- credential values;
- raw secrets;
- peer application payloads.

Certification records are visible only to the user that generated the run. Creating a run requires that the user hold owner/admin authority in at least one accessible workspace.

## Operator route

`/integration-certification`

The screen provides:

- latest PASS / FAIL / BLOCKED totals;
- six application cards;
- five certification dimensions per app;
- evidence IDs;
- certification history;
- explicit links back to the underlying connection, event, recovery and workflow workbenches.

## Safety boundary

Build 304 does not:

- create or rotate credentials;
- enable a connector;
- activate a connection;
- create a new tenant/workspace;
- release held event routes;
- release Build 302 action intents;
- execute event replay;
- write to a peer application;
- infer remote availability;
- invent authentication/trust evidence;
- resume QL-266.

A successful software release of Build 304 does not imply that all six applications are already runtime-certified. The suite reports the real evidence state.

## Next queued build

**Build 305 — Autonomous Operations V1, Owner Controls & Production Learning VI** — close the batch with controlled autonomous monitoring, safe recovery, owner controls and a fresh evidence-driven roadmap renewal.
