# Build 349 — Master Shell Production Readiness, Recovery, Owner Acceptance & Rollback

## Purpose

Build 349 consolidates the final Master Shell production-readiness evidence for the exact six source applications without replacing any source-specific gate.

Each source is reviewed across five independent dimensions:

1. Build 348 source onboarding;
2. operational recovery;
3. accessibility;
4. production safeguards;
5. rollback.

A separate explicit owner decision then determines whether a fully evidenced source is accepted, held or rejected.

## Effective states

- **HOLD** — evidence is missing/blocked, or the owner explicitly holds the source.
- **FAIL** — a readiness dimension fails or the owner rejects the source.
- **READY_FOR_OWNER** — all five dimensions PASS but no explicit owner decision exists.
- **ACCEPTED** — all five dimensions PASS and the authenticated suite owner explicitly accepts.
- **STALE** — the recorded readiness evidence has expired.

## Build 348 dependency

A `source-onboarding` PASS is rejected unless Build 348 currently reports `ONBOARDED` for that exact source.

An owner cannot record `ACCEPTED` unless the exact source is currently `ONBOARDED` in Build 348.

Build 348 ONBOARDED does not itself imply Build 349 acceptance.

## Explicit owner authority

Admins may collect and review readiness evidence.

Only an authenticated suite **owner** may record `accepted`, `held` or `rejected`. Every explicit owner decision requires:

- an evidence URI;
- decision detail;
- a decision timestamp.

`not-reviewed` must have no owner-decision evidence attached.

## Evidence persistence

Migration `0127_master_production_readiness.sql` adds append-only RLS-protected:

- `app.master_production_readiness_runs`;
- `app.master_production_readiness_assertions`.

The runtime role receives SELECT/INSERT only.

## Authority boundary

Build 349 records evidence and explicit owner decisions only.

It does not:

- activate a source connection;
- execute rollback;
- mutate peer application state;
- release a source-specific HOLD;
- change consent or authorization;
- infer owner acceptance from deployment GREEN;
- replace source-specific production or recovery gates.

## Next queued build

**Build 350 — Production Learning VIII, Master Shell Acceptance & Next Roadmap Renewal.**
