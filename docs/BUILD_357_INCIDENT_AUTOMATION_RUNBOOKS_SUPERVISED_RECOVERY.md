# Build 357 — Moderate Incident Automation, Runbooks & Supervised Recovery Orchestration

## Objective

Build 357 converts existing Master Shell alerts and dependency truth into deterministic incident plans, evidence checklists, runbook selection, escalation packets and supervised recovery handoffs.

The build automates coordination work while preserving source and communications authority.

## Automated preparation

Build 357 may automatically:

- classify an observed alert by severity;
- select the matching runbook;
- assemble current dependency and connection context;
- generate an evidence checklist;
- prepare an incident escalation packet;
- prepare a supervised source-recovery sequence;
- prepare post-recovery verification steps.

These actions do not create a successful recovery or mutate a peer application.

## Authority boundary

**Comms Hub owns incident workflow**, messaging, routing, acknowledgements and follow-up.

AI Data Platform owns intelligence, correlation, runbook preparation and evidence verification.

Each source application retains:

- operational recovery execution;
- consequential writes;
- rollback execution;
- source-side acceptance;
- authoritative business state.

## Fail-closed recovery rules

A recovery remains blocked when the relevant source is on `HOLD`, dependency evidence is stale/review/blocked, required approval is missing, or fresh evidence is absent.

Build 357 does not:

- automatically create or close a Comms Hub incident;
- automatically send messages;
- automatically execute a source retry/recovery;
- automatically write to peer applications;
- release HOLD;
- treat acknowledgement as resolution;
- treat deployment GREEN as recovery proof.

## Supervised recovery sequence

1. Recheck current evidence and freshness.
2. Prepare evidence-aware incident context.
3. Request operator review/acknowledgement through the Comms plane.
4. Prepare the source-owned recovery handoff when authorized.
5. Require fresh post-recovery evidence before changing displayed truth.

Rollback remains mandatory for consequential recovery changes.

## Next queued build

**Build 358 — Advanced Anomaly Detection, Behaviour Baselines & Predictive Risk Intelligence**.
