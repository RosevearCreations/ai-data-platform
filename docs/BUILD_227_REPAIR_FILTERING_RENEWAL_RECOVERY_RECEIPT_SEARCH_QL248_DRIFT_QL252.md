# Build 227 — Repair Recovery Filtering, Renewal Preset Recovery, Receipt Recovery Search & QL-248 Origin Drift Reconciliation

## Objective

Advance the queued recovery cycle, add QL-248 exported-origin digest reconciliation and immutable six-source origin drift detection, and incorporate the QL-252 AI Data Platform publication blocker without inventing unavailable proof evidence.

## Recovery scope

- filter newest repair recovery audit by All / 24h / 7d;
- recover unsupported persisted newest renewal preset IDs to the safe All preset;
- search newest receipt recovery evidence across audit ID, requested/recovered preset IDs and reason;
- keep all recovery view state browser-local and non-authoritative.

## QL-248 digest and origin reconciliation

Build 227 verifies that exported proof-origin bytes match an expected SHA-256 and compares two valid six-source exports field-by-field across every immutable origin field. Any digest mismatch, invalid export, or source/proof origin change returns HOLD.

Successful no-drift comparison still reports authenticated testing HELD and never changes connection authorization.

## QL-252 blocker incorporation

The QL-252 source snapshot reports the proof path at source SHA A `037b18247e59cb68d1f7ca5d7149595bd7487957` as 404. Build 227 independently confirmed that repository path is absent at that SHA.

No GitHub Actions workflow run URL for exact source SHA A was available through the commit-run lookup; only a successful Vercel commit status exists. Since QL-252 specifically requires an exact GitHub Actions source-CI URL, Build 227 records `NOT_AVAILABLE` instead of substituting Vercel.

No signing private key, custody receipt, witness receipt, proof commit B, proof bytes hash, SPKI fingerprint or owner TEST approval is invented.

## Safety boundaries

- no fake or sample QL-246 proof publication;
- no private key generation or storage in GitHub;
- no fabricated CI run;
- no fabricated gateway receipts or seven-denial evidence;
- no real gateway request;
- owner authorization remains NOT_GIVEN;
- actual gateway test remains NOT_RUN;
- connection remains DISCONNECTED;
- Phase-B remains HELD.

## Next roadmap item

**Build 228 — Recovery Search Presets, Renewal Recovery Filtering & Receipt Preset Persistence, plus QL-253 immutable-proof retry readiness, source-CI/proof ancestry reconciliation and custody-pin exception renewal while owner TEST-only authorization remains HELD.**
