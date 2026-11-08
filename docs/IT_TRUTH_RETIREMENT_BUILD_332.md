# Build 332 — I.T. Truth Retirement Register

This register distinguishes current operational prerequisites from historical checkpoints.

## Retired from the active task queue

| Historical item | Current disposition |
| --- | --- |
| Build 273 Evidence Baseline | Historical evidence only; removed from current navigation. |
| Build 280 Owner Acceptance / next-batch renewal | Historical checkpoint only; later owner-authorized roadmaps supersede it. |
| QL-266 UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED | Retired as a global prerequisite. Historical evidence remains available. |
| Build 276 as top-level System Status destination | Superseded by the current Integration Health command center. |
| Static peer DISCONNECTED state inherited from Integration-v1 | Replaced by UNMEASURED until current evidence establishes a state. |

## Still authoritative

These controls were **not** removed:

- authenticated user/session requirements;
- workspace and tenant isolation;
- least-privilege grants;
- credential-reference and rotation controls;
- signed/replay-safe inbound transport controls;
- module and cross-host certification;
- current connector health evidence;
- idempotency and duplicate prevention;
- explicit authorization for consequential peer writes;
- append-only security and operational evidence.

## Principle

Historical evidence may explain how we got here, but it must not create fictional work after the application has moved beyond that checkpoint. Current operator status must come from current measured evidence or be reported as UNMEASURED.
