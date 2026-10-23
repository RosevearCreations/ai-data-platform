# Build 119 — Command Center V2 — Functional Dashboard & Operator Home

## Objective

Turn the Marble Standard Command Center into a functional read-only operator home that answers:

1. What needs attention?
2. Where should I go next?
3. What is healthy or failing?
4. What was I working on recently?
5. Which workspace/context am I operating in?

## Evidence sources

Build 119 reuses existing governed evidence only:

- adoption and workspace permission/profile evidence;
- remote pilot execution evidence;
- retention/storage evidence;
- integration-delivery evidence;
- collection-project readiness evidence;
- Build 115 corrective-generation state-machine and invariant findings.

No new dashboard state table is created.

## Functional surfaces

- prioritized Needs Attention queue;
- direct action links into authoritative workflows;
- Quick Actions for frequent operator tasks;
- Operational Health board;
- current operating-picture metrics;
- Recent Work merged from collection, remote and delivery evidence;
- workspace context cards;
- module browser retained below priority work.

## Severity contract

- **critical** — measured failure/blocking evidence such as remote failures, delivery transport errors or critical corrective invariants;
- **attention** — measured follow-up such as permission/profile review, storage budget, collection readiness blockers or corrective warnings;
- **healthy** — the relevant measured condition is absent.

Healthy never means an unmeasured external dependency is guaranteed healthy.

## Safety boundaries

- no database migration;
- no new mutation endpoint;
- no automatic repair;
- no automatic permission/profile change;
- no workflow state transition from Home;
- no RLS change;
- quick actions and attention actions are navigation only.

## Help

Every Build 119 card follows the Build 117 contextual-help standard and the Build 118 SurfaceCard/Marble Standard visual contract.

## Next roadmap item

**Build 120 — Module Hubs, Sub-Screens & Progressive Workflow Navigation.**
