# Build 318 — Workflow Action Plug-In Interface

## Purpose

Build 318 exposes the existing Build 302 governed workflow action intents as a reusable host plug-in interface.

It does not create a second automation engine. Build 302 remains the source of reviewed rules and held action intents. Build 318 packages that existing boundary so any supported host can understand the action capability, validate its input, record a decision, receive an idempotent handoff and return a callback receipt.

## Action capability descriptors

`createWorkflowActionCapabilityDescriptors()` publishes one descriptor for every current Build 302 action kind:

- prepare shared task;
- prepare notification;
- prepare schedule item;
- review event recovery;
- review integration recovery.

Each descriptor identifies the destination workbench and a strict typed input schema.

## Typed input schemas

The plug-in uses explicit field allowlists with `additionalProperties: false`.

Current inputs use bounded strings and exact enumerations where applicable. Unknown fields, missing required fields, invalid enum values and malformed input fail closed.

Build 302's own `normalizeWorkflowAutomationConfig()` remains authoritative before an action config is admitted to the plug-in.

## Held action intents

`createHeldWorkflowActionPluginIntent()` accepts only a Build 302 intent with:

- `state = held`;
- `holdReason = workflow-action-not-authorized`;
- matching action kind, destination and destination workbench.

A rule match therefore still does **not** execute an action.

## Owner/reviewer decisions

`recordWorkflowActionDecision()` records an immutable approve/reject decision by an owner, admin or reviewer.

Approval changes plug-in eligibility only to `approved-for-handoff`. Approval itself does not execute the action.

Rejection creates durable rejection evidence in the decision record and blocks handoff.

## Idempotent execution handoff

`createWorkflowActionExecutionHandoff()` requires:

1. the exact held Build 302 intent;
2. an approving decision for that same intent/capability/workspace;
3. a separate `workflow-actions.handoff` host grant bound to the active host, platform tenant and workspace;
4. a current, non-expired and non-review-due authorization.

The handoff idempotency key is a deterministic SHA-256 fingerprint over the intent, decision, capability, destination and typed input fingerprint.

Repeated preparation of the same logical handoff therefore produces the same idempotency key.

The plug-in still performs no external action.

## Host callback receipts

`createWorkflowActionCallbackReceipt()` accepts only a callback carrying the exact handoff idempotency key.

Supported outcomes are:

- `accepted` with a host receipt ID;
- `rejected` with a rejection reason;
- `error` with an error code and message.

Each callback creates a deterministic evidence fingerprint.

An accepted callback proves that the host acknowledged the handoff. It does **not** by itself prove an external side effect or bypass the destination application's own authorization/evidence gates.

## Rejection and error evidence

Rejected owner/reviewer decisions never produce a handoff.

Rejected host callbacks preserve the supplied rejection reason. Error callbacks preserve a bounded error code and message. Retries must reuse the exact handoff idempotency key.

## Operator usability

The existing `/workflow-automation` workbench remains the operator home for rules and held intents.

Build 318 adds plain-language plug-in guidance there and exposes the read-only capability descriptor at:

`GET /api/module-workflow-actions`

## Security boundary

Build 318 does not:

- execute an action when a rule matches;
- execute an action when a reviewer approves;
- infer host authorization from approval;
- accept extra input fields outside the typed schema;
- create a handoff from a rejected decision;
- accept callbacks with a different idempotency key;
- claim that a callback proves an external side effect;
- release any destination application's existing governance gates.

## Next queued build

**Build 319 — Shared Notification, Task, Follow-Up & Scheduling Module APIs** remains the next regular product roadmap item.
