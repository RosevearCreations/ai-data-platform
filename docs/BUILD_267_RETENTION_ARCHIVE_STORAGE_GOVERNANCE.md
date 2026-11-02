# Build 267 — Retention, Archive & Storage Governance Center

## Purpose

Build 267 expands the existing retention controls into a governance center for data age, archive candidates, protected evidence, delete eligibility and impact preview.

## Governance model

The retention center now shows, per workspace and retention class:

- managed row and storage measurements;
- oldest and newest retained record timestamps;
- age of the oldest retained record;
- configured retention threshold;
- archive-only, bounded-delete, protected-evidence or bounded-in-place disposition;
- archive candidate counts;
- delete-eligible row and byte counts;
- storage-budget exceptions;
- protected row and storage totals.

## Impact preview

Before destructive cleanup, Build 267 shows:

- current managed rows and measured storage;
- projected rows after all currently delete-eligible records were eventually removed;
- projected measured storage after the currently eligible delete bytes were removed;
- the current per-run row limit;
- how many eligible rows the next bounded run could affect.

The storage preview is a measured proxy based on current eligible bytes. It is not a promise of exact physical database file reduction.

## Archive boundary

Archive candidates remain preview-only.

Build 267 does not silently move, export or delete archive candidates. A separate manual archive decision is still required for classes such as synchronized payload tombstones.

## Protected evidence

Classes marked as protected remain excluded from Build 267 destructive cleanup, including audit, connector, operational, production-learning, integration-delivery and retention-control evidence according to the existing retention definitions.

## Delete boundary

Existing cleanup controls remain unchanged:

- owner/admin authority is required;
- cleanup approval must already be active;
- explicit confirmation is required;
- cleanup remains bounded by the configured maximum rows per run;
- only the existing barcode-terminal and remote-terminal eligibility rules are destructive.

## QL-266 boundary

The unrelated owner-deferred QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 267 does not resume QL-266.

## Next build

**Build 268 — Workflow Orchestration, Runbook Templates & Guided Operations.**
