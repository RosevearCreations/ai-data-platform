# Build 305 — Autonomous Operations V1, Owner Controls & Production Learning VI

## Purpose

Build 305 closes the 281–305 connectivity and autonomous-operations batch with a controlled automation layer and a fresh evidence-driven renewal checkpoint.

It introduces:

- an owner/admin policy with an explicit master enable switch;
- a kill switch that defaults to engaged;
- bounded certification refresh and recovery-plan discovery;
- optional execution of the existing Build 301 connector-health GET/HEAD safe-recovery lane only;
- rate and per-cycle recovery limits;
- append-only autonomous cycle/action evidence;
- Production Learning VI snapshots and unnumbered roadmap candidates.

## Default state

A production deployment of Build 305 does **not** start autonomous activity.

The initial effective policy is:

- autonomous cycles: disabled;
- kill switch: engaged;
- certification monitoring: prepared;
- recovery-plan scan: prepared;
- safe recovery: disabled;
- maximum safe recovery executions: bounded 0–10 per cycle;
- maximum cycle rate: bounded 1–12 per hour.

An owner/admin must explicitly save a policy before a cycle can run.

## Autonomous cycle

Once an owner has enabled cycles and released the kill switch, one cycle may:

1. refresh the Build 304 six-app certification snapshot;
2. scan existing connector, event and credential evidence for Build 301 recovery plans;
3. when separately enabled, execute up to the owner-defined number of Build 301 safe connector-health recoveries;
4. re-read Production Learning evidence;
5. create a Production Learning VI snapshot and unnumbered roadmap candidates.

The cycle is policy-bounded and rate-limited.

## Safe recovery boundary

The only automatic external operation Build 305 may invoke is the Build 301 health boundary:

- connector SDK v2 registered health endpoint;
- GET/HEAD semantics only;
- existing connector registration/configuration/secret-reference controls;
- existing Build 301 retry count, cooldown and expiry limits;
- no destination mutation.

Build 305 never broadens that boundary.

The autonomous controller does **not** automatically:

- enable or install a connector;
- create or rotate credentials;
- activate an Integration v1 or other peer connection;
- release a Build 291 event route;
- replay a Build 292 dead letter;
- release a Build 302 workflow action intent;
- create/approve a workflow rule;
- perform an export/write capability;
- change tenant mappings;
- alter trust, issuer, witness or owner authorization;
- write to a peer application;
- resume QL-266.

## Owner controls

Route:

`/autonomous-operations`

The owner policy controls:

- master enable;
- kill switch;
- certification monitoring;
- recovery-plan scanning;
- safe recovery;
- maximum safe recoveries per cycle;
- maximum cycles per hour.

Every policy change creates append-only policy-event evidence.

The mutable policy row itself is scoped to the authenticated user and can be changed only after the application verifies that user currently holds owner/admin authority in at least one authorized workspace.

## Production Learning VI

Production Learning VI combines:

- the latest six-app certification totals;
- current Build 301 recovery state;
- the existing measured Production Learning findings.

Candidate priorities are evidence-derived:

- certification contradictions become P0 connectivity candidates;
- missing certification evidence remains an explicit connectivity candidate;
- owner-controlled recovery queues become P0 recovery candidates;
- exhausted/non-retryable connector recovery becomes a bounded recovery candidate;
- current Production Learning `gap`, `action` and `watch` findings remain evidence-backed candidates.

Candidates are advisory only.

Build 305 intentionally does **not** assign Build 306 or any later build number. The next finite batch requires explicit owner authorization after review of the current evidence.

## Persistence

Migration:

`0106_autonomous_operations_owner_controls_learning_vi.sql`

Tables:

- `app.autonomous_operation_policies`;
- `app.autonomous_operation_policy_events`;
- `app.autonomous_operation_cycles`;
- `app.autonomous_operation_actions`;
- `app.production_learning_vi_snapshots`;
- `app.production_learning_vi_candidates`.

All evidence tables are append-only to the runtime role. The owner policy is the only mutable Build 305 table.

Persisted Build 305 evidence stores bounded counts, IDs, policy snapshots and reasons. It does not persist raw credential values, raw peer payloads, event bodies or secret material.

## Roadmap renewal checkpoint

Build 305 is the mandatory renewal checkpoint for the 281–305 batch.

The next numbered batch is **not automatically authorized**.

Current evidence is exposed as unnumbered candidates on the Build 305 screen. An owner may use those candidates to authorize a later finite roadmap, but deployment of Build 305 itself does not create or approve that roadmap.

See `docs/ROADMAP_RENEWAL_AFTER_BUILD_305.md`.

## Exit criterion

Build 305 is complete when:

- owner controls exist with safe defaults and a kill switch;
- autonomous cycles enforce rate and action limits;
- only Build 301 GET/HEAD health recovery can execute automatically;
- consequential actions remain owner-controlled;
- Production Learning VI can generate measured, unnumbered renewal candidates;
- migration 0106 is applied;
- inherited Builds 296–304 verification remains GREEN;
- the production route is live and error-free.

