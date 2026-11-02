# Build 268 — Workflow Orchestration, Runbook Templates & Guided Operations

## Purpose

Build 268 adds reusable governed runbooks that guide operators across existing application surfaces without bypassing any existing approval, authorization, evidence, source-policy, publication or delivery gate.

## Primary governed runbook

Collect → Review → Approve → Publish → Deliver

Each step reports measured readiness/evidence and links to the existing governed screen that owns the action.

## Reusable templates

- Governed data delivery
- Quality review to publication
- Integration recovery

Templates are guidance only. They do not execute cross-module mutations.

## Safety boundary

Build 268 does not:

- auto-run collection;
- auto-approve review batches;
- auto-publish approved data;
- auto-deliver downstream;
- bypass Source Policy or remote-execution controls;
- bypass owner/admin authority;
- bypass integration simulator, handshake, idempotency, acknowledgement or live-delivery controls.

Every action remains owned by its existing module and its existing confirmation/evidence gates.

## QL-266 boundary

The unrelated owner-deferred QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 268 does not resume QL-266.

## Next build

**Build 269 — Reporting Studio, KPI Dashboards & Evidence-Based Exports.**
