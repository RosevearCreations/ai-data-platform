# Build 026 — Remote Execution Provider Abstraction & Cloud Worker Readiness

## Scope

Build 026 prepares safe cloud-worker orchestration without enabling unattended production crawling.

## Runtime contract

- Provider-neutral RemoteExecutionProvider interface.
- Durable workspace-scoped jobs in prepared, queued, leased, running and terminal states.
- 30–300 second worker leases with heartbeat ownership.
- Durable cancellation requests and lease/runtime timeout closure.
- Exact Build 025 policy ID/revision/fingerprint plus evidence copied into each job.
- Page, record, runtime and minimum-delay budgets that cannot weaken source policy.
- Append-only result evidence with canonical fingerprint and idempotency key.
- Provider configuration represented only by enc-config://remote-execution/... references.

## Production gate

REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED is disabled unless exactly true. Build 026 does not select a live provider and does not add provider credentials. Build 027 owns provider selection, encrypted credential wiring, egress/proxy policy, spend/concurrency controls and the live pilot.

## CI worker

The mock provider is deterministic and performs no network requests. It exists solely to prove lifecycle and result behavior.

## Persistence

Migration db/migrations/0007_remote_execution_foundation.sql creates app.remote_execution_jobs and app.remote_execution_results. Both are workspace-RLS protected. Results have SELECT/INSERT only for the runtime role.

## Acceptance

The normal repository Verify gate must pass pure remote-execution tests and PostgreSQL lifecycle/isolation tests before protected dev -> main promotion.
