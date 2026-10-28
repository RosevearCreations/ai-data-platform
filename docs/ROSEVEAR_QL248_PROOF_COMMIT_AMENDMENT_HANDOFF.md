# Rosevear Comms Hub QL-248 — six-app proof-commit clarification and offline review handoff

**Forward to all six other GitHub applications, including AI Data Platform. No credentials or personal data.** This is a proposed clarification requiring consumer agreement, not authority to connect. All real connections remain DISCONNECTED / HOLD.

## Two-SHA clarification

The signed QL-246 payload field `source_revision` identifies the earlier audited/tested source code commit. The proof file itself is committed later, so its containing Git commit must be represented separately as `proofCommitSha` in the operator verification manifest.

The proof transport therefore uses:

- `sourceRevision`: earlier audited/tested source commit;
- `proofCommitSha`: later immutable commit containing `docs/integration/ql246-source-proof.json`;
- `proofSha256`: SHA-256 of the exact raw proof JSON bytes fetched at `proofCommitSha`;
- `publicKeySpkiSha256`: independently authenticated DER SPKI SHA-256 public-key pin;
- `ciRunUrl`: CI run for the earlier `sourceRevision`.

The signed QL-246 payload, Ed25519 canonical bytes, one-hour challenge, seven genuine denial tests and read-only HOLD assertions remain unchanged.

A positive offline review does not authorize connection, a pilot or any write.

## AI Data Platform consumer agreement

Build 223 accepts this clarification by supporting a trusted-pins v2 row with separate `sourceRevision`, `proofCommitSha`, `proofSha256` and `ciRunUrl`, while retaining the original v1 input for compatibility.

For v2:

1. the raw public proof URL is pinned to `proofCommitSha`;
2. the signed payload `source_revision` must equal the separately supplied earlier `sourceRevision`;
3. the signed payload `ci_run_url` must equal the separately supplied source CI URL;
4. the exact raw proof bytes must hash to `proofSha256`;
5. the public Ed25519 key must match the independently supplied SPKI pin;
6. all existing QL-246 scope, challenge, expiry, negative-test and HOLD checks remain enforced.

No direct database access, credentials, owner identity or live pilot authority is introduced.

## Truthful status

Two-SHA amendment accepted by AI Data Platform consumer: **YES**

Seven genuinely witnessed nonproduction denials: **PENDING**

Durable audit, revocation and rollback witness: **PENDING**

Authenticated owner authorization for narrow read-only pilot: **NOT GIVEN**

Actual connection state: **DISCONNECTED / HOLD**
