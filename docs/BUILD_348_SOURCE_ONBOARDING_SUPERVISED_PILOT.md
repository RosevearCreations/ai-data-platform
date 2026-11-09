# Build 348 — Six-Application Source Onboarding & Supervised Production Pilot

## Purpose

Build 348 adds the Master Shell's supervised source-onboarding layer for the exact six source identities:

- `yw`
- `icamp`
- `rosiedazzlers`
- `devilndove`
- `ai-data-platform`
- `rosevear-ai-hub`

Each source is reviewed independently and one supervised pilot window is permitted at a time.

## Required pre-pilot evidence

Every onboarding record requires six independent prerequisite assertions:

1. original source-owned evidence;
2. source-registry readiness;
3. Build 347 security certification;
4. recovery readiness;
5. rollback readiness;
6. explicit owner pilot authorization.

A source remains HOLD while any prerequisite is BLOCKED. Any failed prerequisite is FAIL. All six prerequisites must PASS before a supervised pilot may be recorded.

## Supervised production pilot

A complete pre-pilot record with `pilotOutcome=not-run` is READY_FOR_PILOT.

A supervised pilot requires:

- an explicit start and end time;
- a bounded pilot evidence URI;
- evidence detail;
- no time overlap with any other recorded source pilot window.

The outcomes are:

- PASS → ONBOARDED evidence state;
- FAIL → PILOT_FAILED;
- BLOCKED → HOLD;
- NOT RUN → READY_FOR_PILOT only when all prerequisites PASS.

The Build 348 ONBOARDED state is an evidence/read-model result. It is **not** connection activation and does not mutate the source registry.

## Cross-checks

The write path refuses a source-registry readiness PASS unless the current Build 336 registry state for that exact source is `TEST_VERIFIED` or `CONNECTED`.

It refuses a security-certification PASS unless the current Build 347 security state for that exact source is `PASS`.

Original source evidence, recovery evidence, rollback evidence and owner authorization remain separate evidence requirements and are never inferred from repository state or deployment GREEN.

## Authority boundary

Build 348:

- does not create credentials;
- does not call source endpoints;
- does not activate a connection;
- does not release a Build 336 source HOLD;
- does not mutate a peer application;
- does not send communications;
- does not infer owner approval;
- does not infer production acceptance.

## Next queued build

**Build 349 — Master Shell Production Readiness, Recovery, Owner Acceptance & Rollback.**
