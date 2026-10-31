# Build 249 — Recovery Filtering, Renewal Recovery & Receipt Search

## Recovery scope

Build 249 verifies the existing browser-local recovery cycle for:
- repair recovery filtering across All, Recent 24 hours and Recent 7 days;
- renewal preset recovery with safe fallback to `all`;
- receipt recovery search across audit ID, requested preset, recovered preset and reason.

No database migration is introduced.

## QL-266

QL-266 remains UNDER REVIEW and is not reactivated by Build 249.
External test status remains REVIEW_DEFERRED.
Connection state remains DISCONNECTED.

## Operations Command conversion

Build 249 adds and uses:
- reusable comparison cards;
- exception pivots;
- responsive history panels;
- inspector shortcuts.

System Status now compares real configured-vs-review-needed consumers and acknowledgement-vs-exception outcomes, pivots current exception focus, renders recent durable delivery history, and exposes contextual inspector shortcuts into existing governed workflows.

Source A:
`d2677d2fb0fce8a6aa2aaf76675bcbb55964e79f`

Verified Build 248 CI:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41206660503`

## Next roadmap item

**Build 250 — Recovery Search, Renewal Audit & Receipt Presets, with Operations Command conversion continuing through reusable trend cards, drilldown filters, responsive event groups and inspector task links. QL-266 remains UNDER_REVIEW until explicitly resumed.**
