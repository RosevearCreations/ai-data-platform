# AI Data Platform — Official Next Build Batch 273–280

Adopted after Build 272 production GREEN and the Owner Acceptance / Production Learning IV renewal checkpoint.

This is a finite, evidence-driven operating batch. It is intentionally narrower than the 254–272 feature batch: the goal is to turn existing platform capability into measured production evidence, close outstanding operational gaps, and avoid adding new surface area where the platform already has the required controls.

## Branch policy

Only `dev` and `main` are intended to remain as long-lived repository branches.

## Integration boundary

QL-266 remains **UNDER_REVIEW**, external test status remains **REVIEW_DEFERRED**, and connection state remains **DISCONNECTED** until the owner explicitly resumes it.

Nothing in Builds 273–280 implicitly resumes QL-266. Consumer-acceptance work in this batch is limited to already-supported dry-run / conformance evidence and must not bypass an external connection gate.

## Execution rule

Each build begins by re-reading current production evidence.

If the named gap is already healthy, the build should validate the closure, record the evidence, remove stale follow-up state, and finish without manufacturing activity merely to justify the build number.

## Official queue

### Build 273 — Production Evidence Baseline & Owner Finding Triage
Turn the Build 272 owner-acceptance screen into the working baseline for this batch. Classify current action/watch/gap findings, separate true operating gaps from stale historical findings, attach owners and evidence sources, and establish the exact measurable exit criteria for Builds 274–279.

Primary evidence: Production Learning IV findings, renewal evidence gaps, hardening audit, reliability status, attention-center exceptions.

### Build 274 — Guided Adoption Runbook & First-Evidence Completion
Drive the existing safe workflows through a bounded first-evidence cycle so authorized workspaces produce durable operational evidence instead of only configuration/readiness state. Focus on collection → review → approval → delivery handoff where already permitted, with stop conditions and no gate bypass.

Primary evidence: active-workspace adoption, capability usage, first-evidence runbook completion, durable activity snapshots.

### Build 275 — Provider Pilot Baseline, Cost, Latency & Failure Evidence
Where an approved public-source policy and existing provider controls permit it, establish or refresh the bounded provider baseline using real terminal run evidence: success rate, provider units, duration, response status, content hash, failure reason and stop conditions. If live provider activity is still not authorized, record the blocker rather than simulating a pass.

Primary evidence: provider runs, provider units, average duration, success/failure outcomes, approved public sources, kill-switch state.

### Build 276 — Consumer Acceptance, Replay & Delivery Receipt Reconciliation
Reconcile the existing integration simulator/dry-run evidence with consumer-side acknowledgements, replay behavior, rejection reasons and durable delivery receipts for already-supported consumers. Keep transport gated where required and do not interpret conformance success as live external authorization.

Primary evidence: conformance accepts, live dry-run accepts where already permitted, delivery attempts, rejections, transport errors, acknowledgement/replay evidence.

### Build 277 — Retention Cleanup Readiness & Storage Budget Reconciliation
Review storage class budgets, archive/delete eligibility, failed cleanup attempts and approval state. Produce a safe cleanup-readiness queue with impact preview, protected-evidence checks and explicit operator approval requirements; execute only actions already authorized by existing retention controls.

Primary evidence: retention budget breaches, delete-eligible rows/bytes, cleanup runs, failed runs, archive candidates and protected evidence.

### Build 278 — Least-Privilege Adoption, Stale Grants & Capability Cleanup Review
Re-run the Build 266 security/access model against real adoption evidence. Surface unused enabled capabilities, stale or unused connector grants, ownerless/permission-review workspaces and privilege drift. Recommendations remain advisory unless the owner explicitly approves a permission change.

Primary evidence: used vs enabled capabilities, high-risk unused capabilities, connector grants, stale grants, workspace owner/admin/member coverage.

### Build 279 — Reliability Trend Validation, Failure Patterns & Recovery Readiness
Compare the renewed operating evidence against the durable Production Learning baseline. Identify material changes in sync conflicts/errors, repair health, provider reliability, integration outcomes, retention breaches and adoption. Validate retry/recovery behavior for recurring failures without generating synthetic incidents.

Primary evidence: trend snapshots, sync outcomes, repair compatibility, provider results, integration outcomes, retention health, reliability incidents/exceptions.

### Build 280 — Production Learning V, Owner Acceptance & Next-Batch Renewal
Close the 273–280 cycle with a fresh owner-acceptance review. Reconcile which Build 273 findings actually closed, which remain blocked by explicit authorization or external dependencies, remove stale queue items, and define any Builds 281+ only from the new measured evidence.

Primary evidence: all Build 273–279 exit criteria, Production Learning trend comparison, owner acceptance, unresolved operational gaps.

## Batch guardrails

- Do not create synthetic production activity solely to make a metric non-zero.
- Do not weaken RLS, approval, source-policy, kill-switch, retention, delivery or evidence controls.
- Do not convert deployment success into operational acceptance.
- Do not resume QL-266 without explicit owner authorization.
- Prefer validating and closing an already-resolved gap over expanding scope.
- Build 280 is the next mandatory roadmap-renewal checkpoint; no automatic long Builds 281+ queue should be created before that review.
