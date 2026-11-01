# Build 260 — Provenance & Data Lineage Explorer

## Purpose

Build 260 adds one authenticated, read-only chain-of-custody view across the platform's existing governed evidence.

The explorer correlates source snapshots, extraction recipe identity, collection-run evidence, Data Review, approval, immutable Approved Data publications, publication mappings and delivery receipts. It does not create a second provenance database.

## Explorer

The authenticated `/provenance-lineage` screen provides:
- workspace, furthest-stage and evidence-text filters;
- Build 257 saved operator views;
- source URL, dataset ID, source version and source fingerprint;
- recorded extraction recipe name;
- matching collection source/run attempt evidence where a workspace + source URL match exists;
- Data Review row counts, included rows and deterministic transform counts;
- approval actor/time when available;
- publication ID, immutable publication fingerprint and publication time;
- downstream mapping/receipt evidence and package fingerprint;
- direct links back to the authoritative workflow for every stage.

## Evidence rules

A stage is marked complete only when the corresponding durable evidence already exists.

Missing collection/run evidence is shown as missing rather than inferred. Delivery is marked complete only when an accepted delivery receipt exists. A mapping by itself is not treated as proof of delivery.

## Authority boundary

Build 260 is read-only. It cannot:
- edit source snapshots;
- change extraction recipes;
- start or retry collection runs;
- alter reviewed rows;
- approve or reject a review;
- create or withdraw Approved Data;
- create a delivery mapping;
- send or resend a downstream package;
- manufacture receipts or fingerprints.

Existing PostgreSQL RLS and the existing user-scoped read models remain the authorization boundary.

## QL-266

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 260 does not start a new QL-266 test.

Source A is the Build 259 production commit:
`5fc2c36164761a0afb8d1bb34315f24a7d2c06be`

## Next roadmap item

**Build 261 — Bulk Review, Batch Decisions & Exception Routing.** Add safe multi-record selection, bulk approve/reject/hold actions, reason codes, exception queues and preview-before-commit while preserving immutable evidence.
