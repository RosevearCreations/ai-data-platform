# Build 275 — Provider Pilot Baseline, Cost, Latency & Failure Evidence

## Purpose

Build 275 converts the existing controlled Browserless pilot evidence into a current provider baseline without creating a synthetic provider run.

The baseline is derived from existing RLS-scoped provider controls, source-policy evidence, allowlists and terminal provider events.

## Evidence captured

For each authorized workspace the baseline reports:

- terminal provider runs;
- success and failure counts;
- success rate;
- estimated provider units;
- average terminal-run duration;
- current approved public-source count;
- enabled allowlist-source count;
- workspace control and kill-switch state;
- latest terminal response code;
- latest successful content SHA-256 and final URL;
- latest failure reason;
- explicit readiness blockers.

## Build 275 exit criterion

Build 275 is operationally satisfied when either:

1. at least one bounded real terminal provider run exists and supplies cost/latency/outcome evidence; or
2. no live provider run is currently authorized and every unmeasured workspace is explicitly blocked by the real provider/source-policy controls.

A blocked baseline is a valid evidence result. It is not a successful live-provider result.

If a workspace is fully ready but remains unmeasured, Build 275 remains open rather than manufacturing activity.

## Stop conditions

The controlled pilot remains fail-closed for:

- global or workspace kill switch;
- disabled provider execution environment gate;
- source-policy or allowlist pin drift;
- runtime/page/provider-unit budget breach;
- operator/job cancellation;
- provider failure;
- content-size or cross-origin redirect violation.

## Safety boundaries

- No provider execution is started by the baseline reader.
- No provider credential is exposed.
- No source is automatically approved or allowlisted.
- No kill switch is disabled.
- No second evidence store or migration is introduced.
- Existing RLS and workspace membership remain authoritative.
- QL-266 remains **UNDER_REVIEW**, **REVIEW_DEFERRED**, and **DISCONNECTED**.

## Next build

Build 276 — Consumer Acceptance, Replay & Delivery Receipt Reconciliation.
