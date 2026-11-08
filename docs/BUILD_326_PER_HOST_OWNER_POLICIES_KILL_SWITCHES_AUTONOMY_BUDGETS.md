# Build 326 — Per-Host Owner Policies, Kill Switches & Autonomy Budgets

## Purpose

Build 326 gives every explicitly identified host installation its own owner-controlled autonomy policy while preserving Build 325's narrow safe-health boundary.

It adds:

- per-host enable/disable;
- per-host kill switch;
- safe-action allowlist;
- hourly cycle budgets;
- per-cycle, hourly and daily safe-health budgets;
- UTC maintenance windows;
- policy versioning;
- append-only policy audit history;
- conservative budget reservations;
- owner-wide emergency global stop.

Global and per-host controls fail closed.

## Exact host scope

Each policy is bound to the exact:

- host application ID;
- host instance ID;
- environment;
- workspace ID;
- tenant ID.

There is no fallback from one host, workspace, tenant or environment to another.

Build 327 remains responsible for guided host enrollment. Build 326 stores policy only for an exact host identity explicitly supplied by an authorized owner/admin.

## Emergency global stop

The owner-wide global control overrides every per-host policy.

If no durable global-control row exists, the effective state is:

`emergencyStopEngaged = true`

This means missing configuration fails closed.

Releasing the global stop is an explicit authenticated owner/admin operation and creates append-only audit evidence.

## Per-host defaults

A newly saved host policy can be configured by the owner, but the persistence defaults are intentionally safe:

- enabled: false;
- host kill switch: engaged;
- safe-action allowlist: empty;
- safe-health budgets: zero.

Saving a policy does not authorize a supervisor cycle.

## Safe-action allowlist

Build 326 currently allows only:

`connector-health-retry`

The underlying Build 325 execution boundary remains:

- GET or HEAD only;
- exact host scope;
- no connection activation;
- no peer mutation;
- no credential mutation;
- no event replay.

Build 326 does not add any new automatic mutating action.

## Cycle and recovery budgets

Each host policy defines:

- cycles per hour: 1–12;
- safe-health actions per cycle: 0–3;
- safe-health actions per hour: 0–20;
- safe-health actions per day: 0–50.

Before authorization, the database locks the exact host policy, reads current reservation totals and evaluates the policy.

When a cycle is authorized, the service creates an append-only reservation.

When safe health is authorized, the reservation conservatively consumes the maximum actions granted to that cycle.

This prevents concurrent supervisors from spending the same remaining budget.

## Maintenance windows

A policy may define a UTC maintenance window with:

- allowed UTC days of week;
- start minute;
- end minute.

Overnight windows are supported.

A null maintenance window means no time restriction only after an explicit host policy has been saved. A missing host policy still blocks every cycle.

## Authorization precedence

Build 326 evaluates controls in this order:

1. global emergency stop;
2. exact host policy present;
3. host enabled;
4. host kill switch;
5. maintenance window;
6. cycle budget;
7. safe-action allowlist;
8. recovery budgets.

A later control can narrow authority but never override an earlier block.

## Short-lived safe-health grant

An authorized safe-health cycle receives a short-lived Build 325 grant.

The grant carries:

- exact host scope;
- GET/HEAD methods;
- policy evidence reference;
- issue and expiry timestamps;
- a maximum action count no greater than the remaining Build 326 budget and never greater than Build 325's hard cap of three.

The grant can only lower Build 325's execution ceiling.

## Durable evidence

Migration:

`0109_module_supervisor_host_policies.sql`

Mutable tables:

- `app.module_supervisor_global_controls`;
- `app.module_supervisor_host_policies`.

Append-only evidence:

- `app.module_supervisor_global_control_events`;
- `app.module_supervisor_host_policy_events`;
- `app.module_supervisor_budget_reservations`.

Policy/global-control revisions increment on each update.

Evidence rows cannot be updated or deleted by the runtime role.

## Operator UI

The existing Autonomous Operations screen now includes the Build 326 policy center.

Owners/admins can:

- engage/release the emergency global stop;
- create or edit an exact-host policy;
- enable/disable a host;
- engage/release the host kill switch;
- allow or remove safe-health recovery;
- set cycle/recovery budgets;
- configure an optional UTC maintenance window;
- review configured host policy revisions.

## Security boundary

Build 326 does not automatically authorize:

- connection activation;
- peer writes;
- event replay;
- credential mutation;
- workflow release;
- trust mutation.

A missing global control blocks all cycles.

A missing host policy blocks that host.

A policy save never creates execution authority by itself.

Only a transactional cycle authorization can reserve budget and issue a short-lived Build 325 safe-health grant.

## Next queued build

**Build 327 — Zero-Touch Module Installer & Guided Host Enrollment** remains the next regular product roadmap item.
