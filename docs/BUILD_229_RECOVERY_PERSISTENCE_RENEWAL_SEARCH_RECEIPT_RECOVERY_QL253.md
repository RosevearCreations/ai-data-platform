# Build 229 — Recovery Preset Persistence, Renewal Recovery Search, Receipt Preset Recovery & QL-253 Reconciliation

## Objective
Advance the queued browser-local recovery cycle and add QL-253 public-proof retry-result reconciliation, ancestry-drift exception handling, and owner TEST-only decision intake without executing authenticated requests.

## Recovery scope
- retain sanitized browser-local repair recovery preset persistence;
- retain renewal recovery search across audit ID, requested/recovered preset IDs and reason;
- retain fail-safe receipt preset recovery to All for unsupported persisted values;
- keep arbitrary manual search text out of persistence.

## QL-253 reconciliation
A public-proof retry result is accepted only when immutable proof HTTP status is 200, source/proof SHAs are distinct valid 40-character SHAs, proof digest is valid, exact source CI head SHA equals source revision, and ancestry is independently verified.

Any source/proof/CI/digest/ancestry drift produces `HOLD_QL253_ANCESTRY_DRIFT_EXCEPTION`.

Owner TEST-only decision intake remains separate. `REQUESTED_PRIVATE_REVIEW` records a request only. `INDEPENDENTLY_VERIFIED_BY_OWNER` is accepted only with private identity verification, a nonproduction business scope, exact GET-only health/capabilities paths, a future window no longer than 30 minutes, and a non-secret receipt ID. Even then, actual gateway requests remain separately HELD for execution.

## Current truthful state
At pre-Build-229 main `9f4f790dab0c52fc4c4fe42bfa85a8a3b5eeea2e`, no exact GitHub Actions source-CI run is available and `docs/integration/ql246-source-proof.json` remains 404. Therefore proof B, ancestry and proof digest remain NOT_AVAILABLE.

Owner TEST decision remains NOT_GIVEN, actual gateway testing remains NOT_RUN, and connection remains DISCONNECTED.

## Next roadmap item
**Build 230 — Repair Preset Recovery, Renewal Recovery Presets & Receipt Recovery Audit, plus QL-253 retry evidence renewal, ancestry-exception aging and privately verified owner TEST decision continuity while authenticated request execution remains HELD.**
