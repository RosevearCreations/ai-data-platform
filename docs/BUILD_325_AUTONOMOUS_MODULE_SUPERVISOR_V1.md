# Build 325 — Autonomous Module Supervisor V1

## Purpose

Build 325 extends Build 305 into a reusable **per-host autonomous supervisor** for the AI Data Platform module.

The supervisor can monitor host/module evidence, refresh certification through a validated adapter, identify bounded recovery opportunities, run only explicitly authorized safe connector-health checks, detect stale configuration evidence and create owner-review work items.

It does not create a new connection authority or a broader automation lane.

## Per-host scope

Every supervisor cycle is bound to:

- host application ID;
- host instance ID;
- environment;
- workspace ID;
- tenant ID.

Recovery and certification evidence must match the exact scope.

There is no cross-host, cross-workspace or cross-tenant fallback.

## Health monitoring

The supervisor accepts bounded health observations for:

- module runtime;
- Build 323 transport;
- Build 324 offline queue;
- connectors;
- certification.

Each observation carries an evidence ID, status, observation time and maximum acceptable age.

Unhealthy, degraded, unknown or stale evidence becomes an owner-review work item.

Health evidence never grants authorization.

## Certification refresh

A host may provide a `ModuleSupervisorCertificationRefresher`.

When refresh is requested, the supervisor invokes that adapter and then validates the returned evidence against the exact host scope.

Certification evidence older than 15 minutes or not in PASS state creates an owner-review work item.

Certification refresh is evidence work only. It does not activate a connection or grant a capability.

## Safe recovery scan

Recovery opportunities are evaluated fail-closed.

Automatic execution is eligible only when all of the following are true:

- exact host application match;
- exact host instance match;
- exact workspace/tenant/environment match;
- action is `connector-health-retry`;
- method is `GET` or `HEAD`;
- plan is `ready`;
- the existing recovery plan declares `autoExecutionAllowed=true`;
- the plan is not expired.

Event replay, credential remediation and broader connector remediation never execute automatically.

If host scope cannot be proven, the opportunity is held for owner review.

## Explicit safe-health grant

A safe-health execution requires a separate `rosevear.ai-data-platform.module-supervisor-safe-health-grant.v1`.

The grant binds:

- exact host scope;
- `connector-health-retry`;
- allowed GET/HEAD methods;
- issue/expiry time;
- owner-policy evidence ID.

The grant explicitly does not authorize consequential peer mutation.

An expired, mismatched or missing grant leaves the recovery as an owner-review work item.

## Execution cap

Build 325 uses a fixed hard ceiling of **three safe health actions per supervisor cycle**.

This is not the future per-host autonomy budget system.

Build 326 remains responsible for configurable per-host enable/disable, kill switches, allowlists, cycle/rate budgets, recovery budgets and maintenance windows.

Build 325 intentionally does not invent those controls early.

## Executor boundary

A safe-health executor result is accepted only when it proves:

- exact plan and GET/HEAD method;
- connection activation: false;
- peer mutation: false;
- credential mutation: false;
- event replay: false.

A boundary violation is rejected and converted into owner-review work.

## Stale configuration detection

The supervisor evaluates reference-only freshness evidence for:

- tenant/workspace mappings;
- credential references;
- host/module configuration.

Statuses other than current, or expired evidence, become owner-review work items.

The supervisor does not rotate credentials, rewrite mappings or change host configuration.

## Owner-review work items

Work items are deterministic, host-scoped and non-authorizing.

They may represent:

- unhealthy/stale health evidence;
- failed/blocked/stale certification;
- stale mappings;
- stale/expired/revoked credential references;
- stale configuration;
- unsafe or host-unproven recovery opportunities;
- safe health work lacking an exact grant;
- safe health execution failures.

A host may provide a `ModuleSupervisorWorkItemSink` to persist these work items in its own governed task system.

Creating a work item does not authorize the underlying action.

## Migration boundary

Build 325 is migration-free.

It composes existing Build 301/304/305 evidence and the module contracts from Builds 306–324. It does not create a duplicate supervisor policy database or host-installation registry.

Build 327 remains responsible for formal host enrollment/inventory.

## Security boundary

Build 325 does not automatically:

- activate a connection;
- perform event replay;
- mutate or rotate credentials;
- release workflow actions;
- change trust;
- write to a peer application;
- infer host scope when identity is incomplete;
- convert a work item into authorization;
- create hidden per-host policy controls ahead of Build 326.

The only executable autonomous action is the existing bounded connector-health GET/HEAD lane under an exact unexpired safe-health grant.

## Next queued build

**Build 326 — Per-Host Owner Policies, Kill Switches & Autonomy Budgets** remains the next regular product roadmap item.
