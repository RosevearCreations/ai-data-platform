# Build 231 — Repair Recovery Audit, Renewal Preset Persistence, Receipt Recovery Filtering & QL-254 Relay Readiness

## Objective
Advance the queued browser-local recovery cycle and implement QL-254 original signed-proof retrieval follow-up, independent private pin-registry witness evidence validation, and reversible 24/7 relay-readiness simulation while the connection remains HELD.

## Recovery scope
- retain bounded newest-first repair recovery audit evidence;
- retain sanitized browser-local renewal preset persistence;
- retain receipt recovery filtering for All, 24 hours and 7 days;
- preserve full retained evidence independently of visible filtering.

## QL-254 original proof retrieval
The retrieval follow-up remains fail-closed. A source can be marked retrievable only when:
- the observed main SHA is valid;
- immutable proof retrieval returns HTTP 200;
- source A and proof B are distinct full SHAs;
- exact raw proof SHA-256 exists;
- public signer SPKI SHA-256 exists;
- the source CI URL is an AI Data Platform GitHub Actions run whose head SHA equals source A;
- A→B ancestry is independently verified.

Current observed main `9e570d82707fd476b43458fa869776bac9ddc65f` still returns HTTP 404 at `docs/integration/ql246-source-proof.json`, with no matching source CI run available. Therefore source A, proof B, proof digest, signer pin and ancestry remain NOT_AVAILABLE.

## Independent witness evidence
Witness evidence is accepted only when all public digests and non-secret receipt references are present, the registry custody receipt and witness receipt are distinct, source/proof scope is valid, the challenge window is no longer than five minutes, custody is verified out-of-band, the witness identity is independently verified out-of-band, and the witness key is distinct.

A self-reported or unverified witness remains `HOLD_QL254_INDEPENDENT_WITNESS_NOT_VERIFIED`.

## Reversible 24/7 relay readiness
Build 231 evaluates only an in-memory readiness simulation for a future private relay. The ready simulation requires:
- simulation-only mode;
- outbound-only connectivity;
- no public inbound ports;
- no port forwarding;
- no public home-device DNS;
- separate least-privilege service account;
- separate credentials per app;
- OS secret store only;
- isolation from vault, cameras, Home Assistant and MQTT;
- kill switch, key revocation and rollback procedures;
- bounded health checks between 30 and 300 seconds.

Even a passing simulation reports `QL254_RELAY_REVERSIBILITY_SIMULATION_READY_CONNECTION_HELD`. The relay is not installed or started.

## Safety boundaries
- no real signing private keys or private registry contents in GitHub;
- no fabricated witness identity, custodian, receipt or proof;
- no home-PC configuration;
- no router or firewall changes;
- no gateway GETs;
- no owner TEST-only authorization inferred from chat or deployment;
- no live connection;
- connection remains DISCONNECTED.

## Next roadmap item
**Build 232 — Repair Recovery Filtering, Renewal Preset Recovery & Receipt Recovery Search, plus QL-255 verified proof-publication disposition, private witness-custody exception closure and bounded mini-server trial approval preparation while connection remains HELD.**
