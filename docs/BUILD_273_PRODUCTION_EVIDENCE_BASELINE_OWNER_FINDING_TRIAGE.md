# Build 273 — Production Evidence Baseline & Owner Finding Triage

## Purpose

Build 273 turns the Build 272 renewal checkpoint into the working baseline for the 273–280 batch.

It does not create synthetic production activity and it does not create a second evidence database.

## Evidence sources

The `/evidence-baseline` route combines existing authorized evidence from:

- Production Learning IV findings;
- Production Learning renewal evidence gaps;
- Build 271 hardening audit;
- System Reliability signals;
- Operator Attention Center items.

## Triage model

Every baseline item is classified as one of:

- **active** — current measured evidence needs action or follow-up;
- **validated** — current measured evidence is healthy/hardened and remains part of regression coverage;
- **historical** — an older build-era finding retained for context but not allowed to remain in the current operating queue without fresh measured evidence.

Each active item includes:

- accountable owner;
- evidence source link;
- current status/evidence;
- next action;
- target Build 274–279.

## Build 274–279 exit criteria

Build 273 records measurable exit criteria for:

- Build 274 — real workspace first-evidence/adoption;
- Build 275 — bounded provider terminal-run baseline;
- Build 276 — durable supported-consumer acknowledgement;
- Build 277 — retention budget/cleanup failure reconciliation;
- Build 278 — owner/permission/stale-grant review closure;
- Build 279 — critical reliability classification and durable trend baseline.

A later build may close early if current evidence already satisfies its criterion. It must not manufacture activity merely to make a metric non-zero.

## Safety and authorization boundaries

- RLS-scoped existing readers remain authoritative.
- No new production evidence store is introduced.
- Deployment success is not operational acceptance.
- Missing evidence remains missing.
- External authorization blockers remain blockers.
- QL-266 remains **UNDER_REVIEW**, **REVIEW_DEFERRED**, and **DISCONNECTED**.
- Build 273 does not resume QL-266.

## Next build

Build 274 — Guided Adoption Runbook & First-Evidence Completion.
