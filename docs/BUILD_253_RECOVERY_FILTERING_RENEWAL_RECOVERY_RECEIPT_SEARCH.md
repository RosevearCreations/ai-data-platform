# Build 253 — Recovery Filtering, Renewal Recovery & Receipt Search

## Recovery scope

Build 253 revalidates the existing browser-local recovery cycle for:
- recovery evidence filtering across All, Recent 24 hours and Recent 7 days;
- renewal preset recovery to a safe supported fallback when a persisted preset is retired;
- receipt recovery evidence search by audit ID, recovered preset and recovery reason.

The build reuses the established versioned recovery stores and search/filter helpers. No new database migration or duplicate persistence format is introduced.

## QL-266

QL-266 remains **UNDER REVIEW** and is not reactivated by Build 253.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
No new QL-266 external test, authentication test or connection gate is started.

## Operations Command conversion

Build 253 adds and uses:
- reusable status matrices;
- comparison bands;
- responsive review queues;
- inspector escalation cards.

System Status now presents consumer configuration, delivery acknowledgements and the QL-266 owner boundary as a reusable status matrix; compares current operating counts in a compact comparison band; consolidates configuration, exception and QL-266 follow-through into a responsive review queue; and provides inspector escalation cards that preserve clear action boundaries.

Existing Build 250, Build 251 and Build 252 anchors and verifier markers remain available for regression compatibility.

Source A:
`8c475583f5d84f8dbb47aa295b0f034e4b7b41c1`

Verified Build 252 CI:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41218680390`

## Next roadmap item

**Build 254 — Recovery Search, Renewal Audit & Receipt Presets, with Operations Command conversion continuing through reusable risk summaries, drill-through bands, responsive evidence lanes and inspector resolution cards. QL-266 remains UNDER_REVIEW until explicitly resumed.**
