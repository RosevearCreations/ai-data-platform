# AI Data Platform Build 436 — Branch Reconciliation Intelligence, Safe Ancestry Classification & Merge-Custody Planner

Build 436 addresses the long-running AIDP dev/main divergence without discarding valid work.

## Captured state at Build 436 planning

- main: 327339983d8138d47cb3520488d5d58cf01f8224
- dev/main status: DIVERGED
- dev ahead of main: 238 commits
- dev behind main: 222 commits
- merge base: b382ac45bbb7d5f7bcaf2c311d2c3fab45d0a2d2

## Delivered

- deterministic ancestry classification;
- explicit distinction between aligned, one-sided advance and true divergent history;
- safe merge-custody planner;
- mandatory unique-commit classification before reconciliation;
- no force reset of protected branches;
- no deletion of unique commits without proof;
- continued clean-main promotion pattern while histories remain divergent;
- explicit separation of peer release evolution from AIDP branch ancestry divergence;
- authenticated operator dashboard/API.

## Capability movement

Cross-application release coordination advances from **78% to 86% (+8 points)**.

## Reconciliation rule

Build 436 does not claim the 238 dev-only or 222 main-only commits are automatically unique business functionality. They are ancestry counts. The next reconciliation step must classify changesets/patch equivalence before deciding whether histories can safely converge.
