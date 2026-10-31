# AI Data Platform — Official Next Build Batch 254–272

Adopted after Build 253 production GREEN.

This is the current finite feature/enhancement batch for the AI Data Platform. The queue is intended to improve overall usability, reliability, data quality, observability and operator productivity rather than continue repeating recovery-preset permutations indefinitely.

## Branch policy

Only `dev` and `main` are intended to remain as long-lived repository branches. Historical build/fix branches are no longer part of the supported workflow.

## Integration boundary

QL-266 remains **UNDER_REVIEW**, external test status remains **REVIEW_DEFERRED**, and connection state remains **DISCONNECTED** until the owner explicitly resumes it. The feature roadmap below does not implicitly reactivate QL-266.

## Official queue

### Build 254 — Recovery Search, Renewal Audit & Receipt Presets + Operations Risk Review
Continue the existing recovery verification while converting Operations Command through reusable risk summaries, drill-through bands, responsive evidence lanes and inspector resolution cards.

### Build 255 — Operations Command Consolidation, Screen Cleanup & Component Standardization
Consolidate accumulated Operations Command surfaces, remove duplicated status blocks, reduce unnecessary screen length, standardize tables/cards/inspectors, and make Front End, I.T., Management, Statistical and System Status feel like one coherent application.

### Build 256 — Unified Cross-Module Search, Results Explorer & Context Navigation
Expand platform search across Data Library, Approved Data, collection runs, projects, recipes, intelligence, integrations, evidence, workspaces and help while preserving workspace authorization.

### Build 257 — Shared Saved Views, Filter Profiles & Operator Workspaces
Allow saved combinations of filters, sort order, search, visible columns, date ranges and workspace context that can be reopened from Operations Command.

### Build 258 — Operator Attention Center, Exception Inbox & Follow-Up Queue
Create one action-oriented surface for failed runs, configuration gaps, integration exceptions, pending reviews, stale approvals, connector problems, retention decisions and other items requiring follow-up.

### Build 259 — Data Quality Workbench, Validation Rules & Duplicate Detection
Add quality scoring and review for missing fields, malformed values, duplicates, inconsistent formats, stale records, unexpected changes and normalization issues before Approved Data.

### Build 260 — Provenance & Data Lineage Explorer
Trace records from source through capture, recipe, collection run, review, approval and integration delivery with timestamps, revisions, transformations, approvals and delivery receipts.

### Build 261 — Bulk Review, Batch Decisions & Exception Routing
Add safe multi-record selection, bulk approve/reject/hold actions, reason codes, exception queues and preview-before-commit while preserving immutable evidence.

### Build 262 — Unified Audit & Evidence Explorer
Provide a single searchable interface over append-only evidence with filters for workspace, user, module, operation, result, date, source, consumer, collection run and record.

### Build 263 — System Health, Observability & Reliability Dashboard
Combine application/database health, APIs, integration delivery, connectors, remote execution, collection failures, queues and recent exceptions using measured evidence.

### Build 264 — Connector Diagnostics, Configuration Validation & Recovery Assistant
Add connection tests, configuration completeness checks, credential-age indicators without secret exposure, permission diagnostics, endpoint validation, failure explanations and guided recovery.

### Build 265 — Integration Delivery Simulator & Contract Compatibility Center
Preview package shape, schema version, operations, target capabilities, validation outcomes, dry-run result and expected acknowledgement before delivery.

### Build 266 — Security, Workspace Access & Least-Privilege Review
Review membership, effective permissions, capability inheritance, stale access, connector grants and privileged operations. Recommendations remain advisory until explicitly approved. This build number is separate from QL-266.

### Build 267 — Retention, Archive & Storage Governance Center
Expand retention into controlled archive governance with data age, retention rules, archive candidates, protected evidence, delete eligibility and impact preview.

### Build 268 — Workflow Orchestration, Runbook Templates & Guided Operations
Create reusable governed runbooks such as Collect → Review → Approve → Deliver while retaining every existing approval and safety gate.

### Build 269 — Reporting Studio, KPI Dashboards & Evidence-Based Exports
Add configurable reporting for collection success, approval throughput, exception rates, integration outcomes, data quality, workspace activity, adoption, retention and provider usage.

### Build 270 — Capacity, Cost & Usage Planning
Turn Production Learning cost proxies into storage, record-volume, provider-unit, collection-frequency, integration-volume and retention forecasts while clearly separating estimates from actual billing.

### Build 271 — Accessibility, Mobile, Performance & Failure-Recovery Hardening
Run an application-wide audit of keyboard navigation, focus order, screen-reader semantics, reduced motion, forced colors, narrow layouts, loading/empty/error states, retry behavior, page weight and query performance.

### Build 272 — Owner Acceptance, Legacy Cleanup & Production Learning IV
Close the roadmap cycle by removing obsolete build-era UI, duplicate components, dead code, temporary test material and unnecessary compatibility scaffolding, then run a fresh evidence-driven Production Learning review before defining Builds 273+.

## Roadmap rule

Build 272 is the renewal checkpoint. No long speculative Build 273+ queue should be created automatically; the next batch should be based on real operational evidence, owner acceptance findings and measured gaps.
