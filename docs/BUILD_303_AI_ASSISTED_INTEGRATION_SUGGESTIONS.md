# Build 303 — AI-Assisted Integration Mapping & Workflow Suggestions

## Purpose

Build 303 adds a read-only advisory layer over the existing integration evidence.

It uses:

- Build 286 canonical shared-data contracts;
- Build 287 field-mapping profiles;
- Build 288 source-schema descriptors;
- Build 291 durable event publications;
- Build 302 workflow automation rule metadata.

The result is a bounded set of mapping and workflow suggestions that an operator may review in the existing governed workbenches.

Build 303 does not persist, approve or activate any suggestion.

## Deterministic candidate generation

Field-mapping candidates are generated only when:

- a mapping profile has stored source-schema descriptors;
- the canonical target is currently unmapped;
- the source path is not already used by the profile;
- source and target types are compatible with an existing Build 287 transform;
- field-name or approved semantic-alias evidence meets the bounded similarity threshold.

Each candidate records:

- workspace;
- mapping profile;
- source application;
- contract;
- source path and type;
- canonical target and type;
- suggested existing transform;
- required/optional target state;
- deterministic confidence;
- evidence basis.

Workflow-rule candidates are generated only from durable Build 291 publication metadata observed during the bounded 90-day evidence window.

The engine uses:

- source application;
- environment;
- tenant scope presence;
- exact event type;
- observed count;
- last-observed time.

It never reads event bodies.

Candidate workflow actions are restricted to the existing Build 302 enum:

- `prepare-shared-task`;
- `prepare-notification`;
- `prepare-schedule`;
- `review-event-recovery`;
- `review-integration-recovery`.

Candidates already covered by an existing Build 302 rule are suppressed.

## Optional AI ranking

The operator may explicitly choose **Ask AI to rank authorized suggestions**.

The server rebuilds the authorized candidate set from RLS-scoped evidence. The browser does not supply candidate definitions.

Only a bounded, sanitized candidate description is sent to the configured Vercel AI Gateway:

- candidate ID;
- application IDs;
- schema/contract metadata;
- source/target field names and types;
- exact event type;
- event count and timestamp;
- action kind;
- deterministic confidence and basis.

The request never sends:

- event bodies;
- customer/source field values;
- credential values;
- secret references;
- cookies;
- arbitrary database rows.

The JSON schema dynamically restricts `candidateId` to the exact server-built candidate IDs.

AI output is sanitized again after receipt. Unknown or duplicated IDs are rejected.

If the gateway is unavailable, unconfigured or returns unusable structured output, Build 303 falls back to deterministic ranking.

## Read-only boundary

Build 303 has no database migration and no write path.

It does not:

- save or edit field mappings;
- create mapping repair sessions;
- create workflow rules;
- approve workflow rules;
- release held action intents;
- publish event-bus receipts;
- replay dead letters;
- change credentials;
- activate connections;
- execute exports/writes;
- mutate trust/authorization;
- resume QL-266.

Operators use:

- `/field-mappings` for reviewed mapping changes;
- `/workflow-automation` for immutable draft-rule creation and explicit approval.

## Operator route

`/integration-suggestions`

The page includes:

- deterministic mapping suggestions;
- deterministic workflow suggestions;
- workspace/type filtering;
- optional bounded AI ranking;
- evidence explanations;
- direct links to the existing governed workbenches.

## Persistence

None.

Build 303 intentionally reuses existing evidence and adds no new table, migration, credential or activation state.

## Next queued build

**Build 304 — Six-App End-to-End Integration Certification Suite** — prove authentication, approved exchange, event handling, failure recovery and tenant isolation across the peer-app estate.
