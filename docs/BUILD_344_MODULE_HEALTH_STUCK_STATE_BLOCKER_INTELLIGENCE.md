# Build 344 — Module Health, Stuck-State, Staleness, HOLD & Blocker Intelligence

## Purpose

Build 344 adds a read-only Master Shell health view over the existing Build 339 application/module inventory.

It does not create a new source of module truth. Source registry state remains Build 336 evidence, module readiness remains Build 337 evidence, Master Completion remains Build 338 evidence, and application/module inventory remains the Build 339 composition.

## Health states

Build 344 derives these operator-facing states:

- `HOLD` — the source registry is explicitly `AUTHORIZATION_HELD`;
- `BLOCKED` — a source-reported blocker, blocking source state, RED/HOLD release, or failed Master Completion requirement exists;
- `STALE` — source registry or module-readiness evidence is expired;
- `STUCK_CANDIDATE` — fresh source readiness remains `IN_PROGRESS` for at least 24 hours;
- `EVIDENCE_BLOCKED` — incomplete or insufficient evidence prevents a healthy interpretation;
- `IN_PROGRESS` — fresh, nonterminal work remains inside the stuck threshold;
- `HEALTHY_SIGNAL` — current readiness is READY/ACCEPTED with no evidence blocker;
- `UNMEASURED` — current readiness cannot be established.

A `HEALTHY_SIGNAL` is not owner acceptance or production acceptance.

## Stuck-state rule

**Stuck candidates are derived review intelligence**, not source truth.

The default threshold is 24 hours. A module qualifies only when its latest source-reported readiness is still `IN_PROGRESS`, that evidence is fresh, and the observed event is at least 24 hours old.

The threshold does not:

- write `STUCK` to a source;
- restart work;
- release a HOLD;
- create a task;
- change ownership;
- trigger recovery.

## Blocker intelligence

Build 344 keeps blocker categories distinct:

- `HARD_BLOCKER` — explicit source/module/release or failed requirement evidence;
- `EVIDENCE_BLOCKER` — stale, unverified, unknown or stale completion evidence prevents a healthy conclusion;
- `EVIDENCE_GAP` — expected evidence or an approved module-level completion scope is absent.

Missing evidence never becomes healthy.

## Surfaces

- `/module-health-intelligence`;
- `/api/module-health-intelligence`.

The API is authenticated and GET-only.

## Authority boundary

Build 344 performs no source mutation, peer write, external probe, automatic retry, automatic recovery, HOLD release, owner acceptance, module acceptance or production acceptance.

## Next queued build

**Build 345 — Role/Device Acceptance Matrix: Customer, Worker & Admin / Mobile, Tablet, Desktop.**
