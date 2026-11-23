# AI Data Platform Build 435 — Signed Peer Release Ledger, Build-Number Continuity & Source Revision History

Build 435 makes Build 434's source-aware revision classification durable.

## Delivered

- protected append-only verified-observation history plus a non-deletable per-revision summary ledger keyed by application + verified source commit;
- first/last verified observation timestamps and observation counts;
- predecessor commit linkage;
- evidence-backed build labels where known;
- explicit unresolved build-number state when no evidence-backed label exists;
- forward sequence detection when both build labels are known;
- fail-closed regression HOLD when a known build sequence moves backward;
- source history independent from AIDP dev/main Git ancestry;
- owner/operator release-history dashboard and API.

## Capability movement

Cross-application release coordination advances from **70% to 78% (+8 points)**.

## Safety rule

A SHA is never converted into a build number by inference. Unknown labels stay unresolved until source-owned evidence supplies the mapping.
