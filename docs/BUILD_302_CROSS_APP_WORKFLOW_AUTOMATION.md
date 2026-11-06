# Build 302 — Cross-App Workflow Automation Builder

## Purpose

Build 302 connects reviewed cross-app events to governed destination workflows without bypassing the destination module's own authorization, confirmation, evidence or delivery controls.

The automation model is:

**reviewed immutable rule → future matching event-bus publication → held action intent → governed destination workbench**

Build 302 deliberately does not execute the destination action itself.

## Event source

Rules evaluate durable Build 291 `app.event_bus_publications` records.

Rule matching is exact across:

- workspace;
- environment;
- optional source application;
- optional tenant;
- exact event type;
- publication time after the rule's approval time.

A source wildcard is allowed within a workspace, but the destination application must differ from the actual event source.

## Rule lifecycle

Rule definitions are immutable and append-only.

Owners/admins create draft rules and append review decisions:

- `approve`
- `reject`
- `disable`

Only a rule whose latest review is `approve` may match events.

A replacement rule may identify a predecessor with `supersedes_rule_id`. Once the replacement's latest review is approved, the predecessor is excluded from future evaluation.

Rule edits are represented by a new reviewed rule rather than UPDATE.

## Governed action kinds

Build 302 supports five destination intents:

- `prepare-shared-task` → Shared Tasks & Work Queue
- `prepare-notification` → Notification & Consent
- `prepare-schedule` → Shared Scheduling & Calendar
- `review-event-recovery` → Event Recovery
- `review-integration-recovery` → Integration Recovery

Each rule carries a small validated static action configuration.

Event bodies and credential values are never copied into action intent configuration.

## Held action intents

A successful match creates one durable action intent per rule/publication pair.

Database constraints fix every intent to:

- state: `held`
- hold reason: `workflow-action-not-authorized`

The intent records:

- rule and exact approved review;
- event publication;
- source and destination application;
- event ID and exact event type;
- action kind;
- bounded static action configuration;
- destination workbench route.

A unique `(rule_id, publication_id)` constraint makes evaluation idempotent.

## Event-bus integration

Build 291 publication now evaluates Build 302 rules in the same authenticated server path.

Publishing a receipt can therefore create:

1. the existing held event-bus routes; and
2. Build 302 held action intents for approved rules.

Neither path performs an outbound destination mutation.

The operator can also run **Evaluate recent publications** to recover any missed post-approval evaluation. Publications older than the rule approval time do not match, preventing retroactive automation surprises.

## Persistence

Migration `0104_cross_app_workflow_automation.sql` adds:

- `app.workflow_automation_rules`
- `app.workflow_automation_rule_reviews`
- `app.workflow_automation_action_intents`
- `app.workflow_automation_audit`

All four tables use RLS.

Runtime access is SELECT/INSERT only; UPDATE and DELETE are revoked.

## Operator surface

Authenticated route:

`/workflow-automation`

Operators can:

- create immutable draft rules;
- review/approve/reject/disable rules;
- create a reviewed replacement rule;
- evaluate recent post-approval publications;
- inspect held action intents;
- open the correct governed destination workbench.

## Safety boundary

Build 302 does not automatically:

- create the destination task/notification/schedule itself;
- release an event-bus route;
- replay a dead letter;
- mutate a credential;
- activate a connection;
- execute an export or write capability;
- modify trust or authorization;
- send an outbound network request;
- resume QL-266.

Every consequential destination action keeps its existing module-specific gate.

## Next queued build

**Build 303 — AI-Assisted Integration Mapping & Workflow Suggestions** — suggest mappings and automation rules from schemas and evidence without activating them automatically.
