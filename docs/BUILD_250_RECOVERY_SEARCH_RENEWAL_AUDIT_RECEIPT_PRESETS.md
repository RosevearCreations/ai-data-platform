# Build 250 — Recovery Search, Renewal Audit & Receipt Presets

## Recovery scope

Build 250 verifies the existing browser-local recovery cycle for:
- repair recovery search across audit ID, requested preset, recovered preset and reason;
- newest-first renewal recovery audit entries;
- receipt recovery presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons.

No database migration is introduced.

## QL-266

QL-266 remains UNDER REVIEW and is not reactivated by Build 250.
External test status remains REVIEW_DEFERRED.
Connection state remains DISCONNECTED.

## Operations Command conversion

Build 250 adds and uses:
- reusable trend cards;
- drilldown filters;
- responsive event groups;
- inspector task links.

System Status now calculates real 24-hour delivery activity against the preceding 24-hour window, displays accepted/non-error and HTTP-exception proportions, drills into real acknowledgement subsets, renders grouped delivery events, and provides contextual review task links.

Source A:
`61b5ee0a479345089df5ddc3043b6b7c2243eb65`

Verified Build 249 CI:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41208516591`

## Next roadmap item

**Build 251 — Recovery Presets, Renewal Filtering & Receipt Persistence, with Operations Command conversion continuing through reusable scorecards, layered filters, responsive activity lanes and inspector checkpoints. QL-266 remains UNDER_REVIEW until explicitly resumed.**
