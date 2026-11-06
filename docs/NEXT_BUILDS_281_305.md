# AI Data Platform — Official Connectivity & Autonomous Operations Batch 281–305

Adopted after Build 280 production GREEN and the Production Learning V renewal checkpoint.

The batch goal is to make the AI Data Platform the shared connectivity, mapping, event, health and safe-automation layer for the Rosevear applications while keeping consequential writes behind explicit authorization and audit controls.

## Branch policy

Only `dev` and `main` are intended to remain long-lived branches.

## Integration boundary

QL-266 remains **UNDER_REVIEW**, external test status remains **REVIEW_DEFERRED**, and connection state remains **DISCONNECTED** until explicitly resumed.

The feature work below may improve catalogs, discovery, mapping, simulation, diagnostics and safe infrastructure without converting those improvements into live external authorization.

## Official queue

### Build 281 — Unified App Connection Registry & Capability Discovery
Create the authoritative peer-app registry and reusable read-only capability-discovery model.

### Build 282 — Shared Application Identity, Environment & Tenant Mapping
Give each app stable environment and tenant/workspace mappings so integrations do not depend on manually repeated names.

### Build 283 — Connector Setup Wizard & Guided Connection Assistant
Guide app selection, connection type, required configuration, safe test preparation and saved setup state.

### Build 284 — Connection Credential Vault & Rotation Readiness
Centralize credential references, expiry/rotation evidence and owner-controlled replacement without exposing secret values.

### Build 285 — Automatic Connection Testing & Configuration Validation
Validate URLs, authentication configuration, permissions, webhook destinations and required environment settings through bounded tests.

### Build 286 — Cross-App Data Contract Registry
Create reusable contracts for customers, products, services, bookings, jobs, staff, equipment, invoices, media, inventory and notifications.

### Build 287 — Visual Field Mapping Studio
Map fields between applications visually and persist reviewed mapping profiles.

### Build 288 — Schema Drift Detection & Mapping Repair Assistant
Detect schema/enum/API changes and identify affected mappings before delivery.

### Build 289 — Rosevear Shared Connector SDK 2.0
Standardize authentication, requests, pagination, retry, audit, health and error handling for all applications.

### Build 290 — Webhook Gateway & Event Intake Center
Provide validated, signed, replay-safe event intake with durable receipts.

### Build 291 — Cross-App Event Bus & Subscription Manager
Publish and subscribe to governed domain events without direct point-to-point wiring.

### Build 292 — Event Replay, Dead-Letter Queue & Recovery Console
Persist failed events and provide reviewed recovery/replay controls.

### Build 292A — CI Verification Consolidation & Promotion Run Reduction
Consolidate the accumulated historical verifier chains into reusable suites and a compact fail-closed promotion matrix, reducing repeated workflow runs while preserving security, migration, integration-boundary and production release checks.

Tracking issue: #587.

### Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees
Prevent duplicate cross-app writes and preserve exactly-once intent across retries.

### Build 294 — Shared Customer & Contact Identity Resolution
Match customers across authorized applications using evidence-backed rules and owner review.

### Build 295 — Shared Product, Service & Catalogue Exchange
Standardize catalogue exchange across maker, service and campground applications.

### Build 296 — Shared Media & Asset Exchange
Standardize references to photos, documents, receipts and generated media without unnecessary duplicate uploads.

### Build 297 — Cross-App Notification & Consent Service
Centralize consent-aware notification requests and delivery evidence, with Comms Hub as the preferred communications operator.

### Build 298 — Shared Tasks, Follow-Ups & Work Queue Exchange
Allow governed exceptions and follow-ups to create linked tasks across applications.

### Build 299 — Shared Scheduling, Appointments & Calendar Exchange
Prepare governed appointments, bookings, jobs, maintenance windows and calendar events across apps using held exchange packages and local-only overlap evidence.

Owner-selected scope override: the earlier **Cross-App Search & Linked Record Explorer** item is deferred to the next roadmap renewal after Build 305; it is not removed from the product backlog.

### Build 300 — Unified Integration Health Command Center
Show connection health, latency, failures, stale credentials, webhooks, queued events and degraded services in one dashboard.

### Build 301 — Self-Healing Connection Recovery & Safe Retry Automation
Automate bounded recovery for transient failures while preserving owner approval for consequential changes.

### Build 302 — Cross-App Workflow Automation Builder
Create reviewed rules connecting events to governed cross-app actions.

### Build 303 — AI-Assisted Integration Mapping & Workflow Suggestions
Suggest mappings and automation rules from schemas and evidence without activating them automatically.

### Build 304 — Six-App End-to-End Integration Certification Suite
Prove authentication, approved exchange, event handling, failure recovery and tenant isolation across the peer-app estate.

### Build 305 — Autonomous Operations V1, Owner Controls & Production Learning VI
Close the batch with controlled autonomous monitoring, safe recovery, owner controls and a fresh evidence-driven roadmap renewal.

## Guardrails

- Discovery and configuration do not equal connection authorization.
- Do not expose or persist raw secrets in browser-visible or repository evidence.
- Do not activate mutating capabilities automatically.
- Keep tenant/workspace isolation authoritative.
- Preserve idempotency, replay protection and append-only evidence.
- Do not resume QL-266 implicitly.
- Build 305 is the next mandatory roadmap-renewal checkpoint.
