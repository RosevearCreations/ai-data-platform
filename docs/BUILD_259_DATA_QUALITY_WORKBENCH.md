# Build 259 — Data Quality Workbench, Validation Rules & Duplicate Detection

## Purpose

Build 259 adds a deterministic quality review layer between durable reviewed-dataset source snapshots and Approved Data.

It reuses the existing workspace-scoped reviewed datasets and Data Review batches rather than copying governed rows into a new quality database.

## Data Quality Workbench

The authenticated `/data-quality` screen provides:
- 0–100 deterministic quality scores;
- Healthy / Review / Poor prioritization;
- workspace, quality-state and text filters;
- saved filter profiles through Build 257 Operator Workspaces;
- current source-snapshot assessments;
- durable Data Review batch assessments;
- exact duplicate-group details;
- direct handoff back into Data Review.

Quality work does not edit data directly.

## Validation rules

Build 259 formalizes seven rule families:

1. **Missing fields** — null, undefined and blank-string values.
2. **Malformed values** — conservative keyed checks for email, HTTP(S) URL, phone, date/year and numeric-looking fields.
3. **Duplicate rows** — canonical equality of cleaned-row content.
4. **Inconsistent formats** — mixed primitive types plus keyed date/phone representation differences within one field.
5. **Stale records** — source snapshots at least 30 days old or open review batches unchanged for at least 14 days.
6. **Unexpected source changes** — a newer server version or changed source fingerprint after a reviewed snapshot.
7. **Normalization issues** — deterministic whitespace/cleaned-row differences that remain visible before approval.

These checks are intentionally conservative. A finding is a review prompt, not an assertion that the source fact is wrong.

## Quality scoring

The score begins at 100 and applies bounded proportional penalties for:
- missing values;
- malformed values;
- exact duplicate rows;
- normalization rows;
- inconsistent fields;
- stale evidence;
- unexpected source changes.

Score bands:
- **Healthy:** 90–100
- **Review:** 70–89
- **Poor:** below 70

No AI inference is used in the quality score.

## Duplicate detection

Duplicate detection canonicalizes object key order and compares cleaned-row content.

Exact duplicate groups are displayed with their row identifiers. Build 259 does not delete rows or automatically exclude them. Existing Data Review remains the governed place where an operator can exclude a duplicate while retaining original evidence.

## Pre-approval boundary

Build 259 is advisory and read-only.

It cannot:
- overwrite `workspace_reviewed_datasets`;
- silently normalize source records;
- auto-exclude duplicates;
- approve or reject review batches;
- publish Approved Data;
- alter historical review decisions.

Operators return to Data Review for row-level corrections, exclusions and terminal owner/admin decisions.

All data reads remain user-scoped and PostgreSQL RLS-protected.

## Existing Build 048 compatibility

Build 048 already stored:
- immutable original evidence;
- a deterministic cleaned working copy;
- blank-field indicators;
- normalization change counts;
- exact cleaned-row duplicate hints;
- durable review decisions.

Build 259 promotes those signals into a cross-dataset quality view and adds malformed-value checks, format consistency, staleness, source-version/fingerprint drift, scoring and duplicate grouping without replacing the Build 048 review contract.

## QL-266

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 259 does not start any QL-266 external, authentication or connection test.

Source A:
`5a1fcd4dd9619f13b6de6ac553f35c652cd5957b`

Verified Build 258 CI:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41305884116`

## Next roadmap item

**Build 260 — Provenance & Data Lineage Explorer.** Trace source → capture → extraction recipe → collection run → review → approval → integration delivery with timestamps, revisions, transforms, approvals and delivery receipts. QL-266 remains UNDER_REVIEW until explicitly resumed.
