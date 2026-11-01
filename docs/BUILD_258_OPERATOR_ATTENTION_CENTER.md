# Build 258 — Operator Attention Center, Exception Inbox & Follow-Up Queue

## Purpose

Build 258 promotes the existing Operator Home attention summary into a dedicated action-oriented inbox.

The Attention Center assembles unresolved measured conditions from existing authorized workflows and presents one prioritized follow-up queue. It does not create a second task database and it does not allow cosmetic acknowledgement to hide unresolved source evidence.

## Attention sources

Build 258 composes existing user-scoped application read models for:
- workspace permission and profile-governance findings from Operations Command;
- collection readiness blockers and latest failed / timed-out local and remote runs;
- connector manifest/version mismatches and the latest failed or blocked connector audit;
- Data Review batches still in review and eligible datasets whose review has not started;
- approved datasets still awaiting publication, with approvals classified as stale after 14 days;
- latest integration handshake rejection, delivery rejection or transport error per consumer/target;
- retention cleanup failures, storage-budget conditions and delete-eligible rows awaiting a cleanup decision;
- untriaged delivery reconciliation drift and proposed corrective plans;
- existing corrective invariant findings from Operations Command.

## Priority model

Items are sorted:
1. critical;
2. attention / operator decision;
3. informational follow-up.

Within the same priority, older measured conditions are shown first when a durable timestamp exists.

The queue is capped at 100 visible source-derived items to keep the operational surface bounded.

## Exception inbox filters

The authenticated `/attention` screen supports:
- category;
- priority;
- represented workspace;
- bounded text search.

Supported categories are governance, collection, connectors, data review, approvals, integrations, retention and corrective operations.

Build 257 Operator Workspaces can save the current Attention filter combination in browser-local storage.

## Follow-up semantics

The Attention Center is read-only.

An item disappears only after its underlying source condition changes in the governed workflow. The inbox cannot:
- mark source evidence resolved;
- dismiss a failure without changing the source condition;
- approve data;
- publish data;
- run collection;
- change connector grants;
- approve or execute retention cleanup;
- mutate corrective state;
- grant workspace access.

Every action link opens the existing source workflow where its normal authentication, role, confirmation, evidence and PostgreSQL RLS controls remain authoritative.

## Stale approvals

An approved dataset that has not been published is classified as a **stale approval** once the approval is at least **14 days old**.

This is an operating attention threshold only. It does not expire the approval or automatically publish or reject the dataset.

## QL-266

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 258 does not start any QL-266 external, authentication or connection test.

Source A:
`a1abb5ac19cfe507620d1f9b374dc7b94128b92c`

Verified Build 257 CI:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41252818880`

## Next roadmap item

**Build 259 — Data Quality Workbench, Validation Rules & Duplicate Detection.** Add quality scoring and review for missing fields, malformed values, duplicates, inconsistent formats, stale records, unexpected changes and normalization issues before Approved Data. QL-266 remains UNDER_REVIEW until explicitly resumed.
