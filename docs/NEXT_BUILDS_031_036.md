# Detailed Build Plan — Builds 031–036

This queue was produced by Build 030 production learning. The priority order is evidence-driven: missing outcome telemetry first, then the real Browserless production baseline, then consumer delivery, retention and adoption review.

## Build 031 — Operational Outcome Telemetry & Review Snapshot Continuity

Priority: P0.

Purpose: close Build 030's synchronization and recipe-repair measurement gaps.

Implementation sequence:

1. Define a bounded append-only operational outcome event contract.
2. Record sync applied/conflict/noop/deleted/error outcomes without copying full payloads.
3. Record recipe-repair proposed/approved/rejected/rolled-back outcomes.
4. Link repair outcome to saved-scraper revision and later compatibility checks.
5. Add retention limits and RLS.
6. Persist production-learning review snapshots for before/after comparisons.
7. Extend /production-learning with sync-conflict and repair outcome rates.
8. Verify cross-account isolation and append-only behavior.

Manual intervention: none.

## Build 032 — Browserless Live Pilot & Provider Cost Baseline

Priority: P0 until a real production pilot baseline exists.

Purpose: convert the built Browserless boundary into measured production evidence.

Implementation sequence:

1. Verify BROWSERLESS_API_TOKEN is configured only as an encrypted production secret.
2. Verify REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true.
3. Keep REMOTE_EXECUTION_KILL_SWITCH=true while preparing policy/workspace gates.
4. Select one existing approved public-facts/public-webpage Source Policy with robots allowed.
5. Allowlist the exact policy revision/fingerprint for one workspace.
6. Arm that workspace.
7. Temporarily set REMOTE_EXECUTION_KILL_SWITCH=false.
8. Run exactly one bounded one-page pilot.
9. Review success/failure, provider units, duration, response code/final URL/hash evidence.
10. Restore REMOTE_EXECUTION_KILL_SWITCH=true unless continued testing is explicitly approved.
11. Record the baseline in /production-learning and make a go/no-go decision for any later expansion.

Manual intervention: required for the production secret/environment variables. Never provide the token through chat or GitHub.

## Build 033 — Integration Consumer Acceptance & Delivery Observability

Priority: P1 until a real consumer acknowledges a package.

Purpose: prove the consumer side of the Build 022 contracts.

Implementation sequence:

1. Define the authenticated receiver handshake.
2. Select one supported business consumer.
3. Implement/verify version/schema/fingerprint/staleness/replay rejection in the consumer.
4. Add delivery attempt and acknowledgement evidence.
5. Keep downstream writes behind explicit consumer-side review.
6. Verify valid acceptance plus replay/stale/wrong-target rejection.
7. Surface delivery outcomes in production learning.

Manual intervention: target consumer endpoint/credential approval may be required.

## Build 034 — Retention, Storage Budgets & Cleanup Automation

Priority: P2 unless Build 030/031 storage evidence crosses the watch/action threshold.

Purpose: make storage growth enforceable and reviewable.

Implementation sequence:

1. Define retention classes per module/evidence type.
2. Protect append-only/security-critical evidence from unsafe cleanup.
3. Add cleanup eligibility preview.
4. Require explicit first-run approval.
5. Run bounded cleanup batches.
6. Record before/after row and storage proxies.
7. Add failure/retry/exception evidence.
8. Surface retention outcomes in production learning.

Manual intervention: explicit approval before first destructive production cleanup.

## Build 035 — Workspace, Profile & Connector Adoption / Permission Outcomes

Priority: P2.

Purpose: decide where further product investment is justified by actual usage.

Implementation sequence:

1. Measure active workspace/profile adoption.
2. Compare enabled capabilities with actual durable activity.
3. Measure connector installation/grant/use outcomes.
4. Review owner/admin/member distribution.
5. Identify stale/unused high-risk capabilities.
6. Compare barcode/scheduled/remote feature adoption.
7. Produce least-privilege and investment recommendations.
8. Never change permissions automatically.

Manual intervention: the user may choose which domains/integrations to prioritize after the review.

## Build 036 — Production Learning II & Roadmap Renewal

Priority: P2, mandatory before another long feature queue.

Purpose: compare the platform against the Build 030 baseline.

Implementation sequence:

1. Compare Build 031 telemetry outcomes to Build 030 gaps.
2. Review Browserless baseline and current provider cost/reliability.
3. Review consumer delivery outcomes.
4. Review retention/storage outcomes.
5. Review profile/connector/permission adoption outcomes.
6. Re-run security/permission review.
7. List unresolved evidence gaps.
8. Produce the next finite roadmap from measured needs only.

Manual intervention: no infrastructure setup; business-priority confirmation may follow the evidence report.
