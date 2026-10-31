# Build 252 — Recovery Audit, Renewal Persistence & Receipt Filtering

## Recovery scope

Build 252 revalidates the existing browser-local recovery cycle for:
- durable recovery audit ordering;
- renewal preset persistence and safe fallback to supported values;
- receipt recovery filtering across All, Recent 24 hours and Recent 7 days.

The build reuses the established versioned recovery stores. No new database migration or parallel persistence format is introduced.

## QL-266

QL-266 remains **UNDER REVIEW** and is not reactivated by Build 252.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
No new QL-266 external test or connection gate is started.

## Operations Command conversion

Build 252 adds and uses:
- reusable health summaries;
- segmented views;
- responsive workflow timelines;
- inspector handoff cards.

System Status now groups live consumer readiness, accepted delivery percentage, exception pressure and the QL-266 review boundary into a reusable health summary. Consumer and delivery states are exposed as segmented views, the delivery review sequence is presented as a responsive workflow timeline, and configuration/exception/QL-266 follow-through is expressed through reusable inspector handoff cards.

Existing Build 250 and Build 251 anchors and verifier markers remain available for regression compatibility.

Source A:
`185811ea69bd99efda68d07e0a06105c3dbaf1a2`

Verified Build 251 CI:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41214628086`

## Next roadmap item

**Build 253 — Recovery Filtering, Renewal Recovery & Receipt Search, with Operations Command conversion continuing through reusable status matrices, comparison bands, responsive review queues and inspector escalation cards. QL-266 remains UNDER_REVIEW until explicitly resumed.**
