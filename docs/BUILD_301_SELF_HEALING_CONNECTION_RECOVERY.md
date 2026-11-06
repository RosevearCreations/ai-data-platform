# Build 301 — Self-Healing Connection Recovery & Safe Retry Automation

## Purpose

Build 301 adds bounded recovery automation for transient integration failures while preserving explicit owner/admin control for consequential changes.

The implementation is intentionally split into two recovery lanes:

1. **Safe automatic lane** — connector health checks only, using the connector SDK v2 declared health endpoint and GET/HEAD semantics.
2. **Owner-controlled lane** — event replay, credential remediation, connection activation and other consequential changes remain approval-only.

## Safe automatic recovery

A failed connector audit can become eligible for safe recovery only when all of the following are true:

- the latest connector audit is failed;
- the connector transport is HTTP;
- the error is classified as transient;
- the recovery plan is still within its expiry window;
- the plan has remaining recovery attempts;
- the cooldown has elapsed;
- the current user is a workspace owner/admin.

Transient connector failures recognized by Build 301 are:

- `connector_request_timeout`
- `connector_request_failed`
- HTTP 408
- HTTP 429
- HTTP 5xx statuses

Safe recovery uses only the connector SDK health path, whose manifest is restricted to GET or HEAD.

## Bounded retry policy

Build 301 adds a second, higher-level recovery budget around the SDK's already-bounded per-request retry behavior:

- maximum recovery cycles per plan: **3**
- cooldown between recovery cycles: **300 seconds**
- safe recovery plan expiry: **24 hours**
- a successful health check closes the plan as recovered
- an exhausted plan cannot automatically continue

This prevents an endless retry loop even if the provider remains unavailable.

## Consequential recovery

The following are never auto-executed by Build 301:

- credential replacement, rotation or revocation;
- event-bus replay;
- release of held routes;
- connection activation;
- export or write capabilities;
- trust or authorization changes;
- QL-266 resumption.

Build 301 may create an owner-review recovery plan for these cases. An owner/admin can record approve/reject evidence, but the consequential action itself remains in its existing governed workbench and keeps its existing confirmation and evidence gates.

## Durable evidence

Migration `0103_self_healing_connection_recovery.sql` adds append-only evidence tables:

- `app.integration_recovery_plans`
- `app.integration_recovery_attempts`
- `app.integration_recovery_decisions`
- `app.integration_recovery_audit`

All four tables use RLS and runtime SELECT/INSERT-only access. UPDATE and DELETE are revoked.

Recovery plans use deterministic source fingerprints so repeated scans do not create duplicate plans for the same evidence source.

## Operator workflow

Authenticated route:

`/integration-recovery`

Operators can:

- scan current integration evidence for recovery candidates;
- run a bounded batch of eligible safe connector health retries;
- run one eligible health retry;
- review recovery attempts;
- approve/reject consequential recovery recommendations;
- see non-retryable findings.

## Safety boundary

Build 301 does not make a general external request scheduler.

The only automated external operation introduced is the connector SDK v2 health check path, which is manifest-constrained to GET/HEAD, uses declared allowed origins, existing secret references, bounded timeouts and bounded retry policy.

Secret values are never written into recovery evidence.

## Next queued build

**Build 302 — Cross-App Workflow Automation Builder** — create reviewed rules connecting events to governed cross-app actions.
