# Build 261 — Bulk Review, Batch Decisions & Exception Routing

## Purpose

Build 261 adds safe multi-batch decisions on top of the existing Build 048 governed Data Review workflow.

## Controls

- selections are limited to one workspace and at most 50 review batches;
- only workspace owners/admins may preview or commit a bulk decision;
- every bulk operation requires an explicit reason code;
- every commit requires a preview token bound to the exact workspace, selection, decision, reason and note;
- terminal batches cannot be included;
- approval still requires at least one included row per batch;
- source snapshots and working-row evidence are never overwritten by the bulk workflow.

## Decisions

**Approve** and **Reject** use the existing terminal review states and append new audit events.

**Hold** does not invent a third terminal review state. It preserves the batch as `in-review`, creates a durable open exception, and appends a `held` review event.

## Exception queue

`workspace_data_review_exceptions` stores workspace-scoped open exception records with a reason code, note, actor and timestamp. PostgreSQL RLS continues to scope access to authorized workspace members.

## QL-266

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 261 does not restart external connection testing.

## Next roadmap item

**Build 262 — Unified Audit & Evidence Explorer.**
